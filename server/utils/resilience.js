// ── Retry with Exponential Backoff ──
// TAD §6: "Retry with exponential backoff for external service calls (SMS, push, Maps)"
// Used by: Twilio SMS, Firebase FCM, Aadhaar API

/**
 * Retry an async function with exponential backoff
 * @param {Function} fn        - Async function to retry
 * @param {number}   maxRetries - Max attempts (default 3)
 * @param {number}   baseMs    - Base delay in ms (doubles each retry)
 * @param {string}   label     - Service name for logging
 */
const withRetry = async (fn, maxRetries = 3, baseMs = 500, label = 'external service') => {
  let lastError

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt === maxRetries) break

      const delay = baseMs * Math.pow(2, attempt - 1) + Math.random() * 100
      console.warn(`⚠️  ${label} failed (attempt ${attempt}/${maxRetries}). Retrying in ${Math.round(delay)}ms...`)
      await sleep(delay)
    }
  }

  console.error(`❌ ${label} failed after ${maxRetries} attempts:`, lastError.message)
  throw lastError
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Graceful degradation wrapper — non-critical services fail silently
 * TAD §6: "if the ML prediction service is down, core request-routing continues"
 * @param {Function} fn       - Async function for non-critical service
 * @param {*}        fallback - Value to return on failure
 * @param {string}   label    - Service name for logging
 */
const withGracefulFallback = async (fn, fallback = null, label = 'service') => {
  try {
    return await fn()
  } catch (err) {
    console.warn(`⚠️  ${label} unavailable (graceful degradation):`, err.message)
    return fallback
  }
}

// ── OTP Store (Redis in prod, in-memory for dev) ──
const otpStore = new Map()

/**
 * Generate 6-digit OTP
 */
const generateOTP = () => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  return otp
}

/**
 * Store OTP with 5-minute TTL (TAD §4 — OTP expires in 5 minutes, single use)
 * @param {string} phone
 * @returns {string} - Generated OTP (or '123456' in demo mode)
 */
const storeOTP = (phone) => {
  const otp = generateOTP()
  otpStore.set(phone, {
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    used: false,
  })
  // Auto-delete after 5 mins
  setTimeout(() => otpStore.delete(phone), 5 * 60 * 1000)
  return otp
}

/**
 * Verify OTP — single use, 5-min expiry
 * @param {string} phone
 * @param {string} otp
 * @returns {{ valid: boolean, reason?: string }}
 */
const verifyOTP = (phone, otp) => {
  const record = otpStore.get(phone)

  if (!record) return { valid: false, reason: 'OTP not found or expired' }
  if (record.used) return { valid: false, reason: 'OTP already used' }
  if (Date.now() > record.expiresAt) {
    otpStore.delete(phone)
    return { valid: false, reason: 'OTP expired' }
  }
  if (record.otp !== otp.toString()) return { valid: false, reason: 'Invalid OTP' }

  // Mark as used (single-use enforcement — Security Doc §4)
  record.used = true
  return { valid: true }
}

/**
 * Send OTP via Twilio (with retry + exponential backoff)
 */
const sendOTPViaSMS = async (phone, otp) => {
  const message = `Your BloodConnect OTP is: ${otp}. Valid for 5 minutes. Do not share with anyone.`

  return withRetry(async () => {
    if (!process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID === 'your_twilio_sid') {
      // Demo mode — log OTP to console
      console.log(`📱 [DEMO OTP] Phone: ${phone} | OTP: ${otp}`)
      return { success: true, demo: true, otp } // Return OTP in demo for testing
    }

    const twilio = require('twilio')
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE,
      to: phone,
    })
    return { success: true, sid: result.sid }
  }, 3, 500, 'Twilio SMS')
}

module.exports = {
  withRetry,
  withGracefulFallback,
  generateOTP,
  storeOTP,
  verifyOTP,
  sendOTPViaSMS,
}
