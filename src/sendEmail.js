require('dotenv').config();
const nodemailer = require('nodemailer');

// Function to send an email immediately
async function sendEmail(from, to, subject, text, html) {
    const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        },
    });

    const mailOptions = {
        from: from,
        to: to, // list of receivers
        subject: subject, // Subject line
        text: text, // plain text body
        html: html
    };
    // Send the email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('❌ Error:', error.message);
        } else {
            console.log('✅ Email sent:', info.response);
        }
    });
}

module.exports = { sendEmail };