const mongoose = require('mongoose')
const schema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'userDetails',
        required: true,
        unique: true
    },
    balance: {
        type: Number,
        default: 0,
        required: true
    },
    transactions: [
        {
            date: {
                type: Date,
                default: Date.now
            },
            amount: {
                type: Number,
                required: true
            },
            type: {
                type: String,
                enum: ['credit', 'debit'],
                required: true
            },
            description: {
                type: String,
                required: true
            }
        }
    ]
});


const walletModel = new mongoose.model("wallet", schema)

module.exports = walletModel