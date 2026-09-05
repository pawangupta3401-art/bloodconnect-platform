// ── RBAC Matrix Implementation ──
// Mirrors exactly the Security Document Section 3 matrix
// Legend: F=Full, V=View, C=Create, U=Update, X=No Access

const RBAC_MATRIX = {
  // Module: { role: permissions[] }
  inventory: {
    admin:       ['read', 'write', 'delete', 'update'],
    'blood-bank':['read', 'write', 'update'],       // own bank only (enforced in middleware)
    hospital:    ['read'],                           // view only
    donor:       [],                                 // X
    auditor:     ['read'],                           // view only
    guest:       [],                                 // X
  },
  emergency_requests: {
    admin:       ['read', 'write', 'delete', 'update'],
    'blood-bank':['read'],                           // view only
    hospital:    ['read', 'write', 'update'],        // own requests only
    donor:       ['read'],                           // own only
    auditor:     ['read'],
    guest:       ['write'],                          // SOS creation allowed (fail-open)
  },
  donor_profile: {
    admin:       ['read', 'write', 'delete', 'update'],
    'blood-bank':['read'],                           // post-match only + masked (enforced in fieldMask)
    hospital:    [],                                 // X — contact revealed by system only
    donor:       ['read', 'write', 'update'],        // own profile only
    auditor:     ['read'],                           // masked (enforced in fieldMask)
    guest:       [],
  },
  donor_health_passport: {
    admin:       ['read'],                           // masked always
    'blood-bank':['read'],                           // masked, own bank, at donation time only
    hospital:    [],                                 // X
    donor:       ['read', 'write', 'update'],        // own full access
    auditor:     [],                                 // X
    guest:       [],
  },
  aadhaar_hash: {
    // NO role has explicit read access — only system uses for verification
    admin:       [],
    'blood-bank':[], hospital: [], donor: [], auditor: [], guest: [],
  },
  donation_ledger: {
    admin:       ['read'],
    'blood-bank':['read', 'write'],                  // create for own bank
    hospital:    [],                                 // X
    donor:       ['read'],                           // own certificates only
    auditor:     ['read'],
    guest:       [],
  },
  fraud_flags: {
    admin:       ['read', 'write', 'delete', 'update'],
    'blood-bank':['read', 'write'],                  // flag only, cannot blacklist
    hospital:    [],
    donor:       [],
    auditor:     ['read'],
    guest:       [],
  },
  system_config: {
    admin:       ['read', 'write', 'delete', 'update'],
    'blood-bank':[], hospital: [], donor: [], auditor: [], guest: [],
  },
}

// ── Check Permission ──
const hasPermission = (role, module, action) => {
  const modulePerms = RBAC_MATRIX[module]
  if (!modulePerms) return false
  const rolePerms = modulePerms[role] || []
  return rolePerms.includes(action)
}

// ── RBAC Middleware Factory ──
// Usage: rbac('inventory', 'write')
const rbac = (module, action) => {
  return (req, res, next) => {
    if (!req.user) {
      // Guest check — only emergency_requests write allowed
      if (module === 'emergency_requests' && action === 'write') {
        return next() // Fail-open for SOS
      }
      return res.status(401).json({ error: 'Authentication required' })
    }

    const role = req.user.role || 'guest'
    if (!hasPermission(role, module, action)) {
      return res.status(403).json({
        error: `Access denied: '${role}' cannot '${action}' on '${module}'`,
        code: 'RBAC_DENIED',
        module,
        action,
        role,
      })
    }
    next()
  }
}

// ── Post-Match Only: Bank Admin donor contact ──
// Bank Admin can only see donor contact AFTER appointment is confirmed
const postMatchOnly = async (req, res, next) => {
  if (req.user.role !== 'blood-bank') return next()

  const { donorId } = req.params
  const { orgId } = req.user

  try {
    const { EmergencyRequest } = require('../models')
    // Check if there's a confirmed match between this bank and this donor
    const confirmedMatch = await EmergencyRequest.findOne({
      'matchedSources.sourceId': orgId,
      'donorsResponded': donorId,
      status: { $in: ['fulfilled', 'searching'] }
    })

    if (!confirmedMatch) {
      // No confirmed appointment — mask contact info
      req.maskContactInfo = true
    }
  } catch (_) {
    req.maskContactInfo = true // Default to masked on error
  }
  next()
}

module.exports = { RBAC_MATRIX, hasPermission, rbac, postMatchOnly }
