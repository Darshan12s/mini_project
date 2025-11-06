const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: [
            'login', 'logout', 'create_donor', 'update_donor', 'delete_donor',
            'create_request', 'update_request', 'delete_request', 'update_status',
            'create_inventory', 'update_inventory', 'delete_inventory',
            'view_dashboard', 'view_profile', 'update_profile'
        ]
    },
    description: {
        type: String,
        required: true
    },
    entityType: {
        type: String,
        enum: ['donor', 'request', 'inventory', 'user', 'system']
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId
    },
    ipAddress: String,
    userAgent: String,
    metadata: {
        type: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Index for efficient queries
userActivitySchema.index({ user: 1, createdAt: -1 });
userActivitySchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('UserActivity', userActivitySchema);