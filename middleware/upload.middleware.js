const multer = require("multer");
const path = require("path");

// Use memory storage so files are never written to the local disk
const storage = multer.memoryStorage();

// Allowed MIME types
const ALLOWED_IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif"
];

const ALLOWED_VIDEO_MIMES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/mpeg",
  "video/x-matroska"
];

const ALLOWED_AUDIO_MIMES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "audio/aac",
  "audio/webm",
  "audio/flac"
];

const ALLOWED_DOCUMENT_MIMES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain"
];

// Dangerous file extensions to strictly reject
const DANGEROUS_EXTENSIONS = [
  ".exe",
  ".bat",
  ".cmd",
  ".sh",
  ".php",
  ".js",
  ".vbs",
  ".ps1",
  ".jar",
  ".msi",
  ".com",
  ".scr"
];

/**
 * Common file filter for all uploads.
 */
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  // Reject dangerous executable extensions
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    return cb(new Error(`File type ${ext} is not allowed for security reasons`), false);
  }

  const allAllowedMimes = [
    ...ALLOWED_IMAGE_MIMES,
    ...ALLOWED_VIDEO_MIMES,
    ...ALLOWED_AUDIO_MIMES,
    ...ALLOWED_DOCUMENT_MIMES
  ];

  if (allAllowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Unsupported file type: ${file.mimetype}. Allowed types include images, videos, audio, and PDF/DOC documents.`
      ),
      false
    );
  }
};

// Default upload instance (Max file size: 100MB)
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100 MB max limit
  }
});

/**
 * Express error handling wrapper for Multer middleware.
 * Returns consistent API responses if file parsing fails.
 */
const handleMulter = (multerAction) => {
  return (req, res, next) => {
    multerAction(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
              success: false,
              message: "File size exceeds the allowable limit (max 100MB)"
            });
          }
          if (err.code === "LIMIT_UNEXPECTED_FILE") {
            return res.status(400).json({
              success: false,
              message: `Unexpected file field received: ${err.field}`
            });
          }
          return res.status(400).json({
            success: false,
            message: `File upload error: ${err.message}`
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message || "Invalid file format or upload error"
        });
      }
      next();
    });
  };
};

/**
 * Middleware for single file upload
 */
const uploadSingle = (fieldName = "file") => {
  return handleMulter(upload.single(fieldName));
};

/**
 * Middleware for multiple files under a single field name
 */
const uploadArray = (fieldName = "files", maxCount = 10) => {
  return handleMulter(upload.array(fieldName, maxCount));
};

/**
 * Middleware for multiple fields with different names
 */
const uploadFields = (fieldsArray = []) => {
  return handleMulter(upload.fields(fieldsArray));
};

module.exports = {
  upload,
  uploadSingle,
  uploadArray,
  uploadFields,
  ALLOWED_IMAGE_MIMES,
  ALLOWED_VIDEO_MIMES,
  ALLOWED_AUDIO_MIMES,
  ALLOWED_DOCUMENT_MIMES
};
