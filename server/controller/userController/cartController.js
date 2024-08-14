const { body, validationResult } = require('express-validator');
const { MongoClient } = require("mongodb");
const User = require('../../model/userModel');
const CartItem = require('../../model/cartModel'); 
const Address = require('../../model/addressModel'); 
const Category = require('../../model/categoryModel');
const Product = require('../../model/productModel');
const Order = require('../../model/orderModel');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const Razorpay = require('razorpay');
const Wallet = require('../../model/walletModel');
const razorpayInstance = new Razorpay({
    key_id: 'rzp_test_auDl0LryuSRaVK',
    key_secret: 'Sw61pWF98ljCA2E5qKXY6ei0',
});

const searchProducts = async (req, res) => {
    try {
        const { category, search } = req.query;

        let query = {};
        if (category && category !== '0') {
            query.category = category;
        }
        if (search) {
            query.name = { $regex: search, $options: 'i' }; // Case-insensitive search
        }
        const userId = req.session.userId;
        const user = await User.findById(userId);
        const products = await Product.find(query).populate('category');
        const categories = await Category.find();
        const isAuthenticated = req.isAuthenticated;

        res.render('user/searchResults', { products, categories, search, selectedCategory: category,isAuthenticated ,user});
    } catch (error) {
        console.error('Error fetching search results:', error);
        res.status(500).send('Internal Server Error');
    }
};



const createOrder = async (req, res) => {

    console.log("hitt create order");
    try {
        const userId = req.session.userId;

        if (!userId) {
            return res.status(400).json({ error: 'Invalid user ID', success: false });
        }

        const { amount, items, quantities, paymentOption, billAddress, shipAddress } = req.body;

        if (!items || items.length === 0 || !amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid order details', success: false });
        }

        const orderItems = await Promise.all(items.map(async (productId, index) => {
            const product = await Product.findById(productId);
            const quantity = parseInt(quantities[index], 10);

            if (!product || product.stock < quantity) {
                throw new Error(`Insufficient stock for product ID ${productId}`);
            }

            return {
                productId: product._id,
                quantity: quantity,
                price: product.price,
            };
        }));

        const newOrder = new Order({
            userId,
            items: orderItems,
            amount,
            billAddress,
            shipAddress,
            payment: paymentOption,
            createdAt: new Date(),
            updated: new Date(),
        });

        const savedOrder = await newOrder.save();

        await Promise.all(orderItems.map(async (item) => {
            const product = await Product.findById(item.productId);
            if (product) {
                product.stock -= item.quantity;
                await product.save();
            }
        }));

        await CartItem.deleteMany({ user: userId });

        res.status(200).json({ orderId: savedOrder.orderId, success: true });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error', success: false });
    }
};


const capturePaymentAndCreateOrder = async (req, res) => {
    console.log("Hit capturePaymentAndCreateOrder");
    try {
        const { payment_id, amount, currency, items, quantities, paymentOption, billAddress, shipAddress } = req.body;
        const userId = req.session.userId;

        if (!userId) {
            return res.status(400).json({ error: 'Invalid user ID', success: false });
        }

        if (!items || items.length === 0 || !amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid order details', success: false });
        }

        // Capture the payment
        const paymentCapture = await razorpayInstance.payments.capture(payment_id, amount * 100, currency);

        if (paymentCapture.status !== 'captured') {
            return res.status(400).json({ error: 'Payment capture failed', success: false });
        }

        // Create the order
        const orderItems = await Promise.all(items.map(async (productId, index) => {
            const product = await Product.findById(productId);
            const quantity = parseInt(quantities[index], 10);

            if (!product || product.stock < quantity) {
                throw new Error(`Insufficient stock for product ID ${productId}`);
            }

            return {
                productId: product._id,
                quantity: quantity,
                price: product.price,
            };
        }));

        const newOrder = new Order({
            userId,
            items: orderItems,
            amount,
            billAddress,
            shipAddress,
            payment: paymentOption,
            createdAt: new Date(),
            updated: new Date(),
        });

        const savedOrder = await newOrder.save();

        await Promise.all(orderItems.map(async (item) => {
            const product = await Product.findById(item.productId);
            if (product) {
                product.stock -= item.quantity;
                await product.save();
            }
        }));

        await CartItem.deleteMany({ user: userId });

        res.status(200).json({ orderId: savedOrder.orderId, success: true });
    } catch (error) {
        console.error('Error in capturePaymentAndCreateOrder:', error);
        res.status(500).json({ error: 'Internal server error', success: false });
    }
};



const onlinePayment = async (req, res) => {
    console.log("hit onlinePayment");
    const { amount, items, quantities, paymentOption, billAddress, shipAddress } = req.body;
    const userId = req.session.userId;

    if (!userId) {
        return res.status(400).json({ error: 'Invalid user ID', success: false });
    }

    if (!items || items.length === 0 || !amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid order details', success: false });
    }

    if (paymentOption === 'Cash on Delivery' && amount <= 2000) {
        return res.status(400).json({ error: 'COD is only available for orders above ₹2000', success: false });
    }

    const orderItems = await Promise.all(items.map(async (productId, index) => {
        const product = await Product.findById(productId);
        const quantity = parseInt(quantities[index], 10);

        if (!product || product.stock < quantity) {
            throw new Error(`Insufficient stock for product ID ${productId}`);
        }

        return {
            productId: product._id,
            quantity: quantity,
            price: product.price,
        };
    }));

    const newOrder = new Order({
        userId,
        items: orderItems,
        amount,
        billAddress,
        shipAddress,
        payment: paymentOption,
        status: 'pending',
        paymentStatus: 'Pending',
        createdAt: new Date(),
        updated: new Date(),
    });

    const savedOrder = await newOrder.save();

    const options = {
        amount: amount * 100,
        currency: 'INR',
        receipt: savedOrder.orderId,
        notes: {
            order_id: savedOrder.orderId,
        }
    };

    razorpayInstance.orders.create(options, (err, order) => {
        if (err) {
            return res.status(500).json({ error: 'Error creating Razorpay order' });
        }
        res.json({ razorpayOrderId: order.id, orderId: savedOrder.orderId });
    });
};








// Helper functions to calculate totals
function calculateTotal(products, tax) {
    if (!Array.isArray(products)) return 0;
    const totalExcludingTax = products.reduce((sum, product) => sum + (product.product.price * product.quantity), 0);
    return totalExcludingTax - tax;
}

function calculateTotal(cartItems) {
    let total = 0;
    for (const item of cartItems) {
        total += item.product.price * item.quantity;
    }
    return total;
}
console.log("object");
function calculateTax(total) {
    return total * 0.18;
}

function calculateSubtotal(total, tax) {
    return total + tax;
}

function calculateShipping(total) {
    return total > 10000 ? 0 : 100;
}

function calculateGrandTotal(subtotal, shipping) {
    return Math.round(subtotal + shipping);
}

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

        // Calculate the total price of items in the cart (excluding tax)
        const totalBeforeTax = calculateTotal(cartItems);

        // Calculate the tax using the total
        const tax = calculateTax(totalBeforeTax);

        // Calculate shipping, subtotal, and grand total
        const total = totalBeforeTax + tax;
        const shipping = calculateShipping(totalBeforeTax);
        const subtotal = calculateSubtotal(totalBeforeTax, tax);
        const grandTotal = calculateGrandTotal(subtotal, shipping);
        
        res.render('user/cart', {
            products: cartItems.map(item => ({
                product: item.product,
                quantity: item.quantity,
                stock: item.product.stock,
            })),
            total: totalBeforeTax, // Displaying the total before tax
            tax,
            
            userId,
            shipping,
            subtotal,
            grandTotal,
            categories,
            user,
            isAuthenticated: req.isAuthenticated
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Server error' });
    }
};

const updateCartQuantity = async (req, res) => {
    console.log('updateCartQuantity route hit');
    const userId = req.session.user._id; // Adjust this to your user identification logic
    
    // Find the user by ID
const user = await User.findById(userId);
    const { quantity, productId } = req.body;

    console.log("Received productId:", productId);
    console.log("Received quantity:", quantity);
    console.log("req.body:", req.body);
    

    if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ error: 'Invalid product ID' });
    }

    try {
        const cartItem = await CartItem.findOneAndUpdate(
            { user, product: productId },
            { $set: { quantity } },
            { new: true, upsert: true }
        );

        const updatedCart = await CartItem.find({ user}).populate('product');
        res.json({ products: updatedCart });
    } catch (error) {
        console.error('Error updating cart quantity:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


const checkout = async (req, res) => {
    try {
        const userId = req.session.userId;
        const cartItems = await CartItem.find({ user: userId }).populate('product');
        console.log("cartItems.....", cartItems);
        let couponApplied = '';

        const categories = await Category.find();
        const addresses = await Address.find({ userId });

        // Populate product details in cart items
       
      

        const totalBeforeTax = calculateTotal(cartItems);
        const tax = calculateTax(totalBeforeTax);
        const shipping = calculateShipping(totalBeforeTax);
        const subtotal = calculateSubtotal(totalBeforeTax, tax);
        const grandTotal = calculateGrandTotal(subtotal, shipping);
       
        const checkoutDetails = {
            products: cartItems.map(item => ({
                product: item.product,
                quantity: item.quantity,
                stock: item.product.stock,
              })),
            total: totalBeforeTax,
            tax,
            addresses,
            userId,
            user: userId,
            shipping,
            subtotal,
            grandTotal,
            categories,
            isAuthenticated: req.isAuthenticated,
            couponApplied,
            
        };

        res.render('user/checkout', checkoutDetails);
    } catch (error) {
        console.error("Error rendering checkout page:", error);
        res.status(500).send("Server Error");
    }
};






const addItemToCart = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { productId } = req.params;
        const { quantity } = req.body;

        // Check if user is authenticated
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not logged in' });
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


const deletItemToCart = async (req, res) => {
    try {
        const { userId, productId } = req.params;
        console.log("deletItemToCart");

        // Find the user by ID
        const user = await User.findById(userId);

        // If user not found
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Remove the product from the user's cart
        await CartItem.findOneAndDelete({ user: userId, product: productId });

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};


const thankYou = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const userId = req.session.userId;

        console.log('Received orderId:', orderId); // Log orderId to check its value

        // Query by orderId instead of _id
        const order = await Order.findOne({ orderId: orderId });
        console.log('Found order:', order); // Log order to check if it exists

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        console.log('User ID from session:', userId); // Log userId to check its value

        const user = await User.findById(userId);
        console.log('Found user:', user); // Log user to check if it exists

        const categories = await Category.find();

        res.render('user/thank-you', {
            orderId: order.orderId, // Use order.orderId for the short ID
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

        // Ensure order.user is populated with necessary fields
        const populatedOrder = {
            ...order.toObject(),
            user: {
                email: user.email,
                phone: user.phone
            }
        };
console.log("user.phone", user.phone);
console.log("user.email", user.email);
console.log("user", user);
        res.render('user/orderDetails', { 
            order: populatedOrder,
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
    console.log("Cancel order request received for orderId:", orderId);
    try {
        // Find the order by orderId
        const order = await Order.findOne({ orderId });
        console.log("Order found:", order);

        // If order not found
        if (!order) {
            console.log("Order not found");
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        // If order is already cancelled, return a message
        if (order.status === "Cancelled") {
            console.log("Order is already cancelled");
            return res.status(400).json({ success: false, message: "Order is already cancelled" });
        }

        // Update the stock for each item in the order
        const items = order.items; // Assuming 'items' is an array of { productId, quantity }
        for (const item of items) {
            const product = await Product.findById(item.productId);
            console.log("Product found for item:", item, "Product:", product);

            // If product not found, log an error (but continue processing)
            if (!product) {
                console.error(`Product with ID ${item.productId} not found`);
                continue;
            }

            // Update the stock quantity
            product.stock += item.quantity;
            await product.save();
            console.log("Product stock updated for product:", product);
        }

        // Update the order status to "Cancelled"
        order.status = "Cancelled";
        await order.save();
        console.log("Order status updated to 'Cancelled' for order:", order);

        // If the payment method is online, update the wallet balance
        if (order.payment === 'Online Payment') {
            let wallet = await Wallet.findOne({ userId: order.userId });
            console.log("Wallet found for user:", wallet);

            // If no wallet exists for the user, create one
            if (!wallet) {
                wallet = new Wallet({ userId: order.userId, balance: 0 });
                console.log("New wallet created for user:", wallet);
            }

            // Update wallet balance
            wallet.balance += order.amount;

            // Record the transaction
            wallet.transactions.push({
                amount: order.amount,
                type: 'credit',
                description: `Refund for order ${orderId}`
            });

            await wallet.save();
            console.log("Wallet updated with refund for order:", orderId);
        }

        // Respond with success message
        console.log("Order cancelled successfully");
        return res.status(200).json({ success: true, message: "Order cancelled successfully" });
    } catch (error) {
        // If an error occurs, respond with error message
        console.error("Error cancelling order:", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
};





module.exports = {
    cart,
    addItemToCart,
    //checkout,
    createOrder,
     thankYou,
    viewOrder,
    cancelOrders,
    deletItemToCart,
    checkout,
    updateCartQuantity,
    onlinePayment,
    capturePaymentAndCreateOrder,
    searchProducts
};
