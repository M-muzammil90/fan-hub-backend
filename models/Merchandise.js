const mongoose = require("mongoose");

const merchandiseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Merchandise name is required"],
      trim: true
    },
    slug: {
      type: String,
      required: [true, "Merchandise slug is required"],
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
      required: [true, "Merchandise must belong to a category"]
    },
    images: [
      {
        type: String
      }
    ],
    imagesData: [
      {
        url: { type: String, default: "" },
        publicId: { type: String, default: "" },
        resourceType: { type: String, default: "image" },
        originalName: { type: String, default: "" }
      }
    ],
    tag: [
      {
        type: String,
        trim: true
      }
    ],
    isUpcoming: {
      type: Boolean,
      default: false
    },
    releaseDate: {
      type: Date
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

merchandiseSchema.index({ category: 1 });
merchandiseSchema.index({ isUpcoming: 1 });

module.exports = mongoose.model("Merchandise", merchandiseSchema);
