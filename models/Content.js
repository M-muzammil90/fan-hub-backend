const mongoose = require("mongoose");

const contentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Content title is required"],
      trim: true
    },
    slug: {
      type: String,
      required: [true, "Content slug is required"],
      unique: true,
      lowercase: true,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Content must belong to a category"]
    },
    contentType: {
      type: String,
      required: [true, "Content type is required"],
      enum: ["article", "video", "audio", "image", "trailer"]
    },
    genre: [
      {
        type: String,
        trim: true
      }
    ],
    releaseDate: {
      type: Date
    },
    popularityScore: {
      type: Number,
      default: 0
    },
    thumbnail: {
      type: String,
      default: ""
    },
    thumbnailPublicId: {
      type: String,
      default: ""
    },
    mediaUrl: {
      type: String,
      default: ""
    },
    mediaPublicId: {
      type: String,
      default: ""
    },
    mediaResourceType: {
      type: String,
      default: ""
    },
    tags: [
      {
        type: String,
        trim: true
      }
    ],
    isFeatured: {
      type: Boolean,
      default: false
    },
    viewCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

contentSchema.index({ category: 1 });
contentSchema.index({ contentType: 1 });
contentSchema.index({ popularityScore: -1 });
contentSchema.index({ releaseDate: -1 });
contentSchema.index({ title: "text" });

module.exports = mongoose.model("Content", contentSchema);
