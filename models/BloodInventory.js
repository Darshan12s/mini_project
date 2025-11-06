const mongoose = require('mongoose');

const bloodInventorySchema = new mongoose.Schema({
    bloodType: {
        type: String,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
        required: true
    },
    component: {
        type: String,
        enum: ['whole_blood', 'plasma', 'platelets', 'red_cells', 'cryoprecipitate'],
        default: 'whole_blood'
    },
    units: {
        type: Number,
        required: true,
        min: 0
    },
    location: {
        type: String,
        required: true,
        enum: ['main_bank', 'satellite_1', 'satellite_2', 'mobile_unit']
    },
    donor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Donor'
    },
    donation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Donation'
    },
    collectionDate: {
        type: Date,
        required: true
    },
    expirationDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['available', 'reserved', 'issued', 'expired', 'discarded', 'quarantined'],
        default: 'available'
    },
    storage: {
        temperature: Number, // in Celsius
        humidity: Number, // percentage
        location: String, // specific storage location
        rack: String,
        shelf: String,
        position: String
    },
    quality: {
        hemoglobin: Number,
        hematocrit: Number,
        plateletCount: Number,
        whiteCellCount: Number,
        testResults: {
            hiv: {
                type: String,
                enum: ['negative', 'positive', 'pending', 'not_tested']
            },
            hepatitisB: {
                type: String,
                enum: ['negative', 'positive', 'pending', 'not_tested']
            },
            hepatitisC: {
                type: String,
                enum: ['negative', 'positive', 'pending', 'not_tested']
            },
            syphilis: {
                type: String,
                enum: ['negative', 'positive', 'pending', 'not_tested']
            },
            malaria: {
                type: String,
                enum: ['negative', 'positive', 'pending', 'not_tested']
            },
            chagas: {
                type: String,
                enum: ['negative', 'positive', 'pending', 'not_tested']
            }
        }
    },
    processing: {
        anticoagulants: String,
        preservatives: String,
        irradiation: Boolean,
        leukoreduction: Boolean,
        pooling: Boolean,
        notes: String
    },
    issuedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Request'
    },
    issuedDate: Date,
    issuedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    returnDate: Date,
    returnReason: String,
    notes: String,
    batchNumber: String,
    serialNumber: {
        type: String,
        unique: true
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
bloodInventorySchema.index({ bloodType: 1, component: 1, status: 1 });
bloodInventorySchema.index({ expirationDate: 1 });
bloodInventorySchema.index({ location: 1 });
bloodInventorySchema.index({ status: 1, bloodType: 1 });

// Virtual for days until expiration
bloodInventorySchema.virtual('daysUntilExpiration').get(function() {
    const now = new Date();
    const exp = new Date(this.expirationDate);
    const diffTime = exp - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
});

// Virtual for is expired
bloodInventorySchema.virtual('isExpired').get(function() {
    return new Date() > new Date(this.expirationDate);
});

// Virtual for storage duration
bloodInventorySchema.virtual('storageDays').get(function() {
    const now = new Date();
    const collection = new Date(this.collectionDate);
    const diffTime = now - collection;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
});

// Method to check if blood is safe to use
bloodInventorySchema.methods.isSafe = function() {
    // Check expiration
    if (this.isExpired) return false;

    // Check status
    if (this.status !== 'available') return false;

    // Check test results
    const tests = this.quality.testResults;
    const criticalTests = ['hiv', 'hepatitisB', 'hepatitisC', 'syphilis'];

    for (const test of criticalTests) {
        if (tests[test] === 'positive') return false;
    }

    return true;
};

// Method to reserve blood
bloodInventorySchema.methods.reserve = function(requestId) {
    if (this.status === 'available') {
        this.status = 'reserved';
        this.issuedTo = requestId;
        return true;
    }
    return false;
};

// Method to issue blood
bloodInventorySchema.methods.issue = function(requestId, issuedBy) {
    if (this.status === 'available' || this.status === 'reserved') {
        this.status = 'issued';
        this.issuedTo = requestId;
        this.issuedDate = new Date();
        this.issuedBy = issuedBy;
        return true;
    }
    return false;
};

// Method to return blood
bloodInventorySchema.methods.returnBlood = function(reason) {
    if (this.status === 'issued') {
        this.status = 'available';
        this.returnDate = new Date();
        this.returnReason = reason;
        this.issuedTo = null;
        this.issuedDate = null;
        this.issuedBy = null;
        return true;
    }
    return false;
};

// Method to discard blood
bloodInventorySchema.methods.discard = function(reason) {
    this.status = 'discarded';
    this.notes = (this.notes || '') + `\nDiscarded: ${reason} (${new Date().toISOString()})`;
    return true;
};

// Pre-save middleware to set expiration date based on component type
bloodInventorySchema.pre('save', function(next) {
    if (this.isNew && !this.expirationDate) {
        const collectionDate = new Date(this.collectionDate);

        // Set expiration based on component type (in days)
        const expirationDays = {
            'whole_blood': 35,
            'red_cells': 42,
            'plasma': 365,
            'platelets': 5,
            'cryoprecipitate': 365
        };

        const days = expirationDays[this.component] || 35;
        this.expirationDate = new Date(collectionDate.getTime() + (days * 24 * 60 * 60 * 1000));
    }

    // Generate serial number if not present
    if (this.isNew && !this.serialNumber) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        this.serialNumber = `${this.bloodType}-${this.component}-${timestamp}-${random}`.toUpperCase();
    }

    next();
});

// Static method to get inventory summary
bloodInventorySchema.statics.getInventorySummary = async function() {
    const summary = await this.aggregate([
        {
            $match: { status: 'available' }
        },
        {
            $group: {
                _id: { bloodType: '$bloodType', component: '$component' },
                totalUnits: { $sum: '$units' },
                count: { $sum: 1 }
            }
        },
        {
            $group: {
                _id: '$_id.bloodType',
                components: {
                    $push: {
                        component: '$_id.component',
                        units: '$totalUnits',
                        count: '$count'
                    }
                },
                totalUnits: { $sum: '$totalUnits' }
            }
        }
    ]);

    return summary;
};

// Static method to get expiring blood
bloodInventorySchema.statics.getExpiringBlood = async function(days = 7) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return await this.find({
        status: 'available',
        expirationDate: { $lte: futureDate }
    }).populate('donor', 'donorId').sort({ expirationDate: 1 });
};

module.exports = mongoose.model('BloodInventory', bloodInventorySchema);