const express = require('express');
const userRouter = express.Router();
const{ cart}=require('../controller/userController/cartController');
const {
    
    signupPost,
    signupGet,
    loginPost,
    loginGet,
    index,
    logout,
    getProduct,
    profile,
    EditProfile,
    orders,
    address,
    wallet,
    coupons,
    resetpassword,
    UpdateProfile
} = require('../controller/userController/userController');

const {isAuthenticated,validateSignup,validateSignupoDefine} = require('../../middelware/userAuth');



// Import validation middlewares
const { generateOtpPost } = require('../controller/userController/otpController')

// Route definitions
userRouter.post('/signup', validateSignup, signupPost);
// userRouter.post('/validateSignup',validateSignup, validateSignupPost); // Validation post route
userRouter.post('/generateOTP', generateOtpPost);

userRouter.get('/signup', signupGet);
userRouter.get('/login', loginGet);
userRouter.post('/login', loginPost);
userRouter.get('/cart', isAuthenticated, cart);

userRouter.get('/', isAuthenticated, index);
userRouter.get('/logout', logout);


userRouter.get('/product/:id', isAuthenticated, getProduct);

userRouter.get('/profile', isAuthenticated,profile)

userRouter.get('/edit-profile', isAuthenticated,EditProfile)
userRouter.post('/update-profile', validateSignupoDefine,validateSignup,UpdateProfile)

userRouter.get('/orders', isAuthenticated,orders)
userRouter.get('/resetpassword', isAuthenticated,resetpassword)
userRouter.get('/coupons', isAuthenticated,coupons)
userRouter.get('/wallet', isAuthenticated,wallet)
userRouter.get('/address', isAuthenticated,address)





userRouter.get('/store', (req, res) => {
    res.render('user/store');
});

userRouter.get('/x', (req, res) => {
    res.render('user/blank');
});

module.exports = userRouter;
