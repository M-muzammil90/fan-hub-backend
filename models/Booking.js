const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: [true, "Event ID is required"]
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    customerName: {
      type: String,
      required: [true, "Customer full name is required"],
      trim: true
    },
    email: {
      type: String,
      required: [true, "Customer email is required"],
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: [true, "Customer phone number is required"],
      trim: true
    },
    ticketType: {
      type: String,
      default: "General Pass",
      trim: true
    },
    quantity: {
      type: Number,
      required: [true, "Ticket quantity is required"],
      min: [1, "Quantity must be at least 1"]
    },
    unitPrice: {
      type: Number,
      required: [true, "Unit price is required"],
      min: [0, "Unit price cannot be negative"]
    },
    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [0, "Total amount cannot be negative"]
    },
    bookingStatus: {
      type: String,
      enum: ["Confirmed", "Pending", "Cancelled"],
      default: "Confirmed"
    },
    bookingReference: {
      type: String,
      required: [true, "Booking reference is required"],
      unique: true,
      uppercase: true,
      trim: true
    },
    notes: {
      type: String,
      default: "",
      trim: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

bookingSchema.index({ eventId: 1 });
bookingSchema.index({ userId: 1 });
bookingSchema.index({ email: 1 });
bookingSchema.index({ bookingReference: 1 }, { unique: true });
bookingSchema.index({ bookingStatus: 1 });
bookingSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Booking", bookingSchema);
