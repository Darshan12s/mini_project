const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
    campaignId: {
        type: String,
        unique: true,
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['general', 'emergency', 'targeted', 'corporate', 'school', 'community', 'mobile'],
        default: 'general'
    },
    status: {
        type: String,
        enum: ['planning', 'active', 'completed', 'cancelled', 'postponed'],
        default: 'planning'
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    targetBloodTypes: [{
        type: String,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    }],
    targetUnits: {
        type: Number,
        required: true,
        min: 1
    },
    unitsCollected: {
        type: Number,
        default: 0
    },
    donorsParticipated: {
        type: Number,
        default: 0
    },
    location: {
        name: {
            type: String,
            required: true
        },
        address: {
            street: String,
            city: String,
            state: String,
            zipCode: String,
            coordinates: {
                latitude: Number,
                longitude: Number
            }
        },
        type: {
            type: String,
            enum: ['fixed', 'mobile', 'satellite'],
            default: 'fixed'
        }
    },
    organizer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    team: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        role: {
            type: String,
            enum: ['coordinator', 'nurse', 'volunteer', 'driver'],
            default: 'volunteer'
        }
    }],
    targetAudience: {
        ageRange: {
            min: Number,
            max: Number
        },
        bloodTypes: [{
            type: String,
            enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
        }],
        firstTimeDonors: Boolean,
        regularDonors: Boolean,
        specificGroups: [String] // e.g., ['students', 'employees', 'community']
    },
    resources: {
        staff: Number,
        vehicles: Number,
        equipment: [String],
        supplies: [{
            item: String,
            quantity: Number,
            unit: String
        }]
    },
    promotion: {
        channels: [{
            type: String,
            enum: ['social_media', 'email', 'sms', 'print', 'radio', 'tv', 'website', 'partnerships']
        }],
        materials: [String],
        budget: Number,
        partners: [{
            name: String,
            type: String,
            contact: String
        }]
    },
    schedule: [{
        date: Date,
        startTime: String,
        endTime: String,
        capacity: Number,
        location: String,
        notes: String
    }],
    donations: [{
        donor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Donor'
        },
        date: Date,
        units: Number,
        bloodType: String,
        notes: String
    }],
    feedback: [{
        donor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Donor'
        },
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        comments: String,
        date: Date
    }],
    budget: {
        estimated: Number,
        actual: Number,
        breakdown: [{
            category: String,
            estimated: Number,
            actual: Number
        }]
    },
    results: {
        totalDonations: Number,
        uniqueDonors: Number,
        newDonors: Number,
        bloodTypeDistribution: {
            'A+': Number,
            'A-': Number,
            'B+': Number,
            'B-': Number,
            'AB+': Number,
            'AB-': Number,
            'O+': Number,
            'O-': Number
        },
        adverseEvents: Number,
        deferrals: Number
    },
    notes: String,
    attachments: [{
        name: String,
        url: String,
        type: String
    }]
}, {
    timestamps: true
});

// Indexes for efficient queries
campaignSchema.index({ status: 1, startDate: -1 });
campaignSchema.index({ type: 1 });
campaignSchema.index({ 'location.city': 1 });
campaignSchema.index({ organizer: 1 });

// Virtual for campaign duration
campaignSchema.virtual('duration').get(function() {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const diffTime = end - start;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
});

// Virtual for days remaining
campaignSchema.virtual('daysRemaining').get(function() {
    if (this.status === 'completed' || this.status === 'cancelled') return 0;

    const now = new Date();
    const end = new Date(this.endDate);
    const diffTime = end - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
});

// Virtual for progress percentage
campaignSchema.virtual('progressPercentage').get(function() {
    return this.targetUnits > 0 ? Math.round((this.unitsCollected / this.targetUnits) * 100) : 0;
});

// Virtual for average rating
campaignSchema.virtual('averageRating').get(function() {
    if (this.feedback.length === 0) return 0;
    const sum = this.feedback.reduce((total, fb) => total + fb.rating, 0);
    return Math.round((sum / this.feedback.length) * 10) / 10;
});

// Method to add donation
campaignSchema.methods.addDonation = function(donorId, units, bloodType, notes = '') {
    this.donations.push({
        donor: donorId,
        date: new Date(),
        units: units,
        bloodType: bloodType,
        notes: notes
    });

    this.unitsCollected += units;
    this.donorsParticipated += 1;

    // Update blood type distribution
    if (!this.results.bloodTypeDistribution) {
        this.results.bloodTypeDistribution = {};
    }
    this.results.bloodTypeDistribution[bloodType] = (this.results.bloodTypeDistribution[bloodType] || 0) + units;

    // Update overall results
    this.results.totalDonations = (this.results.totalDonations || 0) + 1;
    this.results.uniqueDonors = this.donations.length; // Simplified - should track unique donors
};

// Method to complete campaign
campaignSchema.methods.complete = function() {
    this.status = 'completed';
    this.results = this.results || {};
    this.results.totalDonations = this.donations.length;
    this.results.uniqueDonors = new Set(this.donations.map(d => d.donor.toString())).size;
};

// Method to check if campaign is active
campaignSchema.methods.isActive = function() {
    const now = new Date();
    return this.status === 'active' &&
           now >= new Date(this.startDate) &&
           now <= new Date(this.endDate);
};

// Pre-save middleware to generate campaign ID
campaignSchema.pre('save', async function(next) {
    if (this.isNew && !this.campaignId) {
        // Generate campaign ID: CAMP + YYMMDD + sequential number
        const date = new Date();
        const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '');
        const count = await mongoose.model('Campaign').countDocuments();
        this.campaignId = `CAMP${dateStr}${(count + 1).toString().padStart(4, '0')}`;
    }
    next();
});

// Static method to get active campaigns
campaignSchema.statics.getActiveCampaigns = async function() {
    const now = new Date();
    return await this.find({
        status: 'active',
        startDate: { $lte: now },
        endDate: { $gte: now }
    })
    .populate('organizer', 'firstName lastName')
    .sort({ endDate: 1 });
};

// Static method to get campaigns by location
campaignSchema.statics.getCampaignsByLocation = async function(city) {
    return await this.find({
        'location.address.city': new RegExp(city, 'i'),
        status: { $in: ['active', 'planning'] }
    })
    .populate('organizer', 'firstName lastName')
    .sort({ startDate: 1 });
};

// Static method to get campaign statistics
campaignSchema.statics.getCampaignStats = async function() {
    const stats = await this.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalTargetUnits: { $sum: '$targetUnits' },
                totalCollectedUnits: { $sum: '$unitsCollected' },
                averageProgress: { $avg: { $cond: [{ $gt: ['$targetUnits', 0] }, { $divide: ['$unitsCollected', '$targetUnits'] }, 0] } }
            }
        }
    ]);

    return stats;
};

module.exports = mongoose.model('Campaign', campaignSchema);