const express = require('express')
const router = express.Router()

// ── GET /api/admin/stats ── Platform overview
router.get('/stats', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        totalDonors: 48241,
        verifiedDonors: 44180,
        blockedDonors: 6,
        flaggedDonors: 2,
        totalBloodBanks: 156,
        verifiedBanks: 149,
        activeRequests: 3,
        fulfilledToday: 12,
        avgResponseTime: '4.2 min',
        fraudRate: '1.8%',
        systemUptime: '99.8%',
        kpis: {
          avgTimeToLocate: { value: '4.2 min', target: '< 5 min', met: true },
          fulfillmentRate: { value: '91.3%', target: '> 90%', met: true },
          wastageReduction: { value: '28%', target: '> 30%', met: false },
          fraudRate: { value: '1.8%', target: '< 2%', met: true },
          donorResponseRate: { value: '27.4%', target: '> 25%', met: true },
        }
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/admin/donors/:id/flag ── Flag a donor
router.post('/donors/:id/flag', async (req, res) => {
  try {
    const { reason } = req.body
    res.json({ success: true, message: `Donor ${req.params.id} flagged`, reason })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/admin/donors/:id/block ── Block a donor
router.post('/donors/:id/block', async (req, res) => {
  try {
    res.json({ success: true, message: `Donor ${req.params.id} blocked` })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/admin/donors/:id/verify ── Verify a donor
router.post('/donors/:id/verify', async (req, res) => {
  try {
    res.json({ success: true, message: `Donor ${req.params.id} verified` })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/admin/donations/:id/confirm ── Confirm a donation
router.post('/donations/:id/confirm', async (req, res) => {
  try {
    const { confirmedBy } = req.body
    const certificateId = `BC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    res.json({ success: true, message: 'Donation confirmed', certificateId, confirmedBy })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/admin/fraud-detection ── Fraud signals
router.get('/fraud-detection', async (req, res) => {
  try {
    res.json({
      success: true,
      signals: [
        { type: 'no-donation-6months', count: 2, severity: 'medium' },
        { type: 'duplicate-phone', count: 1, severity: 'high' },
        { type: 'low-trust-score', count: 1, severity: 'high' },
      ],
      fraudRate: '1.8%',
      target: '< 2%',
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════
// FEATURE 5: Disaster / Mass-Casualty Mode
// ══════════════════════════════════════════════════════════

let activeDisasterSession = null

// POST /api/v1/admin/disaster/activate - Activate mass-casualty protocol
router.post('/disaster/activate', async (req, res) => {
  try {
    const {
      incidentType = 'Major Rail Accident / Mass Casualty',
      location = 'Central Junction, Nagpur Zone',
      radius = 35,
      groups = [
        { bloodGroup: 'O-', unitsNeeded: 15 },
        { bloodGroup: 'O+', unitsNeeded: 25 },
        { bloodGroup: 'A+', unitsNeeded: 20 },
        { bloodGroup: 'B+', unitsNeeded: 20 },
        { bloodGroup: 'AB+', unitsNeeded: 10 },
      ],
      activatedBy = 'Platform Super Admin',
    } = req.body

    const io = req.app.get('io')
    const { broadcastToEligibleDonors } = require('../services/matchingEngine')
    const disasterId = `DISASTER-${Date.now()}`

    const requests = groups.map((g, idx) => ({
      id: `ER-DISASTER-${Date.now()}-${idx + 1}`,
      bloodGroup: g.bloodGroup,
      unitsNeeded: parseInt(g.unitsNeeded) || 10,
      unitsCollected: 0,
      urgencyLevel: 'critical',
      location,
      status: 'active',
      createdAt: new Date().toISOString(),
    }))

    activeDisasterSession = {
      disasterId,
      incidentType,
      location,
      radius: parseInt(radius) || 35,
      activatedBy,
      activatedAt: new Date().toISOString(),
      active: true,
      requests,
      targetUnits: groups.reduce((sum, g) => sum + (parseInt(g.unitsNeeded) || 0), 0),
      fulfilledUnits: 0,
    }

    // Fan-out broadcast to all blood groups simultaneously
    for (const g of groups) {
      broadcastToEligibleDonors(disasterId, g.bloodGroup, location, 'critical')
        .catch(err => console.error('Disaster broadcast err:', err.message))
    }

    // Real-time broadcast
    if (io) {
      io.emit('disaster:activated', {
        ...activeDisasterSession,
        headline: `🚨 CODE RED MASS CASUALTY PROTOCOL ACTIVATED: ${incidentType}`,
      })
      io.emit('emergency_alert', {
        id: disasterId,
        title: `🚨 MASS CASUALTY PROTOCOL: ${incidentType}`,
        bloodGroup: 'ALL GROUPS (O-, O+, A+, B+)',
        unitsRequired: activeDisasterSession.targetUnits,
        location,
        urgencyLevel: 'critical',
        isDisaster: true,
        timestamp: new Date().toLocaleTimeString(),
      })
    }

    res.status(201).json({
      success: true,
      message: `Disaster protocol activated for ${location}`,
      session: activeDisasterSession,
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/v1/admin/disaster/active
router.get('/disaster/active', (req, res) => {
  res.json({
    success: true,
    active: !!activeDisasterSession?.active,
    session: activeDisasterSession,
  })
})

// POST /api/v1/admin/disaster/deactivate
router.post('/disaster/deactivate', (req, res) => {
  const io = req.app.get('io')
  if (activeDisasterSession) {
    activeDisasterSession.active = false
    activeDisasterSession.deactivatedAt = new Date().toISOString()
  }

  if (io) {
    io.emit('disaster:deactivated', {
      message: 'Disaster mode has been deactivated. System returned to normal state.',
      timestamp: new Date().toISOString(),
    })
  }

  res.json({
    success: true,
    message: 'Disaster protocol deactivated.',
    session: activeDisasterSession,
  })
})

// ══════════════════════════════════════════════════════════
// FEATURE 7: District-Level Blood Security Index
// ══════════════════════════════════════════════════════════

const DISTRICT_DATA = [
  {
    district: 'Nagpur Metro',
    state: 'Maharashtra',
    population: '2.9 Million',
    dailyRequirementUnits: 85,
    banksCount: 14,
    groups: {
      'O-':  { units: 18,  dailyUsage: 9.5, daysSupply: 1.9, status: 'critical' },
      'O+':  { units: 142, dailyUsage: 28.0, daysSupply: 5.1, status: 'stable' },
      'A-':  { units: 22,  dailyUsage: 6.2, daysSupply: 3.5, status: 'warning' },
      'A+':  { units: 98,  dailyUsage: 21.0, daysSupply: 4.7, status: 'warning' },
      'B-':  { units: 14,  dailyUsage: 7.8, daysSupply: 1.8, status: 'critical' },
      'B+':  { units: 110, dailyUsage: 22.5, daysSupply: 4.9, status: 'warning' },
      'AB-': { units: 9,   dailyUsage: 4.1, daysSupply: 2.2, status: 'warning' },
      'AB+': { units: 62,  dailyUsage: 10.0, daysSupply: 6.2, status: 'stable' },
    },
  },
  {
    district: 'South Mumbai',
    state: 'Maharashtra',
    population: '3.1 Million',
    dailyRequirementUnits: 120,
    banksCount: 22,
    groups: {
      'O-':  { units: 46,  dailyUsage: 14.0, daysSupply: 3.3, status: 'warning' },
      'O+':  { units: 280, dailyUsage: 42.0, daysSupply: 6.7, status: 'stable' },
      'A-':  { units: 38,  dailyUsage: 9.5,  daysSupply: 4.0, status: 'warning' },
      'A+':  { units: 195, dailyUsage: 31.0, daysSupply: 6.3, status: 'stable' },
      'B-':  { units: 24,  dailyUsage: 11.2, daysSupply: 2.1, status: 'warning' },
      'B+':  { units: 210, dailyUsage: 34.0, daysSupply: 6.2, status: 'stable' },
      'AB-': { units: 16,  dailyUsage: 5.5,  daysSupply: 2.9, status: 'warning' },
      'AB+': { units: 115, dailyUsage: 16.0, daysSupply: 7.2, status: 'stable' },
    },
  },
  {
    district: 'Central Delhi',
    state: 'Delhi NCR',
    population: '2.6 Million',
    dailyRequirementUnits: 95,
    banksCount: 18,
    groups: {
      'O-':  { units: 29,  dailyUsage: 12.0, daysSupply: 2.4, status: 'warning' },
      'O+':  { units: 210, dailyUsage: 33.0, daysSupply: 6.4, status: 'stable' },
      'A-':  { units: 19,  dailyUsage: 8.0,  daysSupply: 2.4, status: 'warning' },
      'A+':  { units: 145, dailyUsage: 25.0, daysSupply: 5.8, status: 'stable' },
      'B-':  { units: 12,  dailyUsage: 9.0,  daysSupply: 1.3, status: 'critical' },
      'B+':  { units: 160, dailyUsage: 27.0, daysSupply: 5.9, status: 'stable' },
      'AB-': { units: 8,   dailyUsage: 4.5,  daysSupply: 1.8, status: 'critical' },
      'AB+': { units: 85,  dailyUsage: 12.0, daysSupply: 7.1, status: 'stable' },
    },
  },
  {
    district: 'Pune District',
    state: 'Maharashtra',
    population: '4.2 Million',
    dailyRequirementUnits: 110,
    banksCount: 19,
    groups: {
      'O-':  { units: 21,  dailyUsage: 11.5, daysSupply: 1.8, status: 'critical' },
      'O+':  { units: 190, dailyUsage: 35.0, daysSupply: 5.4, status: 'stable' },
      'A-':  { units: 15,  dailyUsage: 8.2,  daysSupply: 1.8, status: 'critical' },
      'A+':  { units: 130, dailyUsage: 27.0, daysSupply: 4.8, status: 'warning' },
      'B-':  { units: 18,  dailyUsage: 9.5,  daysSupply: 1.9, status: 'critical' },
      'B+':  { units: 140, dailyUsage: 28.0, daysSupply: 5.0, status: 'stable' },
      'AB-': { units: 11,  dailyUsage: 5.0,  daysSupply: 2.2, status: 'warning' },
      'AB+': { units: 75,  dailyUsage: 13.0, daysSupply: 5.8, status: 'stable' },
    },
  },
]

// GET /api/v1/admin/security-index - District-level blood supply vulnerability matrix
router.get('/security-index', (req, res) => {
  try {
    const totalDistricts = DISTRICT_DATA.length
    let totalCriticalCells = 0
    let totalWarningCells = 0
    let totalStableCells = 0

    DISTRICT_DATA.forEach(d => {
      Object.values(d.groups).forEach(g => {
        if (g.status === 'critical') totalCriticalCells++
        else if (g.status === 'warning') totalWarningCells++
        else totalStableCells++
      })
    })

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalDistricts,
        totalCriticalCells,
        totalWarningCells,
        totalStableCells,
        vulnerabilityRate: `${Math.round((totalCriticalCells / (totalDistricts * 8)) * 100)}%`,
        policyRecommendation: 'Immediate inter-district transfer from South Mumbai to Nagpur & Central Delhi recommended for O- and B- reserves.',
      },
      districts: DISTRICT_DATA,
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = router

