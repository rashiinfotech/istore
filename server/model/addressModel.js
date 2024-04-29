const mongoose = require('mongoose');

// Define the address schema
const addressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  address: {
    type: String,
    required: true
  },
  addressLine2: {
    type: String,
    default: ''
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  pincode: {
    type: String,
    required: true
  },
  active: {
    type: Boolean,
    default: true
  }
});

// Create the Address model
const Address = mongoose.model('Address', addressSchema);

module.exports = Address;
