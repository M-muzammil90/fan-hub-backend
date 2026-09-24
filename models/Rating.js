const mongoose = require("mongoose");

const ratingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"]
    },
    content: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Content",
      required: [true, "Content reference is required"]
    },
    rating: {
      type: Number,
      required: [true, "Rating score is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"]
    }
  },
  {
    timestamps: true
  }
);

ratingSchema.index({ user: 1, content: 1 }, { unique: true });

module.exports = mongoose.model("Rating", ratingSchema);
