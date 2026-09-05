import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { API_BASE } from '../config/api'
import './EmergencySOS.css'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']

const URGENCY_LEVELS = [
  { id: 'critical', label: 'Critical', desc: 'Life-threatening — need blood in < 1 hour', color: '#FF1744', icon: '🚨' },
  { id: 'high', label: 'High', desc: 'Urgent surgery — need blood in 2–4 hours', color: '#FFB300', icon: '⚡' },
  { id: 'normal', label: 'Normal', desc: 'Planned procedure — need blood today', color: '#29B6F6', icon: '📋' },
]

const MOCK_MATCHES = [
  {
    id: 'bank-1',
    type: 'bank',
    name: 'LifeSource Blood Bank (Ramdas Peth)',
    address: 'Central Bazar Road, Ramdas Peth, Nagpur',
    distance: '1.2 km',
    distanceKm: 1.2,
    units: 8,
    eta: '8 min',
    contact: '+91 712 256 0102',
    lat: 21.1378,
    lng: 79.0835
  },
  {
    id: 'bank-2',
    type: 'bank',
    name: 'Red Cross Blood Center (Civil Lines)',
    address: 'Palm Road, Civil Lines, Nagpur',
    distance: '2.8 km',
    distanceKm: 2.8,
    units: 5,
    eta: '15 min',
    contact: '+91 712 256 0101',
    lat: 21.1485,
    lng: 79.0795
  },
  {
    id: 'donor-1',
    type: 'donor',
    name: 'Nearby Donor (Arjun S.)',
    locality: 'Dharampeth, Nagpur',
    distance: '0.8 km',
    distanceKm: 0.8,
    units: 1,
    eta: '25 min',
    phone: '+91 98220 12345',
    contact: 'Notified via SMS',
    verified: true
  },
  {
    id: 'donor-2',
    type: 'donor',
    name: 'Nearby Donor (Priya M.)',
    locality: 'Sitabuldi, Nagpur',
    distance: '1.5 km',
    distanceKm: 1.5,
    units: 1,
    eta: '30 min',
    phone: '+91 98220 54321',
    contact: 'Notified via SMS',
    verified: true
  },
]

// Interpolate coordinates for moving marker
function interpolate(lat1, lng1, lat2, lng2, frac) {
  return {
    lat: lat1 + (lat2 - lat1) * frac,
    lng: lng1 + (lng2 - lng1) * frac,
  }
}

export default function EmergencySOS() {
  const navigate = useNavigate()
  const [step, setStep] = useState('form') // form | searching | results | reservation_confirmed | choose_transport | tracking_ambulance | tracking_drone | delivery_confirmed
  const [form, setForm] = useState({
    name: '',
    phone: '',
    group: 'O+',
    units: '2',
    urgency: 'critical',
    location: 'Government Medical College Hospital, Nagpur',
    notes: 'Emergency trauma resuscitation'
  })
  const [searchProgress, setSearchProgress] = useState(0)
  const [broadcastCount, setBroadcastCount] = useState(0)
  const [timer, setTimer] = useState(0)

  // Step 1 Reservation State
  const [selectedBank, setSelectedBank] = useState(MOCK_MATCHES[0])
  const [reservationData, setReservationData] = useState(null)

  // Step 2 Donor Contact State
  const [donorContactModal, setDonorContactModal] = useState(null)
  const [copiedPhone, setCopiedPhone] = useState(false)
  const [smsToast, setSmsToast] = useState(null)

  // Step 3 & 4 Transport & Tracking State
  const [transportMethod, setTransportMethod] = useState('drone') // 'ambulance' | 'drone'
  const [trackingProgress, setTrackingProgress] = useState(0)
  const [trackingElapsedSec, setTrackingElapsedSec] = useState(0)
  const [trackingSpeed, setTrackingSpeed] = useState(60)
  const [dispatchStartTime, setDispatchStartTime] = useState(null)

  // Step 5 Delivery Receipt State
  const [deliveryReceipt, setDeliveryReceipt] = useState(null)

  // Leaflet Map Refs
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const movingMarkerRef = useRef(null)

  // Searching Broadcast Loop
  useEffect(() => {
    if (step === 'searching') {
      const interval = setInterval(() => {
        setSearchProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval)
            setStep('results')
            return 100
          }
          return prev + 5
        })
        setBroadcastCount(prev => Math.min(prev + 3, 47))
        setTimer(prev => prev + 1)
      }, 150)
      return () => clearInterval(interval)
    }
  }, [step])

  // SOS Submission Handler
  const handleSOS = async () => {
    if (!form.group) return
    setStep('searching')

    try {
      const API_URL = API_BASE
      await fetch(`${API_URL}/api/v1/requests/trigger-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bloodGroup: form.group,
          hospitalName: form.location || 'Emergency Request Desk',
          unitsRequired: form.units,
          location: form.location || 'City Hospital',
          patientCondition: form.notes || 'Emergency requirement submitted via portal',
          urgencyLevel: form.urgency
        })
      })
    } catch (e) {
      console.warn('[SOS Alert Trigger Failed]:', e.message)
    }
  }

  // STEP 1: Reserve Now Action
  const handleReserveNow = (bank) => {
    setSelectedBank(bank)
    const now = new Date()
    const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })

    const res = {
      resId: `RES-NGP-${Math.floor(1000 + Math.random() * 9000)}`,
      bankName: bank.name,
      bankAddress: bank.address,
      bloodGroup: form.group || 'O+',
      units: parseInt(form.units) || 2,
      destination: form.location || 'Government Medical College Hospital, Nagpur',
      destLat: 21.1275,
      destLng: 79.0963,
      bankLat: bank.lat,
      bankLng: bank.lng,
      distance: bank.distance,
      distanceKm: bank.distanceKm,
      date: dateStr,
      time: timeStr,
      timestamp: `${dateStr} at ${timeStr}`
    }

    setReservationData(res)
    setStep('reservation_confirmed')
  }

  // STEP 2: Donor Contact Action
  const handleContactDonor = (donor) => {
    setDonorContactModal(donor)
    setCopiedPhone(false)
  }

  const handleSendReminderSMS = (donorName) => {
    setSmsToast(`📨 Urgent SMS Reminder dispatched to ${donorName}!`)
    setTimeout(() => setSmsToast(null), 3500)
  }

  // STEP 3: Choose Transport & Launch Dispatch
  const handleLaunchTransport = (method) => {
    setTransportMethod(method)
    setTrackingProgress(0)
    setTrackingElapsedSec(0)
    setDispatchStartTime(new Date())
    setStep(method === 'ambulance' ? 'tracking_ambulance' : 'tracking_drone')
  }

  // STEP 4: Live Telemetry & Map Tracker Effect
  useEffect(() => {
    if (step === 'tracking_ambulance' || step === 'tracking_drone') {
      const isDrone = step === 'tracking_drone'
      const totalSec = isDrone ? 18 : 24 // Fast simulation duration for interactive demo

      const interval = setInterval(() => {
        setTrackingElapsedSec(sec => {
          const nextSec = sec + 1
          const progress = Math.min(100, Math.round((nextSec / totalSec) * 100))
          setTrackingProgress(progress)

          // Jitter speed slightly
          setTrackingSpeed(isDrone ? Math.floor(61 + Math.random() * 5) : Math.floor(42 + Math.random() * 6))

          // Update Leaflet marker position
          if (movingMarkerRef.current && reservationData) {
            const frac = progress / 100
            const currentPos = interpolate(
              reservationData.bankLat,
              reservationData.bankLng,
              reservationData.destLat,
              reservationData.destLng,
              frac
            )
            movingMarkerRef.current.setLatLng([currentPos.lat, currentPos.lng])
          }

          if (progress >= 100) {
            clearInterval(interval)
            // Complete and go to Step 5 Delivery Confirmation
            const now = new Date()
            const delTimeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
            const dispTimeStr = dispatchStartTime
              ? dispatchStartTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
              : 'Just now'

            setDeliveryReceipt({
              resId: reservationData.resId,
              bloodGroup: reservationData.bloodGroup,
              units: reservationData.units,
              bankName: reservationData.bankName,
              destination: reservationData.destination,
              transportMethod: isDrone ? 'via_drone' : 'via_ambulance',
              dispatchTime: dispTimeStr,
              deliveryTime: delTimeStr,
              duration: isDrone ? `${(reservationData.distanceKm * 1.0).toFixed(1)} mins (Aerial)` : `${(reservationData.distanceKm * 3.5).toFixed(1)} mins (Ground Road)`,
              date: reservationData.date
            })

            setTimeout(() => {
              setStep('delivery_confirmed')
            }, 800)
          }

          return nextSec
        })
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [step, reservationData, dispatchStartTime])

  // Setup Leaflet map on DOM node
  const setMapContainer = useCallback((node) => {
    if (!node || !reservationData) return
    mapContainerRef.current = node

    if (mapInstanceRef.current) {
      try { mapInstanceRef.current.remove() } catch (e) {}
      mapInstanceRef.current = null
    }

    const initMap = () => {
      if (!window.L || !node) return
      const L = window.L
      const isDrone = step === 'tracking_drone'

      const map = L.map(node, {
        zoomControl: true,
        attributionControl: false
      }).setView([(reservationData.bankLat + reservationData.destLat) / 2, (reservationData.bankLng + reservationData.destLng) / 2], 13)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map)

      // Bank Marker
      const bankIcon = L.divIcon({
        html: '<div style="background:linear-gradient(135deg, #2563eb, #1d4ed8);width:32px;height:32px;border-radius:50%;border:3px solid #fff;box-shadow:0 4px 12px rgba(37,99,235,0.5);display:flex;align-items:center;justify-content:center;font-size:16px;color:#fff;">🏦</div>',
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      })
      L.marker([reservationData.bankLat, reservationData.bankLng], { icon: bankIcon })
        .bindPopup(`<b>🏦 ${reservationData.bankName}</b><br>Source Bio-Bank`)
        .addTo(map)

      // Destination Hospital Marker
      const hospIcon = L.divIcon({
        html: '<div style="background:linear-gradient(135deg, #dc2626, #b91c1c);width:32px;height:32px;border-radius:50%;border:3px solid #fff;box-shadow:0 4px 12px rgba(220,38,38,0.5);display:flex;align-items:center;justify-content:center;font-size:16px;color:#fff;">🏥</div>',
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      })
      L.marker([reservationData.destLat, reservationData.destLng], { icon: hospIcon })
        .bindPopup(`<b>🏥 ${reservationData.destination}</b><br>Emergency Delivery Location`)
        .addTo(map)

      // Route line
      L.polyline([[reservationData.bankLat, reservationData.bankLng], [reservationData.destLat, reservationData.destLng]], {
        color: isDrone ? '#06b6d4' : '#ef4444',
        weight: 4,
        dashArray: isDrone ? '10, 8' : undefined,
        opacity: 0.95
      }).addTo(map)

      // Moving Vehicle Marker
      const frac = trackingProgress / 100
      const cur = interpolate(reservationData.bankLat, reservationData.bankLng, reservationData.destLat, reservationData.destLng, frac)

      const vehicleIcon = L.divIcon({
        html: isDrone
          ? '<div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;"><div style="position:absolute;inset:0;background:rgba(6,182,212,0.4);border-radius:50%;animation:pulseCyan 1.5s infinite;"></div><div style="width:34px;height:34px;background:#0f172a;border:2.5px solid #06b6d4;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:17px;box-shadow:0 0 14px rgba(6,182,212,0.8);z-index:2;">🚁</div></div>'
          : '<div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;"><div style="position:absolute;inset:0;background:rgba(239,68,68,0.4);border-radius:50%;animation:pulseRed 1.5s infinite;"></div><div style="width:34px;height:34px;background:#0f172a;border:2.5px solid #ef4444;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:17px;box-shadow:0 0 14px rgba(239,68,68,0.8);z-index:2;">🚑</div></div>',
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      })

      const movingMarker = L.marker([cur.lat, cur.lng], { icon: vehicleIcon, zIndexOffset: 1000 }).addTo(map)

      map.fitBounds([[reservationData.bankLat, reservationData.bankLng], [reservationData.destLat, reservationData.destLng]], { padding: [40, 40] })
      setTimeout(() => { if (map) map.invalidateSize() }, 200)

      mapInstanceRef.current = map
      movingMarkerRef.current = movingMarker
    }

    if (window.L) {
      initMap()
    } else {
      if (!document.getElementById('leaflet-css-sos')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css-sos'
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }
      const script = document.createElement('script')
      script.id = 'leaflet-js-sos'
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = () => initMap()
      document.head.appendChild(script)
    }
  }, [step, reservationData, trackingProgress])

  return (
    <div className="sos-page">
      {/* Background */}
      <div className="sos-bg">
        <div className="sos-orb sos-orb-1" />
        <div className="sos-orb sos-orb-2" />
        <div className="sos-grid" />
      </div>

      {/* Navbar */}
      <nav className="sos-nav">
        <Link to="/" className="sos-logo">
          <span>🩸</span>
          <span style={{ fontWeight: 800 }}>BloodConnect</span>
        </Link>
        <div className="flex gap-md">
          <Link to="/login" className="btn btn-secondary btn-sm">Login</Link>
          <Link to="/" className="btn btn-ghost btn-sm">← Back to Home</Link>
        </div>
      </nav>

      <div className="sos-container">
        {/* Header */}
        <div className="sos-header">
          <div className="sos-icon animate-pulse-red">🆘</div>
          <h1 className="sos-title">Emergency Blood Request</h1>
          <p className="sos-subtitle">
            No login required. Broadcasted instantly to Nagpur blood banks, hospital trauma nodes, and verified nearby donors.
          </p>
        </div>

        {/* ── STEP 0: FORM ── */}
        {step === 'form' && (
          <div className="sos-form-card glass-card animate-fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div className="form-group">
                <label className="form-label">Your Name / Requester</label>
                <input id="sos-name" className="form-input" placeholder="Ramesh Gupta" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Phone</label>
                <input id="sos-phone" type="tel" className="form-input" placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
              <div className="form-group">
                <label className="form-label">Blood Group Needed *</label>
                <select id="sos-blood-group" className="form-select" value={form.group} onChange={e => setForm(p => ({ ...p, group: e.target.value }))}>
                  <option value="">Select Blood Group</option>
                  {BLOOD_GROUPS.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Units Required</label>
                <input id="sos-units" type="number" className="form-input" min="1" max="10" value={form.units} onChange={e => setForm(p => ({ ...p, units: e.target.value }))} />
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <label className="form-label" style={{ marginBottom: 12, display: 'block' }}>Urgency Level *</label>
              <div className="urgency-grid">
                {URGENCY_LEVELS.map(level => (
                  <div
                    key={level.id}
                    id={`urgency-${level.id}`}
                    className={`urgency-card ${form.urgency === level.id ? 'active' : ''}`}
                    style={{ '--urgency-color': level.color }}
                    onClick={() => setForm(p => ({ ...p, urgency: level.id }))}
                  >
                    <div className="urgency-icon">{level.icon}</div>
                    <div className="urgency-label">{level.label}</div>
                    <div className="urgency-desc">{level.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <div className="form-group">
                <label className="form-label">Hospital / Destination Facility</label>
                <input id="sos-location" className="form-input" placeholder="Government Medical College Hospital, Nagpur" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <div className="form-group">
                <label className="form-label">Additional Notes</label>
                <textarea id="sos-notes" className="form-input" style={{ resize: 'vertical', minHeight: 70 }} placeholder="Patient condition, component type needed, contact person..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>

            <button
              id="trigger-sos-btn"
              className="btn btn-danger btn-lg w-full animate-pulse-red"
              style={{ marginTop: 24, fontSize: '1.1rem', padding: '18px', borderRadius: 'var(--radius-full)' }}
              onClick={handleSOS}
              disabled={!form.group}
            >
              🆘 SEND EMERGENCY SOS NOW
            </button>

            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 12 }}>
              Broadcasts to all connected blood banks + eligible donors within 50 km. Response expected in under 5 minutes.
            </p>
          </div>
        )}

        {/* ── SEARCHING BROADCAST ── */}
        {step === 'searching' && (
          <div className="sos-searching glass-card animate-fade-in">
            <div className="searching-icon">🔍</div>
            <h2 style={{ fontWeight: 800, marginBottom: 8 }}>Broadcasting SOS...</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 32 }}>
              Reaching all blood banks and eligible donors near {form.location || 'your location'}
            </p>

            <div className="searching-progress">
              <div className="progress-bar" style={{ height: 12, marginBottom: 12 }}>
                <div className="progress-fill" style={{ width: `${searchProgress}%` }} />
              </div>
              <div className="flex justify-between" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                <span>Searching inventory...</span>
                <span>{searchProgress}%</span>
              </div>
            </div>

            <div className="searching-stats" style={{ marginTop: 32 }}>
              {[
                { icon: '🏦', label: 'Blood banks checked', value: Math.floor(broadcastCount / 3) },
                { icon: '🩸', label: 'Donors alerted', value: broadcastCount },
                { icon: '⏱️', label: 'Time elapsed', value: `${(timer * 0.15).toFixed(1)}s` },
              ].map((s, i) => (
                <div key={i} className="stat-card text-center">
                  <div style={{ fontSize: '1.6rem' }}>{s.icon}</div>
                  <div style={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--color-primary-light)' }}>{s.value}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div className="live-feed">
              <div className="live-feed-title">📡 Live Activity</div>
              {[
                '✅ LifeSource Blood Bank — 8 units available',
                '📱 Notifying 15 eligible donors within 5 km...',
                '✅ Red Cross Center — 5 units available',
                '📱 Donor Arjun S. (0.8 km) — Notification sent',
                '📱 Donor Priya M. (1.5 km) — Notification sent',
              ].slice(0, Math.ceil(broadcastCount / 10)).map((msg, i) => (
                <div key={i} className="feed-item animate-slide-in">{msg}</div>
              ))}
            </div>
          </div>
        )}

        {/* ── MATCHING RESULTS ── */}
        {step === 'results' && (
          <div className="animate-fade-in">
            <div className="sos-results-header glass-card" style={{ marginBottom: 24, borderColor: 'rgba(0, 230, 118, 0.3)', background: 'rgba(0, 230, 118, 0.05)' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
              <h2 style={{ fontWeight: 800, fontSize: '1.5rem', marginBottom: 8 }}>
                {MOCK_MATCHES.length} Verified Sources Found!
              </h2>
              <p style={{ color: 'var(--color-text-muted)' }}>
                Blood available for <span className="blood-badge" style={{ width: 32, height: 32, fontSize: '0.7rem', display: 'inline-flex' }}>{form.group || 'O+'}</span> •
                <strong> 47 donors notified</strong> • <strong>2 bio-banks matched</strong>
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {MOCK_MATCHES.map((match) => (
                <div key={match.id} className="glass-card" style={{ borderLeft: `4px solid ${match.type === 'bank' ? 'var(--color-primary)' : '#29B6F6'}` }}>
                  <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 12 }}>
                    <div className="flex gap-md items-center">
                      <div className="avatar" style={{ width: 52, height: 52, fontSize: '1.4rem', borderRadius: 12, background: match.type === 'bank' ? 'rgba(220,20,60,0.2)' : 'rgba(41,182,246,0.2)' }}>
                        {match.type === 'bank' ? '🏦' : '🩸'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>{match.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                          📍 {match.distance} • 🕐 ETA: {match.eta} • {match.type === 'bank' ? `${match.units} units available` : 'Can donate 1 unit'}
                        </div>
                        <div style={{ fontSize: '0.8rem', marginTop: 4, color: '#94a3b8' }}>
                          {match.type === 'bank' ? `Helpline: ${match.contact}` : `Status: ${match.contact}`}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <div style={{ fontWeight: 800, color: 'var(--color-success)', fontSize: '1.1rem' }}>
                        {match.units} unit{match.units > 1 ? 's' : ''}
                      </div>

                      {match.type === 'bank' ? (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleReserveNow(match)}
                          style={{ padding: '8px 16px', fontWeight: 800 }}
                        >
                          Reserve Now ➔
                        </button>
                      ) : (
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleContactDonor(match)}
                          style={{ padding: '8px 16px', fontWeight: 700 }}
                        >
                          📞 Contact Donor
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="glass-card" style={{ marginTop: 24, textAlign: 'center' }}>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: 16 }}>
                Need emergency support? Our 24/7 medical hotline is active.
              </p>
              <div className="flex gap-md justify-center flex-wrap">
                <button className="btn btn-secondary" onClick={() => setStep('form')}>Submit Another SOS</button>
                <Link to="/" className="btn btn-ghost">← Back to Home</Link>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 1: RESERVATION CONFIRMATION SCREEN ── */}
        {step === 'reservation_confirmed' && reservationData && (
          <div className="animate-fade-in">
            <div className="glass-card sos-delivery-card" style={{ marginBottom: 20 }}>
              <div style={{ fontSize: '3.5rem', marginBottom: 10 }}>✅</div>
              <h2 style={{ fontWeight: 900, fontSize: '1.8rem', color: '#fff', marginBottom: 6 }}>
                Reservation Confirmed!
              </h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>
                Units successfully held in bio-vault. Immediate dispatch authorization required.
              </p>
            </div>

            <div className="glass-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 16, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Generated Reservation ID</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#38bdf8', fontFamily: 'monospace', marginTop: 2 }}>{reservationData.resId}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Timestamp</div>
                  <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600, marginTop: 2 }}>{reservationData.timestamp}</div>
                </div>
              </div>

              <div className="sos-receipt-box">
                <div className="sos-receipt-row">
                  <span style={{ color: 'var(--color-text-muted)' }}>Source Bio-Bank:</span>
                  <span style={{ fontWeight: 700, color: '#fff' }}>{reservationData.bankName}</span>
                </div>
                <div className="sos-receipt-row">
                  <span style={{ color: 'var(--color-text-muted)' }}>Bank Address:</span>
                  <span style={{ color: '#cbd5e1' }}>{reservationData.bankAddress}</span>
                </div>
                <div className="sos-receipt-row">
                  <span style={{ color: 'var(--color-text-muted)' }}>Reserved Blood Group:</span>
                  <span style={{ fontWeight: 900, color: '#ef4444', fontSize: '1.1rem' }}>{reservationData.bloodGroup}</span>
                </div>
                <div className="sos-receipt-row">
                  <span style={{ color: 'var(--color-text-muted)' }}>Units Secured:</span>
                  <span style={{ fontWeight: 800, color: '#22c55e' }}>{reservationData.units} Units</span>
                </div>
                <div className="sos-receipt-row">
                  <span style={{ color: 'var(--color-text-muted)' }}>Destination Hospital:</span>
                  <span style={{ fontWeight: 700, color: '#fff' }}>{reservationData.destination}</span>
                </div>
                <div className="sos-receipt-row">
                  <span style={{ color: 'var(--color-text-muted)' }}>Corridor Distance:</span>
                  <span style={{ fontWeight: 700, color: '#38bdf8' }}>{reservationData.distance} straight-line</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <button
                  className="btn btn-primary w-full"
                  onClick={() => setStep('choose_transport')}
                  style={{ padding: '14px', fontSize: '1rem', fontWeight: 800, background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                >
                  🚀 Choose Transport Method ➔
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setStep('results')}
                  style={{ padding: '14px 20px' }}
                >
                  ← Back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: CHOOSE TRANSPORT METHOD ── */}
        {step === 'choose_transport' && reservationData && (
          <div className="animate-fade-in">
            <div className="glass-card" style={{ marginBottom: 20, textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Dispatch Routing Engine
              </div>
              <h2 style={{ fontWeight: 900, fontSize: '1.7rem', color: '#fff', margin: '6px 0' }}>
                Select Emergency Transport Mode
              </h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', margin: 0 }}>
                Comparing Ground EMS vs Autonomous UAV Flight corridor for Reservation <code style={{ color: '#38bdf8' }}>{reservationData.resId}</code>
              </p>
            </div>

            {/* 2 Option Cards */}
            <div className="transport-grid">
              {/* Option 1: Ambulance */}
              <div className={`transport-card ${reservationData.distanceKm < 1.5 ? 'recommended' : ''}`}>
                <div>
                  <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🚑</div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: '0 0 6px 0' }}>
                    Standard Ground Transport
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 16 }}>
                    Advanced Life Support (ALS) Ambulance equipped with road siren &amp; emergency driver.
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Est. Travel Time</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f59e0b', margin: '2px 0' }}>
                      ~{Math.max(8, Math.round(reservationData.distanceKm * 3.5 + 3))} mins
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Traffic-dependent route</div>
                  </div>

                  <ul style={{ fontSize: '0.78rem', color: '#cbd5e1', paddingLeft: 16, margin: '0 0 20px 0', lineHeight: 1.6 }}>
                    <li>Standard city road route</li>
                    <li>Paramedic staff on board</li>
                    <li>Subject to road traffic conditions</li>
                  </ul>
                </div>

                <button
                  className="btn btn-secondary w-full"
                  onClick={() => handleLaunchTransport('ambulance')}
                  style={{ padding: '12px', fontWeight: 800 }}
                >
                  🚑 Book Ambulance Dispatch
                </button>
              </div>

              {/* Option 2: Drone Transport */}
              <div className={`transport-card ${reservationData.distanceKm >= 1.5 ? 'recommended' : ''}`}>
                {reservationData.distanceKm >= 1.5 && (
                  <span className="transport-badge-rec">⚡ Recommended — 3x Faster</span>
                )}
                <div>
                  <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🚁</div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: '0 0 6px 0' }}>
                    Fast Aerial Delivery
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 16 }}>
                    Autonomous point-to-point medical UAV corridor flying at 60 km/h cruising velocity.
                  </div>

                  <div style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                    <div style={{ fontSize: '0.72rem', color: '#22d3ee', textTransform: 'uppercase', fontWeight: 700 }}>⚡ Drone Flight ETA</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#06b6d4', margin: '2px 0' }}>
                      ~{Math.max(2, Math.round(reservationData.distanceKm * 1.0 + 1))} mins
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#00e676' }}>100% Traffic Bypass Active ✅</div>
                  </div>

                  <ul style={{ fontSize: '0.78rem', color: '#cbd5e1', paddingLeft: 16, margin: '0 0 20px 0', lineHeight: 1.6 }}>
                    <li>Direct straight-line aerial corridor</li>
                    <li>2°C – 6°C IoT Cold-Chain Vault</li>
                    <li>Zero-Mile GPS autonomous landing</li>
                  </ul>
                </div>

                <button
                  className="btn btn-primary w-full"
                  onClick={() => handleLaunchTransport('drone')}
                  style={{ padding: '12px', fontWeight: 800, background: 'linear-gradient(135deg, #0284c7, #06b6d4)' }}
                >
                  🚀 Launch Drone Dispatch
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4a: AMBULANCE LIVE TRACKING ── */}
        {step === 'tracking_ambulance' && reservationData && (
          <div className="animate-fade-in">
            <div className="glass-card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>🚑</span> Ambulance Dispatched &amp; En Route
                  </h2>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Dispatch ID: <code style={{ color: '#38bdf8' }}>{reservationData.resId}</code> • Live Ground GPS Tracking
                  </div>
                </div>
                <span className="badge badge-yellow" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                  🚨 Emergency Siren Active
                </span>
              </div>

              {/* Driver Details Card */}
              <div className="sos-driver-card" style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                    👨‍✈️
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: '#fff' }}>Driver: Ramesh Patil (ALS EMS)</div>
                    <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>Vehicle: <strong>MH-31 AB 1234</strong> • Rating: 4.9 ★</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      navigator.clipboard.writeText('+91 98230 45678')
                      setSmsToast('📋 Driver phone +91 98230 45678 copied!')
                      setTimeout(() => setSmsToast(null), 3000)
                    }}
                  >
                    📋 Copy Driver Phone
                  </button>
                  <a href="tel:+919823045678" className="btn btn-primary btn-sm">
                    📞 Call Driver
                  </a>
                </div>
              </div>

              {/* Live Map */}
              <div className="sos-map-container" ref={setMapContainer} />

              {/* Progress & Live Telemetry */}
              <div style={{ marginTop: 16 }}>
                <div className="flex justify-between" style={{ fontSize: '0.82rem', marginBottom: 6 }}>
                  <span style={{ color: '#94a3b8' }}>Progress to {reservationData.destination.split(',')[0]}</span>
                  <span style={{ fontWeight: 800, color: '#fff' }}>{trackingProgress}% Delivered</span>
                </div>
                <div className="progress-bar" style={{ height: 8 }}>
                  <div className="progress-fill" style={{ width: `${trackingProgress}%`, background: 'linear-gradient(90deg, #ef4444, #f59e0b)' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginTop: 14 }}>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 8 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>⏱️ ETA Remaining</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f59e0b' }}>
                    {Math.max(0, Math.round((1 - trackingProgress / 100) * (reservationData.distanceKm * 3.5)))} mins
                  </div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 8 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>🚗 Road Speed</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>{trackingSpeed} km/h</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 8 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>📍 Distance Left</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8' }}>
                    {((1 - trackingProgress / 100) * reservationData.distanceKm).toFixed(2)} km
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4b: DRONE LIVE TRACKING ── */}
        {step === 'tracking_drone' && reservationData && (
          <div className="animate-fade-in">
            <div className="glass-card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>🚁</span> Autonomous Drone Airborne &amp; En Route
                  </h2>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Corridor ID: <code style={{ color: '#06b6d4' }}>{reservationData.resId}</code> • 60 km/h Aerial Transit
                  </div>
                </div>
                <span className="badge badge-green" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                  🟢 DGCA Green Airspace
                </span>
              </div>

              {/* Live Map */}
              <div className="sos-map-container" ref={setMapContainer} />

              {/* Progress & Live Telemetry */}
              <div style={{ marginTop: 16 }}>
                <div className="flex justify-between" style={{ fontSize: '0.82rem', marginBottom: 6 }}>
                  <span style={{ color: '#94a3b8' }}>Flight Progress to {reservationData.destination.split(',')[0]}</span>
                  <span style={{ fontWeight: 800, color: '#06b6d4' }}>{trackingProgress}% Complete</span>
                </div>
                <div className="progress-bar" style={{ height: 8 }}>
                  <div className="progress-fill" style={{ width: `${trackingProgress}%`, background: 'linear-gradient(90deg, #0284c7, #06b6d4)' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginTop: 14 }}>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 8 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>⏱️ Flight ETA</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#06b6d4' }}>
                    {Math.max(0, Math.round((1 - trackingProgress / 100) * (reservationData.distanceKm * 1.0)))} mins
                  </div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 8 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>🚀 Velocity</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>{trackingSpeed} km/h</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 8 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>📐 Altitude AGL</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>120 m</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 8 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>❄️ Vault Temp</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#22c55e' }}>3.8°C ✅</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 5: FINAL DELIVERY CONFIRMATION ── */}
        {step === 'delivery_confirmed' && deliveryReceipt && (
          <div className="animate-fade-in">
            <div className="glass-card sos-delivery-card" style={{ marginBottom: 20 }}>
              <div style={{ fontSize: '4rem', marginBottom: 8 }}>🎉</div>
              <h2 style={{ fontWeight: 900, fontSize: '2rem', color: '#fff', marginBottom: 6 }}>
                Blood Delivered Successfully!
              </h2>
              <p style={{ color: '#00e676', fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
                Package safely handed over at hospital trauma transfusion desk.
              </p>
            </div>

            <div className="glass-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 16, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Official Delivery Receipt</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#38bdf8', fontFamily: 'monospace' }}>{deliveryReceipt.resId}</div>
                </div>
                <span className="badge badge-green" style={{ fontSize: '0.82rem', padding: '6px 14px' }}>
                  ✅ TRANSIT COMPLETE
                </span>
              </div>

              <div className="sos-receipt-box">
                <div className="sos-receipt-row">
                  <span style={{ color: 'var(--color-text-muted)' }}>Blood Group &amp; Units:</span>
                  <span style={{ fontWeight: 900, color: '#ef4444' }}>{deliveryReceipt.bloodGroup} ({deliveryReceipt.units} Units)</span>
                </div>
                <div className="sos-receipt-row">
                  <span style={{ color: 'var(--color-text-muted)' }}>Source Facility:</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{deliveryReceipt.bankName}</span>
                </div>
                <div className="sos-receipt-row">
                  <span style={{ color: 'var(--color-text-muted)' }}>Delivery Destination:</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{deliveryReceipt.destination}</span>
                </div>
                <div className="sos-receipt-row">
                  <span style={{ color: 'var(--color-text-muted)' }}>Transport Mode:</span>
                  <span style={{ color: deliveryReceipt.transportMethod === 'via_drone' ? '#06b6d4' : '#f59e0b', fontWeight: 800 }}>
                    {deliveryReceipt.transportMethod === 'via_drone' ? '⚡ Autonomous Medical Drone (via_drone)' : '🚑 Advanced Life Support Ambulance (via_ambulance)'}
                  </span>
                </div>
                <div className="sos-receipt-row">
                  <span style={{ color: 'var(--color-text-muted)' }}>Dispatch Time:</span>
                  <span style={{ color: '#cbd5e1' }}>{deliveryReceipt.dispatchTime}</span>
                </div>
                <div className="sos-receipt-row">
                  <span style={{ color: 'var(--color-text-muted)' }}>Delivery Timestamp:</span>
                  <span style={{ color: '#22c55e', fontWeight: 700 }}>{deliveryReceipt.deliveryTime} (Today)</span>
                </div>
                <div className="sos-receipt-row">
                  <span style={{ color: 'var(--color-text-muted)' }}>Total Transit Time:</span>
                  <span style={{ fontWeight: 800, color: '#fff' }}>{deliveryReceipt.duration}</span>
                </div>
              </div>

              {/* Journey Tracker Tag */}
              <div style={{ background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.25)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: '0.8rem', color: '#e0f2fe' }}>
                📍 <strong>Blood Journey Tracker Status:</strong> Stage 3 [In Transit] marked as <strong>COMPLETED</strong> ({deliveryReceipt.transportMethod}). Transfusion verified by medical superintendent.
              </div>

              <div className="flex gap-md">
                <button
                  className="btn btn-primary w-full"
                  onClick={() => navigate('/grid')}
                  style={{ padding: '14px', fontSize: '1rem', fontWeight: 800 }}
                >
                  🏠 Return to LifeStream Grid
                </button>
                <button
                  className="btn btn-secondary w-full"
                  onClick={() => {
                    setStep('form')
                    setReservationData(null)
                    setDeliveryReceipt(null)
                  }}
                  style={{ padding: '14px', fontSize: '1rem', fontWeight: 700 }}
                >
                  Submit Another SOS
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL: DONOR CONTACT POPOVER ── */}
      {donorContactModal && (
        <div
          className="modal-backdrop"
          onClick={() => setDonorContactModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16
          }}
        >
          <div
            className="modal-box"
            onClick={e => e.stopPropagation()}
            style={{
              background: '#1e293b',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 16,
              maxWidth: 420,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 25px rgba(0,0,0,0.5)',
              position: 'relative'
            }}
          >
            <button
              onClick={() => setDonorContactModal(null)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '50%',
                width: 28,
                height: 28,
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 700
              }}
            >
              ✕
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(41,182,246,0.2)', border: '1px solid rgba(41,182,246,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                🩸
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase' }}>Verified Volunteer Donor</div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{donorContactModal.name}</h3>
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 16px 0' }}>
              📍 Located near {donorContactModal.locality} ({donorContactModal.distance} away) • Eligible for immediate donation.
            </p>

            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 14, textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Direct Donor Phone</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', fontFamily: 'monospace', marginTop: 4 }}>{donorContactModal.phone}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <button
                className="btn btn-secondary w-full"
                onClick={() => {
                  navigator.clipboard.writeText(donorContactModal.phone)
                  setCopiedPhone(true)
                  setTimeout(() => setCopiedPhone(false), 2500)
                }}
              >
                {copiedPhone ? '✅ Copied!' : '📋 Copy Number'}
              </button>
              <a href={`tel:${donorContactModal.phone.replace(/[^0-9+]/g, '')}`} className="btn btn-primary w-full" style={{ textDecoration: 'none', textAlign: 'center' }}>
                📞 Call Donor
              </a>
            </div>

            <button
              className="btn w-full"
              onClick={() => handleSendReminderSMS(donorContactModal.name)}
              style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', color: '#38bdf8', fontWeight: 700, padding: '10px' }}
            >
              📨 Send Reminder SMS
            </button>
          </div>
        </div>
      )}

      {/* ── TOAST MESSAGE ── */}
      {smsToast && (
        <div className="sos-toast">
          <span>{smsToast}</span>
        </div>
      )}
    </div>
  )
}
