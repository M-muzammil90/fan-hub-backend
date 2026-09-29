const mongoose = require("mongoose");

const seriesSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Series title is required"],
      trim: true
    },
    slug: {
      type: String,
      required: [true, "Series slug is required"],
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
      required: [true, "Series must belong to a category"]
    },
    status: {
      type: String,
      enum: ["ongoing", "completed", "upcoming"],
      default: "ongoing"
    },
    releaseYear: {
      type: Number,
      default: () => new Date().getFullYear()
    },
    poster: {
      type: String,
      default: ""
    },
    posterPublicId: {
      type: String,
      default: ""
    },
    backdrop: {
      type: String,
      default: ""
    },
    backdropPublicId: {
      type: String,
      default: ""
    },
    trailerUrl: {
      type: String,
      default: ""
    },
    genres: [
      {
        type: String,
        trim: true
      }
    ],
    tags: [
      {
        type: String,
        trim: true
      }
    ],
    rating: {
      type: Number,
      default: 0
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    isPublished: {
      type: Boolean,
      default: true
    },
    viewCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for populated seasons
seriesSchema.virtual("seasons", {
  ref: "Season",
  localField: "_id",
  foreignField: "series"
});

seriesSchema.index({ category: 1 });
seriesSchema.index({ status: 1 });
seriesSchema.index({ isFeatured: 1 });
seriesSchema.index({ isPublished: 1 });
seriesSchema.index({ title: "text", description: "text" });

module.exports = mongoose.model("Series", seriesSchema);
