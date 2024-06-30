
const User = require('../../model/userModel');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const express = require('express');
const router = express.Router();
const flash = require('express-flash');
const otpModel = require('../../model/otpModel');
const productModel = require('../../model/productModel');
const Address = require('../../model/addressModel');
const Wallet = require('../../model/walletModel');
const Category = require('../../model/categoryModel');
// const { sendOTP } = require('../controller/userController/otpController');
const isAuthenticated = require('../../../middelware/userAuth'); // Import the isAuthenticated function

const shortid = require('shortid');
const Coupon = require('../../model/couponModel');
const Wishlist = require('../../model/wishlistModel'); 





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
// Update profile handler
// Profile update function
const UpdateProfile = async (req, res) => {
    const { userId, username, email, phone } = req.body;

    try {
        // Find the user by ID and update the profile details
        const user = await User.findByIdAndUpdate(userId, {
            username,
            email,
            phone
        }, { new: true, runValidators: true });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        return res.json({
            success: true,
            message: 'Profile updated successfully',
            user
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                errors: [{ msg: 'Email already exists' }]
            });
        }
        return res.status(500).json({
            success: false,
            message: 'An error occurred while updating the profile',
            error: error.message
        });
    }
};

const addAddress = async (req, res) => {
    try {
        // Extract the address details from the request body
        const { addressLine1, street, city, state, ZIP, country } = req.body;
        const userId = req.userDetails._id;
        console.log("reg body is........"+userId);
  

        // Update all existing addresses of the user to inactive (secondary)
        await Address.updateMany({ userId }, { active: false });

        // Create a new address document with active status
        const newAddress = new Address({
            addressLine1,
            street,
            city,
            state,
            ZIP,
            country,
            userId,
            active: true  // Set the new address as primary
        });
        
        // Save the new address to the database
        const savedAddress = await newAddress.save();

        // Send a success response
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

const getAddressById=async (req, res) => {
    try {
        const address = await Address.findById(req.params.id);
        if (!address) {
            return res.status(404).json({ error: 'Address not found' });
        }
        res.status(200).json({ address });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

const updateAddress =async (req, res) => {
        const { addressLine1, street, city, state, ZIP, country } = req.body;
        try {
            const address = await Address.findByIdAndUpdate(
                req.params.id,
                { addressLine1, street, city, state, ZIP, country },
                { new: true, runValidators: true }
            );
    
            if (!address) {
                return res.status(404).json({ error: 'Address not found' });
            }
    
            res.status(200).json({ message: 'Address updated successfully', address });
        } catch (error) {
            res.status(500).json({ error: 'Server error' });
        }
    };
    
const wishlist = async (req, res) => {
        try {
          const userId = req.session.userId;
          console.log("wishlist le userid:", userId);
      
          if (!userId) {
            return res.redirect("/login");
          }
      
          const user = await User.findById(userId);
          if (!user) {
            return res.redirect("/login");
          }
      
          const categories = await Category.find();
          let userWishlist = await Wishlist.findOne({ userId }).populate(
            "items.productId"
          );
          console.log("wishlist le userid:", userWishlist);
      
          if (!userWishlist) {
            userWishlist = new Wishlist({ userId, items: [] });
            await userWishlist.save();
          }
      
          // Ensure that the items are populated
          const products = await Promise.all(
            userWishlist.items.map(async (item) => {
              return await productModel.findById(item.productId);
            })
          );
          console.log("products:", products);
      
          res.render("user/wishlist", {
            user,
            userId,
            isAuthenticated: req.isAuthenticated,
            categories,
            wishlist: userWishlist,
            products,
          });
        } catch (error) {
          console.error("Error fetching user wishlist:", error);
          res.status(500).send("Internal Server Error.");
        }
      };
    

 const addToWishlist = async (req, res) => {
        const productId = req.params.userId; // Assuming productId is part of the route params
      
        const userId = req.session.userId; // Assuming user ID is stored in session
        console.log("Reach add to wishlist:", productId, userId);
        try {
          // Check if the product already exists in the wishlist
          const existingWishlist = await Wishlist.findOne({ userId });
          if (
            existingWishlist &&
            existingWishlist.items.some(
              (item) => item.productId.toString() === productId
            )
          ) {
            return res
              .status(400)
              .json({ success: false, message: "Product already in wishlist." });
          }
      
          // Add the product to the wishlist
          if (!existingWishlist) {
            // If no wishlist exists for the user, create a new one
            await Wishlist.create({ userId, items: [{ productId }] });
          } else {
            // If wishlist already exists, update it with the new product
            existingWishlist.items.push({ productId });
            await existingWishlist.save();
          }
      
          res.json({ success: true, message: "Product added to wishlist." });
        } catch (error) {
          console.error("Error adding product to wishlist:", error);
          res.status(500).json({ success: false, message: "Internal Server Error" });
        }
      };
    

const wishlistDelete = async (req, res) => {
        try {
            const userId = req.params.userId;
            const itemId = req.params.itemId;
    
            // Find the wishlist by user ID
            const wishlist = await Wishlist.findOne({ userId: userId });
    
            if (!wishlist) {
                return res.status(404).json({ success: false, message: 'Wishlist not found for the user' });
            }
    
            // Remove the item from the wishlist
            wishlist.items = wishlist.items.filter(item => item.productId.toString() !== itemId);
            await wishlist.save();
    
            res.status(200).json({ success: true, message: 'Item successfully deleted from wishlist' });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Failed to delete item from wishlist', error: err });
        }
    };

      
    
    
    

    

const profile = async (req, res) => {
    try {
        // Assuming you have a UserModel for managing user data
        const userId = req.session.userId; // Assuming you have authenticated users
        const user = await User.findById(userId);
        const categories = await Category.find();
        const address = await Address.find({ userId: userId });
      

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







const address = async (req, res) => {
    try {
        // Assuming you have a UserModel for managing user data
        const userId = req.session.userId; // Assuming you have authenticated users
        const user = await User.findById(userId);
        const categories = await Category.find();
        // Fetch addresses only linked to the authenticated user
        const addresses = await Address.find({ userId: userId });

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
const getAddress = async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const addresses = await Address.find({ userId: userId });
        if (!addresses) {
            return res.status(404).json({ error: 'Addresses not found' });
        }

        res.json(addresses);
    } catch (error) {
        console.error('Error fetching addresses:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = getAddress;


const wallet = async (req, res) => {
    try {
        const userId = req.session.userId;
        const user = await User.findById(userId).populate('wallet.history'); // Populate the wallet history
        const categories = await Category.find();
        const address = await Address.find();

        if (!user) {
            return res.redirect('/login');
        }

        // Fetch the wallet for the user
        const wallet = await Wallet.findOne({ userId: userId });

        // If no wallet found, create a new one
        if (!wallet) {
            wallet = new Wallet({ userId: userId });
            await wallet.save();
        }

        res.render('user/Wallet', { 
            user, 
            wallet,  // Pass the wallet data to the template
            isAuthenticated: req.isAuthenticated, 
            categories, 
            address 
        });
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

        // if (!user) {
        //     // If user not found, handle it appropriately (e.g., redirect to login page)
        //     return res.redirect('/login');
        // }

        // Render the edit-profile template with the user's data and isAuthenticated variable
        res.render('user/Reset-password', );
    } catch (error) {
        console.error('Error fetching user profile:', error);
        // Handle errors (e.g., render an error page)
        res.status(500).send('Internal Server Error');
    }
};

module.exports = getAddress;


module.exports = {
    resetpassword,
    wallet,
    address,
    coupons,
    profile,
    addAddress,
    getAddressById,
    UpdateProfile,
    EditProfile,
    deleteAddress,
    setPrimaryAddress,
    updateAddress,
    wishlist,
    addToWishlist,
    wishlistDelete,
    getAddress
}