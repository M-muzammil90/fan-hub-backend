const mongoose = require("mongoose");
const User = require("../models/User");
const Category = require("../models/Category");

const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    const formattedUsers = users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      avatar: u.avatar,
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

    if (avatar !== undefined) {
      user.avatar = avatar;
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
      if (!Array.isArray(favoriteCategories)) {
        return res.status(400).json({
          success: false,
          message: "favoriteCategories must be an array of category IDs"
        });
      }
      for (const catId of favoriteCategories) {
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
      user.favoriteCategories = favoriteCategories;
    }

    await user.save();

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
        favoriteCategories: updatedUser.favoriteCategories
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error"
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

    if (name === undefined && avatar === undefined && favoriteCategories === undefined) {
      return res.status(400).json({
        success: false,
        message: "At least one valid profile field (name, avatar, favoriteCategories) must be provided for update"
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

    if (avatar !== undefined) {
      user.avatar = typeof avatar === "string" ? avatar.trim() : avatar;
    }

    if (favoriteCategories !== undefined) {
      if (!Array.isArray(favoriteCategories)) {
        return res.status(400).json({
          success: false,
          message: "favoriteCategories must be an array of category IDs"
        });
      }
      for (const catId of favoriteCategories) {
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
      user.favoriteCategories = favoriteCategories;
    }

    await user.save();

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
        favoriteCategories: updatedUser.favoriteCategories
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error"
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


