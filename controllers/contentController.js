const mongoose = require("mongoose");
const Content = require("../models/Content");
const Category = require("../models/Category");
const Bookmark = require("../models/Bookmark");
const Rating = require("../models/Rating");
const cloudinaryService = require("../services/cloudinary.service");

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
      { $match: { content: { $in: contentIds }, $or: [{ status: "approved" }, { status: { $exists: false } }] } },
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
      { $match: { content: content._id, $or: [{ status: "approved" }, { status: { $exists: false } }] } },
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

    const approvedReviews = await Rating.find({
      content: content._id,
      $or: [{ status: "approved" }, { status: { $exists: false } }]
    })
      .populate("user", "name avatar")
      .sort({ createdAt: -1 })
      .limit(20);

    const contentWithRatings = {
      ...content.toObject(),
      averageRating: stats.averageRating,
      totalRatings: stats.totalRatings,
      reviews: approvedReviews
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
  let uploadedThumbnailAsset = null;
  let uploadedMediaAsset = null;
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

    let parsedGenre = genre;
    if (typeof genre === "string") {
      try {
        parsedGenre = JSON.parse(genre);
      } catch (e) {
        parsedGenre = genre.split(",").map((g) => g.trim()).filter(Boolean);
      }
    }

    let parsedTags = tags;
    if (typeof tags === "string") {
      try {
        parsedTags = JSON.parse(tags);
      } catch (e) {
        parsedTags = tags.split(",").map((t) => t.trim()).filter(Boolean);
      }
    }

    let finalThumbnailUrl = thumbnail || "";
    let finalThumbnailPublicId = "";
    let finalMediaUrl = mediaUrl || "";
    let finalMediaPublicId = "";
    let finalMediaResourceType = "";

    if (req.files?.thumbnail?.[0]) {
      uploadedThumbnailAsset = await cloudinaryService.uploadImage(req.files.thumbnail[0], {
        folder: "fan-hub-plus/content/thumbnails"
      });
      finalThumbnailUrl = uploadedThumbnailAsset.url;
      finalThumbnailPublicId = uploadedThumbnailAsset.publicId;
    }

    const mediaFile = req.files?.media?.[0] || req.files?.mediaUrl?.[0];
    if (mediaFile) {
      uploadedMediaAsset = await cloudinaryService.uploadFile(mediaFile, {
        folder: "fan-hub-plus/content/media"
      });
      finalMediaUrl = uploadedMediaAsset.url;
      finalMediaPublicId = uploadedMediaAsset.publicId;
      finalMediaResourceType = uploadedMediaAsset.resourceType;
    }

    const newContent = await Content.create({
      title: title.trim(),
      slug: normalizedSlug,
      description: description ? description.trim() : "",
      category,
      contentType,
      genre: Array.isArray(parsedGenre) ? parsedGenre : [],
      releaseDate: releaseDate ? new Date(releaseDate) : undefined,
      popularityScore: popularityScore !== undefined ? Number(popularityScore) : 0,
      thumbnail: finalThumbnailUrl,
      thumbnailPublicId: finalThumbnailPublicId,
      mediaUrl: finalMediaUrl,
      mediaPublicId: finalMediaPublicId,
      mediaResourceType: finalMediaResourceType,
      tags: Array.isArray(parsedTags) ? parsedTags : [],
      isFeatured: isFeatured !== undefined ? (isFeatured === true || isFeatured === "true" || isFeatured === 1 || isFeatured === "1") : false,
      viewCount: viewCount !== undefined ? Number(viewCount) : 0
    });

    const populatedContent = await Content.findById(newContent._id).populate("category", "name slug");

    return res.status(201).json({
      success: true,
      message: "Content created successfully",
      content: populatedContent
    });
  } catch (error) {
    if (uploadedThumbnailAsset?.publicId) {
      await cloudinaryService.deleteFile(uploadedThumbnailAsset.publicId, "image");
    }
    if (uploadedMediaAsset?.publicId) {
      await cloudinaryService.deleteFile(uploadedMediaAsset.publicId, uploadedMediaAsset.resourceType);
    }
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
  let uploadedThumbnailAsset = null;
  let uploadedMediaAsset = null;
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

    if (genre !== undefined) {
      let parsedGenre = genre;
      if (typeof genre === "string") {
        try {
          parsedGenre = JSON.parse(genre);
        } catch (e) {
          parsedGenre = genre.split(",").map((g) => g.trim()).filter(Boolean);
        }
      }
      content.genre = Array.isArray(parsedGenre) ? parsedGenre : [];
    }

    if (tags !== undefined) {
      let parsedTags = tags;
      if (typeof tags === "string") {
        try {
          parsedTags = JSON.parse(tags);
        } catch (e) {
          parsedTags = tags.split(",").map((t) => t.trim()).filter(Boolean);
        }
      }
      content.tags = Array.isArray(parsedTags) ? parsedTags : [];
    }

    if (releaseDate !== undefined) content.releaseDate = releaseDate ? new Date(releaseDate) : null;
    if (popularityScore !== undefined) content.popularityScore = Number(popularityScore);
    if (isFeatured !== undefined) content.isFeatured = (isFeatured === true || isFeatured === "true" || isFeatured === 1 || isFeatured === "1");
    if (viewCount !== undefined) content.viewCount = Number(viewCount);

    let oldThumbnailPublicIdToDelete = null;
    if (req.files?.thumbnail?.[0]) {
      uploadedThumbnailAsset = await cloudinaryService.uploadImage(req.files.thumbnail[0], {
        folder: "fan-hub-plus/content/thumbnails"
      });
      oldThumbnailPublicIdToDelete = content.thumbnailPublicId || cloudinaryService.extractPublicId(content.thumbnail);
      content.thumbnail = uploadedThumbnailAsset.url;
      content.thumbnailPublicId = uploadedThumbnailAsset.publicId;
    } else if (thumbnail !== undefined) {
      content.thumbnail = thumbnail;
      if (thumbnail !== content.thumbnail) {
        content.thumbnailPublicId = "";
      }
    }

    let oldMediaPublicIdToDelete = null;
    let oldMediaResourceType = content.mediaResourceType || "video";
    const mediaFile = req.files?.media?.[0] || req.files?.mediaUrl?.[0];
    if (mediaFile) {
      uploadedMediaAsset = await cloudinaryService.uploadFile(mediaFile, {
        folder: "fan-hub-plus/content/media"
      });
      oldMediaPublicIdToDelete = content.mediaPublicId || cloudinaryService.extractPublicId(content.mediaUrl);
      content.mediaUrl = uploadedMediaAsset.url;
      content.mediaPublicId = uploadedMediaAsset.publicId;
      content.mediaResourceType = uploadedMediaAsset.resourceType;
    } else if (mediaUrl !== undefined) {
      content.mediaUrl = mediaUrl;
      if (mediaUrl !== content.mediaUrl) {
        content.mediaPublicId = "";
        content.mediaResourceType = "";
      }
    }

    await content.save();

    if (oldThumbnailPublicIdToDelete) {
      await cloudinaryService.deleteFile(oldThumbnailPublicIdToDelete, "image");
    }
    if (oldMediaPublicIdToDelete) {
      await cloudinaryService.deleteFile(oldMediaPublicIdToDelete, oldMediaResourceType);
    }

    const updatedContent = await Content.findById(id).populate("category", "name slug");

    return res.status(200).json({
      success: true,
      message: "Content updated successfully",
      content: updatedContent
    });
  } catch (error) {
    if (uploadedThumbnailAsset?.publicId) {
      await cloudinaryService.deleteFile(uploadedThumbnailAsset.publicId, "image");
    }
    if (uploadedMediaAsset?.publicId) {
      await cloudinaryService.deleteFile(uploadedMediaAsset.publicId, uploadedMediaAsset.resourceType);
    }
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

    const thumbnailPid = content.thumbnailPublicId || cloudinaryService.extractPublicId(content.thumbnail);
    const mediaPid = content.mediaPublicId || cloudinaryService.extractPublicId(content.mediaUrl);

    if (thumbnailPid) {
      await cloudinaryService.deleteFile(thumbnailPid, "image");
    }
    if (mediaPid) {
      await cloudinaryService.deleteFile(mediaPid, content.mediaResourceType || "video");
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

/**
 * GET /api/content/upcoming
 * Fetch upcoming releases sorted by nearest release date first
 */
const getUpcomingContent = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 12;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // 1. Fetch content with releaseDate >= now sorted ascending (nearest date first)
    let upcomingContent = await Content.find({
      releaseDate: { $gte: now }
    })
      .populate("category", "name slug")
      .sort({ releaseDate: 1 })
      .limit(limit)
      .lean();

    // 2. Also check Series for upcoming items
    const Series = require("../models/Series");
    const upcomingSeries = await Series.find({
      $or: [
        { status: "upcoming" },
        { releaseYear: { $gte: now.getFullYear() } }
      ]
    })
      .populate("category", "name slug")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const formattedSeries = upcomingSeries.map((s) => ({
      _id: s._id,
      title: s.title,
      slug: s.slug,
      category: s.category,
      contentType: "series",
      genre: s.genres || ["Series"],
      releaseDate: s.createdAt,
      releaseYear: s.releaseYear,
      thumbnail: s.poster || s.backdrop,
      backdrop: s.backdrop || s.poster,
      description: s.description,
      status: s.status || "upcoming",
      isFeatured: s.isFeatured,
      isSeries: true
    }));

    // Merge and deduplicate
    let combined = [...upcomingContent, ...formattedSeries];

    // If fewer than limit, also fetch any latest added content as fallback
    if (combined.length === 0) {
      const fallbackContent = await Content.find({})
        .populate("category", "name slug")
        .sort({ releaseDate: -1, createdAt: -1 })
        .limit(limit)
        .lean();
      combined = fallbackContent;
    }

    // Deduplicate by ID
    const seen = new Set();
    const uniqueList = [];
    for (const item of combined) {
      const idStr = item._id.toString();
      if (!seen.has(idStr)) {
        seen.add(idStr);
        uniqueList.push(item);
      }
    }

    return res.status(200).json({
      success: true,
      count: uniqueList.length,
      upcoming: uniqueList.slice(0, limit)
    });
  } catch (error) {
    console.error("Error in getUpcomingContent:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

module.exports = {
  getContent,
  getContentById,
  getUpcomingContent,
  createContent,
  updateContent,
  deleteContent
};


