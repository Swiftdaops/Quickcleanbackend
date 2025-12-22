require('dotenv').config();
const required = ['DB_URI', 'JWT_SECRET', 'ENCRYPTION_KEY'];

const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  const err = new Error(`Missing required env vars: ${missing.join(', ')}`);
  // In test mode we want tests to fail early. Throw now.
  throw err;
}

module.exports = {
  DB_URI: process.env.DB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  CLOUDINARY_URL: process.env.CLOUDINARY_URL,
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3000,
};
