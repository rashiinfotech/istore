
const User = require('../../model/userModel');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const express = require('express');
const router = express.Router();
const flash = require('express-flash');
const otpModel = require('../../model/otpModel');
const productModel = require('../../model/productModel');
const Address = require('../../model/addressModel');

const Category = require('../../model/categoryModel');
// const { sendOTP } = require('../controller/userController/otpController');
const isAuthenticated = require('../../../middelware/userAuth'); // Import the isAuthenticated function
const Order = require('../../model/orderModel');
const shortid = require('shortid');
const Coupon = require('../../model/couponModel');





const EditProfile= async (req, res) => {
    try {
        // Assuming you have a UserModel for managing user data
        const userId = req.session.userId; // Assuming you have authenticated users
        const user = await User.findById(userId);
        const categories = await Category.find();
        const address = await Address.find();

        if (!user) {
            // If user not found, handle it appropriately (e.g., redirect to login page)
            return res.redirect('/login');
        }

        // Render the edit-profile template with the user's data and isAuthenticated variable
        res.render('user/Edit-profile', { user, isAuthenticated: req.isAuthenticated,categories,address  });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        // Handle errors (e.g., render an error page)
        res.status(500).send('Internal Server Error');
    }
}; 
const UpdateProfile= (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    // Update user's profile in the database
    // Example:
    const { username, email, phone } = req.body;
    // Update logic here

    res.send('Profile updated successfully');
};


const addAddress = async (req, res) => {
    try {
        // Assuming the address data is sent in the request body
        const { addressLine1, street, city, state, ZIP, country } = req.body;
        const userId = req.userDetails._id;

        // Find all addresses of the user and update their active status to false
        await Address.updateMany({ userId }, { active: false });

        // Create a new address document
        const newAddress = new Address({
            addressLine1,
            street,
            city,
            state,
            ZIP,
            country,
            userId // Assuming you have a user object attached to the request
        });
        
        // Save the new address to the database
        const savedAddress = await newAddress.save();

        // Redirect the user to the address page or send a response
        res.status(201).json({ message: "Address added successfully", address: savedAddress });
    } catch (error) {
        console.error('Error adding address:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};




const deleteAddress = async (req, res) => {
    try {
        const addressId = req.params.addressId;
        const userId = req.userDetails._id;

        // Check if the address belongs to the user
        const address = await Address.findOne({ _id: addressId, userId });
        if (!address) {
            return res.status(404).json({ error: 'Address not found or does not belong to the user' });
        }

        // Delete the address
        await Address.findByIdAndDelete(addressId);

        res.status(200).json({ message: 'Address deleted successfully' });
    } catch (error) {
        console.error('Error deleting address:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const setPrimaryAddress = async (req, res) => {
    try {
        const addressId = req.params.id;
        const userId = req.userDetails._id;
        console.log("Reached set as primary: ", addressId, " for user: ", userId);

        await Address.updateMany({ userId }, { $set: { active: false } });

        const updatedAddress = await Address.findByIdAndUpdate(
            addressId,
            { $set: { active: true } },
            { new: true }
        );

        if (!updatedAddress || updatedAddress.userId.toString() !== userId.toString()) {
            console.error('Address not found or does not belong to the user');
            return res.status(404).json({ error: 'Address not found or does not belong to the user' });
        }

        res.status(200).json({ message: "Address set as primary successfully", address: updatedAddress });
    } catch (error) {
        console.error('Error setting address as primary:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateAddress = async (req, res) => {
    try {
        const addressId = req.params.id;
        const userId = req.userDetails._id;
        const { addressLine1, street, city, state, ZIP, country } = req.body;

        const address = await Address.findOne({ _id: addressId, userId });
        if (!address) {
            return res.status(404).json({ error: 'Address not found or does not belong to the user' });
        }

        address.addressLine1 = addressLine1 || address.addressLine1;
        address.street = street || address.street;
        address.city = city || address.city;
        address.state = state || address.state;
        address.ZIP = ZIP || address.ZIP;
        address.country = country || address.country;

        const updatedAddress = await address.save();

        res.status(200).json({ message: "Address updated successfully", address: updatedAddress });
    } catch (error) {
        console.error('Error updating address:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const wishlist= async (req, res) => {
    const userId = req.params.userId;
    try {
        const wishlist = await Wishlist.findOne({ userId }).populate('items.productId').exec();
        res.render('wishlist', { wishlist });
    } catch (err) {
        res.status(500).send(err);
    }
};





const profile = async (req, res) => {
    try {
        // Assuming you have a UserModel for managing user data
        const userId = req.session.userId; // Assuming you have authenticated users
        const user = await User.findById(userId);
        const categories = await Category.find();
        const address = await Address.find();

        if (!user) {
            // If user not found, handle it appropriately (e.g., redirect to login page)
            return res.redirect('/login');
        }

        // Render the edit-profile template with the user's data and isAuthenticated variable
        res.render('user/profile', { user, isAuthenticated: req.isAuthenticated,categories,address  });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        // Handle errors (e.g., render an error page)
        res.status(500).send('Internal Server Error');
    }
};




const coupons= async (req, res) => {
    try {
        // Assuming you have a UserModel for managing user data
        const userId = req.session.userId; // Assuming you have authenticated users
        const user = await User.findById(userId);
        const categories = await Category.find();
        const address = await Address.find();

        if (!user) {
            // If user not found, handle it appropriately (e.g., redirect to login page)
            return res.redirect('/login');
        }

        // Fetch coupons data from the database
        const coupons = await Coupon.find(); // Assuming Coupon is your Mongoose model for coupons

        // Render the Coupons template with the user's data, isAuthenticated variable, and coupons data
        res.render('user/Coupons', { user, isAuthenticated: req.isAuthenticated, categories, address, coupons });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        // Handle errors (e.g., render an error page)
        res.status(500).send('Internal Server Error');
    }
};




const orders = async (req, res) => {
    try {
        // Validate request body
        if (!req.body.amount || !req.body.payment) {
            throw new Error('Amount and payment are required fields.');
        }

        const userId = req.session.userId;
        const user = await User.findById(userId);
        const categories = await Category.find();
        const address = await Address.find();

        if (!user) {
            return res.redirect('/login');
        }

        const newOrder = new Order({
            userId: userId,
            orderId: shortid.generate(),
            items: req.body.items,
            wallet: req.body.wallet,
            status: 'pending',
            address: req.body.address,
            amount: req.body.amount,
            payment: req.body.payment,
            createdAt: new Date(),
            updated: new Date()
        });

        await newOrder.save();

        res.render('user/My-order', { user, isAuthenticated: req.isAuthenticated, categories, address });
    } catch (error) {
        console.error('Error creating new order:', error);
        res.status(500).send('Internal Server Error');
    }
};


const address= async (req, res) => {
    try {
        // Assuming you have a UserModel for managing user data
        const userId = req.session.userId; // Assuming you have authenticated users
        const user = await User.findById(userId);
        const categories = await Category.find();
        const addresses = await Address.find(); // Rename the variable to "addresses"

        if (!user) {
            // If user not found, handle it appropriately (e.g., redirect to login page)
            return res.redirect('/login');
        }

        // Render the address template with the user's data, categories, and addresses
        res.render('user/Address', { user, isAuthenticated: req.isAuthenticated, categories, addresses });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        // Handle errors (e.g., render an error page)
        res.status(500).send('Internal Server Error');
    }
}; 

const wallet = async (req, res) => {
    try {
        const userId = req.session.userId;
        const user = await User.findById(userId).populate('wallet.history'); // Populate the wallet history
        const categories = await Category.find();
        const address = await Address.find();

        if (!user) {
            return res.redirect('/login');
        }

        res.render('user/Wallet', { user, isAuthenticated: req.isAuthenticated, categories, address });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).send('Internal Server Error');
    }
};


const resetpassword= async (req, res) => {
    try {
        // Assuming you have a UserModel for managing user data
        const userId = req.session.userId; // Assuming you have authenticated users
        const user = await User.findById(userId);
        const categories = await Category.find();
        const address = await Address.find();

        if (!user) {
            // If user not found, handle it appropriately (e.g., redirect to login page)
            return res.redirect('/login');
        }

        // Render the edit-profile template with the user's data and isAuthenticated variable
        res.render('user/Reset-password', { user, isAuthenticated: req.isAuthenticated,categories,address  });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        // Handle errors (e.g., render an error page)
        res.status(500).send('Internal Server Error');
    }
};
const wishlistPost=async (req, res) => {
    const userId = req.params.userId;
    const { productId, size } = req.body;
    
    try {
        let wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) {
            wishlist = new Wishlist({ userId, items: [{ productId, size }] });
        } else {
            wishlist.items.push({ productId, size });
        }
        await wishlist.save();
        res.redirect(`/wishlist/${userId}`);
    } catch (err) {
        res.status(500).send(err);
    }
}
const wishlistDelete=  async (req, res) => {
    const userId = req.params.userId;
    const itemId = req.params.itemId;

    try {
        await Wishlist.updateOne({ userId }, { $pull: { items: { _id: itemId } } });
        res.redirect(`/wishlist/${userId}`);
    } catch (err) {
        res.status(500).send(err);
    }
};



module.exports = {
    resetpassword,
    wallet,
    address,
    orders,
    coupons,
    profile,
    addAddress,
    UpdateProfile,
    EditProfile,
    deleteAddress,
    setPrimaryAddress,
    updateAddress,
    wishlist,
    wishlistPost,
    wishlistDelete
}