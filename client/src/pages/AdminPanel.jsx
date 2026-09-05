import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiCall } from '../config/api'
import HackathonLiveHub from '../components/HackathonLiveHub'
import SupabaseGeminiDataHub from '../components/SupabaseGeminiDataHub'
import BloodSecurityIndex from '../components/BloodSecurityIndex'
import CrossSectorBloodBridge from '../components/CrossSectorBloodBridge'
import {
  LayoutDashboard,
  Zap,
  Droplet,
  Building2,
  AlertTriangle,
  TrendingUp,
  Settings,
  ShieldCheck,
  LogOut,
  CheckCircle2,
  ShieldAlert,
  Users,
  Database,
  ArrowLeftRight,
  Flame,
  Radio,
} from 'lucide-react'
import './Portal.css'

const ALL_DONORS = [
  { id: 'D001', name: 'Arjun Sharma', group: 'O+', city: 'Mumbai', phone: '+91 98765 43210', trustScore: 87, donations: 3, verified: true, status: 'active', lastDonation: '15 May 2026', flagged: false },
  { id: 'D002', name: 'Priya Mehta', group: 'A+', city: 'Delhi', phone: '+91 87654 32109', trustScore: 94, donations: 7, verified: true, status: 'active', lastDonation: '3 Apr 2026', flagged: false },
  { id: 'D003', name: 'Rahul Singh', group: 'B-', city: 'Pune', phone: '+91 76543 21098', trustScore: 12, donations: 0, verified: false, status: 'suspicious', lastDonation: '—', flagged: true },
  { id: 'D004', name: 'Sneha Joshi', group: 'AB+', city: 'Bangalore', phone: '+91 65432 10987', trustScore: 71, donations: 4, verified: true, status: 'active', lastDonation: '20 Jan 2026', flagged: false },
  { id: 'D005', name: 'Karan Patel', group: 'O-', city: 'Ahmedabad', phone: '+91 54321 09876', trustScore: 45, donations: 2, verified: true, status: 'inactive', lastDonation: '5 Oct 2025', flagged: false },
  { id: 'D006', name: 'Fake User XYZ', group: 'A-', city: 'Mumbai', phone: '+91 00000 00000', trustScore: 0, donations: 0, verified: false, status: 'blocked', lastDonation: '—', flagged: true },
]

const BLOOD_BANKS = [
  { id: 'BB001', name: 'LifeSource Blood Bank', city: 'Delhi', type: 'Private', verified: true, stock: 245, status: 'active' },
  { id: 'BB002', name: 'Red Cross Center', city: 'Mumbai', type: 'NGO', verified: true, stock: 189, status: 'active' },
  { id: 'BB003', name: 'City Hospital Bank', city: 'Pune', type: 'Government', verified: false, stock: 67, status: 'pending' },
]

const KPI_DATA = [
  { metric: 'Avg. Time to Locate Blood', value: '4.2 min', target: '< 5 min', met: true },
  { metric: 'Emergency Fulfillment Rate', value: '91.3%', target: '> 90%', met: true },
  { metric: 'Blood Wastage Reduction', value: '28%', target: '> 30%', met: false },
  { metric: 'Fraudulent Accounts', value: '1.8%', target: '< 2%', met: true },
  { metric: 'Donor Response Rate', value: '27.4%', target: '> 25%', met: true },
]

const NAV_ITEMS = [
  { id: 'dashboard',      icon: LayoutDashboard, label: 'Admin Dashboard' },
  { id: 'disaster',       icon: Flame,          label: '🚨 Disaster Mode' },
  { id: 'redistribution', icon: ArrowLeftRight,  label: 'Redistribution Engine' },
  { id: 'security',       icon: ShieldCheck,    label: '🗺️ Security Index' },
  { id: 'supabase',       icon: Database,       label: 'Supabase & Gemini DB' },
  { id: 'ai-live',        icon: Zap,            label: 'Gemini AI Live Hub' },
  { id: 'donors',         icon: Users,          label: 'Donor Management' },
  { id: 'banks',          icon: Building2,      label: 'Blood Banks' },
  { id: 'fraud',          icon: ShieldAlert,    label: 'Fraud Detection' },
  { id: 'kpis',           icon: TrendingUp,     label: 'KPI Tracker' },
  { id: 'system',         icon: Settings,       label: 'System Health' },
]

export default function AdminPanel() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [donorFilter, setDonorFilter] = useState('all')
  const [donors, setDonors] = useState(ALL_DONORS)

  const [banks, setBanks] = useState(BLOOD_BANKS)
  const [actionToast, setActionToast] = useState(null)

  const showActionToast = (msg, type = 'success') => {
    setActionToast({ msg, type })
    setTimeout(() => setActionToast(null), 3500)
  }

  const flagDonor = async (id) => {
    setDonors(prev => prev.map(d => d.id === id ? { ...d, flagged: true, status: 'blocked' } : d))
    await apiCall(`/api/v1/admin/donors/${id}/flag`, { method: 'POST', body: JSON.stringify({ reason: 'Admin flagged via dashboard' }) })
    showActionToast(`Donor ${id} flagged and blocked`)
  }
  const unflagDonor = async (id) => {
    setDonors(prev => prev.map(d => d.id === id ? { ...d, flagged: false, status: 'active' } : d))
    await apiCall(`/api/v1/admin/donors/${id}/verify`, { method: 'POST' })
    showActionToast(`Donor ${id} cleared and set active`)
  }
  const verifyDonor = async (id) => {
    setDonors(prev => prev.map(d => d.id === id ? { ...d, verified: true } : d))
    await apiCall(`/api/v1/admin/donors/${id}/verify`, { method: 'POST' })
    showActionToast(`Donor ${id} verified ✅`)
  }
  const verifyBank = async (id) => {
    setBanks(prev => prev.map(b => b.id === id ? { ...b, verified: true, status: 'active' } : b))
    showActionToast(`Blood Bank ${id} verified ✅`)
  }

  // ── Disaster Protocol State & Handlers (Feature 5) ──
  const [activeDisaster, setActiveDisaster] = useState(null)
  const [activatingDisaster, setActivatingDisaster] = useState(false)
  const [disasterForm, setDisasterForm] = useState({
    incidentType: 'Mass Casualty / Major Highway Transit Collision',
    location: 'Nagpur Central Trauma Ward, Zone 1',
    radius: '30',
    oNeg: '15',
    oPos: '30',
    aPos: '25',
    bPos: '25',
    abPos: '15',
  })

  // ── Redistribution State & Handlers (Feature 1) ──
  const [adminSuggestions, setAdminSuggestions] = useState([])
  const [scanningRedistribution, setScanningRedistribution] = useState(false)

  const loadAdminSuggestions = useCallback(async () => {
    const { ok, data } = await apiCall('/api/v1/redistribution/suggestions')
    if (ok && data?.suggestions) {
      setAdminSuggestions(data.suggestions)
    }
  }, [])

  const checkActiveDisaster = useCallback(async () => {
    const { ok, data } = await apiCall('/api/v1/admin/disaster/active')
    if (ok && data?.active) {
      setActiveDisaster(data.session)
    }
  }, [])

  useEffect(() => {
    loadAdminSuggestions()
    checkActiveDisaster()
  }, [loadAdminSuggestions, checkActiveDisaster])

  const handleActivateDisaster = async () => {
    setActivatingDisaster(true)
    const groups = [
      { bloodGroup: 'O-', unitsNeeded: parseInt(disasterForm.oNeg) || 10 },
      { bloodGroup: 'O+', unitsNeeded: parseInt(disasterForm.oPos) || 20 },
      { bloodGroup: 'A+', unitsNeeded: parseInt(disasterForm.aPos) || 15 },
      { bloodGroup: 'B+', unitsNeeded: parseInt(disasterForm.bPos) || 15 },
      { bloodGroup: 'AB+', unitsNeeded: parseInt(disasterForm.abPos) || 10 },
    ]

    const { ok, data } = await apiCall('/api/v1/admin/disaster/activate', {
      method: 'POST',
      body: JSON.stringify({
        incidentType: disasterForm.incidentType,
        location: disasterForm.location,
        radius: parseInt(disasterForm.radius) || 30,
        groups,
        activatedBy: user?.name || 'Super Admin',
      }),
    })

    if (ok && data?.session) {
      setActiveDisaster(data.session)
      showActionToast('🚨 CODE RED MASS CASUALTY PROTOCOL ACTIVATED!')
    }
    setActivatingDisaster(false)
  }

  const handleDeactivateDisaster = async () => {
    await apiCall('/api/v1/admin/disaster/deactivate', { method: 'POST' })
    setActiveDisaster(null)
    showActionToast('Disaster protocol deactivated. System returned to normal.')
  }

  const handleManualRedistributionScan = async () => {
    setScanningRedistribution(true)
    const { ok, data } = await apiCall('/api/v1/redistribution/scan', { method: 'POST' })
    if (ok && data?.suggestions) {
      setAdminSuggestions(data.suggestions)
      showActionToast(`Redistribution scan complete: ${data.suggestions.length} transfers found`)
    }
    setScanningRedistribution(false)
  }

  const handleUpdateAdminSuggestion = async (id, status) => {
    setAdminSuggestions(prev => prev.map(s => s.id === id ? { ...s, status } : s))
    await apiCall(`/api/v1/redistribution/suggestions/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    })
    showActionToast(`Transfer ${id} set to ${status}`)
  }

  const filteredDonors = donors.filter(d => {
    if (donorFilter === 'all') return true
    if (donorFilter === 'flagged') return d.flagged
    if (donorFilter === 'verified') return d.verified
    if (donorFilter === 'unverified') return !d.verified
    return true
  })

  return (
    <div className="portal-layout">
      {/* Admin action toast */}
      {actionToast && (
        <div style={{
          position: 'fixed', top: 80, right: 24, zIndex: 99998,
          background: 'linear-gradient(135deg, #0d1f0d, #052005)',
          border: '1px solid rgba(0,230,118,0.5)',
          borderRadius: 12, padding: '12px 18px', color: '#fff', maxWidth: 320,
          boxShadow: '0 10px 40px rgba(0,0,0,0.6)', animation: 'fadeIn 0.3s ease',
          fontWeight: 600, fontSize: '0.85rem',
        }}>
          ✅ {actionToast.msg}
        </div>
      )}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <ShieldCheck size={24} color="#ff4757" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem' }}>Admin Panel</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Platform Control</div>
          </div>
        </div>

        <div className="sidebar-user">
          <div className="avatar" style={{ background: 'linear-gradient(135deg, #8B0000, #DC143C)' }}>AD</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{user?.name || 'Admin'}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Super Admin • PS-01</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                id={`admin-nav-${item.id}`}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            )
          })}
          <div style={{ marginTop: 20 }} />
          <Link to="/lifestream" className="nav-item" style={{ color: '#00E676', fontWeight: 700 }}>
            <Zap size={20} />
            <span>LifeStream Nagpur Grid</span>
          </Link>
          <button className="nav-item" onClick={() => { logout(); navigate('/') }}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </nav>

        <div className="sidebar-eligibility">
          <div className="eligibility-badge eligible" style={{ fontSize: '0.75rem' }}>
            🟢 System Healthy — 99.8% Uptime
          </div>
        </div>
      </aside>

      <main className="portal-main">
        <header className="portal-header">
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{NAV_ITEMS.find(n => n.id === activeTab)?.label}</h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>BloodConnect PS-01 • Admin Control Center</p>
          </div>
          <div className="flex gap-md items-center">
            <span className="badge badge-green">🟢 Live</span>
            <span className="badge badge-red">🚨 {donors.filter(d => d.flagged).length} Flagged</span>
          </div>
        </header>

        <div className="portal-content">
          {/* ── DASHBOARD ── */}
          {activeTab === 'dashboard' && (
            <div className="animate-fade-in">
              <div className="grid-4" style={{ marginBottom: 24 }}>
                {[
                  { icon: Droplet, label: 'Total Donors', value: donors.length.toLocaleString(), borderClass: 'border-red', bgClass: 'red' },
                  { icon: Building2, label: 'Blood Banks', value: BLOOD_BANKS.length, borderClass: 'border-purple', bgClass: 'purple' },
                  { icon: AlertTriangle, label: 'Flagged Accounts', value: donors.filter(d => d.flagged).length, borderClass: 'border-blue', bgClass: 'orange', criticalBadge: donors.filter(d => d.flagged).length > 0 ? `${donors.filter(d => d.flagged).length} Flagged` : null },
                  { icon: CheckCircle2, label: 'KPIs Met', value: `${KPI_DATA.filter(k => k.met).length}/${KPI_DATA.length}`, borderClass: 'border-green', bgClass: 'green' },
                ].map((s, i) => {
                  const Icon = s.icon
                  return (
                    <div key={i} className={`stat-card ${s.borderClass}`}>
                      <div className="stat-card-top">
                        <div className="stat-label-muted">{s.label}</div>
                        <div className={`stat-icon-circle ${s.bgClass}`}>
                          <Icon size={20} />
                        </div>
                      </div>
                      <div className="stat-card-main">
                        <span className="stat-number-hero">{s.value}</span>
                        {s.criticalBadge && (
                          <span className="stat-critical-badge">
                            🚨 {s.criticalBadge}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>


              {/* KPI Quick View */}
              <div className="glass-card" style={{ marginBottom: 24 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 16 }}>📈 KPI Status Overview</h3>
                {KPI_DATA.map((kpi, i) => (
                  <div key={i} className="flex justify-between items-center" style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{kpi.metric}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Target: {kpi.target}</div>
                    </div>
                    <div className="flex gap-sm items-center">
                      <strong style={{ color: kpi.met ? 'var(--color-success)' : 'var(--color-warning)' }}>{kpi.value}</strong>
                      <span className={`badge ${kpi.met ? 'badge-green' : 'badge-yellow'}`}>{kpi.met ? '✅ Met' : '⚠️ Below'}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent Fraud Flags */}
              <div className="glass-card">
                <h3 style={{ fontWeight: 700, marginBottom: 16 }}>🚨 Recent Fraud Alerts</h3>
                {donors.filter(d => d.flagged).map(d => (
                  <div key={d.id} className="alert-row" style={{ borderLeft: '3px solid #FF1744' }}>
                    <div className="flex justify-between items-center">
                      <div>
                        <strong>{d.name}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{d.id} • Trust Score: {d.trustScore} • {d.donations} donations</div>
                      </div>
                      <div className="flex gap-sm">
                        {!d.verified && <button className="btn btn-success btn-sm" onClick={() => verifyDonor(d.id)}>Verify</button>}
                        <button className="btn btn-danger btn-sm" onClick={() => flagDonor(d.id)}>Block</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Supabase & Gemini Live Data Hub */}
              <SupabaseGeminiDataHub />
            </div>
          )}

          {/* ── DISASTER / MASS-CASUALTY MODE (Feature 5) ── */}
          {activeTab === 'disaster' && (
            <div className="animate-fade-in">
              {/* Active Disaster Monitor or Activation Form */}
              {activeDisaster?.active ? (
                <div style={{
                  background: 'linear-gradient(135deg, #4a0007 0%, #1f0205 100%)',
                  border: '2px solid #ff1744',
                  borderRadius: 20,
                  padding: '28px',
                  color: '#fff',
                  boxShadow: '0 20px 60px rgba(255, 23, 68, 0.35)',
                  marginBottom: 24,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#ff1744', fontWeight: 900, fontSize: '0.85rem', letterSpacing: '2px', textTransform: 'uppercase' }}>
                        <Flame size={20} /> CODE RED MASS CASUALTY PROTOCOL ACTIVE
                      </div>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: 900, margin: '8px 0', color: '#fff' }}>
                        {activeDisaster.incidentType}
                      </h2>
                      <div style={{ fontSize: '0.9rem', color: '#334155' }}>
                        📍 Incident Location: <strong>{activeDisaster.location}</strong> • Search Radius: <strong>{activeDisaster.radius} km</strong>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: 4 }}>
                        Activated at: {new Date(activeDisaster.activatedAt).toLocaleTimeString()} by {activeDisaster.activatedBy}
                      </div>
                    </div>

                    <button
                      id="deactivate-disaster-btn"
                      className="btn btn-secondary btn-lg"
                      style={{ background: 'rgba(255, 255, 255, 0.1)', borderColor: '#ff4757', color: '#fff' }}
                      onClick={handleDeactivateDisaster}
                    >
                      🛑 Deactivate Disaster Mode
                    </button>
                  </div>

                  {/* Real-time Multi-Group Emergency Request Progress */}
                  <div style={{ marginTop: 24 }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 12, color: '#ffcdd2' }}>
                      🩸 Fan-Out Emergency Broadcast Status ({activeDisaster.requests?.length || 0} Parallel Request Batches):
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                      {activeDisaster.requests?.map((req, i) => (
                        <div
                          key={i}
                          style={{
                            background: 'rgba(0, 0, 0, 0.4)',
                            border: '1px solid rgba(255, 71, 87, 0.3)',
                            borderRadius: 12,
                            padding: '14px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span className="blood-badge" style={{ width: 32, height: 32, fontSize: '0.75rem' }}>{req.bloodGroup}</span>
                            <span className="badge badge-red">CRITICAL SOS</span>
                          </div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff' }}>
                            {req.unitsNeeded} Units Target
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#00E676', marginTop: 6 }}>
                            📡 Donors & Regional Banks Notified
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass-card" style={{ maxWidth: 700, borderLeft: '6px solid #ff1744' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <Flame size={28} color="#ff1744" />
                    <div>
                      <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, color: '#ff1744' }}>
                        Activate Disaster / Mass-Casualty Protocol
                      </h2>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: 0 }}>
                        Instantly fans out critical requests across all major blood groups and alerts donors &amp; blood banks in the radius.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
                    <div className="form-group">
                      <label className="form-label">Incident Name / Description</label>
                      <input
                        id="disaster-incident"
                        className="form-input"
                        value={disasterForm.incidentType}
                        onChange={e => setDisasterForm(p => ({ ...p, incidentType: e.target.value }))}
                      />
                    </div>

                    <div className="grid-2">
                      <div className="form-group">
                        <label className="form-label">Disaster Epicenter / Location</label>
                        <input
                          id="disaster-location"
                          className="form-input"
                          value={disasterForm.location}
                          onChange={e => setDisasterForm(p => ({ ...p, location: e.target.value }))}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Alert Radius (km)</label>
                        <select
                          id="disaster-radius"
                          className="form-select"
                          value={disasterForm.radius}
                          onChange={e => setDisasterForm(p => ({ ...p, radius: e.target.value }))}
                        >
                          {['15', '25', '35', '50', '100'].map(r => <option key={r} value={r}>{r} km radius</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Required Units per Blood Group:</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                        {[
                          { label: 'O-', key: 'oNeg' },
                          { label: 'O+', key: 'oPos' },
                          { label: 'A+', key: 'aPos' },
                          { label: 'B+', key: 'bPos' },
                          { label: 'AB+', key: 'abPos' },
                        ].map(bg => (
                          <div key={bg.key} style={{ background: 'rgba(255,255,255,0.04)', padding: 10, borderRadius: 10, textAlign: 'center' }}>
                            <span className="blood-badge" style={{ width: 28, height: 28, fontSize: '0.65rem', margin: '0 auto 6px' }}>{bg.label}</span>
                            <input
                              type="number"
                              min="1"
                              className="form-input"
                              style={{ textAlign: 'center', padding: '6px 4px', fontSize: '0.9rem' }}
                              value={disasterForm[bg.key]}
                              onChange={e => setDisasterForm(p => ({ ...p, [bg.key]: e.target.value }))}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="alert alert-danger" style={{ fontSize: '0.85rem' }}>
                      ⚠️ Activating this protocol triggers simultaneous emergency broadcasts via Socket.io, Telegram, and SMS to all registered donors and blood banks within {disasterForm.radius} km.
                    </div>

                    <button
                      id="activate-disaster-btn"
                      className="btn btn-danger btn-lg w-full"
                      onClick={handleActivateDisaster}
                      disabled={activatingDisaster}
                      style={{ background: 'linear-gradient(135deg, #ff1744 0%, #b71c1c 100%)', boxShadow: '0 8px 30px rgba(255,23,68,0.5)' }}
                    >
                      {activatingDisaster ? <><span className="loading-spinner" /> Broadcasting Mass Casualty Protocol...</> : '🚨 ACTIVATE CODE RED DISASTER PROTOCOL'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PROACTIVE REDISTRIBUTION ENGINE TAB (Feature 1) ── */}
          {activeTab === 'redistribution' && (
            <div className="animate-fade-in">
              {/* ── SPECIALIZED CROSS-SECTOR BLOOD BRIDGE PANEL ── */}
              <CrossSectorBloodBridge isAdmin={true} onSuggestionUpdate={loadAdminSuggestions} />

              <div style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: 18,
                padding: '20px 24px',
                marginBottom: 20,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 4px 0', color: '#38bdf8' }}>
                      ♻️ Regional Inter-Bank Stock Redistribution Feed
                    </h2>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
                      All cross-facility transfers recommended by the rule engine (expiry &le; 5 days $\times$ nearby demand &lt;25 km).
                    </p>
                  </div>
                  <button
                    id="admin-run-scan-btn"
                    className="btn btn-primary btn-sm"
                    onClick={handleManualRedistributionScan}
                    disabled={scanningRedistribution}
                  >
                    {scanningRedistribution ? 'Scanning...' : '⚡ Trigger Live Scan Across All Banks'}
                  </button>
                </div>
              </div>

              {adminSuggestions.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: 40, color: '#475569' }}>
                  No pending redistribution transfers. All blood banks have adequate stock buffers.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {adminSuggestions.map(s => {
                    const isCrossSector = s.cross_sector || (s.sourceBankType === 'government' && (s.targetBankType === 'private' || s.targetBankType === 'trust_run'))
                    return (
                      <div
                        key={s.id}
                        className="glass-card"
                        style={{
                          borderLeft: `4px solid ${isCrossSector ? '#a855f7' : s.reason === 'urgent-expiry' ? '#ff1744' : '#38bdf8'}`,
                          background: s.status === 'accepted' ? 'rgba(0, 230, 118, 0.05)' : isCrossSector ? 'rgba(168, 85, 247, 0.05)' : undefined,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                              <span className="badge badge-blue">{s.id}</span>
                              {isCrossSector && (
                                <span className="badge" style={{
                                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.25) 0%, rgba(217, 70, 239, 0.2) 100%)',
                                  border: '1px solid rgba(168, 85, 247, 0.5)',
                                  color: '#d8b4fe',
                                  fontWeight: 800,
                                }}>
                                  🏛️➔🏥 Cross-Sector Transfer
                                </span>
                              )}
                              <span className={`badge ${s.reason === 'urgent-expiry' ? 'badge-red' : 'badge-yellow'}`}>
                                {s.reason === 'urgent-expiry' ? '🚨 Expiry Risk (< 3 Days)' : '⏳ Expiry Optimization'}
                              </span>
                              <span className="blood-badge" style={{ width: 26, height: 26, fontSize: '0.62rem' }}>{s.bloodGroup}</span>
                              <strong>{s.unitsSuggested} Units</strong>
                            </div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
                              {s.sourceBankName} ➔ <span style={{ color: '#00E676' }}>{s.targetBankName}</span>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 4 }}>
                              Distance: {s.distanceKm} km • Days Left at Source: {s.daysToExpiry}d
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {s.status === 'accepted' ? (
                              <span className="badge badge-green">✅ Accepted & In Transit</span>
                            ) : (
                              <>
                                <button className="btn btn-success btn-sm" onClick={() => handleUpdateAdminSuggestion(s.id, 'accepted')}>
                                  Approve Transfer
                                </button>
                                <button className="btn btn-secondary btn-sm" onClick={() => handleUpdateAdminSuggestion(s.id, 'rejected')}>
                                  Decline
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── DISTRICT-LEVEL BLOOD SECURITY INDEX (Feature 7) ── */}
          {activeTab === 'security' && (
            <div className="animate-fade-in">
              <BloodSecurityIndex />
            </div>
          )}

          {/* ── SUPABASE & GEMINI DB TAB ── */}
          {activeTab === 'supabase' && (
            <div className="animate-fade-in">
              <SupabaseGeminiDataHub />
            </div>
          )}



          {/* ── DONORS ── */}
          {activeTab === 'donors' && (
            <div className="animate-fade-in">
              <div className="flex gap-sm" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
                {['all', 'verified', 'unverified', 'flagged'].map(f => (
                  <button key={f} className={`chip ${donorFilter === f ? 'active' : ''}`} onClick={() => setDonorFilter(f)}>
                    {f.charAt(0).toUpperCase() + f.slice(1)} ({f === 'all' ? donors.length : f === 'verified' ? donors.filter(d => d.verified).length : f === 'unverified' ? donors.filter(d => !d.verified).length : donors.filter(d => d.flagged).length})
                  </button>
                ))}
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Blood</th>
                      <th>City</th>
                      <th>Trust Score</th>
                      <th>Donations</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDonors.map(d => (
                      <tr key={d.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{d.id}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{d.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{d.phone}</div>
                        </td>
                        <td><span className="blood-badge" style={{ width: 32, height: 32, fontSize: '0.7rem' }}>{d.group}</span></td>
                        <td>{d.city}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="progress-bar" style={{ width: 60 }}>
                              <div className="progress-fill" style={{ width: `${d.trustScore}%`, background: d.trustScore > 60 ? 'linear-gradient(90deg, #00E676, #00BFA5)' : d.trustScore > 30 ? 'linear-gradient(90deg, #FFB300, #FF8F00)' : 'linear-gradient(90deg, #FF1744, #B71C1C)' }} />
                            </div>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{d.trustScore}</span>
                          </div>
                        </td>
                        <td>{d.donations}</td>
                        <td>
                          <span className={`badge ${d.status === 'active' ? 'badge-green' : d.status === 'blocked' ? 'badge-red' : d.status === 'suspicious' ? 'badge-yellow' : 'badge-blue'}`}>
                            {d.status}
                          </span>
                          {d.verified && <span className="badge badge-blue" style={{ marginLeft: 4 }}>✅</span>}
                        </td>
                        <td>
                          <div className="flex gap-xs">
                            {!d.verified && <button className="btn btn-success btn-sm" onClick={() => verifyDonor(d.id)} title="Verify">Verify</button>}
                            {!d.flagged ? (
                              <button className="btn btn-danger btn-sm" onClick={() => flagDonor(d.id)} title="Flag/Block">Flag</button>
                            ) : (
                              <button className="btn btn-secondary btn-sm" onClick={() => unflagDonor(d.id)} title="Unflag">Unflag</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── BLOOD BANKS ── */}
          {activeTab === 'banks' && (
            <div className="animate-fade-in">
              {banks.filter(b => !b.verified).length > 0 && (
                <div className="alert alert-warning" style={{ marginBottom: 16 }}>
                  ⏳ <strong>{banks.filter(b => !b.verified).length} blood bank(s)</strong> are pending verification. Review and approve them below.
                </div>
              )}
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>City</th>
                      <th>Type</th>
                      <th>Stock</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {banks.map(bank => (
                      <tr key={bank.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{bank.id}</td>
                        <td><strong>{bank.name}</strong></td>
                        <td>{bank.city}</td>
                        <td><span className="badge badge-blue">{bank.type}</span></td>
                        <td style={{ fontWeight: 700 }}>{bank.stock} units</td>
                        <td>
                          <span className={`badge ${bank.verified ? 'badge-green' : 'badge-yellow'}`}>
                            {bank.verified ? '✅ Verified' : '⏳ Pending'}
                          </span>
                        </td>
                        <td>
                          <div className="flex gap-sm">
                            {!bank.verified && (
                              <button
                                id={`verify-bank-${bank.id}`}
                                className="btn btn-success btn-sm"
                                onClick={() => verifyBank(bank.id)}
                              >
                                ✅ Verify
                              </button>
                            )}
                            <button className="btn btn-secondary btn-sm">View</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── FRAUD DETECTION ── */}
          {activeTab === 'fraud' && (
            <div className="animate-fade-in">
              <div className="alert alert-danger" style={{ marginBottom: 24 }}>
                🤖 Fraud Detection Engine detected <strong>{donors.filter(d => d.flagged).length} suspicious accounts</strong> based on: zero donations after 6 months, duplicate phone patterns, and trust score analysis.
              </div>

              <div className="grid-2" style={{ marginBottom: 24 }}>
                <div className="glass-card">
                  <h3 style={{ fontWeight: 700, marginBottom: 16 }}>🔍 Fraud Signals</h3>
                  {[
                    { signal: 'Registered but never donated (> 6 months)', count: 2, severity: 'medium' },
                    { signal: 'Duplicate phone number detected', count: 1, severity: 'high' },
                    { signal: 'Multiple failed OTP attempts', count: 1, severity: 'low' },
                    { signal: 'Trust score below threshold (< 10)', count: 1, severity: 'high' },
                  ].map((s, i) => (
                    <div key={i} className="alert-row" style={{ borderLeft: `3px solid ${s.severity === 'high' ? '#FF1744' : s.severity === 'medium' ? '#FFB300' : '#29B6F6'}` }}>
                      <div className="flex justify-between items-center">
                        <span style={{ fontSize: '0.875rem' }}>{s.signal}</span>
                        <span className={`badge ${s.severity === 'high' ? 'badge-red' : s.severity === 'medium' ? 'badge-yellow' : 'badge-blue'}`}>{s.count} account{s.count > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="glass-card">
                  <h3 style={{ fontWeight: 700, marginBottom: 16 }}>📊 Fraud Stats</h3>
                  {[
                    { label: 'Current fraud rate', value: '1.8%', target: '< 2%', ok: true },
                    { label: 'Blocked accounts', value: donors.filter(d => d.status === 'blocked').length },
                    { label: 'Pending review', value: donors.filter(d => d.status === 'suspicious').length },
                    { label: 'Auto-flagged this week', value: '3' },
                  ].map((s, i) => (
                    <div key={i} className="preview-row">
                      <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{s.label}</span>
                      <strong style={{ color: s.ok === true ? 'var(--color-success)' : s.ok === false ? 'var(--color-danger)' : 'white' }}>{s.value}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card">
                <h3 style={{ fontWeight: 700, marginBottom: 16 }}>🚨 Flagged Accounts</h3>
                {donors.filter(d => d.flagged).map(d => (
                  <div key={d.id} className="glass-card" style={{ marginBottom: 12, background: 'rgba(255,23,68,0.05)', borderColor: 'rgba(255,23,68,0.2)' }}>
                    <div className="flex justify-between items-center">
                      <div>
                        <strong>{d.name}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{d.id} • {d.city} • Trust: {d.trustScore}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{d.phone}</div>
                      </div>
                      <div className="flex gap-sm">
                        <button className="btn btn-success btn-sm" onClick={() => verifyDonor(d.id)}>Verify</button>
                        <button className="btn btn-danger btn-sm" onClick={() => flagDonor(d.id)}>Permanent Block</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => unflagDonor(d.id)}>Clear Flag</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── KPIs ── */}
          {activeTab === 'kpis' && (
            <div className="animate-fade-in">
              <div className="grid-2" style={{ marginBottom: 24 }}>
                {KPI_DATA.map((kpi, i) => (
                  <div key={i} className="glass-card" style={{ borderLeft: `4px solid ${kpi.met ? 'var(--color-success)' : 'var(--color-warning)'}` }}>
                    <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
                      <h3 style={{ fontWeight: 700, fontSize: '0.95rem' }}>{kpi.metric}</h3>
                      <span className={`badge ${kpi.met ? 'badge-green' : 'badge-yellow'}`}>{kpi.met ? '✅ On Target' : '⚠️ Below Target'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end' }}>
                      <div>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: kpi.met ? 'var(--color-success)' : 'var(--color-warning)' }}>{kpi.value}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Current</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{kpi.target}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Target</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── SYSTEM HEALTH ── */}
          {activeTab === 'system' && (
            <div className="animate-fade-in">
              <div className="grid-3" style={{ marginBottom: 24 }}>
                {[
                  { name: 'API Server', status: 'online', uptime: '99.8%', latency: '45ms', icon: '⚡' },
                  { name: 'MongoDB', status: 'online', uptime: '99.9%', latency: '12ms', icon: '🗄️' },
                  { name: 'Socket.io', status: 'online', uptime: '99.5%', latency: '8ms', icon: '🔌' },
                  { name: 'SMS Service', status: 'online', uptime: '98.2%', latency: '—', icon: '📱' },
                  { name: 'OTP Verification', status: 'online', uptime: '99.1%', latency: '—', icon: '🔐' },
                  { name: 'Notification Queue', status: 'online', uptime: '99.7%', latency: '—', icon: '🔔' },
                ].map((service, i) => (
                  <div key={i} className="glass-card">
                    <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
                      <div className="flex gap-sm items-center">
                        <span style={{ fontSize: '1.4rem' }}>{service.icon}</span>
                        <strong>{service.name}</strong>
                      </div>
                      <span className="badge badge-green">🟢 {service.status}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 24, fontSize: '0.875rem' }}>
                      <div>
                        <div style={{ color: 'var(--color-success)', fontWeight: 700 }}>{service.uptime}</div>
                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Uptime</div>
                      </div>
                      {service.latency !== '—' && (
                        <div>
                          <div style={{ fontWeight: 700 }}>{service.latency}</div>
                          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Latency</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── GEMINI AI LIVE HUB ── */}
          {activeTab === 'ai-live' && (
            <HackathonLiveHub />
          )}
        </div>
      </main>
    </div>
  )
}
