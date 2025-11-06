const mongoose = require('mongoose');
const User = require('./models/User');
const Donor = require('./models/Donor');
const BloodInventory = require('./models/BloodInventory');
const Request = require('./models/Request');
const UserActivity = require('./models/UserActivity');
require('dotenv').config();

async function seedDatabase() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lifeflow_blood_bank');
        console.log('Connected to MongoDB for seeding');

        // Clear existing data
        await User.deleteMany({});
        await Donor.deleteMany({});
        await BloodInventory.deleteMany({});
        await Request.deleteMany({});
        await UserActivity.deleteMany({});

        // Create demo users
        const users = await User.insertMany([
            {
                firstName: 'John',
                lastName: 'Admin',
                email: 'admin@lifeflow.com',
                password: 'admin123',
                role: 'admin',
                bloodType: 'O+',
                phone: '+1234567890'
            },
            {
                firstName: 'Jane',
                lastName: 'Staff',
                email: 'staff@lifeflow.com',
                password: 'staff123',
                role: 'staff',
                bloodType: 'A+',
                phone: '+1234567891'
            },
            {
                firstName: 'Alice',
                lastName: 'Johnson',
                email: 'alice@example.com',
                password: 'password123',
                role: 'donor',
                bloodType: 'B+',
                phone: '+1234567892'
            },
            {
                firstName: 'Bob',
                lastName: 'Smith',
                email: 'bob@example.com',
                password: 'password123',
                role: 'donor',
                bloodType: 'O-',
                phone: '+1234567893'
            },
            {
                firstName: 'Charlie',
                lastName: 'Brown',
                email: 'charlie@example.com',
                password: 'password123',
                role: 'donor',
                bloodType: 'AB+',
                phone: '+1234567896'
            }
        ]);

        console.log('Created demo users');

        // Create donors
        const donors = await Donor.insertMany([
            {
                donorId: 'D001',
                user: users[2]._id,
                bloodType: 'B+',
                eligibilityStatus: 'eligible',
                contactInfo: {
                    email: 'alice@example.com',
                    phone: '+1234567892'
                },
                emergencyContact: {
                    name: 'Charlie Johnson',
                    phone: '+1234567894',
                    relationship: 'Brother'
                }
            },
            {
                donorId: 'D002',
                user: users[3]._id,
                bloodType: 'O-',
                eligibilityStatus: 'eligible',
                contactInfo: {
                    email: 'bob@example.com',
                    phone: '+1234567893'
                },
                emergencyContact: {
                    name: 'Diana Smith',
                    phone: '+1234567895',
                    relationship: 'Wife'
                }
            },
            {
                donorId: 'D003',
                user: users[4]._id,
                bloodType: 'AB+',
                eligibilityStatus: 'eligible',
                contactInfo: {
                    email: 'charlie@example.com',
                    phone: '+1234567896'
                },
                emergencyContact: {
                    name: 'Eve Brown',
                    phone: '+1234567897',
                    relationship: 'Sister'
                }
            }
        ]);

        console.log('Created demo donors');

        // Create blood inventory
        const bloodUnits = [];
        const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
        const locations = ['main_bank', 'satellite_1'];

        for (let i = 0; i < 50; i++) {
            const bloodType = bloodTypes[Math.floor(Math.random() * bloodTypes.length)];
            const location = locations[Math.floor(Math.random() * locations.length)];
            const donor = donors[Math.floor(Math.random() * donors.length)];

            // Set expiration date (35-42 days from now)
            const expirationDays = 35 + Math.floor(Math.random() * 8);
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + expirationDays);

            // Generate serial number
            const serialNumber = `BB${(i + 1).toString().padStart(3, '0')}`;

            bloodUnits.push({
                serialNumber,
                bloodType,
                component: 'whole_blood',
                units: 1,
                location,
                donor: donor._id,
                collectionDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
                expirationDate,
                status: 'available'
            });
        }

        await BloodInventory.insertMany(bloodUnits);
        console.log('Created demo blood inventory');

        // Create requests
        const date = new Date();
        const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '');
        const requests = await Request.insertMany([
            {
                requestId: `REQ${dateStr}0001`,
                requester: users[1]._id, // staff user
                patient: {
                    name: 'John Doe',
                    age: 45,
                    gender: 'male',
                    diagnosis: 'Surgery',
                    ward: 'Surgery Ward',
                    bedNumber: '101'
                },
                institution: {
                    name: 'City General Hospital',
                    type: 'hospital',
                    address: {
                        street: '123 Main St',
                        city: 'Anytown',
                        state: 'State',
                        zipCode: '12345',
                        phone: '+1234567898'
                    }
                },
                bloodRequirements: [{
                    bloodType: 'O+',
                    component: 'whole_blood',
                    units: 2,
                    urgency: 'urgent',
                    specialRequirements: 'Cross-matched'
                }],
                priority: 'high',
                requiredBy: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
                status: 'approved',
                notes: 'Emergency surgery requirement'
            },
            {
                requestId: `REQ${dateStr}0002`,
                requester: users[1]._id,
                patient: {
                    name: 'Jane Smith',
                    age: 32,
                    gender: 'female',
                    diagnosis: 'Anemia',
                    ward: 'Hematology',
                    bedNumber: '205'
                },
                institution: {
                    name: 'Regional Medical Center',
                    type: 'hospital',
                    address: {
                        street: '456 Health Ave',
                        city: 'Anytown',
                        state: 'State',
                        zipCode: '12346',
                        phone: '+1234567899'
                    }
                },
                bloodRequirements: [{
                    bloodType: 'A-',
                    component: 'red_cells',
                    units: 1,
                    urgency: 'routine'
                }],
                priority: 'medium',
                requiredBy: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
                status: 'pending',
                notes: 'Regular transfusion'
            },
            {
                requestId: `REQ${dateStr}0003`,
                requester: users[1]._id,
                patient: {
                    name: 'Mike Johnson',
                    age: 28,
                    gender: 'male',
                    diagnosis: 'Trauma',
                    ward: 'Emergency',
                    bedNumber: 'ER-3'
                },
                institution: {
                    name: 'Emergency Care Unit',
                    type: 'emergency',
                    address: {
                        street: '789 Urgent St',
                        city: 'Anytown',
                        state: 'State',
                        zipCode: '12347',
                        phone: '+1234567800'
                    }
                },
                bloodRequirements: [{
                    bloodType: 'B+',
                    component: 'whole_blood',
                    units: 3,
                    urgency: 'emergency'
                }],
                priority: 'critical',
                requiredBy: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
                status: 'approved',
                notes: 'Critical trauma case'
            }
        ]);

        console.log('Created demo requests');

        console.log('Database seeded successfully!');
        console.log('Demo login credentials:');
        console.log('Admin: admin@lifeflow.com / admin123');
        console.log('Staff: staff@lifeflow.com / staff123');

    } catch (error) {
        console.error('Seeding error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
    }
}

// Run seeding if this file is executed directly
if (require.main === module) {
    seedDatabase();
}

module.exports = seedDatabase;