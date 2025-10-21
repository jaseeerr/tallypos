const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String },
    unit: { type: String },
    rate: { type: Number, default: 0 },
    vatPercent: { type: Number, default: 5 },
    openingStock: { type: Number, default: 0 },
    availableStock: { type: Number, default: 0 },
    godown: { type: String },
    lastUpdatedFromTally: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
