
const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendOTPEmail } = require('../services/emailService');

// MEMBER REGISTRATION
exports.register = async (req, res) => {
    try {
        const { full_name, email, password, role, phone, area } = req.body;

        if (!full_name || !email || !password || !role || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must contain at least 8 characters'
            });
        }

        const allowedRoles = ['DONOR', 'RECIPIENT', 'VOLUNTEER'];

        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid registration role'
            });
        }

        const [existing] = await db.query(
            'SELECT member_id FROM Member WHERE email = ? OR phone = ?',
            [email, phone]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Email or phone number already registered'
            });
        }

        const password_hash = await bcrypt.hash(password, 12);

        const [result] = await db.query(
            `INSERT INTO Member
            (full_name, email, password_hash, role, phone, area)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [full_name, email, password_hash, role, phone, area || null]
        );

        res.status(201).json({
            success: true,
            message: 'Member registered successfully',
            member_id: result.insertId
        });

    } catch (error) {
        console.error('Registration error:', error);

        res.status(500).json({
            success: false,
            message: 'Registration failed'
        });
    }
};


// MEMBER LOGIN
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const [members] = await db.query(
            `SELECT member_id, full_name, email, password_hash, role
             FROM Member
             WHERE email = ? AND active = TRUE`,
            [email]
        );

        if (members.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const member = members[0];

        const validPassword = await bcrypt.compare(
            password,
            member.password_hash
        );

        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const token = jwt.sign(
            {
                member_id: member.member_id,
                role: member.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
            member: {
                member_id: member.member_id,
                full_name: member.full_name,
                email: member.email,
                role: member.role
            }
        });

    } catch (error) {
        console.error('Login error:', error);

        res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
};


const OTP_EXPIRY_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 5;

// FORGOT PASSWORD - SEND OTP
exports.forgotPassword = async (req, res) => {
    let connection;

    try {
        const { email } = req.body;

        if (!email || typeof email !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        const [members] = await connection.query(
            `SELECT member_id, email
             FROM Member
             WHERE email = ? AND active = TRUE`,
            [email.trim()]
        );

        // Do not reveal whether an account exists.
        if (members.length === 0) {
            await connection.commit();

            return res.json({
                success: true,
                message: 'If the account exists, a reset OTP will be sent.'
            });
        }

        const member = members[0];

        // Limit OTP requests to 3 per hour per account.
        const [recentRequests] = await connection.query(
            `SELECT COUNT(*) AS total
             FROM Password_Reset
             WHERE member_id = ?
             AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
            [member.member_id]
        );

        if (recentRequests[0].total >= 3) {
            await connection.commit();

            return res.json({
                success: true,
                message: 'If the account exists, a reset OTP will be sent.'
            });
        }

        // Invalidate previous unused OTPs.
        await connection.query(
            `UPDATE Password_Reset
             SET used_at = NOW()
             WHERE member_id = ?
             AND used_at IS NULL`,
            [member.member_id]
        );

        const otp = crypto.randomInt(100000, 1000000).toString();

        const otpHash = crypto
            .createHash('sha256')
            .update(otp)
            .digest('hex');

        await connection.query(
            `INSERT INTO Password_Reset
             (member_id, otp_hash, expires_at)
             VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))`,
            [member.member_id, otpHash]
        );

        await connection.commit();

        try {
            await sendOTPEmail(member.email, otp);
        } catch (emailError) {
            console.error('Password reset email error:', emailError);

            await db.query(
                `UPDATE Password_Reset
                 SET used_at = NOW()
                 WHERE member_id = ?
                 AND otp_hash = ?
                 AND used_at IS NULL`,
                [member.member_id, otpHash]
            );

            return res.status(503).json({
                success: false,
                message: 'Unable to send OTP. Please try again later.'
            });
        }

        return res.json({
            success: true,
            message: 'If the account exists, a reset OTP will be sent.'
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error('Forgot password error:', error);

        return res.status(500).json({
            success: false,
            message: 'Password reset request failed'
        });

    } finally {
        if (connection) connection.release();
    }
};


// RESET PASSWORD - VERIFY OTP AND UPDATE PASSWORD
exports.resetPassword = async (req, res) => {
    let connection;

    try {
        const { email, otp, new_password } = req.body;

        if (
            !email ||
            !/^\d{6}$/.test(String(otp || '')) ||
            typeof new_password !== 'string' ||
            new_password.length < 8
        ) {
            return res.status(400).json({
                success: false,
                message: 'Provide a valid email, six-digit OTP and password of at least 8 characters.'
            });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        const [members] = await connection.query(
            `SELECT member_id
             FROM Member
             WHERE email = ? AND active = TRUE`,
            [email.trim()]
        );

        if (members.length === 0) {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP'
            });
        }

        const memberId = members[0].member_id;

        const [records] = await connection.query(
            `SELECT reset_id, otp_hash, attempts,
                    (expires_at > NOW()) AS is_valid
             FROM Password_Reset
             WHERE member_id = ?
             AND used_at IS NULL
             ORDER BY reset_id DESC
             LIMIT 1
             FOR UPDATE`,
            [memberId]
        );

        if (records.length === 0) {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP'
            });
        }

        const reset = records[0];

        if (
            !reset.is_valid ||
            reset.attempts >= MAX_OTP_ATTEMPTS
        ) {
            await connection.query(
                `UPDATE Password_Reset
                 SET used_at = NOW()
                 WHERE reset_id = ?`,
                [reset.reset_id]
            );

            await connection.commit();

            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP'
            });
        }

        const submittedHash = crypto
            .createHash('sha256')
            .update(String(otp))
            .digest('hex');

        const validOTP = crypto.timingSafeEqual(
            Buffer.from(reset.otp_hash, 'hex'),
            Buffer.from(submittedHash, 'hex')
        );

        if (!validOTP) {
            await connection.query(
                `UPDATE Password_Reset
                 SET attempts = attempts + 1
                 WHERE reset_id = ?`,
                [reset.reset_id]
            );

            await connection.commit();

            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP'
            });
        }

        const passwordHash = await bcrypt.hash(new_password, 12);

        await connection.query(
            `UPDATE Member
             SET password_hash = ?
             WHERE member_id = ?`,
            [passwordHash, memberId]
        );

        // Invalidate all outstanding OTPs for this member.
        await connection.query(
            `UPDATE Password_Reset
             SET used_at = COALESCE(used_at, NOW())
             WHERE member_id = ?`,
            [memberId]
        );

        await connection.commit();

        return res.json({
            success: true,
            message: 'Password reset successfully. Please log in with your new password.'
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error('Reset password error:', error);

        return res.status(500).json({
            success: false,
            message: 'Password reset failed'
        });

    } finally {
        if (connection) connection.release();
    }
};
