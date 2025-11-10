const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Donor = require('../models/Donor');
const UserActivity = require('../models/UserActivity');
const ActivityLogger = require('../utils/activityLogger');

const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Register new user
router.post('/register', [
    body('firstName').trim().isLength({ min: 2 }).withMessage('First name must be at least 2 characters'),
    body('lastName').trim().isLength({ min: 2 }).withMessage('Last name must be at least 2 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('confirmPassword').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Password confirmation does not match password');
        }
        return true;
    }),
    body('phone').optional().isMobilePhone().withMessage('Valid phone number is required'),
    body('bloodType').optional().isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).withMessage('Valid blood type is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array()[0].msg });
        }

        const { firstName, lastName, email, password, bloodType, phone } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        // Create new user
        const user = new User({
            firstName,
            lastName,
            email,
            password,
            bloodType,
            phone,
            role: 'staff' // Default role, can be changed by admin later
        });

        await user.save();

        // If user has blood type, create donor record
        if (bloodType) {
            const donor = new Donor({
                user: user._id,
                bloodType: bloodType,
                contactInfo: {
                    email: email,
                    phone: phone
                }
            });
            await donor.save();
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// Mock users for demo
const mockUsers = [
    {
        _id: '507f1f77bcf86cd799439011',
        firstName: 'John',
        lastName: 'Admin',
        email: 'admin@lifeflow.com',
        password: 'admin123',
        role: 'admin',
        bloodType: 'O+',
        isActive: true
    },
    {
        _id: '507f1f77bcf86cd799439012',
        firstName: 'Jane',
        lastName: 'Staff',
        email: 'staff@lifeflow.com',
        password: 'staff123',
        role: 'staff',
        bloodType: 'A+',
        isActive: true
    }
];

// Login user
router.post('/login', [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').exists().withMessage('Password is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array()[0].msg });
        }

        const { email, password } = req.body;

        let user = null;
        let isMockUser = false;

        // Find user by email in database
        user = await User.findOne({ email });

        // If no user found in database, check mock users
        if (!user) {
            const mockUser = mockUsers.find(u => u.email === email);
            if (mockUser && mockUser.password === password) {
                user = mockUser;
                isMockUser = true;
            }
        }

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check password for database users
        if (!isMockUser) {
            const isValidPassword = await user.comparePassword(password);
            if (!isValidPassword) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            // Check if user is active
            if (!user.isActive) {
                return res.status(401).json({ error: 'Account is deactivated. Contact administrator.' });
            }
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id || user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        // Log login activity (only for database users)
        if (!isMockUser) {
            await ActivityLogger.logActivity(
                user._id,
                'login',
                `User ${user.firstName} ${user.lastName} logged in`,
                ActivityLogger.getClientInfo(req)
            );
        }

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                bloodType: user.bloodType
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
    console.log('GET /api/auth/profile - Fetching profile for user:', req.user.userId);
    try {
        let user = null;
        let stats = {
            totalDonors: 0,
            totalRequests: 0,
            daysActive: 0
        };

        // Try to get user from database first
        try {
            user = await User.findById(req.user.userId).select('-password');
            console.log('User found in database:', user ? user._id : 'Not found');

            if (user) {
                // Calculate stats for database user
                const donorCount = await Donor.countDocuments({ user: user._id });
                const requestCount = await Request.countDocuments({ requester: user._id });

                // Calculate days active
                const createdDate = new Date(user.createdAt);
                const now = new Date();
                const daysActive = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));

                stats = {
                    totalDonors: donorCount,
                    totalRequests: requestCount,
                    daysActive: daysActive
                };
            }
        } catch (dbError) {
            console.log('Database error, checking mock users:', dbError.message);
            // Fallback to mock stats for demo
            stats = {
                totalDonors: 25,
                totalRequests: 12,
                daysActive: 45
            };
        }

        // If no user found in database, check mock users
        if (!user) {
            const mockUser = mockUsers.find(u => u._id === req.user.userId || u.email === req.user.email);
            if (mockUser) {
                user = {
                    _id: mockUser._id,
                    firstName: mockUser.firstName,
                    lastName: mockUser.lastName,
                    email: mockUser.email,
                    role: mockUser.role,
                    bloodType: mockUser.bloodType,
                    phone: mockUser.phone || '',
                    createdAt: new Date(),
                    isActive: mockUser.isActive
                };
                console.log('Using mock user:', user._id);

                // Mock stats for demo users
                stats = {
                    totalDonors: 25,
                    totalRequests: 12,
                    daysActive: 45
                };
            }
        }

        if (!user) {
            console.log('No user found for ID:', req.user.userId);
            return res.status(404).json({ error: 'User not found' });
        }

        console.log('Returning user profile with stats:', JSON.stringify({ user, stats }, null, 2));
        res.json({ user, stats });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Update user profile
router.put('/profile', authenticateToken, [
    body('firstName').optional().trim().isLength({ min: 2 }).withMessage('First name must be at least 2 characters'),
    body('lastName').optional().trim().isLength({ min: 2 }).withMessage('Last name must be at least 2 characters'),
    body('phone').optional().isMobilePhone().withMessage('Valid phone number is required'),
    body('bloodType').optional().isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).withMessage('Valid blood type is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array()[0].msg });
        }

        const updates = {};
        const allowedFields = ['firstName', 'lastName', 'phone', 'bloodType', 'address', 'emergencyContact', 'medicalHistory', 'preferences'];

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const user = await User.findByIdAndUpdate(
            req.user.userId,
            updates,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            message: 'Profile updated successfully',
            user
        });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Change password
router.put('/change-password', authenticateToken, [
    body('currentPassword').exists().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
    body('confirmPassword').custom((value, { req }) => {
        if (value !== req.body.newPassword) {
            throw new Error('Password confirmation does not match new password');
        }
        return true;
    })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array()[0].msg });
        }

        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const isValidPassword = await user.comparePassword(currentPassword);
        if (!isValidPassword) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password changed successfully' });

    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// Logout (client-side token removal, but we can log the logout)
router.post('/logout', authenticateToken, async (req, res) => {
    // Log logout activity
    await ActivityLogger.logActivity(
        req.user.userId,
        'logout',
        `User logged out`,
        ActivityLogger.getClientInfo(req)
    );

    // In a more complex system, you might want to blacklist the token
    res.json({ message: 'Logged out successfully' });
});

// Get all users (admin only)
router.get('/users', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const users = await User.find({})
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await User.countDocuments();

        res.json({
            users,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Users fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Update user (admin only)
router.put('/users/:userId', authenticateToken, [
    body('firstName').optional().trim().isLength({ min: 2 }).withMessage('First name must be at least 2 characters'),
    body('lastName').optional().trim().isLength({ min: 2 }).withMessage('Last name must be at least 2 characters'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('phone').optional().isMobilePhone().withMessage('Valid phone number is required'),
    body('role').optional().isIn(['admin', 'staff', 'donor']).withMessage('Valid role is required')
], async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array()[0].msg });
        }

        const updates = {};
        const allowedFields = ['firstName', 'lastName', 'email', 'phone', 'role'];

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const user = await User.findByIdAndUpdate(
            req.params.userId,
            updates,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            message: 'User updated successfully',
            user
        });

    } catch (error) {
        console.error('User update error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Update user role (admin only)
router.put('/users/:userId/role', authenticateToken, [
    body('role').isIn(['admin', 'staff', 'donor']).withMessage('Valid role is required')
], async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array()[0].msg });
        }

        const { role } = req.body;
        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { role },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            message: 'User role updated successfully',
            user
        });

    } catch (error) {
        console.error('User role update error:', error);
        res.status(500).json({ error: 'Failed to update user role' });
    }
});

// Get user activity log
router.get('/activities', authenticateToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Users can only see their own activities, admins can see all
        const query = req.user.role === 'admin' ? {} : { user: req.user.userId };

        const activities = await UserActivity.find(query)
            .populate('user', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await UserActivity.countDocuments(query);

        res.json({
            activities,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Activities fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch activities' });
    }
});

module.exports = router;