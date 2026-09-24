const mongoose = require("mongoose");
const Character = require("../models/Character");
const Category = require("../models/Category");
const Content = require("../models/Content");

const getCharacters = async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) {
      if (!mongoose.Types.ObjectId.isValid(req.query.category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category ID format"
        });
      }
      filter.category = req.query.category;
    }

    const characters = await Character.find(filter)
      .populate("category", "name slug")
      .populate("content", "title slug contentType");

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
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid character ID format"
      });
    }

    const character = await Character.findById(req.params.id)
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

    // Validate content references if provided
    const contentIds = Array.isArray(content) ? content : [];
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

    const newCharacter = await Character.create({
      name: name.trim(),
      slug: normalizedSlug,
      bio: bio ? bio.trim() : "",
      image: image || "",
      category,
      content: contentIds,
      tags: Array.isArray(tags) ? tags : []
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
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Character slug already exists"
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

const updateCharacter = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid character ID format"
      });
    }

    const character = await Character.findById(id);
    if (!character) {
      return res.status(404).json({
        success: false,
        message: "Character not found"
      });
    }

    const { name, slug, bio, image, category, content, tags } = req.body;

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
      const contentIds = Array.isArray(content) ? content : [];
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
    if (image !== undefined) character.image = image;
    if (tags !== undefined) character.tags = Array.isArray(tags) ? tags : [];

    await character.save();

    const updatedCharacter = await Character.findById(id)
      .populate("category", "name slug")
      .populate("content", "title slug contentType");

    return res.status(200).json({
      success: true,
      message: "Character updated successfully",
      character: updatedCharacter
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Character slug already exists" });
    }
    return res.status(500).json({ success: false, message: "Internal server error" });
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

