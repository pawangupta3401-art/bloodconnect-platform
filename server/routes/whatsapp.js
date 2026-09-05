const express = require('express')
const router = express.Router()

// Webhook verification endpoint (Meta Cloud API requirement)
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'bloodconnect_verify_token_2026'

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ WhatsApp Webhook verified successfully')
    return res.status(200).send(challenge)
  }
  return res.sendStatus(403)
})

// Webhook listener for incoming donor replies ("YES" / "NO")
router.post('/webhook', (req, res) => {
  try {
    const io = req.app.get('io')
    const body = req.body

    // Demo / test format parser or Meta Graph API payload parser
    let donorPhone = 'Unknown'
    let text = ''
    let requestId = `REQ-${Date.now()}`

    if (body.entry && body.entry[0]?.changes && body.entry[0].changes[0]?.value?.messages) {
      const msgObj = body.entry[0].changes[0].value.messages[0]
      donorPhone = msgObj.from
      text = msgObj.text?.body?.trim() || ''
    } else if (body.phone && body.message) {
      donorPhone = body.phone
      text = body.message.trim()
      if (body.requestId) requestId = body.requestId
    }

    console.log(`📲 WhatsApp incoming message from ${donorPhone}: "${text}"`)

    const isAffirmative = /^(yes|haan|1|available|coming|can donate|i can)$/i.test(text)
    const isNegative = /^(no|nahin|not available|busy|0)$/i.test(text)

    if (isAffirmative && io) {
      io.emit('donor-responded', {
        requestId,
        donorName: `WhatsApp Donor (+${donorPhone.slice(-4)})`,
        donorPhone,
        channel: 'WhatsApp',
        response: 'YES',
        timestamp: new Date().toISOString(),
      })
      console.log(`🩸 Emitted donor response via WhatsApp for request ${requestId}`)
    }

    res.status(200).json({
      success: true,
      processed: true,
      affirmative: isAffirmative,
      negative: isNegative,
    })
  } catch (err) {
    console.error('WhatsApp Webhook error:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

// Simulated test endpoint for demo presentations
router.post('/simulate-response', (req, res) => {
  const { requestId = 'ER-DEMO-001', donorName = 'WhatsApp Verified Donor', donorPhone = '+91 98765 43210', reply = 'YES' } = req.body
  const io = req.app.get('io')

  if (io && reply.toUpperCase() === 'YES') {
    io.emit('donor-responded', {
      requestId,
      donorName,
      donorPhone,
      channel: 'WhatsApp (Cloud API)',
      response: 'YES',
      timestamp: new Date().toISOString(),
    })
  }

  res.json({
    success: true,
    message: `Simulated WhatsApp reply "${reply}" from ${donorName}`,
    requestId,
  })
})

module.exports = router
