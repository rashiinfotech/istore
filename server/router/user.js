const express = require('express');
const userRouter = express.Router();

// Import controllers
const { 
    signupPost, signupGet, loginPost, loginGet, index, logout, getProduct, store 
} = require('../controller/userController/userController');

const { 
    resetpassword, wallet, address, coupons, profile, addAddress, UpdateProfile, 
    EditProfile, deleteAddress, setPrimaryAddress, getAddressById, updateAddress, 
    wishlist, addToWishlist,
} = require('../controller/userController/profileController');

const { generateOtpPost } = require('../controller/userController/otpController');
const { orders } = require('../controller/userController/checkoutController');

const { isAuthenticated, validateSignup, validateProfileUpdate,
    isAuthenticatedGuest
 } = require('../../middelware/userAuth');
const { 
    cart,
    addItemToCart,createOrder,
    wishlistDelete,
    thankYou,
    viewOrder,
    cancelOrders
}= require('../controller/userController/cartController')
// Auth routes
userRouter.post('/signup', validateSignup, signupPost);
userRouter.get('/signup', signupGet);
userRouter.get('/login', loginGet);
userRouter.post('/login', loginPost);
userRouter.get('/logout', logout);
userRouter.post('/generateOTP', generateOtpPost);

// Main routes
userRouter.get('/', isAuthenticatedGuest, index);
userRouter.get('/store', store);



userRouter.get('/product/:id', isAuthenticated, getProduct);


userRouter.get('/cart', isAuthenticated, cart);
userRouter.post('/cart/add/:productId', isAuthenticated, addItemToCart);
userRouter.post('/createOrder/:userId', isAuthenticated, createOrder);

userRouter.get('/orders/', isAuthenticated, orders);
userRouter.get('/order-details/:orderId', isAuthenticated,viewOrder);
//userRouter.get('/order-details', isAuthenticated, viewOrder);
userRouter.get('/thank-you/:orderId', isAuthenticated, thankYou);
userRouter.get('/cancel-orders/:orderId', isAuthenticated,cancelOrders);

// Profile routes
userRouter.get('/profile', isAuthenticated, profile);
userRouter.get('/edit-profile', isAuthenticated, EditProfile);
userRouter.post('/update-profile', validateProfileUpdate, UpdateProfile);
userRouter.get('/resetpassword', isAuthenticated, resetpassword);
userRouter.get('/wallet', isAuthenticated, wallet);
userRouter.get('/coupons', isAuthenticated, coupons);

// Address routes
userRouter.post('/add-address', isAuthenticated, addAddress);
userRouter.delete('/addresses/:addressId', isAuthenticated, deleteAddress);
userRouter.put('/addresses/:id/make-primary', isAuthenticated, setPrimaryAddress);
userRouter.get('/addresses/:id', isAuthenticated, getAddressById);
userRouter.put('/addresses/:id/edit', isAuthenticated, updateAddress);
userRouter.get('/address', isAuthenticated, address);

// Wishlist routes
userRouter.get('/wishlist', isAuthenticated, wishlist);
userRouter.post('/wishlist/add/:userId', isAuthenticated, addToWishlist);
userRouter.post('/wishlist/:userId/delete/:itemId', isAuthenticated, wishlistDelete);

// Temporary/Other routes
userRouter.get('/x', (req, res) => {
    res.render('user/blank');
});

module.exports = userRouter;
