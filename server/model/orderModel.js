const mongoose = require('mongoose');
const shortid = require('shortid');
const Schema = mongoose.Schema;

const orderSchema = new mongoose.Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'userDetails',
        required: true,
    },
    orderId: {
        type: String,
        default: shortid.generate,
        unique: true
    },
    items: [{
        productId: {
            type: Schema.Types.ObjectId,
            ref: 'productDetails',
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
        },
        price: {
            type: Number,
            required: true,
        },
    }],
    wallet: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        default: "pending",
        required: true
    },
    address: {
        type: Array,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    payment: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        required: true
    },
    updated: {
        type: Date,
        default: Date.now,
        required: true
    },
    return: [{
        reason: {
            type: String,
        },
        status: {
            type: String,
            default: 'Pending'
        }
    }]
});

const Order = mongoose.model("orders", orderSchema);

module.exports = Order;
