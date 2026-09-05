const express = require('express')
const router = express.Router()

const path = require('path')
const fs = require('fs')

let BRANCHES = []
try {
  const jsonPath = path.join(__dirname, '../data/nagpurBloodBanks.json')
  if (fs.existsSync(jsonPath)) {
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
    BRANCHES = raw.map(b => ({
      branch_id: b.id,
      name: b.name,
      address: b.address,
      locality: b.locality,
      lat: b.coordinates[1],
      lng: b.coordinates[0],
      contact_number: b.contactNumber,
      total_stock: b.inventory.totalUnits,
      is_hub: b.isHub,
      type: b.type,
      operating_hours: b.operatingHours,
      inventory: b.inventory
    }))
  }
} catch (e) {
  console.warn('Fallback to static branches list:', e.message)
}

if (BRANCHES.length === 0) {
  BRANCHES = [
    { branch_id: 'NGP-BB-01', name: 'Government Medical College (GMCH) Blood Bank', address: 'Medical Square, Hanuman Nagar, Nagpur', locality: 'Hanuman Nagar', lat: 21.1275, lng: 79.0963, contact_number: '+91 712 274 4400', total_stock: 273, is_hub: true, type: 'Government' },
    { branch_id: 'NGP-BB-02', name: 'Lifeline Blood Bank Component & Apheresis', address: 'Lokmat Square, Ramdas Peth, Nagpur', locality: 'Ramdas Peth', lat: 21.1398, lng: 79.0782, contact_number: '+91 712 253 6167', total_stock: 224, is_hub: true, type: 'NGO-run' },
    { branch_id: 'NGP-BB-05', name: 'Dr. Hedgewar Blood Bank (Hedgewar Raktpedhi)', address: 'Dharampeth, Nagpur', locality: 'Dharampeth', lat: 21.1428, lng: 79.0620, contact_number: '+91 712 252 8292', total_stock: 394, is_hub: true, type: 'Trust-run' },
    { branch_id: 'NGP-BB-06', name: 'Jeevan Jyoti Blood Bank & Components', address: 'Madhav Nagar, Nagpur', locality: 'Madhav Nagar', lat: 21.1292, lng: 79.0658, contact_number: '+91 712 223 1660', total_stock: 286, is_hub: true, type: 'Trust-run' }
  ]
}

// ── GET /api/v1/branches ── List all branches
router.get('/', (req, res) => {
  res.json({
    success: true,
    count: BRANCHES.length,
    data: BRANCHES
  })
})

// ── GET /api/v1/branches/nearby ── Find nearby centers by coordinates
router.get('/nearby', (req, res) => {
  const { lat, lng, radius_km = 15 } = req.query
  const userLat = parseFloat(lat) || 21.1458
  const userLng = parseFloat(lng) || 79.0882

  // Haversine distance calculator
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371 // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180)
    const dLon = (lon2 - lon1) * (Math.PI / 180)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return Math.round((R * c) * 10) / 10
  }

  const nearby = BRANCHES.map(b => ({
    ...b,
    distance_km: calculateDistance(userLat, userLng, b.lat, b.lng)
  })).sort((a, b) => a.distance_km - b.distance_km)

  res.json({
    success: true,
    origin: { lat: userLat, lng: userLng },
    radius_km: parseFloat(radius_km),
    count: nearby.length,
    data: nearby
  })
})

// ── POST /api/v1/branches/transfer ── Transfer stock between branches
router.post('/transfer', (req, res) => {
  const { source_branch_id, target_branch_id, blood_group, component_type, units } = req.body

  if (!source_branch_id || !target_branch_id || !blood_group || !units) {
    return res.status(400).json({ success: false, error: 'Missing transfer parameters' })
  }

  const source = BRANCHES.find(b => b.branch_id === source_branch_id)
  const target = BRANCHES.find(b => b.branch_id === target_branch_id)

  if (!source || !target) {
    return res.status(404).json({ success: false, error: 'Source or target branch not found' })
  }

  const transferRecord = {
    transfer_id: `TRF-${Math.floor(1000 + Math.random() * 9000)}`,
    source_branch: source.name,
    target_branch: target.name,
    blood_group,
    component_type: component_type || 'Whole Blood',
    units: parseInt(units),
    status: 'In-Transit (Cold Chain Monitored)',
    timestamp: new Date().toISOString()
  }

  res.json({
    success: true,
    message: `Dispatched ${units} units of ${blood_group} from ${source.name} to ${target.name}`,
    data: transferRecord
  })
})

module.exports = router
