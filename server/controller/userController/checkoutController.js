const User = require('../../model/userModel');
const Address = require('../../model/addressModel');
const Category = require('../../model/categoryModel');
const Order = require('../../model/orderModel');

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


module.exports = { orders };
