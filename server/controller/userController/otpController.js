const otpModel = require('../../model/otpModel');
const cron = require('node-cron');
const twilio = require('twilio');
const { validationResult } = require('express-validator');
const dotenv = require('dotenv');
dotenv.config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  

// Schedule task to delete expired OTPs every 30 seconds
cron.schedule('*/30 * * * * *', async () => {
    try {
        // Delete expired OTPs
        await otpModel.deleteMany({ expiry: { $lt: new Date() } });
       // console.log('Expired OTPs deleted');
    } catch (err) {
        console.error('Error deleting expired OTPs:', err);
    }
});

// Generate OTP function
const generateOTP = () => {
    // Generate a random 4-digit OTP
    return Math.floor(1000 + Math.random() * 9000);
};

// Function to send OTP via SMS
async function sendOTP(phoneNumber, otp) {
    try {
        // Send SMS using Twilio API
        console.log("sent ottpp");
        const message = await client.messages.create({
            body: `Your OTP for verification is: ${otp}`,
            from: '+12138175376', // Replace with your Twilio phone number
            to: '+91'+phoneNumber
        });
        console.log(`OTP sent successfully to ${phoneNumber}`);
        return message;
    } catch (error) {
        console.error(`Error sending OTP to ${phoneNumber}:`, error);
        throw error;
    }
}

// Middleware to generate OTP
const generateOtpPost = async (req, res, next) => {
    const { email, phone } = req.body;

    // Generate OTP
    const otp = generateOTP();

    // Set OTP expiry to 120 seconds from now
    const expiry = new Date(Date.now() + 50000); // 50 seconds in milliseconds

    try {
        // Save OTP to the database
        await otpModel.create({ email, otp, expiry });
        console.log('OTP generated:', otp);

        // Send OTP via SMS
        await sendOTP(phone, otp);

        // Send response with OTP and expiry time
        res.json({ otp, expiry: expiry.getTime() });
    } catch (err) {
        console.error('Error generating OTP:', err);
        res.status(500).json({ error: 'Failed to generate OTP' });
    }
};
// OTP validation middleware
// const validateOTP = async (req, res, next) => {
//     const { otp } = req.body;
//     console.log(otp+"kk");

//     try {
//         // Find the OTP in the database
//         const storedOTP = await otpModel.findOne({ otp });

//         if (!storedOTP) {
//             return res.status(400).json({ error: 'Invalid OTP' });
//         }

//         // Check if OTP is expired
//         if (new Date() > storedOTP.expiry) {
//             return res.status(400).json({ error: 'OTP has expired' });
//         }

//         // OTP is valid
//         next(); // Move to the next middleware
//     } catch (err) {
//         console.error('Error validating OTP:', err);
//         return res.status(500).json({ error: 'Internal Server Error' });
//     }
// };

module.exports = { generateOtpPost ,};
