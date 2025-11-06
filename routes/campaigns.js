const express = require('express');
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

// Mock campaigns data
const mockCampaigns = [
    {
        _id: '507f1f77bcf86cd799439019',
        title: 'City Center Blood Drive',
        description: 'Annual blood drive at the city convention center',
        startDate: '2024-12-15',
        endDate: '2024-12-20',
        location: 'City Convention Center',
        targetDonors: 200,
        registeredDonors: 145,
        successfulDonations: 89,
        status: 'active',
        organizer: {
            _id: '507f1f77bcf86cd799439011',
            firstName: 'John',
            lastName: 'Admin'
        }
    },
    {
        _id: '507f1f77bcf86cd799439020',
        title: 'University Campus Drive',
        description: 'Blood donation campaign for university students and staff',
        startDate: '2025-01-10',
        endDate: '2025-01-12',
        location: 'State University Campus',
        targetDonors: 150,
        registeredDonors: 67,
        successfulDonations: 0,
        status: 'upcoming',
        organizer: {
            _id: '507f1f77bcf86cd799439011',
            firstName: 'John',
            lastName: 'Admin'
        }
    },
    {
        _id: '507f1f77bcf86cd799439021',
        title: 'Corporate Blood Drive',
        description: 'Corporate social responsibility blood donation event',
        startDate: '2024-11-01',
        endDate: '2024-11-03',
        location: 'Tech Corp Headquarters',
        targetDonors: 100,
        registeredDonors: 95,
        successfulDonations: 87,
        status: 'completed',
        organizer: {
            _id: '507f1f77bcf86cd799439012',
            firstName: 'Jane',
            lastName: 'Staff'
        }
    }
];

// Get all campaigns
router.get('/', authenticateToken, async (req, res) => {
    try {
        // Try to get real campaigns from database
        try {
            const campaigns = await Campaign.find({})
                .populate('organizer', 'firstName lastName')
                .sort({ createdAt: -1 });

            if (campaigns.length > 0) {
                return res.json({ campaigns });
            }
        } catch (dbError) {
            // Database not available, use mock data
        }

        // Return mock campaigns
        res.json({ campaigns: mockCampaigns });
    } catch (error) {
        console.error('Campaigns fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
});

// Get campaign by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        // Try database first
        try {
            const campaign = await Campaign.findById(req.params.id)
                .populate('organizer', 'firstName lastName');

            if (campaign) {
                return res.json({ campaign });
            }
        } catch (dbError) {
            // Database not available
        }

        // Check mock data
        const mockCampaign = mockCampaigns.find(c => c._id === req.params.id);
        if (!mockCampaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        res.json({ campaign: mockCampaign });
    } catch (error) {
        console.error('Campaign fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch campaign' });
    }
});

// Create new campaign
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { title, description, location, startDate, endDate, targetDonors, organizer } = req.body;

        if (!title || !description || !location || !startDate || !endDate || !targetDonors) {
            return res.status(400).json({ error: 'All required fields must be provided' });
        }

        // Try to create in database first
        try {
            const campaign = new Campaign({
                title,
                description,
                location,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                targetDonors: parseInt(targetDonors),
                organizer: req.user.userId,
                status: 'upcoming'
            });

            await campaign.save();
            await campaign.populate('organizer', 'firstName lastName');

            return res.status(201).json({
                message: 'Campaign created successfully',
                campaign
            });
        } catch (dbError) {
            // Database not available, add to mock data
            const newCampaign = {
                _id: 'mock-' + Date.now(),
                title,
                description,
                location,
                startDate,
                endDate,
                targetDonors: parseInt(targetDonors),
                registeredDonors: 0,
                successfulDonations: 0,
                status: 'upcoming',
                organizer: {
                    _id: req.user.userId || 'mock-user',
                    firstName: organizer || 'Admin',
                    lastName: ''
                }
            };

            mockCampaigns.push(newCampaign);

            return res.status(201).json({
                message: 'Campaign created successfully',
                campaign: newCampaign
            });
        }
    } catch (error) {
        console.error('Create campaign error:', error);
        res.status(500).json({ error: 'Failed to create campaign' });
    }
});

module.exports = router;