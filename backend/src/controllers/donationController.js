
const db = require('../config/db');

// Create a new donation
exports.createDonation = async (req, res) => {
    try {
        const {
            category_id,
            item_name,
            quantity,
            unit,
            expiry_at
        } = req.body;

        // Validate required fields
        if (
            !category_id ||
            !item_name ||
            quantity === undefined ||
            !unit
        ) {
            return res.status(400).json({
                success: false,
                message: 'Category, item name, quantity and unit are required'
            });
        }

        // Validate quantity
        if (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be greater than zero'
            });
        }

        if (
            !Number.isInteger(Number(category_id)) ||
            Number(category_id) <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category ID'
            });
        }

        // Validate item and unit
        if (
            typeof item_name !== 'string' ||
            !item_name.trim() ||
            item_name.trim().length > 100 ||
            typeof unit !== 'string' ||
            !unit.trim() ||
            unit.trim().length > 20
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid item name or unit'
            });
        }

        // Check whether category exists
        const [categories] = await db.query(
            'SELECT category_id FROM Category WHERE category_id = ?',
            [category_id]
        );

        if (categories.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Category does not exist'
            });
        }

        // Insert donation
        const [result] = await db.query(
            `INSERT INTO Donation
            (donor_id, category_id, item_name, quantity,
             available_quantity, unit, expiry_at, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'AVAILABLE')`,
            [
                req.user.member_id,
                category_id,
                item_name.trim(),
                quantity,
                quantity,
                unit.trim(),
                expiry_at || null
            ]
        );

        return res.status(201).json({
            success: true,
            message: 'Donation created successfully',
            donation_id: result.insertId
        });

    } catch (error) {
        console.error('Create donation error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to create donation'
        });
    }
};

// Get all donations
exports.getAllDonations = async (req, res) => {
    try {
        const [donations] = await db.query(
            `SELECT
                d.donation_id,
                d.donor_id,
                m.full_name AS donor_name,
                d.category_id,
                c.category_name,
                d.item_name,
                d.quantity,
                d.available_quantity,
                d.unit,
                d.created_at,
                d.expiry_at,
                d.status
            FROM Donation d
            JOIN Member m ON d.donor_id = m.member_id
            JOIN Category c ON d.category_id = c.category_id
            ORDER BY d.created_at DESC`
        );

        return res.status(200).json({
            success: true,
            count: donations.length,
            donations
        });

    } catch (error) {
        console.error('Get donations error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve donations'
        });
    }
};

// Get a single donation by ID
exports.getDonationById = async (req, res) => {
    try {
        const donationId = Number(req.params.id);

        if (!Number.isInteger(donationId) || donationId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid donation ID'
            });
        }

        const [donations] = await db.query(
            `SELECT
                d.donation_id,
                d.donor_id,
                m.full_name AS donor_name,
                d.category_id,
                c.category_name,
                d.item_name,
                d.quantity,
                d.available_quantity,
                d.unit,
                d.created_at,
                d.expiry_at,
                d.status
            FROM Donation d
            JOIN Member m ON d.donor_id = m.member_id
            JOIN Category c ON d.category_id = c.category_id
            WHERE d.donation_id = ?`,
            [donationId]
        );

        if (donations.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Donation not found'
            });
        }

        return res.status(200).json({
            success: true,
            donation: donations[0]
        });

    } catch (error) {
        console.error('Get donation error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve donation'
        });
    }
};

exports.updateDonation = async (req, res) => {
    try {
        const donationId = Number(req.params.id);

        const {
            item_name,
            quantity,
            unit,
            expiry_at
        } = req.body;

        if (!Number.isInteger(donationId) || donationId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid donation ID'
            });
        }

        if (
            !item_name ||
            !Number.isFinite(Number(quantity)) ||
            Number(quantity) <= 0 ||
            !unit
        ) {
            return res.status(400).json({
                success: false,
                message: 'Valid item name, quantity and unit are required'
            });
        }

        const [donations] = await db.query(
            `SELECT * FROM Donation
             WHERE donation_id = ?`,
            [donationId]
        );

        if (donations.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Donation not found'
            });
        }

        const donation = donations[0];

        if (donation.donor_id !== req.user.member_id) {
            return res.status(403).json({
                success: false,
                message: 'You can only update your own donations'
            });
        }

        if (
            !['AVAILABLE', 'PARTIAL'].includes(donation.status) ||
            Number(donation.available_quantity) !== Number(donation.quantity)
        ) {
            return res.status(400).json({
                success: false,
                message: 'This donation cannot be updated after allocation or closure'
            });
        }

        const [result] = await db.query(
            `UPDATE Donation
             SET item_name = ?,
                 quantity = ?,
                 available_quantity = ?,
                 unit = ?,
                 expiry_at = ?
             WHERE donation_id = ? AND donor_id = ?`,
            [
                item_name.trim(),
                quantity,
                quantity,
                unit.trim(),
                expiry_at || null,
                donationId,
                req.user.member_id
            ]
        );

        return res.json({
            success: true,
            message: 'Donation updated successfully'
        });

    } catch (error) {
        console.error('Update donation error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to update donation'
        });
    }
};

// Cancel an existing donation
exports.cancelDonation = async (req, res) => {
    try {
        const donationId = Number(req.params.id);

        if (!Number.isInteger(donationId) || donationId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid donation ID'
            });
        }

        // Find the donation
        const [donations] = await db.query(
            `SELECT * FROM Donation
             WHERE donation_id = ?`,
            [donationId]
        );

        if (donations.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Donation not found'
            });
        }

        const donation = donations[0];

        // Check donation ownership
        if (Number(donation.donor_id) !== Number(req.user.member_id)) {
            return res.status(403).json({
                success: false,
                message: 'You can only cancel your own donations'
            });
        }

        // Only available donations can be cancelled
        if (donation.status !== 'AVAILABLE') {
            return res.status(400).json({
                success: false,
                message: 'Only available donations can be cancelled'
            });
        }

        // Check whether an allocation exists
        const [allocations] = await db.query(
            `SELECT allocation_id
             FROM Allocation
             WHERE donation_id = ?
             LIMIT 1`,
            [donationId]
        );

        if (allocations.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel a donation that has an allocation'
            });
        }

        // Cancel donation
        await db.query(
            `UPDATE Donation
             SET status = 'CANCELLED'
             WHERE donation_id = ? AND donor_id = ?`,
            [donationId, req.user.member_id]
        );

        return res.json({
            success: true,
            message: 'Donation cancelled successfully'
        });

    } catch (error) {
        console.error('Cancel donation error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to cancel donation'
        });
    }
};
