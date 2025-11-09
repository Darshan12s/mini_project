const express = require('express');
const { body, validationResult } = require('express-validator');
const Donor = require('../models/Donor');
const User = require('../models/User');
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

// Mock donors data (will be replaced by database data when available)
const mockDonors = [];

// Get all donors
router.get('/', authenticateToken, async (req, res) => {
    console.log('Fetching donors from API');
    try {
        let donors = [...mockDonors];

        // Apply filters
        if (req.query.bloodType) {
            donors = donors.filter(d => d.bloodType === req.query.bloodType);
        }
        if (req.query.eligibilityStatus) {
            donors = donors.filter(d => d.eligibilityStatus === req.query.eligibilityStatus);
        }
        if (req.query.search) {
            const searchTerm = req.query.search.toLowerCase();
            donors = donors.filter(d =>
                d.user.firstName.toLowerCase().includes(searchTerm) ||
                d.user.lastName.toLowerCase().includes(searchTerm) ||
                d.user.email.toLowerCase().includes(searchTerm) ||
                d.donorId.includes(searchTerm)
            );
        }

        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const paginatedDonors = donors.slice(skip, skip + limit);

        // Try to get real data if MongoDB is connected
        try {
            const realDonors = await Donor.find({})
                .populate('user', 'firstName lastName email phone')
                .sort({ createdAt: -1 })
                .limit(50);

            console.log('Real donors found:', realDonors.length);
            if (realDonors.length > 0) {
                console.log('Sample populated donor:', JSON.stringify(realDonors[0], null, 2));
            }
            if (realDonors.length > 0) {
                donors = realDonors.map(d => ({
                    _id: d._id,
                    donorId: d.donorId,
                    user: d.user,
                    bloodType: d.bloodType,
                    eligibilityStatus: d.eligibilityStatus,
                    lastDonation: d.lastDonation ? d.lastDonation.toISOString().split('T')[0] : null,
                    contactInfo: d.contactInfo
                }));
                console.log('Mapped donors:', donors.length);
            } else {
                // Use mock data if no database data
                donors = [...mockDonors];
                console.log('Using mock donors');
            }
        } catch (dbError) {
            console.log('DB error in GET donors:', dbError.message);
            // Use mock data if database not available
            donors = [...mockDonors];
        }

        console.log('Sending donors count:', donors.length);
        console.log('Sending donors data:', JSON.stringify(donors.slice(0, 2), null, 2)); // Log first 2 donors
        res.json({
            donors: donors, // Return all donors instead of paginated
            pagination: {
                page,
                limit,
                total: donors.length,
                pages: Math.ceil(donors.length / limit)
            }
        });

    } catch (error) {
        console.error('Donors fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch donors' });
    }
});

// Get donor by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        // Try to get from database first
        try {
            const donor = await Donor.findById(req.params.id)
                .populate('user', '-password')
                .populate('donationHistory.campaign', 'title');

            if (donor) {
                return res.json({ donor });
            }
        } catch (dbError) {
            // Database not available, use mock data
        }

        // Check mock data (should be empty now, but kept for fallback)
        const mockDonor = mockDonors.find(d => d._id === req.params.id);
        if (!mockDonor) {
            return res.status(404).json({ error: 'Donor not found' });
        }

        res.json({ donor: mockDonor });

    } catch (error) {
        console.error('Donor fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch donor' });
    }
});

// Create new donor
router.post('/', authenticateToken, [
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('bloodType').isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).withMessage('Valid blood type is required'),
    body('phone').optional().isLength({ min: 10, max: 15 }).withMessage('Phone number must be between 10-15 characters')
], async (req, res) => {
    console.log('POST /api/donors - Request body:', JSON.stringify(req.body, null, 2));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('Validation errors:', errors.array());
        return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { firstName, lastName, email, phone, bloodType, lastDonation } = req.body;

    try {
        // Try to save to database
        let user = await User.findOne({ email });
        if (!user) {
            user = new User({
                firstName,
                lastName,
                email,
                phone,
                role: 'donor'
            });
            await user.save();
            console.log('User created:', user._id);
        }

        let donor = await Donor.findOne({ user: user._id });
        if (donor) {
            donor.bloodType = bloodType;
            donor.contactInfo = {
                email,
                phone
            };
            donor.lastDonation = lastDonation ? new Date(lastDonation) : null;
            await donor.save();
            await donor.populate('user', 'firstName lastName email phone');
            console.log('Existing donor updated:', donor._id);
        } else {
            donor = new Donor({
                user: user._id,
                bloodType,
                contactInfo: {
                    email,
                    phone
                },
                lastDonation: lastDonation ? new Date(lastDonation) : null
            });
            await donor.save();
            await donor.populate('user', 'firstName lastName email phone');
            console.log('New donor created:', donor._id);
        }

        // Log activity (commented out to avoid crash)
        // await ActivityLogger.logActivity(
        //     req.user.userId,
        //     'create_donor',
        //     `Created donor record for ${firstName} ${lastName}`,
        //     {
        //         ...ActivityLogger.getClientInfo(req),
        //         entityType: 'donor',
        //         entityId: donor._id,
        //         metadata: { bloodType, donorId: donor.donorId }
        //     }
        // );

        res.status(201).json({
            message: 'Donor created successfully',
            donor: {
                _id: donor._id,
                donorId: donor.donorId,
                user: donor.user,
                bloodType: donor.bloodType,
                eligibilityStatus: donor.eligibilityStatus,
                lastDonation: donor.lastDonation ? donor.lastDonation.toISOString().split('T')[0] : null,
                contactInfo: donor.contactInfo
            }
        });

    } catch (dbError) {
        console.error('Database error, using mock data:', dbError.message);

        // Add to mock data if database is not available
        const newDonor = {
            _id: 'mock-' + Date.now(),
            donorId: 'MOCK' + Date.now().toString().slice(-6),
            user: {
                _id: 'mock-user-' + Date.now(),
                firstName: firstName,
                lastName: lastName,
                email: email,
                phone: phone
            },
            bloodType: bloodType,
            eligibilityStatus: 'eligible',
            lastDonation: lastDonation || null,
            contactInfo: {
                email: email,
                phone: phone
            }
        };

        mockDonors.push(newDonor);

        res.status(201).json({
            message: 'Donor created successfully',
            donor: newDonor
        });
    }
});

// Update donor
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const updates = {};
        const allowedFields = [
            'bloodType', 'eligibilityStatus', 'ineligibilityReason', 'contactInfo',
            'emergencyContact', 'medicalInfo', 'preferences'
        ];

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const donor = await Donor.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        ).populate('user', 'firstName lastName email');

        if (!donor) {
            return res.status(404).json({ error: 'Donor not found' });
        }

        // Log activity
        await ActivityLogger.logActivity(
            req.user.userId,
            'update_donor',
            `Updated donor record ${donor.donorId}`,
            {
                ...ActivityLogger.getClientInfo(req),
                entityType: 'donor',
                entityId: donor._id
            }
        );

        res.json({
            message: 'Donor updated successfully',
            donor
        });

    } catch (error) {
        console.error('Donor update error:', error);
        res.status(500).json({ error: 'Failed to update donor' });
    }
});

// Delete donor
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        // Try to delete from database first
        try {
            const donor = await Donor.findByIdAndDelete(req.params.id);
            if (donor) {
                // Log activity
                await ActivityLogger.logActivity(
                    req.user.userId,
                    'delete_donor',
                    `Deleted donor record`,
                    {
                        ...ActivityLogger.getClientInfo(req),
                        entityType: 'donor',
                        entityId: req.params.id
                    }
                );

                return res.json({ message: 'Donor deleted successfully' });
            }
        } catch (dbError) {
            // Database not available, use mock data
        }

        // Delete from mock data (should be empty now, but kept for fallback)
        const index = mockDonors.findIndex(d => d._id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ error: 'Donor not found' });
        }

        mockDonors.splice(index, 1);
        res.json({ message: 'Donor deleted successfully' });

    } catch (error) {
        console.error('Donor deletion error:', error);
        res.status(500).json({ error: 'Failed to delete donor' });
    }
});

// Add donation to donor history
router.post('/:id/donation', authenticateToken, [
    body('units').isInt({ min: 1 }).withMessage('Units must be at least 1'),
    body('location').notEmpty().withMessage('Donation location is required'),
    body('notes').optional().isString()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array()[0].msg });
        }

        const { units, location, campaign, notes, testResults } = req.body;

        const donor = await Donor.findById(req.params.id);
        if (!donor) {
            return res.status(404).json({ error: 'Donor not found' });
        }

        const donationData = {
            units,
            location,
            campaign,
            notes,
            testResults
        };

        donor.addDonation(donationData);
        await donor.save();

        res.json({
            message: 'Donation recorded successfully',
            donor
        });

    } catch (error) {
        console.error('Donation recording error:', error);
        res.status(500).json({ error: 'Failed to record donation' });
    }
});

// Get donor statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
    try {
        const stats = await Donor.aggregate([
            {
                $group: {
                    _id: null,
                    totalDonors: { $sum: 1 },
                    eligibleDonors: {
                        $sum: { $cond: [{ $eq: ['$eligibilityStatus', 'eligible'] }, 1, 0] }
                    },
                    bloodTypeCounts: {
                        $push: '$bloodType'
                    }
                }
            }
        ]);

        const bloodTypeStats = await Donor.aggregate([
            {
                $group: {
                    _id: '$bloodType',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        const result = stats[0] || { totalDonors: 0, eligibleDonors: 0 };

        res.json({
            totalDonors: result.totalDonors,
            eligibleDonors: result.eligibleDonors,
            ineligibleDonors: result.totalDonors - result.eligibleDonors,
            bloodTypeDistribution: bloodTypeStats
        });

    } catch (error) {
        console.error('Donor stats error:', error);
        res.status(500).json({ error: 'Failed to fetch donor statistics' });
    }
});

module.exports = router;