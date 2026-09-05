// ── Donor Routes ──
// Epic 2, Ticket 2.1 + 2.2 — Donor Registration + Eligibility Engine

const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const { authenticate, authorize } = require('../middleware/auth')
const { rbac } = require('../middleware/rbac')
const { validateBloodGroup } = require('../middleware/rateLimiter')
const { logAction } = require('../middleware/auditLog')
const { hashAadhaar, encrypt, maskDonorData } = require('../utils/encryption')
const { updateDonorTrustScore, TRUST_EVENTS } = require('../utils/trustScore')

const JWT_SECRET = process.env.JWT_SECRET || 'bloodconnect-secret-2026'

// ════════════════════════════════════════════════════
// TICKET 2.1 — Donor Registration Flow (OTP-based)
// ════════════════════════════════════════════════════

// ── POST /api/v1/donors ──
// Create donor profile (Ticket 2.1: "Donor registration API with OTP-based verification")
// Called AFTER OTP verification (phone verified token required OR demo mode)
router.post('/', validateBloodGroup, async (req, res) => {
  try {
    const {
      name, email, phone, password, bloodGroup,
      city, state, pincode, lat, lng,
      aadhaarNumber,    // Ticket 2.1: Aadhaar for identity — NEVER stored raw
      healthData,       // Optional: Hb level, deferral history
    } = req.body

    // Validation
    if (!name || !email || !phone || !password || !bloodGroup) {
      return res.status(400).json({
        error: 'Required: name, email, phone, password, bloodGroup',
        code: 'MISSING_FIELDS'
      })
    }

    try {
      const { Donor } = require('../models')

      // ── Ticket 2.1: Duplicate detection (Security Doc §5) ──
      const aadhaarHash = aadhaarNumber ? hashAadhaar(aadhaarNumber) : undefined
      const existingPhone  = await Donor.findOne({ phone })
      const existingEmail  = await Donor.findOne({ email })
      const existingAadhaar = aadhaarHash ? await Donor.findOne({ aadhaarHash }).select('+aadhaarHash') : null

      if (existingPhone)  return res.status(409).json({ error: 'Phone already registered', code: 'DUPLICATE_PHONE' })
      if (existingEmail)  return res.status(409).json({ error: 'Email already registered', code: 'DUPLICATE_EMAIL' })
      if (existingAadhaar) return res.status(409).json({ error: 'Government ID already registered', code: 'DUPLICATE_ID', flagged: true })

      // Hash password (Security Doc §4 — bcrypt)
      const hashedPassword = await bcrypt.hash(password, 12)

      // Encrypt sensitive fields (Security Doc §6 — AES-256)
      const phone_encrypted = encrypt(phone)
      const healthData_encrypted = healthData ? encrypt(JSON.stringify(healthData)) : undefined

      // Build donor document
      const donor = new Donor({
        name,
        email,
        phone,
        phone_encrypted,
        password: hashedPassword,
        bloodGroup,
        aadhaarHash,              // One-way hash only (TAD §4)
        healthData_encrypted,
        location: {
          type: 'Point',
          coordinates: [parseFloat(lng) || 72.8777, parseFloat(lat) || 19.0760],
          city: city || 'Mumbai',
          state: state || 'Maharashtra',
          pincode,
        },
        verified: !!aadhaarHash,          // Aadhaar provided = verified
        eligibilityStatus: 'eligible',    // TAD §4 default
        trustScore: aadhaarHash ? 25 : 5, // REGISTRATION_COMPLETE + AADHAAR_VERIFIED
        status: 'active',
      })

      await donor.save()

      // Trust score events (Security Doc §5)
      await updateDonorTrustScore(donor._id, 'REGISTRATION_COMPLETE')
      if (aadhaarHash) await updateDonorTrustScore(donor._id, 'AADHAAR_VERIFIED')

      // Audit log
      await logAction(req, 'DONOR_REGISTERED', {
        resourceId: donor._id.toString(),
        resourceType: 'donor',
        details: { bloodGroup, city, verified: !!aadhaarHash }
      })

      // Issue JWT (TAD §5 — after registration)
      const token = jwt.sign(
        { id: donor._id, role: 'donor', bloodGroup, mfaVerified: false },
        JWT_SECRET,
        { expiresIn: '24h' }
      )

      // Return masked data (aadhaarHash never returned)
      const donorData = maskDonorData(donor, 'donor')

      return res.status(201).json({
        success: true,
        message: 'Donor registered successfully! Complete Aadhaar verification to become eligible for matching.',
        token,
        donor: donorData,
      })

    } catch (dbErr) {
      // Demo mode fallback
      console.log('⚠️ DB unavailable — demo registration')
      const demoToken = jwt.sign({ id: `demo-${Date.now()}`, role: 'donor', bloodGroup }, JWT_SECRET, { expiresIn: '24h' })
      return res.status(201).json({
        success: true,
        demo: true,
        message: 'Demo registration successful!',
        token: demoToken,
        donor: { name, email, phone: phone.slice(0, 3) + '****', bloodGroup, city, eligibilityStatus: 'eligible', trustScore: 25 }
      })
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ════════════════════════════════════════════════════
// TICKET 2.2 — Eligibility Engine (90-day rule)
// ════════════════════════════════════════════════════

// ── GET /api/v1/donors/:id/eligibility ──
// TAD §5: "Check donor eligibility status" — Authenticated
router.get('/:id/eligibility', authenticate, async (req, res) => {
  try {
    const { id } = req.params

    try {
      const { Donor } = require('../models')
      const donor = await Donor.findById(id).select('bloodGroup eligibilityStatus lastDonationDate nextEligibleDate trustScore')

      if (!donor) return res.status(404).json({ error: 'Donor not found' })

      // Calculate exact days since last donation (Ticket 2.2)
      const daysSinceLastDonation = donor.lastDonationDate
        ? Math.floor((Date.now() - donor.lastDonationDate) / 86400000)
        : null

      const daysUntilEligible = donor.nextEligibleDate
        ? Math.max(0, Math.ceil((donor.nextEligibleDate - Date.now()) / 86400000))
        : 0

      return res.json({
        success: true,
        donorId: id,
        bloodGroup: donor.bloodGroup,
        eligibilityStatus: donor.eligibilityStatus,         // eligible / not_eligible / blacklisted
        isEligible: donor.eligibilityStatus === 'eligible',
        lastDonationDate: donor.lastDonationDate,
        nextEligibleDate: donor.nextEligibleDate,
        daysSinceLastDonation,
        daysUntilEligible,                                  // PRD FR-B3: shown to ineligible donors
        rule: '90-day minimum gap between whole blood donations',
        trustScore: donor.trustScore,
      })
    } catch (_) {
      // Demo fallback
      return res.json({
        success: true,
        demo: true,
        donorId: id,
        eligibilityStatus: 'eligible',
        isEligible: true,
        daysSinceLastDonation: 104,
        daysUntilEligible: 0,
        rule: '90-day minimum gap between whole blood donations',
        trustScore: 87,
      })
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/v1/donors ── List donors (admin/bank only)
router.get('/', authenticate, rbac('donor_profile', 'read'), async (req, res) => {
  try {
    const { city, bloodGroup, status, verified, page = 1, limit = 20 } = req.query
    const filter = {}
    if (city)       filter['location.city'] = new RegExp(city, 'i')
    if (bloodGroup) filter.bloodGroup = bloodGroup
    if (status)     filter.status = status
    if (verified)   filter.verified = verified === 'true'

    try {
      const { Donor } = require('../models')
      const donors = await Donor
        .find(filter)
        .select('-password -aadhaarHash -phone_encrypted -healthData_encrypted')
        .sort({ trustScore: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))

      const masked = donors.map(d => maskDonorData(d, req.user.role, false))
      return res.json({ success: true, data: masked, total: masked.length, page: parseInt(page) })
    } catch (_) {
      // Demo fallback
      return res.json({
        success: true, demo: true,
        data: [
          { id: 'D001', name: 'Arjun Sharma', bloodGroup: 'O+', city: 'Mumbai', trustScore: 87, totalDonations: 3, verified: true, eligibilityStatus: 'eligible' },
          { id: 'D002', name: 'Priya Mehta', bloodGroup: 'A+', city: 'Delhi', trustScore: 94, totalDonations: 7, verified: true, eligibilityStatus: 'eligible' },
          { id: 'D003', name: 'Rahul Singh', bloodGroup: 'B-', city: 'Pune', trustScore: 12, totalDonations: 0, verified: false, eligibilityStatus: 'not_eligible' },
        ],
        total: 3
      })
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/v1/donors/nearby ── Ticket 3.2: Geolocation radius search
// Returns MASKED donor data (no contact info — Security Doc §3)
router.get('/nearby', authenticate, async (req, res) => {
  try {
    const { lat = 19.0760, lng = 72.8777, radius = 10, bloodGroup } = req.query
    const { searchEligibleDonors } = require('../services/matchingEngine')

    const result = await searchEligibleDonors(
      bloodGroup || 'O+',
      parseFloat(lat), parseFloat(lng),
      parseFloat(radius)
    )

    return res.json({
      success: true,
      count: result.donors.length,
      searchRadius: `${radius} km`,
      data: result.donors, // Already anonymized in matchingEngine
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/v1/donors/leaderboard/:city ── Donor leaderboard
router.get('/leaderboard/:city', async (req, res) => {
  try {
    const { city } = req.params
    try {
      const { Donor } = require('../models')
      const donors = await Donor
        .find({ 'location.city': new RegExp(city, 'i'), verified: true })
        .sort({ totalDonations: -1, trustScore: -1 })
        .limit(10)
        .select('name bloodGroup totalDonations trustScore')

      const leaderboard = donors.map((d, i) => ({
        rank: i + 1,
        name: d.name[0] + '***', // Partial anonymization
        bloodGroup: d.bloodGroup,
        donations: d.totalDonations,
        trustScore: d.trustScore,
      }))
      return res.json({ success: true, city, leaderboard })
    } catch (_) {
      return res.json({
        success: true, city, demo: true,
        leaderboard: [
          { rank: 1, name: 'Priya M.', bloodGroup: 'A+', donations: 24, trustScore: 100 },
          { rank: 2, name: 'Rahul S.', bloodGroup: 'O+', donations: 21, trustScore: 98 },
          { rank: 3, name: 'Anita K.', bloodGroup: 'B+', donations: 19, trustScore: 95 },
        ]
      })
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/v1/donors/:id ── Get own profile (donor) or masked (others)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    try {
      const { Donor } = require('../models')
      const donor = await Donor.findById(id)
      if (!donor) return res.status(404).json({ error: 'Donor not found' })

      // Apply RBAC masking based on requester role (Security Doc §3)
      const isOwnProfile = req.user.id === id
      const masked = maskDonorData(donor, isOwnProfile ? 'donor' : req.user.role)

      await logAction(req, 'DONOR_PROFILE_VIEWED', { resourceId: id })
      return res.json({ success: true, data: masked })
    } catch (_) {
      return res.json({ success: true, demo: true, data: { id, name: 'Arjun Sharma', bloodGroup: 'O+', trustScore: 87, eligibilityStatus: 'eligible' } })
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── PUT /api/v1/donors/:id ── Update own profile
router.put('/:id', authenticate, authorize(['donor', 'admin']), async (req, res) => {
  try {
    const { id } = req.params
    // Donors can only update own profile (Security Doc §3)
    if (req.user.role === 'donor' && req.user.id !== id) {
      return res.status(403).json({ error: 'Can only update own profile', code: 'FORBIDDEN' })
    }
    const allowed = ['name', 'city', 'state', 'pincode', 'notificationPrefs', 'lat', 'lng']
    const updates = {}
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key]
    }
    try {
      const { Donor } = require('../models')
      const donor = await Donor.findByIdAndUpdate(id, updates, { new: true })
      await logAction(req, 'DONOR_PROFILE_UPDATED', { resourceId: id })
      return res.json({ success: true, data: maskDonorData(donor, 'donor') })
    } catch (_) {
      return res.json({ success: true, demo: true, message: 'Profile updated (demo)' })
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ════════════════════════════════════════════════════
// GEOSPATIAL: GET /api/v1/donors/nearest ($geoNear)
// Find 5 nearest available donors within a radius
// ════════════════════════════════════════════════════
router.get('/geo/nearest', async (req, res) => {
  try {
    const lng = parseFloat(req.query.lng) || 77.2090
    const lat = parseFloat(req.query.lat) || 28.6139
    const maxDistanceMeters = parseInt(req.query.maxDistance) || 50000 // 50km default
    const bloodGroup = req.query.bloodGroup

    try {
      const { Donor } = require('../models')
      const matchStage = {
        eligibilityStatus: 'eligible',
        status: 'active'
      }
      if (bloodGroup) matchStage.bloodGroup = bloodGroup

      const nearestDonors = await Donor.aggregate([
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [lng, lat]
            },
            distanceField: 'distanceMeters',
            maxDistance: maxDistanceMeters,
            spherical: true,
            query: matchStage
          }
        },
        { $limit: 5 },
        {
          $project: {
            name: 1,
            bloodGroup: 1,
            city: '$location.city',
            state: '$location.state',
            coordinates: '$location.coordinates',
            trustScore: 1,
            eligibilityStatus: 1,
            distanceKm: { $round: [{ $divide: ['$distanceMeters', 1000] }, 2] }
          }
        }
      ])

      if (nearestDonors && nearestDonors.length > 0) {
        return res.json({ success: true, count: nearestDonors.length, data: nearestDonors })
      }
    } catch (mongoErr) {
      console.warn('[Donors GeoNear] MongoDB aggregate fallback:', mongoErr.message)
    }

    // High-fidelity fallback / demo nearest donors if MongoDB has no docs or in demo mode
    const fallbackDonors = [
      { id: 'DON-01', name: 'Aarav Sharma', bloodGroup: bloodGroup || 'O+', distanceKm: 2.4, city: 'Delhi', trustScore: 94, coordinates: [lng + 0.015, lat + 0.012], phone: '+91 98*** ****1' },
      { id: 'DON-02', name: 'Pooja Verma', bloodGroup: bloodGroup || 'O-', distanceKm: 4.8, city: 'Delhi', trustScore: 91, coordinates: [lng - 0.022, lat + 0.018], phone: '+91 97*** ****8' },
      { id: 'DON-03', name: 'Rohan Deshmukh', bloodGroup: bloodGroup || 'B+', distanceKm: 7.1, city: 'Noida', trustScore: 88, coordinates: [lng + 0.045, lat - 0.031], phone: '+91 99*** ****3' },
      { id: 'DON-04', name: 'Ananya Nair', bloodGroup: bloodGroup || 'A+', distanceKm: 9.3, city: 'Gurugram', trustScore: 96, coordinates: [lng - 0.051, lat - 0.042], phone: '+91 96*** ****5' },
      { id: 'DON-05', name: 'Vikram Mehta', bloodGroup: bloodGroup || 'AB+', distanceKm: 12.0, city: 'Faridabad', trustScore: 85, coordinates: [lng + 0.068, lat + 0.055], phone: '+91 95*** ****2' },
    ]

    return res.json({
      success: true,
      demo: true,
      count: fallbackDonors.length,
      searchCenter: { lng, lat },
      data: fallbackDonors
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ════════════════════════════════════════════════════
// QR CODE: GET /api/v1/donors/:id/qr
// Returns Base64 QR code image for donor digital identity
// ════════════════════════════════════════════════════
router.get('/:id/qr', async (req, res) => {
  try {
    const { id } = req.params
    const { generateQRCode } = require('../utils/qrCode')

    const qrPayload = {
      donorId: id,
      verifiedBy: 'BloodConnect Verified Protocol PS-01',
      platform: 'BloodConnect India',
      timestamp: new Date().toISOString(),
      verifyUrl: `https://bloodconnect.org/verify/donor/${id}`
    }

    const qrDataUrl = await generateQRCode(qrPayload, {
      darkColor: '#dc2626',
      lightColor: '#ffffff',
      width: 320
    })

    return res.json({
      success: true,
      donorId: id,
      qrImage: qrDataUrl,
      payload: qrPayload
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = router

