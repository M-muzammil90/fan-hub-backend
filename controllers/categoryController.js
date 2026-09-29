const mongoose = require("mongoose");
const Category = require("../models/Category");
const Content = require("../models/Content");
const Character = require("../models/Character");
const Merchandise = require("../models/Merchandise");
const Event = require("../models/Event");
const FanSubmission = require("../models/FanSubmission");
const cloudinaryService = require("../services/cloudinary.service");

const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
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
  let uploadedAsset = null;
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

    let finalImageUrl = image || "";
    let finalImagePublicId = "";

    if (req.file) {
      uploadedAsset = await cloudinaryService.uploadImage(req.file, {
        folder: "fan-hub-plus/categories"
      });
      finalImageUrl = uploadedAsset.url;
      finalImagePublicId = uploadedAsset.publicId;
    }

    const category = await Category.create({
      name: trimmedName,
      slug: normalizedSlug,
      description: description ? description.trim() : "",
      image: finalImageUrl,
      imagePublicId: finalImagePublicId,
      isActive: isActive !== undefined ? Boolean(isActive) : true
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      category: category
    });
  } catch (error) {
    if (uploadedAsset && uploadedAsset.publicId) {
      await cloudinaryService.deleteFile(uploadedAsset.publicId, "image");
    }
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Category with this name or slug already exists"
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
};

const updateCategory = async (req, res) => {
  let uploadedAsset = null;
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
    let oldImagePublicId = category.imagePublicId || cloudinaryService.extractPublicId(category.image)?.publicId;

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

    if (req.file) {
      uploadedAsset = await cloudinaryService.uploadImage(req.file, {
        folder: "fan-hub-plus/categories"
      });
      category.image = uploadedAsset.url;
      category.imagePublicId = uploadedAsset.publicId;
    } else if (image !== undefined) {
      category.image = image;
      if (category.image !== uploadedAsset?.url) {
        category.imagePublicId = "";
      }
    }

    if (isActive !== undefined) {
      category.isActive = Boolean(isActive);
    }

    await category.save();

    // Clean up old Cloudinary asset if replaced
    if (uploadedAsset && oldImagePublicId && oldImagePublicId !== uploadedAsset.publicId) {
      await cloudinaryService.deleteFile(oldImagePublicId, "image");
    }

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category: category
    });
  } catch (error) {
    if (uploadedAsset && uploadedAsset.publicId) {
      await cloudinaryService.deleteFile(uploadedAsset.publicId, "image");
    }
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Category with this name or slug already exists"
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
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

    // Clean up or unset dependent category references
    await Promise.all([
      Content.updateMany({ category: id }, { $unset: { category: 1 } }),
      Character.updateMany({ category: id }, { $unset: { category: 1 } }),
      Merchandise.updateMany({ category: id }, { $unset: { category: 1 } }),
      Event.updateMany({ category: id }, { $unset: { category: 1 } }),
      FanSubmission.updateMany({ category: id }, { $unset: { category: 1 } })
    ]);

    // Clean up Cloudinary asset
    const imagePublicId = category.imagePublicId || cloudinaryService.extractPublicId(category.image)?.publicId;
    if (imagePublicId) {
      await cloudinaryService.deleteFile(imagePublicId, "image");
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
