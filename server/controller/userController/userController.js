const User = require('../../model/userModel');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const express = require('express');
const router = express.Router();
const flash = require('express-flash');
const otpModel = require('../../model/otpModel');
const productModel = require('../../model/productModel');
const Address= require('../../model/addressModel');
const Category = require('../../model/categoryModel');
// const { sendOTP } = require('../controller/userController/otpController');
const isAuthenticated = require('../../../middelware/userAuth'); // Import the isAuthenticated function
const Order = require('../../model/orderModel');
const shortid = require('shortid');
const Coupon = require('../../model/couponModel');


router.use(flash());

const validateSignup = [
    (req, res, next) => {
        console.log('Executing validation middleware');
        next();
    },
    body('username').notEmpty().withMessage('User name is required'),
    body('email').isEmail().withMessage('Invalid email format'),
    body('phone').isLength({ min: 10, max: 10 }).withMessage('Invalid phone number'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
];
const signupPost = async (req, res) => {
    console.log('Received form data:................', req.body);

    const errors = validationResult(req);

    // Check if OTP is provided
    const { otp } = req.body;
    if (!otp) {
        req.session.errorMessage = "OTP is required.";
        return res.status(400).render("user/signup", {
            title: "Signup Form",
            errorMessage: req.session.errorMessage,
            successMessage: req.session.successMessage || null,
            formData: req.body,
            errors: []
        });
    }

    try {
        // Validate the OTP
        const storedOTP = await otpModel.findOne({ otp });

        if (!storedOTP) {
            req.session.errorMessage = "Invalid OTP";
            return res.status(400).render("user/signup", {
                title: "Signup Form",
                errorMessage: req.session.errorMessage,
                successMessage: req.session.successMessage || null,
                formData: req.body,
                errors: []
            });
        }

        // Check if OTP is expired
        if (new Date() > storedOTP.expiry) {
            req.session.errorMessage = "OTP has expired";
            return res.status(400).render("user/signup", {
                title: "Signup Form",
                errorMessage: req.session.errorMessage,
                successMessage: req.session.successMessage || null,
                formData: req.body,
                errors: []
            });
        }

        // OTP is valid
        console.log('Validation passed. Proceeding with registration...');

        const { username, email, phone, password, confirm_password } = req.body;

        // Check if passwords match
        if (password !== confirm_password) {
            req.session.errorMessage = "Passwords do not match.";
            return res.status(400).render("user/signup", {
                title: "Signup Form",
                successMessage: req.session.successMessage || null,
                errorMessage: "Passwords do not match.",
                formData: req.body,
                errors: []
            });
        }

        // Check if the password is at least 6 characters long
        if (password.length < 6) {
            req.session.errorMessage = "Password must be at least 6 characters long.";
            return res.status(400).render("user/signup", {
                title: "Signup Form",
                successMessage: req.session.successMessage || null,
                errorMessage: "Password must be at least 6 characters long.",
                formData: req.body,
                errors: []
            });
        }

        // Check if the username already exists
        const existingUsername = await User.findOne({ username: username });
        if (existingUsername) {
            req.session.errorMessage = "User with the same username already exists";
            return res.status(400).render("user/signup", {
                title: "Signup Form",
                successMessage: req.session.successMessage || null,
                errorMessage: "User with the same username already exists",
                formData: req.body,
                errors: []
            });
        }

        // Check if the email already exists
        const existingEmail = await User.findOne({ email: email.toLowerCase() });
        if (existingEmail) {
            req.session.errorMessage = "User with the same email already exists";
            return res.status(400).render("user/signup", {
                title: "Signup Form",
                successMessage: req.session.successMessage || null,
                errorMessage: "User with the same email already exists",
                formData: req.body,
                errors: []
            });
        }

        // Check if the phone number already exists
        const existingPhone = await User.findOne({ phone: phone });
        if (existingPhone) {
            req.session.errorMessage = "User with the same phone number already exists";
            return res.status(400).render("user/signup", {
                title: "Signup Form",
                successMessage: req.session.successMessage || null,
                errorMessage: "User with the same phone number already exists",
                formData: req.body,
                errors: []
            });
        }

        // Create a new user
        const newUser = new User({
            username,
            email: email.toLowerCase(),
            phone,
            password: await bcrypt.hash(password, 10),
            isAdmin: false,
            blocked: false,
        });

        await newUser.save();
// Set successMessage in session
        req.session.successMessage = "Successfully registered!";

        // Redirect to success page or any other page
        return res.redirect('/signup');

    } catch (error) {
        console.error("Error in signup route:", error);
        req.session.errorMessage = "Internal Server Error";
        return res.status(500).render("error", {
            title: "Internal Server Error",
            errorMessage: req.session.errorMessage,
            successMessage: req.session.successMessage || null,
            errors: []
        });
    }
};

const signupGet = async (req, res) => {
    // Retrieve successMessage and errorMessage from session and delete them afterwards
    const successMessage = req.session.successMessage;
    const errorMessage = req.session.errorMessage;
    delete req.session.successMessage;
    delete req.session.errorMessage;

    if (req.session.isAuth) {
        // If user is already authenticated, redirect to dashboard
        res.redirect("/dashboard",{ title: "Signup Form", successMessage: successMessage || null, errorMessage: errorMessage || null, errors: [] });
        return;
    }

    // Pass successMessage and errorMessage to the template
    res.render("user/signup", { title: "Signup Form", successMessage: successMessage || null, errorMessage: errorMessage || null, errors: [] });
};



const loginGet = async (req, res) => {
    if (req.session.isAuth) {
        res.redirect("/");
        return;
    }
    req.session.returnTo = req.query.returnTo || '/';
    res.render('user/login'); // Render your login page


};




const loginPost = async (req, res) => {
    try {
        const { email, password } = req.body;
        // Find user by email
        const user = await User.findOne({ email: email });

        if (user && !user.blocked && (await bcrypt.compare(password, user.password))) {
            req.session.userId = user._id;
            req.session.username = user.username;
            req.session.user = user;
            req.session.isAuth = true;
            console.log("success");

            // Send JSON response instead of redirecting
            res.json({ message: 'Login successful', redirectTo: '/' });
        } else {
            // Send JSON response for invalid credentials
            res.status(401).json({ error: 'Invalid Email or Password' });
        }
    } catch (error) {
        console.error('Error during login:', error);
        // Send JSON response for server error
        res.status(500).json({ error: 'An error occurred during login' });
    }
};






// Index route
const index = async (req, res) => {
    try {
        // Find only the active products
        const products = await productModel.find({ status: true }).populate('category', 'name');
        const categories = await Category.find();
        const isAuthenticated = req.isAuthenticated;
        const user = isAuthenticated ? req.userDetails : null;
        const userName =isAuthenticated ? (req.userDetails ? req.userDetails.username : null) : null;

        res.render('user/index', { 
            products, 
            categories, 
            isAuthenticated,
            user,
            userName // Pass user details only if authenticated
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};





const store=async (req, res) => {
    try {
        const page = req.query.page || 1;
        const limit = 10; // Adjust the limit as per your requirement
        const skip = (page - 1) * limit;

        // Find only the active products
        const products = await productModel.find({ status: true })
            .populate('category', 'name')
            .skip(skip)
            .limit(limit);
        const categories = await Category.find();

        res.render('user/store', { 
            products, 
            categories, 
            isAuthenticated: req.isAuthenticated,
            user: req.isAuthenticated ? req.userDetails : null,
            userName: req.isAuthenticated ? req.userDetails.userName : null // Pass user details only if authenticated

         });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};


const logout = (req, res) => {
    // Destroy the admin session
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying user session:', err);
            res.status(500).send('Error destroying session');
        } else {
            console.log("user loged out");
            // Redirect the user to the login page after logout
            res.redirect('/');
        }
    });
};

// const validateSignupPost=async (req, res) => {
//     // Return validation errors if any
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//         return res.status(400).json({ errors: errors.array() });
//     }
  
//     // No errors, return success
//     res.status(200).json({ message: 'Validation passed' });

//   };


//Define the getProduct controller function
const getProduct = async (req, res) => {
  
    try {
        // Retrieve product ID from request parameters
        const productId = req.params.id;
        console.log(req.params.id);
        // Fetch product details from the database based on the product ID
        const product = await productModel.findById(productId).populate('category', 'name');

       const categories = await Category.find();
        // Render the product template with the retrieved product data
        res.render('user/product', { 
            product, 
            categories, 
            isAuthenticated: req.isAuthenticated,
            user: req.isAuthenticated ? req.userDetails : null,
            userName: req.isAuthenticated ? req.userDetails.userName : null // Pass user details only if authenticated

         });
    } catch (error) {
        console.error('Error fetching product:', error);
        // Handle errors (e.g., render an error page)
        res.status(500).send('Internal Server Error');
    }
};






    




module.exports = { 
    validateSignup,
     signupPost, 
     signupGet,
     loginPost,
    loginGet
    ,index,
    logout,
    getProduct,
    store,
   
};