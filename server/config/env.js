require('dotenv').config();
const required = ['DB_URI', 'JWT_SECRET', 'ENCRYPTION_KEY'];

const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  const err = new Error(`Missing required env vars: ${missing.join(', ')}`);
  // In test mode we want tests to fail early. Throw now.
  throw err;
}

module.exports = {
  // IMPORTANT: `appName` is NOT a database name.
  // If your MongoDB URI does not include `/<dbname>`, MongoDB will default to the `test` database.
  // To avoid accidental connects to the wrong DB (common on Render), require an explicit db name.
  DB_URI: (() => {
    const raw = String(process.env.DB_URI || '').trim();
    if (!raw) return raw;

    try {
      const u = new URL(raw);
      const hasDbInPath = u.pathname && u.pathname !== '/' && u.pathname !== '';
      if (hasDbInPath) return raw;

      const dbName = String(process.env.DB_NAME || '').trim();
      if (!dbName) {
        throw new Error(
          'DB_URI is missing a database name. Add `/<dbname>` to DB_URI or set DB_NAME (e.g. DB_NAME=quickclean).'
        );
      }

      // Insert db name into the path, keeping existing querystring.
      u.pathname = `/${encodeURIComponent(dbName)}`;
      return u.toString();
    } catch (e) {
      // If URL parsing fails (shouldn't for valid mongodb+srv URIs), surface a clear error.
      throw new Error(`Invalid DB_URI: ${e && e.message ? e.message : String(e)}`);
    }
  })(),
  JWT_SECRET: process.env.JWT_SECRET,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  CLOUDINARY_URL: process.env.CLOUDINARY_URL,
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3000,
};
