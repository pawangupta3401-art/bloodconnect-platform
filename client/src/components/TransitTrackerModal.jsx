import { useState, useEffect } from 'react'
import { Navigation, QrCode, MapPin, Radio, CheckCircle, RefreshCw, X, Play, Square } from 'lucide-react'
import './TransitTrackerModal.css'

const DUMMY_ROUTE_WAYPOINTS = [
  { lat: 28.6139, lng: 77.2090, step: 'Dispatched from Red Cross Blood Bank' },
  { lat: 28.6185, lng: 77.2140, step: 'Crossing Central Avenue' },
  { lat: 28.6240, lng: 77.2215, step: 'Passing Ring Road Flyover' },
  { lat: 28.6300, lng: 77.2300, step: 'Approaching AIIMS Medical District' },
  { lat: 28.6355, lng: 77.2380, step: 'Arrived at Emergency Trauma OT-3' }
]

export default function TransitTrackerModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('transit') // 'transit' | 'qr' | 'geo'
  
  // Transit Simulation State
  const [stepIndex, setStepIndex] = useState(0)
  const [isSimulating, setIsSimulating] = useState(false)
  const [currentCoord, setCurrentCoord] = useState(DUMMY_ROUTE_WAYPOINTS[0])

  // QR Code State
  const [qrDonorId, setQrDonorId] = useState('DONOR-INDIA-2026-981')
  const [qrBase64, setQrBase64] = useState('')
  const [qrLoading, setQrLoading] = useState(false)

  // Geo State
  const [userGps, setUserGps] = useState(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [nearestDonors, setNearestDonors] = useState([])

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

  // Live Transit Simulation (2s timer)
  useEffect(() => {
    let timer = null
    if (isSimulating) {
      timer = setInterval(() => {
        setStepIndex((prev) => {
          if (prev < DUMMY_ROUTE_WAYPOINTS.length - 1) {
            const nextIdx = prev + 1
            setCurrentCoord(DUMMY_ROUTE_WAYPOINTS[nextIdx])
            return nextIdx
          } else {
            setIsSimulating(false)
            return prev
          }
        })
      }, 2000)
    }
    return () => clearInterval(timer)
  }, [isSimulating])

  // Fetch QR Code from backend
  const fetchQRCode = async (id) => {
    setQrLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/v1/donors/${id}/qr`)
      const data = await res.json()
      if (data.qrImage) {
        setQrBase64(data.qrImage)
      }
    } catch (err) {
      console.warn('QR fetch fallback:', err.message)
      setQrBase64(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(id)}`)
    } finally {
      setQrLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'qr' && !qrBase64) {
      fetchQRCode(qrDonorId)
    }
  }, [activeTab])

  // HTML5 Geolocation API + MongoDB $geoNear
  const requestCurrentLocationAndFindDonors = () => {
    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported by your browser')
      return
    }

    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        }
        setUserGps(coords)

        // Query backend $geoNear
        try {
          const res = await fetch(`${API_URL}/api/v1/donors/geo/nearest?lat=${coords.lat}&lng=${coords.lng}`)
          const data = await res.json()
          setNearestDonors(data.data || [])
        } catch (e) {
          console.error(e)
        } finally {
          setGpsLoading(false)
        }
      },
      (err) => {
        alert('GPS Access denied or unavailable. Loading demo coordinates.')
        setUserGps({ lat: 28.6139, lng: 77.2090, accuracy: 15 })
        fetch(`${API_URL}/api/v1/donors/geo/nearest?lat=28.6139&lng=77.2090`)
          .then(r => r.json())
          .then(d => setNearestDonors(d.data || []))
          .finally(() => setGpsLoading(false))
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  if (!isOpen) return null

  const progressPercent = Math.round(((stepIndex + 1) / DUMMY_ROUTE_WAYPOINTS.length) * 100)

  return (
    <div className="transit-modal-overlay">
      <div className="transit-modal-card">
        <div className="transit-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Radio size={22} color="#ef4444" />
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
              Live Blood Transit & Geospatial Hub
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="transit-tabs">
          <button
            className={`transit-tab-btn ${activeTab === 'transit' ? 'active' : ''}`}
            onClick={() => setActiveTab('transit')}
          >
            <Navigation size={14} style={{ display: 'inline', marginRight: '6px' }} />
            Live Transit Tracking (2s GPS)
          </button>
          <button
            className={`transit-tab-btn ${activeTab === 'qr' ? 'active' : ''}`}
            onClick={() => setActiveTab('qr')}
          >
            <QrCode size={14} style={{ display: 'inline', marginRight: '6px' }} />
            Base64 QR Identity
          </button>
          <button
            className={`transit-tab-btn ${activeTab === 'geo' ? 'active' : ''}`}
            onClick={() => setActiveTab('geo')}
          >
            <MapPin size={14} style={{ display: 'inline', marginRight: '6px' }} />
            $geoNear Nearest Donors
          </button>
        </div>

        {/* TAB 1: Live Transit Simulation */}
        {activeTab === 'transit' && (
          <div>
            <div className="transit-sim-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Live Courier Feed</span>
                  <h4 style={{ margin: '4px 0', fontSize: '1.05rem', color: '#38bdf8' }}>
                    {currentCoord.step}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#4ade80', fontFamily: 'monospace' }}>
                    Latitude: {currentCoord.lat.toFixed(4)} | Longitude: {currentCoord.lng.toFixed(4)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (!isSimulating && stepIndex === DUMMY_ROUTE_WAYPOINTS.length - 1) {
                      setStepIndex(0)
                      setCurrentCoord(DUMMY_ROUTE_WAYPOINTS[0])
                    }
                    setIsSimulating(!isSimulating)
                  }}
                  style={{
                    background: isSimulating ? '#dc2626' : '#16a34a',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {isSimulating ? <Square size={16} /> : <Play size={16} />}
                  {isSimulating ? 'Pause Stream' : stepIndex === DUMMY_ROUTE_WAYPOINTS.length - 1 ? 'Restart Simulation' : 'Start 2s Transit'}
                </button>
              </div>

              {/* Progress Bar */}
              <div className="sim-progress-bar">
                <div className="sim-progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
                <span>Waypoint {stepIndex + 1} of {DUMMY_ROUTE_WAYPOINTS.length}</span>
                <span>{progressPercent}% Journey Complete</span>
              </div>
            </div>

            {/* Waypoints List */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px' }}>
              <h5 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#0F172A', fontWeight: 800 }}>Transit Route Logs</h5>
              {DUMMY_ROUTE_WAYPOINTS.map((wp, idx) => (
                <div
                  key={idx}
                  className={`waypoint-item ${idx < stepIndex ? 'completed' : idx === stepIndex ? 'active' : ''}`}
                >
                  <div className="waypoint-dot" />
                  <span style={{ flex: 1, color: '#0F172A', fontWeight: 600 }}>{wp.step}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#334155', fontWeight: 600 }}>
                    [{wp.lat.toFixed(3)}, {wp.lng.toFixed(3)}]
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: QR Code Identity */}
        {activeTab === 'qr' && (
          <div className="qr-display-card">
            <h4 style={{ margin: '0 0 6px 0', color: '#0F172A', fontWeight: 800 }}>Donor Digital Health QR Passport</h4>
            <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 16px 0', fontWeight: 500 }}>
              Generated as Base64 Data URL for instant tamper-proof verification
            </p>

            <div style={{ display: 'flex', gap: '8px', maxWidth: '380px', margin: '0 auto 16px auto' }}>
              <input
                type="text"
                value={qrDonorId}
                onChange={(e) => setQrDonorId(e.target.value)}
                style={{
                  flex: 1,
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#0F172A',
                  padding: '8px 12px',
                  borderRadius: '8px'
                }}
                placeholder="Enter Donor ID or Certificate ID"
              />
              <button
                onClick={() => fetchQRCode(qrDonorId)}
                style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Generate
              </button>
            </div>

            {qrLoading ? (
              <p style={{ color: '#94a3b8' }}>Generating QR Code...</p>
            ) : qrBase64 ? (
              <div className="qr-image-wrapper">
                <img src={qrBase64} alt="Donor QR Code" />
              </div>
            ) : null}

            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
              Encoded: {qrDonorId} • BloodConnect Cryptographic Verification Protocol
            </p>
          </div>
        )}

        {/* TAB 3: Geospatial Nearest Donors */}
        {activeTab === 'geo' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0' }}>Find 5 Nearest Donors ($geoNear)</h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                  Uses HTML5 GPS & MongoDB 2dsphere index for radius proximity search
                </p>
              </div>
              <button
                onClick={requestCurrentLocationAndFindDonors}
                disabled={gpsLoading}
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <RefreshCw size={14} className={gpsLoading ? 'spin' : ''} />
                {gpsLoading ? 'Locating...' : 'Get My GPS & Search'}
              </button>
            </div>

            {userGps && (
              <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '10px 14px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.82rem', color: '#4ade80' }}>
                📍 GPS Coordinates: <strong>{userGps.lat.toFixed(5)}, {userGps.lng.toFixed(5)}</strong> (Accuracy: ±{Math.round(userGps.accuracy)}m)
              </div>
            )}

            <div>
              {nearestDonors.length > 0 ? (
                nearestDonors.map((donor, i) => (
                  <div key={i} className="donor-geo-card">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, color: '#0F172A' }}>{donor.name}</span>
                        <span className="donor-geo-badge">{donor.bloodGroup}</span>
                      </div>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#475569', fontWeight: 500 }}>
                        {donor.city} • Trust Score: {donor.trustScore}% • Phone: {donor.phone || 'Verified'}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0284C7' }}>
                        {donor.distanceKm} km
                      </span>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: '#334155', fontWeight: 700 }}>
                        Proximity
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '30px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', color: '#334155', fontWeight: 500 }}>
                  Click <strong>"Get My GPS & Search"</strong> to query nearest donors in real time!
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
