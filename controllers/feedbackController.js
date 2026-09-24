const Feedback = require("../models/Feedback");

const getFeedback = async (req, res) => {
  try {
    const feedbackList = await Feedback.find().populate("user", "name email");

    return res.status(200).json({
      success: true,
      count: feedbackList.length,
      feedback: feedbackList
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

module.exports = {
  getFeedback
};
