const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../config/db');
const User = require('../models/User');

const seedAdmin = async () => {
  const adminName = process.env.ADMIN_NAME || 'Admin User';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error('Seed Error: ADMIN_PASSWORD environment variable is not defined in .env');
    process.exit(1);
  }

  try {
    await connectDB();

    const normalizedEmail = adminEmail.toLowerCase().trim();
    const existingAdmin = await User.findOne({ email: normalizedEmail });

    if (existingAdmin) {
      console.log(`Admin user already exists (${normalizedEmail}). Skipping seed.`);
    } else {
      // User pre-save hook hashes the password with bcryptjs
      const admin = await User.create({
        name: adminName.trim(),
        email: normalizedEmail,
        password: adminPassword,
        role: 'admin'
      });

      console.log(`Admin user seeded successfully: ${admin.name} (${admin.email}) [role: ${admin.role}]`);
    }

    await mongoose.connection.close();
    console.log('MongoDB connection closed cleanly.');
    process.exit(0);
  } catch (error) {
    console.error(`Admin seeding failed: ${error.message}`);
    process.exit(1);
  }
};

// Execute if run directly from CLI
if (require.main === module) {
  seedAdmin();
}

module.exports = seedAdmin;
