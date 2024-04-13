const express = require('express');
const { adminmgmtGet, adminLogin, adminLoginPost, logoutAdmin, userManagment, addItem, blockUser, addUser, unblockUser,
    postAddUser } = require('../controller/adminController/adminController');
const { catList , addCat, submitCat, blockCat, editCat, deleteCat,unblockCat ,updateCat} = require('../controller/adminController/categoryController');
const { submitItems, getsubmitItems, itemsList, itemEditor, updateProduct, deleteProduct, activateProduct } = require('../../server/controller/adminController/productController');
const adminRouter = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });


// Multer configuration
// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//       cb(null, 'uploads/');
//     },
//     filename: function (req, file, cb) {
//       cb(null, Date.now() + '-' + file.originalname + ".png");
//     }
//   });
  


adminRouter.get('/', adminLogin);   
adminRouter.post('/admin', adminLoginPost);
adminRouter.get('/dashboard', adminmgmtGet); 
adminRouter.get('/adminLogout', logoutAdmin); 
adminRouter.get('/items-list', itemsList);
adminRouter.get('/add-item', addItem);
adminRouter.get('/userManagment', userManagment);
// adminRouter.get('/addUser', addUser);
adminRouter.get('/add-user', addUser);
adminRouter.post('/add-user', postAddUser);
adminRouter.get('/block/:userId', blockUser);
adminRouter.get('/unblock/:userId', unblockUser);

// Category management routes
adminRouter.get('/cat-list', catList);
adminRouter.get('/add-cat', addCat);
adminRouter.post('/submit-category', submitCat);
adminRouter.get('/block-cat/:categoryId', blockCat);
adminRouter.get('/unblock-cat/:categoryId', unblockCat);
adminRouter.get('/edit-cat/:categoryId', editCat);
adminRouter.get('/delete-cat/:categoryId', deleteCat);
adminRouter.post('/update-cat/:categoryId',updateCat)

// Item management routes
adminRouter.post('/submitItems', upload.array('image'), submitItems);
adminRouter.get('/submitItems', getsubmitItems);
adminRouter.get('/item-editor/:productId', itemEditor)
adminRouter.post('/update-product/:productId',upload.array('image'), updateProduct);
adminRouter.get('/unlist-product/:productId', deleteProduct);
adminRouter.get('/list-product/:productId',activateProduct);

module.exports = adminRouter;
