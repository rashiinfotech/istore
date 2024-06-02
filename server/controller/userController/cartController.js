const { body, validationResult } = require('express-validator');
const { MongoClient } = require("mongodb");
const User = require('../../model/userModel');
const CartItem = require('../../model/cartModel'); 
const Category = require('../../model/categoryModel');
const Product = require('../../model/productModel');
const Order = require('../../model/orderModel');
const mongoose = require('mongoose');


const createOrder = async (req, res) => {
    try {
        console.log("Reached create order");

        const userId = req.session.userId;
        
        // Check if userId is valid
        if (!userId) {
            console.error('Invalid userId:', userId);
            return res.status(400).json({ error: 'Invalid user ID', success: false });
        }

        const { amount, items, paymentOption } = req.body;

        console.log("Request body:", req.body);

        // Check if items array is empty or amount is zero
        if (!items || items.length === 0) {
            console.error('No items provided in the order');
            return res.status(400).json({ error: 'No items provided in the order', success: false });
        }

        if (!amount || amount <= 0) {
            console.error('Invalid order amount');
            return res.status(400).json({ error: 'Invalid order amount', success: false });
        }

        // Prepare order items with price included
        const orderItems = await Promise.all(items.map(async item => {
            const product = await Product.findById(item.productId);
            if (product) {
                if (product.stock < item.quantity) {
                    console.error(`Insufficient stock for product ID ${item.productId}`);
                    throw new Error(`Insufficient stock for product ID ${item.productId}`);
                }
                console.log(`Product found: ${product._id}, Price: ${product.price}, Stock: ${product.stock}`);
                return {
                    productId: product._id,
                    quantity: item.quantity,
                    price: product.price
                };
            } else {
                console.error(`Product with ID ${item.productId} not found`);
                throw new Error(`Product with ID ${item.productId} not found`);
            }
        }));

        // Create a new order instance
        const newOrder = new Order({
            userId: userId,
            items: orderItems,
            amount: amount,
            address: [],
            payment: paymentOption,
            createdAt: new Date(),
            updated: new Date(),
        });

        // Save the new order to the database
        const savedOrder = await newOrder.save();

        // Subtract ordered quantity from product stock
        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (product) {
                product.stock -= item.quantity;
                await product.save();
                console.log(`Product stock updated for product ID ${item.productId}`);
            } else {
                console.error(`Product with ID ${item.productId} not found`);
            }
        }

        const order = await Order.findById(savedOrder._id);

        // Clear the user's cart
        await CartItem.deleteMany({ user: userId });
        console.log(`Cart cleared for user ID ${userId}`);

        // Respond with the order ID and success
        res.status(200).json({ orderId: order.orderId, success: true });
        console.log("Order saved successfully:", savedOrder);
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Internal server error', success: false });
    }
};





const wishlistDelete=  async (req, res) => {
    const userId = req.params.userId;
    const itemId = req.params.itemId;

    try {
        await Wishlist.updateOne({ userId }, { $pull: { items: { _id: itemId } } });
        res.redirect(`/wishlist/${userId}`);
    } catch (err) {
        res.status(500).send(err);
    }
};





const calculateSubtotal = (products) => {
    return products.reduce((total, item) => {
        return total + item.product.price * item.quantity;
    }, 0);
};

const calculateTotal = (products) => {
    const subtotal = calculateSubtotal(products);
    // You can add discount and shipping logic here if needed
    return subtotal;
};

const cart = async (req, res) => {
    console.log("Reached in cart.....");

    try {
        const userId = req.session.userId;
        const categories = await Category.find();
        console.log("Reached in cart");

        const user = await User.findById(userId).populate({
            path: 'cart',
            populate: {
                path: 'product',
                model: 'Product' // Ensure this matches the alias in the model definition
            }
        });

        if (!user) {
            return res.status(404).send({ error: 'User not found' });
        }

        const cartItems = await CartItem.find({ user: userId }).populate('product');
        console.log("cartItems.....", cartItems);

        res.render('user/Cart', {
            products: cartItems,
            categories,
            user: userId,
            isAuthenticated: req.isAuthenticated,
            calculateSubtotal: calculateSubtotal,
            calculateTotal: calculateTotal
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Server error' });
    }
};




const addItemToCart = async (req, res) => {
    try {
        console.log("rech addcart",req.body);
                const userId = req.session.userId;
        const { productId } = req.params;
        const { quantity } = req.body;
       
        // Check if user is authenticated
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        // Validate quantity
        if (!Number.isInteger(quantity) || quantity <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid quantity' });
        }

        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Find existing cart item
        let cartItem = await CartItem.findOne({ user: userId, product: productId });

        if (cartItem) {
            // Update quantity if cart item exists
            cartItem.quantity += quantity;
        } else {
            // Create new cart item if it doesn't exist
            cartItem = new CartItem({ user: userId, product: productId, quantity });
        }

        // Save cart item to database
        await cartItem.save();

        return res.status(200).json({ success: true, message: 'Item added to cart', cartItem });
    } catch (error) {
        console.error('Error adding item to cart:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

// const checkout= async (req, res) => {}
const thankYou = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const userId = req.session.userId;

        console.log('Received orderId:', orderId); // Log orderId to check its value

        const order = await Order.findOne({ orderId: orderId });
        console.log('Found order:', order); // Log order to check if it exists
 console.log(order);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        console.log('User ID from session:', userId); // Log userId to check its value

        const user = await User.findById(userId);
        console.log('Found user:', user); // Log user to check if it exists

        const categories = await Category.find();
        
        res.render('user/thank-you', { 
            orderId: orderId, 
            amount: order.amount, 
            paymentOption: order.payment,
            isAuthenticated: req.isAuthenticated,
            user,
            categories 
        });
    } catch (error) {
        console.error('Error rendering thank-you page:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};



const viewOrder = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        console.log('Received orderId:', orderId);

        // Find the order by orderId field
        const order = await Order.findOne({ orderId: orderId });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const userId = req.session.userId;
        const user = await User.findById(userId);
        console.log('Found user:', user);

        const categories = await Category.find();
        const products = await Product.find({ _id: { $in: order.items.map(item => item.productId) } });
console.log(products);
        res.render('user/orderDetails', { 
            order,
            orderId: order.orderId, 
            amount: order.amount, 
            paymentOption: order.payment,
            isAuthenticated: req.isAuthenticated,
            user,
            categories,
            products
        });
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const cancelOrders = async (req, res) => {
    const orderId = req.params.orderId;

    try {
        // Find the order by orderId
        const order = await Order.findOne({ orderId });

        // If order not found
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // If order is already cancelled, return a message
        if (order.status === "Cancelled") {
            return res.status(400).json({ message: "Order is already cancelled" });
        }

        // Update the stock for each item in the order
        const items = order.items; // Assuming 'items' is an array of { productId, quantity }
        for (const item of items) {
            // const product = await Product.findOne({ productId: item.productId });
            const product = await Product.findById(item.productId);

            // If product not found, log an error (but continue processing)
            if (!product) {
                console.error(`Product with ID ${item.productId} not found`);
                continue;
            }

            // Log the current stock and quantity to be added
            console.log(`Product ID: ${item.productId}, Current Stock: ${product.stock}, Quantity to Add: ${item.quantity}`);

            // Update the stock quantity
            product.stock += item.quantity;

            // Save the updated product
            await product.save();

            // Log the new stock quantity
            console.log(`New Stock for Product ID ${item.productId}: ${product.stock}`);
        }

        // Update the order status to "Cancelled"
        order.status = "Cancelled";

        // Save the updated order
        await order.save();

        // Respond with success message
        return res.status(200).json({ message: "Order cancelled successfully" });
    } catch (error) {
        // If an error occurs, respond with error message
        console.error("Error cancelling order:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};



module.exports = {
    cart,
    addItemToCart,
    //checkout,
    createOrder,
    wishlistDelete,
    thankYou,
    viewOrder,
    cancelOrders
};
