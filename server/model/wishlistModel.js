// models/wishlist.js
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'userDetails',
        required: true,
    },
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'productDetails',
            required: true,
        },

    }]
});

const Wishlist = mongoose.model("wishlist", schema);

module.exports = Wishlist;
