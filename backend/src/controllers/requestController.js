
const db = require('../config/db');

// ============================================
// Create a new resource request
// ============================================

exports.createRequest = async (req, res) => {
    try {
        const {
            category_id,
            item_name,
            requested_quantity,
            unit,
            priority
        } = req.body;

        // 1. Validate required fields
        if (
            category_id === undefined ||
            !item_name ||
            requested_quantity === undefined ||
            !unit
        ) {
            return res.status(400).json({
                success: false,
                message: 'Category, item name, requested quantity and unit are required'
            });
        }

        // 2. Validate category ID
        if (
            !Number.isInteger(Number(category_id)) ||
            Number(category_id) <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category ID'
            });
        }

        // 3. Validate item name
        if (
            typeof item_name !== 'string' ||
            !item_name.trim() ||
            item_name.trim().length > 100
        ) {
            return res.status(400).json({
                success: false,
                message: 'Item name must be between 1 and 100 characters'
            });
        }

        // 4. Validate requested quantity
        if (
            !Number.isFinite(Number(requested_quantity)) ||
            Number(requested_quantity) <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'Requested quantity must be greater than zero'
            });
        }

        // 5. Validate unit
        if (
            typeof unit !== 'string' ||
            !unit.trim() ||
            unit.trim().length > 20
        ) {
            return res.status(400).json({
                success: false,
                message: 'Unit must be between 1 and 20 characters'
            });
        }

        // 6. Validate priority (default = 3)
        const requestPriority = priority === undefined ? 3 : Number(priority);

        if (
            !Number.isInteger(requestPriority) ||
            requestPriority < 1 ||
            requestPriority > 5
        ) {
            return res.status(400).json({
                success: false,
                message: 'Priority must be between 1 and 5'
            });
        }

        // 7. Check whether category exists
        const [categories] = await db.query(
            `SELECT category_id
             FROM Category
             WHERE category_id = ?`,
            [Number(category_id)]
        );

        if (categories.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Category does not exist'
            });
        }

        // 8. Insert resource request
        const [result] = await db.query(
            `INSERT INTO Resource_Request
            (
                requester_id,
                category_id,
                item_name,
                requested_quantity,
                fulfilled_quantity,
                unit,
                priority,
                status
            )
            VALUES (?, ?, ?, ?, 0, ?, ?, 'OPEN')`,
            [
                req.user.member_id,
                Number(category_id),
                item_name.trim(),
                Number(requested_quantity),
                unit.trim(),
                requestPriority
            ]
        );

        // 9. Send successful response
        return res.status(201).json({
            success: true,
            message: 'Resource request created successfully',
            request_id: result.insertId
        });

    } catch (error) {
        console.error('Create resource request error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to create resource request'
        });
    }
};


// ============================================
// Get all resource requests of the logged-in recipient
// ============================================

exports.getMyRequests = async (req, res) => {
    try {
        const requesterId = req.user.member_id;

        const [requests] = await db.query(
            `SELECT *
             FROM Resource_Request
             WHERE requester_id = ?
             ORDER BY created_at DESC`,
            [requesterId]
        );

        return res.status(200).json({
            success: true,
            count: requests.length,
            requests: requests
        });

    } catch (error) {
        console.error('Get my resource requests error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to fetch resource requests'
        });
    }
};


// ============================================
// Get a resource request by ID
// ============================================

exports.getRequestById = async (req, res) => {
    try {
        const requestId = Number(req.params.id);
        const requesterId = req.user.member_id;

        // Validate request ID
        if (!Number.isInteger(requestId) || requestId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid request ID'
            });
        }

        // Find request belonging to the logged-in recipient
        const [requests] = await db.query(
            `SELECT *
             FROM Resource_Request
             WHERE request_id = ?
             AND requester_id = ?`,
            [requestId, requesterId]
        );

        if (requests.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Resource request not found'
            });
        }

        return res.status(200).json({
            success: true,
            request: requests[0]
        });

    } catch (error) {
        console.error('Get resource request by ID error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to fetch resource request'
        });
    }
};


 // ============================================
// Update a resource request
// ============================================

exports.updateRequest = async (req, res) => {
    try {
        const requestId = Number(req.params.id);
        const requesterId = req.user.member_id;

        const {
            category_id,
            item_name,
            requested_quantity,
            unit,
            priority
        } = req.body;

        // 1. Validate request ID
        if (!Number.isInteger(requestId) || requestId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid request ID'
            });
        }

        // 2. Check whether the request belongs to this recipient
        const [existingRequests] = await db.query(
            `SELECT *
             FROM Resource_Request
             WHERE request_id = ? AND requester_id = ?`,
            [requestId, requesterId]
        );

        if (existingRequests.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Resource request not found'
            });
        }

        const existing = existingRequests[0];

        // 3. Prevent updates to cancelled or fulfilled requests
        if (['CANCELLED', 'FULFILLED'].includes(existing.status)) {
            return res.status(400).json({
                success: false,
                message: 'Cancelled or fulfilled requests cannot be updated'
            });
        }

        // 4. Use existing values when fields are not supplied
        const newCategoryId = category_id === undefined
            ? existing.category_id
            : Number(category_id);

        const newItemName = item_name === undefined
            ? existing.item_name
            : item_name;

        const newQuantity = requested_quantity === undefined
            ? Number(existing.requested_quantity)
            : Number(requested_quantity);

        const newUnit = unit === undefined
            ? existing.unit
            : unit;

        const newPriority = priority === undefined
            ? Number(existing.priority)
            : Number(priority);

        // 5. Validate category ID
        if (!Number.isInteger(newCategoryId) || newCategoryId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category ID'
            });
        }

        // 6. Validate item name
        if (
            typeof newItemName !== 'string' ||
            !newItemName.trim() ||
            newItemName.trim().length > 100
        ) {
            return res.status(400).json({
                success: false,
                message: 'Item name must be between 1 and 100 characters'
            });
        }

        // 7. Validate quantity
        if (!Number.isFinite(newQuantity) || newQuantity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Requested quantity must be greater than zero'
            });
        }

        // 8. Validate unit
        if (
            typeof newUnit !== 'string' ||
            !newUnit.trim() ||
            newUnit.trim().length > 20
        ) {
            return res.status(400).json({
                success: false,
                message: 'Unit must be between 1 and 20 characters'
            });
        }

        // 9. Validate priority
        if (!Number.isInteger(newPriority) || newPriority < 1 || newPriority > 5) {
            return res.status(400).json({
                success: false,
                message: 'Priority must be between 1 and 5'
            });
        }

        // 10. Check category exists
        const [categories] = await db.query(
            `SELECT category_id
             FROM Category
             WHERE category_id = ?`,
            [newCategoryId]
        );

        if (categories.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Category does not exist'
            });
        }

        // 11. Do not reduce requested quantity below fulfilled quantity
        if (newQuantity < Number(existing.fulfilled_quantity)) {
            return res.status(400).json({
                success: false,
                message: 'Requested quantity cannot be less than fulfilled quantity'
            });
        }

        // 12. Update request
        await db.query(
            `UPDATE Resource_Request
             SET category_id = ?,
                 item_name = ?,
                 requested_quantity = ?,
                 unit = ?,
                 priority = ?
             WHERE request_id = ? AND requester_id = ?`,
            [
                newCategoryId,
                newItemName.trim(),
                newQuantity,
                newUnit.trim(),
                newPriority,
                requestId,
                requesterId
            ]
        );

        return res.status(200).json({
            success: true,
            message: 'Resource request updated successfully'
        });

    } catch (error) {
        console.error('Update resource request error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to update resource request'
        });
    }
};


 // ============================================
// Delete (Cancel) a resource request
// ============================================

exports.deleteRequest = async (req, res) => {
    try {
        const requestId = Number(req.params.id);
        const requesterId = req.user.member_id;

        // 1. Validate request ID
        if (!Number.isInteger(requestId) || requestId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid request ID'
            });
        }

        // 2. Check whether request belongs to logged-in recipient
        const [requests] = await db.query(
            `SELECT request_id, status
             FROM Resource_Request
             WHERE request_id = ? AND requester_id = ?`,
            [requestId, requesterId]
        );

        if (requests.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Resource request not found'
            });
        }

        const request = requests[0];

        // 3. Check request status
        if (request.status === 'CANCELLED') {
            return res.status(400).json({
                success: false,
                message: 'Resource request is already cancelled'
            });
        }

        if (request.status === 'FULFILLED') {
            return res.status(400).json({
                success: false,
                message: 'Fulfilled requests cannot be cancelled'
            });
        }

        // 4. Cancel the request instead of permanently deleting it
        await db.query(
            `UPDATE Resource_Request
             SET status = 'CANCELLED'
             WHERE request_id = ? AND requester_id = ?`,
            [requestId, requesterId]
        );

        return res.status(200).json({
            success: true,
            message: 'Resource request cancelled successfully'
        });

    } catch (error) {
        console.error('Delete resource request error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to cancel resource request'
        });
    }
};
