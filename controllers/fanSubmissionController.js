const FanSubmission = require("../models/FanSubmission");

const getPublicSubmissions = async (req, res) => {
  try {
    const submissions = await FanSubmission.find({ status: "approved" })
      .populate("user", "name avatar")
      .populate("category", "name slug");

    return res.status(200).json({
      success: true,
      count: submissions.length,
      submissions: submissions
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

const getPublicSubmissionById = async (req, res) => {
  try {
    const submission = await FanSubmission.findById(req.params.id)
      .populate("user", "name avatar")
      .populate("category", "name slug");

    if (!submission || submission.status !== "approved") {
      return res.status(404).json({
        success: false,
        message: "Fan submission not found"
      });
    }

    return res.status(200).json({
      success: true,
      submission: submission
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

const getAdminSubmissions = async (req, res) => {
  try {
    const submissions = await FanSubmission.find()
      .populate("user", "name email")
      .populate("category", "name slug");

    return res.status(200).json({
      success: true,
      count: submissions.length,
      submissions: submissions
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

module.exports = {
  getPublicSubmissions,
  getPublicSubmissionById,
  getAdminSubmissions
};
