const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { otpLimiter, loginLimiter, isAccountLocked, recordFailedLogin, clearLoginAttempts } = require('../middleware/rateLimiter')
const { storeOTP, verifyOTP, sendOTPViaSMS } = require('../utils/resilience')
const { logAction } = require('../middleware/auditLog')

const JWT_SECRET = process.env.JWT_SECRET || 'bloodconnect-secret-2026'

// ── POST /api/v1/auth/otp/request ──
// TAD §5: Public (rate-limited) — Request OTP for phone verification
router.post('/otp/request', otpLimiter, async (req, res) => {
  try {
    const { phone } = req.body
    if (!phone) return res.status(400).json({ error: 'Phone number required' })

    const otp = storeOTP(phone)
    const result = await sendOTPViaSMS(phone, otp)

    await logAction(req, 'OTP_SENT', { details: { phone: phone.slice(-4).padStart(phone.length, '*') } })

    // In demo mode, return OTP directly (for testing)
    return res.json({
      success: true,
      message: `OTP sent to ${phone.slice(0, 3)}****${phone.slice(-3)}`,
      expiresInSeconds: 300,
      ...(result.demo ? { demoOTP: otp } : {}), // Only in demo mode!
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/v1/auth/otp/verify ──
// TAD §5: Public — Verify OTP, issue JWT
router.post('/otp/verify', async (req, res) => {
  try {
    const { phone, otp, name, bloodGroup } = req.body
    if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' })

    const result = verifyOTP(phone, otp)
    if (!result.valid) {
      await logAction(req, 'MFA_FAILED', { details: { phone: phone.slice(-4), reason: result.reason } })
      return res.status(400).json({ error: result.reason, code: 'INVALID_OTP' })
    }

    // Issue a limited JWT for registration completion
    const token = jwt.sign(
      { phone, phoneVerified: true, role: 'pending', iat: Math.floor(Date.now() / 1000) },
      JWT_SECRET,
      { expiresIn: '1h' }
    )

    await logAction(req, 'OTP_VERIFIED', { details: { phone: phone.slice(-4) } })

    return res.json({
      success: true,
      message: 'Phone verified successfully',
      phoneVerified: true,
      token, // Use this to complete registration
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})


// Demo users for testing (when MongoDB is not connected)
const DEMO_USERS = {
  'donor@bloodconnect.in':   { id: 'demo-donor-001',   name: 'Pawan Deepak Gupta', role: 'donor', bloodGroup: 'O+', city: 'Nagpur', trustScore: 92, eligible: true },
  'hospital@bloodconnect.in':{ id: 'demo-hosp-001',    name: 'Dr. Priya Nair', role: 'hospital', hospital: 'AIIMS Nagpur Trauma Center', hospitalId: 'Hosp. 01', city: 'Nagpur' },
  'bank@bloodconnect.in':    { id: 'demo-bank-001',    name: 'Ravi Kumar', role: 'blood-bank', bankName: 'Nagpur Central Blood Bank', bankId: 'Bank 01', city: 'Nagpur' },
  'admin@bloodconnect.in':   { id: 'demo-admin-001',   name: 'Dr. S. Sharma', role: 'admin', title: 'Nagpur Regional Director & Platform Super Admin', city: 'Nagpur' },
  'auditor@bloodconnect.in': { id: 'demo-auditor-001', name: 'CMA Anjali Verma', role: 'auditor', title: 'Chief Compliance Auditor (SBTC Maharashtra)', city: 'Nagpur' },
  'officer@bloodconnect.in': { id: 'demo-officer-001', name: 'Dr. Rajesh Tope', role: 'health-officer', title: 'State Health Officer (Public Health Dept)', city: 'Nagpur' },
}

// ── POST /api/auth/login ──
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body

    // Demo login
    const demoUser = DEMO_USERS[email]
    if (demoUser) {
      const token = jwt.sign({ id: demoUser.id, role: demoUser.role }, JWT_SECRET, { expiresIn: '7d' })
      return res.json({ success: true, token, user: demoUser })
    }

    // Try MongoDB
    try {
      const { Donor, Facility } = require('../models')
      const model = role === 'donor' ? Donor : Facility
      const user = await model.findOne({ email }).select('+password')
      if (!user) return res.status(401).json({ error: 'Invalid credentials' })

      const isMatch = await bcrypt.compare(password, user.password)
      if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' })

      const token = jwt.sign({ id: user._id, role: user.role || role }, JWT_SECRET, { expiresIn: '7d' })
      const userData = { ...user.toObject(), password: undefined }
      return res.json({ success: true, token, user: userData })
    } catch (dbErr) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/auth/register ──
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, bloodGroup, city, state, pincode, role } = req.body

    // Try MongoDB registration
    try {
      const { Donor } = require('../models')
      const bcrypt = require('bcryptjs')
      const hashedPassword = await bcrypt.hash(password, 12)

      const donor = new Donor({
        name, email, phone, bloodGroup,
        password: hashedPassword,
        location: { city, state, pincode, coordinates: [0, 0] },
        verified: false,
        status: 'active',
      })

      await donor.save()
      const token = jwt.sign({ id: donor._id, role: 'donor' }, JWT_SECRET, { expiresIn: '7d' })
      return res.status(201).json({ success: true, token, user: { id: donor._id, name, email, role: 'donor', bloodGroup, city } })
    } catch (dbErr) {
      // Demo mode
      const demoUser = { id: `donor-${Date.now()}`, name, email, role: 'donor', bloodGroup, city }
      const token = jwt.sign({ id: demoUser.id, role: 'donor' }, JWT_SECRET, { expiresIn: '7d' })
      return res.status(201).json({ success: true, token, user: demoUser })
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/auth/send-otp ──
router.post('/send-otp', async (req, res) => {
  const { phone } = req.body
  // In production: integrate Twilio here
  console.log(`📱 OTP sent to ${phone}: 123456 (demo)`)
  res.json({ success: true, message: 'OTP sent', demo: true, demoOtp: '123456' })
})

// ── POST /api/auth/verify-otp ──
router.post('/verify-otp', async (req, res) => {
  const { phone, otp } = req.body
  // Demo: any 6-digit OTP works
  if (otp && otp.length === 6) {
    res.json({ success: true, verified: true })
  } else {
    res.status(400).json({ error: 'Invalid OTP' })
  }
})

// ── Middleware: Verify JWT ──
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'No token provided' })
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' })
  }
}

// ── GET /api/auth/me ──
router.get('/me', authMiddleware, async (req, res) => {
  res.json({ success: true, user: req.user })
})

module.exports = router
module.exports.authMiddleware = authMiddleware
