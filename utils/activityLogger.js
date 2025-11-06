const UserActivity = require('../models/UserActivity');

class ActivityLogger {
    static async logActivity(userId, action, description, options = {}) {
        try {
            const activityData = {
                user: userId,
                action,
                description,
                entityType: options.entityType,
                entityId: options.entityId,
                ipAddress: options.ipAddress,
                userAgent: options.userAgent,
                metadata: options.metadata
            };

            await UserActivity.create(activityData);
        } catch (error) {
            console.error('Error logging activity:', error);
            // Don't throw error to avoid breaking main functionality
        }
    }

    static getClientInfo(req) {
        return {
            ipAddress: req.ip || req.connection.remoteAddress || req.socket.remoteAddress,
            userAgent: req.get('User-Agent')
        };
    }
}

module.exports = ActivityLogger;