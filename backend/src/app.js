
const path = require('path');

// Load environment variables FIRST
require('dotenv').config({
    path: path.resolve(__dirname, '../.env')
});

const express = require('express');
const cors = require('cors');

const db = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const memberRoutes = require('./routes/memberRoutes');
const donationRoutes = require('./routes/donationRoutes');
const requestRoutes = require('./routes/requestRoutes');
const allocationRoutes = require('./routes/allocationRoutes');
const pickupRoutes = require('./routes/pickupRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const app = express();

app.use(cors());
app.use(express.json());


// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/allocations', allocationRoutes);
app.use('/api/pickups', pickupRoutes);
app.use('/api/categories', categoryRoutes);
// Home route
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to ShareSphere Backend API'
    });
});

// Test MySQL database connection
app.get('/api/test-db', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT DATABASE() AS database_name'
        );

        res.json({
            success: true,
            message: 'MySQL Database Connected Successfully!',
            database: rows[0].database_name
        });

    } catch (error) {
        console.error('Database Error:', error.message);

        res.status(500).json({
            success: false,
            message: 'Database connection failed',
            error: error.message
        });
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`ShareSphere Backend running on port ${PORT}`);
});
