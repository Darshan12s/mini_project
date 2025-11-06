const mongoose = require('mongoose');

const donorSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    donorId: {
        type: String,
        unique: true
    },
    bloodType: {
        type: String,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
        required: true
    },
    eligibilityStatus: {
        type: String,
        enum: ['eligible', 'ineligible', 'deferred', 'permanent'],
        default: 'eligible'
    },
    ineligibilityReason: {
        type: String,
        enum: [
            'recent_donation',
            'medical_condition',
            'medication',
            'travel',
            'pregnancy',
            'age',
            'weight',
            'tattoo',
            'other'
        ]
    },
    ineligibilityNotes: String,
    lastDonation: {
        type: Date
    },
    nextEligibleDonation: {
        type: Date
    },
    totalDonations: {
        type: Number,
        default: 0
    },
    totalUnits: {
        type: Number,
        default: 0
    },
    donationHistory: [{
        date: {
            type: Date,
            default: Date.now
        },
        units: {
            type: Number,
            default: 1
        },
        location: {
            type: String,
            required: true
        },
        campaign: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Campaign'
        },
        notes: String,
        hemoglobin: Number,
        bloodPressure: String,
        weight: Number,
        temperature: Number,
        testResults: {
            hiv: String,
            hepatitisB: String,
            hepatitisC: String,
            syphilis: String,
            malaria: String
        },
        status: {
            type: String,
            enum: ['completed', 'rejected', 'quarantined'],
            default: 'completed'
        }
    }],
    medicalInfo: {
        height: Number, // in cm
        weight: Number, // in kg
        allergies: [String],
        medications: [String],
        conditions: [String],
        surgeries: [{
            date: Date,
            procedure: String,
            notes: String
        }],
        tattoos: [{
            date: Date,
            location: String
        }],
        piercings: [{
            date: Date,
            location: String
        }]
    },
    contactInfo: {
        phone: {
            type: String,
            required: true
        },
        alternatePhone: String,
        email: {
            type: String,
            required: true
        },
        address: {
            street: String,
            city: String,
            state: String,
            zipCode: String
        }
    },
    emergencyContact: {
        name: String,
        phone: String,
        relationship: String
    },
    preferences: {
        contactMethod: {
            type: String,
            enum: ['email', 'phone', 'sms'],
            default: 'email'
        },
        donationReminders: {
            type: Boolean,
            default: true
        },
        newsletter: {
            type: Boolean,
            default: false
        }
    },
    registrationDate: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    },
    notes: String
}, {
    timestamps: true
});

// Indexes for efficient queries
donorSchema.index({ bloodType: 1, eligibilityStatus: 1 });
donorSchema.index({ 'contactInfo.city': 1 });
donorSchema.index({ lastDonation: -1 });
donorSchema.index({ nextEligibleDonation: 1 });

// Virtual for full name (from user reference)
donorSchema.virtual('fullName').get(async function() {
    if (this.populated('user')) {
        return `${this.user.firstName} ${this.user.lastName}`;
    }
    return 'Unknown';
});

// Virtual for age (from user reference)
donorSchema.virtual('age').get(function() {
    if (this.populated('user') && this.user.dateOfBirth) {
        const today = new Date();
        const birthDate = new Date(this.user.dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }
    return null;
});

// Method to check eligibility
donorSchema.methods.checkEligibility = function() {
    if (this.eligibilityStatus === 'permanent') {
        return false;
    }

    if (!this.lastDonation) {
        return true;
    }

    const now = new Date();
    const daysSinceLastDonation = Math.floor((now - this.lastDonation) / (1000 * 60 * 60 * 24));

    // Minimum 56 days between donations
    return daysSinceLastDonation >= 56;
};

// Method to update eligibility
donorSchema.methods.updateEligibility = function() {
    if (this.eligibilityStatus === 'permanent') {
        return;
    }

    if (this.checkEligibility()) {
        this.eligibilityStatus = 'eligible';
        this.nextEligibleDonation = null;
    } else {
        this.eligibilityStatus = 'ineligible';
        if (this.lastDonation) {
            this.nextEligibleDonation = new Date(this.lastDonation.getTime() + (56 * 24 * 60 * 60 * 1000));
        }
    }
};

// Method to add donation
donorSchema.methods.addDonation = function(donationData) {
    this.donationHistory.push(donationData);
    this.lastDonation = donationData.date;
    this.totalDonations += 1;
    this.totalUnits += donationData.units || 1;
    this.updateEligibility();
};

// Pre-save middleware to generate donor ID
donorSchema.pre('save', async function(next) {
    if (this.isNew && !this.donorId) {
        // Generate donor ID: YYMMDD + sequential number
        const date = new Date();
        const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '');
        const count = await mongoose.model('Donor').countDocuments();
        this.donorId = `${dateStr}${(count + 1).toString().padStart(4, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Donor', donorSchema);