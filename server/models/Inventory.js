const mongoose = require("mongoose");

const GodownStockSchema = new mongoose.Schema({
  godownName: { type: String, required: true },
  quantity: { type: Number, default: 0 }
});

const InventorySchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true }, // needed for multi-company

    // ITEM BASIC DETAILS
    itemName: { type: String, required: true },
    itemCode: { type: String, required: true }, // SKUs like TV1001
    itemGroup: { type: String, default: "" },
    description: { type: String, default: "" },

    unit: { type: String, default: "PCS" },

    // STOCK VALUES
    openingQty: { type: Number, default: 0 },
    availableQty: { type: Number, default: 0 },
    closingQty: { type: Number, default: 0 },

    avgRate: { type: Number, default: 0 },
    closingValue: { type: Number, default: 0 },

    // GODOWN-WISE STOCK
    godowns: [GodownStockSchema],

    // TAX INFO
    vatRate: { type: Number, default: 0 },
    gstRate: { type: Number, default: 0 },

    // SYNC
    lastSyncedAt: { type: Date }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Inventory", InventorySchema);
