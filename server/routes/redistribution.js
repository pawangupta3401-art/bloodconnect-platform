const express = require('express')
const router = express.Router()
const {
  runRedistributionScan,
  getSuggestions,
  updateSuggestionStatus,
  getStats,
  getCrossSectorAnalysis,
  simulateSummerShortage,
  resetSimulation,
  authorizeTransfer,
  completeTransfer,
  getAuthorizedTransfers,
} = require('../services/redistributionEngine')

// GET /api/v1/redistribution/suggestions - list all suggestions with optional bankId / status filters
router.get('/suggestions', async (req, res) => {
  try {
    const { bankId, status, crossSectorOnly } = req.query
    let suggestions = getSuggestions(bankId, status)
    if (crossSectorOnly === 'true') {
      suggestions = suggestions.filter(s => s.cross_sector)
    }
    const stats = getStats()
    const crossSectorAnalysis = getCrossSectorAnalysis()
    res.json({
      success: true,
      total: suggestions.length,
      stats,
      crossSectorAnalysis,
      suggestions,
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/v1/redistribution/stats
router.get('/stats', (req, res) => {
  try {
    const stats = getStats()
    res.json({ success: true, stats })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/v1/redistribution/cross-sector - dedicated cross-sector analytics
router.get(['/cross-sector', '/cross-sector-analysis'], (req, res) => {
  try {
    const analysis = getCrossSectorAnalysis()
    res.json({
      success: true,
      ...analysis,
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/v1/redistribution/simulate-summer - trigger summer shortage crisis simulation
router.post(['/simulate-summer', '/simulate-summer-shortage'], async (req, res) => {
  try {
    const io = req.app.get('io')
    const result = await simulateSummerShortage(io)
    res.json(result)
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/v1/redistribution/reset-simulation - revert simulator back to baseline
router.post(['/reset-simulation', '/reset'], async (req, res) => {
  try {
    const io = req.app.get('io')
    const result = await resetSimulation(io)
    res.json(result)
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/v1/redistribution/scan - manually trigger a scan
router.post('/scan', async (req, res) => {
  try {
    const io = req.app.get('io')
    const suggestions = await runRedistributionScan(io)
    const stats = getStats()
    const crossSectorAnalysis = getCrossSectorAnalysis()
    res.json({
      success: true,
      message: `Scan complete: ${suggestions.length} suggestions generated`,
      stats,
      crossSectorAnalysis,
      suggestions,
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/v1/redistribution/transfers - list all active/completed authorized transfers
router.get('/transfers', (req, res) => {
  try {
    const transfers = getAuthorizedTransfers()
    res.json({
      success: true,
      count: transfers.length,
      transfers,
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/v1/redistribution/authorize-transfer - authorize and launch a sector transfer
router.post(['/authorize-transfer', '/transfers/authorize'], async (req, res) => {
  try {
    const io = req.app.get('io')
    const transfer = await authorizeTransfer(req.body, io)
    res.status(201).json({
      success: true,
      message: `Transfer ${transfer.id} authorized & dispatched via ${transfer.transportMethod.toUpperCase()}`,
      transfer,
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// PUT /api/v1/redistribution/transfers/:id/complete - finalize transfer and update destination stock
router.put('/transfers/:id/complete', async (req, res) => {
  try {
    const { id } = req.params
    const io = req.app.get('io')
    const updated = await completeTransfer(id, io)

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Transfer record not found' })
    }

    res.json({
      success: true,
      message: `Transfer ${id} completed and inventory updated.`,
      transfer: updated,
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// PUT /api/v1/redistribution/suggestions/:id - Accept or reject suggestion
router.put('/suggestions/:id', (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body // 'accepted' | 'rejected' | 'pending'
    if (!['accepted', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' })
    }

    const io = req.app.get('io')
    const updated = updateSuggestionStatus(id, status, io)

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Suggestion not found' })
    }

    res.json({
      success: true,
      message: `Suggestion ${id} updated to ${status}`,
      suggestion: updated,
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = router
