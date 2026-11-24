
const db = require('../config/db');

// Get all categories
exports.getAllCategories = async (req, res) => {
    try {
        const [categories] = await db.query(
            `SELECT
                category_id,
                category_name,
                description
             FROM Category
             ORDER BY category_name ASC`
        );

        return res.status(200).json({
            success: true,
            count: categories.length,
            categories
        });

    } catch (error) {
        console.error('Get categories error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve categories'
        });
    }
};
