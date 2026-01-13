const express = require('express');
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const argon2 = require('argon2')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose');
const EventLog = require("../models/EventLog");


const Auth = require('../auth/auth')

const Sale = require("../models/Sale");
const Inventory = require('../models/Inventory');
const Customer = require('../models/Customer');
const SaleOrder = require('../models/SaleOrder')
const Admin = require('../models/Admin')


// Ensure upload directory exists
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
      { expiresIn: "365d" }
    );

    res.json({ message: "Login successful", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});






// Helper to sync stock with pending and processing sales
/**
 * Apply unsynced (pending + processing) sales deduction
 * Works for both getRaw=true and getRaw=false
 */
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

  // 1️⃣ Fetch ALL unsynced sales (all companies)
  const unsyncedSales = await Sale.find({
    status: { $in: ["pending", "processing"] },
    "items.itemName": { $in: itemNames },
  }).lean();

  // 2️⃣ Build map: company → item → qty
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

  // 3️⃣ Apply deduction PER COMPANY
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
   GET INVENTORY (With Cross-Company Stock Insight)
   ============================================================ */

router.get("/inventory", Auth.userAuth, async (req, res) => {
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


router.get("/inventoryOldStableSlow", Auth.userAuth, async (req, res) => {
  try {
    const {
      companyName,
      search = "",
      page = 1,
      limit = 30,
      includeOutOfStock = "false",
    } = req.query;

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
    const processedItems = await Promise.all(
      rawItems.map(async (item) => {
        // Parse selected company stock
        const closingQtyPieces = parseClosingQtyToPieces(
          item.CLOSINGQTY
        );

        // Find same NAME items in other companies
        const sameNameProducts = await Inventory.find({
          NAME: item.NAME,
          _id: { $ne: item._id },
        }).lean();

        const companyStockUnitMap = {};

        // 🔹 Selected company (PRIMARY)
        companyStockUnitMap[`${item.companyName}Stock`] =
          closingQtyPieces;
        companyStockUnitMap[`${item.companyName}Unit`] =
          item.UNITS;

        // 🔹 Other companies (SECONDARY, display-only)
        sameNameProducts.forEach((p) => {
          companyStockUnitMap[`${p.companyName}Stock`] =
            parseClosingQtyToPieces(p.CLOSINGQTY);
          companyStockUnitMap[`${p.companyName}Unit`] =
            p.UNITS;
        });

        return {
          ...item,

          // ✅ Primary company fields (unchanged)
          closingQtyPieces,
          isOutOfStock: closingQtyPieces <= 0,

          // ✅ Cross-company insight
          ...companyStockUnitMap,
        };
      })
    );

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





/**
 * GET PRODUCT BY ID
 * body: { companyName: String }
 */

router.post("/inventory/:id", Auth.userAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { companyName } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, message: "Invalid product id" });
    }

    // 1️⃣ Fetch product
    const product = await Inventory.findById(id).lean();
    if (!product) {
      return res.status(404).json({ ok: false, message: "Product not found" });
    }

    // 2️⃣ Find same-name products
    const sameNameProducts = await Inventory.find({
      NAME: product.NAME,
      _id: { $ne: product._id },
    }).lean();

    // 3️⃣ Build SAME shape as /inventory
    let items = [
      {
        ...product,
        closingQtyPieces: parseClosingQtyToPieces(product.CLOSINGQTY),
      },
    ];

    // attach cross-company raw stock (same as /inventory)
    sameNameProducts.forEach((p) => {
      items[0][`${p.companyName}Stock`] = p.CLOSINGQTY;
      items[0][`${p.companyName}Unit`] = p.UNITS;
    });

    items[0][`${product.companyName}Stock`] = product.CLOSINGQTY;
    items[0][`${product.companyName}Unit`] = product.UNITS;

    // 4️⃣ 🔥 APPLY SAME HELPER 🔥
    items = await applyUnsyncedSalesDeduction({
      items,
      companyName: product.companyName,
    });

    return res.json({
      ok: true,
      product: items[0],
    });
  } catch (error) {
    console.error("Error fetching product by id:", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});



router.post("/inventoryOldStable/:id", Auth.userAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { companyName } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          ok: false,
          message: "Invalid product id",
        });
      }

      // 1️⃣ Fetch main product
      const product = await Inventory.findById(id).lean();

      if (!product) {
        return res.status(404).json({
          ok: false,
          message: "Product not found",
        });
      }

      const closingQtyPieces = parseClosingQtyToPieces(product.CLOSINGQTY);

      // 2️⃣ Find other products with SAME NAME but DIFFERENT company
      const sameNameProducts = await Inventory.find({
        NAME: product.NAME,
        _id: { $ne: product._id },
      }).lean();

      // 3️⃣ Build dynamic stock & unit fields
      const companyStockUnitMap = {};

      // current product
      companyStockUnitMap[`${product.companyName}Stock`] =
        closingQtyPieces;
      companyStockUnitMap[`${product.companyName}Unit`] =
        product.UNITS;

      // other companies
      sameNameProducts.forEach((p) => {
        companyStockUnitMap[`${p.companyName}Stock`] =
          parseClosingQtyToPieces(p.CLOSINGQTY);
        companyStockUnitMap[`${p.companyName}Unit`] =
          p.UNITS;
      });

      const isCompanyMismatch =
        companyName && product.companyName !== companyName;

      return res.json({
        ok: true,
        product: {
          ...product,
          closingQtyPieces,
          disable: isCompanyMismatch,
          ...companyStockUnitMap,
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


/**
 * BULK FETCH INVENTORY BY IDS
 * body: { ids: string[] }
 */
router.post("/inventoryBulk", Auth.userAuth, async (req, res) => {
    try {
      const { ids } = req.body;
console.log(ids)
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          ok: false,
          ids,
          message: "ids must be a non-empty array",
        });
      }

      // Validate ObjectIds
      const validIds = ids.filter((id) =>
        mongoose.Types.ObjectId.isValid(id)
      );

      if (validIds.length === 0) {
        return res.json({
          ok: true,
          items: [],
        });
      }

      // Single DB query
      const products = await Inventory.find({
        _id: { $in: validIds },
      }).lean();

      // Add derived fields only
      const items = products.map((product) => ({
        ...product,
        closingQtyPieces: parseClosingQtyToPieces(
          product.CLOSINGQTY
        ),
      }));

      return res.json({
        ok: true,
        items,
      });
    } catch (error) {
      console.error("Bulk inventory fetch error:", error);
      return res.status(500).json({
        ok: false,
        error: error.message,
      });
    }
  }
);


// image file proxy for pdf
router.get("/inventory-image", async (req, res) => {
  try {
    const { path } = req.query

    if (!path) {
      return res.status(400).json({ message: "Missing image path" })
    }

    const fullPath = require("path").join(
      __dirname,
      "..",
      "uploads",
      path.replace(/^\/?uploads\//, "")
    )

    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Cache-Control", "public, max-age=86400")

    res.sendFile(fullPath)
  } catch (err) {
    res.status(404).end()
  }
})


router.post(
  "/inventoryBulkImages",
  Auth.userAuth,
  async (req, res) => {
    try {
      const { names } = req.body

      if (!Array.isArray(names) || names.length === 0) {
        return res.status(400).json({
          ok: false,
          message: "names must be a non-empty array",
        })
      }

      // Normalize names (trim + uppercase safety)
      const normalizedNames = names.map((n) => n.trim())

      // Fetch all matching inventory records
      const products = await Inventory.find({
        NAME: { $in: normalizedNames },
      })
        .select("NAME imageUrl companyName")
        .lean()

      /**
       * Build image map:
       * {
       *   "PRODUCT NAME": {
       *     images: [...],
       *     companyName: "XYZ"
       *   }
       * }
       */
      const imageMap = {}

      for (const name of normalizedNames) {
        // Find first product with images
        const productWithImages = products.find(
          (p) =>
            p.NAME === name &&
            Array.isArray(p.imageUrl) &&
            p.imageUrl.length > 0
        )

        if (productWithImages) {
          imageMap[name] = {
            images: productWithImages.imageUrl,
            companyName: productWithImages.companyName,
          }
        } else {
          imageMap[name] = {
            images: [],
            companyName: null,
          }
        }
      }

      return res.json({
        ok: true,
        items: imageMap,
      })
    } catch (error) {
      console.error("Bulk inventory image fetch error:", error)
      return res.status(500).json({
        ok: false,
        error: error.message,
      })
    }
  }
)


// EDIT INVENTORY ITEM
router.put("/editInventoryItem/:id", async (req, res) => {
  try {
    const { id } = req.params

    // Only allow editable fields (security)
    const allowedFields = [
      "SALESPRICE",
      "STDCOST",
      "GROUP",
      "UNITS",
      "NAME",
      "note", // 👈 added
    ]

    const updates = {}

    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key]
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No valid fields provided for update",
      })
    }

    const updatedItem = await Inventory.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    )

    if (!updatedItem) {
      return res.status(404).json({
        message: "Inventory item not found",
      })
    }

    res.json({
      message: "Inventory item updated successfully",
      item: updatedItem,
    })
  } catch (err) {
    console.error("Edit inventory error:", err)
    res.status(500).json({
      message: "Server error while updating inventory item",
    })
  }
})



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




router.put(
  "/inventory/delete-image/:id",
  Auth.userAuth,
  async (req, res) => {
    try {
      const inventoryId = req.params.id;
      const { imageUrl } = req.body;

      if (!imageUrl) {
        return res.status(400).json({
          ok: false,
          message: "imageUrl is required",
        });
      }

      const inventory = await Inventory.findById(inventoryId);

      if (!inventory) {
        return res.status(404).json({
          ok: false,
          message: "Inventory item not found",
        });
      }

      // Check image exists in array
      if (!inventory.imageUrl.includes(imageUrl)) {
        return res.status(400).json({
          ok: false,
          message: "Image not found on this inventory item",
        });
      }

      // Delete file from disk
      const filePath = path.join(
        __dirname,
        "..",
        imageUrl.replace(/^\//, "")
      );

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Remove only this image from array
      inventory.imageUrl = inventory.imageUrl.filter(
        (img) => img !== imageUrl
      );

      await inventory.save();

      return res.json({
        ok: true,
        message: "Image deleted successfully",
        inventory,
      });

    } catch (error) {
      console.error("Delete inventory image error:", error);
      return res.status(500).json({
        ok: false,
        error: error.message,
      });
    }
  }
);










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
      partyVatNo = customer.trn || ""
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



// GET count of sales for a company
router.get("/salesCount/:companyName", async (req, res) => {
  try {
    const { companyName } = req.params;

    if (!companyName) {
      return res.status(400).json({ message: "companyName is required" });
    }

    const count = await Sale.countDocuments({ companyName });

    res.json({
      companyName,
      count,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch sales count",
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


router.delete("/deleteSale/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // 1️⃣ Validate Mongo ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        ok: false,
        message: "Invalid sale ID",
      });
    }

    // 2️⃣ Find sale
    const sale = await Sale.findById(id);

    if (!sale) {
      return res.status(404).json({
        ok: false,
        message: "Sale not found",
      });
    }

    // 3️⃣ Allow delete ONLY if pending
    if (sale.status !== "pending") {
      return res.status(400).json({
        ok: false,
        message: `Cannot delete sale. Status is "${sale.status}". Only pending sales can be deleted.`,
      });
    }

    // 4️⃣ Delete
    await Sale.deleteOne({ _id: id });

    return res.status(200).json({
      ok: true,
      message: `Sale ${sale.billNo} deleted successfully`,
    });

  } catch (error) {
    console.error("Delete sale error:", error);

    return res.status(500).json({
      ok: false,
      message: "Failed to delete sale",
      error: error.message,
    });
  }
});

// convert order to sale
router.post("/convertOrderToSale/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // 1️⃣ Fetch Sale Order
    const saleOrder = await SaleOrder.findById(id);
    if (!saleOrder) {
      return res.status(404).json({ message: "Sale Order not found" });
    }

    // 2️⃣ Prevent double conversion
    if (saleOrder.converted) {
      return res.status(400).json({
        message: "Sale Order already converted",
        convertedAt: saleOrder.convertedAt
      });
    }

    // 3️⃣ Generate bill number (SAME LOGIC AS /salesCount)
    const saleCount = await Sale.countDocuments({
      companyName: saleOrder.companyName
    });

    const companyLetter = saleOrder.companyName.charAt(0).toUpperCase();
    const billNo = `${companyLetter}${1000 + saleCount + 1}`;

    // 4️⃣ Recalculate totals
    const subtotal = saleOrder.items.reduce(
      (sum, item) => sum + item.amount,
      0
    );

    const vatAmount = saleOrder.items.reduce(
      (sum, item) =>
        sum + (item.amount * (item.rateOfTax || 0)) / 100,
      0
    );

    const totalAmount = subtotal + vatAmount;

    // 5️⃣ Create Sale
    const sale = await Sale.create({
      companyName: saleOrder.companyName,

      billNo,
      date: saleOrder.date,
      reference: saleOrder.reference || "",
      remarks: saleOrder.remarks || "",

      subtotal,
      vatAmount,
      totalAmount,

      isCashSale: saleOrder.isCashSale || false,
      cashLedgerName: saleOrder.cashLedgerName || "",

      partyName: saleOrder.partyName || "",
      partyCode: saleOrder.partyCode || "",
      partyVatNo: saleOrder.partyVatNo || "",
      partyAddress: saleOrder.partyAddress || [],

      items: saleOrder.items.map((item) => ({
        itemName: item.itemName,
        itemGroup: item.itemGroup || "",
        unit: item.unit,
        qty: item.qty,
        rate: item.rate,
        amount: item.amount,
        rateOfTax: item.rateOfTax || 0,
        itemCode: item.itemCode || "",
        description: item.description || ""
      })),

      ledgers: saleOrder.ledgers || [],

      createdBy: req.user?._id,
      updatedBy: req.user?._id
    });

    // 6️⃣ Mark Sale Order as converted
    saleOrder.converted = true;
    saleOrder.convertedAt = new Date();
    await saleOrder.save();

    // 7️⃣ Respond
    res.status(201).json({
      message: "Sale Order converted to Sale successfully",
      saleId: sale._id,
      billNo
    });

  } catch (err) {
    console.error("Convert SaleOrder Error:", err);

    res.status(500).json({
      message: "Failed to convert Sale Order",
      error: err.message
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
        { address: regex },
         { trn: regex }, // works for array fields
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

    // 1️⃣ Fetch pending sales
    const pendingSales = await Sale.find({
      companyName: company,
      status: "pending",
    }).lean();

    if (pendingSales.length === 0) {
      return res.json({ Vouchers: [] });
    }

    // 2️⃣ Build vouchers for Tally
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
          l.percentage != null
            ? Number(l.percentage).toFixed(2)
            : "5.00",
        Amount: Number(l.amount).toFixed(2),
      })),
    }));

    // 3️⃣ Update fetched sales:
    //    - mark as processing
    //    - log that Tally fetched them
    const now = new Date();

    await Sale.updateMany(
      { _id: { $in: pendingSales.map((s) => s._id) } },
      {
        $set: { status: "processing" },
        $push: {
          tallyResponseLogs: {
            timestamp: now,
            data: {
              event: "FETCHED_BY_TALLY",
              message: "Sale fetched by Tally",
            },
          },
        },
      }
    );

    console.log(
      "Tally fetched sales:",
      pendingSales.map((s) => s.billNo)
    );

    // 4️⃣ Respond to Tally
    console.log(vouchers)
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
    console.log("sales callback called");
    console.dir(req.body, { depth: null });

    let results = req.body?.results;

    // 🔥 Normalize results
    if (!results) {
      return res.status(400).json({ ok: false, message: "Missing results" });
    }

    if (!Array.isArray(results)) {
      results = [results]; // wrap single object into array
    }

    for (const result of results) {
      const { billNo, status, message, tallyInvoiceNumber } = result;

      const sale = await Sale.findOne({ billNo });
      if (!sale) continue;

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




// event-logs-api

router.get("/getEventLogs", Auth.userAuth, async (req, res) => {
  try {
    const {
      company,
      module,
      action,
      status,
      search = "",
      page = 1,
      limit = 100,
      startDate,
      endDate
    } = req.query;

    // ----------------------------
    // Pagination
    // ----------------------------
    const parsedLimit = Math.min(parseInt(limit, 10), 200);
    const parsedPage = Math.max(parseInt(page, 10), 1);
    const skip = (parsedPage - 1) * parsedLimit;

    // ----------------------------
    // Build query
    // ----------------------------
    const query = {};

    // Company filter
    if (company && company !== "ALL") {
      query.company = company;
    }

    if (module) {
      query.module = module;
    }

    if (action) {
      query.action = action;
    }

    if (status) {
      query.status = status;
    }

    // ----------------------------
    // Date filter (createdAt)
    // ----------------------------
    if (startDate || endDate) {
      query.createdAt = {};

      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // include full day
        query.createdAt.$lte = end;
      }
    }

    // ----------------------------
    // Text search
    // ----------------------------
    if (search.trim()) {
      query.$or = [
        { message: { $regex: search, $options: "i" } },
        { "details.error": { $regex: search, $options: "i" } }
      ];
    }

    // ----------------------------
    // Fetch logs (DB-level sorting)
    // ----------------------------
    const rawLogs = await EventLog.find(query)
      .sort({ timestamp: -1 })
      .lean();

    const total = rawLogs.length;

    // ----------------------------
    // Pagination AFTER filtering
    // ----------------------------
    const paginatedLogs = rawLogs.slice(
      skip,
      skip + parsedLimit
    );

    return res.json({
      ok: true,
      total,
      page: parsedPage,
      limit: parsedLimit,
      logs: paginatedLogs
    });

  } catch (error) {
    console.error("Error fetching event logs:", error);
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});













router.get(
  "/dupitems",
  async (req, res) => {
    try {
      const result = await Inventory.aggregate([
        // 1️⃣ Safely convert CLOSINGQTY to number
        {
          $addFields: {
            closingQtyNumeric: {
              $convert: {
                input: "$CLOSINGQTY",
                to: "double",
                onError: 0,
                onNull: 0,
              },
            },
          },
        },

        // 2️⃣ Keep only in-stock products
        {
          $match: {
            closingQtyNumeric: { $gt: 0 },
          },
        },

        // 3️⃣ Group by NAME
        {
          $group: {
            _id: "$NAME",
            companies: { $addToSet: "$companyName" },
          },
        },

        // 4️⃣ Keep names with multiple companies
        {
          $match: {
            "companies.1": { $exists: true },
          },
        },

        // 5️⃣ Final shape
        {
          $project: {
            _id: 0,
            NAME: "$_id",
            companies: 1,
          },
        },

        // 6️⃣ Optional sort
        {
          $sort: { NAME: 1 },
        },
      ]);

      return res.json({
        ok: true,
        count: result.length,
        data: result,
      });
    } catch (error) {
      console.error("Aggregation error:", error);
      return res.status(500).json({
        ok: false,
        error: error.message,
      });
    }
  }
);






// dashboard apis


router.get("/fetch-health", async (req, res) => {

  const COMPANIES = [
  "AMANA-FIRST-TRADING-LLC",
  "FANCY-PALACE-TRADING-LLC"
];

const MODULES = ["customers", "inventory"];


  try {
    const response = {};

    for (const company of COMPANIES) {
      response[company] = {};

      for (const module of MODULES) {
        const latestLog = await EventLog.findOne({
          company,
          module,
          action: "fetch",
          stage: "fetch"
        })
          .sort({ timestamp: -1 })
          .lean();

        if (!latestLog) {
          response[company][module] = {
            state: "broken",
            lastChecked: null,
            reason: "No fetch log found"
          };
          continue;
        }

        response[company][module] = {
          state: latestLog.status === "success" ? "live" : "broken",
          lastChecked: latestLog.timestamp,
          message: latestLog.message
        };
      }
    }

    return res.json({
      success: true,
      data: response
    });

  } catch (err) {
    console.error("❌ Fetch health check failed:", err.message);

    return res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});




router.get("/sales-attention", async (req, res) => {
  const ATTENTION_THRESHOLD_MS = (1 * 60 + 30) * 1000;


  try {
    const now = Date.now();

    // Only fetch needed fields
  const sales = await Sale.find(
  {
    status: { $in: ["processing", "error"] }
  },
  {
    companyName: 1,
    billNo: 1,
    status: 1,
    tallyResponseLogs: 1
  }
).lean();


    const result = [];
    let erroredCount = 0;
    let attentionCount = 0;

    for (const sale of sales) {
      const logs = sale.tallyResponseLogs || [];

      // ✅ Ignore if success exists
      const hasSuccess = logs.some(
        (log) => log.data?.status === "success"
      );
      if (hasSuccess) continue;

      // 🔴 Explicit error
      if (sale.status === "error") {
        erroredCount++;
        result.push({
          companyName: sale.companyName,
          billNo: sale.billNo,
          type: "errored"
        });
        continue;
      }

      // 🟠 Check fetched timestamp
      const fetchedLog = logs.find(
        (log) => log.data?.event === "FETCHED_BY_TALLY"
      );
      if (!fetchedLog) continue;

      const fetchedAt = new Date(fetchedLog.timestamp).getTime();
      const elapsed = now - fetchedAt;

      if (elapsed > ATTENTION_THRESHOLD_MS) {
        attentionCount++;
        result.push({
          companyName: sale.companyName,
          billNo: sale.billNo,
          type: "needs_attention",
          fetchedAt: fetchedLog.timestamp,
          stuckForSeconds: Math.floor(elapsed / 1000)
        });
      }
    }

    return res.json({
      success: true,
      summary: {
        errored: erroredCount,
        needsAttention: attentionCount
      },
      data: result
    });
  } catch (err) {
    console.error("❌ Sales attention API failed:", err.message);

    return res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});


router.post("/reset-sales-status", async (req, res) => {
  try {
    const { billNos } = req.body;

    if (!Array.isArray(billNos) || billNos.length === 0) {
      return res.status(400).json({
        success: false,
        error: "billNos must be a non-empty array"
      });
    }

    const sales = await Sale.find({
      billNo: { $in: billNos }
    });

    let updated = 0;
    let skipped = 0;

    for (const sale of sales) {
      if (sale.status === "pending" || sale.status === "synced") {
        skipped++;
        continue;
      }

      const currentStatus = sale.status;

      sale.status = "pending";

      sale.tallyResponseLogs.push({
        timestamp: new Date(),
        data: {
          event: `Changing status from ${currentStatus} to pending`
        }
      });

      await sale.save();
      updated++;
    }

    return res.json({
      success: true,
      updated,
      skipped
    });
  } catch (err) {
    console.error("❌ Reset sales status failed:", err.message);

    return res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});









router.get(
  "/CurrentLiveStockCount",
  Auth.userAuth,
  async (req, res) => {
    try {
      const result = await Inventory.aggregate([
        // 1️⃣ Only rows that are in stock
        {
          $match: {
            CLOSINGQTY: { $gt: 0 },
          },
        },

        // 2️⃣ Group by product NAME (ignore company)
        {
          $group: {
            _id: "$NAME",
          },
        },

        // 3️⃣ Count unique product names
        {
          $count: "uniqueInStockProducts",
        },
      ]);

      return res.json({
        ok: true,
        count: result[0]?.uniqueInStockProducts || 0,
      });
    } catch (error) {
      console.error("Unique in-stock count error:", error);
      return res.status(500).json({
        ok: false,
        error: error.message,
      });
    }
  }
);


module.exports = router;
