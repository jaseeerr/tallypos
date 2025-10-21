const express = require('express');
const router = express.Router();
const Sale = require("../models/Sale");
const Purchase = require('../models/Purchase')
const Product = require("../models/Product");




/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express tallyPos' });
});




//  ADD SALE
router.post("/addSale", async (req, res) => {
  try {
    const data = req.body;

    if (!data.voucherNumber || !data.partyLedgerName || !data.date) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    // Compute totals from items
    const totalBeforeVAT = data.items?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0;
    const totalVAT = data.items?.reduce((sum, i) => sum + (i.vatAmount || 0), 0) || 0;
    const netAmount = totalBeforeVAT + totalVAT;

    const sale = await Sale.create({
      ...data,
      totalBeforeVAT,
      totalVAT,
      netAmount,
    });

    res.status(201).json({ success: true, data: sale });
  } catch (err) {
    console.error("Add Sale Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


//  GET ALL SALES (optionally filter by date or party)
router.get("/getSales", async (req, res) => {
  try {
    const { startDate, endDate, partyLedgerName } = req.query;
    const filter = {};

    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (partyLedgerName) {
      filter.partyLedgerName = new RegExp(partyLedgerName, "i");
    }

    const sales = await Sale.find(filter).sort({ date: -1 });
    res.json({ success: true, count: sales.length, data: sales });
  } catch (err) {
    console.error("Get Sales Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

//  EDIT SALE
router.put("/editSale/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    // Compute totals again from items
    const totalBeforeVAT =
      data.items?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0;
    const totalVAT =
      data.items?.reduce((sum, i) => sum + (i.vatAmount || 0), 0) || 0;
    const netAmount = totalBeforeVAT + totalVAT;

    const sale = await Sale.findByIdAndUpdate(
      id,
      { ...data, totalBeforeVAT, totalVAT, netAmount },
      { new: true }
    );

    if (!sale)
      return res
        .status(404)
        .json({ success: false, message: "Sale not found" });

    res.json({ success: true, data: sale });
  } catch (err) {
    console.error("Edit Sale Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


//  DELETE SALE
router.delete("/deleteSale/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const sale = await Sale.findByIdAndDelete(id);

    if (!sale)
      return res.status(404).json({ success: false, message: "Sale not found" });

    res.json({ success: true, message: "Sale deleted successfully" });
  } catch (err) {
    console.error("Delete Sale Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});



// purchase



//  ADD PURCHASE
router.post("/addPurchase", async (req, res) => {
  try {
    const data = req.body;

    if (!data.voucherNumber || !data.partyLedgerName || !data.date) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    // Compute totals from purchase items
    const totalBeforeVAT =
      data.items?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0;
    const totalVAT =
      data.items?.reduce((sum, i) => sum + (i.vatAmount || 0), 0) || 0;
    const netAmount = totalBeforeVAT + totalVAT;

    const purchase = await Purchase.create({
      ...data,
      totalBeforeVAT,
      totalVAT,
      netAmount,
    });

    res.status(201).json({ success: true, data: purchase });
  } catch (err) {
    console.error("Add Purchase Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


//  GET ALL PURCHASES (optionally filter by date or supplier)
router.get("/getPurchases", async (req, res) => {
  try {
    const { startDate, endDate, partyLedgerName } = req.query;
    const filter = {};

    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (partyLedgerName) {
      filter.partyLedgerName = new RegExp(partyLedgerName, "i");
    }

    const purchases = await Purchase.find(filter).sort({ date: -1 });
    res.json({ success: true, count: purchases.length, data: purchases });
  } catch (err) {
    console.error("Get Purchases Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

//  EDIT PURCHASE
router.put("/editPurchase/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    // Compute totals again from items
    const totalBeforeVAT =
      data.items?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0;
    const totalVAT =
      data.items?.reduce((sum, i) => sum + (i.vatAmount || 0), 0) || 0;
    const netAmount = totalBeforeVAT + totalVAT;

    const purchase = await Purchase.findByIdAndUpdate(
      id,
      { ...data, totalBeforeVAT, totalVAT, netAmount },
      { new: true }
    );

    if (!purchase)
      return res
        .status(404)
        .json({ success: false, message: "Purchase not found" });

    res.json({ success: true, data: purchase });
  } catch (err) {
    console.error("Edit Purchase Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


//  DELETE PURCHASE
router.delete("/deletePurchase/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const purchase = await Purchase.findByIdAndDelete(id);

    if (!purchase)
      return res.status(404).json({ success: false, message: "Purchase not found" });

    res.json({ success: true, message: "Purchase deleted successfully" });
  } catch (err) {
    console.error("Delete Purchase Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});




//  ADD PRODUCT
router.post("/addProduct", async (req, res) => {
  try {
    const data = req.body;

    if (!data.name) {
      return res
        .status(400)
        .json({ success: false, message: "Product name is required" });
    }

    const product = await Product.create(data);
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    console.error("Add Product Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

//  GET ALL PRODUCTS (optional search by name/code)
router.get("/getAllProducts", async (req, res) => {
  try {
    const { search } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: new RegExp(search, "i") },
        { code: new RegExp(search, "i") },
      ];
    }

    const products = await Product.find(filter).sort({ name: 1 });
    res.json({ success: true, count: products.length, data: products });
  } catch (err) {
    console.error("Get Products Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

//  EDIT PRODUCT
router.put("/editProduct/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const product = await Product.findByIdAndUpdate(id, updates, { new: true });
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    res.json({ success: true, data: product });
  } catch (err) {
    console.error("Edit Product Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

//  DELETE PRODUCT
router.delete("/deleteProduct/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);

    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    res.json({ success: true, message: "Product deleted successfully" });
  } catch (err) {
    console.error("Delete Product Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});





// custom triggers


//  GET /getAllSalesForTally
router.get("/getAllSalesForTally", async (req, res) => {
  try {
    const sales = await Sale.find().sort({ date: -1 }); // latest first
    res.status(200).json({
      success: true,
      count: sales.length,
      data: sales,
    });
  } catch (err) {
    console.error("Error fetching sales for Tally:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch sales for Tally",
      error: err.message,
    });
  }
});



//  GET /getAllPurchasesForTally
router.get("/getAllPurchasesForTally", async (req, res) => {
  try {
    const purchases = await Purchase.find().sort({ date: -1 }); // newest first
    res.status(200).json({
      success: true,
      count: purchases.length,
      data: purchases,
    });
  } catch (err) {
    console.error("Error fetching purchases for Tally:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch purchases for Tally",
      error: err.message,
    });
  }
});


//  Update inventory from Tally using product code
router.post("/updateInventoryFromTally", async (req, res) => {
  try {
    const { inventory } = req.body;

    if (!inventory || !Array.isArray(inventory)) {
      return res.status(400).json({ success: false, message: "Invalid inventory format" });
    }

    let updated = 0;
    let inserted = 0;

    for (const item of inventory) {
      if (!item.itemCode) continue; // must have a unique code

      const existing = await Product.findOne({ code: item.itemCode });

      if (existing) {
        await Product.findOneAndUpdate(
          { code: item.itemCode },
          {
            $set: {
              name: item.itemName || existing.name,
              unit: item.unit || existing.unit,
              rate: item.rate || existing.rate,
              vatPercent: item.vatPercent ?? existing.vatPercent,
              stockQty: item.closingStock ?? existing.stockQty,
            },
          }
        );
        updated++;
      } else {
        await Product.create({
          code: item.itemCode,
          name: item.itemName || "",
          unit: item.unit || "",
          rate: item.rate || 0,
          vatPercent: item.vatPercent || 0,
          stockQty: item.closingStock || 0,
        });
        inserted++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Inventory sync complete — ${updated} updated, ${inserted} added`,
    });
  } catch (err) {
    console.error("Error updating inventory:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update inventory",
      error: err.message,
    });
  }
});




module.exports = router;
