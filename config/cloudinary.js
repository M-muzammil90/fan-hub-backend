const cloudinary = require("cloudinary").v2;

let cloudName = process.env.CLOUDINARY_CLOUD_NAME;
let apiKey = process.env.CLOUDINARY_API_KEY;
let apiSecret = process.env.CLOUDINARY_API_SECRET;

// Gracefully parse if full CLOUDINARY_URL is present in env or pasted into CLOUDINARY_API_SECRET
const rawUrl = process.env.CLOUDINARY_URL || (apiSecret && apiSecret.includes("cloudinary://") ? apiSecret : null);

if (rawUrl) {
  const urlMatch = rawUrl.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);
  if (urlMatch) {
    apiKey = urlMatch[1].trim();
    apiSecret = urlMatch[2].trim();
    cloudName = urlMatch[3].trim();
  }
}

cloudinary.config({
  cloud_name: cloudName ? cloudName.trim() : cloudName,
  api_key: apiKey ? apiKey.trim() : apiKey,
  api_secret: apiSecret ? apiSecret.trim() : apiSecret,
  secure: true
});

module.exports = cloudinary;

