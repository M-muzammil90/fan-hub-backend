require("dotenv").config();
require("./config/db");

const express = require("express");
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

const app = express();

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
