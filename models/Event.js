const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true
    },
    slug: {
      type: String,
      required: [true, "Event slug is required"],
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
      required: [true, "Event must belong to a category"]
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true
    },
    venue: {
      type: String,
      trim: true,
      default: ""
    },
    address: {
      type: String,
      trim: true,
      default: ""
    },
    latitude: {
      type: Number
    },
    longitude: {
      type: Number
    },
    startDate: {
      type: Date,
      required: [true, "Event start date is required"]
    },
    endDate: {
      type: Date
    },
    image: {
      type: String,
      default: ""
    },
    ticketUrl: {
      type: String,
      default: ""
    },
    isFeatured: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

eventSchema.index({ city: 1 });
eventSchema.index({ startDate: 1 });

module.exports = mongoose.model("Event", eventSchema);
