const mongoose = require("mongoose");
const FanSubmission = require("../models/FanSubmission");
const Category = require("../models/Category");

// PUBLIC: Get approved submissions only
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
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// PUBLIC: Get a single approved submission by ID
const getPublicSubmissionById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid submission ID format" });
    }

    const submission = await FanSubmission.findById(req.params.id)
      .populate("user", "name avatar")
      .populate("category", "name slug");

    if (!submission || submission.status !== "approved") {
      return res.status(404).json({ success: false, message: "Fan submission not found" });
    }

    return res.status(200).json({ success: true, submission: submission });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// USER: Create a new fan submission
const createSubmission = async (req, res) => {
  try {
    const { title, description, content, category, image } = req.body;

    if (!title || !title.trim() || !content || !content.trim() || !category) {
      return res.status(400).json({
        success: false,
        message: "Title, content, and category are required"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({ success: false, message: "Invalid category ID format" });
    }

    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(404).json({ success: false, message: "Referenced category not found" });
    }

    // User ID always comes from the JWT — never from the request body
    const newSubmission = await FanSubmission.create({
      user: req.user.id,
      title: title.trim(),
      description: description ? description.trim() : "",
      content: content.trim(),
      category,
      image: image || "",
      status: "pending" // Always starts as pending
      // adminNote is NOT accepted from the user
    });

    const populated = await FanSubmission.findById(newSubmission._id)
      .populate("user", "name avatar")
      .populate("category", "name slug");

    return res.status(201).json({
      success: true,
      message: "Fan submission created successfully. Pending admin review.",
      submission: populated
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ADMIN: Get all submissions regardless of status
const getAdminSubmissions = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      const allowedStatuses = ["pending", "approved", "rejected"];
      if (!allowedStatuses.includes(req.query.status)) {
        return res.status(400).json({ success: false, message: "Invalid status filter. Allowed: pending, approved, rejected" });
      }
      filter.status = req.query.status;
    }

    const submissions = await FanSubmission.find(filter)
      .populate("user", "name email")
      .populate("category", "name slug");

    return res.status(200).json({
      success: true,
      count: submissions.length,
      submissions: submissions
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ADMIN: Get a single submission by ID (any status)
const getAdminSubmissionById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid submission ID format" });
    }

    const submission = await FanSubmission.findById(req.params.id)
      .populate("user", "name email")
      .populate("category", "name slug");

    if (!submission) {
      return res.status(404).json({ success: false, message: "Fan submission not found" });
    }

    return res.status(200).json({ success: true, submission: submission });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ADMIN: Update submission status and/or adminNote
const updateAdminSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid submission ID format" });
    }

    const submission = await FanSubmission.findById(id);
    if (!submission) {
      return res.status(404).json({ success: false, message: "Fan submission not found" });
    }

    const { status, adminNote } = req.body;

    if (status !== undefined) {
      const allowedStatuses = ["pending", "approved", "rejected"];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status value. Allowed: pending, approved, rejected"
        });
      }
      submission.status = status;
    }

    if (adminNote !== undefined) {
      submission.adminNote = adminNote.trim ? adminNote.trim() : adminNote;
    }

    await submission.save();

    const updated = await FanSubmission.findById(id)
      .populate("user", "name email")
      .populate("category", "name slug");

    return res.status(200).json({
      success: true,
      message: "Fan submission updated successfully",
      submission: updated
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ADMIN: Delete a submission
const deleteAdminSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid submission ID format" });
    }

    const submission = await FanSubmission.findById(id);
    if (!submission) {
      return res.status(404).json({ success: false, message: "Fan submission not found" });
    }

    await FanSubmission.findByIdAndDelete(id);

    return res.status(200).json({ success: true, message: "Fan submission deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  getPublicSubmissions,
  getPublicSubmissionById,
  createSubmission,
  getAdminSubmissions,
  getAdminSubmissionById,
  updateAdminSubmission,
  deleteAdminSubmission
};

