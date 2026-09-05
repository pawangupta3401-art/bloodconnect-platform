const express = require('express')
const router = express.Router()
const geminiService = require('../services/geminiService')
const { Donor, Facility, Inventory, EmergencyRequest } = require('../models')

/**
 * GET /api/v1/ai/status
 * Check Gemini AI connectivity & service health
 */
router.get('/status', async (req, res) => {
  try {
    const hasKey = !!process.env.GEMINI_API_KEY
    res.json({
      success: true,
      service: 'Google Gemini AI Live Engine',
      model: 'gemini-3.6-flash',
      configured: hasKey,
      status: hasKey ? 'operational' : 'fallback_mode',
      simulator: geminiService.getSimulatorStatus(),
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

/**
 * GET /api/v1/ai/live-feed
 * Generates dynamic realistic emergency stream, donors, and inventory report
 */
router.get('/live-feed', async (req, res) => {
  try {
    const [emergencies, donors, forecast] = await Promise.all([
      geminiService.generateLiveEmergencyStream(4),
      geminiService.generateLiveDonors(6),
      geminiService.generateInventoryForecast(),
    ])

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      source: 'Gemini AI Real-time Engine',
      data: {
        emergencies,
        donors,
        forecast,
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

/**
 * GET /api/v1/ai/emergencies
 * Generate a stream of active realistic emergencies
 */
router.get('/emergencies', async (req, res) => {
  try {
    const count = parseInt(req.query.count) || 5
    const emergencies = await geminiService.generateLiveEmergencyStream(count)
    res.json({ success: true, count: emergencies.length, data: emergencies })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

/**
 * GET /api/v1/ai/donors
 * Generate realistic verified volunteer donors
 */
router.get('/donors', async (req, res) => {
  try {
    const count = parseInt(req.query.count) || 6
    const donors = await geminiService.generateLiveDonors(count)
    res.json({ success: true, count: donors.length, data: donors })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

/**
 * GET /api/v1/ai/inventory-forecast
 * Generate AI blood supply chain prediction & critical shortages
 */
router.get('/inventory-forecast', async (req, res) => {
  try {
    const forecast = await geminiService.generateInventoryForecast()
    res.json({ success: true, data: forecast })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

/**
 * POST /api/v1/ai/clinical-matching
 * Get AI clinical triage reasoning for an emergency request
 */
router.post('/clinical-matching', async (req, res) => {
  try {
    const emergencyData = req.body
    const rationale = await geminiService.generateAIClinicalMatchingRationale(emergencyData)
    res.json({ success: true, data: rationale })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

/**
 * POST /api/v1/ai/simulate-emergency
 * Generates an instant live emergency SOS event and broadcasts it over Socket.io
 */
router.post('/simulate-emergency', async (req, res) => {
  try {
    const io = req.app.get('io')
    const emergencies = await geminiService.generateLiveEmergencyStream(1)
    const emergency = emergencies[0]

    // Broadcast over socket
    if (io) {
      io.emit('new-emergency', emergency)
      io.emit('live-ai-event', {
        eventId: emergency.id,
        type: 'EMERGENCY_SOS',
        title: `🚨 Emergency ${emergency.bloodGroup} Broadcasted`,
        description: `${emergency.hospitalName}: ${emergency.patientCondition}`,
        bloodGroup: emergency.bloodGroup,
        location: emergency.location?.city || 'Mumbai',
        timestamp: new Date().toISOString(),
        badge: 'LIVE SOS',
        meta: emergency,
      })
    }

    res.json({
      success: true,
      message: 'Simulated live emergency broadcasted across platform',
      data: emergency,
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

/**
 * POST /api/v1/ai/simulator/start
 * Start background live pulse simulator
 */
router.post('/simulator/start', (req, res) => {
  try {
    const io = req.app.get('io')
    const intervalMs = parseInt(req.body.intervalMs) || 12000
    const result = geminiService.startLiveSimulator(io, intervalMs)
    res.json({ success: true, ...result })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

/**
 * POST /api/v1/ai/simulator/stop
 * Stop background live pulse simulator
 */
router.post('/simulator/stop', (req, res) => {
  try {
    const result = geminiService.stopLiveSimulator()
    res.json({ success: true, ...result })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

/**
 * POST /api/v1/ai/chatbot (also /api/v1/ai/eligibility-check)
 * Blood Donation Eligibility Expert Conversation
 */
router.post(['/chatbot', '/eligibility-check'], async (req, res) => {
  try {
    const { message, history } = req.body
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid message string is required' })
    }

    const reply = await geminiService.checkDonorEligibility(message, history || [])
    return res.json({
      success: true,
      role: 'Blood Donation Eligibility Expert',
      reply,
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    console.error('[AI Chatbot Route Error]:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = router

