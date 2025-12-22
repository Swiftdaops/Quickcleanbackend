// Cloudinary configuration and Multer storage for unsigned uploads
const { v2: cloudinary } = require('cloudinary');

// Prefer explicit env vars; fallback to CLOUDINARY_URL if provided
const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_URL,
} = process.env;

if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
} else if (CLOUDINARY_URL) {
  cloudinary.config({ url: CLOUDINARY_URL });
} else {
  console.warn(
    '[cloudinary] Missing Cloudinary credentials. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET or CLOUDINARY_URL.'
  );
}

// Helper to upload a Buffer via upload_stream with unsigned preset
const uploadBufferUnsigned = (buffer, originalName) =>
  new Promise((resolve, reject) => {
    const rand = Math.random().toString(36).slice(2, 8);
    const public_id = `quickclean_${Date.now()}_${rand}`;

    const options = {
      folder: 'quickcleanlite',
      upload_preset: 'quickcleanlite', // unsigned preset must exist
      resource_type: 'image',
      use_filename: false,
      unique_filename: true,
      public_id,
      context: { caption: originalName, alt: originalName },
    };

    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });

    // Stream the provided Buffer to Cloudinary
    const { Readable } = require('stream');
    Readable.from(buffer).pipe(stream);
  });

module.exports = { cloudinary, uploadBufferUnsigned };
