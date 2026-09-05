// ── Trust Score Engine ──
// Implements Section 5: Fraud Prevention — Trust Score System

const TRUST_EVENTS = {
  // Positive events
  REGISTRATION_COMPLETE:  +5,
  OTP_VERIFIED:           +5,
  AADHAAR_VERIFIED:       +20,
  DONATION_VERIFIED:      +10,  // Confirmed by Bank Admin
  RESPONDED_TO_ALERT:     +3,   // Donor responded within 30 min
  LONG_TERM_DONOR:        +15,  // 5+ verified donations

  // Negative events
  NO_SHOW_CONFIRMED:      -15,  // Bank confirms donor didn't arrive
  REPEATED_NO_SHOW:       -25,  // 3rd+ no-show
  DUPLICATE_SIGNAL:       -20,  // Duplicate phone/ID detected
  FAILED_OTP_MULTIPLE:    -5,   // 5+ failed OTP attempts
  SELF_REPORTED_MISMATCH: -10,  // Self-claim contradicts bank records
}

// Trust Score Thresholds
const TRUST_THRESHOLDS = {
  PRIORITY_MATCH:     60,  // Score ≥ 60 → Priority in matching engine
  NORMAL_MATCH:       30,  // Score 30–59 → Normal matching
  DEPRIORITIZED:      10,  // Score 10–29 → Deprioritized (NOT banned)
  ADMIN_REVIEW:        0,  // Score < 10 → Auto-flag for admin review
}

/**
 * Calculate new trust score after an event
 * @param {number} currentScore - Current trust score (0–100)
 * @param {string} event - Event key from TRUST_EVENTS
 * @returns {number} - New score clamped to 0–100
 */
const applyTrustEvent = (currentScore, event) => {
  const delta = TRUST_EVENTS[event]
  if (delta === undefined) {
    console.warn(`Unknown trust event: ${event}`)
    return currentScore
  }
  const newScore = currentScore + delta
  return Math.max(0, Math.min(100, newScore)) // Clamp 0–100
}

/**
 * Get matching priority based on trust score
 * Key principle: "Deprioritized, NOT silently banned"
 * Low trust donors CAN still donate — just ranked lower
 */
const getMatchingPriority = (trustScore) => {
  if (trustScore >= TRUST_THRESHOLDS.PRIORITY_MATCH) {
    return { priority: 'HIGH', label: '🟢 Priority Match', sortWeight: 1 }
  }
  if (trustScore >= TRUST_THRESHOLDS.NORMAL_MATCH) {
    return { priority: 'NORMAL', label: '🟡 Normal', sortWeight: 2 }
  }
  if (trustScore >= TRUST_THRESHOLDS.ADMIN_REVIEW) {
    return { priority: 'LOW', label: '🟠 Deprioritized', sortWeight: 3 }
  }
  return { priority: 'REVIEW', label: '🔴 Admin Review', sortWeight: 4 }
}

/**
 * Check if donor should be auto-flagged
 * Flags go to Admin Review Queue — NOT auto-banned
 */
const shouldAutoFlag = (donor) => {
  const flags = []

  if (donor.trustScore < TRUST_THRESHOLDS.ADMIN_REVIEW) {
    flags.push('TRUST_SCORE_CRITICAL')
  }
  if (donor.noShowCount >= 3) {
    flags.push('REPEATED_NO_SHOW')
  }
  if (donor.duplicateSignal) {
    flags.push('DUPLICATE_DETECTED')
  }
  if (!donor.verified && donor.createdAt) {
    const daysSinceReg = (Date.now() - donor.createdAt) / 86400000
    if (daysSinceReg > 180 && donor.totalDonations === 0) {
      flags.push('REGISTERED_NEVER_DONATED')
    }
  }

  return { shouldFlag: flags.length > 0, flags }
}

/**
 * Sort donors by trust score for matching engine
 * Maintains humanitarian principle: low-trust can still donate
 */
const sortDonorsByTrust = (donors) => {
  return donors.sort((a, b) => {
    const priorityA = getMatchingPriority(a.trustScore).sortWeight
    const priorityB = getMatchingPriority(b.trustScore).sortWeight
    if (priorityA !== priorityB) return priorityA - priorityB
    return b.trustScore - a.trustScore // Secondary: higher score first
  })
}

/**
 * Update donor trust score in DB
 * @param {string} donorId
 * @param {string} event - from TRUST_EVENTS keys
 */
const updateDonorTrustScore = async (donorId, event) => {
  try {
    const { Donor } = require('../models')
    const donor = await Donor.findById(donorId)
    if (!donor) return null

    const newScore = applyTrustEvent(donor.trustScore, event)
    donor.trustScore = newScore

    // Auto-flag check
    const { shouldFlag, flags } = shouldAutoFlag(donor)
    if (shouldFlag && !donor.flagged) {
      donor.flagged = true
      donor.status = 'suspicious'
      console.log(`🚩 Auto-flagged donor ${donorId}: ${flags.join(', ')}`)
    }

    await donor.save()
    return { donorId, newScore, event, delta: TRUST_EVENTS[event] }
  } catch (err) {
    console.error('Trust score update error:', err.message)
    return null
  }
}

module.exports = {
  TRUST_EVENTS,
  TRUST_THRESHOLDS,
  applyTrustEvent,
  getMatchingPriority,
  shouldAutoFlag,
  sortDonorsByTrust,
  updateDonorTrustScore,
}
