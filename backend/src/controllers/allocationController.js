
const db = require('../config/db');

// Get all allocation records
const getAllAllocations = async (req, res) => {
    try {
        const [allocations] = await db.query(`
            SELECT
                a.allocation_id,
                a.donation_id,
                a.request_id,
                a.volunteer_id,
                a.allocated_quantity,
                a.allocated_at,
                a.status AS allocation_status,

                d.item_name AS donated_item,

                r.item_name AS requested_item,

                v.full_name AS volunteer_name,

                p.pickup_id,
                p.picked_up_at,
                p.delivered_at,
                p.outcome AS pickup_outcome,
                p.notes

            FROM Allocation a

            LEFT JOIN Donation d
                ON a.donation_id = d.donation_id

            LEFT JOIN Resource_Request r
                ON a.request_id = r.request_id

            LEFT JOIN Member v
                ON a.volunteer_id = v.member_id

            LEFT JOIN Pickup_Record p
                ON a.allocation_id = p.allocation_id

            ORDER BY a.allocation_id DESC
        `);

        return res.status(200).json({
            success: true,
            count: allocations.length,
            allocations
        });

    } catch (error) {
        console.error('Get Allocations Error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve allocations'
        });
    }
};

// Get a single allocation by ID
const getAllocationById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid allocation ID'
            });
        }

        const [allocations] = await db.query(`
            SELECT
                a.allocation_id,
                a.donation_id,
                a.request_id,
                a.volunteer_id,
                a.allocated_quantity,
                a.allocated_at,
                a.status AS allocation_status,

                d.item_name AS donated_item,

                r.item_name AS requested_item,

                v.full_name AS volunteer_name,

                p.pickup_id,
                p.picked_up_at,
                p.delivered_at,
                p.outcome AS pickup_outcome,
                p.notes

            FROM Allocation a

            LEFT JOIN Donation d
                ON a.donation_id = d.donation_id

            LEFT JOIN Resource_Request r
                ON a.request_id = r.request_id

            LEFT JOIN Member v
                ON a.volunteer_id = v.member_id

            LEFT JOIN Pickup_Record p
                ON a.allocation_id = p.allocation_id

            WHERE a.allocation_id = ?
        `, [id]);

        if (allocations.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Allocation not found'
            });
        }

        return res.status(200).json({
            success: true,
            allocation: allocations[0]
        });

    } catch (error) {
        console.error('Get Allocation Error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve allocation'
        });
    }
};


// Create a new allocation
const createAllocation = async (req, res) => {
    try {
        const {
            donation_id,
            request_id,
            volunteer_id,
            allocated_quantity
        } = req.body;

        // Validate required fields
        if (
            !donation_id ||
            !request_id ||
            !volunteer_id ||
            allocated_quantity === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: 'All allocation fields are required'
            });
        }

        // Validate IDs
        if (
            !Number.isInteger(Number(donation_id)) ||
            Number(donation_id) <= 0 ||
            !Number.isInteger(Number(request_id)) ||
            Number(request_id) <= 0 ||
            !Number.isInteger(Number(volunteer_id)) ||
            Number(volunteer_id) <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'Donation, request and volunteer IDs must be positive integers'
            });
        }

        // Validate quantity
        const quantity = Number(allocated_quantity);

        if (!Number.isFinite(quantity) || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Allocated quantity must be greater than zero'
            });
        }

        // Call existing MySQL stored procedure
        const [result] = await db.query(
            'CALL Allocate_Resource(?, ?, ?, ?)',
            [
                Number(donation_id),
                Number(request_id),
                Number(volunteer_id),
                quantity
            ]
        );

        const allocationResult = result[0]?.[0];

        return res.status(201).json({
            success: true,
            message: 'Resource allocated successfully',
            allocation: {
                allocation_id: allocationResult?.Allocation_ID,
                allocated_quantity: allocationResult?.Allocated_Quantity,
                status: 'RESERVED'
            }
        });

    } catch (error) {
        console.error('Create Allocation Error:', error.message);

        if (error.sqlState === '45000') {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to create allocation'
        });
    }
};

module.exports = {
    getAllAllocations,
    getAllocationById,
    createAllocation
};
