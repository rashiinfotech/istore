const userModel = require('../../model/userModel');
const { body, validationResult } = require('express-validator');
const { MongoClient } = require("mongodb");
const User = require('../../model/userModel');
const CartItem= require('../../model/cartModel'); 
const Address= require('../../model/addressModel');
const Category = require('../../model/categoryModel');

const cart = async (req, res) => {
    try {
        // Fetch necessary data from the database or other sources
        const userId = req.session.userId; // Assuming you have authenticated users
        const user = await User.findById(userId); // Fetch user details
        const cartItems = await CartItem.find({ user: userId }).populate('product'); // Fetch cart items for the user
        const categories = await Category.find(); // Fetch categories for navigation
        const address = await Address.find(); // Fetch user addresses
        
        // If user not found, handle it appropriately (e.g., redirect to login page)
        if (!user) {
            return res.redirect('/login');
        }

        // Render the cart template with the fetched data
        res.render('user/Cart', { user, cartItems, categories, address, isAuthenticated: req.isAuthenticated });
    } catch (error) {
        console.error('Error fetching cart data:', error);
        // Handle errors (e.g., render an error page)
        res.status(500).send('Internal Server Error');
    }
};

module.exports = cart;




module.exports= {cart};