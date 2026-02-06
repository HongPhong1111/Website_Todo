const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/User");
const { env } = require("../config/env");

async function seedAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(env.db.uri, {
      dbName: env.db.database,
    });
    console.log("✅ Connected to MongoDB for seeding");

    const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@todo.local";
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || "admin123";
    const adminFullName = process.env.SEED_ADMIN_NAME || "System Administrator";

    // Check if admin already exists
    let admin = await User.findOne({ email: adminEmail });

    if (admin) {
      // Update existing admin
      admin.role = "admin";
      admin.isActive = true;
      admin.fullName = adminFullName;

      // Update password if provided and different
      if (adminPassword !== "admin123") {
        const passwordHash = await bcrypt.hash(adminPassword, 10);
        admin.passwordHash = passwordHash;
      }

      await admin.save();
      console.log(`✅ Admin user updated: ${adminEmail}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Status: ${admin.isActive ? "Active" : "Inactive"}`);
    } else {
      // Create new admin
      const passwordHash = await bcrypt.hash(adminPassword, 10);

      admin = await User.create({
        email: adminEmail,
        passwordHash,
        fullName: adminFullName,
        provider: "local",
        role: "admin",
        isActive: true,
      });

      console.log(`✅ Admin user created: ${adminEmail}`);
      console.log(`   ID: ${admin._id}`);
      console.log(`   Password: ${adminPassword}`);
    }

    // Display admin info
    console.log("\n📋 ADMIN ACCOUNT INFO:");
    console.log("=".repeat(40));
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log(`Role: ${admin.role}`);
    console.log(`ID: ${admin._id}`);
    console.log("=".repeat(40));
    console.log(
      "\n⚠️  IMPORTANT: Change the default password after first login!",
    );
  } catch (error) {
    console.error("❌ Error seeding admin:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log("\n✅ MongoDB connection closed");
  }
}

// Run seed function
seedAdmin().catch((error) => {
  console.error("❌ Failed to seed admin:", error);
  process.exit(1);
});
