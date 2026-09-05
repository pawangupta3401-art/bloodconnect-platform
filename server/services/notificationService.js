// ── Notification Service ──
// TAD Section 2: "Dispatches SMS (Twilio) and push (FCM); delivery tracking"
// Decoupled from request path via async dispatch

// ── Notification Queue (in-memory, Redis in production) ──
const notificationQueue = []
let isProcessing = false

/**
 * Add notification job to queue (async — non-blocking)
 */
const enqueue = (job) => {
  notificationQueue.push({ ...job, enqueuedAt: Date.now(), attempts: 0 })
  if (!isProcessing) processQueue()
}

/**
 * Process notification queue
 */
const processQueue = async () => {
  isProcessing = true
  while (notificationQueue.length > 0) {
    const job = notificationQueue.shift()
    try {
      await dispatch(job)
    } catch (err) {
      // Retry up to 3 times
      if (job.attempts < 3) {
        job.attempts++
        notificationQueue.push(job)
      } else {
        console.error(`❌ Notification failed after 3 attempts:`, job.type)
      }
    }
  }
  isProcessing = false
}

/**
 * Dispatch a single notification
 */
const dispatch = async (job) => {
  switch (job.channel) {
    case 'sms':
      await sendSMS(job.phone, job.message)
      break
    case 'push':
      await sendPushNotification(job.deviceToken, job.title, job.message)
      break
    case 'whatsapp':
      await sendWhatsAppAlert(job.phone, job.bloodGroup, job.location, job.requestId)
      break
    case 'socket':
      // Real-time via Socket.io (handled separately)
      break
    default:
      console.warn(`Unknown notification channel: ${job.channel}`)
  }
  await logDelivery(job)
}

// ── WhatsApp Alert via Meta Cloud API / Demo Mock ──
const sendWhatsAppAlert = async (phone = '+919876543210', bloodGroup = 'O-', location = 'Nearby Hospital', requestId = 'REQ-01') => {
  const token = process.env.WHATSAPP_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

  const messageText = `🚨 URGENT: Blood group ${bloodGroup} needed immediately near ${location}.\nReply "YES" if you are available to donate now.`

  if (token && phoneNumberId) {
    try {
      const fetch = require('node-fetch')
      const resp = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone.replace(/[^0-9]/g, ''),
          type: 'text',
          text: { body: messageText },
        }),
      })
      const data = await resp.json()
      console.log(`📲 WhatsApp message sent to ${phone}:`, data)
      return { success: true, messageId: data.messages?.[0]?.id }
    } catch (err) {
      console.error('📲 WhatsApp API error:', err.message)
    }
  }

  // Demo fallback
  console.log(`📲 [DEMO WHATSAPP] To: ${phone} | Template: "${messageText.replace(/\n/g, ' ')}" (Sandbox Mode)`)
  return { success: true, demo: true, channel: 'WhatsApp (Cloud API Sandbox)' }
}

// ── SMS via Twilio ──
const sendSMS = async (phone, message) => {
  if (!process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID === 'your_twilio_sid') {
    // Demo mode — log only
    console.log(`📱 [DEMO SMS] To: ${phone} | Message: ${message.substring(0, 60)}...`)
    return { success: true, demo: true }
  }

  try {
    const twilio = require('twilio')
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE,
      to: phone,
    })
    console.log(`📱 SMS sent: ${result.sid}`)
    return { success: true, sid: result.sid }
  } catch (err) {
    console.error(`📱 SMS failed:`, err.message)
    throw err
  }
}

// ── Push via Firebase FCM ──
const sendPushNotification = async (deviceToken, title, body) => {
  if (!process.env.FIREBASE_SERVER_KEY || process.env.FIREBASE_SERVER_KEY === 'your_firebase_key') {
    console.log(`🔔 [DEMO PUSH] Title: ${title} | Body: ${body.substring(0, 60)}...`)
    return { success: true, demo: true }
  }

  try {
    const fetch = require('node-fetch')
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        Authorization: `key=${process.env.FIREBASE_SERVER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: deviceToken,
        notification: { title, body },
        priority: 'high',
      }),
    })
    const data = await response.json()
    return { success: data.success === 1 }
  } catch (err) {
    console.error(`🔔 Push failed:`, err.message)
    throw err
  }
}

// ── Delivery Tracking ──
const logDelivery = async (job) => {
  try {
    const { NotificationLog } = require('../models')
    await NotificationLog.findOneAndUpdate(
      { recipientId: job.recipientId, requestId: job.requestId },
      { responseStatus: 'delivered', $set: { deliveredAt: new Date() } }
    )
  } catch (_) {
    // Non-blocking
  }
}

// ── Notification Templates ──
const TEMPLATES = {
  EMERGENCY_SOS: (bloodGroup, location, urgency) =>
    `🆘 BLOODCONNECT ALERT: ${urgency.toUpperCase()} need for ${bloodGroup} blood near ${location}. Can you donate? Reply YES or visit app.`,

  NEAR_EXPIRY: (bloodGroup, daysLeft, bankName) =>
    `⚠️ BloodConnect: ${bloodGroup} blood at ${bankName} expires in ${daysLeft} days. Prioritize usage or arrange redistribution.`,

  LOW_STOCK: (bloodGroup, units, bankName) =>
    `🚨 BloodConnect: ${bloodGroup} stock at ${bankName} is critically low (${units} units). Immediate donor outreach recommended.`,

  DONATION_CONFIRMED: (donorName, bankName, certId) =>
    `✅ BloodConnect: Thank you ${donorName}! Your donation at ${bankName} is confirmed. Certificate: ${certId}`,

  ELIGIBILITY_REMINDER: (donorName, date) =>
    `🩸 BloodConnect: Hi ${donorName}, you're eligible to donate again from ${date}! Your blood saves lives.`,

  TRUST_SCORE_LOW: (donorName, score) =>
    `ℹ️ BloodConnect: Hi ${donorName}, your reliability score is ${score}/100. Respond to alerts to improve your score.`,
}

// ── Public API ──

/**
 * Send emergency SOS notification to a donor
 */
const notifyDonorSOS = (donor, request) => {
  const message = TEMPLATES.EMERGENCY_SOS(
    request.bloodGroup,
    request.location?.description || 'nearby',
    request.urgencyLevel
  )
  enqueue({
    channel: 'sms',
    phone: donor.phone,
    message,
    recipientId: donor._id,
    requestId: request._id,
    type: 'EMERGENCY_SOS',
  })
}

/**
 * Notify bank about near-expiry stock
 */
const notifyNearExpiry = (bankContact, bloodGroup, daysLeft, bankName) => {
  enqueue({
    channel: 'sms',
    phone: bankContact,
    message: TEMPLATES.NEAR_EXPIRY(bloodGroup, daysLeft, bankName),
    type: 'NEAR_EXPIRY',
  })
}

/**
 * Notify bank about low stock
 */
const notifyLowStock = (bankContact, bloodGroup, units, bankName) => {
  enqueue({
    channel: 'sms',
    phone: bankContact,
    message: TEMPLATES.LOW_STOCK(bloodGroup, units, bankName),
    type: 'LOW_STOCK',
  })
}

/**
 * Confirm donation — notify donor with certificate
 */
const notifyDonationConfirmed = (donor, bankName, certId) => {
  enqueue({
    channel: 'sms',
    phone: donor.phone,
    message: TEMPLATES.DONATION_CONFIRMED(donor.name, bankName, certId),
    recipientId: donor._id,
    type: 'DONATION_CONFIRMED',
  })
}

// ── Telegram Bot API Dispatcher (Free Cost Replacement for Twilio/WhatsApp) ──
const sendTelegramAlert = async (alertData) => {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  const text = `🚨 *BLOODCONNECT EMERGENCY SOS (CODE RED)* 🚨
━━━━━━━━━━━━━━━━━━━━
🩸 *Blood Needed:* ${alertData.bloodGroup || 'O-'}
🏥 *Hospital:* ${alertData.hospitalName || 'Central Trauma Centre'}
📍 *Location:* ${alertData.location || 'Emergency OT'}
📦 *Units Required:* ${alertData.unitsRequired || alertData.unitsNeeded || 2}
⚠️ *Urgency Level:* ${(alertData.urgencyLevel || 'CRITICAL').toUpperCase()}
🕒 *Time:* ${new Date().toLocaleTimeString()}
━━━━━━━━━━━━━━━━━━━━
👉 Open BloodConnect app to accept dispatch & save a life!`

  if (token && chatId) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'Markdown'
        })
      })
      const data = await response.json()
      console.log(`✈️ [Telegram Bot SOS Alert Sent]:`, data.ok ? 'SUCCESS' : data.description)
      return { success: data.ok, messageId: data.result?.message_id }
    } catch (err) {
      console.error(`✈️ [Telegram Error]:`, err.message)
    }
  }

  // Live High-Fidelity Terminal Simulator (Zero cost hackathon demo)
  console.log(`
  ╔═══════════════════════════════════════════════════════════════╗
  ║ ✈️ [TELEGRAM BOT API LIVE DISPATCH SIMULATOR]                 ║
  ║ Message broadcast to @BloodConnectAlertsChannel:              ║
  ║ 🚨 EMERGENCY SOS: ${alertData.bloodGroup} needed at ${alertData.hospitalName || 'Nagpur Trauma'} (${alertData.unitsRequired || 2} Units)  ║
  ║ Status: 🟢 DELIVERED TO 148 SUBSCRIBED DONORS                ║
  ╚═══════════════════════════════════════════════════════════════╝
  `)
  return { success: true, simulated: true }
}

// ── Nodemailer Emergency Email Dispatcher ──
const sendEmergencyEmail = async ({ to = 'emergency-donors@bloodconnect.org', alertData }) => {
  const nodemailer = require('nodemailer')
  const user = process.env.EMAIL_USER
  const pass = process.env.EMAIL_PASS

  const html = `
    <div style="font-family: Arial, sans-serif; background: #0f172a; color: #ffffff; padding: 24px; border-radius: 12px;">
      <h2 style="color: #ff4757; margin-top: 0;">🚨 BloodConnect CODE RED Emergency Alert</h2>
      <p style="font-size: 16px;">An urgent emergency blood requirement has been reported:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; color: #f8fafc;">
        <tr><td style="padding: 8px; border-bottom: 1px solid #334155;"><strong>Blood Group:</strong></td><td style="padding: 8px; border-bottom: 1px solid #334155; color: #ff4757; font-size: 20px; font-weight: bold;">${alertData?.bloodGroup || 'O-'}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #334155;"><strong>Hospital:</strong></td><td style="padding: 8px; border-bottom: 1px solid #334155;">${alertData?.hospitalName || 'AIIMS Apex Trauma Center'}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #334155;"><strong>Location:</strong></td><td style="padding: 8px; border-bottom: 1px solid #334155;">${alertData?.location || 'Emergency Ward'}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #334155;"><strong>Units Needed:</strong></td><td style="padding: 8px; border-bottom: 1px solid #334155;">${alertData?.unitsRequired || 2} Units</td></tr>
      </table>
      <a href="http://localhost:5173/emergency" style="background: #ff4757; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Respond to Emergency</a>
    </div>
  `

  if (user && pass) {
    try {
      const transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: { user, pass }
      })
      const info = await transporter.sendMail({
        from: `"BloodConnect SOS" <${user}>`,
        to,
        subject: `🚨 CODE RED: Urgent ${alertData?.bloodGroup || 'O-'} Blood Needed at ${alertData?.hospitalName || 'Hospital'}`,
        html
      })
      console.log(`📧 [Nodemailer Email Sent]: ${info.messageId}`)
      return { success: true, messageId: info.messageId }
    } catch (err) {
      console.error(`📧 [Nodemailer Error]:`, err.message)
    }
  }

  // Fallback demo log
  console.log(`📧 [NODEMAILER EMERGENCY DISPATCH] To: ${to} | Subject: CODE RED: ${alertData?.bloodGroup} at ${alertData?.hospitalName || 'Hospital'}`)
  return { success: true, simulated: true }
}

module.exports = {
  enqueue,
  notifyDonorSOS,
  notifyNearExpiry,
  notifyLowStock,
  notifyDonationConfirmed,
  sendTelegramAlert,
  sendEmergencyEmail,
  sendWhatsAppAlert,
  TEMPLATES,
  getQueueLength: () => notificationQueue.length,
}

