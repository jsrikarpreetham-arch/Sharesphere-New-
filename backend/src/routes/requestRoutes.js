
const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/authorizeRoles');

const {
    createRequest,
    getMyRequests,
    getRequestById,
    updateRequest,
    deleteRequest
} = require('../controllers/requestController');

// Recipient: Create a resource request
router.post(
    '/',
    authMiddleware,
    authorizeRoles('RECIPIENT'),
    createRequest
);
// Recipient: Get all my resource requests
router.get(
    '/my-requests',
    authMiddleware,
    authorizeRoles('RECIPIENT'),
    getMyRequests
);

// Recipient: Get a resource request by ID
router.get(
    '/:id',
    authMiddleware,
    authorizeRoles('RECIPIENT'),
    getRequestById
);

// Recipient: Update a resource request
router.put(
    '/:id',
    authMiddleware,
    authorizeRoles('RECIPIENT'),
    updateRequest
);

// Recipient: Delete a resource request
router.patch(
    '/:id/cancel',
    authMiddleware,
    authorizeRoles('RECIPIENT'),
    deleteRequest
);

// ============================================
// Get all resource requests of the logged-in recipient
// ============================================







module.exports = router;
