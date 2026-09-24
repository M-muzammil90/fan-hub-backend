const mongoose = require("mongoose");

const characterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Character name is required"],
      trim: true
    },
    slug: {
      type: String,
      required: [true, "Character slug is required"],
      unique: true,
      lowercase: true,
      trim: true
    },
    bio: {
      type: String,
      trim: true,
      default: ""
    },
    image: {
      type: String,
      default: ""
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Character must belong to a category"]
    },
    content: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Content"
      }
    ],
    tags: [
      {
        type: String,
        trim: true
      }
    ]
  },
  {
    timestamps: true
  }
);

characterSchema.index({ category: 1 });

module.exports = mongoose.model("Character", characterSchema);
