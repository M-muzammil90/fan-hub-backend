const mongoose = require("mongoose");
const Content = require("../models/Content");
const Category = require("../models/Category");
const Bookmark = require("../models/Bookmark");
const Rating = require("../models/Rating");

const getContent = async (req, res) => {
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

    if (req.query.contentType) {
      filter.contentType = req.query.contentType;
    }

    if (req.query.genre) {
      filter.genre = { $regex: req.query.genre, $options: "i" };
    }

    if (req.query.year) {
      const yearNumber = parseInt(req.query.year, 10);
      if (isNaN(yearNumber)) {
        return res.status(400).json({
          success: false,
          message: "Invalid year format"
        });
      }
      const startDate = new Date(Date.UTC(yearNumber, 0, 1));
      const endDate = new Date(Date.UTC(yearNumber + 1, 0, 1));
      filter.releaseDate = { $gte: startDate, $lt: endDate };
    }

    if (req.query.search) {
      filter.title = { $regex: req.query.search, $options: "i" };
    }

    let sortOptions = {};

    if (req.query.sortBy) {
      const allowedSortBy = ["latest", "popular", "alphabetical"];
      if (!allowedSortBy.includes(req.query.sortBy)) {
        return res.status(400).json({
          success: false,
          message: `Invalid sortBy option. Allowed options: ${allowedSortBy.join(", ")}`
        });
      }

      if (req.query.sortBy === "latest") {
        sortOptions = { releaseDate: -1, createdAt: -1 };
      } else if (req.query.sortBy === "popular") {
        sortOptions = { popularityScore: -1, viewCount: -1 };
      } else if (req.query.sortBy === "alphabetical") {
        sortOptions = { title: 1 };
      }
    }

    const contentList = await Content.find(filter)
      .sort(sortOptions)
      .populate("category", "name slug");

    const contentIds = contentList.map((c) => c._id);
    const ratingStats = await Rating.aggregate([
      { $match: { content: { $in: contentIds } } },
      {
        $group: {
          _id: "$content",
          averageRating: { $avg: "$rating" },
          totalRatings: { $sum: 1 }
        }
      }
    ]);

    const ratingMap = {};
    ratingStats.forEach((stat) => {
      ratingMap[stat._id.toString()] = {
        averageRating: Math.round(stat.averageRating * 10) / 10,
        totalRatings: stat.totalRatings
      };
    });

    const contentWithRatings = contentList.map((item) => {
      const itemObj = item.toObject();
      const stats = ratingMap[item._id.toString()] || { averageRating: 0, totalRatings: 0 };
      return {
        ...itemObj,
        averageRating: stats.averageRating,
        totalRatings: stats.totalRatings
      };
    });

    return res.status(200).json({
      success: true,
      count: contentWithRatings.length,
      content: contentWithRatings
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

const getContentById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid content ID format"
      });
    }

    const content = await Content.findById(req.params.id).populate("category", "name slug");
    if (!content) {
      return res.status(404).json({
        success: false,
        message: "Content not found"
      });
    }

    const ratingStats = await Rating.aggregate([
      { $match: { content: content._id } },
      {
        $group: {
          _id: "$content",
          averageRating: { $avg: "$rating" },
          totalRatings: { $sum: 1 }
        }
      }
    ]);

    const stats = ratingStats.length > 0
      ? {
          averageRating: Math.round(ratingStats[0].averageRating * 10) / 10,
          totalRatings: ratingStats[0].totalRatings
        }
      : { averageRating: 0, totalRatings: 0 };

    const contentWithRatings = {
      ...content.toObject(),
      averageRating: stats.averageRating,
      totalRatings: stats.totalRatings
    };

    return res.status(200).json({
      success: true,
      content: contentWithRatings
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

const createContent = async (req, res) => {
  try {
    const {
      title,
      slug,
      description,
      category,
      contentType,
      genre,
      releaseDate,
      popularityScore,
      thumbnail,
      mediaUrl,
      tags,
      isFeatured,
      viewCount
    } = req.body;

    if (!title || !title.trim() || !slug || !slug.trim() || !category || !contentType) {
      return res.status(400).json({
        success: false,
        message: "Title, slug, category, and contentType are required"
      });
    }

    const allowedTypes = ["article", "video", "audio", "image", "trailer"];
    if (!allowedTypes.includes(contentType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid contentType. Allowed: ${allowedTypes.join(", ")}`
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
    const existingSlug = await Content.findOne({ slug: normalizedSlug });
    if (existingSlug) {
      return res.status(409).json({
        success: false,
        message: "Content slug already exists"
      });
    }

    const newContent = await Content.create({
      title: title.trim(),
      slug: normalizedSlug,
      description: description ? description.trim() : "",
      category,
      contentType,
      genre: Array.isArray(genre) ? genre : [],
      releaseDate: releaseDate ? new Date(releaseDate) : undefined,
      popularityScore: popularityScore !== undefined ? Number(popularityScore) : 0,
      thumbnail: thumbnail || "",
      mediaUrl: mediaUrl || "",
      tags: Array.isArray(tags) ? tags : [],
      isFeatured: isFeatured !== undefined ? Boolean(isFeatured) : false,
      viewCount: viewCount !== undefined ? Number(viewCount) : 0
    });

    const populatedContent = await Content.findById(newContent._id).populate("category", "name slug");

    return res.status(201).json({
      success: true,
      message: "Content created successfully",
      content: populatedContent
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Content slug already exists"
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

const updateContent = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid content ID format"
      });
    }

    const content = await Content.findById(id);
    if (!content) {
      return res.status(404).json({
        success: false,
        message: "Content not found"
      });
    }

    const {
      title,
      slug,
      description,
      category,
      contentType,
      genre,
      releaseDate,
      popularityScore,
      thumbnail,
      mediaUrl,
      tags,
      isFeatured,
      viewCount
    } = req.body;

    if (title !== undefined) {
      if (!title || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: "Title cannot be empty"
        });
      }
      content.title = title.trim();
    }

    if (slug !== undefined) {
      if (!slug || !slug.trim()) {
        return res.status(400).json({
          success: false,
          message: "Slug cannot be empty"
        });
      }
      const normalizedSlug = slug.trim().toLowerCase();
      if (normalizedSlug !== content.slug) {
        const existingSlug = await Content.findOne({ slug: normalizedSlug });
        if (existingSlug) {
          return res.status(409).json({
            success: false,
            message: "Content slug already exists"
          });
        }
        content.slug = normalizedSlug;
      }
    }

    if (category !== undefined) {
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
      content.category = category;
    }

    if (contentType !== undefined) {
      const allowedTypes = ["article", "video", "audio", "image", "trailer"];
      if (!allowedTypes.includes(contentType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid contentType. Allowed: ${allowedTypes.join(", ")}`
        });
      }
      content.contentType = contentType;
    }

    if (description !== undefined) content.description = description.trim();
    if (genre !== undefined) content.genre = Array.isArray(genre) ? genre : [];
    if (releaseDate !== undefined) content.releaseDate = releaseDate ? new Date(releaseDate) : null;
    if (popularityScore !== undefined) content.popularityScore = Number(popularityScore);
    if (thumbnail !== undefined) content.thumbnail = thumbnail;
    if (mediaUrl !== undefined) content.mediaUrl = mediaUrl;
    if (tags !== undefined) content.tags = Array.isArray(tags) ? tags : [];
    if (isFeatured !== undefined) content.isFeatured = Boolean(isFeatured);
    if (viewCount !== undefined) content.viewCount = Number(viewCount);

    await content.save();

    const updatedContent = await Content.findById(id).populate("category", "name slug");

    return res.status(200).json({
      success: true,
      message: "Content updated successfully",
      content: updatedContent
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Content slug already exists"
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

const deleteContent = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid content ID format"
      });
    }

    const content = await Content.findById(id);
    if (!content) {
      return res.status(404).json({
        success: false,
        message: "Content not found"
      });
    }

    await Promise.all([
      Bookmark.deleteMany({ content: id }),
      Rating.deleteMany({ content: id }),
      Content.findByIdAndDelete(id)
    ]);

    return res.status(200).json({
      success: true,
      message: "Content deleted successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

module.exports = {
  getContent,
  getContentById,
  createContent,
  updateContent,
  deleteContent
};

