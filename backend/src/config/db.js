const mongoose = require("mongoose");
const { env } = require("./env");

async function connectDB() {
  try {
    await mongoose.connect(env.db.uri, {
      dbName: env.db.database,
    });
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB error:", err);
    process.exit(1);
  }
}

module.exports = { connectDB };
