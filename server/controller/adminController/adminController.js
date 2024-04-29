const { render } = require("ejs");
const express =require('express')
const userModel= require('../../model/userModel')
const mongoose =require('mongoose')
const bcrypt = require('bcrypt');
const cartController = require('../userController/cartController');
const Category = require('../../model/categoryModel');




// Admin management route controller function
const adminmgmtGet = async (req, res) => {
  //  console.log("inside admingmtGet")
    try {
      // Retrieve the list of users
      const users = await userModel.find();
     
      // Check if the user is authenticated, exists, and has admin privileges
  if (req.session.user && req.session.user.isAdmin) {
   //  console.log(users + "   hii >>>>>>>>>>>>>>>>>>>>");
    // res.render("admin/dashboard")
     res.render("admin/dashboard", { user: req.session.user, users });
     // res.json({ message: 'Login successful'});
     //res.send("keee")
  } else {
    res.render('admin/adminLogin');
  }
  
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).send("Internal Server Error");
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





module.exports = { adminmgmtGet, adminLogin ,adminLoginPost,logoutAdmin,userManagment, addItem,blockUser,unblockUser,addUser,
  postAddUser}