/**
 * DroneTransport.jsx — Fast Drone Transport Live Tracking Page
 *
 * ⚠️  SIMULATED DEMO FEATURE
 * This component contains a fully client-side simulation of drone flight.
 * No real drone hardware, no real GPS, no real logistics API is involved.
 * All position data is computed by timer-based linear interpolation between
 * two fixed coordinates (source blood bank → destination hospital).
 *
 * Real-world deployment would require:
 *  - Integration with licensed drone logistics partners (e.g., Skye Air, Throttle Aerospace)
 *  - DGCA (Directorate General of Civil Aviation) Remote Pilot Certificate & BVLOS waiver
 *  - Live telemetry API from drone OBC / flight controller
 *
 * For the hackathon demo this is intentionally realistic-looking while being
 * completely client-side. The label "⚠️ SIMULATED DEMO" is shown in the UI.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { NAGPUR_BLOOD_BANKS, NAGPUR_HOSPITALS } from '../data/nagpurData'
import './DroneTransport.css'

// ── Simulated Flight Constants (SIMULATED — not real physics) ──
const DRONE_SPEED_KMH = 62            // Simulated cruising speed
const DRONE_ALTITUDE_M = 120          // Cosmetic altitude (fixed)
const POSITION_UPDATE_MS = 1500       // How often to move the drone marker
const GROUND_SPEED_KMH = 22           // Average city ground transport speed for comparison

// ── Google Maps API Key (same key used in NagpurLifeStreamGrid) ──
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBHiUmVRMd_mJioAiHvijqx93Fm9d83P4g'

// ── Status State Machine ──
const FLIGHT_STATUSES = [
  { key: 'preparing',   label: 'Preparing for Launch', icon: '🔧', threshold: 0 },
  { key: 'inflight',    label: 'In Flight',            icon: '🚁', threshold: 5 },
  { key: 'approaching', label: 'Approaching Destination', icon: '📍', threshold: 80 },
  { key: 'delivered',   label: 'Delivered',            icon: '✅', threshold: 100 },
]

// ── Haversine distance (km) between two lat/lng points ──
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Linear interpolation between two lat/lng points ──
function interpolateLatLng(lat1, lng1, lat2, lng2, fraction) {
  return {
    lat: lat1 + (lat2 - lat1) * fraction,
    lng: lng1 + (lng2 - lng1) * fraction,
  }
}

// ── Drone SVG Icon for Google Maps marker ──
const DRONE_SVG = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
  <circle cx="20" cy="20" r="18" fill="#0e7490" stroke="#fff" stroke-width="2"/>
  <circle cx="20" cy="20" r="8" fill="#06b6d4"/>
  <rect x="4" y="18" width="9" height="4" rx="2" fill="#fff" opacity="0.9"/>
  <rect x="27" y="18" width="9" height="4" rx="2" fill="#fff" opacity="0.9"/>
  <rect x="18" y="4" width="4" height="9" rx="2" fill="#fff" opacity="0.9"/>
  <rect x="18" y="27" width="4" height="9" rx="2" fill="#fff" opacity="0.9"/>
  <circle cx="6" cy="19" r="4" fill="none" stroke="#fff" stroke-width="1.5" opacity="0.7"/>
  <circle cx="34" cy="19" r="4" fill="none" stroke="#fff" stroke-width="1.5" opacity="0.7"/>
  <circle cx="19" cy="6" r="4" fill="none" stroke="#fff" stroke-width="1.5" opacity="0.7"/>
  <circle cx="19" cy="34" r="4" fill="none" stroke="#fff" stroke-width="1.5" opacity="0.7"/>
</svg>
`)

export default function DroneTransport() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // ── Pre-fill from URL query params (from Hospital/BloodBank portal links) ──
  const prefillGroup   = searchParams.get('group')   || ''
  const prefillUnits   = searchParams.get('units')   || '2'
  const prefillFromId  = searchParams.get('fromId')  || 'Bank 01'
  const prefillToId    = searchParams.get('toId')    || 'Hosp. 03'
  const prefillReqId   = searchParams.get('requestId') || ''

  // ── Form State ──
  const [fromBankId, setFromBankId]   = useState(prefillFromId)
  const [toHospId,   setToHospId]     = useState(prefillToId)
  const [bloodGroup, setBloodGroup]   = useState(prefillGroup || 'O-')
  const [units,      setUnits]        = useState(prefillUnits)

  // ── Flight State ──
  const [launched,     setLaunched]    = useState(false)
  const [progress,     setProgress]    = useState(0)   // 0–100 SIMULATED percentage
  const [dronePos,     setDronePos]    = useState(null) // { lat, lng }
  const [startTime,    setStartTime]   = useState(null)
  const [totalFlightMs, setTotalFlightMs] = useState(0)
  const [elapsedMs,    setElapsedMs]   = useState(0)

  // ── Map State ──
  const mapContainerRef = useRef(null)
  const googleMapRef    = useRef(null)
  const droneMarkerRef  = useRef(null)
  const [mapLoaded,    setMapLoaded]   = useState(false)

  // ── Simulated live stats jitter (SIMULATED) ──
  const [speedDisplay, setSpeedDisplay] = useState(DRONE_SPEED_KMH)

  const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']

  // ── Derived: selected source/destination ──
  const sourceBank  = NAGPUR_BLOOD_BANKS.find(b => b.id === fromBankId) || NAGPUR_BLOOD_BANKS[0]
  const destHospital = NAGPUR_HOSPITALS.find(h => h.id === toHospId) || NAGPUR_HOSPITALS[0]

  // ── Calculated distances & ETAs (SIMULATED math) ──
  const distanceKm = haversineKm(
    sourceBank.lat, sourceBank.lng,
    destHospital.lat, destHospital.lng
  )
  const droneEtaMins  = Math.max(2, Math.round(distanceKm / DRONE_SPEED_KMH * 60))
  const groundEtaMins = Math.max(6, Math.round(distanceKm / GROUND_SPEED_KMH * 60))
  const timeSavedMins = Math.max(1, groundEtaMins - droneEtaMins)

  // ── Current flight status from progress ──
  const currentStatus = FLIGHT_STATUSES.reduce((acc, s) => progress >= s.threshold ? s : acc, FLIGHT_STATUSES[0])

  // ── ETA Remaining (SIMULATED — decrements in real-time) ──
  const etaRemainingMs = Math.max(0, totalFlightMs - elapsedMs)
  const etaRemainingSecs = Math.ceil(etaRemainingMs / 1000)
  const etaMins = Math.floor(etaRemainingSecs / 60)
  const etaSecs = etaRemainingSecs % 60
  const etaDisplay = progress >= 100 ? 'Delivered' :
    etaMins > 0 ? `${etaMins}m ${etaSecs}s` : `${etaSecs}s`

  // ── Distance Remaining (SIMULATED — calculated from current interpolated position) ──
  const distRemKm = progress >= 100 ? 0 :
    haversineKm(
      dronePos?.lat ?? sourceBank.lat,
      dronePos?.lng ?? sourceBank.lng,
      destHospital.lat,
      destHospital.lng
    )

  // ── Initialize Map (Leaflet primary for guaranteed, instant, zero-fail tile rendering) ──
  const mapInstanceRef = useRef(null)
  const mapContainerCallbackRef = useRef(null)

  const setupMapOnElement = useCallback((element) => {
    if (!element) return

    // Clean up any old map instance
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove()
      } catch (e) {
        // ignore
      }
      mapInstanceRef.current = null
    }

    const initLeafletInstance = () => {
      if (!window.L || !element) return
      const L = window.L

      const centerLat = (sourceBank.lat + destHospital.lat) / 2
      const centerLng = (sourceBank.lng + destHospital.lng) / 2

      const map = L.map(element, {
        zoomControl: true,
        attributionControl: false,
      }).setView([centerLat, centerLng], 14)

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c']
      }).addTo(map)

      // Attribution
      L.control.attribution({ prefix: false, position: 'bottomright' })
        .addAttribution('© OpenStreetMap')
        .addTo(map)

      // ── Source Blood Bank Marker (Blue) ──
      const bankIcon = L.divIcon({
        html: `
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); width: 34px; height: 34px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 4px 14px rgba(37,99,235,0.55); display: flex; align-items: center; justify-content: center; font-size: 17px; color: #fff; cursor: pointer;">
            🏦
          </div>
        `,
        className: '',
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      })
      L.marker([sourceBank.lat, sourceBank.lng], { icon: bankIcon })
        .bindPopup(`<b>🏦 ${sourceBank.name}</b><br><span style="font-size:0.8rem;color:#64748b">Source Blood Bank (${fromBankId})</span>`)
        .addTo(map)

      // ── Destination Hospital Marker (Red) ──
      const hospIcon = L.divIcon({
        html: `
          <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); width: 34px; height: 34px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 4px 14px rgba(220,38,38,0.55); display: flex; align-items: center; justify-content: center; font-size: 17px; color: #fff; cursor: pointer;">
            🏥
          </div>
        `,
        className: '',
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      })
      L.marker([destHospital.lat, destHospital.lng], { icon: hospIcon })
        .bindPopup(`<b>🏥 ${destHospital.name}</b><br><span style="font-size:0.8rem;color:#64748b">Destination Emergency Node (${toHospId})</span>`)
        .addTo(map)

      // ── Dashed Flight Path (Cyan Straight Line — Drones fly point-to-point) ──
      L.polyline(
        [[sourceBank.lat, sourceBank.lng], [destHospital.lat, destHospital.lng]],
        { color: '#06b6d4', weight: 4, dashArray: '10, 8', opacity: 0.95 }
      ).addTo(map)

      // Compute initial or interpolated drone position
      const initialFraction = launched ? Math.min(1, Math.max(0, progress / 100)) : 0
      const initialPos = interpolateLatLng(
        sourceBank.lat, sourceBank.lng,
        destHospital.lat, destHospital.lng,
        initialFraction
      )

      // ── Drone Marker (Moving Animated Icon with Cyan Beacon) ──
      const droneIcon = L.divIcon({
        html: `
          <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; inset: 2px; background: rgba(6, 182, 212, 0.4); border-radius: 50%; animation: pulseCyan 1.5s ease-in-out infinite;"></div>
            <div style="width: 36px; height: 36px; background: #0f172a; border: 2.5px solid #06b6d4; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 0 16px rgba(6, 182, 212, 0.85); z-index: 2;">
              🚁
            </div>
          </div>
        `,
        className: '',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      })

      const leafletDroneMarker = L.marker([initialPos.lat, initialPos.lng], {
        icon: droneIcon,
        zIndexOffset: 1000
      })
        .bindPopup('<b>⚡ BloodConnect Autonomous Drone MED-X1</b><br>Altitude: 120m • Speed: ~62 km/h')
        .addTo(map)

      // Fit map bounds to show both points with comfortable padding
      const bounds = L.latLngBounds(
        [sourceBank.lat, sourceBank.lng],
        [destHospital.lat, destHospital.lng]
      )
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })

      // Invalidate size after layout stabilization
      setTimeout(() => {
        if (map) map.invalidateSize()
      }, 200)

      mapInstanceRef.current = map
      droneMarkerRef.current = leafletDroneMarker
      setMapLoaded(true)
      setDronePos(initialPos)
    }

    if (window.L) {
      initLeafletInstance()
    } else {
      // Load Leaflet stylesheet
      if (!document.getElementById('leaflet-css-drone')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css-drone'
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }

      // Load Leaflet script
      const script = document.createElement('script')
      script.id = 'leaflet-js-drone'
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = () => {
        initLeafletInstance()
      }
      document.head.appendChild(script)
    }
  }, [sourceBank, destHospital, fromBankId, toHospId, launched, progress])

  // Attach callback ref for map container
  const setMapContainer = useCallback((node) => {
    mapContainerCallbackRef.current = node
    if (node) {
      setupMapOnElement(node)
    }
  }, [setupMapOnElement])

  // Re-run setup when coordinates or launch state change
  useEffect(() => {
    if (mapContainerCallbackRef.current) {
      setupMapOnElement(mapContainerCallbackRef.current)
    }
  }, [launched, fromBankId, toHospId, setupMapOnElement])

  // ── Launch handler ──
  const handleLaunch = useCallback(() => {
    // SIMULATED: total flight time calculated from distance ÷ simulated speed
    const flightMs = (distanceKm / DRONE_SPEED_KMH) * 3600 * 1000
    setTotalFlightMs(flightMs)
    setStartTime(Date.now())
    setLaunched(true)
    setProgress(0)
    setElapsedMs(0)
  }, [distanceKm])

  // ── SIMULATION TICK: update drone position every POSITION_UPDATE_MS ──
  // This is the core animation loop — keeps map marker in 100% sync with stats panels
  useEffect(() => {
    if (!launched || !startTime || progress >= 100) return

    const tick = setInterval(() => {
      const now = Date.now()
      const elapsed = now - startTime
      setElapsedMs(elapsed)

      const fraction = Math.min(1, elapsed / totalFlightMs)
      const pct = Math.round(fraction * 100)

      // Compute current simulated drone position (SIMULATED linear interpolation)
      const pos = interpolateLatLng(
        sourceBank.lat, sourceBank.lng,
        destHospital.lat, destHospital.lng,
        fraction
      )
      setDronePos(pos)
      setProgress(pct)

      // Jitter speed display for realism (SIMULATED ±3 km/h)
      const jitter = Math.round((Math.random() - 0.5) * 6)
      setSpeedDisplay(DRONE_SPEED_KMH + jitter)

      // Update marker position on map smoothly
      if (droneMarkerRef.current && droneMarkerRef.current.setLatLng) {
        droneMarkerRef.current.setLatLng([pos.lat, pos.lng])
      }

      if (fraction >= 1) {
        clearInterval(tick)
        setProgress(100)
        if (droneMarkerRef.current && droneMarkerRef.current.setLatLng) {
          droneMarkerRef.current.setLatLng([destHospital.lat, destHospital.lng])
        }
      }
    }, POSITION_UPDATE_MS)

    return () => clearInterval(tick)
  }, [launched, startTime, totalFlightMs, sourceBank, destHospital, progress])

  // ── Format distance for display ──
  const fmtDist = (km) => km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(2)} km`

  return (
    <div className="drone-page">
      {/* ── Top Header Bar ── */}
      <header className="drone-topbar">
        <div className="drone-topbar-brand">
          <div className="drone-brand-icon">⚡</div>
          <div>
            <div className="drone-brand-title">Fast Drone Transport</div>
            <div className="drone-brand-sub">BloodConnect • Live Tracking</div>
          </div>
        </div>

        <div className="drone-topbar-badges">
          <span className="drone-sim-badge">⚠️ SIMULATED DEMO</span>
          <button className="drone-back-btn" onClick={() => navigate(-1)}>
            ← Back to Portal
          </button>
        </div>
      </header>

      <div className="drone-content">
        {/* ── Setup Section (shown before launch OR always visible as editable fields) ── */}
        {!launched ? (
          <div className="drone-setup-card">
            <div className="drone-setup-header">
              <span className="drone-setup-icon">🚁</span>
              <h1 className="drone-setup-title">⚡ Fast Drone Transport</h1>
              <p className="drone-setup-subtitle">
                Dispatch blood via autonomous drone for critical/high-urgency cases.
                <br />
                <strong>Bypasses ground traffic</strong> — point-to-point aerial delivery.
              </p>
            </div>

            <div className="drone-form-grid">
              <div className="drone-form-group">
                <label className="drone-form-label">📦 From (Blood Bank)</label>
                <select
                  className="drone-form-select"
                  value={fromBankId}
                  onChange={e => setFromBankId(e.target.value)}
                >
                  {NAGPUR_BLOOD_BANKS.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="drone-form-group">
                <label className="drone-form-label">🏥 To (Hospital)</label>
                <select
                  className="drone-form-select"
                  value={toHospId}
                  onChange={e => setToHospId(e.target.value)}
                >
                  {NAGPUR_HOSPITALS.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div className="drone-form-group">
                <label className="drone-form-label">🩸 Blood Group</label>
                <select
                  className="drone-form-select"
                  value={bloodGroup}
                  onChange={e => setBloodGroup(e.target.value)}
                >
                  {BLOOD_GROUPS.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div className="drone-form-group">
                <label className="drone-form-label">📊 Units</label>
                <input
                  type="number"
                  className="drone-form-input"
                  min="1"
                  max="20"
                  value={units}
                  onChange={e => setUnits(e.target.value)}
                />
              </div>
            </div>

            {/* Preview route info */}
            <div style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: 12,
              padding: '14px 18px',
              marginBottom: 20,
              fontSize: '0.88rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <span style={{ color: '#0369a1' }}>
                  📍 <strong>{sourceBank.name}</strong> → <strong>{destHospital.name}</strong>
                </span>
                <span style={{ color: '#0369a1', fontWeight: 700 }}>
                  {fmtDist(distanceKm)} straight-line
                </span>
              </div>
              <div style={{ display: 'flex', gap: 20, marginTop: 8, flexWrap: 'wrap' }}>
                <span style={{ color: '#0891b2', fontWeight: 700 }}>
                  ⚡ Drone ETA: ~{droneEtaMins} min
                </span>
                <span style={{ color: '#94a3b8', textDecoration: 'line-through' }}>
                  🚗 Ground: ~{groundEtaMins} min
                </span>
                <span style={{ color: '#059669', fontWeight: 700 }}>
                  🕐 Save ~{timeSavedMins} min
                </span>
              </div>
            </div>

            {prefillReqId && (
              <div style={{
                background: 'rgba(220,38,38,0.07)',
                border: '1px solid rgba(220,38,38,0.25)',
                borderRadius: 10,
                padding: '10px 14px',
                marginBottom: 16,
                fontSize: '0.8rem',
                color: '#7f1d1d',
                fontWeight: 600,
              }}>
                🔗 Linked to Emergency Request: <code style={{ color: '#dc2626' }}>#{prefillReqId}</code>
              </div>
            )}

            <button id="launch-drone-btn" className="drone-launch-btn" onClick={handleLaunch}>
              <span style={{ fontSize: '1.2rem' }}>🚁</span>
              Launch Drone Dispatch
            </button>

            {/* Map preview — shown below setup even before launch */}
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                📍 Route Preview
              </div>
              <div
                ref={setMapContainer}
                className="drone-map-element"
                style={{ height: 300, borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}
              />
            </div>
          </div>
        ) : (
          /* ── Live Tracking Layout (shown after launch) ── */
          <div className="drone-tracking-layout">
            {/* Left: Map */}
            <div className="drone-map-section">
              <div className="drone-map-header">
                <div className="drone-map-title">
                  <span className="drone-live-pulse" />
                  Live Drone Telemetry — Satellite / Street Map
                  <span style={{ opacity: 0.6, fontSize: '0.72rem' }}>(Simulated)</span>
                </div>
                <div className="drone-map-badges">
                  <span className="drone-map-badge">🔵 Bank</span>
                  <span className="drone-map-badge" style={{ background: 'rgba(220,38,38,0.12)', borderColor: 'rgba(220,38,38,0.35)', color: '#dc2626' }}>🔴 Hospital</span>
                  <span className="drone-map-badge" style={{ background: 'rgba(6,182,212,0.12)', borderColor: 'rgba(6,182,212,0.35)', color: '#06b6d4' }}>- - Drone Path</span>
                </div>
              </div>

              <div className="drone-map-container">
                <div ref={setMapContainer} className="drone-map-element" />

                {/* Route overlay callout */}
                <div className="drone-route-callout">
                  <div className="drone-route-callout-tag">⚡ Active Drone Route</div>
                  <div className="drone-route-callout-text">
                    {sourceBank.name} → {destHospital.name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>
                    {fmtDist(distanceKm)} straight-line • Altitude: {DRONE_ALTITUDE_M}m (simulated)
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Stats Sidebar */}
            <div className="drone-stats-sidebar">
              {/* Status Card */}
              <div className="drone-status-card">
                <div className="drone-status-label">Current Status</div>
                <div className={`drone-status-chip ${currentStatus.key}`}>
                  <span className="drone-status-dot" />
                  {currentStatus.icon} {currentStatus.label}
                </div>
                <div className="drone-progress-track">
                  <div className="drone-progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <div className="drone-progress-label">{progress}% complete</div>
              </div>

              {/* Live Stats Grid */}
              <div className="drone-stats-grid">
                <div className="drone-stats-title">Live Telemetry (Simulated)</div>
                <div className="drone-stats-items">
                  <div className="drone-stat-item">
                    <div className="drone-stat-icon">⏱️</div>
                    <div className={`drone-stat-value drone-eta-value`}>{etaDisplay}</div>
                    <div className="drone-stat-label">ETA Remaining</div>
                  </div>
                  <div className="drone-stat-item">
                    <div className="drone-stat-icon">📏</div>
                    <div className={`drone-stat-value drone-dist-value`}>{fmtDist(distRemKm)}</div>
                    <div className="drone-stat-label">Distance Left</div>
                  </div>
                  <div className="drone-stat-item">
                    <div className="drone-stat-icon">💨</div>
                    <div className="drone-stat-value">{speedDisplay}<span style={{ fontSize: '0.65rem', fontWeight: 500, marginLeft: 2 }}>km/h</span></div>
                    <div className="drone-stat-label">Speed</div>
                  </div>
                  <div className="drone-stat-item">
                    <div className="drone-stat-icon">🏔️</div>
                    <div className="drone-stat-value">{DRONE_ALTITUDE_M}<span style={{ fontSize: '0.65rem', fontWeight: 500, marginLeft: 2 }}>m</span></div>
                    <div className="drone-stat-label">Altitude</div>
                  </div>
                </div>
              </div>

              {/* Payload Info */}
              <div className="drone-payload-card">
                <div className="drone-payload-title">Payload Information</div>
                <div className="drone-payload-row">
                  <span className="drone-payload-key">Blood Group</span>
                  <span className="drone-blood-badge">{bloodGroup}</span>
                </div>
                <div className="drone-payload-row">
                  <span className="drone-payload-key">Units</span>
                  <span className="drone-payload-val">{units} units</span>
                </div>
                <div className="drone-payload-row">
                  <span className="drone-payload-key">From</span>
                  <span className="drone-payload-val" style={{ fontSize: '0.78rem', textAlign: 'right', maxWidth: '60%' }}>
                    {sourceBank.name}
                  </span>
                </div>
                <div className="drone-payload-row">
                  <span className="drone-payload-key">To</span>
                  <span className="drone-payload-val" style={{ fontSize: '0.78rem', textAlign: 'right', maxWidth: '60%' }}>
                    {destHospital.name}
                  </span>
                </div>
                {prefillReqId && (
                  <div className="drone-payload-row">
                    <span className="drone-payload-key">Req. ID</span>
                    <span className="drone-payload-val" style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#dc2626' }}>
                      #{prefillReqId.slice(0, 12)}
                    </span>
                  </div>
                )}
              </div>

              {/* ── Comparison Callout — The KEY value-prop visual ── */}
              <div className="drone-comparison-card">
                <div className="drone-comparison-title">⚡ Why Drone Transport?</div>
                <div className="drone-comparison-grid">
                  <div className="drone-compare-item">
                    <div className="drone-compare-label">🚁 Drone</div>
                    <div className={`drone-compare-time drone-time-drone`}>{droneEtaMins}</div>
                    <div className="drone-compare-unit">minutes</div>
                  </div>
                  <div className="drone-vs-divider">VS</div>
                  <div className="drone-compare-item">
                    <div className="drone-compare-label">🚗 Ground</div>
                    <div className={`drone-compare-time drone-time-ground`}>{groundEtaMins}</div>
                    <div className="drone-compare-unit">minutes (est.)</div>
                  </div>
                </div>
                <div className="drone-time-saved-pill">
                  🕐 ~{timeSavedMins} minutes faster — bypassing traffic entirely
                </div>
              </div>

              {/* Delivered Completion Card */}
              {progress >= 100 && (
                <div className="drone-delivered-card">
                  <div className="drone-delivered-icon">✅</div>
                  <div className="drone-delivered-title">Blood Delivered!</div>
                  <div className="drone-delivered-sub">
                    {bloodGroup} × {units} units successfully delivered to {destHospital.name}
                  </div>
                  <div className="drone-delivered-stats">
                    <div className="drone-delivered-stat">
                      <div className="drone-delivered-stat-val">{droneEtaMins}m</div>
                      <div className="drone-delivered-stat-lbl">Drone Time</div>
                    </div>
                    <div className="drone-delivered-stat">
                      <div className="drone-delivered-stat-val" style={{ color: '#34d399' }}>~{timeSavedMins}m</div>
                      <div className="drone-delivered-stat-lbl">Time Saved</div>
                    </div>
                  </div>
                  <div className="drone-delivered-badge">
                    <span>🚁</span>
                    Delivered via Fast Drone Transport
                  </div>
                  <button className="drone-return-btn" onClick={() => navigate(-1)}>
                    ← Return to Portal
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Disclaimer / About Section ── */}
        <div className="drone-disclaimer">
          <div className="drone-disclaimer-header">
            <span>⚠️</span>
            <span>Simulated Demo Feature — About This Prototype</span>
          </div>
          <p className="drone-disclaimer-text">
            <strong>Fast Drone Transport</strong> is a prototype / demonstration feature built for the BloodConnect hackathon.
            The live tracking animation is a client-side simulation using timer-based position interpolation between two fixed GPS coordinates —
            no actual drone hardware, GPS receiver, or logistics API is involved.
            Drone speed, altitude, and ETA values displayed are illustrative.
            <br /><br />
            Real-world deployment of autonomous blood delivery drones would require:
            (1) Integration with licensed drone logistics partners (e.g., Throttle Aerospace, Skye Air Mobility);
            (2) Compliance with <strong>DGCA (Directorate General of Civil Aviation)</strong> regulations including Remote Pilot Certificate,
            BVLOS (Beyond Visual Line of Sight) operational waiver, and airspace deconfliction;
            (3) Certified medical-grade cold-chain payload pods with FAA/DGCA-approved battery safety ratings.
          </p>
        </div>
      </div>
    </div>
  )
}
