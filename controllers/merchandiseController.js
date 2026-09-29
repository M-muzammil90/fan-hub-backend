const mongoose = require("mongoose");
const Merchandise = require("../models/Merchandise");
const Category = require("../models/Category");
const cloudinaryService = require("../services/cloudinary.service");

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
  const uploadedAssets = [];
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

    let parsedTag = tag;
    if (typeof tag === "string") {
      try {
        parsedTag = JSON.parse(tag);
      } catch (e) {
        parsedTag = tag.split(",").map((t) => t.trim()).filter(Boolean);
      }
    }

    let finalImages = [];
    let finalImagesData = [];

    if (images) {
      let parsedImages = images;
      if (typeof images === "string") {
        try {
          parsedImages = JSON.parse(images);
        } catch (e) {
          parsedImages = [images];
        }
      }
      if (Array.isArray(parsedImages)) {
        parsedImages.forEach((imgUrl) => {
          if (typeof imgUrl === "string" && imgUrl.trim()) {
            finalImages.push(imgUrl.trim());
            finalImagesData.push({
              url: imgUrl.trim(),
              publicId: cloudinaryService.extractPublicId(imgUrl.trim()),
              resourceType: "image",
              originalName: ""
            });
          }
        });
      }
    }

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      for (const file of req.files) {
        const result = await cloudinaryService.uploadImage(file, {
          folder: "fan-hub-plus/merchandise"
        });
        uploadedAssets.push(result);
        finalImages.push(result.url);
        finalImagesData.push({
          url: result.url,
          publicId: result.publicId,
          resourceType: result.resourceType,
          originalName: result.originalName
        });
      }
    }

    const newItem = await Merchandise.create({
      name: name.trim(),
      slug: normalizedSlug,
      description: description ? description.trim() : "",
      category,
      images: finalImages,
      imagesData: finalImagesData,
      tag: Array.isArray(parsedTag) ? parsedTag : [],
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
    if (uploadedAssets.length > 0) {
      const pids = uploadedAssets.map((a) => a.publicId);
      await cloudinaryService.deleteFiles(pids, "image");
    }
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Merchandise slug already exists" });
    }
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const updateMerchandise = async (req, res) => {
  const uploadedAssets = [];
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

    if (tag !== undefined) {
      let parsedTag = tag;
      if (typeof tag === "string") {
        try {
          parsedTag = JSON.parse(tag);
        } catch (e) {
          parsedTag = tag.split(",").map((t) => t.trim()).filter(Boolean);
        }
      }
      item.tag = Array.isArray(parsedTag) ? parsedTag : [];
    }

    if (isUpcoming !== undefined) item.isUpcoming = Boolean(isUpcoming);
    if (releaseDate !== undefined) item.releaseDate = releaseDate ? new Date(releaseDate) : null;
    if (viewCount !== undefined) item.viewCount = Number(viewCount);

    let updatedImages = [...(item.images || [])];
    let updatedImagesData = [...(item.imagesData || [])];

    if (images !== undefined) {
      let parsedImages = images;
      if (typeof images === "string") {
        try {
          parsedImages = JSON.parse(images);
        } catch (e) {
          parsedImages = [images];
        }
      }
      if (Array.isArray(parsedImages)) {
        updatedImages = parsedImages.filter((img) => typeof img === "string" && img.trim());
        updatedImagesData = updatedImages.map((imgUrl) => {
          const existingData = (item.imagesData || []).find((d) => d.url === imgUrl);
          if (existingData) return existingData;
          return {
            url: imgUrl,
            publicId: cloudinaryService.extractPublicId(imgUrl),
            resourceType: "image",
            originalName: ""
          };
        });
      }
    }

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      for (const file of req.files) {
        const result = await cloudinaryService.uploadImage(file, {
          folder: "fan-hub-plus/merchandise"
        });
        uploadedAssets.push(result);
        updatedImages.push(result.url);
        updatedImagesData.push({
          url: result.url,
          publicId: result.publicId,
          resourceType: result.resourceType,
          originalName: result.originalName
        });
      }
    }

    // Determine removed Cloudinary images to clean up
    const newPublicIds = updatedImagesData.map((d) => d.publicId).filter(Boolean);
    const oldPublicIds = (item.imagesData || []).map((d) => d.publicId).filter(Boolean);
    const pidsToDelete = oldPublicIds.filter((pid) => !newPublicIds.includes(pid));

    item.images = updatedImages;
    item.imagesData = updatedImagesData;

    await item.save();

    if (pidsToDelete.length > 0) {
      await cloudinaryService.deleteFiles(pidsToDelete, "image");
    }

    const updatedItem = await Merchandise.findById(id).populate("category", "name slug");

    return res.status(200).json({
      success: true,
      message: "Merchandise updated successfully",
      merchandise: updatedItem
    });
  } catch (error) {
    if (uploadedAssets.length > 0) {
      const pids = uploadedAssets.map((a) => a.publicId);
      await cloudinaryService.deleteFiles(pids, "image");
    }
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

    const pidsToDelete = [];
    if (item.imagesData && item.imagesData.length > 0) {
      item.imagesData.forEach((d) => {
        if (d.publicId) pidsToDelete.push(d.publicId);
      });
    } else if (item.images && item.images.length > 0) {
      item.images.forEach((url) => {
        const extracted = cloudinaryService.extractPublicId(url);
        if (extracted) pidsToDelete.push(extracted);
      });
    }

    if (pidsToDelete.length > 0) {
      await cloudinaryService.deleteFiles(pidsToDelete, "image");
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

