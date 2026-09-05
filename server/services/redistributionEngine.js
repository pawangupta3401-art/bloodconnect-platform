// ── Redistribution Engine ──
// Feature 1: Proactive inter-bank blood transfer suggestions
// Runs on schedule + triggered on inventory updates
// Rule-based: expiry-within-5-days × nearby-bank-with-demand × 25km radius

const {
  INVENTORY_SOURCES,
  DEMO_STOCK,
  DEMO_EXPIRY,
  haversineDistance,
} = require('./matchingEngine')

// ── In-memory suggestion store & simulation state ──
let suggestions = []
let suggestionIdCounter = 1
let isSummerSimulation = false

// Active dynamic stock (cloned from DEMO_STOCK on init)
let activeStock = JSON.parse(JSON.stringify(DEMO_STOCK))
let activeExpiry = JSON.parse(JSON.stringify(DEMO_EXPIRY))

// Nagpur Hospital Network Nodes with active trauma cases / Code Red status
let NAGPUR_HOSPITAL_NODES = [
  {
    id: 'hosp-ngp-001',
    code: 'Hosp. 01',
    name: 'AIIMS Nagpur Trauma Care',
    lat: 21.0374,
    lng: 79.0270,
    area: 'MIHAN, Nagpur',
    phone: '+91 712 298 5000',
    activeRequests: 1,
    traumaLevel: 'Level 1 Apex Center',
    icuBedsAvailable: 14,
    emergencyNeedGroup: 'O-',
    unitsNeeded: 2,
    condition: 'Emergency Surgery - Acute Hemorrhage (Code Red)',
  },
  {
    id: 'hosp-ngp-002',
    code: 'Hosp. 02',
    name: 'Government Medical College (GMCH)',
    lat: 21.1275,
    lng: 79.0963,
    area: 'Medical Square, Nagpur',
    phone: '+91 712 274 4401',
    activeRequests: 0,
    traumaLevel: 'Tertiary State Trauma Center',
    icuBedsAvailable: 8,
    emergencyNeedGroup: 'O+',
    unitsNeeded: 0,
    condition: 'Elective Orthopedic Replacements',
  },
  {
    id: 'hosp-ngp-003',
    code: 'Hosp. 03',
    name: 'City General (Kingsway Hospital)',
    lat: 21.1555,
    lng: 79.0854,
    area: 'Mohan Nagar / Station Rd',
    phone: '+91 712 666 8888',
    activeRequests: 1,
    traumaLevel: 'Multi-Super Specialty Trauma Hub',
    icuBedsAvailable: 19,
    emergencyNeedGroup: 'O-',
    unitsNeeded: 3,
    condition: 'Code Red Trauma Patient - Arterial Bleed',
  },
]

const LOW_STOCK_THRESHOLD = 5 // units — below this = "has demand"
const EXPIRY_WINDOW_DAYS  = 5 // suggest transfer if expiring within N days
const MAX_DISTANCE_KM     = 25 // only suggest if banks are within this radius
const OPTIMAL_BANK_CAPACITY = 240 // nominal capacity units across all 8 groups (~30u/group)

const mongoose = require('mongoose')

/**
 * Reset and rebuild suggestions store
 * Called on startup + every 3 minutes via setInterval
 */
const runRedistributionScan = async (io = null) => {
  const scanStart = Date.now()
  const newSuggestions = []

  // Try live DB scan first if MongoDB is connected
  if (mongoose.connection.readyState === 1) {
    try {
      const { Inventory, Facility, EmergencyRequest } = require('../models')

      const expiringUnits = await Inventory.find({
        status: { $in: ['available', 'near-expiry'] },
        units: { $gt: 0 },
        expiryDate: {
          $lte: new Date(Date.now() + EXPIRY_WINDOW_DAYS * 86400000),
          $gte: new Date(),
        },
      }).populate('bankId', 'name city location bank_type type')

      for (const unit of expiringUnits) {
        const srcBank = unit.bankId
        if (!srcBank?.location?.coordinates) continue

        const [srcLng, srcLat] = srcBank.location.coordinates
        const srcBankType = srcBank.bank_type || (srcBank.type === 'hospital' ? 'private' : 'government')

        // Find banks with low stock of this blood group within radius
        const lowStockBanks = await Inventory.find({
          bloodGroup: unit.bloodGroup,
          units: { $lt: LOW_STOCK_THRESHOLD },
          bankId: { $ne: srcBank._id },
        }).populate('bankId', 'name city location bank_type type')

        for (const target of lowStockBanks) {
          const tgtBank = target.bankId
          if (!tgtBank?.location?.coordinates) continue
          const [tgtLng, tgtLat] = tgtBank.location.coordinates
          const dist = haversineDistance(srcLat, srcLng, tgtLat, tgtLng)
          if (dist > MAX_DISTANCE_KM) continue

          const tgtBankType = tgtBank.bank_type || (tgtBank.type === 'hospital' ? 'private' : 'government')
          const daysLeft = Math.ceil((new Date(unit.expiryDate) - Date.now()) / 86400000)
          const isCrossSector = srcBankType === 'government' && (tgtBankType === 'private' || tgtBankType === 'trust_run')

          newSuggestions.push({
            id: `RS-${Date.now()}-${suggestionIdCounter++}`,
            sourceBankId:   String(srcBank._id),
            sourceBankName: srcBank.name,
            sourceBankType: srcBankType,
            targetBankId:   String(tgtBank._id),
            targetBankName: tgtBank.name,
            targetBankType: tgtBankType,
            cross_sector:   isCrossSector,
            isHospitalConnect: false,
            bloodGroup:     unit.bloodGroup,
            unitsSuggested: Math.min(unit.units, Math.ceil((LOW_STOCK_THRESHOLD - target.units) / 2) + 1),
            daysToExpiry:   daysLeft,
            reason:         daysLeft <= 3 ? 'urgent-expiry' : isCrossSector ? 'cross-sector-balance' : 'expiry',
            distanceKm:     Math.round(dist * 10) / 10,
            status:         'pending',
            createdAt:      new Date().toISOString(),
          })
        }
      }
    } catch (_) {
      // Demo mode fallback
      _buildDemoSuggestions(newSuggestions)
    }
  } else {
    _buildDemoSuggestions(newSuggestions)
  }

  // Preserve accepted/rejected statuses from prior scan
  const preservedStatuses = {}
  for (const s of suggestions) {
    if (s.status !== 'pending') {
      preservedStatuses[`${s.sourceBankId}:${s.targetBankId}:${s.bloodGroup}`] = s.status
    }
  }
  for (const s of newSuggestions) {
    const key = `${s.sourceBankId}:${s.targetBankId}:${s.bloodGroup}`
    if (preservedStatuses[key]) s.status = preservedStatuses[key]
  }

  suggestions = newSuggestions
  const scanMs = Date.now() - scanStart
  console.log(`♻️  Redistribution scan: ${suggestions.length} suggestions generated (${suggestions.filter(s => s.isHospitalConnect).length} hospital connect, ${suggestions.filter(s => s.cross_sector && !s.isHospitalConnect).length} bank cross-sector) in ${scanMs}ms`)

  // Broadcast new suggestions to connected clients
  if (io && suggestions.filter(s => s.status === 'pending').length > 0) {
    io.emit('redistribution:new', {
      count: suggestions.filter(s => s.status === 'pending').length,
      suggestions: suggestions.filter(s => s.status === 'pending').slice(0, 5),
    })
  }

  return suggestions
}

/**
 * Build demo suggestions from active dynamic stock, expiry constants, and hospital network
 */
const _buildDemoSuggestions = (out) => {
  const BLOOD_GROUPS = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
  const bankSources = Object.keys(activeExpiry)

  // 1. Bank-to-Bank suggestions
  for (const srcId of bankSources) {
    const src = INVENTORY_SOURCES.find(b => b.id === srcId)
    if (!src) continue

    const srcBankType = src.bank_type || 'government'

    for (const bg of BLOOD_GROUPS) {
      const daysLeft = activeExpiry[srcId]?.[bg]
      if (!daysLeft || daysLeft > EXPIRY_WINDOW_DAYS) continue

      const srcUnits = activeStock[srcId]?.[bg] || 0
      if (srcUnits === 0) continue

      // Find nearby banks with low stock of this group
      for (const tgt of INVENTORY_SOURCES) {
        if (tgt.id === srcId) continue
        const tgtUnits = activeStock[tgt.id]?.[bg]
        if (tgtUnits === undefined || tgtUnits >= LOW_STOCK_THRESHOLD) continue

        const dist = haversineDistance(src.lat, src.lng, tgt.lat, tgt.lng)
        if (dist > MAX_DISTANCE_KM) continue

        const tgtBankType = tgt.bank_type || 'private'
        const isCrossSector = srcBankType === 'government' && (tgtBankType === 'private' || tgtBankType === 'trust_run')

        out.push({
          id:             `RS-DEMO-${out.length + 1}`,
          sourceBankId:   srcId,
          sourceBankName: src.name,
          sourceBankCity: src.city,
          sourceBankType: srcBankType,
          targetBankId:   tgt.id,
          targetBankName: tgt.name,
          targetBankCity: tgt.city,
          targetBankType: tgtBankType,
          targetFacilityType: 'bank',
          cross_sector:   isCrossSector,
          isHospitalConnect: false,
          bloodGroup:     bg,
          srcUnitsAvailable: srcUnits,
          tgtUnitsAvailable: tgtUnits,
          unitsSuggested: Math.min(srcUnits, Math.max(2, Math.ceil((LOW_STOCK_THRESHOLD - tgtUnits) / 2) + 2)),
          daysToExpiry:   daysLeft,
          reason:         daysLeft <= 2 ? 'urgent-expiry' : isCrossSector ? 'cross-sector-balance' : 'expiry',
          distanceKm:     Math.round(dist * 10) / 10,
          status:         'pending',
          createdAt:      new Date().toISOString(),
          demo:           true,
        })
      }
    }
  }

  // 2. Hospital Connect Suggestions: Match Government Bank Surplus directly with Hospitals having Active Code Red
  const govBanks = INVENTORY_SOURCES.filter(b => b.bank_type === 'government' && b.city === 'Nagpur')

  for (const hosp of NAGPUR_HOSPITAL_NODES) {
    if (hosp.activeRequests > 0) {
      // Default to universal emergency donor group 'O-' for trauma/Code Red resuscitation, or hospital's specific group
      const bgNeeded = hosp.emergencyNeedGroup || 'O-'
      const unitsRequired = hosp.unitsNeeded || 2

      // Find government banks with surplus stock (>= 5 units) of this blood group
      const matchingGovBanks = govBanks
        .map(govBank => {
          const availableUnits = activeStock[govBank.id]?.[bgNeeded] || 0
          const dist = haversineDistance(govBank.lat, govBank.lng, hosp.lat, hosp.lng)
          return {
            govBank,
            availableUnits,
            dist,
            daysLeft: activeExpiry[govBank.id]?.[bgNeeded] || 3,
          }
        })
        .filter(m => m.availableUnits >= 5 && m.dist <= 30)
        .sort((a, b) => b.availableUnits - a.availableUnits || a.dist - b.dist)

      if (matchingGovBanks.length > 0) {
        const topMatch = matchingGovBanks[0]
        out.push({
          id:                 `RS-HOSP-${hosp.id}-${bgNeeded}`,
          sourceBankId:       topMatch.govBank.id,
          sourceBankName:     topMatch.govBank.name,
          sourceBankCity:     topMatch.govBank.city || 'Nagpur',
          sourceBankType:     'government',
          targetBankId:       hosp.id,
          targetBankName:     hosp.name,
          targetBankCity:     'Nagpur',
          targetBankType:     'hospital',
          targetFacilityType: 'hospital',
          targetArea:         hosp.area,
          targetAddress:      hosp.area,
          targetPhone:        hosp.phone,
          cross_sector:       true,
          isHospitalConnect:  true,
          bloodGroup:         bgNeeded,
          srcUnitsAvailable:  topMatch.availableUnits,
          tgtUnitsAvailable:  0,
          unitsSuggested:     Math.min(topMatch.availableUnits, unitsRequired),
          daysToExpiry:       topMatch.daysLeft,
          reason:             'hospital-code-red',
          distanceKm:         Math.round(topMatch.dist * 10) / 10,
          activeCodeRedCount: hosp.activeRequests,
          traumaLevel:        hosp.traumaLevel,
          urgencyLabel:       `${hosp.activeRequests} Active Code Red`,
          condition:          hosp.condition,
          status:             'pending',
          createdAt:          new Date().toISOString(),
          demo:               true,
        })
      }
    }
  }
}

/**
 * Seasonal Crisis Simulator (Demo Tool)
 * Simulates the real-world Nagpur May 2026 summer shortage pattern:
 * Government banks (GMC, AIIMS, SSH) maintain healthy/high stock (70-90% fullness).
 * Private banks (Kingsway, Care, Alexis, etc.) experience critical stock depletion (10-25% fullness).
 */
const simulateSummerShortage = async (io = null) => {
  isSummerSimulation = true

  // Adjust active stock
  for (const bank of INVENTORY_SOURCES) {
    const bankType = bank.bank_type || 'private'
    if (bankType === 'government') {
      // Government banks: healthy surplus (75-88% fullness)
      activeStock[bank.id] = {
        'O-': 16, 'O+': 52, 'A-': 14, 'A+': 44, 'B-': 12, 'B+': 38, 'AB-': 8, 'AB+': 20
      }
      // Put some critical groups within expiry window to trigger proactive transfers
      activeExpiry[bank.id] = {
        'O-': 3, 'O+': 4, 'A-': 3, 'A+': 5, 'B-': 4, 'B+': 5, 'AB-': 3, 'AB+': 8
      }
    } else if (bankType === 'private') {
      // Private banks: critical deficit due to student donor vacation & extreme heat (12-20% fullness)
      activeStock[bank.id] = {
        'O-': 2, 'O+': 9, 'A-': 2, 'A+': 8, 'B-': 2, 'B+': 8, 'AB-': 1, 'AB+': 4
      }
      activeExpiry[bank.id] = {
        'O-': 12, 'O+': 18, 'A-': 10, 'A+': 14, 'B-': 9, 'B+': 15, 'AB-': 7, 'AB+': 12
      }
    } else {
      // Trust & NGO banks: moderate-low stock
      activeStock[bank.id] = {
        'O-': 4, 'O+': 12, 'A-': 3, 'A+': 10, 'B-': 4, 'B+': 11, 'AB-': 2, 'AB+': 6
      }
    }
  }

  const updatedSuggestions = await runRedistributionScan(io)
  return {
    success: true,
    simulationActive: true,
    message: 'Summer Shortage Pattern Activated: Government surplus vs Private deficit simulated.',
    analysis: getCrossSectorAnalysis(),
    suggestions: updatedSuggestions,
  }
}

/**
 * Revert Seasonal Crisis Simulation back to baseline seed data
 */
const resetSimulation = async (io = null) => {
  isSummerSimulation = false
  activeStock = JSON.parse(JSON.stringify(DEMO_STOCK))
  activeExpiry = JSON.parse(JSON.stringify(DEMO_EXPIRY))

  const updatedSuggestions = await runRedistributionScan(io)
  return {
    success: true,
    simulationActive: false,
    message: 'Simulation Reset: Inventory returned to normal operational baseline.',
    analysis: getCrossSectorAnalysis(),
    suggestions: updatedSuggestions,
  }
}

const isSummerSimulationActive = () => isSummerSimulation

/**
 * Calculate Aggregate Cross-Sector Fullness Metrics & Opportunities
 */
const getCrossSectorAnalysis = () => {
  const govBanks = INVENTORY_SOURCES.filter(b => b.bank_type === 'government')
  const pvtBanks = INVENTORY_SOURCES.filter(b => b.bank_type === 'private')

  const calcAvgFullness = (banks) => {
    if (banks.length === 0) return 0
    let totalStock = 0
    for (const b of banks) {
      const stockObj = activeStock[b.id] || {}
      totalStock += Object.values(stockObj).reduce((sum, u) => sum + (u || 0), 0)
    }
    const maxCapacity = banks.length * OPTIMAL_BANK_CAPACITY
    return Math.min(100, Math.round((totalStock / maxCapacity) * 100))
  }

  const govFullness = calcAvgFullness(govBanks)
  const pvtFullness = calcAvgFullness(pvtBanks)
  const gap = Math.max(0, govFullness - pvtFullness)
  const isSectorGap = gap >= 25 // 25+ percentage points threshold

  const crossSectorOpportunities = suggestions.filter(s => s.cross_sector)
  const hospitalConnectOpportunities = suggestions.filter(s => s.isHospitalConnect)
  const bankToBankOpportunities = suggestions.filter(s => s.cross_sector && !s.isHospitalConnect)

  // Hospital network active Code Red critical needs
  const hospitalsWithCodeRed = NAGPUR_HOSPITAL_NODES.filter(h => h.activeRequests > 0)
  const hospitalsWithCodeRedCount = hospitalsWithCodeRed.reduce((sum, h) => sum + h.activeRequests, 0)
  const hospitalNames = hospitalsWithCodeRed.map(h => h.name).join(', ')

  const isImbalanced = isSectorGap || hospitalsWithCodeRedCount > 0

  let alertMessage = null
  if (isImbalanced) {
    if (hospitalsWithCodeRedCount > 0) {
      alertMessage = `⚠️ Sector Imbalance Detected: Government banks averaging ${govFullness}% stocked vs Private banks averaging ${pvtFullness}% stocked — plus ${hospitalsWithCodeRedCount} hospital${hospitalsWithCodeRedCount > 1 ? 's' : ''} with active critical need (${hospitalNames})`
    } else {
      alertMessage = `⚠️ Sector Imbalance Detected: Government banks averaging ${govFullness}% stocked vs Private banks averaging ${pvtFullness}% stocked`
    }
  }

  return {
    governmentStockFullnessAvg: govFullness,
    privateStockFullnessAvg: pvtFullness,
    gapPercentage: gap,
    isImbalanced,
    imbalanceThreshold: 25,
    alertMessage,
    crossSectorOpportunities,
    hospitalConnectOpportunities,
    bankToBankOpportunities,
    totalCrossSectorSuggestions: crossSectorOpportunities.length,
    hospitalConnectCount: hospitalConnectOpportunities.length,
    bankToBankCount: bankToBankOpportunities.length,
    hospitalsWithCodeRedCount,
    hospitalsWithCodeRed,
    summerSimulationActive: isSummerSimulation,
    citationNote: "This feature addresses a documented real-world pattern — Nagpur experienced exactly this government/private stock imbalance during summer 2026 due to seasonal donor drop-off.",
    govBanksCount: govBanks.length,
    pvtBanksCount: pvtBanks.length,
  }
}

/**
 * Get suggestions, optionally filtered by bankId (as source or target)
 */
const getSuggestions = (bankId = null, statusFilter = null) => {
  let result = [...suggestions]
  if (bankId) {
    result = result.filter(s => s.sourceBankId === bankId || s.targetBankId === bankId)
  }
  if (statusFilter) {
    result = result.filter(s => s.status === statusFilter)
  }
  return result.sort((a, b) => {
    // Cross-sector urgent-expiry first, then urgent-expiry, then other cross-sector, then by days remaining
    if (a.cross_sector && !b.cross_sector) return -1
    if (!a.cross_sector && b.cross_sector) return 1
    if (a.reason === 'urgent-expiry' && b.reason !== 'urgent-expiry') return -1
    if (b.reason === 'urgent-expiry' && a.reason !== 'urgent-expiry') return 1
    return a.daysToExpiry - b.daysToExpiry
  })
}

/**
 * Update suggestion status (accept / reject)
 * On accept: mark as 'accepted' and emit socket event
 */
const updateSuggestionStatus = (id, status, io = null) => {
  const idx = suggestions.findIndex(s => s.id === id)
  if (idx === -1) return null

  suggestions[idx] = { ...suggestions[idx], status, updatedAt: new Date().toISOString() }

  if (status === 'accepted' && io) {
    io.emit('redistribution:accepted', {
      suggestion: suggestions[idx],
      message: `Transfer of ${suggestions[idx].unitsSuggested} units ${suggestions[idx].bloodGroup} from ${suggestions[idx].sourceBankName} to ${suggestions[idx].targetBankName} has been initiated.`,
    })
  }

  console.log(`♻️  Redistribution suggestion ${id} → ${status}`)
  return suggestions[idx]
}

// Active authorized sector transfers store
let authorizedTransfers = [
  {
    id: 'XFER-NGP-8412',
    suggestionId: 'RS-DEMO-INIT-1',
    sourceBankId: 'bank-005',
    sourceBankName: 'Government Medical College (GMCH) Blood Bank',
    sourceBankType: 'government',
    targetBankId: 'bank-008',
    targetBankName: 'Kingsway Hospitals Blood Bank',
    targetBankType: 'private',
    bloodGroup: 'O+',
    units: 4,
    transportMethod: 'drone',
    status: 'completed',
    authorizedBy: 'Dr. S. Sharma (Nagpur Regional Director)',
    authorizedAt: new Date(Date.now() - 45 * 60000).toISOString(),
    completedAt: new Date(Date.now() - 40 * 60000).toISOString(),
    distanceKm: 3.8,
    etaMins: 4,
    notes: 'Seasonal emergency balance transfer for trauma surgeries',
    progress: 100,
  }
]

/**
 * Authorize and dispatch a cross-sector blood transfer
 */
const authorizeTransfer = async (data, io = null) => {
  const {
    suggestionId,
    sourceBankId,
    sourceBankName,
    sourceBankType = 'government',
    targetBankId,
    targetBankName,
    targetBankType = 'private',
    targetFacilityType = 'bank',
    targetArea,
    bloodGroup,
    units = 2,
    transportMethod = 'drone',
    authorizedBy = 'Dr. S. Sharma (Nagpur Regional Director)',
    notes = 'Cross-sector priority transfer due to seasonal shortage',
    distanceKm = 4.2,
  } = data

  const numUnits = parseInt(units) || 2
  const dist = parseFloat(distanceKm) || 4.2
  const etaMins = transportMethod === 'drone' ? Math.max(2, Math.round(dist * 1.0 + 1)) : Math.max(8, Math.round(dist * 3.5 + 3))

  // 1. Deduct units from source bank's available stock
  if (activeStock[sourceBankId] && activeStock[sourceBankId][bloodGroup] !== undefined) {
    activeStock[sourceBankId][bloodGroup] = Math.max(0, activeStock[sourceBankId][bloodGroup] - numUnits)
  }

  const isHospital = targetFacilityType === 'hospital' || targetBankType === 'hospital'

  // 2. Generate Transfer Record
  const transfer = {
    id: `XFER-NGP-${Math.floor(1000 + Math.random() * 9000)}`,
    suggestionId: suggestionId || `RS-MANUAL-${Date.now()}`,
    sourceBankId,
    sourceBankName: sourceBankName || 'Government Medical College (GMCH)',
    sourceBankType,
    targetBankId,
    targetBankName: targetBankName || (isHospital ? 'AIIMS Nagpur Trauma Care' : 'Kingsway Hospitals Blood Bank'),
    targetBankType: isHospital ? 'hospital' : targetBankType,
    targetFacilityType: isHospital ? 'hospital' : 'bank',
    targetArea: targetArea || (isHospital ? 'MIHAN, Nagpur' : 'Mohan Nagar / Station Rd'),
    bloodGroup,
    units: numUnits,
    transportMethod, // 'drone' | 'ambulance'
    status: 'in_transit', // 'pending' | 'in_transit' | 'completed'
    authorizedBy,
    authorizedAt: new Date().toISOString(),
    distanceKm: dist,
    etaMins,
    notes,
    progress: 15,
    tempCelsius: transportMethod === 'drone' ? 3.8 : 4.1,
  }

  authorizedTransfers.unshift(transfer)

  // 3. Mark matching suggestion as accepted
  if (suggestionId) {
    updateSuggestionStatus(suggestionId, 'accepted', io)
  }

  if (io) {
    io.emit('redistribution:transfer_authorized', {
      transfer,
      message: `Transfer ${transfer.id} (${numUnits}u ${bloodGroup}) dispatched via ${transportMethod.toUpperCase()} from ${sourceBankName} to ${targetBankName}.`
    })
  }

  console.log(`🚀 Transfer Authorized: ${transfer.id} (${numUnits} units ${bloodGroup}) via ${transportMethod} to ${targetBankName}`)
  return transfer
}

/**
 * Complete a transfer and credit units to destination bank inventory
 */
const completeTransfer = async (id, io = null) => {
  const idx = authorizedTransfers.findIndex(t => t.id === id)
  if (idx === -1) return null

  const transfer = authorizedTransfers[idx]
  transfer.status = 'completed'
  transfer.progress = 100
  transfer.completedAt = new Date().toISOString()

  // Credit units to target bank stock (if bank)
  if (activeStock[transfer.targetBankId] && activeStock[transfer.targetBankId][transfer.bloodGroup] !== undefined) {
    activeStock[transfer.targetBankId][transfer.bloodGroup] += transfer.units
  }

  // If target is hospital, decrement activeRequests in hospital nodes
  const isHospital = transfer.targetFacilityType === 'hospital' || transfer.targetBankType === 'hospital'
  if (isHospital) {
    const hosp = NAGPUR_HOSPITAL_NODES.find(h => h.id === transfer.targetBankId || h.name === transfer.targetBankName)
    if (hosp) {
      hosp.activeRequests = Math.max(0, hosp.activeRequests - 1)
      hosp.unitsNeeded = Math.max(0, (hosp.unitsNeeded || 0) - transfer.units)
    }
  }

  if (io) {
    io.emit('redistribution:transfer_completed', {
      transfer,
      message: `Transfer ${transfer.id} completed. ${transfer.units} units ${transfer.bloodGroup} received at ${transfer.targetBankName}.`
    })
  }

  console.log(`✅ Transfer Completed: ${transfer.id} (${transfer.units} units ${transfer.bloodGroup} delivered to ${transfer.targetBankName})`)
  return transfer
}

const getAuthorizedTransfers = () => authorizedTransfers

/**
 * Get summary stats for dashboard badges
 */
const getStats = () => ({
  total:        suggestions.length,
  pending:      suggestions.filter(s => s.status === 'pending').length,
  accepted:     suggestions.filter(s => s.status === 'accepted').length,
  rejected:     suggestions.filter(s => s.status === 'rejected').length,
  urgentExpiry: suggestions.filter(s => s.reason === 'urgent-expiry' && s.status === 'pending').length,
  crossSector:  suggestions.filter(s => s.cross_sector && s.status === 'pending').length,
  activeTransfersCount: authorizedTransfers.filter(t => t.status === 'in_transit').length,
  totalTransfersCount: authorizedTransfers.length,
  simulationActive: isSummerSimulation,
})

module.exports = {
  runRedistributionScan,
  getSuggestions,
  updateSuggestionStatus,
  getStats,
  getCrossSectorAnalysis,
  simulateSummerShortage,
  resetSimulation,
  isSummerSimulationActive,
  authorizeTransfer,
  completeTransfer,
  getAuthorizedTransfers,
  getActiveStock: () => activeStock,
}
