// userModel.js

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: Number,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    isAdmin: {
        type: Boolean,
        required: true,
        default: false
    },
    blocked: {
        type: Boolean,
        required: true,
        default: false
    },
      // Define the wallet field
      wallet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Wallet' // Assuming 'Wallet' is the name of your wallet model
    }
});

const userModel = mongoose.model('User', userSchema);

module.exports = userModel;
