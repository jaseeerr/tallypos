const mongoose = require("mongoose");

const AddressSchema = new mongoose.Schema({
  address: { type: String, required: false },
});

const ItemSchema = new mongoose.Schema({
  // From Inventory
  itemName: { type: String, required: true },   // Inventory.NAME
  itemGroup: { type: String, default: "" },     // Inventory.GROUP
  unit: { type: String, required: true },       // Inventory.UNITS

  // Optional / future Tally fields
  itemCode: { type: String, default: "" },
  description: { type: String, default: "" },

  // Transaction data
  qty: { type: Number, required: true },
  rate: { type: Number, required: true },
  amount: { type: Number, required: true },
  rateOfTax: { type: Number, default: 0 },
});

const LedgerSchema = new mongoose.Schema({
  ledgerName: { type: String, required: true },
  percentage: { type: Number, default: 0 },
  amount: { type: Number, required: true },
});

const TallyResponseSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  data: { type: Object },
});

const SaleSchema = new mongoose.Schema(
  {
    // =============================
    // BASIC INFO
    // =============================
    companyName: { type: String, required: true },

    billNo: { type: String, required: true },
    date: { type: Date, required: true },
    reference: { type: String, default: "" },
    remarks: { type: String, default: "" },

    // =============================
    // TOTALS (server-calculated)
    // =============================
    subtotal: { type: Number, required: true },
    vatAmount: { type: Number, required: true },
    totalAmount: { type: Number, required: true },

    // =============================
    // SALE TYPE
    // =============================
    isCashSale: { type: Boolean, default: false },
    cashLedgerName: { type: String, default: "" },

    // =============================
    // PARTY DETAILS (credit sale)
    // =============================
    partyName: { type: String, default: "" },    // Customer.name
    partyCode: { type: String, default: "" },    // Optional (not available yet)
    partyVatNo: { type: String, default: "" },   // Optional (not available yet)
    partyAddress: [AddressSchema],

    // =============================
    // ITEMS & LEDGERS
    // =============================
    items: { type: [ItemSchema], required: true },
    ledgers: { type: [LedgerSchema], default: [] },

    // =============================
    // SYNC WORKFLOW
    // =============================
    status: {
      type: String,
      enum: ["pending", "processing", "synced", "error"],
      default: "pending",
    },
    syncAttempts: { type: Number, default: 0 },
    syncError: { type: String, default: "" },

    tallyInvoiceNumber: { type: String, default: "" },
    tallyResponseLogs: [TallyResponseSchema],

    // =============================
    // META
    // =============================
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// IMPORTANT: compound uniqueness
SaleSchema.index({ companyName: 1, billNo: 1 }, { unique: true });

module.exports = mongoose.model("Sale", SaleSchema);
