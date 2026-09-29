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
    eventType: {
      type: String,
      enum: [
        "Convention",
        "Meetup",
        "Screening",
        "Premiere",
        "Release",
        "Gaming Event",
        "Cosplay Event",
        "Fan Gathering"
      ],
      default: "Convention"
    },
    startDate: {
      type: Date,
      required: [true, "Event start date is required"]
    },
    endDate: {
      type: Date
    },
    startTime: {
      type: String,
      trim: true,
      default: "06:00 PM"
    },
    endTime: {
      type: String,
      trim: true,
      default: "10:00 PM"
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
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true
    },
    latitude: {
      type: Number
    },
    longitude: {
      type: Number
    },
    organizer: {
      type: String,
      trim: true,
      default: "FanHub Community"
    },
    ticketUrl: {
      type: String,
      trim: true,
      default: ""
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
      enum: ["Upcoming", "Ongoing", "Completed", "Cancelled"],
      default: "Upcoming"
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

eventSchema.virtual("coverImage").get(function () {
  return this.image;
});

eventSchema.index({ city: 1 });
eventSchema.index({ eventType: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ startDate: 1 });
eventSchema.index({ isFeatured: 1 });
eventSchema.index({ isPublished: 1 });

module.exports = mongoose.model("Event", eventSchema);
