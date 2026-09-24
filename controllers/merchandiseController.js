const Merchandise = require("../models/Merchandise");

const getMerchandise = async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) {
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
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

const getMerchandiseById = async (req, res) => {
  try {
    const item = await Merchandise.findById(req.params.id).populate("category", "name slug");
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Merchandise not found"
      });
    }

    return res.status(200).json({
      success: true,
      merchandise: item
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

module.exports = {
  getMerchandise,
  getMerchandiseById
};
