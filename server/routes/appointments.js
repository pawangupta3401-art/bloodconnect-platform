const express = require('express')
const router = express.Router()

// In-Memory Appointments Store for Real-Time Scheduling
let APPOINTMENTS_DB = [
  {
    appointment_id: 'APT-1001',
    donor_id: 'DNR-084',
    donor_name: 'Rahul Sharma',
    donor_phone: '+91 98230 11223',
    blood_group: 'O+',
    branch_id: 'NGP-01',
    branch_name: 'AIIMS Nagpur Blood Centre',
    appointment_date: '2026-08-29',
    time_slot: '10:30 AM',
    status: 'Scheduled',
    created_at: new Date().toISOString()
  },
  {
    appointment_id: 'APT-1002',
    donor_id: 'DNR-102',
    donor_name: 'Pooja Deshmukh',
    donor_phone: '+91 97654 44556',
    blood_group: 'A+',
    branch_id: 'NGP-07',
    branch_name: 'Dr. Hedgewar Raktpedhi',
    appointment_date: '2026-08-30',
    time_slot: '02:00 PM',
    status: 'Scheduled',
    created_at: new Date().toISOString()
  }
]

// ── GET /api/v1/appointments ── List all or filter by donor/branch
router.get('/', (req, res) => {
  const { donor_id, branch_id, status } = req.query
  let results = [...APPOINTMENTS_DB]

  if (donor_id) results = results.filter(a => a.donor_id === donor_id)
  if (branch_id) results = results.filter(a => a.branch_id === branch_id)
  if (status) results = results.filter(a => a.status.toLowerCase() === status.toLowerCase())

  res.json({
    success: true,
    count: results.length,
    data: results
  })
})

// ── POST /api/v1/appointments ── Book a new donation appointment
router.post('/', (req, res) => {
  const { donor_name, donor_phone, blood_group, branch_id, branch_name, appointment_date, time_slot } = req.body

  if (!donor_name || !donor_phone || !branch_id || !appointment_date || !time_slot) {
    return res.status(400).json({
      success: false,
      error: 'Missing required appointment fields: donor_name, donor_phone, branch_id, appointment_date, time_slot'
    })
  }

  const newAppointment = {
    appointment_id: `APT-${Math.floor(1000 + Math.random() * 9000)}`,
    donor_id: `DNR-${Math.floor(100 + Math.random() * 900)}`,
    donor_name,
    donor_phone,
    blood_group: blood_group || 'O+',
    branch_id,
    branch_name: branch_name || 'Central Blood Bank',
    appointment_date,
    time_slot,
    status: 'Scheduled',
    created_at: new Date().toISOString()
  }

  APPOINTMENTS_DB.unshift(newAppointment)

  // Notify socket if available
  const io = req.app.get('io')
  if (io) {
    io.emit('appointment:new', newAppointment)
  }

  res.status(201).json({
    success: true,
    message: 'Donation appointment successfully scheduled!',
    data: newAppointment
  })
})

// ── PUT /api/v1/appointments/:id/status ── Update appointment state
router.put('/:id/status', (req, res) => {
  const { id } = req.params
  const { status } = req.body

  const apt = APPOINTMENTS_DB.find(a => a.appointment_id === id)
  if (!apt) {
    return res.status(404).json({ success: false, error: 'Appointment not found' })
  }

  if (['Scheduled', 'Completed', 'Cancelled'].includes(status)) {
    apt.status = status
    return res.json({ success: true, message: `Status updated to ${status}`, data: apt })
  }

  res.status(400).json({ success: false, error: 'Invalid status. Choose Scheduled, Completed, or Cancelled.' })
})

module.exports = router
