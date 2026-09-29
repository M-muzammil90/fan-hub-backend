const mongoose = require("mongoose");

const seasonSchema = new mongoose.Schema(
  {
    series: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Series",
      required: [true, "Season must belong to a Series"],
      index: true
    },
    seasonNumber: {
      type: Number,
      required: [true, "Season number is required"],
      min: [1, "Season number must be at least 1"]
    },
    title: {
      type: String,
      trim: true,
      default: ""
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    poster: {
      type: String,
      default: ""
    },
    posterPublicId: {
      type: String,
      default: ""
    },
    releaseYear: {
      type: Number,
      default: () => new Date().getFullYear()
    },
    trailerUrl: {
      type: String,
      default: ""
    },
    isPublished: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for populated episodes
seasonSchema.virtual("episodes", {
  ref: "Episode",
  localField: "_id",
  foreignField: "season"
});

// Enforce unique season number per series
seasonSchema.index({ series: 1, seasonNumber: 1 }, { unique: true });
seasonSchema.index({ series: 1, isPublished: 1 });

module.exports = mongoose.model("Season", seasonSchema);
