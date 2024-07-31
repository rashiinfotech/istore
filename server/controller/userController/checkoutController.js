const User = require('../../model/userModel');
const Address = require('../../model/addressModel');
const Category = require('../../model/categoryModel');
const Order = require('../../model/orderModel');
const Coupon = require('../../model/couponModel');
const crypto = require('crypto');
const Product = require('../../model/productModel');
const Razorpay = require('razorpay');
const CartItem = require('../../model/cartModel');

const razorpayInstance = new Razorpay({
    key_id: 'rzp_test_auDl0LryuSRaVK',
    key_secret: 'Sw61pWF98ljCA2E5qKXY6ei0',
});



// const webhookHandler = async (req, res) => {
//     const secret = process.env.RAZORPAY_WEBHOOK_SECRET; // Store your webhook secret in environment variable
//     console.log("Webhook Handler Hit");
    
//     const shasum = crypto.createHmac('sha256', secret);
//     shasum.update(JSON.stringify(req.body));
//     const digest = shasum.digest('hex');

//     if (digest !== req.headers['x-razorpay-signature']) {
//         console.error('Invalid signature');
//         return res.status(400).json({ error: 'Invalid signature' });
//     }

//     const event = req.body.event;

//     if (event === 'payment.failed') {
//         const paymentEntity = req.body.payload.payment.entity;
//         const orderId = paymentEntity.notes.order_id;  // Retrieve order_id from notes
//         const paymentId = paymentEntity.id;
//         const reason = paymentEntity.error_description;

//         console.log(`Payment Failed for Order ID: ${orderId}, Payment ID: ${paymentId}, Reason: ${reason}`);

//         try {
//             const order = await Order.findOne({ orderId });

//             if (!order) {
//                 console.error('Order not found with orderId:', orderId);
//                 return res.status(404).json({ error: 'Order not found' });
//             }

//             order.paymentStatus = 'Failed';
//             order.status = 'Failed';
//             order.updated = new Date();

//             await order.save();

//             // Optionally send email or SMS to the user about the payment failure
//             console.log('Order updated successfully:', order);

//             // Send a response indicating the payment failure
//             res.status(200).json({ orderId: order.orderId, paymentId: paymentId, reason: reason });

//         } catch (err) {
//             console.error('Error finding or updating order:', err);
//             return res.status(500).json({ error: 'Internal server error' });
//         }

//     } else {
//         res.status(400).json({ error: 'Unhandled event type' });
//     }
// };





const orders = async (req, res) => {
    try {
        const userId = req.session.userId;
        const user = await User.findById(userId);
        const categories = await Category.find();
        const address = await Address.find();

        if (!user) {
            return res.redirect('/login');
        }

        // Pagination setup
        const perPage = 10; // Number of orders per page
        const page = parseInt(req.query.page) || 1;

        const totalOrders = await Order.countDocuments({ userId });
        const userOrders = await Order.find({ userId })
            .sort({ createdAt: -1 })
            .skip((perPage * page) - perPage)
            .limit(perPage);

        res.render('user/My-order', {
            user,
            isAuthenticated: req.isAuthenticated,
            categories,
            address,
            orders: userOrders,
            current: page,
            pages: Math.ceil(totalOrders / perPage)
        });
    } catch (error) {
        console.error('Error fetching user orders:', error);
        res.status(500).send('Internal Server Error');
    }
};



const validateCoupon = async (req, res) => {
    const couponCode = req.body.coupon;
    const grandTotal = req.body.grandTotal;

    console.log("grandTotal...", grandTotal);
    console.log("coupon....", couponCode);

    try {
        // Find the coupon in the database
        const coupon = await Coupon.findOne({ couponCode: couponCode.toUpperCase(), status: true });

        if (!coupon) {
            return res.json({
                success: false,
                message: 'Invalid or expired coupon code',
            });
        }

        // Check if the coupon has expired
        if (coupon.expiry < new Date()) {
            return res.json({
                success: false,
                message: 'Coupon has expired',
            });
        }

        // Calculate the discount based on the coupon type and minimum price condition
        let discountAmount = 0;
        if (grandTotal >= coupon.minimumPrice) {
            discountAmount = (grandTotal * coupon.discount) / 100;
        } else {
            return res.json({
                success: false,
                message: `Minimum purchase amount for this coupon is ${coupon.minimumPrice}`,
            });
        }

        // Apply maxRedeem as the maximum discount amount check
        if (discountAmount > coupon.maxRedeem) {
            discountAmount = coupon.maxRedeem;
        }

        // Calculate the grand total after applying the discount
        const GrandTotal = grandTotal - discountAmount;

        console.log(grandTotal);
        console.log(GrandTotal);
        console.log(discountAmount);

        res.json({
            success: true,
            discountAmount: discountAmount.toFixed(2),
            grandTotal: GrandTotal.toFixed(2),
        });
    } catch (error) {
        console.error('Error validating coupon:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};


const razorpayKey=(req, res) => {
    console.log("hit razer key");
    const razorpayKey = process.env.RAZORPAY_KEY_ID;
    res.json({ key: razorpayKey });
};
const createFailedOrder = async (req, res) => {
    console.log("hit create failed order");
    try {
        const userId = req.params.userId;

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
            status: 'pending', // Set status to indicate failed order
            paymentStatus: 'failed', // Set paymentStatus to 'failed'
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
        console.error('Error in createFailedOrder:', error);
        res.status(500).json({ error: 'Internal server error', success: false });
    }
}


const capturePaymentAfterFailure = async (req, res) => {
    console.log("Hit capturePaymentAfterFailure");
    try {
        const { payment_id, amount, currency } = req.body;

        // Example: Check if necessary parameters are provided
        if (!payment_id || !amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid payment details', success: false });
        }

        // Capture the payment
        const paymentCapture = await razorpayInstance.payments.capture(payment_id, amount * 100, currency);

        if (paymentCapture.status !== 'captured') {
            return res.status(400).json({ error: 'Payment capture failed', success: false });
        }

        // Update existing order/payment status in your database
        const orderId = req.params.orderId; // Assuming orderId is passed through the URL
        const updatedOrder = await Order.findOneAndUpdate(
            { orderId: orderId },
            { $set: { paymentStatus: 'success' } },
            { new: true } // Return the updated document
        );

        if (!updatedOrder) {
            return res.status(404).json({ error: 'Order not found', success: false });
        }

        res.status(200).json({ orderId: updatedOrder.orderId, success: true });
    } catch (error) {
        console.error('Error capturing payment after failure:', error);
        res.status(500).json({ error: 'Internal server error', success: false });
    }
};

module.exports = { orders,validateCoupon ,
    razorpayKey,
    // webhookHandler,
    createFailedOrder,
    capturePaymentAfterFailure
};
