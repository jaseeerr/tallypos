var express = require('express');
var router = express.Router();
const Customer = require('../models/Customer')
const Inventory = require('../models/Inventory')
const Sale = require('../models/Sale')

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
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
    const { company, items } = req.body;
    const companyName = company;

    console.log("\n===============================");
    console.log("📦 NEW SYNC REQUEST");
    console.log("Company:", companyName);
    console.log("Items received:", items.length);
    console.log("===============================\n");

    if (!companyName || !Array.isArray(items)) {
      return res.status(400).json({
        ok: false,
        message: "companyName and items array required",
      });
    }

    let inserted = 0;
    let updated = 0;

   for (let i = 0; i < items.length; i++) {
  const raw = items[i];

  // Map Tally fields to expected fields
  const itemName = raw.NAME;
  const itemGroup = raw.GROUP;
  const unit = raw.UNITS;
  const closingQty = raw.CLOSINGQTY;
  const salesPrice = raw.SALESPRICE;
  const stdCost = raw.STDCOST;

  console.log(`\n▶ Processing item ${i + 1}/${items.length}`);
  console.log("RAW ITEM:", JSON.stringify(raw, null, 2));

  if (!itemName || itemName.trim() === "") {
    console.log("❌ Skipped: itemName is empty");
    continue;
  }

  const updateQuery = {
    companyName,
    NAME: itemName.trim(),
    GROUP: itemGroup || "",
    UNITS: unit || "",
    CLOSINGQTY: closingQty || "",
    SALESPRICE: salesPrice || "",
    STDCOST: stdCost || "",
    lastSyncedAt: new Date()
  };

  console.log("⬆ UPSERT QUERY:", JSON.stringify(updateQuery, null, 2));

  await Inventory.findOneAndUpdate(
    { companyName, NAME: itemName.trim() },
    updateQuery,
    { upsert: true, new: true }
  );

  console.log(`✅ Saved item → NAME: ${itemName.trim()}`);
}


    console.log("\n===============================");
    console.log("🎉 SYNC COMPLETED");
    console.log("Inserted:", inserted);
    console.log("Updated:", updated);
    console.log("Total Received:", items.length);
    console.log("===============================\n");

    return res.json({
      ok: true,
      message: "Inventory synced successfully",
      received: items.length,
      inserted,
      updated
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
        message: "companyName and customers array are required",
      });
    }

    let syncedCount = 0;

    for (const cust of customers) {
      const { name, group, balance, address } = cust;

      if (!name) continue; // Skip invalid records

      await Customer.findOneAndUpdate(
        {
          companyName,
          name, // customer name is unique within company
        },
        {
          companyName,
          name,
          group: group || "",
          balance: balance || "",
          address: Array.isArray(address) ? address : [],
          lastSyncedAt: new Date(),
        },
        { upsert: true, new: true }
      );

      syncedCount++;
    }

    return res.json({
      ok: true,
      message: "Customers synced successfully",
      count: syncedCount,
      companyName,
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
