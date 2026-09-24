const mongoose = require("mongoose");

const bookmarkSchema = new mongoose.Schema(
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
    note: {
      type: String,
      trim: true,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

bookmarkSchema.index({ user: 1, content: 1 }, { unique: true });

module.exports = mongoose.model("Bookmark", bookmarkSchema);
