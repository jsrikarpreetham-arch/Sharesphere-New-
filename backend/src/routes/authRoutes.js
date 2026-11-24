
const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/authorizeRoles');

const {
    register,
    login,
    forgotPassword,
    resetPassword
} = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Authentication test
router.get('/protected-test', authMiddleware, (req, res) => {
    res.json({
        success: true,
        message: 'Authentication verified successfully!',
        user: req.user
    });
});

// RBAC test - DONOR only
router.get(
    '/donor-test',
    authMiddleware,
    authorizeRoles('DONOR'),
    (req, res) => {
        res.json({
            success: true,
            message: 'DONOR access granted!'
        });
    }
);

module.exports = router;
