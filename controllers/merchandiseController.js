const mongoose = require("mongoose");
const Merchandise = require("../models/Merchandise");
const Category = require("../models/Category");

const getMerchandise = async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) {
      if (!mongoose.Types.ObjectId.isValid(req.query.category)) {
        return res.status(400).json({ success: false, message: "Invalid category ID format" });
      }
      filter.category = req.query.category;
    }
    if (req.query.isUpcoming !== undefined) {
      filter.isUpcoming = req.query.isUpcoming === "true";
    }

    const items = await Merchandise.find(filter).populate("category", "name slug");

    return res.status(200).json({
      success: true,
      count: items.length,
      merchandise: items
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getMerchandiseById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid merchandise ID format" });
    }

    const item = await Merchandise.findById(req.params.id).populate("category", "name slug");
    if (!item) {
      return res.status(404).json({ success: false, message: "Merchandise not found" });
    }

    return res.status(200).json({ success: true, merchandise: item });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const createMerchandise = async (req, res) => {
  try {
    const { name, slug, description, category, images, tag, isUpcoming, releaseDate, viewCount } = req.body;

    if (!name || !name.trim() || !slug || !slug.trim() || !category) {
      return res.status(400).json({ success: false, message: "Name, slug, and category are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({ success: false, message: "Invalid category ID format" });
    }

    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(404).json({ success: false, message: "Referenced category not found" });
    }

    const normalizedSlug = slug.trim().toLowerCase();
    const existingSlug = await Merchandise.findOne({ slug: normalizedSlug });
    if (existingSlug) {
      return res.status(409).json({ success: false, message: "Merchandise slug already exists" });
    }

    const newItem = await Merchandise.create({
      name: name.trim(),
      slug: normalizedSlug,
      description: description ? description.trim() : "",
      category,
      images: Array.isArray(images) ? images : [],
      tag: Array.isArray(tag) ? tag : [],
      isUpcoming: isUpcoming !== undefined ? Boolean(isUpcoming) : false,
      releaseDate: releaseDate ? new Date(releaseDate) : undefined,
      viewCount: viewCount !== undefined ? Number(viewCount) : 0
    });

    const populatedItem = await Merchandise.findById(newItem._id).populate("category", "name slug");

    return res.status(201).json({
      success: true,
      message: "Merchandise created successfully",
      merchandise: populatedItem
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Merchandise slug already exists" });
    }
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const updateMerchandise = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid merchandise ID format" });
    }

    const item = await Merchandise.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Merchandise not found" });
    }

    const { name, slug, description, category, images, tag, isUpcoming, releaseDate, viewCount } = req.body;

    if (name !== undefined) {
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: "Name cannot be empty" });
      }
      item.name = name.trim();
    }

    if (slug !== undefined) {
      if (!slug || !slug.trim()) {
        return res.status(400).json({ success: false, message: "Slug cannot be empty" });
      }
      const normalizedSlug = slug.trim().toLowerCase();
      if (normalizedSlug !== item.slug) {
        const existingSlug = await Merchandise.findOne({ slug: normalizedSlug });
        if (existingSlug) {
          return res.status(409).json({ success: false, message: "Merchandise slug already exists" });
        }
        item.slug = normalizedSlug;
      }
    }

    if (category !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({ success: false, message: "Invalid category ID format" });
      }
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(404).json({ success: false, message: "Referenced category not found" });
      }
      item.category = category;
    }

    if (description !== undefined) item.description = description.trim();
    if (images !== undefined) item.images = Array.isArray(images) ? images : [];
    if (tag !== undefined) item.tag = Array.isArray(tag) ? tag : [];
    if (isUpcoming !== undefined) item.isUpcoming = Boolean(isUpcoming);
    if (releaseDate !== undefined) item.releaseDate = releaseDate ? new Date(releaseDate) : null;
    if (viewCount !== undefined) item.viewCount = Number(viewCount);

    await item.save();

    const updatedItem = await Merchandise.findById(id).populate("category", "name slug");

    return res.status(200).json({
      success: true,
      message: "Merchandise updated successfully",
      merchandise: updatedItem
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Merchandise slug already exists" });
    }
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const deleteMerchandise = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid merchandise ID format" });
    }

    const item = await Merchandise.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Merchandise not found" });
    }

    await Merchandise.findByIdAndDelete(id);

    return res.status(200).json({ success: true, message: "Merchandise deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  getMerchandise,
  getMerchandiseById,
  createMerchandise,
  updateMerchandise,
  deleteMerchandise
};

