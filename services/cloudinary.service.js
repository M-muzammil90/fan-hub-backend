const stream = require("stream");
const cloudinary = require("../config/cloudinary");

/**
 * Automatically determine Cloudinary resource type from MIME type.
 * Note: Cloudinary categorizes audio files under the "video" resource type.
 */
const determineResourceType = (mimeType) => {
  if (!mimeType) return "auto";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "video"; // Cloudinary uses "video" for audio
  if (mimeType === "application/pdf") return "image"; // Cloudinary handles PDF under image or raw, image allows page delivery & previews
  return "raw";
};

/**
 * Upload a memory buffer to Cloudinary using upload_stream.
 * @param {Buffer} buffer - File buffer from Multer memoryStorage
 * @param {Object} options - Cloudinary upload options (folder, resource_type, etc.)
 * @returns {Promise<Object>}
 */
const uploadBuffer = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || "fan-hub-plus/general",
        resource_type: options.resource_type || "auto",
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        ...options
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );

    const readable = stream.Readable.from(buffer);
    readable.pipe(uploadStream);
  });
};

/**
 * Standardized upload handler for a single Multer file object.
 * @param {Object} file - Express/Multer file object (contains buffer, mimetype, originalname, size)
 * @param {Object} options - Custom options including folder, resource_type, etc.
 * @returns {Promise<{url: string, publicId: string, resourceType: string, format: string, bytes: number, originalName: string, duration?: number}>}
 */
const uploadFile = async (file, options = {}) => {
  if (!file || !file.buffer) {
    throw new Error("No file buffer provided for upload");
  }

  const detectedResourceType = options.resource_type || determineResourceType(file.mimetype);
  const uploadOptions = {
    ...options,
    resource_type: detectedResourceType
  };

  const result = await uploadBuffer(file.buffer, uploadOptions);

  return {
    url: result.secure_url,
    publicId: result.public_id,
    resourceType: result.resource_type || detectedResourceType,
    format: result.format,
    bytes: result.bytes,
    duration: result.duration || null,
    originalName: file.originalname || ""
  };
};

/**
 * Specific helper for uploading images.
 */
const uploadImage = async (file, options = {}) => {
  return uploadFile(file, {
    ...options,
    resource_type: "image",
    folder: options.folder || "fan-hub-plus/images"
  });
};

/**
 * Specific helper for uploading videos.
 */
const uploadVideo = async (file, options = {}) => {
  return uploadFile(file, {
    ...options,
    resource_type: "video",
    folder: options.folder || "fan-hub-plus/videos"
  });
};

/**
 * Specific helper for uploading audio.
 */
const uploadAudio = async (file, options = {}) => {
  return uploadFile(file, {
    ...options,
    resource_type: "video", // Cloudinary processes audio under video
    folder: options.folder || "fan-hub-plus/audio"
  });
};

/**
 * Specific helper for uploading documents / PDFs.
 */
const uploadDocument = async (file, options = {}) => {
  return uploadFile(file, {
    ...options,
    resource_type: options.resource_type || "auto",
    folder: options.folder || "fan-hub-plus/documents"
  });
};

/**
 * Delete a file from Cloudinary by its publicId and resourceType.
 * @param {string} publicId - The Cloudinary public_id
 * @param {string} resourceType - "image", "video", "raw", etc. (defaults to "image")
 * @returns {Promise<{success: boolean, result?: any, error?: any}>}
 */
const deleteFile = async (publicId, resourceType = "image") => {
  if (!publicId) {
    return { success: false, message: "No publicId provided for deletion" };
  }

  try {
    const res = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true
    });
    return { success: res.result === "ok" || res.result === "not found", result: res };
  } catch (error) {
    console.error(`[Cloudinary Service] Error deleting asset ${publicId}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Batch delete multiple files from Cloudinary.
 * @param {Array<{publicId: string, resourceType?: string}> | Array<string>} items
 */
const deleteMultipleFiles = async (items = []) => {
  if (!Array.isArray(items) || items.length === 0) return [];

  const deletePromises = items.map((item) => {
    if (typeof item === "string") {
      return deleteFile(item, "image");
    }
    if (item && item.publicId) {
      return deleteFile(item.publicId, item.resourceType || "image");
    }
    return Promise.resolve({ success: false, message: "Invalid item" });
  });

  return Promise.all(deletePromises);
};

/**
 * Utility to extract public_id and resource_type from a Cloudinary URL
 * if the publicId was not saved directly in the database.
 * Example URL:
 * https://res.cloudinary.com/cloudname/image/upload/v123456789/fan-hub-plus/users/sample.jpg
 */
const extractPublicId = (url) => {
  if (!url || typeof url !== "string" || !url.includes("cloudinary.com")) {
    return null;
  }

  try {
    const parts = url.split("/");
    const uploadIndex = parts.findIndex((p) => p === "upload");
    if (uploadIndex === -1) return null;

    // Determine resource type if available in path: .../res.cloudinary.com/<cloud>/<resource_type>/upload/...
    const resourceType = uploadIndex >= 1 ? parts[uploadIndex - 1] : "image";

    // Slice path after upload/ (skip version tag v12345... if present)
    let pathSegments = parts.slice(uploadIndex + 1);
    if (pathSegments.length > 0 && /^v\d+$/.test(pathSegments[0])) {
      pathSegments = pathSegments.slice(1);
    }

    const fullPathWithExt = pathSegments.join("/");
    // Strip file extension
    const lastDotIndex = fullPathWithExt.lastIndexOf(".");
    const publicId = lastDotIndex !== -1 ? fullPathWithExt.substring(0, lastDotIndex) : fullPathWithExt;

    return {
      publicId,
      resourceType: resourceType === "video" || resourceType === "raw" ? resourceType : "image"
    };
  } catch (err) {
    return null;
  }
};

module.exports = {
  uploadBuffer,
  uploadFile,
  uploadImage,
  uploadVideo,
  uploadAudio,
  uploadDocument,
  deleteFile,
  deleteMultipleFiles,
  extractPublicId,
  determineResourceType
};
