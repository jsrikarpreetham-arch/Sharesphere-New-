
const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const {
    getAllCategories
} = require('../controllers/categoryController');

// Get all categories
router.get(
    '/',
    authMiddleware,
    getAllCategories
);

module.exports = router;
