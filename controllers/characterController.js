const Character = require("../models/Character");

const getCharacters = async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) {
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

module.exports = {
  getCharacters,
  getCharacterById
};
