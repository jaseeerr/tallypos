const express = require('express');
const router = express.Router();
const Sale = require("../models/Sale");
const Inventory = require('../models/Inventory');
const Customer = require('../models/Customer');
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const SaleOrder = require('../models/SaleOrder')
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

/* ============================================================
   1) TALLY FETCH SALES (GET)
   Tally calls this to get all pending sales for a company
   ============================================================ */
router.get("/fetch-sales", async (req, res) => {
  try {
    const formatDate = (date) => {
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const company = req.query.company;

    if (!company) {
      return res
        .status(400)
        .json({ ok: false, message: "company is required" });
    }

    const pendingSales = await Sale.find({
      companyName: company,
      status: "pending",
    }).lean();

    const vouchers = pendingSales.map((sale) => ({
      TYPE: "Sales Invoice",
      BILLNO: sale.billNo,
      DATE: formatDate(sale.date),
      REFERENCE: sale.reference || "",
      TOTALAMOUNT: sale.totalAmount.toFixed(2),
      REMARKS: sale.remarks || "",

      PARTYVATNO: sale.partyVatNo || "",
      PARTYCODE: sale.partyCode || "",
      PARTYNAME: sale.isCashSale ? sale.cashLedgerName : sale.partyName,
      PARTYADDRESS: sale.partyAddress.map((a) => ({ ADDRESS: a.address })),

      ITEMS: sale.items.map((i) => ({
        ITEMNAME: i.itemName,
        ITEMCODE: i.itemCode,
        ITEMGROUP: i.itemGroup,
        DESCRIPTION: i.description,
        QTY: Number(i.qty).toFixed(4),
        UNIT: i.unit,
        RATE: Number(i.rate).toFixed(2),
        AMOUNT: Number(i.amount).toFixed(2),
        Rateoftax: Number(i.rateOfTax || 0).toFixed(2),
      })),

      LEDGERS: sale.ledgers.map((l) => ({
        LEDGERSNAME: l.ledgerName,
        Percentage:
          l.percentage != null ? Number(l.percentage).toFixed(2) : "5.00",
        Amount: Number(l.amount).toFixed(2),
      })),
    }));

    return res.json({ Vouchers: vouchers });
  } catch (error) {
    console.error("Error in /fetch-sales:", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});



/* ============================================================
   2) TALLY CALLBACK AFTER INSERTION (POST)
   Tally calls this after inserting vouchers
   ============================================================ */
router.post("/sales-callback", async (req, res) => {
  try {
    const results = req.body?.results;

    if (!Array.isArray(results)) {
      return res
        .status(400)
        .json({ ok: false, message: "Invalid results array" });
    }

    for (const result of results) {
      const { billNo, status, message, tallyInvoiceNumber } = result;

      const sale = await Sale.findOne({ billNo });
      if (!sale) continue;

      // Log the full Tally result
      sale.tallyResponseLogs.push({
        timestamp: new Date(),
        data: result,
      });

      if (status === "success") {
        sale.status = "synced";
        sale.tallyInvoiceNumber = tallyInvoiceNumber || "";
        sale.syncError = "";
      } else {
        sale.status = "error";
        sale.syncAttempts += 1;
        sale.syncError = message || "Unknown error";
      }

      await sale.save();
    }

    return res.json({ ok: true, message: "Callback processed" });
  } catch (error) {
    console.error("Error in /sales-callback:", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});


/* ============================================================
   1) INVENTORY SYNC (LOCAL NODE → VPS)
   Local agent posts inventory pulled from Tally XML
   ============================================================ */
router.post("/inventory-sync", async (req, res) => {
  try {
    const { companyName, items } = req.body;

    if (!companyName || !Array.isArray(items)) {
      return res.status(400).json({
        ok: false,
        message: "companyName and items array required",
      });
    }

    for (const item of items) {
      const {
        itemName,
        itemCode,
        itemGroup,
        description,
        unit,
        openingQty,
        availableQty,
        closingQty,
        avgRate,
        closingValue,
        vatRate,
        gstRate,
        godowns,
      } = item;

      // Upsert inventory item
      await Inventory.findOneAndUpdate(
        { companyName, itemCode },
        {
          companyName,
          itemName,
          itemCode,
          itemGroup,
          description,
          unit,
          openingQty,
          availableQty,
          closingQty,
          avgRate,
          closingValue,
          vatRate,
          gstRate,
          godowns: godowns || [],
          lastSyncedAt: new Date(),
        },
        { upsert: true, new: true }
      );
    }

    return res.json({
      ok: true,
      message: "Inventory synced successfully",
      count: items.length,
    });
  } catch (error) {
    console.error("inventory-sync error:", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

/* ============================================================
   2) CUSTOMER SYNC (LOCAL NODE → VPS)
   Local agent posts customer data pulled from Tally XML
   ============================================================ */
router.post("/customer-sync", async (req, res) => {
  try {
    const { companyName, customers } = req.body;

    if (!companyName || !Array.isArray(customers)) {
      return res.status(400).json({
        ok: false,
        message: "companyName and customers array required",
      });
    }

    for (const cust of customers) {
      const {
        partyCode,
        partyName,
        partyVatNo,
        address,
        contactPerson,
        phone,
        email,
        ledgerName,
        ledgerGroup,
      } = cust;

      await Customer.findOneAndUpdate(
        { companyName, partyCode },
        {
          companyName,
          partyCode,
          partyName,
          partyVatNo,
          address: address?.map((a) => ({ line: a })) || [],
          contactPerson,
          phone,
          email,
          ledgerName,
          ledgerGroup,
          lastSyncedAt: new Date(),
        },
        { upsert: true, new: true }
      );
    }

    return res.json({
      ok: true,
      message: "Customers synced successfully",
      count: customers.length,
    });
  } catch (error) {
    console.error("customer-sync error:", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});



/* ============================================================
   1) NEW CUSTOMER FROM TALLY (Real-time push)
   ============================================================ */
router.post("/new-customer", async (req, res) => {
  try {
    const { companyName, customer } = req.body;

    if (!companyName || !customer) {
      return res.status(400).json({
        ok: false,
        message: "companyName and customer object are required",
      });
    }

    const {
      partyCode,
      partyName,
      partyVatNo,
      address,
      contactPerson,
      phone,
      email,
      ledgerName,
      ledgerGroup,
    } = customer;

    await Customer.findOneAndUpdate(
      { companyName, partyCode },
      {
        companyName,
        partyCode,
        partyName,
        partyVatNo,
        address: address?.map((a) => ({ line: a })) || [],
        contactPerson,
        phone,
        email,
        ledgerName,
        ledgerGroup,
        lastSyncedAt: new Date(),
        source: "tally",
      },
      { upsert: true, new: true }
    );

    return res.json({ ok: true, message: "Customer updated from Tally" });
  } catch (error) {
    console.error("new-customer error:", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

/* ============================================================
   2) NEW INVENTORY ITEM FROM TALLY (Real-time push)
   ============================================================ */
router.post("/new-inventory", async (req, res) => {
  try {
    const { companyName, item } = req.body;

    if (!companyName || !item) {
      return res.status(400).json({
        ok: false,
        message: "companyName and item object are required",
      });
    }

    const {
      itemName,
      itemCode,
      itemGroup,
      description,
      unit,
      openingQty,
      availableQty,
      closingQty,
      avgRate,
      closingValue,
      vatRate,
      gstRate,
      godowns,
    } = item;

    await Inventory.findOneAndUpdate(
      { companyName, itemCode },
      {
        companyName,
        itemName,
        itemCode,
        itemGroup,
        description,
        unit,
        openingQty,
        availableQty,
        closingQty,
        avgRate,
        closingValue,
        vatRate,
        gstRate,
        godowns: godowns || [],
        lastSyncedAt: new Date(),
        source: "tally",
      },
      { upsert: true, new: true }
    );

    return res.json({ ok: true, message: "Inventory item updated from Tally" });
  } catch (error) {
    console.error("new-inventory error:", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});






/* ============================================================
   GET INVENTORY (From MongoDB — For MERN App)
   ============================================================ */
router.get("/inventory", async (req, res) => {
  try {
    const { companyName, search, page = 1, limit = 50 } = req.query;

    // Basic query
    let query = {};

    // Filter by company
    if (companyName) {
      query.companyName = companyName;
    }

    // Search filter
    if (search) {
      query.$or = [
        { itemName: { $regex: search, $options: "i" } },
        { itemCode: { $regex: search, $options: "i" } },
        { itemGroup: { $regex: search, $options: "i" } }
      ];
    }

    const skip = (page - 1) * limit;

    const items = await Inventory.find(query)
      .lean()
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ itemName: 1 });

    const total = await Inventory.countDocuments(query);

    return res.json({
      ok: true,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      items,
    });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});







/* ============================================================
   ADD SALE (MERN APP → SERVER)
   Users create a sale inside the web app. Stored as pending.
   ============================================================ */
router.post("/add-sale", async (req, res) => {
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
router.get("/list-sales", async (req, res) => {
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
   LIST ALL CUSTOMERS (GET)
   Supports: search, company filter, pagination
   ============================================================ */
router.get("/customers", async (req, res) => {
  try {
    let { page = 1, limit = 50, search = "", companyName = "" } = req.query;

    page = Number(page);
    limit = Number(limit);

    const query = {};

    // Optional filter by company
    if (companyName) {
      query.companyName = companyName;
    }

    // Optional search (partyName, partyCode, phone, email)
    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { partyName: regex },
        { partyCode: regex },
        { phone: regex },
        { email: regex }
      ];
    }

    // Count total customers
    const total = await Customer.countDocuments(query);

    // Fetch paginated customers
    const customers = await Customer.find(query)
      .sort({ partyName: 1 }) // alphabetical
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return res.json({
      ok: true,
      customers,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});


/* ============================================================
   GET SINGLE SALE (with full details + logs)
   /sale/:billNo
   ============================================================ */
router.get("/sale/:billNo", async (req, res) => {
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

router.put("/inventory/update-image/:id", upload.single("image"), async (req, res) => {
  try {
    const inventoryId = req.params.id;

    if (!req.file) {
      return res.status(400).json({ ok: false, message: "Image file required" });
    }

    const filePath = "/uploads/inventory/" + req.file.filename;

    const inv = await Inventory.findByIdAndUpdate(
      inventoryId,
      { imageUrl: filePath },
      { new: true }
    ).lean();

    if (!inv) {
      // Delete uploaded file if item not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ ok: false, message: "Inventory item not found" });
    }

    return res.json({
      ok: true,
      message: "Image updated successfully",
      imageUrl: filePath,
      inventory: inv,
    });
  } catch (error) {
    console.error("Update inventory image error:", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});


router.put("/inventory/remove-image/:id", async (req, res) => {
  try {
    const inventoryId = req.params.id;

    const inv = await Inventory.findById(inventoryId);

    if (!inv) {
      return res.status(404).json({ ok: false, message: "Inventory item not found" });
    }

    // Remove file from disk
    if (inv.imageUrl) {
      const filePath = path.join(__dirname, "..", inv.imageUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Clear DB field
    inv.imageUrl = "";
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
router.put('/editSaleOrder/:id', async (req, res) => {
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
router.delete('/deleteSaleOrder/:id', async (req, res) => {
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
router.get('/getAllSaleOrders', async (req, res) => {
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
router.get("/sale-orders/:billNo", async (req, res) => {
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


router.get("/getProductBasic", async (req, res) => {
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





router.get("/getAllCustomers", async (req, res) => {
  try {
    const { companyName } = req.query;

    if (!companyName) {
      return res.status(400).json({
        ok: false,
        message: "companyName is required",
      });
    }

    const customers = await Customer.find({ companyName }).lean();

    return res.json({
      ok: true,
      companyName,
      count: customers.length,
      customers,
    });

  } catch (error) {
    console.error("Error fetching customers:", error);
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});



module.exports = router;
