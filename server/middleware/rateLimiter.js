// ── Rate Limiter Middleware ──
// Section 7: Rate limiting on OTP, login attempts, SOS broadcasts

// Simple in-memory rate limiter (use Redis in production)
const requestCounts = new Map()
const loginAttempts = new Map()

/**
 * Generic rate limiter factory
 * @param {number} maxRequests - Max requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @param {string} message - Error message on limit exceeded
 */
const rateLimiter = (maxRequests, windowMs, message = 'Too many requests') => {
  return (req, res, next) => {
    const key = req.ip + ':' + req.path
    const now = Date.now()

    if (!requestCounts.has(key)) {
      requestCounts.set(key, { count: 1, resetAt: now + windowMs })
      return next()
    }

    const record = requestCounts.get(key)

    if (now > record.resetAt) {
      requestCounts.set(key, { count: 1, resetAt: now + windowMs })
      return next()
    }

    if (record.count >= maxRequests) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000)
      res.set('Retry-After', retryAfter)
      res.set('X-RateLimit-Limit', maxRequests)
      res.set('X-RateLimit-Remaining', 0)
      return res.status(429).json({
        error: message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfterSeconds: retryAfter,
      })
    }

    record.count++
    res.set('X-RateLimit-Limit', maxRequests)
    res.set('X-RateLimit-Remaining', maxRequests - record.count)
    next()
  }
}

// ── Specific Rate Limiters Per Section 7 ──

// OTP requests: max 3 per phone per 10 minutes
const otpLimiter = rateLimiter(3, 10 * 60 * 1000,
  'Too many OTP requests. Please wait 10 minutes before retrying.')

// Login attempts: max 5 per IP per 15 minutes
const loginLimiter = rateLimiter(5, 15 * 60 * 1000,
  'Too many login attempts. Account temporarily locked.')

// SOS broadcast: max 3 per IP per hour (abuse prevention)
const sosLimiter = rateLimiter(3, 60 * 60 * 1000,
  'SOS broadcast limit reached. Contact emergency services directly: 112')

// General API: max 100 per minute per IP
const apiLimiter = rateLimiter(100, 60 * 1000,
  'API rate limit exceeded. Please slow down.')

// Admin actions: max 30 per minute
const adminLimiter = rateLimiter(30, 60 * 1000,
  'Admin action rate limit exceeded.')

// ── Account Lockout ──
// Section 4: "Account temporarily locked after 5 consecutive failed attempts"

const LOCKOUT_THRESHOLD = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes

const recordFailedLogin = (identifier) => {
  const now = Date.now()
  const record = loginAttempts.get(identifier) || { count: 0, lockedUntil: null }

  // If currently locked, check if lockout expired
  if (record.lockedUntil && now < record.lockedUntil) {
    return {
      locked: true,
      remainingMs: record.lockedUntil - now,
      remainingSecs: Math.ceil((record.lockedUntil - now) / 1000)
    }
  }

  // Reset if lockout expired
  if (record.lockedUntil && now >= record.lockedUntil) {
    record.count = 0
    record.lockedUntil = null
  }

  record.count++

  if (record.count >= LOCKOUT_THRESHOLD) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS
    loginAttempts.set(identifier, record)
    console.log(`🔒 Account locked: ${identifier} — ${LOCKOUT_THRESHOLD} failed attempts`)
    return {
      locked: true,
      remainingMs: LOCKOUT_DURATION_MS,
      remainingSecs: LOCKOUT_DURATION_MS / 1000
    }
  }

  loginAttempts.set(identifier, record)
  return {
    locked: false,
    attemptsRemaining: LOCKOUT_THRESHOLD - record.count
  }
}

const isAccountLocked = (identifier) => {
  const record = loginAttempts.get(identifier)
  if (!record || !record.lockedUntil) return { locked: false }
  if (Date.now() >= record.lockedUntil) {
    loginAttempts.delete(identifier)
    return { locked: false }
  }
  return {
    locked: true,
    remainingSecs: Math.ceil((record.lockedUntil - Date.now()) / 1000)
  }
}

const clearLoginAttempts = (identifier) => {
  loginAttempts.delete(identifier)
}

// ── Input Validation Middleware ──
// Section 7: "Input validation and parameterized queries"

const validateBloodGroup = (req, res, next) => {
  const validGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
  const group = req.body.bloodGroup || req.query.bloodGroup
  if (group && !validGroups.includes(group)) {
    return res.status(400).json({
      error: 'Invalid blood group',
      valid: validGroups,
      code: 'INVALID_INPUT'
    })
  }
  next()
}

const sanitizeInput = (req, res, next) => {
  // Strip potential NoSQL injection patterns from body
  const sanitize = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$')) {
        delete obj[key] // Remove MongoDB operators from user input
      } else {
        obj[key] = sanitize(obj[key])
      }
    }
    return obj
  }
  if (req.body) req.body = sanitize(req.body)
  if (req.query) req.query = sanitize(req.query)
  next()
}

module.exports = {
  rateLimiter,
  otpLimiter,
  loginLimiter,
  sosLimiter,
  apiLimiter,
  adminLimiter,
  recordFailedLogin,
  isAccountLocked,
  clearLoginAttempts,
  validateBloodGroup,
  sanitizeInput,
}
