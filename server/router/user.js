const express = require('express');
const userRouter = express.Router();
const passport = require('passport');
// Import controllers
const { 
    signupPost, signupGet, loginPost, loginGet, index, logout,
     getProduct, store ,filterProduct,fetchProducts,
     googleAuth
} = require('../controller/userController/userController');

const { 
    resetpassword, wallet, address, coupons, profile, addAddress, UpdateProfile, 
    EditProfile, deleteAddress, setPrimaryAddress, getAddressById, updateAddress, 
    wishlist, addToWishlist,wishlistDelete,getAddress,requestresetpassword,resetingpassword
} = require('../controller/userController/profileController');

const { generateOtpPost } = require('../controller/userController/otpController');
const { orders,validateCoupon ,
    razorpayKey,
    // webhookHandler,
    createFailedOrder,
    capturePaymentAfterFailure
} = require('../controller/userController/checkoutController');

const { isAuthenticated, validateSignup, validateProfileUpdate,
    isAuthenticatedGuest
 } = require('../../middelware/userAuth');
const { 
    cart,
    addItemToCart,createOrder,deletItemToCart,
    thankYou,
    viewOrder,
    cancelOrders,
    checkout,
    updateCartQuantity,
    onlinePayment,
    capturePaymentAndCreateOrder,
    searchProducts
}= require('../controller/userController/cartController')
const {generateBill}=require('../controller/userController/billController')
// Auth routes
userRouter.post('/signup', validateSignup, signupPost);
userRouter.get('/signup', signupGet);
userRouter.get('/login', loginGet);
userRouter.post('/login', loginPost);
userRouter.get('/logout', logout);
userRouter.post('/generateOTP', generateOtpPost);
userRouter.get('/resetpassword',  resetpassword);
// userRouter.post('/request-password-reset', requestresetpassword);
userRouter.post('/resetingpassword',  resetingpassword)

userRouter.post('/request-password-reset', async (req, res) => {
    console.log("POST request received at /request-password-reset");
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }
    // Further processing, e.g., generate and send OTP
    res.status(200).json({ message: 'OTP sent to your email.' });
});
// Main routes
userRouter.get('/', isAuthenticatedGuest, index); 
userRouter.get('/store',isAuthenticatedGuest, store);
userRouter.get('/products', isAuthenticatedGuest, filterProduct);
userRouter.get('/api/products',isAuthenticatedGuest, fetchProducts);

userRouter.get('/search', isAuthenticatedGuest,searchProducts)


userRouter.get('/product/:id', isAuthenticatedGuest, getProduct);


userRouter.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
userRouter.get('/auth/google/callback' , passport.authenticate('google', { failureRedirect: '/login' }),isAuthenticatedGuest, googleAuth);
userRouter.get('/cart', isAuthenticated, cart);
userRouter.post('/cart/add/:productId', addItemToCart);
userRouter.post('/removeFromCart/:userId/delete/:productId', isAuthenticated, deletItemToCart);
userRouter.post('/updateCartQuantity/',isAuthenticated, updateCartQuantity);

userRouter.post('/createOrder/:userId', isAuthenticated, createOrder);
userRouter.post('/createFailedOrder/:userId', isAuthenticated, createFailedOrder);
userRouter.post('/onlinepayment/:userId', isAuthenticated, onlinePayment);
userRouter.post('/capturePaymentAndCreateOrder', isAuthenticated, capturePaymentAndCreateOrder);
userRouter.post('/capturePaymentAfterFailure', isAuthenticated, capturePaymentAfterFailure)

userRouter.post('/razorpay-key', isAuthenticated, razorpayKey);
// userRouter.post('/webhook/razorpay', webhookHandler);


userRouter.get('/orders/', isAuthenticated, orders);
userRouter.get('/order-details/:orderId', isAuthenticated,viewOrder);
//userRouter.get('/order-details', isAuthenticated, viewOrder);
userRouter.get('/thank-you/:orderId', isAuthenticated, thankYou);
userRouter.get('/cancel-orders/:orderId', isAuthenticated,cancelOrders);


userRouter.post('/checkout/', isAuthenticated, checkout);
userRouter.post('/validate-coupon', isAuthenticated, validateCoupon);

// Profile routes
userRouter.get('/profile', isAuthenticatedGuest, profile);
userRouter.get('/edit-profile', isAuthenticated, EditProfile);
userRouter.post('/update-profile', validateProfileUpdate, UpdateProfile);

userRouter.get('/wallet', isAuthenticated, wallet);
userRouter.get('/coupons', isAuthenticated, coupons);

// Address routes
userRouter.post('/add-address', isAuthenticated, addAddress);
userRouter.delete('/addresses/:addressId', isAuthenticated, deleteAddress);
userRouter.put('/addresses/:id/make-primary', isAuthenticated, setPrimaryAddress);
userRouter.get('/addresses/:id', isAuthenticated, getAddressById);
userRouter.put('/addresses/:id/edit', isAuthenticated, updateAddress);
userRouter.get('/address', isAuthenticated, address);
userRouter.post('/get-address', getAddress);



// Wishlist routes
userRouter.get('/wishlist', isAuthenticated, wishlist);
userRouter.post('/wishlist/add/:userId',  addToWishlist);
userRouter.post('/wishlist/:userId/delete/:itemId', isAuthenticated, wishlistDelete);

userRouter.get('/generate-bill/:orderId',isAuthenticated,generateBill)


// Temporary/Other routes
userRouter.get('/x', (req, res) => {
    res.render('user/blank');
});

module.exports = userRouter;
