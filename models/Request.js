const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
    requestId: {
        type: String,
        unique: true,
        required: true
    },
    requester: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    patient: {
        name: {
            type: String,
            required: true
        },
        age: Number,
        gender: {
            type: String,
            enum: ['male', 'female', 'other']
        },
        medicalRecordNumber: String,
        diagnosis: String,
        ward: String,
        bedNumber: String
    },
    institution: {
        name: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ['hospital', 'clinic', 'emergency', 'surgical_center', 'other'],
            default: 'hospital'
        },
        address: {
            street: String,
            city: String,
            state: String,
            zipCode: String,
            phone: String
        },
        licenseNumber: String
    },
    bloodRequirements: [{
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
            min: 1
        },
        unitsFulfilled: {
            type: Number,
            default: 0
        },
        urgency: {
            type: String,
            enum: ['routine', 'urgent', 'emergency'],
            default: 'routine'
        },
        specialRequirements: String,
        crossmatchRequired: {
            type: Boolean,
            default: true
        }
    }],
    status: {
        type: String,
        enum: ['pending', 'approved', 'partially_fulfilled', 'fulfilled', 'cancelled', 'rejected'],
        default: 'pending'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    requestedDate: {
        type: Date,
        default: Date.now
    },
    requiredBy: {
        type: Date,
        required: true
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedDate: Date,
    fulfilledDate: Date,
    cancelledDate: Date,
    cancellationReason: String,
    rejectionReason: String,
    assignedUnits: [{
        inventory: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'BloodInventory',
            required: true
        },
        bloodType: String,
        component: String,
        units: Number,
        issuedDate: Date,
        issuedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        status: {
            type: String,
            enum: ['assigned', 'issued', 'returned'],
            default: 'assigned'
        },
        returnDate: Date,
        returnReason: String
    }],
    notes: String,
    followUp: {
        required: Boolean,
        date: Date,
        notes: String
    },
    transportation: {
        required: Boolean,
        method: {
            type: String,
            enum: ['courier', 'ambulance', 'pickup', 'other']
        },
        trackingNumber: String,
        deliveredDate: Date,
        deliveredBy: String
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
requestSchema.index({ status: 1, priority: 1 });
requestSchema.index({ 'institution.name': 1 });
requestSchema.index({ requiredBy: 1 });
requestSchema.index({ 'bloodRequirements.bloodType': 1 });

// Virtual for total units requested
requestSchema.virtual('totalUnitsRequested').get(function() {
    return this.bloodRequirements.reduce((total, req) => total + req.units, 0);
});

// Virtual for total units fulfilled
requestSchema.virtual('totalUnitsFulfilled').get(function() {
    return this.bloodRequirements.reduce((total, req) => total + req.unitsFulfilled, 0);
});

// Virtual for fulfillment percentage
requestSchema.virtual('fulfillmentPercentage').get(function() {
    const requested = this.totalUnitsRequested;
    const fulfilled = this.totalUnitsFulfilled;
    return requested > 0 ? Math.round((fulfilled / requested) * 100) : 0;
});

// Virtual for days until required
requestSchema.virtual('daysUntilRequired').get(function() {
    const now = new Date();
    const required = new Date(this.requiredBy);
    const diffTime = required - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
});

// Method to check if request is urgent
requestSchema.methods.isUrgent = function() {
    return this.priority === 'high' || this.priority === 'critical' ||
           this.bloodRequirements.some(req => req.urgency === 'emergency');
};

// Method to assign blood units
requestSchema.methods.assignBlood = function(inventoryId, units, assignedBy) {
    const assignment = {
        inventory: inventoryId,
        units: units,
        issuedDate: new Date(),
        issuedBy: assignedBy,
        status: 'assigned'
    };

    this.assignedUnits.push(assignment);

    // Update fulfilled units for the corresponding blood requirement
    // This is a simplified version - in practice, you'd match by blood type and component
    const bloodReq = this.bloodRequirements.find(req =>
        req.bloodType === inventoryId.bloodType && req.component === inventoryId.component
    );

    if (bloodReq) {
        bloodReq.unitsFulfilled += units;
    }

    this.updateStatus();
};

// Method to update request status based on fulfillment
requestSchema.methods.updateStatus = function() {
    const totalRequested = this.totalUnitsRequested;
    const totalFulfilled = this.totalUnitsFulfilled;

    if (totalFulfilled === 0) {
        this.status = 'pending';
    } else if (totalFulfilled < totalRequested) {
        this.status = 'partially_fulfilled';
    } else if (totalFulfilled >= totalRequested) {
        this.status = 'fulfilled';
        this.fulfilledDate = new Date();
    }
};

// Method to cancel request
requestSchema.methods.cancel = function(reason, cancelledBy) {
    this.status = 'cancelled';
    this.cancelledDate = new Date();
    this.cancellationReason = reason;

    // Return assigned units
    this.assignedUnits.forEach(assignment => {
        if (assignment.status === 'assigned') {
            assignment.status = 'returned';
            assignment.returnDate = new Date();
            assignment.returnReason = 'Request cancelled';
        }
    });
};

// Pre-save middleware to generate request ID
requestSchema.pre('save', async function(next) {
    if (this.isNew && !this.requestId) {
        // Generate request ID: REQ + YYMMDD + sequential number
        const date = new Date();
        const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '');
        const count = await mongoose.model('Request').countDocuments();
        this.requestId = `REQ${dateStr}${(count + 1).toString().padStart(4, '0')}`;
    }
    next();
});

// Static method to get urgent requests
requestSchema.statics.getUrgentRequests = async function() {
    return await this.find({
        status: { $in: ['pending', 'approved', 'partially_fulfilled'] },
        $or: [
            { priority: { $in: ['high', 'critical'] } },
            { 'bloodRequirements.urgency': 'emergency' },
            { requiredBy: { $lte: new Date(Date.now() + 24 * 60 * 60 * 1000) } } // Due within 24 hours
        ]
    })
    .populate('requester', 'firstName lastName')
    .populate('institution')
    .sort({ priority: -1, requiredBy: 1 });
};

// Static method to get requests by blood type
requestSchema.statics.getRequestsByBloodType = async function(bloodType) {
    return await this.find({
        'bloodRequirements.bloodType': bloodType,
        status: { $in: ['pending', 'approved', 'partially_fulfilled'] }
    })
    .populate('requester', 'firstName lastName')
    .sort({ requiredBy: 1 });
};

module.exports = mongoose.model('Request', requestSchema);