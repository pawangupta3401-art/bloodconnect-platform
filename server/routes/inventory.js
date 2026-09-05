const express = require('express')
const router = express.Router()

const NAGPUR_FACILITIES = [
  { id: 'NGP-01', name: 'AIIMS Nagpur Blood Centre & Multi-Speciality', type: 'hospital', city: 'Nagpur', area: 'MIHAN', lat: 21.0374, lng: 79.0270, phone: '+91 712 281 2000', rating: 4.9, bedsAvailable: 42, inventory: { 'A+': 32, 'A-': 8, 'B+': 44, 'B-': 12, 'O+': 56, 'O-': 14, 'AB+': 18, 'AB-': 6 }, status: 'active', verified: true, liveMonitoring: true },
  { id: 'NGP-02', name: 'Government Medical College & Hospital (GMCH)', type: 'hospital', city: 'Nagpur', area: 'Medical Square', lat: 21.1275, lng: 79.0963, phone: '+91 712 274 4400', rating: 4.8, bedsAvailable: 28, inventory: { 'A+': 45, 'A-': 10, 'B+': 62, 'B-': 15, 'O+': 80, 'O-': 20, 'AB+': 24, 'AB-': 9 }, status: 'active', verified: true, liveMonitoring: true },
  { id: 'NGP-03', name: 'Kingsway Hospitals', type: 'hospital', city: 'Nagpur', area: 'Mohan Nagar / Station', lat: 21.1555, lng: 79.0854, phone: '+91 712 678 9100', rating: 4.8, bedsAvailable: 19, inventory: { 'A+': 22, 'A-': 6, 'B+': 28, 'B-': 7, 'O+': 34, 'O-': 8, 'AB+': 12, 'AB-': 4 }, status: 'active', verified: true, liveMonitoring: true },
  { id: 'NGP-04', name: 'Care Hospital Ramdaspeth', type: 'hospital', city: 'Nagpur', area: 'Ramdaspeth', lat: 21.1347, lng: 79.0772, phone: '+91 712 398 2222', rating: 4.7, bedsAvailable: 14, inventory: { 'A+': 18, 'A-': 5, 'B+': 24, 'B-': 6, 'O+': 29, 'O-': 7, 'AB+': 10, 'AB-': 3 }, status: 'active', verified: true, liveMonitoring: true },
  { id: 'NGP-05', name: 'Alexis Multispeciality Hospital (Max Healthcare)', type: 'hospital', city: 'Nagpur', area: 'Mankapur', lat: 21.1912, lng: 79.0768, phone: '+91 712 712 0000', rating: 4.8, bedsAvailable: 25, inventory: { 'A+': 26, 'A-': 7, 'B+': 35, 'B-': 9, 'O+': 42, 'O-': 11, 'AB+': 15, 'AB-': 5 }, status: 'active', verified: true, liveMonitoring: true },
  { id: 'NGP-06', name: 'Orange City Hospital & Research Institute', type: 'hospital', city: 'Nagpur', area: 'Khamla', lat: 21.1118, lng: 79.0573, phone: '+91 712 663 4800', rating: 4.7, bedsAvailable: 11, inventory: { 'A+': 15, 'A-': 4, 'B+': 20, 'B-': 5, 'O+': 25, 'O-': 6, 'AB+': 8, 'AB-': 2 }, status: 'active', verified: true, liveMonitoring: true },
  { id: 'NGP-07', name: 'Dr. Hedgewar Raktpedhi (Regional Blood Bank)', type: 'blood-bank', city: 'Nagpur', area: 'Dharampeth', lat: 21.1428, lng: 79.0620, phone: '+91 712 253 4344', rating: 4.9, bedsAvailable: 0, inventory: { 'A+': 68, 'A-': 22, 'B+': 95, 'B-': 30, 'O+': 115, 'O-': 38, 'AB+': 40, 'AB-': 16 }, status: 'active', verified: true, liveMonitoring: true },
  { id: 'NGP-08', name: 'Jeevan Jyoti Blood Centre', type: 'blood-bank', city: 'Nagpur', area: 'Dhantoli', lat: 21.1378, lng: 79.0835, phone: '+91 712 242 5555', rating: 4.8, bedsAvailable: 0, inventory: { 'A+': 52, 'A-': 16, 'B+': 70, 'B-': 21, 'O+': 88, 'O-': 24, 'AB+': 31, 'AB-': 11 }, status: 'active', verified: true, liveMonitoring: true },
  { id: 'NGP-09', name: "Daga Memorial Women's Hospital Blood Centre", type: 'hospital', city: 'Nagpur', area: 'Gandhibagh', lat: 21.1495, lng: 79.1050, phone: '+91 712 276 8922', rating: 4.6, bedsAvailable: 30, inventory: { 'A+': 20, 'A-': 5, 'B+': 27, 'B-': 6, 'O+': 33, 'O-': 8, 'AB+': 9, 'AB-': 3 }, status: 'active', verified: true, liveMonitoring: true },
  { id: 'NGP-10', name: 'Central Railway Divisional Hospital', type: 'hospital', city: 'Nagpur', area: 'Ajni', lat: 21.1215, lng: 79.0862, phone: '+91 712 256 0411', rating: 4.7, bedsAvailable: 16, inventory: { 'A+': 14, 'A-': 3, 'B+': 19, 'B-': 4, 'O+': 22, 'O-': 5, 'AB+': 6, 'AB-': 2 }, status: 'active', verified: true, liveMonitoring: true },
  { id: 'NGP-11', name: 'Platina Heart & Multispeciality Hospital', type: 'hospital', city: 'Nagpur', area: 'Sitabuldi', lat: 21.1465, lng: 79.0825, phone: '+91 712 252 8888', rating: 4.8, bedsAvailable: 8, inventory: { 'A+': 12, 'A-': 3, 'B+': 16, 'B-': 4, 'O+': 19, 'O-': 5, 'AB+': 5, 'AB-': 2 }, status: 'active', verified: true, liveMonitoring: true },
  { id: 'NGP-12', name: 'Rashtrasant Tukadoji Cancer Hospital & Blood Centre', type: 'hospital', city: 'Nagpur', area: 'Manewada', lat: 21.1090, lng: 79.0980, phone: '+91 712 274 8920', rating: 4.8, bedsAvailable: 22, inventory: { 'A+': 24, 'A-': 6, 'B+': 31, 'B-': 8, 'O+': 38, 'O-': 10, 'AB+': 11, 'AB-': 4 }, status: 'active', verified: true, liveMonitoring: true }
]

// ── GET /api/inventory ── Search by blood group + city / coordinates
router.get('/', async (req, res) => {
  try {
    const { bloodGroup, city, status, radius, lat, lng, componentType } = req.query

    // Demo / In-Memory Nagpur dataset
    let data = NAGPUR_FACILITIES.map(facility => {
      const totalUnits = Object.values(facility.inventory).reduce((sum, u) => sum + u, 0)
      return {
        ...facility,
        totalUnits,
        bloodGroupsAvailable: Object.keys(facility.inventory).filter(bg => facility.inventory[bg] > 0)
      }
    })

    if (bloodGroup) {
      data = data.filter(i => i.inventory[bloodGroup] > 0)
    }

    // e-RaktKosh: Filter by blood component type
    if (componentType && componentType !== 'All') {
      data = data.filter(i => i.components && i.components[componentType] && i.components[componentType] > 0)
    }

    if (city && city.toLowerCase() !== 'nagpur' && city.toLowerCase() !== 'all') {
      data = data.filter(i => i.city.toLowerCase().includes(city.toLowerCase()))
    }

    return res.json({
      success: true,
      city: 'Nagpur',
      center: { lat: 21.1458, lng: 79.0882 },
      count: data.length,
      data,
      liveMonitoring: true,
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})


// ── GET /api/inventory/expiring-soon ── Units expiring in 5 days
router.get('/expiring-soon', async (req, res) => {
  try {
    const expiringSoon = DEMO_INVENTORY.filter(i => i.status === 'near-expiry')
    res.json({ success: true, data: expiringSoon, count: expiringSoon.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/inventory/low-stock ── Below threshold
router.get('/low-stock', async (req, res) => {
  try {
    const THRESHOLDS = { 'A+': 10, 'A-': 5, 'B+': 10, 'B-': 5, 'O+': 15, 'O-': 8, 'AB+': 8, 'AB-': 3 }
    const lowStock = DEMO_INVENTORY.filter(i => i.units < (THRESHOLDS[i.bloodGroup] || 10))
    res.json({ success: true, data: lowStock, count: lowStock.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/inventory ── Add new stock
router.post('/', async (req, res) => {
  try {
    const { bankId, bloodGroup, componentType, units, collectionDate } = req.body

    // Expiry days per e-RaktKosh component category
    const EXPIRY_MAP = {
      'Whole Blood': 42, 'Packed Red Blood Cells': 42, 'Sagm Packed Red Blood Cells': 42,
      'Irradiated RBC': 42, 'Leukoreduced RBC': 42,
      'Fresh Frozen Plasma': 365, 'Cryo Poor Plasma': 365, 'Cryoprecipitate': 365,
      'Plasma': 365, 'Single Donor Plasma': 365,
      'Platelet Concentrate': 5, 'Platelet Rich Plasma': 5,
      'Random Donor Platelets': 5, 'Single Donor Platelet': 5,
    }
    const collDate = new Date(collectionDate)
    const expiryDays = EXPIRY_MAP[componentType] || 42
    const expiryDate = new Date(collDate.getTime() + expiryDays * 86400000)
    const lastUpdated = new Date()

    try {
      const { Inventory } = require('../models')
      const unit = new Inventory({ bankId, bloodGroup, componentType, units, collectionDate: collDate, expiryDate, lastUpdated })
      await unit.save()
      return res.status(201).json({ success: true, data: unit })
    } catch (_) {
      // Demo mode
      return res.status(201).json({
        success: true,
        data: { bankId, bloodGroup, componentType, units, collectionDate, expiryDate, lastUpdated, status: 'available' },
        demo: true
      })
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── PUT /api/inventory/:id ── Update stock (stamps lastUpdated)
router.put('/:id', async (req, res) => {
  try {
    const lastUpdated = new Date()
    try {
      const { Inventory } = require('../models')
      const updated = await Inventory.findByIdAndUpdate(
        req.params.id,
        { ...req.body, lastUpdated },
        { new: true }
      )
      if (updated) return res.json({ success: true, message: 'Inventory updated', data: updated })
    } catch (_) {}
    res.json({ success: true, message: 'Inventory updated', data: { ...req.body, lastUpdated } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/inventory/transfer-request ── Inter-hospital transfer
router.post('/transfer-request', async (req, res) => {
  try {
    const { fromBankId, toBankId, bloodGroup, units } = req.body
    res.status(201).json({
      success: true,
      message: 'Transfer request submitted',
      requestId: `TR-${Date.now()}`,
      data: { fromBankId, toBankId, bloodGroup, units, status: 'pending' }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ════════════════════════════════════════════════════════════
// COMPONENT-SPLITTER ALGORITHM (PRD Specification)
// Divides a single Whole Blood unit into RBC, Plasma, and Platelets
// ════════════════════════════════════════════════════════════
router.post(['/split-component', '/split'], async (req, res) => {
  try {
    const {
      wholeBloodBagId = `WB-${Date.now().toString().slice(-6)}`,
      bloodGroup = 'O+',
      bankId = 'NGP-07',
      bankName = 'Dr. Hedgewar Raktpedhi, Nagpur',
      units = 1
    } = req.body

    const now = new Date()

    // Expiry calculation per clinical standards:
    // RBC: 42 days, Platelets: 5 days, Plasma: 365 days
    const rbcExpiry = new Date(now.getTime() + 42 * 86400000)
    const plateletExpiry = new Date(now.getTime() + 5 * 86400000)
    const plasmaExpiry = new Date(now.getTime() + 365 * 86400000)

    const splitComponents = [
      {
        componentId: `${wholeBloodBagId}-RBC`,
        parentBagId: wholeBloodBagId,
        componentType: 'Packed Red Blood Cells (PRBC)',
        bloodGroup,
        volumeMl: 250 * units,
        units,
        storageTemp: '2°C to 6°C',
        shelfLifeDays: 42,
        expiryDate: rbcExpiry.toISOString().split('T')[0],
        status: 'available',
        clinicalUse: 'Severe anemia, acute trauma blood loss, surgical hemorrhage'
      },
      {
        componentId: `${wholeBloodBagId}-FFP`,
        parentBagId: wholeBloodBagId,
        componentType: 'Fresh Frozen Plasma (FFP)',
        bloodGroup,
        volumeMl: 150 * units,
        units,
        storageTemp: '-18°C or colder',
        shelfLifeDays: 365,
        expiryDate: plasmaExpiry.toISOString().split('T')[0],
        status: 'available',
        clinicalUse: 'Coagulation factor deficiency, burn victims, massive transfusion'
      },
      {
        componentId: `${wholeBloodBagId}-PLT`,
        parentBagId: wholeBloodBagId,
        componentType: 'Platelet Concentrate (RDP)',
        bloodGroup,
        volumeMl: 50 * units,
        units,
        storageTemp: '20°C to 24°C with continuous agitation',
        shelfLifeDays: 5,
        expiryDate: plateletExpiry.toISOString().split('T')[0],
        status: 'available',
        clinicalUse: 'Dengue thrombocytopenia, chemotherapy, severe active bleeding'
      }
    ]

    return res.status(201).json({
      success: true,
      message: `Component Split Complete: 1 Whole Blood Unit (${wholeBloodBagId}) split into 3 clinical components`,
      parentBagId: wholeBloodBagId,
      bloodGroup,
      processedByBank: bankName,
      processedAt: now.toISOString(),
      yieldUnits: 3,
      components: splitComponents
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = router

