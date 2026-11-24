
require('dotenv').config();

const { sendOTPEmail } = require('./src/services/emailService');

async function testEmail() {
    try {
        await sendOTPEmail(
            'jsrikarpreetham@gmail.com',
            '123456'
        );

        console.log('SUCCESS: Test email sent!');
    } catch (error) {
        console.error('EMAIL ERROR:', error.message);
    }
}

testEmail();
