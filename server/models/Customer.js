const mongoose = require("mongoose");

const CustomerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },   // Customer Name from Tally
    group: { type: String, default: "" },     // Usually "Sundry Debtors"
    balance: { type: String, default: "" },   // Tally provides this as a string
    address: {
      type: [String],                         // Array of address lines
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customer", CustomerSchema);
