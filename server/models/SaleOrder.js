const mongoose = require("mongoose");

const AddressSchema = new mongoose.Schema({
  address: { type: String, required: true }
});

const ItemSchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  itemCode: { type: String, required: true },
  itemGroup: { type: String },
  description: { type: String },
  qty: { type: Number, required: true },
  unit: { type: String, required: true },
  rate: { type: Number, required: true },
  amount: { type: Number, required: true },
  rateOfTax: { type: Number }
});

const LedgerSchema = new mongoose.Schema({
  ledgerName: { type: String, required: true },
  percentage: { type: Number, default: 0 },
  amount: { type: Number, required: true }
});

const TallyResponseSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  data: { type: Object } // Any raw Tally response (success or error)
});

const SaleOrderSchema = new mongoose.Schema(
  {
    // BASIC SALE INFO
    billNo: { type: String, required: true, unique: true },
    date: { type: Date, required: true },
    reference: { type: String, default: "" },
    remarks: { type: String, default: "" },
    totalAmount: { type: Number, required: true },

    companyName: { type: String, required: true },

    // SALE TYPE
    isCashSale: { type: Boolean, default: false },
    cashLedgerName: { type: String },

    // PARTY DETAILS (ignored for cash sale)
    partyCode: { type: String },
    partyName: { type: String },
    partyVatNo: { type: String, default: "" },
    partyAddress: [AddressSchema],

    // ITEMS
    items: [ItemSchema],

    // LEDGERS
    ledgers: [LedgerSchema],

    // SYNC WORKFLOW
    status: {
      type: String,
      enum: ["pending", "processing", "synced", "error"],
      default: "pending"
    },
    syncAttempts: { type: Number, default: 0 },
    syncError: { type: String, default: "" },

    tallyInvoiceNumber: { type: String, default: "" },

    tallyResponseLogs: [TallyResponseSchema],

    // META
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("SaleOrder", SaleOrderSchema);
