const cloudinaryService = require("../services/cloudinary.service");

/**
 * Handle single file upload to Cloudinary.
 * POST /api/media/upload
 */
const uploadSingleMedia = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file was provided for upload"
      });
    }

    const folder = req.body.folder || req.query.folder || "fan-hub-plus/general";
    const resourceType = req.body.resourceType || req.query.resourceType;

    const result = await cloudinaryService.uploadFile(file, {
      folder,
      ...(resourceType ? { resource_type: resourceType } : {})
    });

    return res.status(200).json({
      success: true,
      message: "File uploaded successfully to Cloudinary",
      data: result
    });
  } catch (error) {
    console.error("[Media Controller] Upload error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to upload file to Cloudinary"
    });
  }
};

/**
 * Handle multiple file uploads to Cloudinary.
 * POST /api/media/upload-multiple
 */
const uploadMultipleMedia = async (req, res) => {
  const uploadedAssets = [];
  try {
    const files = req.files;
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files were provided for upload"
      });
    }

    const folder = req.body.folder || req.query.folder || "fan-hub-plus/general";
    const resourceType = req.body.resourceType || req.query.resourceType;

    for (const file of files) {
      const result = await cloudinaryService.uploadFile(file, {
        folder,
        ...(resourceType ? { resource_type: resourceType } : {})
      });
      uploadedAssets.push(result);
    }

    return res.status(200).json({
      success: true,
      message: "Files uploaded successfully to Cloudinary",
      count: uploadedAssets.length,
      data: uploadedAssets
    });
  } catch (error) {
    console.error("[Media Controller] Multiple upload error:", error);
    // Cleanup any successfully uploaded assets if subsequent upload failed
    if (uploadedAssets.length > 0) {
      await cloudinaryService.deleteMultipleFiles(
        uploadedAssets.map((a) => ({ publicId: a.publicId, resourceType: a.resourceType }))
      );
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to upload files to Cloudinary"
    });
  }
};

/**
 * Delete an asset from Cloudinary.
 * DELETE /api/media
 */
const deleteMedia = async (req, res) => {
  try {
    const publicId = req.body.publicId || req.query.publicId;
    const resourceType = req.body.resourceType || req.query.resourceType || "image";

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: "publicId is required for deleting a media asset"
      });
    }

    const result = await cloudinaryService.deleteFile(publicId, resourceType);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: "Media asset deleted successfully from Cloudinary",
        data: result
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Could not delete asset from Cloudinary",
        error: result.error
      });
    }
  } catch (error) {
    console.error("[Media Controller] Delete error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete media asset"
    });
  }
};

module.exports = {
  uploadSingleMedia,
  uploadMultipleMedia,
  deleteMedia
};
