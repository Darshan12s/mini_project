const express = require('express');

const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    const jwt = require('jsonwebtoken');
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Get reports data
router.get('/', authenticateToken, async (req, res) => {
    try {
        // Placeholder for reports data
        const reports = {
            totalDonors: 586,
            totalUnits: 1245,
            activeCampaigns: 5,
            pendingRequests: 24
        };

        res.json({ reports });
    } catch (error) {
        console.error('Reports fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

module.exports = router;