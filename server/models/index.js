const mongoose = require('mongoose')

// ════════════════════════════════════════════════
// TAD Section 4: Core Database Schema
// Aligned with: PostgreSQL schema (implemented in MongoDB for MVP)
// ════════════════════════════════════════════════

// ── DONOR MODEL ──
// TAD: id, name, phone(unique), blood_group, id_hash,
//      location_lat/lng, last_donation_date, trust_score, eligibility_status
const donorSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true },

  // TAD: phone VARCHAR (unique) — OTP-verified
  phone:    { type: String, required: true, unique: true },
  phone_encrypted: { type: String }, // AES-256 encrypted (Security Doc §6)

  // TAD: id_hash VARCHAR — one-way hash of Govt ID, NOT raw value
  aadhaarHash: { type: String, select: false }, // HMAC-SHA256, never returned

  // TAD: blood_group ENUM A+, A-, B+, B-, O+, O-, AB+, AB-
  bloodGroup: {
    type: String, required: true,
    enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
  },

  // TAD: location_lat / location_lng DECIMAL — approximate, for radius search
  location: {
    type:        { type: String, default: 'Point' },
    coordinates: [Number], // [longitude, latitude] — GeoJSON format
    city:        String,
    state:       String,
    pincode:     String,
    // Exact address encrypted (Security Doc §6 — never shown to hospitals)
    exactAddress_encrypted: { type: String, select: false },
  },

  // TAD: last_donation_date DATE — used for 90-day eligibility calculation
  lastDonationDate: { type: Date },
  nextEligibleDate: { type: Date }, // Auto-calculated

  // TAD: trust_score INTEGER — increases/decreases based on history
  trustScore:    { type: Number, default: 0, min: 0, max: 100 },
  noShowCount:   { type: Number, default: 0 }, // Tracks consecutive no-shows
  totalDonations:{ type: Number, default: 0 },

  // TAD: eligibility_status ENUM eligible / not_eligible / blacklisted
  eligibilityStatus: {
    type: String,
    enum: ['eligible', 'not_eligible', 'blacklisted'],
    default: 'eligible'
  },

  // Auth & verification
  password:  { type: String, required: true, select: false },
  verified:  { type: Boolean, default: false }, // Aadhaar verified
  role:      { type: String, default: 'donor' },
  status:    { type: String, enum: ['active', 'inactive', 'blocked', 'suspicious'], default: 'active' },
  flagged:   { type: Boolean, default: false },
  duplicateSignal: { type: Boolean, default: false },

  // Health data (encrypted — Security Doc §6)
  healthData_encrypted: { type: String, select: false },

  // Notification preferences
  notificationPrefs: {
    push:  { type: Boolean, default: true },
    sms:   { type: Boolean, default: true },
    email: { type: Boolean, default: true },
  },

  // MFA & session
  mfaVerified:  { type: Boolean, default: false },
  tokenVersion: { type: Number, default: 0 }, // Increment to invalidate all sessions
  loginAttempts:{ type: Number, default: 0 },
  lockedUntil:  { type: Date },

}, { timestamps: true })

// Geospatial index (TAD: radius search)
donorSchema.index({ location: '2dsphere' })
donorSchema.index({ bloodGroup: 1, eligibilityStatus: 1, status: 1 }) // Matching engine
donorSchema.index({ trustScore: -1 }) // Trust-based sorting
donorSchema.index({ phone: 1 }, { unique: true }) // Duplicate detection

// Auto-calculate eligibility (90-day rule — PRD FR-B2)
donorSchema.pre('save', function(next) {
  if (this.lastDonationDate) {
    const daysSince = Math.floor((Date.now() - this.lastDonationDate) / 86400000)
    if (daysSince >= 90) {
      this.eligibilityStatus = 'eligible'
      this.nextEligibleDate = undefined
    } else {
      this.eligibilityStatus = 'not_eligible'
      this.nextEligibleDate = new Date(this.lastDonationDate.getTime() + 90 * 86400000)
    }
  }
  // Keep blacklisted status (never auto-override)
  if (this.status === 'blocked') this.eligibilityStatus = 'blacklisted'
  next()
})

const Donor = mongoose.model('Donor', donorSchema)

// ── FACILITY MODEL (Blood Banks + Hospitals) ──
const facilitySchema = new mongoose.Schema({
  name:         { type: String, required: true },
  type:         { type: String, enum: ['blood-bank', 'hospital'], required: true },
  contactEmail: { type: String, required: true, unique: true },
  contactPhone: String,
  password:     { type: String, required: true, select: false },

  location: {
    type:        { type: String, default: 'Point' },
    coordinates: [Number],
    address:     String,
    city:        String,
    state:       String,
    pincode:     String,
  },

  verifiedStatus: { type: Boolean, default: false },
  licenseNumber:  String,
  role:           { type: String, default: 'facility' },
  facilityRole:   { type: String, enum: ['blood-bank', 'hospital'] },

  // Security Doc §4: MFA required for Bank Admin and Hospital Staff
  mfaEnabled:   { type: Boolean, default: true },
  tokenVersion: { type: Number, default: 0 },

  // Low-stock alert thresholds (PRD FR-A4)
  lowStockThresholds: {
    type: Map,
    of: Number,
    default: { 'A+': 10, 'A-': 5, 'B+': 10, 'B-': 5, 'O+': 15, 'O-': 8, 'AB+': 8, 'AB-': 3 }
  }
}, { timestamps: true })

facilitySchema.index({ location: '2dsphere' })
const Facility = mongoose.model('Facility', facilitySchema)

// ── INVENTORY UNIT MODEL ──
// TAD: id, bank_id(FK), blood_group, component_type,
//      collection_date, expiry_date(system-calc), status
const inventorySchema = new mongoose.Schema({
  // TAD: bank_id UUID (FK) — references blood_banks
  bankId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true },

  // TAD: blood_group ENUM
  bloodGroup: {
    type: String, required: true,
    enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
  },

  // TAD: component_type ENUM — 14 types matching e-RaktKosh government blood bank system exactly
  componentType: {
    type: String, required: true,
    enum: [
      'Whole Blood',
      'Packed Red Blood Cells',
      'Sagm Packed Red Blood Cells',
      'Irradiated RBC',
      'Leukoreduced RBC',
      'Fresh Frozen Plasma',
      'Cryo Poor Plasma',
      'Cryoprecipitate',
      'Plasma',
      'Single Donor Plasma',
      'Platelet Concentrate',
      'Platelet Rich Plasma',
      'Random Donor Platelets',
      'Single Donor Platelet'
    ]
  },

  // Last time a bank admin updated this stock entry (PRD: data freshness requirement)
  lastUpdated: { type: Date, default: Date.now },

  units: { type: Number, required: true, min: 0 },

  // TAD: collection_date DATE
  collectionDate: { type: Date, required: true },

  // TAD: expiry_date DATE — system-calculated (42 days WB, 5 days platelets, 1yr plasma)
  expiryDate: { type: Date },

  // TAD: status ENUM available / reserved / used / expired (+ near-expiry extension)
  status: {
    type: String,
    enum: ['available', 'reserved', 'used', 'expired', 'near-expiry'],
    default: 'available'
  },

  batchId:     String,
  reservedFor: { type: mongoose.Schema.Types.ObjectId, ref: 'EmergencyRequest' },

}, { timestamps: true })

// Expiry days by component category (e-RaktKosh clinical standards)
const COMPONENT_EXPIRY_DAYS = {
  'Whole Blood':               42,
  'Packed Red Blood Cells':    42,
  'Sagm Packed Red Blood Cells': 42,
  'Irradiated RBC':            42,
  'Leukoreduced RBC':          42,
  'Fresh Frozen Plasma':       365,
  'Cryo Poor Plasma':          365,
  'Cryoprecipitate':           365,
  'Plasma':                    365,
  'Single Donor Plasma':       365,
  'Platelet Concentrate':      5,
  'Platelet Rich Plasma':      5,
  'Random Donor Platelets':    5,
  'Single Donor Platelet':     5,
}

// Auto-calculate expiry + status (PRD FR-A2, FR-A5)
inventorySchema.pre('save', function(next) {
  if (!this.expiryDate && this.collectionDate) {
    const days = COMPONENT_EXPIRY_DAYS[this.componentType] || 42
    this.expiryDate = new Date(this.collectionDate.getTime() + days * 86400000)
  }
  if (this.expiryDate) {
    const daysLeft = Math.floor((this.expiryDate - Date.now()) / 86400000)
    if (daysLeft <= 0)  this.status = 'expired'
    else if (daysLeft <= 5 && this.status === 'available') this.status = 'near-expiry'
  }
  // Auto-stamp lastUpdated on every save
  if (this.isModified('units')) this.lastUpdated = new Date()
  next()
})

inventorySchema.index({ bankId: 1, bloodGroup: 1, status: 1 })
inventorySchema.index({ expiryDate: 1, status: 1 }) // Expiry alert queries
const Inventory = mongoose.model('Inventory', inventorySchema)

// ── EMERGENCY REQUEST MODEL ──
// TAD: id, requester_id(FK), blood_group, units_needed,
//      urgency_level ENUM, status ENUM, created_at
const emergencyRequestSchema = new mongoose.Schema({
  // TAD: requester_id UUID (FK) — Hospital/Staff account
  requesterId:   { type: mongoose.Schema.Types.ObjectId, refPath: 'requesterModel' },
  requesterModel:{ type: String, enum: ['Facility', 'Donor'] },
  requesterName: String,   // For guest/SOS (no account)
  requesterPhone:String,

  // TAD: blood_group ENUM
  bloodGroup: {
    type: String, required: true,
    enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
  },
  componentType: { type: String, default: 'Whole Blood' },

  // TAD: units_needed INTEGER
  unitsNeeded: { type: Number, required: true, min: 1 },

  // TAD: urgency_level ENUM critical / high / normal
  urgencyLevel: {
    type: String,
    enum: ['critical', 'high', 'normal'],
    default: 'high'
  },

  // TAD: status ENUM open / matched / fulfilled / expired
  status: {
    type: String,
    enum: ['open', 'matched', 'fulfilled', 'expired', 'cancelled'],
    default: 'open'
  },

  location: {
    type:        { type: String, default: 'Point' },
    coordinates: [Number],
    description: String,
  },

  matchedSources: [{
    sourceType: String,
    sourceId:   mongoose.Schema.Types.ObjectId,
    sourceName: String,
    distance:   Number,
    units:      Number,
    eta:        String,
  }],

  donorsNotified:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Donor' }],
  donorsResponded: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Donor' }],
  fulfilledAt: Date,
  notes:       String,
  performanceMs: Number, // TAD NFR: track matching time

}, { timestamps: true })

emergencyRequestSchema.index({ location: '2dsphere' })
emergencyRequestSchema.index({ status: 1, urgencyLevel: 1, createdAt: -1 })
const EmergencyRequest = mongoose.model('EmergencyRequest', emergencyRequestSchema)

// ── DONATION RECORD MODEL ──
// TAD: id, donor_id(FK), bank_id(FK), request_id(FK nullable),
//      confirmed_by(FK), ledger_hash, certificate_id
const donationRecordSchema = new mongoose.Schema({
  // TAD: donor_id UUID (FK)
  donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor', required: true },

  // TAD: bank_id UUID (FK)
  bankId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true },

  // TAD: request_id UUID (FK, nullable) — null if voluntary non-emergency donation
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmergencyRequest', default: null },

  // TAD: confirmed_by UUID (FK) — Bank Admin who confirmed
  confirmedBy:    String, // Staff name or ID
  confirmedById:  { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },

  bloodGroup: String,
  units:      { type: Number, default: 1 },
  timestamp:  { type: Date, default: Date.now },
  verified:   { type: Boolean, default: false },

  // TAD: certificate_id VARCHAR — digital certificate reference
  certificateId: String,

  // TAD: ledger_hash VARCHAR — hash-chain entry reference (Security Doc §5)
  ledgerHash:   String,
  previousHash: String,

  // Donor consent recorded at donation time
  consentGiven: { type: Boolean, default: true },

}, { timestamps: true })

donationRecordSchema.index({ donorId: 1, timestamp: -1 })
donationRecordSchema.index({ certificateId: 1 }, { unique: true, sparse: true })
const DonationRecord = mongoose.model('DonationRecord', donationRecordSchema)

// ── NOTIFICATION LOG MODEL ──
const notificationLogSchema = new mongoose.Schema({
  recipientId:   mongoose.Schema.Types.ObjectId,
  recipientType: String,
  requestId:    { type: mongoose.Schema.Types.ObjectId, ref: 'EmergencyRequest' },
  channel:      { type: String, enum: ['sms', 'push', 'email', 'socket'] },
  message:      String,
  sentAt:       { type: Date, default: Date.now },
  responseStatus: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'responded', 'failed'],
    default: 'sent'
  },
  respondedAt: Date,
}, { timestamps: true })

notificationLogSchema.index({ recipientId: 1, sentAt: -1 })
const NotificationLog = mongoose.model('NotificationLog', notificationLogSchema)

module.exports = { Donor, Facility, Inventory, EmergencyRequest, DonationRecord, NotificationLog }
