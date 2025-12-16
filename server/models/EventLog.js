const mongoose = require("mongoose");

const EventLogSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    timestamp: {
      type: Date,
      required: true,
      index: true
    },

    company: {
      type: String,
      required: true,
      index: true
    },

    source: {
      type: String,
      enum: ["cron"],
      required: true
    },

    module: {
      type: String,
      enum: ["customers", "inventory"],
      required: true,
      index: true
    },

    action: {
      type: String,
enum: ["fetch", "hash", "sync", "no-change"],
      required: true
    },

    status: {
      type: String,
      enum: ["success", "error"],
      required: true,
      index: true
    },

   stage: {
  type: String,
  enum: ["fetch", "hash", "sync"],
  required: true,
  index: true
},


    message: {
      type: String,
      required: true
    },

    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    collection: "event_logs",
    timestamps: true // ✅ THIS was missing
  }
);

// ✅ TTL INDEX (90 days)
EventLogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 90 }
);

module.exports = mongoose.model("EventLog", EventLogSchema);
