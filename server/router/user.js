const express = require('express');
const userRouter = express.Router();
const { validateSignup,  signupPost, signupGet, loginPost, loginGet, index, cartGet,
    logout ,getProduct,authenticateUser} = require('../controller/userController/userController');


// Import validation middlewares
const {generateOtpPost }= require('../controller/userController/otpController')

// Route definitions
userRouter.post('/signup',  validateSignup,signupPost);
// userRouter.post('/validateSignup',validateSignup, validateSignupPost); // Validation post route
userRouter.post('/generateOTP',generateOtpPost);

userRouter.get('/signup', signupGet);
userRouter.get('/login',loginGet);
userRouter.post('/login', loginPost);
userRouter.get('/cart',authenticateUser,cartGet);

userRouter.get('/',authenticateUser, index);
userRouter.get('/logout', logout);

 
userRouter.get('/product/:id',authenticateUser, getProduct);

userRouter.get('/store', (req, res) => {
    res.render('user/store');
});

userRouter.get('/x', (req, res) => {
    res.render('user/blank');
});



//otp

// userRouter.get('/generate-otp',generateOtp)


module.exports = userRouter;
