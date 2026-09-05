const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'bloodconnect-secret-2026'

// ── Core JWT Verification Middleware ──
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'NO_TOKEN'
      })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, JWT_SECRET)

    // Check MFA requirement for sensitive roles
    const MFA_REQUIRED_ROLES = ['admin', 'blood-bank', 'hospital']
    if (MFA_REQUIRED_ROLES.includes(decoded.role) && !decoded.mfaVerified) {
      return res.status(403).json({
        error: 'MFA verification required',
        code: 'MFA_REQUIRED'
      })
    }

    req.user = decoded
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' })
    }
    return res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' })
  }
}

// ── Role Authorization Middleware ──
// Usage: authorize(['admin', 'blood-bank'])
const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        required: allowedRoles,
        current: req.user.role
      })
    }
    next()
  }
}

// ── Resource Ownership Check ──
// Ensures users can only access their own resources (unless admin)
const ownResourceOnly = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    if (req.user.role === 'admin') return next() // Admins bypass

    const resourceOwnerId = req.params[resourceUserIdField] || req.body[resourceUserIdField]
    if (resourceOwnerId && resourceOwnerId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        error: 'Access denied: not your resource',
        code: 'WRONG_OWNER'
      })
    }
    next()
  }
}

// ── Organization Scope Check ──
// Blood Bank Admin can only access their own org's data
const ownOrgOnly = (req, res, next) => {
  if (req.user.role === 'admin') return next() // Admins bypass
  if (req.user.role === 'blood-bank' || req.user.role === 'hospital') {
    req.orgFilter = { orgId: req.user.orgId } // Inject org filter
    return next()
  }
  next()
}

// ── Optional Auth (for SOS — fail open) ──
// Emergency SOS works with OR without auth
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      req.user = jwt.verify(token, JWT_SECRET)
    } else {
      req.user = null // Guest/anonymous — allowed for SOS
    }
  } catch (_) {
    req.user = null // Invalid token = treat as guest (fail-open for emergency)
  }
  next()
}

// ── MFA Verified Check ──
const requireMFA = (req, res, next) => {
  if (!req.user.mfaVerified) {
    return res.status(403).json({
      error: 'This action requires MFA verification',
      code: 'MFA_REQUIRED'
    })
  }
  next()
}

module.exports = { authenticate, authorize, ownResourceOnly, ownOrgOnly, optionalAuth, requireMFA }
