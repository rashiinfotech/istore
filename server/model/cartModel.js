const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "productDetails", // Use the correct model name here
        required: true
    },
    quantity: { 
        type: Number,
        default: 1 
    }
});

const CartItem = mongoose.model("CartItem", cartItemSchema);

module.exports = CartItem;
