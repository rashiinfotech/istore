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
    store,
    
} = require('../controller/userController/userController');
const {resetpassword,wallet,address,orders,coupons,profile,addAddress,UpdateProfile,
    EditProfile,
    deleteAddress,
    setPrimaryAddress,
    updateAddress,
    wishlist,
    wishlistPost,
    wishlistDelete
}=require('../controller/userController/profileController')

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
userRouter.post('/add-address',isAuthenticated,addAddress)
userRouter.delete('/addresses/:addressId',isAuthenticated, deleteAddress)
userRouter.put('/addresses/:id/make-primary',isAuthenticated,setPrimaryAddress)
userRouter.put('/addresses/:id/edit', isAuthenticated, updateAddress);
userRouter.get('/orders', isAuthenticated,orders)
userRouter.get('/resetpassword', isAuthenticated,resetpassword)
userRouter.get('/coupons', isAuthenticated,coupons)
userRouter.get('/wallet', isAuthenticated,wallet)
userRouter.get('/wishlist',isAuthenticated,wishlist)
userRouter.post('/wishlist/:userId',isAuthenticated,wishlistPost)
userRouter.post('/wishlist/:userId/delete/:itemId',isAuthenticated,wishlistDelete)


userRouter.get('/address', isAuthenticated,address)

userRouter.get('/store',store);




// userRouter.get('/store', (req, res) => {
//     res.render('user/store');
// });

userRouter.get('/x', (req, res) => {
    res.render('user/blank');
});

module.exports = userRouter;
