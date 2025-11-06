const express = require('express');
const BloodInventory = require('../models/BloodInventory');
const Donor = require('../models/Donor');
const Request = require('../models/Request');
const Campaign = require('../models/Campaign');

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

// Get dashboard statistics
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        // Mock data for demo
        const mockStats = {
            totalBloodUnits: 1245,
            activeDonors: 586,
            pendingRequests: 24,
            activeCampaigns: 5,
            bloodTypeBreakdown: [
                { _id: 'A+', count: 175, totalUnits: 175 },
                { _id: 'O+', count: 198, totalUnits: 198 },
                { _id: 'B+', count: 132, totalUnits: 132 },
                { _id: 'AB+', count: 78, totalUnits: 78 },
                { _id: 'A-', count: 45, totalUnits: 45 },
                { _id: 'O-', count: 38, totalUnits: 38 },
                { _id: 'B-', count: 22, totalUnits: 22 },
                { _id: 'AB-', count: 15, totalUnits: 15 }
            ]
        };

        // Try to get real data if MongoDB is connected
        try {
            const bloodStats = await BloodInventory.aggregate([
                { $match: { status: 'available' } },
                {
                    $group: {
                        _id: '$bloodType',
                        count: { $sum: 1 },
                        totalUnits: { $sum: '$units' }
                    }
                }
            ]);

            if (bloodStats.length > 0) {
                mockStats.totalBloodUnits = bloodStats.reduce((sum, stat) => sum + stat.totalUnits, 0);
                mockStats.bloodTypeBreakdown = bloodStats;
            }

            const activeDonors = await Donor.countDocuments({ eligibilityStatus: 'eligible' });
            if (activeDonors > 0) mockStats.activeDonors = activeDonors;

            const pendingRequests = await Request.countDocuments({
                status: { $in: ['pending', 'approved', 'partially_fulfilled'] }
            });
            if (pendingRequests > 0) mockStats.pendingRequests = pendingRequests;

            const activeCampaigns = await Campaign.countDocuments({
                status: 'active',
                endDate: { $gte: new Date() }
            });
            if (activeCampaigns > 0) mockStats.activeCampaigns = activeCampaigns;

        } catch (dbError) {
            // Use mock data if database is not available
            console.log('Using mock data for dashboard stats');
        }

        res.json(mockStats);

    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
});

// Get recent activity
router.get('/activity', authenticateToken, async (req, res) => {
    try {
        const activities = [];

        // Recent donations (from BloodInventory)
        const recentDonations = await BloodInventory.find({})
            .populate('donor', 'donorId')
            .sort({ createdAt: -1 })
            .limit(5);

        recentDonations.forEach(donation => {
            activities.push({
                type: 'donation',
                message: `New ${donation.bloodType} blood donation received`,
                time: donation.createdAt,
                icon: 'tint',
                color: 'success'
            });
        });

        // Recent requests
        const recentRequests = await Request.find({})
            .populate('requester', 'firstName lastName')
            .sort({ createdAt: -1 })
            .limit(3);

        recentRequests.forEach(request => {
            activities.push({
                type: 'request',
                message: `Blood request from ${request.institution.name}`,
                time: request.createdAt,
                icon: 'hand-holding-heart',
                color: 'warning'
            });
        });

        // Sort activities by time
        activities.sort((a, b) => new Date(b.time) - new Date(a.time));

        res.json({ activities: activities.slice(0, 10) });

    } catch (error) {
        console.error('Recent activity error:', error);
        res.status(500).json({ error: 'Failed to fetch recent activity' });
    }
});

// Get blood type distribution for charts
router.get('/blood-distribution', authenticateToken, async (req, res) => {
    try {
        const distribution = await BloodInventory.aggregate([
            { $match: { status: 'available' } },
            {
                $group: {
                    _id: '$bloodType',
                    units: { $sum: '$units' }
                }
            },
            { $sort: { units: -1 } }
        ]);

        res.json({ distribution });

    } catch (error) {
        console.error('Blood distribution error:', error);
        res.status(500).json({ error: 'Failed to fetch blood distribution' });
    }
});

// Get monthly donation trends
router.get('/donation-trends', authenticateToken, async (req, res) => {
    try {
        const months = parseInt(req.query.months) || 6;
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);

        const trends = await BloodInventory.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate },
                    status: 'available'
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    units: { $sum: '$units' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        res.json({ trends });

    } catch (error) {
        console.error('Donation trends error:', error);
        res.status(500).json({ error: 'Failed to fetch donation trends' });
    }
});

module.exports = router;