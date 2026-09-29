const mongoose = require("mongoose");
const User = require("../models/User");
const Category = require("../models/Category");
const cloudinaryService = require("../services/cloudinary.service");

const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    const formattedUsers = users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      avatar: u.avatar,
      avatarPublicId: u.avatarPublicId || "",
      favoriteCategories: u.favoriteCategories,
      createdAt: u.createdAt
    }));

    return res.status(200).json({
      success: true,
      count: formattedUsers.length,
      users: formattedUsers
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

const getUserById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format"
      });
    }

    const user = await User.findById(req.params.id).select("-password").populate("favoriteCategories", "name slug");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        avatarPublicId: user.avatarPublicId || "",
        favoriteCategories: user.favoriteCategories,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

const updateUser = async (req, res) => {
  let uploadedAsset = null;
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format"
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const { name, email, avatar, role, favoriteCategories } = req.body;
    let oldAvatarPublicId = user.avatarPublicId || cloudinaryService.extractPublicId(user.avatar)?.publicId;

    if (name !== undefined) {
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Name cannot be empty"
        });
      }
      user.name = name.trim();
    }

    if (email !== undefined) {
      const normalizedEmail = email.trim().toLowerCase();
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid email address"
        });
      }

      if (normalizedEmail !== user.email) {
        const existingEmail = await User.findOne({ email: normalizedEmail });
        if (existingEmail) {
          return res.status(409).json({
            success: false,
            message: "Email is already registered"
          });
        }
        user.email = normalizedEmail;
      }
    }

    // Handle avatar file upload via Multer to Cloudinary
    if (req.file) {
      uploadedAsset = await cloudinaryService.uploadImage(req.file, {
        folder: "fan-hub-plus/users/avatars"
      });
      user.avatar = uploadedAsset.url;
      user.avatarPublicId = uploadedAsset.publicId;
    } else if (avatar !== undefined) {
      user.avatar = typeof avatar === "string" ? avatar.trim() : avatar;
      if (user.avatar !== uploadedAsset?.url) {
        user.avatarPublicId = "";
      }
    }

    if (role !== undefined) {
      if (!["user", "admin"].includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid role value. Allowed values: user, admin"
        });
      }
      user.role = role;
    }

    if (favoriteCategories !== undefined) {
      let parsedCategories = favoriteCategories;
      if (typeof favoriteCategories === "string") {
        try {
          parsedCategories = JSON.parse(favoriteCategories);
        } catch (e) {
          parsedCategories = [favoriteCategories];
        }
      }

      if (!Array.isArray(parsedCategories)) {
        return res.status(400).json({
          success: false,
          message: "favoriteCategories must be an array of category IDs"
        });
      }
      for (const catId of parsedCategories) {
        if (!mongoose.Types.ObjectId.isValid(catId)) {
          return res.status(400).json({
            success: false,
            message: `Invalid category ID: ${catId}`
          });
        }
        const catExists = await Category.findById(catId);
        if (!catExists) {
          return res.status(404).json({
            success: false,
            message: `Referenced category not found: ${catId}`
          });
        }
      }
      user.favoriteCategories = parsedCategories;
    }

    await user.save();

    // Successfully saved: delete old Cloudinary asset if replaced
    if (uploadedAsset && oldAvatarPublicId && oldAvatarPublicId !== uploadedAsset.publicId) {
      await cloudinaryService.deleteFile(oldAvatarPublicId, "image");
    }

    const updatedUser = await User.findById(id).select("-password").populate("favoriteCategories", "name slug");

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        avatar: updatedUser.avatar,
        avatarPublicId: updatedUser.avatarPublicId || "",
        favoriteCategories: updatedUser.favoriteCategories
      }
    });
  } catch (error) {
    // Rollback: cleanup uploaded asset from Cloudinary if database save failed
    if (uploadedAsset && uploadedAsset.publicId) {
      await cloudinaryService.deleteFile(uploadedAsset.publicId, "image");
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format"
      });
    }

    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own admin account"
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Clean up avatar from Cloudinary
    const avatarPublicId = user.avatarPublicId || cloudinaryService.extractPublicId(user.avatar)?.publicId;
    if (avatarPublicId) {
      await cloudinaryService.deleteFile(avatarPublicId, "image");
    }

    await User.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "User deleted successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

const updateUserProfile = async (req, res) => {
  let uploadedAsset = null;
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const { name, avatar, favoriteCategories } = req.body;
    let oldAvatarPublicId = user.avatarPublicId || cloudinaryService.extractPublicId(user.avatar)?.publicId;

    if (name === undefined && avatar === undefined && favoriteCategories === undefined && !req.file) {
      return res.status(400).json({
        success: false,
        message: "At least one valid profile field (name, avatar, favoriteCategories) or file must be provided for update"
      });
    }

    if (name !== undefined) {
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Name cannot be empty"
        });
      }
      user.name = name.trim();
    }

    // Handle avatar file upload via Multer to Cloudinary
    if (req.file) {
      uploadedAsset = await cloudinaryService.uploadImage(req.file, {
        folder: "fan-hub-plus/users/avatars"
      });
      user.avatar = uploadedAsset.url;
      user.avatarPublicId = uploadedAsset.publicId;
    } else if (avatar !== undefined) {
      user.avatar = typeof avatar === "string" ? avatar.trim() : avatar;
      if (user.avatar !== uploadedAsset?.url) {
        user.avatarPublicId = "";
      }
    }

    if (favoriteCategories !== undefined) {
      let parsedCategories = favoriteCategories;
      if (typeof favoriteCategories === "string") {
        try {
          parsedCategories = JSON.parse(favoriteCategories);
        } catch (e) {
          parsedCategories = [favoriteCategories];
        }
      }

      if (!Array.isArray(parsedCategories)) {
        return res.status(400).json({
          success: false,
          message: "favoriteCategories must be an array of category IDs"
        });
      }
      for (const catId of parsedCategories) {
        if (!mongoose.Types.ObjectId.isValid(catId)) {
          return res.status(400).json({
            success: false,
            message: `Invalid category ID: ${catId}`
          });
        }
        const catExists = await Category.findById(catId);
        if (!catExists) {
          return res.status(404).json({
            success: false,
            message: `Referenced category not found: ${catId}`
          });
        }
      }
      user.favoriteCategories = parsedCategories;
    }

    await user.save();

    // Successfully saved: delete old Cloudinary asset if replaced
    if (uploadedAsset && oldAvatarPublicId && oldAvatarPublicId !== uploadedAsset.publicId) {
      await cloudinaryService.deleteFile(oldAvatarPublicId, "image");
    }

    const updatedUser = await User.findById(userId)
      .select("-password")
      .populate("favoriteCategories", "name slug");

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        avatar: updatedUser.avatar,
        avatarPublicId: updatedUser.avatarPublicId || "",
        favoriteCategories: updatedUser.favoriteCategories
      }
    });
  } catch (error) {
    // Rollback: cleanup uploaded asset from Cloudinary if database save failed
    if (uploadedAsset && uploadedAsset.publicId) {
      await cloudinaryService.deleteFile(uploadedAsset.publicId, "image");
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateUserProfile
};
