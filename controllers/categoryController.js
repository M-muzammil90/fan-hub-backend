const mongoose = require("mongoose");
const Category = require("../models/Category");
const Content = require("../models/Content");
const Character = require("../models/Character");
const Merchandise = require("../models/Merchandise");
const Event = require("../models/Event");
const FanSubmission = require("../models/FanSubmission");

const getCategories = async (req, res) => {
  try {
    const filter = {};
    if (req.query.all !== "true") {
      filter.isActive = true;
    }

    const categories = await Category.find(filter);
    return res.status(200).json({
      success: true,
      count: categories.length,
      categories: categories
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

const getCategoryById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID format"
      });
    }

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    return res.status(200).json({
      success: true,
      category: category
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, slug, description, image, isActive } = req.body;

    if (!name || !name.trim() || !slug || !slug.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name and slug are required"
      });
    }

    const trimmedName = name.trim();
    const normalizedSlug = slug.trim().toLowerCase();

    const existingName = await Category.findOne({ name: trimmedName });
    if (existingName) {
      return res.status(409).json({
        success: false,
        message: "Category with this name already exists"
      });
    }

    const existingSlug = await Category.findOne({ slug: normalizedSlug });
    if (existingSlug) {
      return res.status(409).json({
        success: false,
        message: "Category slug already exists"
      });
    }

    const category = await Category.create({
      name: trimmedName,
      slug: normalizedSlug,
      description: description ? description.trim() : "",
      image: image || "",
      isActive: isActive !== undefined ? Boolean(isActive) : true
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      category: category
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Category with this name or slug already exists"
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID format"
      });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    const { name, slug, description, image, isActive } = req.body;

    if (name !== undefined) {
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Category name cannot be empty"
        });
      }
      const trimmedName = name.trim();
      if (trimmedName !== category.name) {
        const existingName = await Category.findOne({ name: trimmedName });
        if (existingName) {
          return res.status(409).json({
            success: false,
            message: "Category with this name already exists"
          });
        }
        category.name = trimmedName;
      }
    }

    if (slug !== undefined) {
      if (!slug || !slug.trim()) {
        return res.status(400).json({
          success: false,
          message: "Category slug cannot be empty"
        });
      }
      const normalizedSlug = slug.trim().toLowerCase();
      if (normalizedSlug !== category.slug) {
        const existingSlug = await Category.findOne({ slug: normalizedSlug });
        if (existingSlug) {
          return res.status(409).json({
            success: false,
            message: "Category slug already exists"
          });
        }
        category.slug = normalizedSlug;
      }
    }

    if (description !== undefined) {
      category.description = description.trim();
    }

    if (image !== undefined) {
      category.image = image;
    }

    if (isActive !== undefined) {
      category.isActive = Boolean(isActive);
    }

    await category.save();

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category: category
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Category with this name or slug already exists"
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID format"
      });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    const [contentCount, characterCount, merchCount, eventCount, fanSubCount] = await Promise.all([
      Content.countDocuments({ category: id }),
      Character.countDocuments({ category: id }),
      Merchandise.countDocuments({ category: id }),
      Event.countDocuments({ category: id }),
      FanSubmission.countDocuments({ category: id })
    ]);

    const totalReferences = contentCount + characterCount + merchCount + eventCount + fanSubCount;
    if (totalReferences > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete category: referenced by ${totalReferences} dependent item(s)`
      });
    }

    await Category.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};

