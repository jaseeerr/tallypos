var express = require('express');
var router = express.Router();
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const Auth = require("../auth/auth");
const Sale = require("../models/Sale");
const Inventory = require('../models/Inventory')
/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('DataEntryPoint');
});


// Ensure upload directory exists
const uploadDir = path.join(__dirname, "../uploads/inventory");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `inv_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

// Optional: file filter (recommended)
const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only image files are allowed"), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB per image
});


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express tallyPos' });
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

function extractPrimaryUnit(units = "") {
  const u = units.toLowerCase();
  if (u.includes("doz")) return "Doz";
  if (u.includes("gross")) return "Gross";
  if (u.includes("pair")) return "Pair";
  return "pcs";
}

function extractUnitCount(stockStr = "") {
  if (typeof stockStr !== "string") return 0;
  const match = stockStr.match(/(-?\d+)/);
  return match ? Number(match[1]) : 0;
}

function buildQtyString(qty, unit) {
  return `${qty} ${unit}`;
}

async function applyUnsyncedSalesDeduction({ items }) {
  if (!items.length) return items;

  const itemNames = items.map((i) => i.NAME);

  const unsyncedSales = await Sale.find({
    status: { $in: ["pending", "processing"] },
    "items.itemName": { $in: itemNames },
  }).lean();

  const unsyncedMap = {};

  unsyncedSales.forEach((sale) => {
    const company = sale.companyName;

    sale.items.forEach((saleItem) => {
      if (!itemNames.includes(saleItem.itemName)) return;

      if (!unsyncedMap[company]) unsyncedMap[company] = {};
      unsyncedMap[company][saleItem.itemName] =
        (unsyncedMap[company][saleItem.itemName] || 0) + saleItem.qty;
    });
  });

  return items.map((item) => {
    const result = { ...item };

    Object.keys(item)
      .filter((k) => k.endsWith("Stock"))
      .forEach((stockKey) => {
        const company = stockKey.replace("Stock", "");

        const unit = extractPrimaryUnit(item[`${company}Unit`] || "");
        const grossQty = extractUnitCount(item[stockKey]);
        const unsyncedQty =
          unsyncedMap[company]?.[item.NAME] || 0;

        const netQty = grossQty - unsyncedQty;

        result[`${company}-UnsyncedQty`] = unsyncedQty;
        result[`${company}-NetAvailable`] =
          buildQtyString(netQty, unit);
      });

    return result;
  });
}

/* ============================================================
   GET INVENTORY (With Cross-Company Stock Insight)
   ============================================================ */

router.get("/inventory", async (req, res) => {
  try {
    const {
      companyName,
      search = "",
      page = 1,
      limit = 30,
      getRaw = "false",
      includeOutOfStock = "false",
    } = req.query;

    const shouldGetRaw = getRaw === "true";

    const parsedLimit = Math.min(parseInt(limit, 10), 200);
    const parsedPage = Math.max(parseInt(page, 10), 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const query = {};

    // ✅ Company filter (PRIMARY company only)
    if (companyName && companyName !== "ALL") {
      query.companyName = companyName;
    }

    // ✅ Text search
    if (search.trim()) {
      query.$or = [
        { NAME: { $regex: search, $options: "i" } },
        { GROUP: { $regex: search, $options: "i" } },
      ];
    }

    // 1️⃣ Fetch inventory of selected company only
    const rawItems = await Inventory.find(query)
      .lean()
      .sort({ NAME: 1 });

    // 2️⃣ Enrich each item with other-company stock (DISPLAY ONLY)
 let processedItems = await Promise.all(
  rawItems.map(async (item) => {
    const closingQtyPieces = parseClosingQtyToPieces(item.CLOSINGQTY);

    // Base object (ALWAYS returned)
    const baseItem = {
      ...item,
      closingQtyPieces,
      isOutOfStock: closingQtyPieces <= 0,
    };

    // 🚀 Skip cross-company work unless explicitly requested
    if (!shouldGetRaw) {
      return baseItem;
    }

    // 🔹 Raw mode: fetch same NAME from other companies
    const sameNameProducts = await Inventory.find({
      NAME: item.NAME,
      _id: { $ne: item._id },
    }).lean();

    const companyStockUnitMap = {};

    // Primary company
    companyStockUnitMap[`${item.companyName}Stock`] = item.CLOSINGQTY;
    companyStockUnitMap[`${item.companyName}Unit`] = item.UNITS;

    // Other companies
    sameNameProducts.forEach((p) => {
      companyStockUnitMap[`${p.companyName}Stock`] = p.CLOSINGQTY;
companyStockUnitMap[`${p.companyName}Unit`] = p.UNITS;

    });

    return {
      ...baseItem,
      ...companyStockUnitMap,
    };
  })
);

processedItems = await applyUnsyncedSalesDeduction({
  items: processedItems,
  companyName,
});


    // 3️⃣ Backend stock filter (PRIMARY company only)
    const filteredItems =
      includeOutOfStock === "true"
        ? processedItems
        : processedItems.filter((i) => i.closingQtyPieces > 0);

    const total = filteredItems.length;

    // 4️⃣ Pagination AFTER filtering
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




router.put("/inventory/add-images/:id",Auth.userAuth,upload.array("images", 10), async (req, res) => {
    try {
      const inventoryId = req.params.id;

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          ok: false,
          message: "At least one image is required"
        });
      }

      const inv = await Inventory.findById(inventoryId);

      if (!inv) {
        // cleanup uploaded files
        req.files.forEach(file => fs.unlinkSync(file.path));
        return res.status(404).json({
          ok: false,
          message: "Inventory item not found"
        });
      }

      const newImages = req.files.map(
        file => `uploads/inventory/${file.filename}`
      );

      console.log(typeof inv.imageUrl, inv.imageUrl);
if (!Array.isArray(inv.imageUrl)) {
  inv.imageUrl = [];
}

      inv.imageUrl = [...inv.imageUrl, ...newImages];
      await inv.save();

      return res.json({
        ok: true,
        message: "Images added successfully",
        images: newImages,
        inventory: inv
      });

    } catch (error) {
      console.error("Add inventory images error:", error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  }
);
module.exports = router;
