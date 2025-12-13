const express = require('express');
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const argon2 = require('argon2')
const jwt = require('jsonwebtoken')


const Auth = require('../auth/auth')

const Sale = require("../models/Sale");
const Inventory = require('../models/Inventory');
const Customer = require('../models/Customer');
const SaleOrder = require('../models/SaleOrder')
const Admin = require('../models/Admin')


// Ensure upload directory exists
const uploadDir = path.join(__dirname, "../uploads/inventory");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, "inv_" + Date.now() + ext);
  }
});

const upload = multer({ storage });


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express tallyPos' });
});


router.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;

    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin)
      return res.status(400).json({ message: "Username already exists" });

    // Hash password with Argon2
    const hashedPassword = await argon2.hash(password);

    const newAdmin = await Admin.create({
      username,
      password: hashedPassword
    });

    res.status(201).json({ message: "Admin created", adminId: newAdmin._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const admin = await Admin.findOne({ username });
    if (!admin)
      return res.status(400).json({ message: "Invalid username or password" });

    // block check
    if (admin.block)
      return res.status(403).json({ message: "Admin is blocked" });

    // verify password using Argon2
    const isMatch = await argon2.verify(admin.password, password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid username or password" });

    // generate JWT
    const token = jwt.sign(
      { _id: admin._id, username: admin.username },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ message: "Login successful", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});






// helper for inventory filters
const UNIT_NORMALIZATION_MAP = {
  p: "PCS",
  pc: "PCS",
  pcs: "PCS",
  nos: "PCS",
  piece: "PCS",

  doz: "DOZEN",
  dozen: "DOZEN",
  dz: "DOZEN",
  "doz of 12 p": "DOZEN",

  gross: "GROSS",

  pair: "PAIR",

  box: "PCS",
  pack: "PCS",
  bundle: "PCS",
  ctn: "PCS",
  set: "PCS",

  roll: "PCS",
  card: "PCS",

  mtr: "UNKNOWN",
  yrd: "UNKNOWN",
};

function parseClosingQtyToPieces(closingQty = "") {
  if (!closingQty || typeof closingQty !== "string") return 0;

  const UNIT_MULTIPLIER = {
    PCS: 1,
    DOZEN: 12,
    GROSS: 144,
    PAIR: 2,
  };

  let total = 0;
  const str = closingQty.toLowerCase();

  // Match patterns like "2 doz", "3 p", "1 gross"
  const regex = /(-?\d+)\s*(doz|dozen|dz|p|pc|pcs|gross|pair)?/g;
  let match;

  while ((match = regex.exec(str)) !== null) {
    const qty = parseInt(match[1], 10);
    const rawUnit = (match[2] || "p").toLowerCase();

    const normalizedUnit =
      UNIT_NORMALIZATION_MAP[rawUnit] || "PCS";

    const multiplier =
      UNIT_MULTIPLIER[normalizedUnit] || 1;

    total += qty * multiplier;
  }

  return total;
}

/* ============================================================
   GET INVENTORY (From MongoDB — For MERN App)
   ============================================================ */
router.get("/inventory", Auth.userAuth, async (req, res) => {
  try {
    const {
      companyName,
      search = "",
      page = 1,
      limit = 100,
      includeOutOfStock = "false",
    } = req.query;

    const parsedLimit = Math.min(parseInt(limit, 10), 200);
    const parsedPage = Math.max(parseInt(page, 10), 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const query = {};

    // Company filter
    if (companyName && companyName !== "ALL") {
      query.companyName = companyName;
    }

    // Text search
    if (search.trim()) {
      query.$or = [
        { NAME: { $regex: search, $options: "i" } },
        { GROUP: { $regex: search, $options: "i" } },
      ];
    }

    // Fetch raw items first (lean for speed)
    const rawItems = await Inventory.find(query)
      .lean()
      .sort({ NAME: 1 });

    // Parse + normalize stock
    const processedItems = rawItems.map((item) => {
      const closingQtyPieces = parseClosingQtyToPieces(
        item.CLOSINGQTY
      );

      return {
        ...item,
        closingQtyPieces,
        isOutOfStock: closingQtyPieces <= 0,
      };
    });

    // Stock filter (BACKEND)
    const filteredItems =
      includeOutOfStock === "true"
        ? processedItems
        : processedItems.filter((i) => i.closingQtyPieces > 0);

    const total = filteredItems.length;

    // Pagination AFTER filtering
    const paginatedItems = filteredItems.slice(
      skip,
      skip + parsedLimit
    );

    return res.json({
      ok: true,
      total,
      page: parsedPage,
      limit: parsedLimit,
      items: paginatedItems,
    });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});










/* ============================================================
   ADD SALE (MERN APP → SERVER)
   Users create a sale inside the web app. Stored as pending.
   ============================================================ */
router.post("/add-sale",Auth.userAuth, async (req, res) => {
  try {
    const data = req.body;

    const {
      companyName,
      billNo,
      date,
      reference = "",
      remarks = "",
      subtotal = 0,
      vatAmount = 0,
      totalAmount = 0,
      isCashSale,
      cashLedgerName = "",
      customerId,
      items
    } = data;

    // ----------------------------
    // VALIDATION
    // ----------------------------
    if (!companyName || !billNo || !date) {
      return res.status(400).json({
        ok: false,
        message: "companyName, billNo, and date are required",
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        ok: false,
        message: "At least one item is required",
      });
    }

    // Check duplicate bill for company
    const exists = await Sale.findOne({ billNo, companyName });
    if (exists) {
      return res.status(400).json({
        ok: false,
        message: "Bill number already exists for this company",
      });
    }

    // ----------------------------
    // POPULATE CUSTOMER DETAILS
    // ----------------------------
    let partyCode = "";
    let partyName = "";
    let partyVatNo = "";
    let partyAddress = [];

    if (!isCashSale && customerId) {
      const customer = await Customer.findById(customerId).lean();

      if (!customer) {
        return res.status(400).json({ ok: false, message: "Customer not found" });
      }

      partyCode = customer.partyCode || "";
      partyName = customer.partyName || "";
      partyVatNo = customer.vatNumber || "";
      partyAddress = (customer.address || []).map(a => ({ address: a }));
    }

    // ----------------------------
    // ITEMS (use VAT exactly as frontend sends)
    // ----------------------------
    const processedItems = items.map(i => ({
      itemName: i.itemName,
      itemCode: i.itemCode,
      itemGroup: i.itemGroup || "",
      description: i.description || "",
      qty: Number(i.qty),
      unit: i.unit,
      rate: Number(i.rate),
      amount: Number(i.amount),
      rateOfTax: Number(i.rateOfTax), // ← directly from frontend (correct)
    }));

    // ----------------------------
    // LEDGERS — AUTO VAT LEDGER
    // ----------------------------
    let ledgerList = [];

    if (vatAmount > 0) {
      ledgerList.push({
        ledgerName: "VAT",
        percentage: null, // because items can have mixed VAT
        amount: vatAmount,
      });
    }

    // ----------------------------
    // SAVE SALE
    // ----------------------------
    const newSale = new Sale({
      companyName,
      billNo,
      date,
      reference,
      remarks,

      subtotal,
      vatAmount,
      totalAmount,

      isCashSale,
      cashLedgerName,

      partyCode,
      partyName,
      partyVatNo,
      partyAddress,

      items: processedItems,
      ledgers: ledgerList,

      status: "pending",
      syncAttempts: 0,
      syncError: "",
      tallyInvoiceNumber: "",
      tallyResponseLogs: [],

      createdBy: data.createdBy || null,
      updatedBy: data.createdBy || null,
    });

    await newSale.save();

    return res.json({
      ok: true,
      message: "Sale added successfully",
      saleId: newSale._id,
    });

  } catch (error) {
    console.error("Error adding sale:", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});





/* ============================================================
   LIST ALL SALES (MERN APP → SERVER)
   Supports: search, company filter, date filter, pagination
   ============================================================ */
router.get("/list-sales",Auth.userAuth, async (req, res) => {
  try {
    let {
      companyName,
      search,
      fromDate,
      toDate,
      page = 1,
      limit = 50,
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    let query = {};

    // Company filter
    if (companyName) {
      query.companyName = companyName;
    }

    // Search filter
    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { billNo: regex },
        { partyName: regex },
        { partyCode: regex },
        { cashLedgerName: regex },
      ];
    }

    // Date filter
    if (fromDate || toDate) {
      query.date = {};
      if (fromDate) query.date.$gte = new Date(fromDate);
      if (toDate) {
        let d = new Date(toDate);
        d.setHours(23, 59, 59, 999);
        query.date.$lte = d;
      }
    }

    const skip = (page - 1) * limit;

    // Fetch sales
    const sales = await Sale.find(query)
      .sort({ date: -1, createdAt: -1 }) // newest first
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Sale.countDocuments(query);

    return res.json({
      ok: true,
      total,
      page,
      limit,
      sales,
    });
  } catch (error) {
    console.error("Error fetching sales:", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});








/* ============================================================
   GET SINGLE SALE (with full details + logs)
   /sale/:billNo
   ============================================================ */
router.get("/sale/:billNo",Auth.userAuth, async (req, res) => {
  try {
    const { billNo } = req.params;

    if (!billNo) {
      return res.status(400).json({
        ok: false,
        message: "billNo is required",
      });
    }

    const sale = await Sale.findOne({ billNo }).lean();

    if (!sale) {
      return res.status(404).json({
        ok: false,
        message: "Sale not found",
      });
    }

    return res.json({
      ok: true,
      sale,
    });
  } catch (error) {
    console.error("Error fetching sale:", error);
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

router.put("/inventory/update-image/:id", Auth.userAuth, upload.single("image"), async (req, res) => {
  try {
    const inventoryId = req.params.id;

    if (!req.file) {
      return res.status(400).json({ ok: false, message: "Image file required" });
    }

    const newPath = "uploads/inventory/" + req.file.filename; // no leading slash

    const oldInv = await Inventory.findById(inventoryId);

    if (!oldInv) {
      fs.unlinkSync(req.file.path); // cleanup uploaded file
      return res.status(404).json({ ok: false, message: "Inventory item not found" });
    }

    // Delete old image from disk
    if (oldInv.imageUrl) {
      const oldFilePath = path.join(__dirname, "..", oldInv.imageUrl);
      if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
    }

    oldInv.imageUrl = newPath;
    await oldInv.save();

    return res.json({
      ok: true,
      message: "Image updated successfully",
      imageUrl: newPath,
      inventory: oldInv,
    });
  } catch (error) {
    console.error("Update inventory image error:", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});



router.put("/inventory/remove-image/:id", Auth.userAuth, async (req, res) => {
  try {
    const inventoryId = req.params.id;

    const inv = await Inventory.findById(inventoryId);

    if (!inv) {
      return res.status(404).json({ ok: false, message: "Inventory item not found" });
    }

    if (inv.imageUrl) {
      const filePath = path.join(__dirname, "..", inv.imageUrl.replace(/^\//, ""));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    inv.imageUrl = null;
    await inv.save();

    return res.json({
      ok: true,
      message: "Image removed successfully",
    });

  } catch (error) {
    console.error("Remove inventory image error:", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});




/* =============================
console.error('addSaleOrder error:', error);
return res.status(500).json({ ok: false, error: error.message });
}
});


/* =============================
EDIT SALE ORDER
PUT /editSaleOrder/:id
============================= */
router.put('/editSaleOrder/:id',Auth.userAuth, async (req, res) => {
try {
const { id } = req.params;
const data = req.body;


const updated = await SaleOrder.findByIdAndUpdate(id, data, { new: true });


if (!updated) {
return res.status(404).json({ ok: false, message: 'SaleOrder not found' });
}


return res.json({ ok: true, saleOrder: updated });
} catch (error) {
console.error('editSaleOrder error:', error);
return res.status(500).json({ ok: false, error: error.message });
}
});


/* =============================
DELETE SALE ORDER
DELETE /deleteSaleOrder/:id
============================= */
router.delete('/deleteSaleOrder/:id',Auth.userAuth, async (req, res) => {
try {
const { id } = req.params;


const removed = await SaleOrder.findByIdAndDelete(id);


if (!removed) {
return res.status(404).json({ ok: false, message: 'SaleOrder not found' });
}


return res.json({ ok: true, message: 'SaleOrder deleted' });
} catch (error) {
console.error('deleteSaleOrder error:', error);
return res.status(500).json({ ok: false, error: error.message });
}
});


/* =============================
GET ALL SALE ORDERS
GET /getAllSaleOrders
Supports: search, companyName filters
============================= */
router.get('/getAllSaleOrders',Auth.userAuth, async (req, res) => {
try {
const { search, companyName } = req.query;


let filter = {};


if (companyName) filter.companyName = companyName;


if (search) {
filter.$or = [
{ billNo: { $regex: search, $options: 'i' } },
{ partyName: { $regex: search, $options: 'i' } },
{ partyCode: { $regex: search, $options: 'i' } }
];
}


const saleOrders = await SaleOrder.find(filter).sort({ date: -1 }).lean();


return res.json({ ok: true, saleOrders });
} catch (error) {
console.error('getAllSaleOrders error:', error);
return res.status(500).json({ ok: false, error: error.message });
}
});


// GET ONE SALE ORDER
router.get("/sale-orders/:billNo",Auth.userAuth, async (req, res) => {
  try {
    const { billNo } = req.params;

    if (!billNo) {
      return res.status(400).json({
        ok: false,
        message: "billNo is required",
      });
    }

    const saleOrder = await SaleOrder.findOne({ billNo }).lean();

    if (!saleOrder) {
      return res.status(404).json({
        ok: false,
        message: "Sale Order not found",
      });
    }

    return res.json({
      ok: true,
      saleOrder,
    });
  } catch (error) {
    console.error("Error fetching sale order:", error);
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});


router.get("/getProductBasic",Auth.userAuth, async (req, res) => {
  try {
    const { companyName, itemName } = req.query;

    if (!companyName || !itemName) {
      return res.status(400).json({
        ok: false,
        message: "companyName and itemName are required",
      });
    }

    const filter = {
      companyName,
      itemName,
    };

    // Find single product
    const item = await Inventory.findOne(filter)
      .select("itemName itemCode availableQty openingQty closingQty imageUrl")
      .lean();

    if (!item) {
      return res.json({
        ok: false,
        message: "Product not found",
        item: null,
      });
    }

    return res.json({
      ok: true,
      item,
    });

  } catch (error) {
    console.error("Error fetching product:", error);
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});








// customer-apis

router.get("/customers",Auth.userAuth, async (req, res) => {
  try {
    let {
      page = 1,
      limit = 50,
      search = "",
      companyName = "",
    } = req.query;

    page = Number(page);
    limit = Number(limit);

    const query = {};

    // =============================
    // COMPANY FILTER (optional)
    // =============================
    if (companyName) {
      query.companyName = companyName;
    }

    // =============================
    // SEARCH FILTER
    // name, group, address
    // =============================
    if (search) {
      const regex = new RegExp(search, "i");

      query.$or = [
        { name: regex },
        { group: regex },
        { address: regex }, // array search
      ];
    }

    // =============================
    // TOTAL COUNT (for infinite scroll)
    // =============================
    const total = await Customer.countDocuments(query);

    // =============================
    // PAGINATED FETCH
    // =============================
    const customers = await Customer.find(query)
      .sort({ name: 1 }) // alphabetical
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return res.json({
      ok: true,
      customers,
      total,
      page,
      limit,
      hasMore: page * limit < total,
    });

  } catch (error) {
    console.error("Error fetching customers:", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});


module.exports = router;
