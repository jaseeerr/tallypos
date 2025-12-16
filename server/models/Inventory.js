const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
  NAME: {
    type: String,
    required: true,
    index: true,


  },
 
  GROUP: {
    type: String,
        default: ""

  },
  UNITS: {
    type: String,
        default: ""

  },
  SALESPRICE: {
    type: String,
    default: ""
  },
  STDCOST: {
    type: String,
    default: ""
  },
  CLOSINGQTY: {
    type: String,
    default: ""
  },
  companyName: {
    type: String,
    required: true
  },
  imageUrl: {
    type: [String],
      default: []

  }
}, { timestamps: true });

module.exports = mongoose.model('Inventory', InventorySchema);
