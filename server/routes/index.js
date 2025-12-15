const express = require('express');
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const argon2 = require('argon2')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose');


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

/**
 * GET PRODUCT BY ID
 * body: { companyName: String }
 */
router.post(
  "/inventory/:id",
  Auth.userAuth, // optional
  async (req, res) => {
    try {
      const { id } = req.params;
      const { companyName } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          ok: false,
          message: "Invalid product id",
        });
      }

     const product = await Inventory.findById(id).lean();

if (!product) {
  return res.status(404).json({
    ok: false,
    message: "Product not found",
  });
}

const closingQtyPieces = parseClosingQtyToPieces(product.CLOSINGQTY);

      const isCompanyMismatch =
        companyName && product.companyName !== companyName;

      return res.json({
        ok: true,
        product: {
          ...product,
          closingQtyPieces,
          disable: isCompanyMismatch,
        },
      });
    } catch (error) {
      console.error("Error fetching product by id:", error);
      return res.status(500).json({
        ok: false,
        error: error.message,
      });
    }
  }
);


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









/* ============================================================
   ADD SALE (MERN APP → SERVER)
   Users create a sale inside the web app. Stored as pending.
   ============================================================ */
router.post("/add-sale", Auth.userAuth, async (req, res) => {
  try {
    const {
      companyName,
      billNo,
      date,
      reference = "",
      remarks = "",
      isCashSale = false,
      cashLedgerName = "",
      customerId,
      items = [],
    } = req.body;

    // =============================
    // BASIC VALIDATION
    // =============================
    if (!companyName || !billNo || !date) {
      return res.status(400).json({
        ok: false,
        message: "companyName, billNo and date are required",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        ok: false,
        message: "At least one item is required",
      });
    }

    // Unique bill per company
    const exists = await Sale.findOne({ companyName, billNo });
    if (exists) {
      return res.status(400).json({
        ok: false,
        message: "Bill number already exists for this company",
      });
    }

    // =============================
    // CUSTOMER / CASH VALIDATION
    // =============================
    let partyName = "";
    let partyAddress = [];

    if (isCashSale) {
      if (!cashLedgerName) {
        return res.status(400).json({
          ok: false,
          message: "cashLedgerName is required for cash sale",
        });
      }
    } else {
      if (!customerId) {
        return res.status(400).json({
          ok: false,
          message: "customerId is required for credit sale",
        });
      }

      const customer = await Customer.findById(customerId).lean();
      if (!customer || customer.companyName !== companyName) {
        return res.status(400).json({
          ok: false,
          message: "Invalid customer for this company",
        });
      }

      partyName = customer.name;
partyAddress = (customer.address || [])
  .filter(a => typeof a === "string" && a.trim() !== "")
  .map(a => ({ address: a.trim() }));
    }

    // =============================
    // PROCESS ITEMS
    // =============================
    let subtotal = 0;
    let vatAmount = 0;
    const processedItems = [];

    for (const i of items) {
      const inventoryItem = await Inventory.findById(i.itemId).lean();
      if (!inventoryItem || inventoryItem.companyName !== companyName) {
        return res.status(400).json({
          ok: false,
          message: "Invalid inventory item for this company",
        });
      }

      const qty = Number(i.qty);
      const rate = Number(i.rate);
      const rateOfTax = Number(i.rateOfTax || 0);

      if (qty <= 0 || rate < 0) {
        return res.status(400).json({
          ok: false,
          message: "Invalid quantity or rate",
        });
      }

      const amount = qty * rate;
      const tax = (amount * rateOfTax) / 100;

      subtotal += amount;
      vatAmount += tax;

      processedItems.push({
        itemName: inventoryItem.NAME,
        itemGroup: inventoryItem.GROUP || "",
        unit: inventoryItem.UNITS || "PCS",
        itemCode: "",
        description: "",
        qty,
        rate,
        amount,
        rateOfTax,
      });
    }

    const totalAmount = subtotal + vatAmount;

    // =============================
    // LEDGERS
    // =============================
    const ledgers = [];
    if (vatAmount > 0) {
      ledgers.push({
        ledgerName: "VAT",
        percentage: 0,
        amount: vatAmount,
      });
    }

    // =============================
    // SAVE SALE
    // =============================
    const sale = new Sale({
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

      partyName,
      partyAddress,

      items: processedItems,
      ledgers,

      status: "pending",

      createdBy: req.user?._id,
      updatedBy: req.user?._id,
    });

    await sale.save();

    return res.json({
      ok: true,
      message: "Sale added successfully",
      saleId: sale._id,
    });

  } catch (error) {
    console.error("Error adding sale:", error);
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});


router.put("/edit-sale/:saleId", Auth.userAuth, async (req, res) => {
  try {
    const { saleId } = req.params;
    const {
      companyName,
      billNo,
      date,
      reference = "",
      remarks = "",
      isCashSale = false,
      cashLedgerName = "",
      customerId,
      items = [],
    } = req.body;

    // =============================
    // FETCH SALE
    // =============================
    const sale = await Sale.findById(saleId);
    if (!sale) {
      return res.status(404).json({
        ok: false,
        message: "Sale not found",
      });
    }

    // =============================
    // EDIT RULES
    // =============================
    if (!["pending", "error"].includes(sale.status)) {
      return res.status(400).json({
        ok: false,
        message: "Only pending or error sales can be edited",
      });
    }

    if (sale.companyName !== companyName) {
      return res.status(400).json({
        ok: false,
        message: "Company mismatch",
      });
    }

    // =============================
    // BILL NO CHANGE CHECK
    // =============================
    if (billNo !== sale.billNo) {
      const exists = await Sale.findOne({
        companyName,
        billNo,
        _id: { $ne: saleId },
      });
      if (exists) {
        return res.status(400).json({
          ok: false,
          message: "Bill number already exists for this company",
        });
      }
    }

    // =============================
    // CUSTOMER / CASH
    // =============================
    let partyName = "";
    let partyAddress = [];

    if (isCashSale) {
      if (!cashLedgerName) {
        return res.status(400).json({
          ok: false,
          message: "cashLedgerName is required for cash sale",
        });
      }
    } else {
      if (!customerId) {
        return res.status(400).json({
          ok: false,
          message: "customerId is required for credit sale",
        });
      }

      const customer = await Customer.findById(customerId).lean();
      if (!customer || customer.companyName !== companyName) {
        return res.status(400).json({
          ok: false,
          message: "Invalid customer for this company",
        });
      }

      partyName = customer.name;
      partyAddress = (customer.address || [])
        .filter(a => typeof a === "string" && a.trim() !== "")
        .map(a => ({ address: a.trim() }));
    }

    // =============================
    // PROCESS ITEMS
    // =============================
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        ok: false,
        message: "At least one item is required",
      });
    }

    let subtotal = 0;
    let vatAmount = 0;
    const processedItems = [];

    for (const i of items) {
      const inventoryItem = await Inventory.findById(i.itemId).lean();
      if (!inventoryItem || inventoryItem.companyName !== companyName) {
        return res.status(400).json({
          ok: false,
          message: "Invalid inventory item for this company",
        });
      }

      const qty = Number(i.qty);
      const rate = Number(i.rate);
      const rateOfTax = Number(i.rateOfTax || 0);

      if (qty <= 0 || rate < 0) {
        return res.status(400).json({
          ok: false,
          message: "Invalid quantity or rate",
        });
      }

      const amount = qty * rate;
      const tax = (amount * rateOfTax) / 100;

      subtotal += amount;
      vatAmount += tax;

      processedItems.push({
        itemName: inventoryItem.NAME,
        itemGroup: inventoryItem.GROUP || "",
        unit: inventoryItem.UNITS || "PCS",
        itemCode: "",
        description: "",
        qty,
        rate,
        amount,
        rateOfTax,
      });
    }

    const totalAmount = subtotal + vatAmount;

    // =============================
    // LEDGERS
    // =============================
    const ledgers = [];
    if (vatAmount > 0) {
      ledgers.push({
        ledgerName: "VAT",
        percentage: 0,
        amount: vatAmount,
      });
    }

    // =============================
    // UPDATE SALE
    // =============================
    sale.billNo = billNo;
    sale.date = date;
    sale.reference = reference;
    sale.remarks = remarks;

    sale.isCashSale = isCashSale;
    sale.cashLedgerName = isCashSale ? cashLedgerName : "";

    sale.partyName = partyName;
    sale.partyAddress = partyAddress;

    sale.items = processedItems;
    sale.ledgers = ledgers;

    sale.subtotal = subtotal;
    sale.vatAmount = vatAmount;
    sale.totalAmount = totalAmount;

    // Reset sync state
    sale.status = "pending";
    sale.syncAttempts = 0;
    sale.syncError = "";

    sale.updatedBy = req.user?._id;

    await sale.save();

    return res.json({
      ok: true,
      message: "Sale updated successfully",
      saleId: sale._id,
    });

  } catch (error) {
    console.error("Error editing sale:", error);
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});



/* ============================================================
   LIST ALL SALES (MERN APP → SERVER)
   Supports: search, company filter, date filter, pagination
   ============================================================ */
router.get("/list-sales", Auth.userAuth, async (req, res) => {
  try {
    let {
      companyName,
      search = "",
      fromDate,
      toDate,
      page = 1,
      limit = 50,
    } = req.query;

    page = Number(page);
    limit = Number(limit);

    if (!companyName) {
      return res.status(400).json({
        ok: false,
        message: "companyName is required",
      });
    }

    const query = {};

    // =============================
    // COMPANY FILTER
    // =============================
    if (companyName !== "ALL") {
      query.companyName = companyName;
    }

    // =============================
    // SEARCH FILTER
    // =============================
    if (search.trim() !== "") {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [
        { billNo: regex },
        { partyName: regex },
        { cashLedgerName: regex },
      ];
    }

    // =============================
    // DATE FILTER
    // =============================
    if (fromDate || toDate) {
      query.date = {};

      if (fromDate) {
        query.date.$gte = new Date(fromDate);
      }

      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const skip = (page - 1) * limit;

    // =============================
    // FETCH DATA
    // =============================
    const [sales, total] = await Promise.all([
      Sale.find(query)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Sale.countDocuments(query),
    ]);

    return res.json({
      ok: true,
      items: sales,
      total,
      page,
      limit,
      hasMore: page * limit < total,
    });

  } catch (error) {
    console.error("Error fetching sales:", error);
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
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


router.put("/edit-sale/:saleId", Auth.userAuth, async (req, res) => {
  try {
    const { saleId } = req.params;
    const {
      companyName,
      billNo,
      date,
      reference = "",
      remarks = "",
      isCashSale = false,
      cashLedgerName = "",
      customerId,
      items = [],
    } = req.body;

    // =============================
    // FETCH SALE
    // =============================
    const sale = await Sale.findById(billNo);
    if (!sale) {
      return res.status(404).json({
        ok: false,
        message: "Sale not found",
      });
    }

    // =============================
    // EDIT RULES
    // =============================
    if (!["pending", "error"].includes(sale.status)) {
      return res.status(400).json({
        ok: false,
        message: "Only pending or error sales can be edited",
      });
    }

    if (sale.companyName !== companyName) {
      return res.status(400).json({
        ok: false,
        message: "Company mismatch",
      });
    }

    // =============================
    // BILL NO CHANGE CHECK
    // =============================
    if (billNo !== sale.billNo) {
      const exists = await Sale.findOne({
        companyName,
        billNo,
        _id: { $ne: saleId },
      });
      if (exists) {
        return res.status(400).json({
          ok: false,
          message: "Bill number already exists for this company",
        });
      }
    }

    // =============================
    // CUSTOMER / CASH
    // =============================
    let partyName = "";
    let partyAddress = [];

    if (isCashSale) {
      if (!cashLedgerName) {
        return res.status(400).json({
          ok: false,
          message: "cashLedgerName is required for cash sale",
        });
      }
    } else {
      if (!customerId) {
        return res.status(400).json({
          ok: false,
          message: "customerId is required for credit sale",
        });
      }

      const customer = await Customer.findById(customerId).lean();
      if (!customer || customer.companyName !== companyName) {
        return res.status(400).json({
          ok: false,
          message: "Invalid customer for this company",
        });
      }

      partyName = customer.name;
      partyAddress = (customer.address || [])
        .filter(a => typeof a === "string" && a.trim() !== "")
        .map(a => ({ address: a.trim() }));
    }

    // =============================
    // PROCESS ITEMS
    // =============================
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        ok: false,
        message: "At least one item is required",
      });
    }

    let subtotal = 0;
    let vatAmount = 0;
    const processedItems = [];

    for (const i of items) {
      const inventoryItem = await Inventory.findById(i.itemId).lean();
      if (!inventoryItem || inventoryItem.companyName !== companyName) {
        return res.status(400).json({
          ok: false,
          message: "Invalid inventory item for this company",
        });
      }

      const qty = Number(i.qty);
      const rate = Number(i.rate);
      const rateOfTax = Number(i.rateOfTax || 0);

      if (qty <= 0 || rate < 0) {
        return res.status(400).json({
          ok: false,
          message: "Invalid quantity or rate",
        });
      }

      const amount = qty * rate;
      const tax = (amount * rateOfTax) / 100;

      subtotal += amount;
      vatAmount += tax;

      processedItems.push({
        itemName: inventoryItem.NAME,
        itemGroup: inventoryItem.GROUP || "",
        unit: inventoryItem.UNITS || "PCS",
        itemCode: "",
        description: "",
        qty,
        rate,
        amount,
        rateOfTax,
      });
    }

    const totalAmount = subtotal + vatAmount;

    // =============================
    // LEDGERS
    // =============================
    const ledgers = [];
    if (vatAmount > 0) {
      ledgers.push({
        ledgerName: "VAT",
        percentage: 0,
        amount: vatAmount,
      });
    }

    // =============================
    // UPDATE SALE
    // =============================
    sale.billNo = billNo;
    sale.date = date;
    sale.reference = reference;
    sale.remarks = remarks;

    sale.isCashSale = isCashSale;
    sale.cashLedgerName = isCashSale ? cashLedgerName : "";

    sale.partyName = partyName;
    sale.partyAddress = partyAddress;

    sale.items = processedItems;
    sale.ledgers = ledgers;

    sale.subtotal = subtotal;
    sale.vatAmount = vatAmount;
    sale.totalAmount = totalAmount;

    // Reset sync state
    sale.status = "pending";
    sale.syncAttempts = 0;
    sale.syncError = "";

    sale.updatedBy = req.user?._id;

    await sale.save();

    return res.json({
      ok: true,
      message: "Sale updated successfully",
      saleId: sale._id,
    });

  } catch (error) {
    console.error("Error editing sale:", error);
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});






// customer-apis

router.get("/customers", Auth.userAuth, async (req, res) => {
  try {
    let {
      page = 1,
      limit = 100,
      search = "",
      companyName = "",
    } = req.query;

    page = Math.max(Number(page), 1);
    limit = Math.min(Number(limit), 200);
    const skip = (page - 1) * limit;

    const query = {};

    // Company filter
    if (companyName && companyName !== "ALL") {
      query.companyName = companyName;
    }

    // Search filter
    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [
        { name: regex },
        { group: regex },
        { address: regex }, // works for array fields
      ];
    }

    // Total count
    const total = await Customer.countDocuments(query);

    // Paginated fetch
    const items = await Customer.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.json({
      ok: true,
      items,
      total,
      page,
      limit,
      hasMore: skip + items.length < total,
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});



// sale-order-api


/**
 * CREATE SALE ORDER
 */
router.post("/sale-orders", Auth.userAuth, async (req, res) => {
  try {
    const payload = req.body;

    if (!payload.companyName) {
      return res.status(400).json({
        ok: false,
        message: "companyName is required",
      });
    }

    const saleOrder = await SaleOrder.create({
      ...payload,
      createdBy: req.user?._id,
      updatedBy: req.user?._id,
    });

    return res.status(201).json({
      ok: true,
      item: saleOrder,
    });
  } catch (error) {
    console.error("Error creating sale order:", error);

    // Duplicate billNo handling
    if (error.code === 11000) {
      return res.status(400).json({
        ok: false,
        message: "Bill number already exists",
      });
    }

    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});


/**
 * UPDATE SALE ORDER
 */
router.put("/sale-orders/:id", Auth.userAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        ok: false,
        message: "Invalid sale order id",
      });
    }

    const updated = await SaleOrder.findByIdAndUpdate(
      id,
      {
        ...req.body,
        updatedBy: req.user?._id,
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        ok: false,
        message: "Sale order not found",
      });
    }

    return res.json({
      ok: true,
      item: updated,
    });
  } catch (error) {
    console.error("Error updating sale order:", error);
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});


/**
 * DELETE SALE ORDER
 */
router.delete("/sale-orders/:id", Auth.userAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        ok: false,
        message: "Invalid sale order id",
      });
    }

    const deleted = await SaleOrder.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        ok: false,
        message: "Sale order not found",
      });
    }

    return res.json({
      ok: true,
      message: "Sale order deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting sale order:", error);
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});


/**
 * LIST SALE ORDERS
 */
router.get("/sale-orders", Auth.userAuth, async (req, res) => {
  try {
    let {
      companyName,
      search = "",
      fromDate,
      toDate,
      page = 1,
      limit = 50,
    } = req.query;

    page = Number(page);
    limit = Number(limit);

    if (!companyName) {
      return res.status(400).json({
        ok: false,
        message: "companyName is required",
      });
    }

    const query = {};

    // =============================
    // COMPANY FILTER
    // =============================
    if (companyName !== "ALL") {
      query.companyName = companyName;
    }

    // =============================
    // SEARCH FILTER
    // =============================
    if (search.trim() !== "") {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [
        { billNo: regex },
        { partyName: regex },
        { cashLedgerName: regex },
        { reference: regex },
      ];
    }

    // =============================
    // DATE FILTER
    // =============================
    if (fromDate || toDate) {
      query.date = {};

      if (fromDate) {
        query.date.$gte = new Date(fromDate);
      }

      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const skip = (page - 1) * limit;

    // =============================
    // FETCH DATA
    // =============================
    const [orders, total] = await Promise.all([
      SaleOrder.find(query)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      SaleOrder.countDocuments(query),
    ]);

    return res.json({
      ok: true,
      items: orders,
      total,
      page,
      limit,
      hasMore: page * limit < total,
    });
  } catch (error) {
    console.error("Error fetching sale orders:", error);
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});


router.get("/sale-orders/:id", Auth.userAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        ok: false,
        message: "Invalid sale order id",
      });
    }

    const order = await SaleOrder.findById(id).lean();

    if (!order) {
      return res.status(404).json({
        ok: false,
        message: "Sale order not found",
      });
    }

    return res.json({
      ok: true,
      item: order,
    });
  } catch (error) {
    console.error("Error fetching sale order:", error);
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});


module.exports = router;
