const express = require('express');
const { adminmgmtGet, adminLogin, adminLoginPost, logoutAdmin, userManagment, addItem, blockUser, addUser, unblockUser,
    postAddUser,
    userOrders,coupons,addCoupons,addCouponsPage,deleteCoupon,editCouponpage,
    updateCoupon,
    viewOrder, updateOrderStatus,salesOverview,
stock } = require('../controller/adminController/adminController');
const { catList , addCat, submitCat, blockCat, editCat, deleteCat,unblockCat ,updateCat} = require('../controller/adminController/categoryController');
const { submitItems,
     getsubmitItems, itemsList,updateImage, itemEditor, updateProduct, deleteProduct, activateProduct ,deleteImage ,productImgEditor,
   
 } = require('../../server/controller/adminController/productController');
 const{exportSalesToExcel,exportSalesToPDF}=require('../../server/controller/adminController/reports');
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
  


adminRouter.get('/', adminmgmtGet);   
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
adminRouter.post('/submitItems',  upload.array('image', 5), submitItems);
adminRouter.get('/submitItems', getsubmitItems);
adminRouter.get('/item-editor/:productId', itemEditor)
adminRouter.post('/update-product/:productId',upload.array('image'), updateProduct);
adminRouter.get('/unlist-product/:productId', deleteProduct);
adminRouter.get('/list-product/:productId',activateProduct);



// Server-side route for updating product
adminRouter.put('/admin/update-product/:productId', updateProduct);
// Server-side route for deleting image
adminRouter.delete('/admin/delete-image/:productId/:imageIndex', deleteImage);
adminRouter.get('/product-img-editor',productImgEditor)
adminRouter.get('/userOrders', userOrders);
adminRouter.get('/Stock', stock)
adminRouter.get('/order-details/:orderId',viewOrder);
adminRouter.post('/orders/:orderId/status', updateOrderStatus);

//COUPONS
adminRouter.get('/coupons', coupons)
adminRouter.get('/add-coupon', addCouponsPage)
adminRouter.post('/add-coupons', addCoupons);
adminRouter.post('/delete-coupon/:couponId',deleteCoupon)
adminRouter.get('/edit-coupon/:couponId',editCouponpage)
adminRouter.post('/update-coupon/:couponId',updateCoupon)



adminRouter.get('/sales-overview', salesOverview)
adminRouter.get('/export-sales-pdf', exportSalesToPDF);
adminRouter.get('/export-sales-excel', exportSalesToExcel);

module.exports = adminRouter;
