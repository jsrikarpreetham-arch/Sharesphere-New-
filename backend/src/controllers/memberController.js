
const db = require('../config/db');

// GET OWN PROFILE
exports.getMyProfile = async (req, res) => {
    try {
        const [members] = await db.query(
            `SELECT member_id, full_name, email, role,
                    phone, area, active, created_at
             FROM Member
             WHERE member_id = ?`,
            [req.user.member_id]
        );

        if (members.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Member not found'
            });
        }

        res.json({
            success: true,
            member: members[0]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile'
        });
    }
};


// UPDATE OWN PROFILE
exports.updateMyProfile = async (req, res) => {
    try {
        const { full_name, email, phone, area } = req.body;

        if (!full_name || !email || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Name, email and phone are required'
            });
        }

        const [existing] = await db.query(
            `SELECT member_id FROM Member
             WHERE (email = ? OR phone = ?)
             AND member_id != ?`,
            [email, phone, req.user.member_id]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Email or phone already in use'
            });
        }

        await db.query(
            `UPDATE Member
             SET full_name = ?, email = ?, phone = ?, area = ?
             WHERE member_id = ?`,
            [
                full_name,
                email,
                phone,
                area || null,
                req.user.member_id
            ]
        );

        res.json({
            success: true,
            message: 'Profile updated successfully'
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
};


// GET ALL MEMBERS (ADMIN)
exports.getAllMembers = async (req, res) => {
    try {
        const [members] = await db.query(
            `SELECT member_id, full_name, email, role,
                    phone, area, active, created_at
             FROM Member
             ORDER BY member_id DESC`
        );

        res.json({
            success: true,
            count: members.length,
            members
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch members'
        });
    }
};


// GET MEMBER BY ID (ADMIN)
exports.getMemberById = async (req, res) => {
    try {
        const [members] = await db.query(
            `SELECT member_id, full_name, email, role,
                    phone, area, active, created_at
             FROM Member
             WHERE member_id = ?`,
            [req.params.id]
        );

        if (members.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Member not found'
            });
        }

        res.json({
            success: true,
            member: members[0]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch member'
        });
    }
};


// ACTIVATE / DEACTIVATE MEMBER (ADMIN)
exports.updateMemberStatus = async (req, res) => {
    try {
        const { active } = req.body;

        if (typeof active !== 'boolean' && active !== 0 && active !== 1) {
            return res.status(400).json({
                success: false,
                message: 'Active must be true or false'
            });
        }

        const [result] = await db.query(
            `UPDATE Member
             SET active = ?
             WHERE member_id = ?`,
            [Number(active), req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Member not found'
            });
        }

        res.json({
            success: true,
            message: 'Member status updated successfully'
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Failed to update member status'
        });
    }
};
