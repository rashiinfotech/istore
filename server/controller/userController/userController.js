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
const passport = require('passport');

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
    const errorMessage = req.query.error || null; // Retrieve error message from query parameter
    req.session.returnTo = req.query.returnTo || '/';
    res.render('user/login', { errorMessage }); // Pass the errorMessage to the view
};





const loginPost = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email: email });

        // Check if user exists and credentials are correct
        if (user && !user.blocked && (await bcrypt.compare(password, user.password))) {
            // Set session variables
            req.session.userId = user._id;
            req.session.username = user.username;
            req.session.user = user;
            req.session.isAuth = true;
            console.log("Login success");

            // Send JSON response for successful login
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
}




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

const store = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const perPage = 9;

        // Fetch categories as Mongoose documents
        const categories = await Category.find().lean(); // Fetch categories as plain objects

        // Count products for each category
        const categoryCounts = await Promise.all(categories.map(async category => {
            const count = await productModel.countDocuments({ category: category._id, status: true });
            return { ...category, productCount: count }; // Spread category object and add productCount
        }));

        console.log('Categories with product count:', categoryCounts); // Debugging

        // Fetch products with pagination
        const products = await productModel.find({ status: true })
            .populate('category', 'name')
            .skip((perPage * page) - perPage)
            .limit(perPage);

        const totalResults = await productModel.countDocuments({ status: true });
        const totalPages = Math.ceil(totalResults / perPage);
        const showingFrom = (page - 1) * perPage + 1;
        const showingTo = Math.min(page * perPage, totalResults);

        const maxPrice = await productModel.find({ status: true }).sort({ price: -1 }).limit(1).then(products => products[0]?.price || 0);

        res.render('user/store', {
            categories: categoryCounts,
            products,
            totalResults,
            totalPages,
            currentPage: page,
            showingFrom,
            showingTo,
            maxPrice,
            isAuthenticated: req.isAuthenticated,
            user: req.isAuthenticated ? req.userDetails : null,
            userName: req.isAuthenticated ? (req.userDetails ? req.userDetails.username : null) : null
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};




const fetchProducts = async (req, res) => {
    try {
        console.log("Fetching products based on filters...");
        const { categories, minPrice, maxPrice } = req.query;
        const categoryFilter = categories ? { category: { $in: categories.split(',') } } : {};
        const priceFilter = {
            price: {
                $gte: parseFloat(minPrice) || 0,
                $lte: parseFloat(maxPrice) || Number.MAX_SAFE_INTEGER
            }
        };

        const filters = { ...categoryFilter, ...priceFilter };
        console.log('Applied Filters:', filters);

        const products = await productModel.find(filters).populate('category', 'name');
        res.json({ products });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


// Function to fetch products based on filters
// const fetchFilteredProducts = async () => {
//     const selectedCategories = Array.from(document.querySelectorAll('.category-checkbox:checked')).map(cb => cb.getAttribute('data-category-id'));
//     const minPrice = document.getElementById('price-min').value;
//     const maxPrice = document.getElementById('price-max').value;
//     const queryString = `?categories=${selectedCategories.join(',')}&minPrice=${minPrice}&maxPrice=${maxPrice}`;

//     try {
//         const response = await fetch(`/api/products${queryString}`);
//         const data = await response.json();
//         const productContainer = document.getElementById('product-container');
        
//         // Clear the current products
//         productContainer.innerHTML = '';

//         // Render the fetched products
//         data.products.forEach((product, index) => {
//             const productHtml = `
//                 <div class="col-md-4 col-xs-6 product-item">
//                     <div class="product">
//                         <a href="/product/${product._id}">
//                             <div class="product-img">
//                                 <img src="${product.image[0]}" alt="" class="img-responsive">
//                                 <div class="product-label">
//                                     ${product.sale ? `<span class="sale">-${product.sale}%</span>` : ''}
//                                     <span class="new">NEW</span>
//                                 </div>
//                             </div>
//                         </a>
//                         <div class="product-body">
//                             <p class="product-category">${product.category.name}</p>
//                             <h3 class="product-name"><a href="/product/${product._id}">${product.name}</a></h3>
//                             <h4 class="product-price">
//                                 ₹${product.sale ? (product.price * (1 - product.sale / 100)).toFixed(2) : product.price.toFixed(2)}
//                                 ${product.sale ? `<br><span class="product-old-price">₹${product.price.toFixed(2)}</span>` : ''}
//                             </h4>
//                             <div class="product-btns">
//                                 <button class="add-to-wishlist" data-product-id="${product._id}">
//                                     <i class="fa fa-heart-o wishlist-icon"></i>
//                                     <span class="tooltipp">add to wishlist</span>
//                                 </button>
//                                 <button class="add-to-compare"><i class="fa fa-exchange"></i>
//                                     <span class="tooltipp">add to compare</span>
//                                 </button>
//                                 <button class="quick-view"><i class="fa fa-eye"></i>
//                                     <span class="tooltipp">quick view</span>
//                                 </button>
//                             </div>
//                         </div>
//                         <div class="add-to-cart">
//                             <button class="add-to-cart-btn" data-product-id="${product._id}">
//                                 <i class="fa fa-shopping-cart"></i> add to cart
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             `;
//             productContainer.innerHTML += productHtml;

//             if ((index + 1) % 3 === 0) {
//                 productContainer.innerHTML += '<div class="clearfix visible-md visible-lg"></div>';
//             }
//         });
//     } catch (error) {
//         console.error('Error fetching filtered products:', error);
//     }
// };

// // Event listeners for filter changes
// document.querySelectorAll('.category-checkbox').forEach(checkbox => {
//     checkbox.addEventListener('change', fetchFilteredProducts);
// });

// const priceInputs = document.querySelectorAll('#price-min, #price-max');
// priceInputs.forEach(input => {
//     input.addEventListener('change', fetchFilteredProducts);
// });


const filterProduct = async (req, res) => {
    try {
        const perPage = 10; // Number of products per page
        const page = req.query.page || 1; // Current page number

        let query = { status: true }; // Your base query object
        const { categories, minPrice, maxPrice } = req.query;

        // Handle categories filter if categories are provided in query params
        if (categories && Array.isArray(categories)) {
            query.category = { $in: categories }; // Assuming category field in your product schema
        }

        // Handle price filter if minPrice and maxPrice are provided
        if (minPrice && maxPrice) {
            query.price = { $gte: minPrice, $lte: maxPrice };
        }

        // Find products matching the query with pagination
        const products = await productModel.find(query)
            .populate('category', 'name')
            .skip((perPage * page) - perPage)
            .limit(perPage);
           
            console.log(maxPrice);
        const count = await productModel.countDocuments(query);

        // Fetch categories
        const allCategories = await Category.find();

        const totalResults = count; // Total number of products
        const totalPages = Math.ceil(totalResults / perPage); // Total number of pages
        const showingFrom = (page - 1) * perPage + 1; // Starting product number on the current page
        const showingTo = Math.min(page * perPage, totalResults); // Ending product number on the current page

        const isAuthenticated = req.isAuthenticated;
        const user = isAuthenticated ? req.userDetails : null;
        const userName = isAuthenticated ? (req.userDetails ? req.userDetails.username : null) : null;

        res.render('user/store', {
            products,
            categories: allCategories, // Ensure categories is passed as an array
            totalResults,
            totalPages,
            currentPage: page,
            showingFrom,
            showingTo,
            isAuthenticated,
            user,
            userName // Pass user details only if authenticated
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        // Handle errors appropriately, e.g., send error response
        res.status(500).send('Error fetching products');
    }
};

const googleAuth=(req, res) => {
    // Successful authentication, redirect home.
      // Successful authentication, redirect home.
      req.session.userId = req.user._id;
      req.session.username = req.user.username;
      req.session.user = req.user;
      req.session.isAuth = true;
      res.redirect('/');
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
    filterProduct,
    fetchProducts,
    googleAuth
};