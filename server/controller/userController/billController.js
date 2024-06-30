const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const ejs = require('ejs');
const Product = require('../../model/productModel');
const Order = require('../../model/orderModel');

// Route to generate PDF bill
const generateBill = async (req, res) => {
    try {
        // Fetch order with populated data
        const order = await Order.findById(req.params.orderId)
            .populate('userId')
            .lean(); // Using lean() for performance if not modifying documents

        if (!order) {
            return res.status(404).send('Order not found');
        }

        // Separate billAddress and shipAddress from order
        const { billAddress, shipAddress, ...orderDetails } = order;

        // Ensure billAddress and shipAddress are defined and are arrays
        const billingAddress = billAddress && billAddress.length > 0 ? billAddress[0] : null;
        const shippingAddress = shipAddress && shipAddress.length > 0 ? shipAddress[0] : null;

        // Fetch products for the order items if needed
        const productIds = order.items.map(item => item.productId);
        const products = await Product.find({
            _id: { $in: productIds }
        });

        // Create a map of productId to product details
        const productMap = products.reduce((acc, product) => {
            acc[product._id.toString()] = product;
            return acc;
        }, {});

        // Path to the EJS template
        const templatePath = path.join(__dirname, '../../../views/user/generateBill.ejs');

        // Check if the template exists
        if (!fs.existsSync(templatePath)) {
            console.error('Template file does not exist:', templatePath);
            return res.status(500).send('Template file not found');
        }

        // Render the EJS template with order and product data, plus isAuthenticated and user
        const htmlContent = await ejs.renderFile(templatePath, {
            order: orderDetails,
            billAddress: billingAddress, // Pass the billingAddress
            shipAddress: shippingAddress, // Pass the shippingAddress
            productMap,
            isAuthenticated: false, // Assuming not authenticated for PDF generation
            user: null // No user data for PDF generation
        });

        // Launch a headless browser with increased timeout and additional options
        const browser = await puppeteer.launch({
            timeout: 60000, // 60 seconds
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 60000 }); // 60 seconds
        const pdfBuffer = await page.pdf({ format: 'A4', timeout: 60000 }); // 60 seconds

        await browser.close();

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBuffer.length
        });

        res.send(pdfBuffer);
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send('Server error');
    }
};

module.exports = { generateBill };
