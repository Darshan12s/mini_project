const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: function() { return this.role !== 'donor'; },
        minlength: 6
    },
    role: {
        type: String,
        enum: ['admin', 'staff', 'donor'],
        default: 'staff'
    },
    phone: {
        type: String,
        trim: true
    },
    bloodType: {
        type: String,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    },
    dateOfBirth: {
        type: Date
    },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: {
            type: String,
            default: 'USA'
        }
    },
    emergencyContact: {
        name: String,
        phone: String,
        relationship: String
    },
    medicalHistory: {
        allergies: [String],
        medications: [String],
        conditions: [String],
        lastPhysicalExam: Date
    },
    donationHistory: [{
        date: {
            type: Date,
            default: Date.now
        },
        bloodType: {
            type: String,
            enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
        },
        units: {
            type: Number,
            default: 1
        },
        location: String,
        notes: String
    }],
    eligibilityStatus: {
        type: String,
        enum: ['eligible', 'ineligible', 'deferred'],
        default: 'eligible'
    },
    lastDonation: {
        type: Date
    },
    nextEligibleDonation: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    },
    profileImage: {
        type: String // URL to profile image
    },
    preferences: {
        notifications: {
            email: { type: Boolean, default: true },
            sms: { type: Boolean, default: false },
            push: { type: Boolean, default: true }
        },
        language: {
            type: String,
            default: 'en'
        },
        theme: {
            type: String,
            enum: ['light', 'dark'],
            default: 'light'
        }
    }
}, {
    timestamps: true
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Virtual for age
userSchema.virtual('age').get(function() {
    if (!this.dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Update eligibility status based on donation history
userSchema.methods.updateEligibility = function() {
    if (!this.lastDonation) {
        this.eligibilityStatus = 'eligible';
        this.nextEligibleDonation = null;
        return;
    }

    const now = new Date();
    const daysSinceLastDonation = Math.floor((now - this.lastDonation) / (1000 * 60 * 60 * 24));

    // Standard eligibility: 56 days (8 weeks) between donations
    if (daysSinceLastDonation < 56) {
        this.eligibilityStatus = 'ineligible';
        this.nextEligibleDonation = new Date(this.lastDonation.getTime() + (56 * 24 * 60 * 60 * 1000));
    } else {
        this.eligibilityStatus = 'eligible';
        this.nextEligibleDonation = null;
    }
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
    const userObject = this.toObject();
    delete userObject.password;
    return userObject;
};

module.exports = mongoose.model('User', userSchema);