// ── Matching / Routing Engine ──
// TAD Section 2: "Nearest-inventory search, donor radius search,
//                 SOS broadcast logic, urgency queueing"
// NFR: Must return results in < 3 seconds

const { sortDonorsByTrust } = require('../utils/trustScore')

// ── Haversine formula for distance calculation ──
const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Urgency Priority Queue ──
const URGENCY_PRIORITY = { critical: 0, high: 1, normal: 2 }
const sortByUrgency = (requests) =>
  [...requests].sort((a, b) =>
    URGENCY_PRIORITY[a.urgencyLevel] - URGENCY_PRIORITY[b.urgencyLevel]
  )

// ══════════════════════════════════════════════════════════
// FEATURE 2: Blood Compatibility Intelligence
// ══════════════════════════════════════════════════════════

/**
 * DONOR_COMPATIBILITY — what blood groups can each donor blood group donate to?
 * Medical reference: ABO/Rh compatibility chart
 *  O- = universal donor (can donate to all 8 groups)
 *  AB+ = universal recipient (can receive from all 8 groups)
 */
const DONOR_COMPATIBILITY = {
  'O-':  ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],  // Universal donor
  'O+':  ['O+', 'A+', 'B+', 'AB+'],
  'A-':  ['A-', 'A+', 'AB-', 'AB+'],
  'A+':  ['A+', 'AB+'],
  'B-':  ['B-', 'B+', 'AB-', 'AB+'],
  'B+':  ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'],                                                  // Can only donate to AB+
}

/**
 * RECIPIENT_COMPATIBILITY — what donor groups can donate to this recipient group?
 * Derived by inverting DONOR_COMPATIBILITY.
 * Used to find ALL valid inventory sources when a hospital requests blood.
 */
const RECIPIENT_COMPATIBILITY = {
  'O-':  ['O-'],
  'O+':  ['O-', 'O+'],
  'A-':  ['O-', 'A-'],
  'A+':  ['O-', 'O+', 'A-', 'A+'],
  'B-':  ['O-', 'B-'],
  'B+':  ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],   // Universal recipient
}

/**
 * Returns compatibility label for UI display
 */
const getMatchType = (requestedGroup, sourceGroup) => {
  if (requestedGroup === sourceGroup) return 'exact'
  const compatible = RECIPIENT_COMPATIBILITY[requestedGroup] || []
  return compatible.includes(sourceGroup) ? 'compatible' : 'incompatible'
}

// ══════════════════════════════════════════════════════════

// ── Demo inventory sources with coordinates & blood stock ──
const INVENTORY_SOURCES = [
  { id: 'bank-001', name: 'LifeSource Blood Bank',  type: 'blood-bank', bank_type: 'private', lat: 28.6139, lng: 77.2090, city: 'Delhi',   phone: '+91 98765 00001', rating: 4.8, district: 'New Delhi' },
  { id: 'bank-002', name: 'Red Cross Center',        type: 'blood-bank', bank_type: 'ngo_accredited', lat: 19.0760, lng: 72.8777, city: 'Mumbai',  phone: '+91 98765 00002', rating: 4.7, district: 'South Mumbai' },
  { id: 'hosp-001', name: 'Apollo Hospital',         type: 'hospital',   bank_type: 'private', lat: 19.0822, lng: 72.8416, city: 'Mumbai',  phone: '+91 98765 00003', rating: 4.9, district: 'South Mumbai' },
  { id: 'hosp-002', name: 'KEM Hospital (Govt)',    type: 'hospital',   bank_type: 'government', lat: 19.0047, lng: 72.8427, city: 'Mumbai',  phone: '+91 98765 00004', rating: 4.7, district: 'Parel' },
  { id: 'bank-003', name: 'Hinduja Blood Center',    type: 'blood-bank', bank_type: 'private', lat: 19.0650, lng: 72.8300, city: 'Mumbai',  phone: '+91 98765 00005', rating: 4.6, district: 'Mahim' },
  { id: 'bank-004', name: 'AIIMS Delhi Blood Bank',  type: 'blood-bank', bank_type: 'government', lat: 28.5672, lng: 77.2100, city: 'Delhi',   phone: '+91 98765 00006', rating: 4.9, district: 'South Delhi' },
  { id: 'bank-005', name: 'Government Medical College (GMCH) Blood Bank', type: 'blood-bank', bank_type: 'government', lat: 21.1275, lng: 79.0963, city: 'Nagpur', phone: '+91 712 274 4400', rating: 4.8, district: 'Nagpur' },
  { id: 'bank-006', name: 'AIIMS Nagpur Blood Centre', type: 'blood-bank', bank_type: 'government', lat: 21.0374, lng: 79.0270, city: 'Nagpur', phone: '+91 712 281 2000', rating: 4.9, district: 'Nagpur' },
  { id: 'bank-007', name: 'Super Speciality Hospital (SSH) Blood Centre', type: 'blood-bank', bank_type: 'government', lat: 21.1290, lng: 79.0980, city: 'Nagpur', phone: '+91 712 274 4402', rating: 4.8, district: 'Nagpur' },
  { id: 'bank-008', name: 'Kingsway Hospitals Blood Bank', type: 'blood-bank', bank_type: 'private', lat: 21.1555, lng: 79.0854, city: 'Nagpur', phone: '+91 712 678 9100', rating: 4.8, district: 'Nagpur' },
  { id: 'bank-009', name: 'Care Hospital Blood Centre', type: 'blood-bank', bank_type: 'private', lat: 21.1347, lng: 79.0772, city: 'Nagpur', phone: '+91 712 398 2222', rating: 4.7, district: 'Nagpur' },
  { id: 'bank-010', name: 'Alexis Multispeciality Hospital', type: 'blood-bank', bank_type: 'private', lat: 21.1912, lng: 79.0768, city: 'Nagpur', phone: '+91 712 712 0000', rating: 4.8, district: 'Nagpur' },
  { id: 'bank-011', name: 'Dr. Hedgewar Raktpedhi', type: 'blood-bank', bank_type: 'trust_run', lat: 21.1428, lng: 79.0620, city: 'Nagpur', phone: '+91 712 253 4344', rating: 4.9, district: 'Nagpur' },
]

// Seed blood stock per source (realistic units per group)
const DEMO_STOCK = {
  'bank-001': { 'O-': 16, 'O+': 42, 'A-': 8,  'A+': 35, 'B-': 4,  'B+': 28, 'AB-': 3,  'AB+': 19 },
  'bank-002': { 'O-': 19, 'O+': 51, 'A-': 11, 'A+': 41, 'B-': 6,  'B+': 33, 'AB-': 4,  'AB+': 22 },
  'hosp-001': { 'O-': 12, 'O+': 38, 'A-': 7,  'A+': 29, 'B-': 3,  'B+': 24, 'AB-': 2,  'AB+': 15 },
  'hosp-002': { 'O-': 14, 'O+': 44, 'A-': 9,  'A+': 32, 'B-': 5,  'B+': 27, 'AB-': 3,  'AB+': 18 },
  'bank-003': { 'O-': 15, 'O+': 47, 'A-': 10, 'A+': 38, 'B-': 5,  'B+': 30, 'AB-': 3,  'AB+': 20 },
  'bank-004': { 'O-': 22, 'O+': 58, 'A-': 14, 'A+': 45, 'B-': 8,  'B+': 37, 'AB-': 5,  'AB+': 25 },
  'bank-005': { 'O-': 18, 'O+': 55, 'A-': 12, 'A+': 42, 'B-': 8,  'B+': 36, 'AB-': 6,  'AB+': 24 },
  'bank-006': { 'O-': 15, 'O+': 48, 'A-': 10, 'A+': 38, 'B-': 7,  'B+': 32, 'AB-': 5,  'AB+': 20 },
  'bank-007': { 'O-': 14, 'O+': 42, 'A-': 9,  'A+': 35, 'B-': 6,  'B+': 30, 'AB-': 4,  'AB+': 18 },
  'bank-008': { 'O-': 11, 'O+': 36, 'A-': 7,  'A+': 28, 'B-': 5,  'B+': 24, 'AB-': 3,  'AB+': 16 },
  'bank-009': { 'O-': 10, 'O+': 32, 'A-': 6,  'A+': 26, 'B-': 4,  'B+': 22, 'AB-': 3,  'AB+': 14 },
  'bank-010': { 'O-': 9,  'O+': 30, 'A-': 5,  'A+': 24, 'B-': 4,  'B+': 20, 'AB-': 2,  'AB+': 12 },
  'bank-011': { 'O-': 20, 'O+': 65, 'A-': 15, 'A+': 50, 'B-': 10, 'B+': 45, 'AB-': 8,  'AB+': 30 },
}

// Expiry data for redistribution engine (days until expiry)
const DEMO_EXPIRY = {
  'bank-001': { 'O-': 12, 'O+': 20, 'A-': 3,  'A+': 18, 'B-': 4,  'B+': 15, 'AB-': 7,  'AB+': 25 },
  'bank-002': { 'O-': 8,  'O+': 22, 'A-': 5,  'A+': 30, 'B-': 3,  'B+': 12, 'AB-': 6,  'AB+': 18 },
  'bank-003': { 'O-': 4,  'O+': 14, 'A-': 2,  'A+': 19, 'B-': 6,  'B+': 28, 'AB-': 1,  'AB+': 9  },
  'bank-004': { 'O-': 15, 'O+': 35, 'A-': 7,  'A+': 42, 'B-': 11, 'B+': 19, 'AB-': 3,  'AB+': 21 },
  'bank-005': { 'O-': 3,  'O+': 18, 'A-': 4,  'A+': 24, 'B-': 3,  'B+': 8,  'AB-': 5,  'AB+': 13 },
  'bank-006': { 'O-': 4,  'O+': 16, 'A-': 3,  'A+': 22, 'B-': 4,  'B+': 19, 'AB-': 2,  'AB+': 15 },
  'bank-007': { 'O-': 5,  'O+': 20, 'A-': 4,  'A+': 25, 'B-': 5,  'B+': 18, 'AB-': 3,  'AB+': 17 },
  'bank-008': { 'O-': 14, 'O+': 28, 'A-': 10, 'A+': 22, 'B-': 8,  'B+': 21, 'AB-': 9,  'AB+': 19 },
  'bank-009': { 'O-': 16, 'O+': 25, 'A-': 12, 'A+': 30, 'B-': 9,  'B+': 24, 'AB-': 11, 'AB+': 22 },
  'bank-010': { 'O-': 18, 'O+': 29, 'A-': 14, 'A+': 26, 'B-': 12, 'B+': 20, 'AB-': 10, 'AB+': 18 },
  'bank-011': { 'O-': 9,  'O+': 24, 'A-': 6,  'A+': 30, 'B-': 8,  'B+': 28, 'AB-': 7,  'AB+': 25 },
}

module.exports.INVENTORY_SOURCES = INVENTORY_SOURCES
module.exports.DEMO_STOCK = DEMO_STOCK
module.exports.DEMO_EXPIRY = DEMO_EXPIRY
module.exports.DONOR_COMPATIBILITY = DONOR_COMPATIBILITY
module.exports.RECIPIENT_COMPATIBILITY = RECIPIENT_COMPATIBILITY
module.exports.getMatchType = getMatchType

// ── Step 1: Inventory Match (Compatibility-Aware) ──
const searchInventory = async (bloodGroup, lat, lng, radiusKm = 20) => {
  const startTime = Date.now()

  // Groups that can donate to the requested bloodGroup (compatibility-aware)
  const compatibleSources = RECIPIENT_COMPATIBILITY[bloodGroup] || [bloodGroup]

  // Try MongoDB geospatial query first
  try {
    const { Inventory } = require('../models')
    const results = await Inventory.find({
      bloodGroup: { $in: compatibleSources },
      status: { $in: ['available', 'near-expiry'] },
      units: { $gt: 0 },
    }).populate('bankId', 'name city location phone')

    if (results.length > 0) {
      const withDistance = results
        .map(inv => ({
          id: inv.bankId._id,
          name: inv.bankId.name,
          type: 'blood-bank',
          city: inv.bankId.city,
          units: inv.units,
          bloodGroup: inv.bloodGroup,
          componentType: inv.componentType,
          status: inv.status,
          matchType: getMatchType(bloodGroup, inv.bloodGroup),
          distance: haversineDistance(
            lat, lng,
            inv.bankId.location?.coordinates[1] || lat,
            inv.bankId.location?.coordinates[0] || lng
          ),
          sourceType: 'inventory',
        }))
        .filter(r => r.distance <= radiusKm)
        .sort((a, b) => {
          // Exact matches first, then by distance
          if (a.matchType !== b.matchType) {
            return a.matchType === 'exact' ? -1 : 1
          }
          return a.distance - b.distance
        })

      return { matches: withDistance, queryTimeMs: Date.now() - startTime }
    }
  } catch (_) {
    // Fallback to demo data
  }

  // Demo mode — compatibility-aware fallback
  // Build matches from ALL compatible groups, not just exact match
  const matches = []
  for (const source of INVENTORY_SOURCES) {
    for (const srcGroup of compatibleSources) {
      const units = DEMO_STOCK[source.id]?.[srcGroup]
      if (!units || units === 0) continue
      const dist = haversineDistance(lat, lng, source.lat, source.lng)
      if (dist > radiusKm && radiusKm < 20) continue
      matches.push({
        ...source,
        units,
        bloodGroup: srcGroup,
        matchType: getMatchType(bloodGroup, srcGroup),
        distance: dist,
        eta: `${Math.max(1, Math.ceil(dist / 30 * 60))} min`,
        sourceType: 'inventory',
        available: true,
        priority: srcGroup === bloodGroup ? 1 : 2,
      })
    }
  }

  // Sort: exact first, then by distance
  matches.sort((a, b) => {
    if (a.matchType !== b.matchType) return a.matchType === 'exact' ? -1 : 1
    return a.distance - b.distance
  })

  return { matches: matches.slice(0, 8), queryTimeMs: Date.now() - startTime, demo: true }
}

// ── Step 2: Donor Radius Search (uses DONOR→RECIPIENT map) ──
const searchEligibleDonors = async (bloodGroup, lat, lng, radiusKm = 10) => {
  const startTime = Date.now()

  // Donors that can donate to this recipient (compatibility-aware)
  const acceptableGroups = RECIPIENT_COMPATIBILITY[bloodGroup] || [bloodGroup]

  try {
    const { Donor } = require('../models')
    const donors = await Donor.find({
      bloodGroup: { $in: acceptableGroups },
      eligibilityStatus: true,
      status: 'active',
      verified: true,
      location: {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radiusKm * 1000
        }
      }
    }).select('name bloodGroup trustScore totalDonations location')

    const sorted = sortDonorsByTrust(donors)
    return {
      donors: sorted.map((d, i) => ({
        id: d._id,
        name: `Nearby Donor`,
        bloodGroup: d.bloodGroup,
        matchType: getMatchType(bloodGroup, d.bloodGroup),
        trustScore: d.trustScore,
        donations: d.totalDonations,
        distance: haversineDistance(
          lat, lng,
          d.location?.coordinates[1] || lat,
          d.location?.coordinates[0] || lng
        ),
        sourceType: 'donor',
        eta: `${20 + i * 5} min`,
      })),
      queryTimeMs: Date.now() - startTime
    }
  } catch (_) {
    return {
      donors: [
        { id: 'D001', name: 'Nearby Donor', bloodGroup, matchType: 'exact',      trustScore: 87, distance: 0.8, eta: '20 min', sourceType: 'donor' },
        { id: 'D002', name: 'Nearby Donor', bloodGroup, matchType: 'exact',      trustScore: 72, distance: 1.5, eta: '28 min', sourceType: 'donor' },
        { id: 'D003', name: 'Nearby Donor', bloodGroup: 'O-', matchType: 'compatible', trustScore: 94, distance: 2.1, eta: '35 min', sourceType: 'donor' },
      ],
      queryTimeMs: Date.now() - startTime,
      demo: true
    }
  }
}

// ── Main Matching Engine ──
const runMatchingEngine = async ({
  bloodGroup,
  lat = 19.0760,
  lng = 72.8777,
  radiusKm = 20,
  urgencyLevel = 'high',
  unitsNeeded = 1,
}) => {
  const engineStart = Date.now()

  const [inventoryResult, donorResult] = await Promise.all([
    searchInventory(bloodGroup, lat, lng, radiusKm),
    searchEligibleDonors(bloodGroup, lat, lng, Math.min(radiusKm, 15)),
  ])

  const inventoryMatches = inventoryResult.matches || []
  const donorMatches = donorResult.donors || []

  // Combined results — inventory first, donors second
  // Within each group: exact matches before compatible
  const allMatches = [
    ...inventoryMatches.map(m => ({ ...m, priority: m.matchType === 'exact' ? 1 : 2 })),
    ...donorMatches.map(d => ({ ...d, priority: d.matchType === 'exact' ? 3 : 4 })),
  ].sort((a, b) => a.priority - b.priority || a.distance - b.distance)

  const totalTimeMs = Date.now() - engineStart
  const totalInventoryUnits = inventoryMatches.reduce((s, m) => s + (m.units || 0), 0)
  const inventorySufficient = totalInventoryUnits >= unitsNeeded

  // Summary breakdown for UI
  const exactMatches      = allMatches.filter(m => m.matchType === 'exact').length
  const compatibleMatches = allMatches.filter(m => m.matchType === 'compatible').length

  return {
    success: allMatches.length > 0,
    bloodGroup,
    urgencyLevel,
    unitsNeeded,
    totalMatches: allMatches.length,
    exactMatches,
    compatibleMatches,
    inventoryMatches: inventoryMatches.length,
    donorMatchesFound: donorMatches.length,
    inventorySufficient,
    matches: allMatches.slice(0, 10),
    performanceMs: totalTimeMs,
    meetsNFR: totalTimeMs < 3000,
    searchRadius: `${radiusKm} km`,
    broadcastRequired: !inventorySufficient,
    compatibilityNote: compatibleMatches > 0
      ? `${compatibleMatches} compatible substitutes found in addition to exact matches`
      : null,
  }
}

// ── SOS Broadcast Queue ──
const broadcastToEligibleDonors = async (requestId, bloodGroup, location, urgencyLevel) => {
  try {
    const { Donor } = require('../models')
    const { NotificationLog } = require('../models')

    const acceptableGroups = RECIPIENT_COMPATIBILITY[bloodGroup] || [bloodGroup]
    const eligibleDonors = await Donor.find({
      bloodGroup: { $in: acceptableGroups },
      eligibilityStatus: true,
      status: 'active',
      'notificationPrefs.sms': true,
    }).select('_id name phone_encrypted bloodGroup')

    const logs = eligibleDonors.map(donor => ({
      recipientId: donor._id,
      recipientType: 'Donor',
      requestId,
      channel: 'sms',
      message: `🆘 URGENT: ${bloodGroup} blood needed near ${location}. Can you donate? Reply YES.`,
      sentAt: new Date(),
      responseStatus: 'sent',
    }))

    if (logs.length > 0) {
      await NotificationLog.insertMany(logs).catch(() => {})
    }

    console.log(`📡 SOS broadcast: ${eligibleDonors.length} donors notified for ${bloodGroup} (compatible groups: ${acceptableGroups.join(', ')})`)
    return { notified: eligibleDonors.length, requestId, compatibleGroupsSearched: acceptableGroups }
  } catch (err) {
    const demoCount = Math.floor(Math.random() * 30) + 20
    console.log(`📡 SOS broadcast (demo): ${demoCount} donors notified`)
    return { notified: demoCount, requestId, demo: true }
  }
}

module.exports = {
  runMatchingEngine,
  searchInventory,
  searchEligibleDonors,
  broadcastToEligibleDonors,
  sortByUrgency,
  haversineDistance,
  DONOR_COMPATIBILITY,
  RECIPIENT_COMPATIBILITY,
  RECIPIENT_COMPATIBILITY,
  getMatchType,
  INVENTORY_SOURCES,
  DEMO_STOCK,
  DEMO_EXPIRY,
}
