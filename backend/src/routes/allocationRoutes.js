
const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/authorizeRoles');

const {
    getAllAllocations,
    getAllocationById,
    createAllocation
} = require('../controllers/allocationController');

// Admin: Get all allocations
router.get(
    '/',
    authMiddleware,
    authorizeRoles('ADMIN'),
    getAllAllocations
);

// Admin: Create a new allocation
router.post(
    '/',
    authMiddleware,
    authorizeRoles('ADMIN'),
    createAllocation
);

// Admin: Get allocation by ID
router.get(
    '/:id',
    authMiddleware,
    authorizeRoles('ADMIN'),
    getAllocationById
);


module.exports = router;
