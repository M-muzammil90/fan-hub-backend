const mongoose = require("mongoose");

let isConnected = false;

const connectDB = async () => {
  if (isConnected || mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.warn("⚠️ Warning: MONGO_URI or MONGODB_URI environment variable is not defined.");
    return null;
  }

  try {
    const db = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = db.connections[0].readyState === 1;
    console.log("✅ MongoDB Connected successfully");
    return db;
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    // Do NOT call process.exit(1) here — the per-request middleware will retry.
    // Calling process.exit crashes the server even when MongoDB becomes available shortly after.
  }
};

// Initial connection attempt (non-fatal if it fails — per-request middleware retries)
connectDB().catch((err) => console.error("Initial DB connect error:", err.message));

module.exports = connectDB;
