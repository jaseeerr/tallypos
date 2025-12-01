const mongoose = require("mongoose");

const AddressSchema = new mongoose.Schema({
  line: { type: String, required: true }
});

const CustomerSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true }, // needed for multi-company

    // CUSTOMER INFO
    partyCode: { type: String, required: true },  // Example: C1001
    partyName: { type: String, required: true },  // Example: ABC Customer
    partyVatNo: { type: String, default: "" },

    address: [AddressSchema], // multi-line address

    contactPerson: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },

    ledgerName: { type: String, default: "" }, // exact tally ledger name
    ledgerGroup: { type: String, default: "" }, // eg: Sundry Debtors

    // SYNC INFO
    lastSyncedAt: { type: Date }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Customer", CustomerSchema);
