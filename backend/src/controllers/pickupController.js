
const db = require('../config/db');

// Get all pickup and delivery records (Admin only)
const getAllPickupRecords = async (req, res) => {
    try {
        const [records] = await db.query(`
            SELECT
                p.pickup_id,
                p.allocation_id,
                p.picked_up_at,
                p.delivered_at,
                p.outcome,
                p.notes,

                a.donation_id,
                a.request_id,
                a.volunteer_id,
                a.allocated_quantity,
                a.status AS allocation_status,

                d.item_name AS donated_item,
                r.item_name AS requested_item,
                v.full_name AS volunteer_name

            FROM Pickup_Record p

            INNER JOIN Allocation a
                ON p.allocation_id = a.allocation_id

            LEFT JOIN Donation d
                ON a.donation_id = d.donation_id

            LEFT JOIN Resource_Request r
                ON a.request_id = r.request_id

            LEFT JOIN Member v
                ON a.volunteer_id = v.member_id

            ORDER BY p.pickup_id DESC
        `);

        return res.status(200).json({
            success: true,
            count: records.length,
            records
        });

    } catch (error) {
        console.error('Get Pickup Records Error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve pickup records'
        });
    }
};


// Get allocations assigned to the logged-in volunteer
const getMyAssignments = async (req, res) => {
    try {
        const volunteerId = req.user.member_id;

        const [assignments] = await db.query(`
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

            LEFT JOIN Pickup_Record p
                ON a.allocation_id = p.allocation_id

            WHERE a.volunteer_id = ?

            ORDER BY a.allocation_id DESC
        `, [volunteerId]);

        return res.status(200).json({
            success: true,
            count: assignments.length,
            assignments
        });

    } catch (error) {
        console.error('Get Volunteer Assignments Error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve volunteer assignments'
        });
    }
};


const markAsPickedUp = async (req, res) => {
    let connection;

    try {
        const allocationId = Number(req.params.id);
        const volunteerId = req.user.member_id;

        if (!Number.isInteger(allocationId) || allocationId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid allocation ID'
            });
        }

        connection = await db.getConnection();

        await connection.beginTransaction();

        // Find and lock the allocation
        const [allocations] = await connection.query(
            `SELECT allocation_id, volunteer_id, status
             FROM Allocation
             WHERE allocation_id = ?
             FOR UPDATE`,
            [allocationId]
        );

        if (allocations.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: 'Allocation not found'
            });
        }

        const allocation = allocations[0];

        // Check volunteer ownership
        if (Number(allocation.volunteer_id) !== Number(volunteerId)) {
            await connection.rollback();

            return res.status(403).json({
                success: false,
                message: 'You are not assigned to this allocation'
            });
        }

        // Only RESERVED allocations can be picked up
        if (allocation.status !== 'RESERVED') {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: `Cannot pick up an allocation with status ${allocation.status}`
            });
        }

        // Find the associated pickup record
        const [records] = await connection.query(
            `SELECT pickup_id, outcome
             FROM Pickup_Record
             WHERE allocation_id = ?
             FOR UPDATE`,
            [allocationId]
        );

        if (records.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: 'Pickup record not found'
            });
        }

        if (records[0].outcome !== 'PENDING') {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: 'Pickup record is not pending'
            });
        }

        // Update allocation status
        await connection.query(
            `UPDATE Allocation
             SET status = 'PICKED_UP'
             WHERE allocation_id = ?`,
            [allocationId]
        );

        // Record pickup time
        await connection.query(
            `UPDATE Pickup_Record
             SET picked_up_at = NOW()
             WHERE allocation_id = ?`,
            [allocationId]
        );

        await connection.commit();

        return res.status(200).json({
            success: true,
            message: 'Resources marked as picked up successfully',
            allocation_id: allocationId,
            status: 'PICKED_UP'
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error('Mark As Picked Up Error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Failed to update pickup status'
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
};


const markAsDelivered = async (req, res) => {
    let connection;

    try {
        const allocationId = Number(req.params.id);
        const volunteerId = req.user.member_id;
        const notes = req.body.notes || null;

        if (!Number.isInteger(allocationId) || allocationId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid allocation ID'
            });
        }

        if (notes !== null &&
            (typeof notes !== 'string' || notes.length > 255)) {
            return res.status(400).json({
                success: false,
                message: 'Notes must be text with a maximum of 255 characters'
            });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        // Find and lock allocation
        const [allocations] = await connection.query(
            `SELECT allocation_id, request_id, volunteer_id,
                    allocated_quantity, status
             FROM Allocation
             WHERE allocation_id = ?
             FOR UPDATE`,
            [allocationId]
        );

        if (allocations.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Allocation not found'
            });
        }

        const allocation = allocations[0];

        // Verify assigned volunteer
        if (Number(allocation.volunteer_id) !== Number(volunteerId)) {
            await connection.rollback();
            return res.status(403).json({
                success: false,
                message: 'You are not assigned to this allocation'
            });
        }

        // Delivery is allowed only after pickup
        if (allocation.status !== 'PICKED_UP') {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Resources must be picked up before delivery'
            });
        }

        // Lock pickup record
        const [records] = await connection.query(
            `SELECT pickup_id, outcome
             FROM Pickup_Record
             WHERE allocation_id = ?
             FOR UPDATE`,
            [allocationId]
        );

        if (records.length === 0 || records[0].outcome !== 'PENDING') {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Pickup record is missing or is no longer pending'
            });
        }

        // Lock resource request
        const [requests] = await connection.query(
            `SELECT request_id, requested_quantity,
                    fulfilled_quantity, status
             FROM Resource_Request
             WHERE request_id = ?
             FOR UPDATE`,
            [allocation.request_id]
        );

        if (requests.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Resource request not found'
            });
        }

        const request = requests[0];
        const quantity = Number(allocation.allocated_quantity);
        const fulfilled = Number(request.fulfilled_quantity);
        const requested = Number(request.requested_quantity);

        if (request.status === 'CANCELLED' ||
            fulfilled + quantity > requested) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'This request cannot accept the delivery quantity'
            });
        }

        // Update allocation
        await connection.query(
            `UPDATE Allocation
             SET status = 'DELIVERED'
             WHERE allocation_id = ?`,
            [allocationId]
        );

        // Update pickup record
        await connection.query(
            `UPDATE Pickup_Record
             SET delivered_at = NOW(),
                 outcome = 'DELIVERED',
                 notes = COALESCE(?, notes)
             WHERE allocation_id = ?`,
            [notes, allocationId]
        );
        
    // Update successfully fulfilled quantity and request status
await connection.query(
    `UPDATE Resource_Request
     SET status = CASE
         WHEN fulfilled_quantity + ? >= requested_quantity
         THEN 'FULFILLED'
         ELSE 'PARTIAL'
     END,
         fulfilled_quantity = fulfilled_quantity + ?
     WHERE request_id = ?`,
    [quantity, quantity, allocation.request_id]
);
        await connection.commit();

        return res.status(200).json({
            success: true,
            message: 'Resources delivered successfully',
            allocation_id: allocationId,
            delivered_quantity: quantity,
            status: 'DELIVERED'
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error('Mark As Delivered Error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Failed to update delivery status'
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
};


const reportDeliveryFailure = async (req, res) => {
    let connection;

    try {
        const allocationId = Number(req.params.id);
        const volunteerId = req.user.member_id;
        const notes = req.body?.notes;

        // Validate allocation ID
        if (!Number.isInteger(allocationId) || allocationId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid allocation ID'
            });
        }

        // Failure reason is required
        if (
            typeof notes !== 'string' ||
            notes.trim().length === 0 ||
            notes.trim().length > 255
        ) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a failure reason (maximum 255 characters)'
            });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        // Lock allocation
        const [allocations] = await connection.query(
            `SELECT allocation_id, volunteer_id, status
             FROM Allocation
             WHERE allocation_id = ?
             FOR UPDATE`,
            [allocationId]
        );

        if (allocations.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: 'Allocation not found'
            });
        }

        const allocation = allocations[0];

        // Verify volunteer ownership
        if (Number(allocation.volunteer_id) !== Number(volunteerId)) {
            await connection.rollback();

            return res.status(403).json({
                success: false,
                message: 'You are not assigned to this allocation'
            });
        }

        // Failure can only be reported after pickup
        if (allocation.status !== 'PICKED_UP') {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: 'Only picked-up allocations can be reported as failed'
            });
        }

        // Lock pickup record
        const [records] = await connection.query(
            `SELECT pickup_id, outcome
             FROM Pickup_Record
             WHERE allocation_id = ?
             FOR UPDATE`,
            [allocationId]
        );

        if (records.length === 0 || records[0].outcome !== 'PENDING') {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: 'Pickup record is missing or is no longer pending'
            });
        }

        // Update allocation status
        await connection.query(
            `UPDATE Allocation
             SET status = 'FAILED'
             WHERE allocation_id = ?`,
            [allocationId]
        );

        // Record failed delivery
        await connection.query(
            `UPDATE Pickup_Record
             SET outcome = 'FAILED',
                 notes = ?
             WHERE allocation_id = ?`,
            [notes.trim(), allocationId]
        );

        await connection.commit();

        return res.status(200).json({
            success: true,
            message: 'Delivery failure reported successfully',
            allocation_id: allocationId,
            status: 'FAILED'
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error('Report Delivery Failure Error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Failed to report delivery failure'
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
};


module.exports = {
    getAllPickupRecords,
    getMyAssignments,
    markAsPickedUp,
    markAsDelivered,
    reportDeliveryFailure
};
