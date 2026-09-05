const crypto = require('crypto')

// ── AES-256-CBC Encryption ──
// Used for: health data, phone numbers, exact addresses

const ENCRYPTION_KEY = process.env.AES_KEY
  ? Buffer.from(process.env.AES_KEY, 'hex')
  : crypto.randomBytes(32) // fallback for dev (rotate in prod!)

const IV_LENGTH = 16

/**
 * Encrypt a string using AES-256-CBC
 * @param {string} text - Plain text to encrypt
 * @returns {string} - "iv:encrypted" format
 */
const encrypt = (text) => {
  if (!text) return null
  try {
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv)
    let encrypted = cipher.update(text.toString(), 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return iv.toString('hex') + ':' + encrypted
  } catch (err) {
    console.error('Encryption error:', err.message)
    return null
  }
}

/**
 * Decrypt an AES-256-CBC encrypted string
 * @param {string} encryptedText - "iv:encrypted" format
 * @returns {string} - Decrypted plain text
 */
const decrypt = (encryptedText) => {
  if (!encryptedText || !encryptedText.includes(':')) return null
  try {
    const [ivHex, encrypted] = encryptedText.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (err) {
    console.error('Decryption error:', err.message)
    return null
  }
}

// ── Aadhaar One-Way HMAC-SHA256 Hash ──
// Raw Aadhaar number is NEVER stored — only this hash
// PLATFORM_SALT is fixed and secret — stored in env only

/**
 * Hash Aadhaar number with platform salt
 * Raw number is discarded after this call
 * @param {string|number} aadhaarNumber - 12-digit Aadhaar
 * @returns {string} - HMAC-SHA256 hex hash
 */
const hashAadhaar = (aadhaarNumber) => {
  const PLATFORM_SALT = process.env.AADHAAR_SALT || 'bloodconnect-aadhaar-salt-2026'
  if (!aadhaarNumber) return null

  // Normalize: remove spaces, convert to string
  const normalized = aadhaarNumber.toString().replace(/\s/g, '')

  const hash = crypto
    .createHmac('sha256', PLATFORM_SALT)
    .update(normalized)
    .digest('hex')

  // normalized variable goes out of scope here
  // Raw Aadhaar number is never persisted
  return hash
}

// ── Data Masking Functions ──
// Applied based on RBAC role (Section 3 — masked columns)

/**
 * Mask donor data based on requester's role
 * @param {Object} donor - Full donor document
 * @param {string} role - Requester's role
 * @param {boolean} isPostMatch - Whether bank has a confirmed appointment
 * @returns {Object} - Masked donor object
 */
const maskDonorData = (donor, role, isPostMatch = false) => {
  if (!donor) return null

  const base = {
    id: donor._id || donor.id,
    bloodGroup: donor.bloodGroup,
    city: donor.location?.city,
    trustScore: donor.trustScore,
    totalDonations: donor.totalDonations,
    eligibilityStatus: donor.eligibilityStatus,
    verified: donor.verified,
  }

  switch (role) {
    case 'admin':
      // Full access EXCEPT aadhaarHash (never returned)
      return {
        ...donor.toObject ? donor.toObject() : donor,
        aadhaarHash: undefined,
        phone_encrypted: undefined,
        healthData_encrypted: undefined,
        // Decrypted phone returned
        phone: donor.phone_encrypted ? decrypt(donor.phone_encrypted) : donor.phone,
      }

    case 'blood-bank':
      return {
        ...base,
        name: donor.name,
        // Contact ONLY if post-match confirmed
        phone: isPostMatch && donor.phone_encrypted
          ? decrypt(donor.phone_encrypted)
          : undefined,
        // Health data masked (Section 3)
        healthSummary: isPostMatch ? '(Available at donation time)' : undefined,
      }

    case 'hospital':
      // No contact info — system notifies donors directly
      return {
        ...base,
        // Distance shown, no identity
        distanceKm: donor.distanceKm,
      }

    case 'auditor':
      // Masked — no identifiable info
      const phone = donor.phone_encrypted
        ? decrypt(donor.phone_encrypted)
        : donor.phone || ''
      return {
        ...base,
        name: donor.name ? donor.name[0] + '***' : '***', // First letter only
        phone: phone ? '***-****-' + phone.slice(-4) : undefined,
        email: donor.email ? '***@***.com' : undefined,
      }

    case 'donor':
      // Own data — full access
      return {
        ...donor.toObject ? donor.toObject() : donor,
        aadhaarHash: undefined, // Never return hash to anyone
        phone: donor.phone_encrypted ? decrypt(donor.phone_encrypted) : donor.phone,
        healthData: donor.healthData_encrypted ? decrypt(donor.healthData_encrypted) : undefined,
      }

    default:
      // Guest / unknown — minimal info
      return base
  }
}

/**
 * Mask location — never return exact coordinates
 * Return only city and approximate distance
 */
const maskLocation = (location, requesterCoords = null) => {
  if (!location) return null
  return {
    city: location.city,
    state: location.state,
    // Coordinates NEVER returned to frontend
    // Distance calculated server-side only
    approximateArea: location.city + (location.state ? `, ${location.state}` : ''),
  }
}

/**
 * Generate AES key for .env (run once during setup)
 */
const generateAESKey = () => crypto.randomBytes(32).toString('hex')

module.exports = {
  encrypt,
  decrypt,
  hashAadhaar,
  maskDonorData,
  maskLocation,
  generateAESKey,
}
