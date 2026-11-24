
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

exports.sendOTPEmail = async (email, otp) => {
    await transporter.sendMail({
        from: `"ShareSphere" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'ShareSphere - Password Reset OTP',
        text: `Your ShareSphere password reset OTP is ${otp}.

This OTP expires in 5 minutes.

If you did not request a password reset, please ignore this email.

Do not share this OTP with anyone.`,
        html: `
            <div style="font-family:Arial,sans-serif;padding:20px">
                <h2>ShareSphere Password Reset</h2>
                <p>Your password reset OTP is:</p>
                <h1 style="letter-spacing:8px">${otp}</h1>
                <p>This OTP expires in 5 minutes.</p>
                <p>If you did not request this, please ignore this email.</p>
            </div>
        `
    });
};
