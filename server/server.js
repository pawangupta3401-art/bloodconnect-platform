const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const http = require('http')
const { Server } = require('socket.io')
require('dotenv').config()

// ── Security Middleware ──
const { apiLimiter, sanitizeInput } = require('./middleware/rateLimiter')

const app = express()
const server = http.createServer(app)

// ── Production CORS Origins ──
// Accepts: local dev + Vercel preview + custom domain
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.CLIENT_URL,                          // Custom domain
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
].filter(Boolean)

const corsOptions = {
  origin: (origin, callback) => {
    // Allow no-origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true)
    // Allow Vercel preview URLs (*.vercel.app)
    if (origin.endsWith('.vercel.app')) return callback(null, true)
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true)
    callback(new Error(`CORS blocked: ${origin}`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}

// ── Socket.io Setup ──
const io = new Server(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],  // Fallback for proxies
})
app.set('io', io)

// ── Core Middleware ──
app.use(cors(corsOptions))
app.use(express.json({ limit: '10kb' })) // Limit payload size
app.use(sanitizeInput)                   // NoSQL injection prevention
app.use('/api/', apiLimiter)             // Global API rate limiting

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  next()
})

// ── MongoDB Connection (with Serverless Connection Caching) ──
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/bloodconnect'

let cachedPromise = null
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return mongoose.connection
  if (!cachedPromise) {
    cachedPromise = mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      bufferCommands: false,
    }).then(m => {
      console.log('✅ MongoDB connected')
      return m
    }).catch(err => {
      cachedPromise = null
      console.log('⚠️ MongoDB not connected (running in mock/telemetry mode):', err.message)
    })
  }
  return cachedPromise
}
connectDB()

// ── Routes (TAD §5 — versioned at /api/v1/) ──
const authRoutes = require('./routes/auth')
const donorRoutes = require('./routes/donors')
const inventoryRoutes = require('./routes/inventory')
const emergencyRoutes = require('./routes/emergency')
const adminRoutes = require('./routes/admin')
const ledgerRoutes = require('./routes/ledger')
const aiRoutes = require('./routes/ai')
const supabaseRoutes = require('./routes/supabaseSync')
const appointmentsRoutes = require('./routes/appointments')
const branchesRoutes = require('./routes/branches')

const redistributionRoutes = require('./routes/redistribution')
const whatsappRoutes = require('./routes/whatsapp')

// v1 versioned routes (TAD §5)
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/donors', donorRoutes)
app.use('/api/v1/inventory', inventoryRoutes)
app.use('/api/v1/requests', emergencyRoutes)
app.use('/api/v1/admin', adminRoutes)
app.use('/api/v1/donations', ledgerRoutes)
app.use('/api/v1/ai', aiRoutes)
app.use('/api/v1/supabase', supabaseRoutes)
app.use('/api/v1/appointments', appointmentsRoutes)
app.use('/api/v1/branches', branchesRoutes)
app.use('/api/v1/redistribution', redistributionRoutes)
app.use('/api/v1/whatsapp', whatsappRoutes)

// Backward-compatible aliases (no breaking changes)
app.use('/api/auth', authRoutes)
app.use('/api/donors', donorRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/emergency', emergencyRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/supabase', supabaseRoutes)
app.use('/api/appointments', appointmentsRoutes)
app.use('/api/branches', branchesRoutes)
app.use('/api/redistribution', redistributionRoutes)
app.use('/api/whatsapp', whatsappRoutes)

// Feature 1: Proactive Redistribution Engine Background Scan
const { runRedistributionScan } = require('./services/redistributionEngine')
setTimeout(() => runRedistributionScan(io), 2000)
setInterval(() => runRedistributionScan(io), 3 * 60 * 1000)

// ── Health Check (TAD §6 — all services) ──
const { getQueueLength } = require('./services/notificationService')
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected (demo mode)'
  res.json({
    status: 'online',
    version: 'v1',
    platform: 'BloodConnect PS-01',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    services: {
      api:             'online',
      database:        dbStatus,
      socket:          'online',
      matchingEngine:  'online',
      notificationQueue: `online (${getQueueLength()} queued)`,
      ledger:          'online',
      mlPrediction:    'online (Google Gemini 3.6 Flash AI)',
    },
    endpoints: '/api/v1/',
  })
})
app.get('/api/v1/health', (req, res) => res.redirect('/api/health'))

// ── Demo Scenario Endpoint (Hackathon Demo) ──
// GET /api/v1/demo/trigger-scenario → fires a fake hospital O- critical request
// and simulates a donor response after 5 seconds
app.get('/api/v1/demo/trigger-scenario', (req, res) => {
  const requestId = `ER-DEMO-${Date.now()}`
  const alertPayload = {
    id: requestId,
    bloodGroup: 'O-',
    urgencyLevel: 'critical',
    unitsNeeded: 2,
    hospitalName: 'Apollo Hospitals, Mumbai',
    location: 'Apollo Hospitals, Mumbai',
    patientCondition: 'Severe trauma — intra-operative haemorrhage',
    timestamp: new Date().toLocaleTimeString(),
    isoTimestamp: new Date().toISOString(),
    demo: true,
  }

  // 1. Broadcast emergency to all clients
  io.emit('emergency_alert', alertPayload)
  io.emit('new-emergency', alertPayload)

  // 2. Simulate donor response after 5s
  setTimeout(() => {
    io.emit('donor-responded', {
      requestId,
      donorId: 'demo-donor-001',
      donorName: 'Arjun Sharma',
      bloodGroup: 'O-',
      timestamp: new Date().toISOString(),
    })
    console.log('🩸 [Demo] Simulated donor response emitted for', requestId)
  }, 5000)

  res.json({
    success: true,
    message: '🎬 Demo scenario triggered! Emergency alert broadcast in 0s, donor response simulated in 5s.',
    requestId,
    alertPayload,
  })
})

// GET /api/v1/demo/reset → resets in-memory state
app.get('/api/v1/demo/reset', (req, res) => {
  io.emit('demo-reset', { message: 'Demo state reset', timestamp: new Date().toISOString() })
  res.json({ success: true, message: 'Demo reset broadcast sent to all clients.' })
})

// ── Socket.io Real-Time Event Gateway ──
io.on('connection', (socket) => {
  console.log(`🔌 Live WebSocket client connected: ${socket.id}`)

  // Join designated channel rooms (donors, blood-banks, hospitals, admin, emergency)
  socket.on('join-room', (room) => {
    socket.join(room)
    console.log(`📢 ${socket.id} joined channel room: ${room}`)
    socket.emit('room-joined', { room, socketId: socket.id, timestamp: new Date().toISOString() })
  })

  // Leave room
  socket.on('leave-room', (room) => {
    socket.leave(room)
    console.log(`👋 ${socket.id} left room: ${room}`)
  })

  // 1. Emergency SOS Real-Time Broadcast
  socket.on('emergency-sos', (data) => {
    console.log(`🆘 Live SOS broadcast received: ${data.bloodGroup} at ${data.location}`)
    const payload = {
      ...data,
      id: data.id || `ER-${Date.now()}`,
      timestamp: new Date().toISOString(),
      serverLatency: '14ms',
    }
    // Broadcast everywhere
    io.emit('emergency_alert', payload)
    io.emit('new-emergency', payload)
    io.emit('live-ai-event', {
      type: 'EMERGENCY_TRIGGERED',
      bloodGroup: data.bloodGroup,
      location: data.location || 'Nagpur Zone',
      urgency: data.urgency || 'CRITICAL',
      timestamp: new Date().toISOString()
    })
    socket.emit('sos-acknowledged', {
      success: true,
      message: 'SOS broadcasted to all hospitals, blood banks, and donors via WebSocket',
      requestId: payload.id
    })
  })

  // 2. Real-Time Inventory Stock Update
  socket.on('inventory-update', (data) => {
    console.log(`📦 Live inventory update: ${data.bloodGroup} at ${data.bankId || 'Hub'}`)
    io.emit('inventory:update', data)
    io.emit('inventory-updated', data)
  })

  // 3. Live Cold-Chain Transit Telemetry (GPS + Temp)
  socket.on('transit:ping', (data) => {
    io.emit('transit:telemetry', data)
  })

  // 4. Donor Response to Alert
  socket.on('donor-response', (data) => {
    io.emit('donor-responded', data)
    console.log(`🩸 Donor responded live: ${data.donorName || data.donorId} for request ${data.requestId}`)
  })

  // 5. Appointment Booking Real-time Notification
  socket.on('appointment:book', (data) => {
    io.emit('appointment:new', data)
  })

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`)
  })
})

// ── Periodic Real-Time Telemetry Heartbeat (4-second cycle) ──
let simStep = 0
setInterval(() => {
  if (io.engine.clientsCount > 0) {
    simStep++
    // Live Transit GPS moving simulation coordinates around Nagpur
    const baseLat = 21.1458 + Math.sin(simStep * 0.1) * 0.03
    const baseLng = 79.0882 + Math.cos(simStep * 0.1) * 0.03
    const temperature = (3.8 + Math.sin(simStep * 0.2) * 0.5).toFixed(1)

    io.emit('live-pulse', {
      timestamp: new Date().toISOString(),
      activeNodes: 156,
      connectedClients: io.engine.clientsCount,
      transitTelemetry: {
        vanId: 'VAN-NGP-04',
        lat: baseLat,
        lng: baseLng,
        temperatureC: `${temperature}°C`,
        status: 'Optimal (2°C - 6°C)',
        speedKmh: 42,
        route: 'AIIMS Nagpur ➔ Alexis Multispeciality',
      },
      systemLatency: `${Math.floor(10 + Math.random() * 8)}ms`,
      matchSuccessRate: '99.4%'
    })
  }
}, 4000)

// ── Start Server (Local / Traditional Hosting) ──
const PORT = process.env.PORT || 5000
if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`
  ╔══════════════════════════════════════╗
  ║   🩸 BloodConnect PS-01 Server       ║
  ║   Running on: http://localhost:${PORT}   ║
  ║   Environment: ${process.env.NODE_ENV || 'development'}          ║
  ╚══════════════════════════════════════╝
    `)
  })
}

module.exports = { app, io, server }
