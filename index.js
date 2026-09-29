require("dotenv").config();
require("./config/db");

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

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/characters", characterRoutes);
app.use("/api/merchandise", merchandiseRoutes);
app.use("/api/events", eventRoutes);
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

app.get("/", (req, res) => {
  res.json({
    message: "Fan Hub Plus Backend API - Ready",
    status: "Database connection active"
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
