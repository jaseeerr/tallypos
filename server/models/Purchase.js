const mongoose = require("mongoose");

const purchaseItemSchema = new mongoose.Schema({
  itemName: String,
  itemCode: String,
  quantity: Number,
  unit: String,
  rate: Number,
  amount: Number,
  discount: Number,
  vatPercent: Number,
  vatAmount: Number,
  netAmount: Number,
  godown: String,
});

const purchaseSchema = new mongoose.Schema(
  {
    voucherType: { type: String, default: "Purchase" },
    voucherNumber: { type: String, required: true },
    date: { type: Date, required: true },
    reference: { type: String },
    partyLedgerName: { type: String, required: true },
    narration: { type: String },
    purchaseLedger: { type: String },
    costCenter: { type: String },
    items: [purchaseItemSchema],
    totalBeforeVAT: { type: Number, default: 0 },
    totalVAT: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    createdBy: { type: String },
    updatedBy: { type: String },
    syncStatus: {
      type: String,
      enum: ["pending", "synced"],
      default: "pending",
    },
    tallyGUID: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Purchase", purchaseSchema);
