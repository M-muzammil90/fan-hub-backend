const mongoose = require("mongoose");

const episodeSchema = new mongoose.Schema(
  {
    season: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Season",
      required: [true, "Episode must belong to a Season"],
      index: true
    },
    series: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Series",
      required: [true, "Episode must reference parent Series"],
      index: true
    },
    episodeNumber: {
      type: Number,
      required: [true, "Episode number is required"],
      min: [1, "Episode number must be at least 1"]
    },
    title: {
      type: String,
      required: [true, "Episode title is required"],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    duration: {
      type: String,
      default: "24m",
      trim: true
    },
    thumbnail: {
      type: String,
      default: ""
    },
    thumbnailPublicId: {
      type: String,
      default: ""
    },
    videoUrl: {
      type: String,
      required: [true, "Episode video URL or media is required"],
      trim: true
    },
    videoPublicId: {
      type: String,
      default: ""
    },
    videoResourceType: {
      type: String,
      default: "video"
    },
    freePreview: {
      type: Boolean,
      default: false
    },
    releaseDate: {
      type: Date,
      default: Date.now
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

// Enforce unique episode number per season
episodeSchema.index({ season: 1, episodeNumber: 1 }, { unique: true });
episodeSchema.index({ series: 1, season: 1, episodeNumber: 1 });
episodeSchema.index({ title: "text", description: "text" });

module.exports = mongoose.model("Episode", episodeSchema);
