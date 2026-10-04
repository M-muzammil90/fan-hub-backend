const mongoose = require("mongoose");

let isConnected = false;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    return mongoose.connection;
  }

  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    const err = new Error("MONGO_URI environment variable is not defined.");
    console.error("⚠️", err.message);
    throw err;
  }

  try {
    const db = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    isConnected = db.connections[0].readyState === 1;
    console.log("✅ MongoDB Connected successfully");
    return db;
  } catch (error) {
    isConnected = false;
    console.error("❌ MongoDB Connection Error:", error.message);
    throw error;
  }
};

// Initial connection attempt (non-fatal if it fails — per-request middleware retries)
connectDB().catch((err) => console.error("Initial DB connect error:", err.message));

module.exports = connectDB;
