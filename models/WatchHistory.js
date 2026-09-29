const mongoose = require("mongoose");

const watchHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    series: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Series",
      required: true,
      index: true
    },
    season: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Season",
      required: true
    },
    episode: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Episode",
      required: true
    },
    progressSeconds: {
      type: Number,
      default: 0
    },
    totalDuration: {
      type: Number,
      default: 0
    },
    completed: {
      type: Boolean,
      default: false
    },
    lastWatchedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Unique per user + series + episode so we track progress per episode
watchHistorySchema.index({ user: 1, series: 1, episode: 1 }, { unique: true });
watchHistorySchema.index({ user: 1, lastWatchedAt: -1 });

module.exports = mongoose.model("WatchHistory", watchHistorySchema);
