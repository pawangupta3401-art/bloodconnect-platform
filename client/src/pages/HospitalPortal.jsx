import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import { apiCall } from '../config/api'
import InventoryMap from '../components/InventoryMap'
import InventoryHeatmapMatrix from '../components/InventoryHeatmapMatrix'
import CompactMapWidget from '../components/CompactMapWidget'
import {
  LayoutDashboard, Search, FilePlus, FolderOpen, Map, AlertTriangle,
  LogOut, Droplet, CheckCircle2, Clock, Building2, Activity, Users
} from 'lucide-react'
import './Portal.css'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']

const URGENCY_CONFIG = {
  critical: { color: '#FF1744', bg: 'rgba(255,23,68,0.15)', label: '🚨 Critical', badge: 'badge-red' },
  high:     { color: '#FFB300', bg: 'rgba(255,179,0,0.15)',  label: '⚡ High',     badge: 'badge-yellow' },
  normal:   { color: '#29B6F6', bg: 'rgba(41,182,246,0.15)', label: '📋 Normal',   badge: 'badge-blue' },
}

const NAV_ITEMS = [
  { id: 'dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'search',      icon: Search,          label: 'Blood Search' },
  { id: 'request',     icon: FilePlus,        label: 'New Request' },
  { id: 'my-requests', icon: FolderOpen,      label: 'My Requests' },
  { id: 'chronic',     icon: Activity,        label: 'Chronic Care & Thalassemia' },
  { id: 'rare',        icon: Droplet,         label: 'Rare Phenotype Registry' },
  { id: 'map',         icon: Map,             label: 'Map View' },
]

const SEED_REQUESTS = [
  { id: 'ER001', group: 'O-',  units: 2, urgency: 'critical', status: 'open',      createdAt: '5 mins ago',  donorResponses: [] },
  { id: 'ER002', group: 'AB+', units: 1, urgency: 'high',     status: 'fulfilled', createdAt: '2 hours ago', donorResponses: [] },
  { id: 'ER003', group: 'B-',  units: 3, urgency: 'normal',   status: 'open',      createdAt: '1 day ago',   donorResponses: [] },
]

export default function HospitalPortal() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { socket, isConnected, emitEmergencySOS } = useSocket()

  const [activeTab, setActiveTab]         = useState('dashboard')
  const [searchGroup, setSearchGroup]     = useState('O+')
  const [searchRadius, setSearchRadius]   = useState('10')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching]         = useState(false)
  const [searched, setSearched]           = useState(false)

  const [reqForm, setReqForm]             = useState({ group: 'O-', units: '2', urgency: 'critical', notes: '' })
  const [submitting, setSubmitting]       = useState(false)
  const [reqResult, setReqResult]         = useState(null) // API match result

  const [requests, setRequests]           = useState(SEED_REQUESTS)
  const [liveToast, setLiveToast]         = useState(null)
  const [disasterSession, setDisasterSession] = useState(null)

  const hospitalName = user?.hospital || 'Apollo Hospital'
  const city         = user?.city || 'Mumbai'

  // ── Listen for disaster alerts and donor responses in real-time ──
  useEffect(() => {
    if (!socket) return

    const handleDonorResponded = (data) => {
      console.log('🩸 Live donor response in Hospital Portal:', data)
      setLiveToast({
        name: data.donorName || 'A generous donor',
        bloodGroup: data.bloodGroup || 'Matching',
        requestId: data.requestId,
        channel: data.channel || 'Socket.io',
        timestamp: new Date().toLocaleTimeString(),
      })
      setTimeout(() => setLiveToast(null), 5000)

      setRequests(prev => prev.map(req => {
        if (req.id === data.requestId || req._id === data.requestId) {
          const existing = req.donorResponses || []
          return {
            ...req,
            status: 'matched',
            donorResponses: [
              ...existing,
              {
                donorId: data.donorId,
                donorName: data.donorName || 'Verified Donor',
                bloodGroup: data.bloodGroup,
                channel: data.channel || 'In-App / WhatsApp',
                time: new Date().toLocaleTimeString(),
              },
            ],
          }
        }
        return req
      }))
    }

    const handleDisasterActivated = (data) => {
      console.log('🚨 Disaster protocol activated event received:', data)
      setDisasterSession(data)
    }

    const handleDisasterDeactivated = () => {
      setDisasterSession(null)
    }

    socket.on('donor-responded', handleDonorResponded)
    socket.on('disaster:activated', handleDisasterActivated)
    socket.on('disaster:deactivated', handleDisasterDeactivated)

    return () => {
      socket.off('donor-responded', handleDonorResponded)
      socket.off('disaster:activated', handleDisasterActivated)
      socket.off('disaster:deactivated', handleDisasterDeactivated)
    }
  }, [socket])

  // ── Blood Search → calls real API ──
  const handleSearch = useCallback(async () => {
    setSearching(true)
    setSearched(false)

    const { ok, data } = await apiCall(
      `/api/v1/inventory?bloodGroup=${searchGroup}&radius=${searchRadius}`
    )

    if (ok && data?.data) {
      setSearchResults(data.data.filter(f => f.inventory?.[searchGroup] > 0))
    } else {
      // Demo fallback
      setSearchResults([
        { id: 'NGP-07', name: 'Dr. Hedgewar Raktpedhi', type: 'blood-bank', area: 'Dharampeth', city: 'Nagpur', inventory: { [searchGroup]: 38 }, rating: 4.9, lat: 21.1428, lng: 79.0620 },
        { id: 'NGP-01', name: 'AIIMS Nagpur Blood Centre', type: 'hospital',   area: 'MIHAN',      city: 'Nagpur', inventory: { [searchGroup]: 14 }, rating: 4.9, lat: 21.0374, lng: 79.0270 },
        { id: 'NGP-02', name: 'GMCH Nagpur',               type: 'hospital',   area: 'Med. Square', city: 'Nagpur', inventory: { [searchGroup]: 45 }, rating: 4.8, lat: 21.1275, lng: 79.0963 },
      ])
    }
    setSearching(false)
    setSearched(true)
  }, [searchGroup, searchRadius])

  // ── Submit Emergency Request → calls real API → broadcasts to donors ──
  const handleSubmitRequest = useCallback(async () => {
    if (!reqForm.group || !reqForm.units) return
    setSubmitting(true)

    const payload = {
      requesterName:  hospitalName,
      requesterPhone: '+91 98765 43210',
      bloodGroup:     reqForm.group,
      unitsNeeded:    parseInt(reqForm.units) || 1,
      urgencyLevel:   reqForm.urgency,
      location:       `${hospitalName}, ${city}`,
      lat:            19.0760,
      lng:            72.8777,
      notes:          reqForm.notes,
    }

    // POST to matching engine
    const { ok, data } = await apiCall('/api/v1/requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    const newRequestId = (ok && data?.requestId) ? data.requestId : `ER-${Date.now()}`

    // Broadcast via socket for real-time donor alerts
    if (isConnected) {
      emitEmergencySOS({
        id:          newRequestId,
        bloodGroup:  reqForm.group,
        urgencyLevel: reqForm.urgency,
        unitsNeeded: parseInt(reqForm.units) || 1,
        location:    `${hospitalName}, ${city}`,
        hospitalName,
      })
    }

    // Also hit the trigger-alert endpoint so the RealTimeAlertModal fires
    await apiCall('/api/v1/requests/trigger-alert', {
      method: 'POST',
      body: JSON.stringify({
        bloodGroup:      reqForm.group,
        hospitalName,
        unitsRequired:   parseInt(reqForm.units) || 1,
        location:        `${hospitalName}, ${city}`,
        urgencyLevel:    reqForm.urgency,
        patientCondition: reqForm.notes || 'Emergency transfusion required',
      }),
    })

    // Also POST /api/v1/requests/:id/broadcast to alert eligible donors
    if (newRequestId) {
      await apiCall(`/api/v1/requests/${newRequestId}/broadcast`, {
        method: 'POST',
        body: JSON.stringify({
          bloodGroup:  reqForm.group,
          location:    `${hospitalName}, ${city}`,
          urgencyLevel: reqForm.urgency,
        }),
      }).catch(() => {})
    }

    // Build result object from API or demo fallback
    const matchResult = (ok && data) ? data : {
      demo: true,
      requestId: newRequestId,
      totalMatches: 3,
      inventorySufficient: true,
      matches: [
        { name: 'Dr. Hedgewar Raktpedhi', units: reqForm.group === 'O-' ? 38 : 14, distance: '2.1 km', type: 'blood-bank' },
        { name: 'GMCH Nagpur',            units: reqForm.group === 'O-' ? 20 : 45, distance: '3.8 km', type: 'hospital' },
      ],
    }

    setReqResult({ ...matchResult, requestId: newRequestId })

    // Add to local requests list
    const newReq = {
      id:           newRequestId,
      group:        reqForm.group,
      units:        parseInt(reqForm.units) || 1,
      urgency:      reqForm.urgency,
      status:       matchResult.inventorySufficient ? 'matched' : 'open',
      createdAt:    'Just now',
      matches:      matchResult.matches || [],
      donorResponses: [],
    }
    setRequests(prev => [newReq, ...prev])

    setSubmitting(false)
  }, [reqForm, hospitalName, city, isConnected, emitEmergencySOS])

  // ── Mark request fulfilled ──
  const markFulfilled = useCallback(async (reqId) => {
    await apiCall(`/api/v1/requests/${reqId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'fulfilled' }),
    })
    setRequests(prev => prev.map(r =>
      (r.id === reqId || r._id === reqId) ? { ...r, status: 'fulfilled' } : r
    ))
  }, [])

  const criticalCount = requests.filter(r => r.urgency === 'critical' && r.status !== 'fulfilled').length

  return (
    <div className="portal-layout">
      {/* Live Donor Response Toast */}
      {liveToast && (
        <div style={{
          position: 'fixed', top: 80, right: 24, zIndex: 99998,
          background: 'linear-gradient(135deg, #0d1f0d 0%, #052005 100%)',
          border: '1px solid rgba(0,230,118,0.5)',
          borderRadius: 12, padding: '14px 18px', maxWidth: 340, color: '#fff',
          boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
          animation: 'fadeIn 0.4s ease',
        }}>
          <div style={{ fontWeight: 700, color: '#00E676', fontSize: '0.9rem', marginBottom: 4 }}>
            🩸 Donor Responded Live!
          </div>
          <div style={{ fontSize: '0.82rem', color: '#0F172A' }}>
            <strong>{liveToast.name}</strong> ({liveToast.bloodGroup}) is available for request <code style={{ color: '#00E676' }}>{liveToast.requestId}</code>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 6 }}>{liveToast.timestamp} • WebSocket Live</div>
        </div>
      )}

      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon"><Building2 size={24} color="#ff4757" /></div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>{hospitalName}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Hospital Portal</div>
          </div>
        </div>

        <div className="sidebar-user">
          <div className="avatar">{(user?.name || 'Dr. Priya Nair').split(' ').map(n => n[0]).join('').slice(0,2)}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{user?.name || 'Dr. Priya Nair'}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Hospital Staff • {city}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                id={`hospital-nav-${item.id}`}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon size={20} />
                <span>{item.label}</span>
                {item.id === 'my-requests' && requests.filter(r => r.donorResponses?.length > 0 && r.status !== 'fulfilled').length > 0 && (
                  <span style={{ marginLeft: 'auto', background: '#00E676', color: '#000', borderRadius: 999, fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px' }}>
                    LIVE
                  </span>
                )}
              </button>
            )
          })}
          <div style={{ marginTop: 24 }} />
          <Link to="/emergency" className="nav-item" style={{ color: '#FF4D6D' }}>
            <AlertTriangle size={20} />
            <span>Emergency SOS</span>
          </Link>
          <button className="nav-item" onClick={() => { logout(); navigate('/') }}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </nav>

        {criticalCount > 0 && (
          <div className="sidebar-eligibility">
            <div className="eligibility-badge not-eligible">
              🚨 {criticalCount} critical request{criticalCount > 1 ? 's' : ''} active!
            </div>
          </div>
        )}
      </aside>

      <main className="portal-main">
        <header className="portal-header">
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{NAV_ITEMS.find(n => n.id === activeTab)?.label}</h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{hospitalName} • {isConnected ? '🟢 Live' : '🔴 Offline'}</p>
          </div>
          <div className="flex gap-md items-center">
            <button id="new-request-btn" className="btn btn-primary btn-sm" onClick={() => { setReqResult(null); setActiveTab('request') }}>+ New Request</button>
            <button id="hospital-sos-btn" className="btn btn-danger btn-sm" onClick={() => navigate('/emergency')}>🆘 SOS</button>
          </div>
        </header>

        <div className="portal-content">
          {/* 🚨 Active Disaster Protocol Banner (Feature 5) */}
          {disasterSession?.active && (
            <div style={{
              background: 'linear-gradient(135deg, #7f0000 0%, #b71c1c 50%, #5f0000 100%)',
              border: '2px solid #ff1744',
              borderRadius: 16,
              padding: '20px 24px',
              marginBottom: 24,
              color: '#fff',
              boxShadow: '0 10px 40px rgba(255, 23, 68, 0.4)',
              animation: 'pulse 2s infinite',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '2px', color: '#ffcdd2', textTransform: 'uppercase' }}>
                    🚨 NATIONAL MASS CASUALTY PROTOCOL ACTIVE
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, marginTop: 4 }}>
                    {disasterSession.incidentType || 'Mass Casualty Emergency Event'}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#ffebee', marginTop: 4 }}>
                    📍 Location: <strong>{disasterSession.location}</strong> • Radius: <strong>{disasterSession.radius} km</strong> • Activated by: {disasterSession.activatedBy}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: '#ffcdd2' }}>TOTAL TARGET UNITS</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff' }}>{disasterSession.targetUnits} Units</div>
                  <span className="badge badge-red" style={{ background: '#fff', color: '#b71c1c', fontWeight: 800 }}>PRIORITY 1 HOSPITAL RESPONSE</span>
                </div>
              </div>
            </div>
          )}

          {/* ── DASHBOARD ── */}
          {activeTab === 'dashboard' && (
            <div className="animate-fade-in">
              {criticalCount > 0 && (
                <div className="alert alert-danger" style={{ marginBottom: 24 }}>
                  🚨 <strong>{criticalCount} critical request(s) active!</strong> — Searching nearby banks and alerting donors.
                  <button className="btn btn-danger btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setActiveTab('my-requests')}>View Live Status</button>
                </div>
              )}

              <div className="grid-4" style={{ marginBottom: 24 }}>
                {[
                  { icon: Droplet,      label: 'Active Requests', value: requests.filter(r => r.status !== 'fulfilled').length, borderClass: 'border-red', bgClass: 'red', criticalBadge: criticalCount > 0 ? `${criticalCount} Critical` : null },
                  { icon: CheckCircle2, label: 'Fulfilled Today',  value: requests.filter(r => r.status === 'fulfilled').length,  borderClass: 'border-green', bgClass: 'green' },
                  { icon: Clock,        label: 'Avg Response Time', value: '< 5m',  borderClass: 'border-blue', bgClass: 'blue', isSm: true },
                  { icon: Building2,    label: 'Banks Connected',  value: '12',     borderClass: 'border-purple', bgClass: 'purple' },
                ].map((s, i) => {
                  const Icon = s.icon
                  return (
                    <div key={i} className={`stat-card ${s.borderClass}`}>
                      <div className="stat-card-top">
                        <div className="stat-label-muted">{s.label}</div>
                        <div className={`stat-icon-circle ${s.bgClass}`}><Icon size={20} /></div>
                      </div>
                      <div className="stat-card-main">
                        <span className={`stat-number-hero ${s.isSm ? 'text-sm' : ''}`}>{s.value}</span>
                        {s.criticalBadge && <span className="stat-critical-badge">🚨 {s.criticalBadge}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>

              <InventoryHeatmapMatrix />

              <div className="grid-2" style={{ marginBottom: 24, gap: 24 }}>
                <CompactMapWidget
                  hasActiveEmergency={criticalCount > 0}
                  onViewFullMap={() => setActiveTab('map')}
                />

                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontWeight: 700, marginBottom: 12 }}>⚡ Quick Blood Search</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 16 }}>
                      Query real-time reserves across all connected blood banks within range.
                    </p>
                    <div className="flex gap-md items-center flex-wrap" style={{ marginBottom: 16 }}>
                      <select className="form-select" style={{ flex: 1, minWidth: 140 }} value={searchGroup} onChange={e => setSearchGroup(e.target.value)}>
                        {BLOOD_GROUPS.map(g => <option key={g}>{g}</option>)}
                      </select>
                      <select className="form-select" style={{ flex: 1, minWidth: 120 }} value={searchRadius} onChange={e => setSearchRadius(e.target.value)}>
                        {['5', '10', '20', '50'].map(r => <option key={r} value={r}>{r} km</option>)}
                      </select>
                    </div>
                  </div>
                  <button id="quick-search-btn" className="btn btn-primary" style={{ width: '100%' }}
                    onClick={() => { handleSearch(); setActiveTab('search') }}>
                    🔍 Search Immediate Inventory
                  </button>
                </div>
              </div>

              <div className="glass-card">
                <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
                  <h3 style={{ fontWeight: 700, margin: 0 }}>📋 Recent Requests</h3>
                  {/* ⚡ Fast Drone Transport CTA — Hospital Portal: Dashboard (critical requests) */}
                  {requests.some(r => r.status !== 'fulfilled' && (r.urgency === 'critical' || r.urgency === 'high')) && (
                    <button
                      id="dashboard-drone-dispatch-btn"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                        color: '#fff', border: 'none', borderRadius: 10,
                        padding: '7px 14px', fontWeight: 800, fontSize: '0.82rem',
                        cursor: 'pointer', boxShadow: '0 3px 12px rgba(6,182,212,0.35)',
                      }}
                      onClick={() => {
                        const cr = requests.find(r => r.status !== 'fulfilled' && (r.urgency === 'critical' || r.urgency === 'high'))
                        if (cr) navigate(`/drone-transport?group=${cr.group}&units=${cr.units}&requestId=${cr.id}&toId=Hosp. 01&fromId=Bank 01`)
                      }}
                    >
                      ⚡ Fast Drone Transport
                    </button>
                  )}
                </div>
                {requests.map(req => (
                  <div key={req.id} className="alert-row" style={{ borderLeft: `3px solid ${URGENCY_CONFIG[req.urgency]?.color || '#666'}` }}>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="flex gap-sm items-center" style={{ marginBottom: 4 }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>#{typeof req.id === 'string' ? req.id.slice(0, 12) : req.id}</span>
                          <span className={`badge ${URGENCY_CONFIG[req.urgency]?.badge}`}>{req.urgency?.toUpperCase()}</span>
                          <span className="blood-badge" style={{ width: 28, height: 28, fontSize: '0.65rem' }}>{req.group}</span>
                          <span style={{ fontSize: '0.875rem' }}>× {req.units} units</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{req.createdAt}</div>
                        {req.donorResponses?.length > 0 && (
                          <div style={{ fontSize: '0.78rem', color: '#00E676', marginTop: 4 }}>
                            ✅ {req.donorResponses.length} donor{req.donorResponses.length > 1 ? 's' : ''} responded
                          </div>
                        )}
                      </div>
                      <span className={`badge ${req.status === 'fulfilled' ? 'badge-green' : req.status === 'matched' ? 'badge-blue' : req.status === 'open' ? 'badge-yellow' : 'badge-red'}`}>
                        {req.status === 'fulfilled' ? '✅ Fulfilled' : req.status === 'matched' ? '🎯 Matched' : '🔍 Searching'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── BLOOD SEARCH ── */}
          {activeTab === 'search' && (
            <div className="animate-fade-in">
              <div className="glass-card" style={{ marginBottom: 24 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 16 }}>🔍 Search Blood Availability</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Blood Group</label>
                    <select id="search-group" className="form-select" value={searchGroup} onChange={e => setSearchGroup(e.target.value)}>
                      {BLOOD_GROUPS.map(g => <option key={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Component</label>
                    <select id="search-component" className="form-select">
                      {['Whole Blood', 'Plasma', 'Platelets', 'Any'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Radius</label>
                    <select id="search-radius" className="form-select" value={searchRadius} onChange={e => setSearchRadius(e.target.value)}>
                      {['5', '10', '20', '50'].map(r => <option key={r}>{r} km</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ opacity: 0 }}>.</label>
                    <button id="run-search-btn" className="btn btn-primary" style={{ height: 46 }} onClick={handleSearch} disabled={searching}>
                      {searching ? <span className="loading-spinner" /> : 'Search'}
                    </button>
                  </div>
                </div>
              </div>

              {searched && (
                <>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: 16 }}>
                    Found <strong>{searchResults.length} available</strong> sources within {searchRadius} km for <strong>{searchGroup}</strong>
                  </p>
                  {searchResults.length === 0 && (
                    <div className="alert alert-warning">
                      ⚠️ No stock found nearby. Click "New Request" to alert eligible donors in the area.
                    </div>
                  )}
                  {searchResults.map((result, i) => (
                    <div key={i} className="glass-card" style={{ marginBottom: 12 }}>
                      <div className="flex justify-between items-center">
                        <div className="flex gap-md items-center">
                          <div className="avatar" style={{ width: 48, height: 48, fontSize: '1.2rem', borderRadius: 12, background: result.type === 'blood-bank' ? 'rgba(220,20,60,0.2)' : 'rgba(41,182,246,0.2)' }}>
                            {result.type === 'blood-bank' ? '🏦' : '🏥'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700 }}>{result.name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                              📍 {result.area} • {result.city} {result.rating && `• ⭐ ${result.rating}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-sm items-center">
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, color: 'var(--color-success)' }}>{result.inventory?.[searchGroup] ?? '—'} units</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{searchGroup} available</div>
                          </div>
                          <button className="btn btn-primary btn-sm" onClick={() => { setReqForm(p => ({ ...p, group: searchGroup })); setActiveTab('request') }}>Request</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* ── NEW REQUEST ── */}
          {activeTab === 'request' && (
            <div className="animate-fade-in">
              {reqResult ? (
                <div className="glass-card">
                  <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ fontSize: '4rem', marginBottom: 12 }}>✅</div>
                    <h2 style={{ fontWeight: 800, fontSize: '1.5rem', marginBottom: 8 }}>Request Submitted!</h2>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: 16 }}>
                      Request <strong>#{String(reqResult.requestId).slice(0, 14)}</strong> is live. Donors are being alerted via WebSocket.
                    </p>
                  </div>

                  {reqResult.matches?.length > 0 && (
                    <div className="alert alert-success" style={{ marginBottom: 16 }}>
                      🎯 <strong>{reqResult.matches.length} inventory match{reqResult.matches.length > 1 ? 'es' : ''} found!</strong>{' '}
                      {reqResult.matches[0].name} — {reqResult.matches[0].distance || '~3 km away'}, {reqResult.matches[0].units} units available
                    </div>
                  )}

                  {!reqResult.inventorySufficient && (
                    <div className="alert alert-warning" style={{ marginBottom: 16 }}>
                      ⚠️ No immediate inventory match — alerting <strong>eligible donors</strong> in your area via real-time notification.
                    </div>
                  )}

                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: 24 }}>
                    🔌 Donors with matching blood group are receiving a live alert right now.
                  </div>

                  <div className="flex gap-md justify-center">
                    <button className="btn btn-primary" onClick={() => setActiveTab('my-requests')}>
                      📋 View Live Status
                    </button>
                    <button className="btn btn-secondary" onClick={() => { setReqResult(null); setReqForm({ group: 'O-', units: '2', urgency: 'critical', notes: '' }) }}>
                      + New Request
                    </button>
                  </div>
                </div>
              ) : (
                <div className="glass-card" style={{ maxWidth: 600 }}>
                  <h2 style={{ fontWeight: 800, marginBottom: 8 }}>📋 New Blood Request</h2>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: 24 }}>
                    System will automatically match to the nearest available blood bank or alert eligible donors.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="grid-2">
                      <div className="form-group">
                        <label className="form-label">Blood Group Required</label>
                        <select id="req-blood-group" className="form-select" value={reqForm.group} onChange={e => setReqForm(p => ({ ...p, group: e.target.value }))}>
                          <option value="">Select Blood Group</option>
                          {BLOOD_GROUPS.map(g => <option key={g}>{g}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Units Needed</label>
                        <input id="req-units" type="number" min="1" className="form-input" placeholder="e.g. 2" value={reqForm.units} onChange={e => setReqForm(p => ({ ...p, units: e.target.value }))} />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Urgency Level</label>
                      <div className="flex gap-md">
                        {['critical', 'high', 'normal'].map(level => {
                          const cfg = URGENCY_CONFIG[level]
                          return (
                            <button key={level} type="button" className="btn"
                              style={{
                                flex: 1,
                                background: reqForm.urgency === level ? cfg.bg : 'var(--glass-bg)',
                                border: `1px solid ${reqForm.urgency === level ? cfg.color : 'var(--glass-border)'}`,
                                color: reqForm.urgency === level ? cfg.color : 'var(--color-text-secondary)',
                              }}
                              onClick={() => setReqForm(p => ({ ...p, urgency: level }))}>
                              {cfg.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Additional Notes</label>
                      <textarea id="req-notes" className="form-input" style={{ resize: 'vertical', minHeight: 80 }}
                        placeholder="Patient condition, special requirements..."
                        value={reqForm.notes} onChange={e => setReqForm(p => ({ ...p, notes: e.target.value }))} />
                    </div>

                    <button id="submit-request-btn" className="btn btn-danger btn-lg w-full"
                      onClick={handleSubmitRequest}
                      disabled={submitting || !reqForm.group || !reqForm.units}>
                      {submitting ? <><span className="loading-spinner" /> Matching & Alerting Donors...</> : '🆘 Submit Emergency Request'}
                    </button>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                      Matching engine runs in &lt;3 seconds. Eligible donors receive a real-time Socket.io alert.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── MY REQUESTS (LIVE STATUS) ── */}
          {activeTab === 'my-requests' && (
            <div className="animate-fade-in">
              {requests.some(r => r.donorResponses?.length > 0 && r.status !== 'fulfilled') && (
                <div className="alert alert-success" style={{ marginBottom: 20 }}>
                  🩸 <strong>Donors have responded!</strong> Check the requests below for live donor availability.
                </div>
              )}
              {requests.map(req => (
                <div key={req.id} className="glass-card" style={{ marginBottom: 16, borderLeft: `4px solid ${URGENCY_CONFIG[req.urgency]?.color || '#666'}` }}>
                  <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
                    <div className="flex gap-sm items-center">
                      <span className="badge badge-blue" style={{ fontFamily: 'monospace' }}>#{String(req.id).slice(0, 12)}</span>
                      <span className={`badge ${URGENCY_CONFIG[req.urgency]?.badge}`}>{req.urgency?.toUpperCase()}</span>
                      <span className="blood-badge" style={{ width: 32, height: 32, fontSize: '0.7rem' }}>{req.group}</span>
                      <span>× {req.units} units</span>
                    </div>
                    <div className="flex gap-sm" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className={`badge ${req.urgency === 'critical' ? 'badge-red' : req.urgency === 'high' ? 'badge-yellow' : 'badge-blue'}`}>
                        {req.urgency.toUpperCase()}
                      </span>
                      <span className={`badge ${req.status === 'open' ? 'badge-yellow' : req.status === 'in_transit' ? 'badge-blue' : 'badge-green'}`}>
                        {req.status.toUpperCase()}
                      </span>

                      {/* ⚡ Fast Drone Transport entry point */}
                      {req.status !== 'fulfilled' && (
                        <button
                          id={`drone-btn-${req.id}`}
                          className="btn btn-sm"
                          style={{
                            background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                            color: '#fff',
                            border: 'none',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            padding: '6px 12px',
                            borderRadius: 8,
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(6,182,212,0.3)',
                            whiteSpace: 'nowrap',
                          }}
                          onClick={() => navigate(
                            `/drone-transport?group=${req.group}&units=${req.units}&requestId=${req.id}&toId=Hosp. 01&fromId=Bank 01`
                          )}
                        >
                          ⚡ Fast Drone
                        </button>
                      )}

                      {/* 📢 Fallback Channel: Broadcast to Community & NGOs */}
                      {req.status !== 'fulfilled' && (
                        <button
                          id={`broadcast-ngo-btn-${req.id}`}
                          className="btn btn-sm"
                          style={{
                            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                            color: '#5eead4',
                            border: '1px solid rgba(94, 234, 212, 0.4)',
                            fontWeight: 800,
                            fontSize: '0.76rem',
                            padding: '6px 12px',
                            borderRadius: 8,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                          }}
                          onClick={() => navigate(
                            `/donor?tab=community&group=${req.group}&hospital=${encodeURIComponent(hospitalName)}&locality=Nagpur&units=${req.units}&urgency=${encodeURIComponent(req.urgency)}&requestId=${req.id}`
                          )}
                          title="Fallback: Broadcast request to WhatsApp, Instagram & Nagpur NGOs when bank stock is low"
                        >
                          📢 Community SOS
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                    Created: {req.createdAt}
                  </div>

                  {/* Matched inventory */}
                  {req.matches?.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 6, color: '#38bdf8' }}>🏥 Inventory & Compatible Matches:</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {req.matches.map((m, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>• {m.name}</span>
                              {m.bloodGroup && (
                                <span className="blood-badge" style={{ width: 22, height: 22, fontSize: '0.6rem' }}>{m.bloodGroup}</span>
                              )}
                              <span className={`badge ${m.matchType === 'exact' ? 'badge-green' : 'badge-blue'}`} style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                                {m.matchType === 'exact' ? '🎯 Exact' : '🔄 Compatible'}
                              </span>
                            </div>
                            <span style={{ color: '#334155', fontWeight: 700 }}>{m.units} units {m.distance ? `(${typeof m.distance === 'number' ? Math.round(m.distance * 10)/10 + ' km' : m.distance})` : ''}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Multi-Channel Notification Dispatch Audit */}
                  <div style={{ fontSize: '0.74rem', color: '#475569', display: 'flex', gap: 8, alignItems: 'center', margin: '8px 0', padding: '4px 0', borderTop: '1px dashed rgba(255,255,255,0.08)' }}>
                    <span>📡 Alert Dispatched:</span>
                    <span style={{ color: '#00E676' }}>🟢 Socket.io Live</span>
                    <span>•</span>
                    <span style={{ color: '#25D366' }}>📲 WhatsApp Cloud</span>
                    <span>•</span>
                    <span style={{ color: '#38bdf8' }}>📧 SMS & Email</span>
                  </div>

                  {/* Live donor responses */}
                  {req.donorResponses?.length > 0 && (
                    <div style={{ marginTop: 8, borderTop: '1px solid rgba(0,230,118,0.2)', paddingTop: 8 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#00E676', marginBottom: 6 }}>
                        🩸 Donor Responses ({req.donorResponses.length}):
                      </div>
                      {req.donorResponses.map((dr, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <span style={{ color: '#0F172A' }}>{dr.donorName} {dr.bloodGroup && <span className="blood-badge" style={{ width: 24, height: 24, fontSize: '0.6rem', display: 'inline-flex' }}>{dr.bloodGroup}</span>}</span>
                          <span style={{ color: '#64748b' }}>{dr.time} • Available ✅</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {req.status === 'open' && req.donorResponses?.length === 0 && (
                    <div className="progress-bar" style={{ marginTop: 12 }}>
                      <div className="progress-fill" style={{ width: '65%' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── CHRONIC CARE & THALASSEMIA ── */}
          {activeTab === 'chronic' && (
            <div className="animate-fade-in">
              <div className="flex justify-between items-center" style={{ marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>🩺 Chronic Care & Recurring Transfusion Roster</h2>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                    Scheduled pre-allocations for Thalassemia Major, Sickle Cell, and Dialysis patients to prevent recurring stockouts.
                  </p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => alert('Opening New Chronic Patient Registration Form...')}>
                  ➕ Add Scheduled Patient
                </button>
              </div>

              <div className="grid-3" style={{ marginBottom: 24 }}>
                <div className="glass-card">
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Enrolled Chronic Patients</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#38bdf8', marginTop: 4 }}>48 Patients</div>
                  <div style={{ fontSize: '0.72rem', color: '#00E676', marginTop: 2 }}>● 100% Pre-Allocated for this week</div>
                </div>
                <div className="glass-card">
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Recurring Monthly Demand</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#FFB300', marginTop: 4 }}>96 Units/mo</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 2 }}>Mainly O+, B+, A+ PRBC</div>
                </div>
                <div className="glass-card">
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Wastage Rate for Scheduled Units</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#00E676', marginTop: 4 }}>0.0%</div>
                  <div style={{ fontSize: '0.72rem', color: '#00E676', marginTop: 2 }}>Zero expired units via pre-reservation</div>
                </div>
              </div>

              <div className="glass-card table-wrapper">
                <table style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Patient ID & Name</th>
                      <th>Condition</th>
                      <th>Blood Group</th>
                      <th>Transfusion Interval</th>
                      <th>Next Scheduled Session</th>
                      <th>Assigned Bank Source</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { id: 'PAT-THAL-01', name: 'Aarav Deshpande (12y)', cond: 'Thalassemia Major', group: 'B+', freq: 'Every 21 Days', next: 'Tomorrow, 09:30 AM', bank: 'LifeSource Blood Bank', status: 'Reserved' },
                      { id: 'PAT-THAL-04', name: 'Ananya Kulkarni (8y)', cond: 'Thalassemia Major', group: 'O+', freq: 'Every 14 Days', next: 'Friday, 11:00 AM', bank: 'Red Cross Center', status: 'Reserved' },
                      { id: 'PAT-SC-09', name: 'Sameer Sheikh (28y)', cond: 'Sickle Cell Crisis', group: 'O-', freq: 'Monthly Exchange', next: '02 Sep 2026', bank: 'Mayo Blood Bank', status: 'In Transit' },
                      { id: 'PAT-NEPH-12', name: 'Manjula Patel (54y)', cond: 'Chronic Renal Anemia', group: 'A+', freq: 'Bi-weekly PRBC', next: '05 Sep 2026', bank: 'Care Hospital Centre', status: 'Scheduled' },
                    ].map((p, i) => (
                      <tr key={i}>
                        <td><strong>{p.name}</strong><br /><span style={{ fontSize: '0.72rem', color: '#475569' }}>{p.id}</span></td>
                        <td><span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: '#334155' }}>{p.cond}</span></td>
                        <td><span className="blood-badge" style={{ width: 28, height: 28, fontSize: '0.65rem' }}>{p.group}</span></td>
                        <td style={{ fontSize: '0.8rem' }}>{p.freq}</td>
                        <td style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.82rem' }}>{p.next}</td>
                        <td style={{ fontSize: '0.8rem', color: '#38bdf8' }}>{p.bank}</td>
                        <td>
                          <span className={`badge ${p.status === 'Reserved' ? 'badge-green' : p.status === 'In Transit' ? 'badge-yellow' : 'badge-blue'}`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── RARE PHENOTYPE REGISTRY ── */}
          {activeTab === 'rare' && (
            <div className="animate-fade-in">
              <div className="flex justify-between items-center" style={{ marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>🧬 Rare Blood Phenotype Regional Network</h2>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                    Automated donor cross-matching for rare and ultra-rare phenotypes (Bombay $hh$, Rh-null, Kell null, Duffy-negative).
                  </p>
                </div>
                <span className="badge badge-red" style={{ padding: '6px 14px' }}>
                  🚨 4 Verified Ultra-Rare Donors in Network
                </span>
              </div>

              <div className="grid-2" style={{ marginBottom: 24 }}>
                <div className="glass-card" style={{ borderLeft: '4px solid #A855F7' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 8, color: '#c084fc' }}>
                    Bombay Phenotype ($hh$ / $Oh$)
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.5 }}>
                    Extremely rare antigen-negative blood found in 1 in 10,000 individuals in India. Can receive blood <strong>ONLY</strong> from another Bombay phenotype donor.
                  </p>
                  <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span className="badge badge-green">2 Matched Donors Online</span>
                    <span style={{ fontSize: '0.78rem', color: '#475569' }}>1 Unit Cryopreserved at Red Cross</span>
                  </div>
                </div>

                <div className="glass-card" style={{ borderLeft: '4px solid #38BDF8' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 8, color: '#38bdf8' }}>
                    Rh-Null ("Golden Blood")
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.5 }}>
                    Lacks all 61 Rh antigens. Universal donor for any rare Rh-subgroup patient worldwide. Less than 50 known individuals documented globally.
                  </p>
                  <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span className="badge badge-yellow">National Registry Alert Protocol</span>
                    <span style={{ fontSize: '0.78rem', color: '#475569' }}>Immediate Inter-State Airlift Enabled</span>
                  </div>
                </div>
              </div>

              <div className="glass-card table-wrapper">
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>📋 Verified Rare Phenotype Donors Registry</h3>
                <table style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Donor ID</th>
                      <th>Rare Phenotype</th>
                      <th>Standard ABO/Rh</th>
                      <th>Region / City</th>
                      <th>Last Screening Date</th>
                      <th>Emergency Availability</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { id: 'RD-NGP-001', pheno: 'Bombay (hh / Oh)', abo: 'O (apparent)', city: 'Nagpur Metro', date: '10 Aug 2026', avail: 'Ready for Call' },
                      { id: 'RD-BOM-002', pheno: 'Bombay (hh / Oh)', abo: 'O (apparent)', city: 'Mumbai Central', date: '14 Jul 2026', avail: 'Ready for Call' },
                      { id: 'RD-DEL-003', pheno: 'Duffy Null [Fy(a-b-)]', abo: 'A+', city: 'South Delhi', date: '22 Aug 2026', avail: 'Available' },
                      { id: 'RD-PUN-004', pheno: 'Kell Null (K0)', abo: 'B+', city: 'Pune Hub', date: '01 Jun 2026', avail: 'Ready for Call' },
                    ].map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{r.id}</td>
                        <td><strong style={{ color: '#c084fc' }}>{r.pheno}</strong></td>
                        <td><span className="blood-badge" style={{ width: 28, height: 28, fontSize: '0.65rem' }}>{r.abo}</span></td>
                        <td>📍 {r.city}</td>
                        <td style={{ fontSize: '0.8rem', color: '#475569' }}>{r.date}</td>
                        <td><span className="badge badge-green">🟢 {r.avail}</span></td>
                        <td>
                          <button className="btn btn-secondary btn-sm" onClick={() => alert(`Initiating priority dispatch request for Rare Donor ${r.id} (${r.pheno})`)}>
                            ⚡ Dispatch Request
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── MAP ── */}
          {activeTab === 'map' && (
            <div className="animate-fade-in">
              <InventoryMap selectedBloodGroup={searchGroup} />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
