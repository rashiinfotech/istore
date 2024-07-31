const { render } = require("ejs");
const express =require('express')
const userModel= require('../../model/userModel')
const mongoose =require('mongoose')
const bcrypt = require('bcrypt');
const cartController = require('../userController/cartController');
const Category = require('../../model/categoryModel');
const Product = require('../../model/productModel'); 
const Order = require('../../model/orderModel'); // Import the Order model// Import the product model
const User=require('../../model/userModel');
const couponModel =require('../../model/couponModel');




// Admin management route controller function
const adminmgmtGet = async (req, res) => {
  try {
    if (req.session.user && req.session.user.isAdmin) {
      const activeItems = await Product.countDocuments({ status: true });

      const itemsSoldResult = await Order.aggregate([
        { $unwind: '$items' },
        { $group: { _id: null, total: { $sum: '$items.quantity' } } }
      ]);
      const itemsSold = itemsSoldResult[0] ? itemsSoldResult[0].total : 0;

      const totalUsers = await User.countDocuments();
      const cancelledOrders = await Order.countDocuments({ status: 'Cancelled' });

      const totalIncomeResult = await Order.aggregate([
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const totalIncome = totalIncomeResult[0] ? totalIncomeResult[0].total.toFixed(2) : '0.00';

      // Calculate current month's start and end dates
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthEnd = now; // current date, end of the current month

      console.log('currentMonthStart:', currentMonthStart);
      console.log('currentMonthEnd:', currentMonthEnd);

      // Calculate monthly income for the current month
      let monthlyIncome = '0.00'; // Default value

      try {
        const monthlyIncomeResult = await Order.aggregate([
          { $match: { createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        if (monthlyIncomeResult.length > 0) {
          monthlyIncome = monthlyIncomeResult[0].total.toFixed(2);
        } else {
          console.log('No orders found for the current month.');
        }

        console.log('Monthly Income:', monthlyIncome);
      } catch (error) {
        console.error('Error fetching monthly income:', error);
        res.status(500).send('Server Error');
        return; // Ensure to return or handle errors properly
      }

      const stats = {
        activeItems,
        itemsSold,
        monthlyIncome,
        totalUsers,
        cancelledOrders,
        totalIncome
      };

      const bestSellingProducts = await Order.aggregate([
        { $unwind: "$items" },
        { $group: { _id: "$items.productId", totalSold: { $sum: "$items.quantity" } } },
        { $sort: { totalSold: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'productdetails', localField: '_id', foreignField: '_id', as: 'product' } },
        { $unwind: "$product" }
      ]);

      console.log('Best Selling Products:', bestSellingProducts);

      const bestSellingCategories = await Order.aggregate([
        { $unwind: "$items" },
        { $lookup: { from: 'productdetails', localField: 'items.productId', foreignField: '_id', as: 'product' } },
        { $unwind: "$product" },
        { $group: { _id: "$product.category", totalSold: { $sum: "$items.quantity" } } },
        { $sort: { totalSold: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
        { $unwind: "$category" },
        { $project: { _id: "$category.name", totalSold: 1 } }
      ]);

      console.log('Best Selling Categories:', bestSellingCategories);

      console.log('Stats:', stats);
      console.log('Best Selling Products:', bestSellingProducts);
      console.log('Best Selling Categories:', bestSellingCategories);

      res.render('admin/dashboard', { stats, bestSellingProducts, bestSellingCategories, user: req.session.user });
    } else {
      res.render('admin/adminLogin');
    }
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).send('Server Error');
  }
};






  
  const logoutAdmin = (req, res) => {
    // Destroy the admin session
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying admin session:', err);
            res.status(500).send('Error destroying session');
        } else {
            // Redirect the user to the login page after logout
            res.redirect('/admin');
        }
    });
};

const userManagment = async(req, res) => {
  const users = await userModel.find();
  if (req.session.user && req.session.user.isAdmin) {
    res.render('admin/userManagment', { user: req.session.user ,users});
  } else {
    res.render('admin/adminLogin');
  }
}

const blockUser = async (req, res) => {
  if (req.session.user && req.session.user.isAdmin) {
    const userId = req.params.userId;

    try {

      // // Access the database and collection
      const result = await userModel.updateOne(
        { _id: userId },
        { $set: { blocked: true } }
      );
 
      console.log(userId);

      if (result.modifiedCount === 1) {
        console.log(`User with ID ${userId} blocked successfully`);
      } else {
        console.log(`User with ID ${userId} not found`);
      }
    } catch (error) {
      console.error("Error blocking user:", error);
      res.status(500).send("Internal Server Error");
      return;
    } finally {
      // Close the connection
      // await client.close();
    }

    res.redirect("/admin/userManagment");
  } else {
    res.status(403).send("Forbidden");
  }
}



const unblockUser = async (req, res) => {
  if (req.session.user && req.session.user.isAdmin) {
    const userId = req.params.userId;

    try {

      // // Access the database and collection
      const result = await userModel.updateOne(
        { _id: userId },
        { $set: { blocked: false } }
      );
 
      console.log(userId);

      if (result.modifiedCount === 1) {
        console.log(`User with ID ${userId} blocked successfully`);
      } else {
        console.log(`User with ID ${userId} not found`);
      }
    } catch (error) {
      console.error("Error blocking user:", error);
      res.status(500).send("Internal Server Error");
      return;
    } finally {
      // Close the connection
      // await client.close();
    }

    res.redirect("/admin/userManagment");
  } else {
    res.status(403).send("Forbidden");
  }
}

const addUser=(req, res) => {
  // Retrieve success message and clear it from the session
   const success = req.session.successMessage;
   const error= req.session.errorMessage;
  //  const error= null;
  // delete req.session.successMessage;
  if (req.session.user && req.session.user.isAdmin) {


   res.render('admin/add-user',{ user: req.session.user,success,error});
};
}

const addItem = async (req, res) => {
  const success = req.query.success || false;
  const message = req.query.message || '';
  const error = req.query.error || false;
  const photos = [];
  req.session.typedFields = req.session.typedFields || {};
  
  try {
      if (req.session.user && req.session.user.isAdmin) {
          // Fetch categories from the database
          const categories = await Category.find(); // Modify this according to your model and database library

          // Pass successMessage and errorMessage to the template
          const successMessage = success ? message : '';
          const errorMessage = error ? message : '';
          res.render('admin/add-item', { user: req.session.user, categories, successMessage, errorMessage ,photos, typedFields: req.session.typedFields});
      } else {
          res.render('admin/adminLogin');
      }
  } catch (error) {
      // Handle errors appropriately
      console.error('Error fetching categories:', error);
      res.status(500).send('Internal Server Error');
  }
}







// Admin login route controller function
const adminLogin = async (req, res) => {
  if (req.session.user && req.session.user.isAdmin) {
    res.render("admin/dashboard", { user: req.session.user});
  } else {
    res.render('admin/adminLogin');
  }
};

const adminLoginPost = async (req, res) => {
    const data = { email: req.body.email, password: req.body.password };
    console.log(data);

    try {
        const user = await userModel.findOne({ email: data.email });
// console.log(user + "user camed >>>>>>>>>>>>>>>>>");

        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const passwordMatch = await bcrypt.compare(data.password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        // if (user.isAdmin) {
        //     req.session.user = user;
        //     return res.redirect('/admin/dashboard'); // Redirect here
        // }

         if (user.isAdmin) {
            req.session.user = user;
            // console.log(user + " >>>>>>>>>>>>>>>>>>>>>>")
            res.json({ message: 'Login successful'});
           // res.redirect('/admin/dashboard'); // Redirect here
         // res.status(200).send("keee")
        } else {
           con
            return res.status(403).json({ success: false, message: "User does not have admin privileges" });
        }
    } catch (error) {
        console.error("Error during admin login:", error);
        return res.status(500).json({ success: false, error: "Internal Server Error" });
    }
}





const postAddUser = async (req, res) => {
  try {
      const { username, email, phone, password, isAdmin, blocked } = req.body;
      req.session.user = user;
      // Check if the username or email already exists
      const existingUser = await userModel.findOne({ $or: [{ username }, { email }] });
      if (existingUser) {
          const errorMessage = 'Username or email already exists';
          return res.render('admin/add-user', { errorMessage ,user});
      }

      // Create a new user
      const newUser = new userModel({
          username,
          email,
          phone,
          password, // Make sure to hash the password before saving it in a real application
          isAdmin: isAdmin === 'on', // Convert checkbox value to boolean
          blocked: blocked === 'on' // Convert checkbox value to boolean
      });

      await newUser.save();

      const successMessage = 'User added successfully';
      return res.render('admin/add-user', { successMessage,user });
  } catch (error) {
      console.error('Error adding user:', error);
      const errorMessage = 'Error adding user';
      return res.render('admin/add-user', { errorMessage, });
  }
};

const userOrders = async (req, res) => {
  try {
      // Fetch all orders from the database
     
      const orders = await Order.find({}).sort({ createdAt: -1 }); // Sort orders by creation date descending


      // Check if the user is authenticated and has admin privileges
      if (req.session.user && req.session.user.isAdmin) {
          res.render("admin/userOrders", { user: req.session.user, orders }); // Pass orders to the view
      } else {
          res.render('admin/adminLogin');
      }
  } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).send("Internal Server Error");
  }
};
  const stock = async (req, res) => {
    try {
        // Fetch all products from the database
        const products = await Product.find();

        // Check if the user is authenticated and has admin privileges
        if (req.session.user && req.session.user.isAdmin) {
            res.render("admin/stock", { user: req.session.user, products }); // Pass products to the view
        } else {
            res.render('admin/adminLogin');
        }
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send("Internal Server Error");
    }
};

const viewOrder = async (req, res) => {
  try {
    console.log("admin side view orders");

    const orderId = req.params.orderId;
    const order = await Order.findOne({ orderId }).populate('items.productId');
console.log("orderis.....",order);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Fetch user details
    const user = await User.findById(order.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch product details
    const productIds = order.items.map(item => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    console.log("produxts......name",products);
    console.log("user......", user);


    // Check if the user is authenticated and has admin privileges
    if (req.session.user && req.session.user.isAdmin) {
      res.render('admin/orderDetails', { 
        products,
        order,
        orderId: order.orderId, 
        amount: order.amount, 
        paymentOption: order.payment,
        isAuthenticated: req.isAuthenticated(),
        user: req.session.user,
        customer: user,
    });
    
    } else {
      res.render('admin/adminLogin');
    }
  } catch (error) {
    // Handle errors
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};



const updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const { status } = req.body;

    // Find the order by orderId and update the status
    const order = await Order.findOneAndUpdate(
      { orderId },
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.redirect(`/admin/userOrders`);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


const coupons = async (req, res) => {
  try {
      const Products = await Product.find();
      if (req.session.user && req.session.user.isAdmin) {
          // Pass success or error messages if they exist
          const successMessage = req.session.successMessage;
          const errorMessage = req.session.errorMessage;
          // Clear the session variables after retrieving their values
          delete req.session.successMessage;
          const user = req.session.user;
          delete req.session.errorMessage;

          const Coupons = await couponModel.find();
          
          // Ensure all coupons have a valid expiry date
          Coupons.forEach(coupon => {
              if (coupon.expiry && !(coupon.expiry instanceof Date)) {
                  coupon.expiry = new Date(coupon.expiry);
              }
          });

          res.render('admin/coupons', { user, Products, successMessage, errorMessage, Coupons });
      } else {
          res.render('admin/dashboard');
      }
  } catch (error) {
      // Handle any errors that might occur during database query
      console.error(error);
      res.status(500).send('Internal Server Error');
  }
};

const addCouponsPage = (req, res) => {
  if (req.session.user && req.session.user.isAdmin) {
      res.render('admin/add-coupon', { user: req.session.user,errorMessage: req.session.errorMessage,  successMessage: req.session.successMessage || null });
      delete req.session.successMessage; // Clear the message after displaying it
  } else {
      res.redirect('/admin/dashboard');
  }
};

// Handle the form submission to add a new coupon
const addCoupons = async (req, res) => {
  try {
    const { couponCode, type, discount, expiry, maxRedeem, minimumPrice, status } = req.body;

    // Check if coupon code already exists
    const existingCoupon = await couponModel.findOne({ couponCode });
    if (existingCoupon) {
      req.session.errorMessage = 'Coupon code already exists. Please use a different code.';
      req.session.successMessage = '';
      return res.redirect('/admin/add-coupon');
    }

    // Validate expiry date is in the future
    const expiryDate = new Date(expiry);
    const currentDate = new Date();
    if (expiryDate <= currentDate) {
      req.session.errorMessage = 'Expiration date must be in the future.';
      req.session.successMessage = '';
      return res.redirect('/admin/add-coupon');
    }

    const newCoupon = new couponModel({
      couponCode,
      type,
      discount,
      expiry: expiryDate,
      maxRedeem,
      minimumPrice,
      status: status === 'true'
    });

    await newCoupon.save();
    req.session.successMessage = 'Coupon added successfully!';
    req.session.errorMessage = '';
    res.redirect('/admin/add-coupon');
  } catch (error) {
    console.error(error);
    req.session.errorMessage = 'Failed to add coupon. Please try again.';
    req.session.successMessage = '';
    res.redirect('/admin/add-coupon');
  }
};

const deleteCoupon = async (req, res) => {
  const couponId = req.params.couponId;
console.log("delet copun hitt");
  try {
      // Your deletion logic here
      await couponModel.findByIdAndDelete(couponId); // Example using Mongoose
      req.session.successMessage = 'Coupon deleted successfully!';
      res.redirect('/admin/coupons');
  } catch (error) {
      console.error(error);
      req.session.errorMessage = 'Failed to delete coupon. Please try again.';
      res.redirect('/admin/coupons');
  }
};
const editCouponpage = async (req, res) => {
  const couponId = req.params.couponId;

  try {
      if (req.session.user && req.session.user.isAdmin) {
          const coupon = await couponModel.findById(couponId); // Assuming you're using Mongoose
          if (!coupon) {
              req.session.errorMessage = 'Coupon not found.';
              return res.redirect('/admin/dashboard');
          }

          res.render('admin/edit-coupon', {
              coupon,
              user: req.session.user,
              errorMessage: req.session.errorMessage,
              successMessage: req.session.successMessage || null
          });

          delete req.session.successMessage; // Clear the message after displaying it
      } else {
          res.redirect('/admin/dashboard');
      }
  } catch (error) {
      console.error('Error fetching coupon:', error);
      req.session.errorMessage = 'Failed to fetch coupon. Please try again.';
      res.redirect('/admin/dashboard');
  }
};



const updateCoupon = async (req, res) => {
  const couponId = req.params.couponId;

  try {
      const { couponCode, type, discount, expiry, maxRedeem, minimumPrice, status } = req.body;

      // Assuming you are using Mongoose for your model
      const coupon = await couponModel.findById(couponId);

      if (!coupon) {
          req.session.errorMessage = 'Coupon not found.';
          return res.redirect('/admin/coupons');
      }

      // Check if the new coupon code already exists (excluding current coupon)
      const existingCoupon = await couponModel.findOne({ couponCode, _id: { $ne: couponId } });
      if (existingCoupon) {
          req.session.errorMessage = 'Coupon code already exists. Please choose a different code.';
          return res.redirect(`/admin/edit-coupon/${couponId}`);
      }

      // Check if expiry date is valid (must be after current date)
      const currentDate = new Date();
      const couponExpiryDate = new Date(expiry);
      if (couponExpiryDate <= currentDate) {
          req.session.errorMessage = 'Expiration date must be after the current date.';
          return res.redirect(`/admin/edit-coupon/${couponId}`);
      }

      // Update the coupon document with new values
      coupon.couponCode = couponCode;
      coupon.type = type;
      coupon.discount = discount;
      coupon.expiry = couponExpiryDate;
      coupon.maxRedeem = maxRedeem;
      coupon.minimumPrice = minimumPrice;
      coupon.status = status === 'true'; // Convert string to boolean

      await coupon.save(); // Save the updated coupon

      req.session.successMessage = 'Coupon updated successfully!';
      res.redirect('/admin/coupons'); // Redirect to coupon list or dashboard after successful update
  } catch (error) {
      console.error('Error updating coupon:', error);
      req.session.errorMessage = 'Failed to update coupon. Please try again.';
      res.redirect(`/admin/edit-coupon/${couponId}`); // Redirect back to edit page with error message
  }
};

const salesOverview = async (req, res) => {
  try {
    const { startDate, endDate, status, page = 1 } = req.query;
    const limit = 10;
    const skip = (page - 1) * limit;
    let filter = {};

    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (status) {
      filter.status = status;
    }

    const orders = await Order.find(filter)
                              .sort({ createdAt: -1 })
                              .skip(skip)
                              .limit(limit);
    
    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / limit);

    // Calculate overall sales count, order amount, and discount
    // Example calculations (replace with your actual logic)
    const overallSalesCount = totalOrders;
    const overallOrderAmount = orders.reduce((total, order) => total + order.amount, 0);
    const overallDiscount = orders.reduce((total, order) => total + order.discount, 0);

    if (req.session.user && req.session.user.isAdmin) {
      res.render("admin/salesOverview", {
        user: req.session.user,
        orders,
        currentPage: Number(page),
        totalPages,
        startDate,
        endDate,
        status,
        overallSalesCount,
        overallOrderAmount,
        overallDiscount
      });
    } else {
      res.render('admin/adminLogin');
    }
  } catch (error) {
    console.error("Error fetching orders:", error); // Log detailed error message
    res.status(500).send("Internal Server Error");
  }
};




module.exports = { adminmgmtGet, adminLogin ,adminLoginPost,logoutAdmin,userManagment, addItem,blockUser,unblockUser,addUser,
  postAddUser,userOrders,viewOrder,updateOrderStatus,coupons,addCoupons,addCouponsPage,deleteCoupon,
  editCouponpage,updateCoupon,salesOverview,stock}