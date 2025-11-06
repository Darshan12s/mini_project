const express = require('express');
const Request = require('../models/Request');
const ActivityLogger = require('../utils/activityLogger');

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

// Get all requests
router.get('/', authenticateToken, async (req, res) => {
    try {
        const requests = await Request.find({})
            .populate('requester', 'firstName lastName')
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({ requests });
    } catch (error) {
        console.error('Requests fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
});

// Get request by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const request = await Request.findById(req.params.id)
            .populate('requester', 'firstName lastName')
            .populate('approvedBy', 'firstName lastName');

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        res.json({ request });
    } catch (error) {
        console.error('Request fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch request' });
    }
});

// Create new request
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { requesterName, requesterType, contactInfo, bloodType, quantity, urgency, notes } = req.body;

        // Create a simplified request structure
        const requestData = {
            requester: req.user.userId, // Use the authenticated user as requester
            patient: {
                name: requesterName,
                age: null,
                gender: 'other' // Default gender since it's not provided in the form
            },
            institution: {
                name: requesterName,
                type: requesterType || 'hospital',
                address: {
                    phone: contactInfo
                }
            },
            bloodRequirements: [{
                bloodType: bloodType,
                component: 'whole_blood',
                units: quantity || 1,
                urgency: urgency === 'critical' ? 'emergency' : urgency === 'urgent' ? 'urgent' : 'routine'
            }],
            status: 'pending',
            priority: urgency === 'critical' ? 'critical' : urgency === 'urgent' ? 'high' : 'medium',
            requiredBy: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default to 7 days from now
            notes: notes
        };

        const request = new Request(requestData);
        await request.save();

        // Log activity
        await ActivityLogger.logActivity(
            req.user.userId,
            'create_request',
            `Created blood request for ${requesterName}`,
            {
                ...ActivityLogger.getClientInfo(req),
                entityType: 'request',
                entityId: request._id,
                metadata: { bloodType, quantity, urgency }
            }
        );

        res.status(201).json({
            message: 'Request created successfully',
            request
        });
    } catch (error) {
        console.error('Request creation error:', error);
        res.status(500).json({ error: 'Failed to create request' });
    }
});

// Update request
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const updates = {};
        const allowedFields = [
            'patient', 'institution', 'bloodRequirements', 'status',
            'priority', 'requiredBy', 'notes', 'followUp', 'transportation'
        ];

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        // Handle special fields
        if (req.body.status === 'approved' && !updates.approvedBy) {
            updates.approvedBy = req.user.userId;
            updates.approvedDate = new Date();
        }

        if (req.body.status === 'fulfilled' && !updates.fulfilledDate) {
            updates.fulfilledDate = new Date();
        }

        const request = await Request.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        ).populate('requester', 'firstName lastName');

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        // Log activity
        await ActivityLogger.logActivity(
            req.user.userId,
            'update_request',
            `Updated request ${request.requestId}`,
            {
                ...ActivityLogger.getClientInfo(req),
                entityType: 'request',
                entityId: request._id,
                metadata: updates
            }
        );

        res.json({
            message: 'Request updated successfully',
            request
        });
    } catch (error) {
        console.error('Request update error:', error);
        res.status(500).json({ error: 'Failed to update request' });
    }
});

// Delete request
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const request = await Request.findByIdAndDelete(req.params.id);

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        // Log activity
        await ActivityLogger.logActivity(
            req.user.userId,
            'delete_request',
            `Deleted request`,
            {
                ...ActivityLogger.getClientInfo(req),
                entityType: 'request',
                entityId: req.params.id
            }
        );

        res.json({ message: 'Request deleted successfully' });
    } catch (error) {
        console.error('Request deletion error:', error);
        res.status(500).json({ error: 'Failed to delete request' });
    }
});

module.exports = router;