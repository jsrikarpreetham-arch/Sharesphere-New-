
const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/authorizeRoles');

const {
    createDonation,
    getAllDonations,
    getDonationById,
    updateDonation,
    cancelDonation
} = require('../controllers/donationController');
// View all donations
router.get(
    '/',
    authMiddleware,
    getAllDonations
);

// View a single donation by ID
router.get(
    '/:id',
    authMiddleware,
    getDonationById
);

// Donor: Update a donation
router.put(
    '/:id',
    authMiddleware,
    authorizeRoles('DONOR'),
    updateDonation
);

// Donor: Create a donation
router.post(
    '/',
    authMiddleware,
    authorizeRoles('DONOR'),
    createDonation
);

// Donor: Cancel a donation
router.patch(
    '/:id/cancel',
    authMiddleware,
    authorizeRoles('DONOR'),
    cancelDonation
);

module.exports = router;
