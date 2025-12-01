const express = require('express');
const router = express.Router();
const Sale = require("../models/Sale");
const Inventory = require('../models/Inventory');
const Customer = require('../models/Customer');




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
    const company = req.query.company;

    if (!company) {
      return res.status(400).json({ ok: false, message: "company is required" });
    }

    // 1. Fetch all pending sales
    const pendingSales = await Sale.find({
      companyName: company,
      status: "pending",
    }).lean();

    // 2. Mark them as "processing"
    await Sale.updateMany(
      { companyName: company, status: "pending" },
      { $set: { status: "processing" } }
    );

    // 3. Transform into Tally-compatible response
    const vouchers = pendingSales.map((sale) => ({
      TYPE: "Sales Invoice",
      BILLNO: sale.billNo,
      DATE: sale.date.toISOString().split("T")[0],
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
        QTY: i.qty.toFixed(4),
        UNIT: i.unit,
        RATE: i.rate.toFixed(2),
        AMOUNT: i.amount.toFixed(2),
        Rateoftax: i.rateOfTax?.toFixed(2) || "0.00",
      })),

      LEDGERS: sale.ledgers.map((l) => ({
        LEDGERSNAME: l.ledgerName,
        Percentage: l.percentage.toFixed(2),
        Amount: l.amount.toFixed(2),
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
      reference,
      remarks,
      totalAmount,

      isCashSale,
      cashLedgerName,

      partyCode,
      partyName,
      partyVatNo,
      partyAddress,

      items,
      ledgers,

      createdBy,
    } = data;

    // Basic validation
    if (!companyName || !billNo || !date || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        ok: false,
        message: "companyName, billNo, date and items[] are required",
      });
    }

    // Check duplicate billNo
    const exists = await Sale.findOne({ billNo, companyName });
    if (exists) {
      return res.status(400).json({
        ok: false,
        message: "Bill number already exists for this company",
      });
    }

    // Create sale object
    const newSale = new Sale({
      companyName,

      billNo,
      date,
      reference: reference || "",
      remarks: remarks || "",
      totalAmount,

      // CASH SALE or CUSTOMER SALE
      isCashSale: !!isCashSale,
      cashLedgerName: cashLedgerName || "",

      partyCode: isCashSale ? "" : (partyCode || ""),
      partyName: isCashSale ? "" : (partyName || ""),
      partyVatNo: isCashSale ? "" : (partyVatNo || ""),
      partyAddress: isCashSale
        ? []
        : (partyAddress || []).map(a => ({ address: a })),

      // ITEMS
      items: items.map(i => ({
        itemName: i.itemName,
        itemCode: i.itemCode,
        itemGroup: i.itemGroup,
        description: i.description,
        qty: i.qty,
        unit: i.unit,
        rate: i.rate,
        amount: i.amount,
        rateOfTax: i.rateOfTax,
      })),

      // LEDGERS
      ledgers: ledgers ? ledgers.map(l => ({
        ledgerName: l.ledgerName,
        percentage: l.percentage,
        amount: l.amount,
      })) : [],

      // SYNC STATUS
      status: "pending",
      syncAttempts: 0,
      syncError: "",
      tallyInvoiceNumber: "",
      tallyResponseLogs: [],

      createdBy: createdBy || null,
      updatedBy: createdBy || null,
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


module.exports = router;
