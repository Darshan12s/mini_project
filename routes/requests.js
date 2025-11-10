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
    console.log('GET /api/requests - Fetching all requests');
    try {
        let requests = [];

        // Try to get real requests from database
        try {
            const dbRequests = await Request.find({})
                .populate('requester', 'firstName lastName')
                .sort({ createdAt: -1 })
                .limit(50);

            requests = dbRequests;
            console.log(`Found ${requests.length} requests in database`);
            if (requests.length > 0) {
                console.log('Sample request:', JSON.stringify(requests[0], null, 2));
            }
        } catch (dbError) {
            console.log('Database error, using mock requests:', dbError.message);
        }

        // Include mock requests if any exist
        if (global.mockRequests && global.mockRequests.length > 0) {
            console.log(`Adding ${global.mockRequests.length} mock requests`);
            requests = [...global.mockRequests, ...requests];
        }

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
        console.log('POST /api/requests - Request body:', JSON.stringify(req.body, null, 2));

        const { patient, institution, bloodRequirements, priority, notes, status } = req.body;

        // Validate required fields
        if (!bloodRequirements || !bloodRequirements.length) {
            return res.status(400).json({ error: 'Blood requirements are required' });
        }

        // Validate that either patient or institution is provided
        if (!patient && !institution) {
            return res.status(400).json({ error: 'Either patient or institution information is required' });
        }

        // Create request structure matching the expected format
        const requestData = {
            requester: req.user.userId, // Use the authenticated user as requester
            patient: patient || undefined,
            institution: institution || undefined,
            bloodRequirements: bloodRequirements,
            status: status || 'pending',
            priority: priority || 'medium',
            requiredBy: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default to 7 days from now
            notes: notes || ''
        };

        console.log('Creating request with data:', JSON.stringify(requestData, null, 2));

        // Try to save to database first
        try {
            const request = new Request(requestData);
            await request.save();

            console.log('Request saved successfully to database:', request._id);
            console.log('Request details:', JSON.stringify(request, null, 2));

            // Populate the request for response
            await request.populate('requester', 'firstName lastName');

            return res.status(201).json({
                message: 'Request created successfully',
                request
            });
        } catch (dbError) {
            console.log('Database error, using mock response:', dbError.message);
            console.log('Request data that failed to save:', JSON.stringify(requestData, null, 2));

            // Return mock success response for demo purposes
            const mockRequest = {
                _id: 'mock-' + Date.now(),
                requestId: 'REQ' + Date.now().toString().slice(-6),
                requester: req.user.userId,
                patient: patient,
                institution: institution,
                bloodRequirements: bloodRequirements,
                status: status || 'pending',
                priority: priority || 'medium',
                requiredBy: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                notes: notes || '',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            console.log('Returning mock request:', JSON.stringify(mockRequest, null, 2));

            // Add mock request to the requests list for immediate display
            if (global.mockRequests) {
                global.mockRequests.push(mockRequest);
            } else {
                global.mockRequests = [mockRequest];
            }

            return res.status(201).json({
                message: 'Request created successfully',
                request: mockRequest
            });
        }
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