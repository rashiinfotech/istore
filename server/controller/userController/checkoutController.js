const User = require('../../model/userModel');
const Address = require('../../model/addressModel');
const Category = require('../../model/categoryModel');
const Order = require('../../model/orderModel');
const Coupon = require('../../model/couponModel');
const orders = async (req, res) => {
    try {
        const userId = req.session.userId;
        const user = await User.findById(userId);
        const categories = await Category.find();
        const address = await Address.find();
        const userOrders = await Order.find({ userId }).sort({ createdAt: -1 }); // Sort orders by creation date descending

        if (!user) {
            return res.redirect('/login');
        }

        res.render('user/My-order', {
            user,
            isAuthenticated: req.isAuthenticated,
            categories,
            address,
            orders: userOrders // Pass the orders to the template
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

module.exports = { orders,validateCoupon ,razorpayKey};
