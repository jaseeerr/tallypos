const mongoose = require("mongoose");

const inventoryImageLogSchema = new mongoose.Schema(
  {
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      required: true,
      index: true,
    },

    action: {
      type: String,
      enum: ["add", "delete", "edit"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["success", "error"],
      default: "success",
      index: true,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    filenames: {
      type: [String],
      default: [],
    },

    imageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    updatedFields: {
      type: [String],
      default: [],
    },
    updates: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    beforeValues: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    afterValues: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    imagesBefore: {
      type: Number,
      default: null,
    },

    imagesAfter: {
      type: Number,
      default: null,
    },

    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.model(
  "InventoryImageLog",
  inventoryImageLogSchema
);
