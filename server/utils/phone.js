// Simple phone normalization and validation utility
// Normalizes to digits only, maintains leading country code if present

function normalizePhone(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/[^0-9+]/g, '');
  // Keep leading + if present
  if (digits.startsWith('+')) return digits;
  // If number starts with 0 and looks local, convert to without spaces
  return digits;
}

function isValidPhone(raw) {
  const ph = normalizePhone(raw);
  // Basic check: between 7 and 15 digits (allow +)
  const digits = ph.replace(/[^0-9]/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

module.exports = { normalizePhone, isValidPhone };
