// ── Emergency Request Routes ──
// TAD §5: POST /api/v1/requests — Create emergency request + run matching engine
// Epic 4, Ticket 4.1 + 4.2

const express = require('express')
const router = express.Router()
const { runMatchingEngine, broadcastToEligibleDonors } = require('../services/matchingEngine')
const { optionalAuth, authenticate } = require('../middleware/auth')
const { sosLimiter } = require('../middleware/rateLimiter')
const { logAction } = require('../middleware/auditLog')

// ── POST /api/v1/requests ── Ticket 4.1: Create emergency request
// TAD §5: "Create emergency request" — Hospital role (optional for SOS)
router.post('/', sosLimiter, optionalAuth, async (req, res) => {
  try {
    const {
      requesterName, requesterPhone, bloodGroup,
      componentType, unitsNeeded, urgencyLevel,
      lat = 19.0760, lng = 72.8777,
      location, notes
    } = req.body

    if (!bloodGroup) {
      return res.status(400).json({ error: 'bloodGroup is required', code: 'MISSING_FIELD' })
    }

    // Ticket 4.2: Run matching engine (parallel inventory + donor search, < 3sec)
    const matchResult = await runMatchingEngine({
      bloodGroup,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      radiusKm: 20,
      urgencyLevel: urgencyLevel || 'high',
      unitsNeeded: parseInt(unitsNeeded) || 1,
    })

    // Audit log (Security Doc §7)
    await logAction(req, 'EMERGENCY_REQUEST_CREATED', {
      resourceType: 'emergency_request',
      details: { bloodGroup, urgencyLevel, location, matchesFound: matchResult.totalMatches },
      success: true,
    })

    // If no inventory — async broadcast to donors (non-blocking)
    if (matchResult.broadcastRequired) {
      const requestId = `ER-${Date.now()}`
      broadcastToEligibleDonors(requestId, bloodGroup, location, urgencyLevel || 'high')
        .catch(err => console.error('Broadcast error:', err.message))
    }

    // Save to DB if available
    try {
      const { EmergencyRequest } = require('../models')
      const request = new EmergencyRequest({
        requesterName,
        requesterPhone,
        bloodGroup,
        componentType: componentType || 'Whole Blood',
        unitsNeeded: parseInt(unitsNeeded) || 1,
        urgencyLevel: urgencyLevel || 'high',
        location: {
          type: 'Point',
          coordinates: [parseFloat(lng), parseFloat(lat)],
          description: location,
        },
        status: matchResult.inventorySufficient ? 'matched' : 'open',
        matchedSources: matchResult.matches?.slice(0, 5) || [],
        notes,
        performanceMs: matchResult.performanceMs,
      })
      await request.save()

      return res.status(201).json({
        success: true,
        requestId: request._id,
        ...matchResult,
        requesterName,
        location,
        notes,
      })
    } catch (_) {
      // Demo mode
      return res.status(201).json({
        success: true,
        requestId: `ER-${Date.now()}`,
        demo: true,
        ...matchResult,
        requesterName,
        location,
        notes,
      })
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/v1/requests/:id/broadcast ── Ticket 4.2: Trigger donor broadcast
// TAD §5: Hospital role only
router.post('/:id/broadcast', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const { bloodGroup, location, urgencyLevel } = req.body

    const result = await broadcastToEligibleDonors(id, bloodGroup, location, urgencyLevel || 'high')

    await logAction(req, 'EMERGENCY_BROADCAST_SENT', {
      resourceId: id,
      details: { bloodGroup, donorsNotified: result.notified }
    })

    res.json({
      success: true,
      requestId: id,
      donorsNotified: result.notified,
      message: `SOS broadcast sent to ${result.notified} eligible donors`,
      channels: ['SMS', 'Push Notification', 'Socket.io'],
      demo: result.demo || false,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/v1/requests/match ── Ticket 4.2: Find nearest match
router.get('/match', optionalAuth, async (req, res) => {
  try {
    const { bloodGroup = 'O+', lat = 19.0760, lng = 72.8777, radius = 20 } = req.query

    const result = await runMatchingEngine({
      bloodGroup,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      radiusKm: parseFloat(radius),
    })

    res.json({
      success: true,
      bloodGroup,
      matchCount: result.totalMatches,
      matches: result.matches,
      performanceMs: result.performanceMs,
      meetsNFR: result.meetsNFR,
      searchRadius: result.searchRadius,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/v1/sos ── One-tap SOS (TAD §5: Verified Hospital / co-signed)
router.post('/sos', sosLimiter, optionalAuth, async (req, res) => {
  try {
    const { bloodGroup, location, requesterName, requesterPhone, urgencyLevel = 'critical' } = req.body

    if (!bloodGroup) return res.status(400).json({ error: 'bloodGroup required' })

    // Simultaneously: match + broadcast
    const [matchResult, broadcastResult] = await Promise.all([
      runMatchingEngine({ bloodGroup, lat: 19.0760, lng: 72.8777, radiusKm: 50, urgencyLevel }),
      broadcastToEligibleDonors(`SOS-${Date.now()}`, bloodGroup, location, urgencyLevel),
    ])

    await logAction(req, 'EMERGENCY_BROADCAST_SENT', {
      details: { type: 'SOS', bloodGroup, urgencyLevel, location }
    })

    res.status(201).json({
      success: true,
      type: 'SOS',
      requestId: `SOS-${Date.now()}`,
      bloodGroup,
      urgencyLevel,
      inventoryMatches: matchResult.matches,
      donorsNotified: broadcastResult.notified,
      totalMatches: matchResult.totalMatches,
      message: '🆘 SOS broadcast sent to all connected banks and eligible donors!',
      responseExpected: 'Under 5 minutes',
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/v1/requests/queue ── Active requests sorted by urgency
router.get('/queue', authenticate, async (req, res) => {
  try {
    const { EmergencyRequest } = require('../models')
    const queue = await EmergencyRequest
      .find({ status: { $in: ['open', 'matched'] } })
      .sort({ urgencyLevel: 1, createdAt: -1 })
      .limit(20)
    res.json({ success: true, queue, total: queue.length })
  } catch (_) {
    res.json({
      success: true, demo: true,
      queue: [
        { id: 'ER001', bloodGroup: 'O-', unitsNeeded: 2, urgencyLevel: 'critical', status: 'open', createdAt: new Date(Date.now() - 5 * 60000) },
        { id: 'ER002', bloodGroup: 'AB+', unitsNeeded: 1, urgencyLevel: 'high', status: 'matched', createdAt: new Date(Date.now() - 2 * 3600000) },
        { id: 'ER003', bloodGroup: 'B-', unitsNeeded: 3, urgencyLevel: 'normal', status: 'open', createdAt: new Date(Date.now() - 24 * 3600000) },
      ],
      total: 3
    })
  }
})

// ── PUT /api/v1/requests/:id/status ── Update request status
router.put('/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body
    try {
      const { EmergencyRequest } = require('../models')
      const request = await EmergencyRequest.findByIdAndUpdate(
        req.params.id,
        { status, ...(status === 'fulfilled' ? { fulfilledAt: new Date() } : {}) },
        { new: true }
      )
      return res.json({ success: true, request })
    } catch (_) {
      return res.json({ success: true, demo: true, message: `Request ${req.params.id} → ${status}` })
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ════════════════════════════════════════════════════
// REAL-TIME SOCKET ALERT: POST /api/v1/requests/trigger-alert
// Broadcasts an instant Emergency Alert popup to all connected clients
// ════════════════════════════════════════════════════
router.post(['/trigger-alert', '/trigger-emergency'], (req, res) => {
  try {
    const {
      bloodGroup = 'O-',
      hospitalName = 'Apex Trauma Center, New Delhi',
      unitsRequired = 2,
      location = 'Emergency ICU Ward 4',
      patientCondition = 'Severe Acute Hemorrhage / Critical Trauma',
      urgencyLevel = 'critical'
    } = req.body

    const io = req.app.get('io')

    const alertPayload = {
      id: `ALERT-${Date.now()}`,
      title: '🚨 CRITICAL EMERGENCY SOS ALERT',
      bloodGroup,
      hospitalName,
      unitsRequired: parseInt(unitsRequired) || 2,
      location,
      patientCondition,
      urgencyLevel,
      timestamp: new Date().toLocaleTimeString(),
      isoTimestamp: new Date().toISOString()
    }

    const { sendTelegramAlert, sendEmergencyEmail, sendWhatsAppAlert } = require('../services/notificationService')

    if (io) {
      // Broadcast emergency_alert to all listeners
      io.emit('emergency_alert', alertPayload)
      io.emit('new-emergency', alertPayload)
      io.emit('live-ai-event', {
        eventId: alertPayload.id,
        type: 'EMERGENCY_SOS',
        title: `🚨 Emergency ${bloodGroup} Alert Broadcasted`,
        description: `${hospitalName}: ${patientCondition}`,
        bloodGroup,
        location,
        timestamp: new Date().toISOString(),
        badge: 'CRITICAL SOS',
        meta: alertPayload
      })
    }

    // Trigger Telegram Bot API, WhatsApp Cloud API, and Nodemailer Code Red dispatch in background
    Promise.all([
      sendTelegramAlert(alertPayload),
      sendEmergencyEmail({ alertData: alertPayload }),
      sendWhatsAppAlert('+919876543210', bloodGroup, location, alertPayload.id),
    ]).catch(err => console.warn('[Emergency Dispatcher Notification Warning]:', err.message))

    return res.status(200).json({
      success: true,
      message: 'Emergency alert successfully emitted to Socket.io, Telegram Bot, WhatsApp, and Email dispatchers!',
      channels: ['Socket.io Live Broadcast', 'Telegram Bot API', 'WhatsApp Cloud API', 'Nodemailer Emergency Email'],
      alert: alertPayload
    })
  } catch (err) {
    console.error('[Trigger Alert Error]:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = router


