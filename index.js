require("dotenv").config();
const connectDB = require("./config/db");

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const contentRoutes = require("./routes/contentRoutes");
const characterRoutes = require("./routes/characterRoutes");
const merchandiseRoutes = require("./routes/merchandiseRoutes");
const eventRoutes = require("./routes/eventRoutes");
const fanSubmissionRoutes = require("./routes/fanSubmissionRoutes");
const adminRoutes = require("./routes/adminRoutes");
const bookmarkRoutes = require("./routes/bookmarkRoutes");
const ratingRoutes = require("./routes/ratingRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");
const mediaRoutes = require("./routes/mediaRoutes");
const seriesRoutes = require("./routes/seriesRoutes");
const seasonRoutes = require("./routes/seasonRoutes");
const episodeRoutes = require("./routes/episodeRoutes");
const watchHistoryRoutes = require("./routes/watchHistoryRoutes");
const bookingRoutes = require("./routes/bookingRoutes");

const app = express();

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://fan-hub-project.vercel.app",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, serverless)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        process.env.NODE_ENV !== "production"
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Fallback allow to avoid browser CORS blocks
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Ensure DB Connection for Serverless ──────────────────────────────────────
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("DB connection error in middleware:", err.message);
    next();
  }
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/characters", characterRoutes);
app.use("/api/merchandise", merchandiseRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/fan-submissions", fanSubmissionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/bookmarks", bookmarkRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/series", seriesRoutes);
app.use("/api/seasons", seasonRoutes);
app.use("/api/episodes", episodeRoutes);
app.use("/api/watch-history", watchHistoryRoutes);

// ── Health Check ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    message: "Fan Hub Plus Backend API — Ready ✅",
    status: "Online",
    env: process.env.NODE_ENV || "development",
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Server Error:", err.stack || err.message);
  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// ── Start Server (local / Railway / Render) ───────────────────────────────────
const PORT = process.env.PORT || 5000;

// Only listen when running directly (not when imported as Vercel serverless handler)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

// Export for Vercel serverless
module.exports = app;
