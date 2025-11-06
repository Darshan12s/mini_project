const express = require('express');
const BloodInventory = require('../models/BloodInventory');

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

// Get blood inventory
router.get('/', authenticateToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const filter = { status: 'available' };
        if (req.query.bloodType) filter.bloodType = req.query.bloodType;
        if (req.query.location) filter.location = req.query.location;

        const inventory = await BloodInventory.find(filter)
            .populate('donor', 'donorId')
            .sort({ expirationDate: 1 })
            .skip(skip)
            .limit(limit);

        const total = await BloodInventory.countDocuments(filter);

        res.json({
            inventory,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Inventory fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
});

// Get inventory summary
router.get('/summary', authenticateToken, async (req, res) => {
    try {
        const summary = await BloodInventory.getInventorySummary();
        res.json({ summary });
    } catch (error) {
        console.error('Inventory summary error:', error);
        res.status(500).json({ error: 'Failed to fetch inventory summary' });
    }
});

// Get expiring blood
router.get('/expiring', authenticateToken, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const expiring = await BloodInventory.getExpiringBlood(days);
        res.json({ expiring });
    } catch (error) {
        console.error('Expiring blood fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch expiring blood' });
    }
});

// Add blood units to inventory
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { bloodType, units, donationDate, expiryDate, notes, location } = req.body;

        if (!bloodType || !units || !donationDate || !expiryDate) {
            return res.status(400).json({ error: 'Blood type, units, donation date, and expiry date are required' });
        }

        // Create multiple units if units > 1
        const bloodUnits = [];
        for (let i = 0; i < units; i++) {
            const serialNumber = `BB${Date.now()}${i}`;
            bloodUnits.push({
                serialNumber,
                bloodType,
                component: 'whole_blood',
                units: 1,
                location: location || 'main_bank',
                collectionDate: new Date(donationDate),
                expirationDate: new Date(expiryDate),
                status: 'available',
                notes
            });
        }

        const savedUnits = await BloodInventory.insertMany(bloodUnits);

        res.status(201).json({
            message: `${units} blood unit(s) added to inventory successfully`,
            units: savedUnits
        });

    } catch (error) {
        console.error('Add inventory error:', error);
        res.status(500).json({ error: 'Failed to add blood units to inventory' });
    }
});

module.exports = router;