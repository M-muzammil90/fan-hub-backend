const Content = require("../models/Content");

const getContent = async (req, res) => {
  try {
    const filter = {};

    if (req.query.category) {
      filter.category = req.query.category;
    }

    if (req.query.contentType) {
      filter.contentType = req.query.contentType;
    }

    if (req.query.search) {
      filter.title = { $regex: req.query.search, $options: "i" };
    }

    const contentList = await Content.find(filter).populate("category", "name slug");

    return res.status(200).json({
      success: true,
      count: contentList.length,
      content: contentList
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
    const content = await Content.findById(req.params.id).populate("category", "name slug");
    if (!content) {
      return res.status(404).json({
        success: false,
        message: "Content not found"
      });
    }

    return res.status(200).json({
      success: true,
      content: content
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
  getContentById
};
