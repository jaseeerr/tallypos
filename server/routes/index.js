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



module.exports = router;
