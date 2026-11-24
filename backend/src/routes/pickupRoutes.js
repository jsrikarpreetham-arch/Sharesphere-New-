
const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/authorizeRoles');

const {
    getAllPickupRecords,
    getMyAssignments,
    markAsPickedUp,
    markAsDelivered,
    reportDeliveryFailure

} = require('../controllers/pickupController');

// Admin: View all pickup and delivery records
router.get(
    '/',
    authMiddleware,
    authorizeRoles('ADMIN'),
    getAllPickupRecords
);

// Volunteer: View their own assigned allocations
router.get(
    '/my-assignments',
    authMiddleware,
    authorizeRoles('VOLUNTEER'),
    getMyAssignments
);

// Volunteer: Mark an allocation as picked up
router.patch(
    '/:id/pickup',
    authMiddleware,
    authorizeRoles('VOLUNTEER'),
    markAsPickedUp
);

// Volunteer: Mark an allocation as delivered
router.patch(
    '/:id/deliver',
    authMiddleware,
    authorizeRoles('VOLUNTEER'),
    markAsDelivered
);

// Volunteer: Report a delivery failure
router.patch(
    '/:id/failure',
    authMiddleware,
    authorizeRoles('VOLUNTEER'),
    reportDeliveryFailure
);

module.exports = router;
