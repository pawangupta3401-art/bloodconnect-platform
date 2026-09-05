const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const path = require('path')
const fs = require('fs')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

const { Facility, Inventory, Donor } = require('../models')

const bloodBanksData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/nagpurBloodBanks.json'), 'utf8')
)

const ngosData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/nagpurNGOs.json'), 'utf8')
)

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/bloodconnect'

// ═══════════════════════════════════════════════════════════════════════
// e-RaktKosh 14-Component Type Definitions (exact government naming)
// Shelf life follows NACO / NABH clinical standards
// ═══════════════════════════════════════════════════════════════════════
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

// Per-bank component distribution (realistic ratios based on bank capacity)
function generateComponentInventory(capacityFactor, isStale = false) {
  const now = Date.now()
  // Stale banks: last updated 26 hours ago (triggers staleness warning in UI)
  const lastUpdatedBase = isStale
    ? new Date(now - 26 * 3600000)
    : new Date(now - Math.floor(Math.random() * 3) * 3600000)

  return [
    { componentType: 'Whole Blood',               units: Math.round(capacityFactor * 45), bloodGroup: 'O+',  daysAgo: 8,  lastUpdated: new Date(lastUpdatedBase.getTime() - 1000) },
    { componentType: 'Whole Blood',               units: Math.round(capacityFactor * 30), bloodGroup: 'A+',  daysAgo: 5,  lastUpdated: lastUpdatedBase },
    { componentType: 'Whole Blood',               units: Math.round(capacityFactor * 22), bloodGroup: 'B+',  daysAgo: 12, lastUpdated: lastUpdatedBase },
    { componentType: 'Whole Blood',               units: Math.round(capacityFactor * 10), bloodGroup: 'AB+', daysAgo: 3,  lastUpdated: lastUpdatedBase },
    { componentType: 'Whole Blood',               units: Math.round(capacityFactor * 8),  bloodGroup: 'O-',  daysAgo: 6,  lastUpdated: lastUpdatedBase },
    { componentType: 'Whole Blood',               units: Math.round(capacityFactor * 5),  bloodGroup: 'A-',  daysAgo: 10, lastUpdated: lastUpdatedBase },
    { componentType: 'Whole Blood',               units: Math.round(capacityFactor * 4),  bloodGroup: 'B-',  daysAgo: 7,  lastUpdated: lastUpdatedBase },
    { componentType: 'Whole Blood',               units: Math.round(capacityFactor * 2),  bloodGroup: 'AB-', daysAgo: 4,  lastUpdated: lastUpdatedBase },
    { componentType: 'Packed Red Blood Cells',    units: Math.round(capacityFactor * 28), bloodGroup: 'O+',  daysAgo: 10, lastUpdated: lastUpdatedBase },
    { componentType: 'Packed Red Blood Cells',    units: Math.round(capacityFactor * 18), bloodGroup: 'A+',  daysAgo: 8,  lastUpdated: lastUpdatedBase },
    { componentType: 'Packed Red Blood Cells',    units: Math.round(capacityFactor * 14), bloodGroup: 'B+',  daysAgo: 14, lastUpdated: lastUpdatedBase },
    { componentType: 'Packed Red Blood Cells',    units: Math.round(capacityFactor * 6),  bloodGroup: 'AB+', daysAgo: 5,  lastUpdated: lastUpdatedBase },
    { componentType: 'Sagm Packed Red Blood Cells', units: Math.round(capacityFactor * 12), bloodGroup: 'O+', daysAgo: 15, lastUpdated: lastUpdatedBase },
    { componentType: 'Sagm Packed Red Blood Cells', units: Math.round(capacityFactor * 8),  bloodGroup: 'A+', daysAgo: 20, lastUpdated: lastUpdatedBase },
    { componentType: 'Irradiated RBC',            units: Math.round(capacityFactor * 6),  bloodGroup: 'O+',  daysAgo: 12, lastUpdated: lastUpdatedBase },
    { componentType: 'Irradiated RBC',            units: Math.round(capacityFactor * 4),  bloodGroup: 'B+',  daysAgo: 9,  lastUpdated: lastUpdatedBase },
    { componentType: 'Leukoreduced RBC',          units: Math.round(capacityFactor * 9),  bloodGroup: 'O+',  daysAgo: 7,  lastUpdated: lastUpdatedBase },
    { componentType: 'Leukoreduced RBC',          units: Math.round(capacityFactor * 5),  bloodGroup: 'A+',  daysAgo: 11, lastUpdated: lastUpdatedBase },
    { componentType: 'Fresh Frozen Plasma',       units: Math.round(capacityFactor * 20), bloodGroup: 'AB+', daysAgo: 30, lastUpdated: lastUpdatedBase },
    { componentType: 'Fresh Frozen Plasma',       units: Math.round(capacityFactor * 14), bloodGroup: 'O+',  daysAgo: 45, lastUpdated: lastUpdatedBase },
    { componentType: 'Fresh Frozen Plasma',       units: Math.round(capacityFactor * 10), bloodGroup: 'A+',  daysAgo: 60, lastUpdated: lastUpdatedBase },
    { componentType: 'Cryo Poor Plasma',          units: Math.round(capacityFactor * 8),  bloodGroup: 'AB+', daysAgo: 20, lastUpdated: lastUpdatedBase },
    { componentType: 'Cryo Poor Plasma',          units: Math.round(capacityFactor * 5),  bloodGroup: 'O+',  daysAgo: 30, lastUpdated: lastUpdatedBase },
    { componentType: 'Cryoprecipitate',           units: Math.round(capacityFactor * 10), bloodGroup: 'O+',  daysAgo: 25, lastUpdated: lastUpdatedBase },
    { componentType: 'Cryoprecipitate',           units: Math.round(capacityFactor * 6),  bloodGroup: 'AB+', daysAgo: 40, lastUpdated: lastUpdatedBase },
    { componentType: 'Plasma',                    units: Math.round(capacityFactor * 15), bloodGroup: 'AB+', daysAgo: 30, lastUpdated: lastUpdatedBase },
    { componentType: 'Plasma',                    units: Math.round(capacityFactor * 10), bloodGroup: 'O+',  daysAgo: 50, lastUpdated: lastUpdatedBase },
    { componentType: 'Single Donor Plasma',       units: Math.round(capacityFactor * 6),  bloodGroup: 'AB+', daysAgo: 15, lastUpdated: lastUpdatedBase },
    { componentType: 'Single Donor Plasma',       units: Math.round(capacityFactor * 4),  bloodGroup: 'O+',  daysAgo: 25, lastUpdated: lastUpdatedBase },
    { componentType: 'Platelet Concentrate',      units: Math.round(capacityFactor * 12), bloodGroup: 'O+',  daysAgo: 2,  lastUpdated: lastUpdatedBase },
    { componentType: 'Platelet Concentrate',      units: Math.round(capacityFactor * 8),  bloodGroup: 'A+',  daysAgo: 3,  lastUpdated: lastUpdatedBase },
    { componentType: 'Platelet Concentrate',      units: Math.round(capacityFactor * 5),  bloodGroup: 'B+',  daysAgo: 1,  lastUpdated: lastUpdatedBase },
    { componentType: 'Platelet Rich Plasma',      units: Math.round(capacityFactor * 7),  bloodGroup: 'O+',  daysAgo: 2,  lastUpdated: lastUpdatedBase },
    { componentType: 'Platelet Rich Plasma',      units: Math.round(capacityFactor * 4),  bloodGroup: 'A+',  daysAgo: 3,  lastUpdated: lastUpdatedBase },
    { componentType: 'Random Donor Platelets',    units: Math.round(capacityFactor * 10), bloodGroup: 'O+',  daysAgo: 1,  lastUpdated: lastUpdatedBase },
    { componentType: 'Random Donor Platelets',    units: Math.round(capacityFactor * 6),  bloodGroup: 'A+',  daysAgo: 2,  lastUpdated: lastUpdatedBase },
    { componentType: 'Random Donor Platelets',    units: Math.round(capacityFactor * 4),  bloodGroup: 'B+',  daysAgo: 1,  lastUpdated: lastUpdatedBase },
    { componentType: 'Single Donor Platelet',     units: Math.round(capacityFactor * 8),  bloodGroup: 'O+',  daysAgo: 1,  lastUpdated: lastUpdatedBase },
    { componentType: 'Single Donor Platelet',     units: Math.round(capacityFactor * 5),  bloodGroup: 'A+',  daysAgo: 2,  lastUpdated: lastUpdatedBase },
    { componentType: 'Single Donor Platelet',     units: Math.round(capacityFactor * 3),  bloodGroup: 'AB+', daysAgo: 1,  lastUpdated: lastUpdatedBase },
  ].filter(entry => entry.units > 0)
}

async function seedDatabase() {
  const isDryRun = process.argv.includes('--dry-run') || process.argv.includes('--json-only')

  console.log('====================================================')
  console.log('🩸 BloodConnect / LifeStream Nagpur Seed Engine')
  console.log('     e-RaktKosh 14-Component Type Edition')
  console.log('====================================================')
  console.log(`📦 Loaded ${bloodBanksData.length} Real Nagpur Blood Banks`)
  console.log(`🤝 Loaded ${ngosData.length} Nagpur Blood Donation NGOs`)
  console.log(`🎯 Target Mongo URI: ${MONGO_URI.replace(/:[^:@]+@/, ':****@')}`)

  if (isDryRun) {
    console.log('ℹ️ Dry-run mode active. No database modifications made.')
    console.log(JSON.stringify({ bloodBanks: bloodBanksData, ngos: ngosData }, null, 2))
    return
  }

  try {
    console.log('\n⏳ Connecting to MongoDB...')
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    })
    console.log('✅ Connected to MongoDB successfully.\n')

    const defaultPasswordHash = await bcrypt.hash('Bank@Nagpur123', 10)

    console.log('🏢 Seeding Blood Banks (Facilities) & Live Inventory Matrix...')
    console.log('   Components: All 14 e-RaktKosh types with realistic distribution\n')

    let facilitiesCount = 0
    let inventoryCount = 0

    for (let bankIdx = 0; bankIdx < bloodBanksData.length; bankIdx++) {
      const bank = bloodBanksData[bankIdx]

      // Upsert Facility Record
      const facilityDoc = await Facility.findOneAndUpdate(
        { contactEmail: bank.contactEmail },
        {
          name: bank.name,
          type: 'blood-bank',
          facilityRole: 'blood-bank',
          contactEmail: bank.contactEmail,
          contactPhone: bank.contactNumber,
          password: defaultPasswordHash,
          location: {
            type: 'Point',
            coordinates: bank.coordinates,
            address: bank.address,
            city: bank.city,
            state: bank.state,
            pincode: bank.pincode
          },
          verifiedStatus: true,
          licenseNumber: bank.licenseNumber,
          role: 'facility',
          mfaEnabled: true,
          lowStockThresholds: {
            'A+': 10, 'A-': 5, 'B+': 10, 'B-': 5,
            'O+': 15, 'O-': 8, 'AB+': 8, 'AB-': 3
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
      facilitiesCount++

      // Clean existing stock for fresh seed
      await Inventory.deleteMany({ bankId: facilityDoc._id })

      // ── DEMO: 3rd bank (index 2) gets a STALE timestamp (26h ago)

      // This makes the staleness warning immediately visible in the UI
      const isStaleDemo = bankIdx === 2
      const capacityFactor = bank.inventory.totalUnits / 400 // normalize to capacity

      const componentEntries = generateComponentInventory(capacityFactor, isStaleDemo)

      for (const entry of componentEntries) {
        const collectionDate = new Date(Date.now() - entry.daysAgo * 86400000)
        const expiryDays = COMPONENT_EXPIRY_DAYS[entry.componentType] || 42
        const expiryDate = new Date(collectionDate.getTime() + expiryDays * 86400000)

        await Inventory.create({
          bankId: facilityDoc._id,
          bloodGroup: entry.bloodGroup,
          componentType: entry.componentType,
          units: entry.units,
          collectionDate,
          expiryDate,
          lastUpdated: entry.lastUpdated,
          status: 'available',
          batchId: `${entry.componentType.slice(0,2).toUpperCase()}-${bank.id}-${entry.bloodGroup}-${Math.floor(1000 + Math.random() * 9000)}`
        })
        inventoryCount++
      }

      const staleNote = isStaleDemo ? ' ⚠️  [STALE - demo staleness warning]' : ''
      console.log(`  ✓ Seeded: ${bank.name} (${bank.locality}) → ${componentEntries.length} component batches${staleNote}`)
    }

    console.log('\n====================================================')
    console.log(`🎉 Database Seeding Complete! (e-RaktKosh Edition)`)
    console.log(`   - Facilities Upserted: ${facilitiesCount}`)
    console.log(`   - Inventory Batches Created: ${inventoryCount}`)
    console.log(`   - Component Types: 14 (e-RaktKosh standard)`)
    console.log(`   - Stale Demo: Bank #3 (26h stale for UI demo)`)
    console.log(`   - Default Facility Password: Bank@Nagpur123`)
    console.log('====================================================\n')


  } catch (err) {
    console.error('❌ Error during seeding:', err.message)
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Disconnected from MongoDB.')
  }
}

if (require.main === module) {
  seedDatabase()
}

module.exports = { seedDatabase, bloodBanksData, ngosData }
