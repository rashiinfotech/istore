const userModel = require('../../model/userModel');
const { body, validationResult } = require('express-validator');
const { MongoClient } = require("mongodb");

 
 const cartGet= async(req,res)=>{

 res.render('user/cart');

 } 



module.exports= {cartGet};