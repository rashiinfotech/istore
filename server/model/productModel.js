const mongoose = require('mongoose');


const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'categories',
        required: true,
    },
    price: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    stock: {
        type: Number,
        required: true,
    },
    image: {
        type: Array,
        required: true,
    },
    status: {
        type: Boolean,
        default: true,
    }
});

const productModel = mongoose.model('productDetails', productSchema);

module.exports = productModel;


// const Product = mongoose.model('Product', productSchema); // Change the model name to 'Product'

// module.exports = Product;