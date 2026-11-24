
const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/authorizeRoles');

const {
    getMyProfile,
    updateMyProfile,
    getAllMembers,
    getMemberById,
    updateMemberStatus
} = require('../controllers/memberController');

// View own profile
router.get('/me', authMiddleware, getMyProfile);

// Update own profile
router.put('/me', authMiddleware, updateMyProfile);

// Admin: View all members
router.get(
    '/',
    authMiddleware,
    authorizeRoles('ADMIN'),
    getAllMembers
);

// Admin: View member by ID
router.get(
    '/:id',
    authMiddleware,
    authorizeRoles('ADMIN'),
    getMemberById
);

// Admin: Update member status
router.patch(
    '/:id/status',
    authMiddleware,
    authorizeRoles('ADMIN'),
    updateMemberStatus
);

module.exports = router;
