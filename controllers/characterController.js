const mongoose = require("mongoose");
const Character = require("../models/Character");
const Category = require("../models/Category");
const Content = require("../models/Content");
const cloudinaryService = require("../services/cloudinary.service");

const getCharacters = async (req, res) => {
  try {
    const filter = {};

    if (req.query.category) {
      if (!mongoose.Types.ObjectId.isValid(req.query.category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category ID format in query"
        });
      }
      filter.category = req.query.category;
    }

    if (req.query.tag) {
      filter.tags = req.query.tag;
    }

    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: "i" } },
        { bio: { $regex: req.query.search, $options: "i" } }
      ];
    }

    const characters = await Character.find(filter)
      .populate("category", "name slug")
      .populate("content", "title slug contentType")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: characters.length,
      characters: characters
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

const getCharacterById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid character ID format"
      });
    }

    const character = await Character.findById(id)
      .populate("category", "name slug")
      .populate("content", "title slug contentType");

    if (!character) {
      return res.status(404).json({
        success: false,
        message: "Character not found"
      });
    }

    return res.status(200).json({
      success: true,
      character: character
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

const createCharacter = async (req, res) => {
  let uploadedAsset = null;
  try {
    const { name, slug, bio, image, category, content, tags } = req.body;

    if (!name || !name.trim() || !slug || !slug.trim() || !category) {
      return res.status(400).json({
        success: false,
        message: "Name, slug, and category are required"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID format"
      });
    }

    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(404).json({
        success: false,
        message: "Referenced category not found"
      });
    }

    const normalizedSlug = slug.trim().toLowerCase();
    const existingSlug = await Character.findOne({ slug: normalizedSlug });
    if (existingSlug) {
      return res.status(409).json({
        success: false,
        message: "Character slug already exists"
      });
    }

    // Parse content and tags if coming from multipart form data as strings
    let parsedContent = content;
    if (typeof content === "string") {
      try {
        parsedContent = JSON.parse(content);
      } catch (e) {
        parsedContent = [content];
      }
    }

    let parsedTags = tags;
    if (typeof tags === "string") {
      try {
        parsedTags = JSON.parse(tags);
      } catch (e) {
        parsedTags = tags.split(",").map((t) => t.trim());
      }
    }

    // Validate content references if provided
    const contentIds = Array.isArray(parsedContent) ? parsedContent : [];
    for (const contentId of contentIds) {
      if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return res.status(400).json({
          success: false,
          message: `Invalid content ID: ${contentId}`
        });
      }
      const contentExists = await Content.findById(contentId);
      if (!contentExists) {
        return res.status(404).json({
          success: false,
          message: `Referenced content not found: ${contentId}`
        });
      }
    }

    let finalImageUrl = image || "";
    let finalImagePublicId = "";

    if (req.file) {
      uploadedAsset = await cloudinaryService.uploadImage(req.file, {
        folder: "fan-hub-plus/characters"
      });
      finalImageUrl = uploadedAsset.url;
      finalImagePublicId = uploadedAsset.publicId;
    }

    const newCharacter = await Character.create({
      name: name.trim(),
      slug: normalizedSlug,
      bio: bio ? bio.trim() : "",
      image: finalImageUrl,
      imagePublicId: finalImagePublicId,
      category,
      content: contentIds,
      tags: Array.isArray(parsedTags) ? parsedTags : []
    });

    const populatedCharacter = await Character.findById(newCharacter._id)
      .populate("category", "name slug")
      .populate("content", "title slug contentType");

    return res.status(201).json({
      success: true,
      message: "Character created successfully",
      character: populatedCharacter
    });
  } catch (error) {
    if (uploadedAsset && uploadedAsset.publicId) {
      await cloudinaryService.deleteFile(uploadedAsset.publicId, "image");
    }
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Character slug already exists"
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
};

const updateCharacter = async (req, res) => {
  let uploadedAsset = null;
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid character ID format" });
    }

    const character = await Character.findById(id);
    if (!character) {
      return res.status(404).json({ success: false, message: "Character not found" });
    }

    const { name, slug, bio, image, category, content, tags } = req.body;
    let oldImagePublicId = character.imagePublicId || cloudinaryService.extractPublicId(character.image)?.publicId;

    if (name !== undefined) {
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: "Name cannot be empty" });
      }
      character.name = name.trim();
    }

    if (slug !== undefined) {
      if (!slug || !slug.trim()) {
        return res.status(400).json({ success: false, message: "Slug cannot be empty" });
      }
      const normalizedSlug = slug.trim().toLowerCase();
      if (normalizedSlug !== character.slug) {
        const existingSlug = await Character.findOne({ slug: normalizedSlug });
        if (existingSlug) {
          return res.status(409).json({ success: false, message: "Character slug already exists" });
        }
        character.slug = normalizedSlug;
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
      character.category = category;
    }

    if (content !== undefined) {
      let parsedContent = content;
      if (typeof content === "string") {
        try {
          parsedContent = JSON.parse(content);
        } catch (e) {
          parsedContent = [content];
        }
      }
      const contentIds = Array.isArray(parsedContent) ? parsedContent : [];
      for (const contentId of contentIds) {
        if (!mongoose.Types.ObjectId.isValid(contentId)) {
          return res.status(400).json({ success: false, message: `Invalid content ID: ${contentId}` });
        }
        const contentExists = await Content.findById(contentId);
        if (!contentExists) {
          return res.status(404).json({ success: false, message: `Referenced content not found: ${contentId}` });
        }
      }
      character.content = contentIds;
    }

    if (bio !== undefined) character.bio = bio.trim();

    if (req.file) {
      uploadedAsset = await cloudinaryService.uploadImage(req.file, {
        folder: "fan-hub-plus/characters"
      });
      character.image = uploadedAsset.url;
      character.imagePublicId = uploadedAsset.publicId;
    } else if (image !== undefined) {
      character.image = image;
      if (character.image !== uploadedAsset?.url) {
        character.imagePublicId = "";
      }
    }

    if (tags !== undefined) {
      let parsedTags = tags;
      if (typeof tags === "string") {
        try {
          parsedTags = JSON.parse(tags);
        } catch (e) {
          parsedTags = tags.split(",").map((t) => t.trim());
        }
      }
      character.tags = Array.isArray(parsedTags) ? parsedTags : [];
    }

    await character.save();

    // Clean up old Cloudinary asset if replaced
    if (uploadedAsset && oldImagePublicId && oldImagePublicId !== uploadedAsset.publicId) {
      await cloudinaryService.deleteFile(oldImagePublicId, "image");
    }

    const updatedCharacter = await Character.findById(id)
      .populate("category", "name slug")
      .populate("content", "title slug contentType");

    return res.status(200).json({
      success: true,
      message: "Character updated successfully",
      character: updatedCharacter
    });
  } catch (error) {
    if (uploadedAsset && uploadedAsset.publicId) {
      await cloudinaryService.deleteFile(uploadedAsset.publicId, "image");
    }
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Character slug already exists" });
    }
    return res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

const deleteCharacter = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid character ID format" });
    }

    const character = await Character.findById(id);
    if (!character) {
      return res.status(404).json({ success: false, message: "Character not found" });
    }

    const imagePublicId = character.imagePublicId || cloudinaryService.extractPublicId(character.image)?.publicId;
    if (imagePublicId) {
      await cloudinaryService.deleteFile(imagePublicId, "image");
    }

    await Character.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Character deleted successfully"
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  getCharacters,
  getCharacterById,
  createCharacter,
  updateCharacter,
  deleteCharacter
};
