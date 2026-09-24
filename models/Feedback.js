const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    type: {
      type: String,
      required: [true, "Feedback type is required"],
      enum: ["bug", "suggestion", "query"]
    },
    message: {
      type: String,
      required: [true, "Feedback message is required"],
      trim: true
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "resolved"],
      default: "pending"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Feedback", feedbackSchema);
