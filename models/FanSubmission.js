const mongoose = require("mongoose");

const fanSubmissionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"]
    },
    title: {
      type: String,
      required: [true, "Submission title is required"],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    content: {
      type: String,
      required: [true, "Submission content is required"],
      trim: true
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category reference is required"]
    },
    image: {
      type: String,
      default: ""
    },
    imagePublicId: {
      type: String,
      default: ""
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    adminNote: {
      type: String,
      trim: true,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

fanSubmissionSchema.index({ status: 1 });

module.exports = mongoose.model("FanSubmission", fanSubmissionSchema);
