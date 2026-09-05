const mongoose = require('mongoose')

// ── AUDIT LOG MODEL ──
// Section 7: "Audit logging on all sensitive actions"
const auditLogSchema = new mongoose.Schema({
  // Who did it
  userId: { type: mongoose.Schema.Types.ObjectId, refPath: 'userModel' },
  userModel: { type: String, enum: ['Donor', 'Facility', 'System'] },
  userRole: String,
  userName: String,
  ipAddress: String,
  userAgent: String,

  // What they did
  action: {
    type: String,
    required: true,
    enum: [
      // Auth actions
      'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'MFA_SUCCESS', 'MFA_FAILED',
      'ACCOUNT_LOCKED', 'PASSWORD_CHANGED', 'OTP_SENT', 'OTP_VERIFIED',
      // Data actions
      'DONOR_PROFILE_VIEWED', 'DONOR_PROFILE_UPDATED', 'DONOR_REGISTERED',
      'HEALTH_PASSPORT_VIEWED', 'DONOR_CONTACT_REVEALED',
      // Inventory actions
      'INVENTORY_UPDATED', 'INVENTORY_ADDED', 'STOCK_TRANSFERRED',
      // Emergency actions
      'EMERGENCY_REQUEST_CREATED', 'EMERGENCY_BROADCAST_SENT',
      'DONATION_CONFIRMED', 'DONATION_SELF_REPORTED',
      // Admin actions
      'DONOR_FLAGGED', 'DONOR_VERIFIED', 'DONOR_BLOCKED', 'DONOR_UNFLAGGED',
      'BANK_VERIFIED', 'SYSTEM_CONFIG_CHANGED',
      // Security actions
      'SUSPICIOUS_ACTIVITY_DETECTED', 'RATE_LIMIT_HIT', 'RBAC_DENIED',
      'BULK_DATA_ACCESS', 'AADHAAR_HASH_GENERATED',
    ]
  },

  // What resource was affected
  resourceType: String,  // 'donor', 'inventory', 'emergency_request', etc.
  resourceId: String,
  resourceName: String,

  // Details
  details: mongoose.Schema.Types.Mixed, // Any extra context (sanitized)
  previousValue: mongoose.Schema.Types.Mixed, // For update actions
  newValue: mongoose.Schema.Types.Mixed,

  // Outcome
  success: { type: Boolean, default: true },
  errorMessage: String,

  // Tamper detection
  entryHash: String, // SHA-256 of this record's data (self-referential integrity)

  timestamp: { type: Date, default: Date.now, index: true },
}, {
  // No update or delete — audit logs are append-only
  timestamps: false,
})

// Prevent updates to audit logs (tamper protection)
auditLogSchema.pre('findOneAndUpdate', function() {
  throw new Error('Audit logs cannot be modified')
})

// Create tamper-evident hash when saving
const crypto = require('crypto')
auditLogSchema.pre('save', function(next) {
  const data = JSON.stringify({
    userId: this.userId,
    action: this.action,
    resourceId: this.resourceId,
    timestamp: this.timestamp,
    details: this.details,
  })
  this.entryHash = crypto.createHash('sha256').update(data).digest('hex')
  next()
})

auditLogSchema.index({ action: 1, timestamp: -1 })
auditLogSchema.index({ userId: 1, timestamp: -1 })

const AuditLog = mongoose.model('AuditLog', auditLogSchema)

// ── Audit Logger Middleware ──

/**
 * Log a sensitive action
 * Used directly in route handlers
 */
const logAction = async (req, action, details = {}) => {
  try {
    const entry = {
      userId: req.user?.id,
      userRole: req.user?.role,
      userName: req.user?.name,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
      action,
      ...details,
      timestamp: new Date(),
    }

    // Try MongoDB
    try {
      await AuditLog.create(entry)
    } catch (_) {
      // Fallback: console log (dev mode)
      console.log(`📋 AUDIT [${new Date().toISOString()}] ${action} by ${entry.userRole || 'guest'} (${entry.ipAddress})`, details)
    }
  } catch (err) {
    // Audit logging must NEVER block the main request
    console.error('Audit log error (non-blocking):', err.message)
  }
}

/**
 * Express middleware factory for automatic audit logging
 * Usage: router.post('/donate', auditMiddleware('DONATION_CONFIRMED'), handler)
 */
const auditMiddleware = (action, getDetails = () => ({})) => {
  return async (req, res, next) => {
    // Hook into response to capture success/failure
    const originalJson = res.json.bind(res)
    res.json = async (data) => {
      const success = res.statusCode < 400
      await logAction(req, action, {
        success,
        resourceType: req.baseUrl?.split('/')[2],
        resourceId: req.params?.id,
        details: getDetails(req, data),
        errorMessage: success ? undefined : data?.error,
      })
      return originalJson(data)
    }
    next()
  }
}

module.exports = { AuditLog, logAction, auditMiddleware }
