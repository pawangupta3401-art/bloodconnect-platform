import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import { apiCall } from '../config/api'
import InventoryHeatmapMatrix from '../components/InventoryHeatmapMatrix'
import CrossSectorBloodBridge from '../components/CrossSectorBloodBridge'
import {
  LayoutDashboard, Droplet, AlertTriangle, Sliders, LogOut,
  Clock, Building2, AlertCircle, ArrowLeftRight, CheckCircle2, FileText
} from 'lucide-react'
import './Portal.css'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']

// e-RaktKosh 14 component types (exact government naming for immediate recognizability)
const ERAKTKOSH_COMPONENTS = [
  'Whole Blood',
  'Packed Red Blood Cells',
  'Sagm Packed Red Blood Cells',
  'Irradiated RBC',
  'Leukoreduced RBC',
  'Fresh Frozen Plasma',
  'Cryo Poor Plasma',
  'Cryoprecipitate',
  'Plasma',
  'Single Donor Plasma',
  'Platelet Concentrate',
  'Platelet Rich Plasma',
  'Random Donor Platelets',
  'Single Donor Platelet',
]

// Expiry days per component type (NACO / NABH clinical standards)
const COMPONENT_EXPIRY_DAYS = {
  'Whole Blood': 42, 'Packed Red Blood Cells': 42, 'Sagm Packed Red Blood Cells': 42,
  'Irradiated RBC': 42, 'Leukoreduced RBC': 42,
  'Fresh Frozen Plasma': 365, 'Cryo Poor Plasma': 365, 'Cryoprecipitate': 365,
  'Plasma': 365, 'Single Donor Plasma': 365,
  'Platelet Concentrate': 5, 'Platelet Rich Plasma': 5,
  'Random Donor Platelets': 5, 'Single Donor Platelet': 5,
}

const now = Date.now()
const INITIAL_INVENTORY = [
  { group: 'A+',  wholeBlood: 45, plasma: 22, platelets: 12, expirySoon: 3, status: 'normal',   lastUpdated: new Date(now - 2 * 3600000) },
  { group: 'A-',  wholeBlood: 8,  plasma: 5,  platelets: 2,  expirySoon: 0, status: 'low',      lastUpdated: new Date(now - 1 * 3600000) },
  { group: 'B+',  wholeBlood: 34, plasma: 18, platelets: 9,  expirySoon: 2, status: 'normal',   lastUpdated: new Date(now - 3 * 3600000) },
  { group: 'B-',  wholeBlood: 4,  plasma: 2,  platelets: 1,  expirySoon: 1, status: 'critical', lastUpdated: new Date(now - 27 * 3600000) }, // STALE DEMO
  { group: 'O+',  wholeBlood: 67, plasma: 31, platelets: 15, expirySoon: 5, status: 'high',     lastUpdated: new Date(now - 1 * 3600000) },
  { group: 'O-',  wholeBlood: 11, plasma: 6,  platelets: 3,  expirySoon: 0, status: 'low',      lastUpdated: new Date(now - 4 * 3600000) },
  { group: 'AB+', wholeBlood: 23, plasma: 11, platelets: 6,  expirySoon: 1, status: 'normal',   lastUpdated: new Date(now - 2 * 3600000) },
  { group: 'AB-', wholeBlood: 3,  plasma: 1,  platelets: 0,  expirySoon: 0, status: 'critical', lastUpdated: new Date(now - 30 * 3600000) }, // STALE DEMO
]

// Helper: format relative time for lastUpdated display
function formatLastUpdated(dateVal) {
  if (!dateVal) return 'Unknown'
  const diffMs = Date.now() - new Date(dateVal).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`
  const days = Math.floor(hrs / 24)
  return `${days} day${days !== 1 ? 's' : ''} ago`
}

function isStale(dateVal) {
  if (!dateVal) return true
  return Date.now() - new Date(dateVal).getTime() > 24 * 3600000
}

const EXPIRING_UNITS = [
  { id: 'U001', group: 'O+', component: 'Whole Blood', collected: '25 Jul 2026', expiry: '01 Sep 2026', daysLeft: 5, bank: 'Self' },
  { id: 'U002', group: 'B-', component: 'Plasma',      collected: '28 Jul 2026', expiry: '03 Sep 2026', daysLeft: 7, bank: 'Self' },
  { id: 'U003', group: 'A+', component: 'Platelets',   collected: '01 Aug 2026', expiry: '06 Sep 2026', daysLeft: 10, bank: 'Self' },
]

const TRANSFER_REQUESTS = [
  { id: 'TR001', from: 'Apollo Hospital',   group: 'O-', units: 3, status: 'pending',  time: '1 hour ago' },
  { id: 'TR002', from: 'Hinduja Hospital',  group: 'B+', units: 5, status: 'approved', time: '2 days ago' },
]

const NAV_ITEMS = [
  { id: 'dashboard',      icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'inventory',      icon: Droplet,         label: 'Inventory' },
  { id: 'redistribution', icon: ArrowLeftRight,  label: 'Redistribution Engine' },
  { id: 'confirm',        icon: CheckCircle2,    label: 'Confirm Donation' },
  { id: 'expiry',         icon: AlertCircle,     label: 'Expiry Alerts' },
  { id: 'rare-stock',     icon: Droplet,         label: 'Rare Phenotype Bank' },
  { id: 'chronic-stock',  icon: Building2,       label: 'Chronic Reservations' },
  { id: 'transfers',      icon: ArrowLeftRight,  label: 'Transfer Requests' },
  { id: 'settings',       icon: Sliders,         label: 'Alert Settings' },
]

export default function BloodBankPortal() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { socket, isConnected } = useSocket()

  const [activeTab, setActiveTab]       = useState('dashboard')
  const [inventory, setInventory]       = useState(INITIAL_INVENTORY)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newStock, setNewStock]         = useState({ group: '', component: 'Whole Blood', units: '', collectionDate: '' })
  const [addingStock, setAddingStock]   = useState(false)
  const [stockToast, setStockToast]     = useState(null)
  const [threshold, setThreshold]       = useState({ 'A+': 10, 'B+': 10, 'O+': 15, 'O-': 5 })

  // Redistribution Suggestions state
  const [suggestions, setSuggestions]   = useState([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  // Confirm Donation form state
  const [confirmForm, setConfirmForm]   = useState({ donorName: '', donorId: '', bloodGroup: 'O+', requestId: '', units: '1', notes: '' })
  const [confirming, setConfirming]     = useState(false)
  const [confirmResult, setConfirmResult] = useState(null)

  const bankName = user?.bankName || 'LifeSource Blood Bank'
  const city     = user?.city || 'Delhi'

  const totalUnits   = inventory.reduce((sum, i) => sum + i.wholeBlood + i.plasma + i.platelets, 0)
  const criticalCount = inventory.filter(i => i.status === 'critical').length
  const expiryCount  = inventory.reduce((sum, i) => sum + i.expirySoon, 0)

  const showToast = (msg, type = 'success') => {
    setStockToast({ msg, type })
    setTimeout(() => setStockToast(null), 4000)
  }

  // ── Add Stock → real API call ──
  const handleAddStock = useCallback(async () => {
    if (!newStock.group || !newStock.units || !newStock.collectionDate) return
    setAddingStock(true)

    const { ok, data } = await apiCall('/api/v1/inventory', {
      method: 'POST',
      body: JSON.stringify({
        bankId:         user?.id || 'demo-bank-001',
        bloodGroup:     newStock.group,
        componentType:  newStock.component,
        units:          parseInt(newStock.units),
        collectionDate: newStock.collectionDate,
      }),
    })

    // Update local inventory state regardless of API success (demo resilience)
    setInventory(prev => prev.map(item =>
      item.group === newStock.group
        ? { ...item,
            wholeBlood: item.wholeBlood + (newStock.component === 'Whole Blood' ? parseInt(newStock.units) : 0),
            plasma: item.plasma + (['Plasma', 'Fresh Frozen Plasma', 'Cryo Poor Plasma', 'Single Donor Plasma'].includes(newStock.component) ? parseInt(newStock.units) : 0),
            platelets: item.platelets + (['Platelet Concentrate', 'Platelet Rich Plasma', 'Random Donor Platelets', 'Single Donor Platelet'].includes(newStock.component) ? parseInt(newStock.units) : 0),
            lastUpdated: new Date()
          }
        : item
    ))

    // Emit socket update
    if (socket && isConnected) {
      socket.emit('inventory-update', {
        bankId: user?.id || 'demo-bank-001',
        bankName,
        bloodGroup: newStock.group,
        componentType: newStock.component,
        unitsAdded: parseInt(newStock.units),
      })
    }

    showToast(`✅ Added ${newStock.units} units of ${newStock.group} ${newStock.component}`)
    setShowAddModal(false)
    setNewStock({ group: '', component: 'Whole Blood', units: '', collectionDate: '' })
    setAddingStock(false)
  }, [newStock, user, bankName, socket, isConnected])

  // ── Confirm Donation → POST /api/v1/donations/:id/confirm ──
  const handleConfirmDonation = useCallback(async () => {
    if (!confirmForm.donorName || !confirmForm.bloodGroup) return
    setConfirming(true)
    setConfirmResult(null)

    const donationId = confirmForm.requestId || `DON-${Date.now()}`

    const { ok, data } = await apiCall(`/api/v1/donations/${donationId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({
        donorId:    confirmForm.donorId || `donor-${Date.now()}`,
        donorName:  confirmForm.donorName,
        donorPhone: '+91 00000 00000',
        bloodGroup: confirmForm.bloodGroup,
        units:      parseInt(confirmForm.units) || 1,
        bankName,
        notes:      confirmForm.notes,
        confirmedBy: user?.name || 'Bank Admin',
      }),
    })

    // Admin route fallback
    if (!ok || !data?.certificateId) {
      const { data: adminData } = await apiCall(`/api/v1/admin/donations/${donationId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ confirmedBy: user?.name || 'Bank Admin', donorName: confirmForm.donorName }),
      }).catch(() => ({ data: null }))

      const certId = adminData?.certificateId || `BC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
      setConfirmResult({ certificateId: certId, demo: true, trustScoreUpdate: { newScore: 87 + 10 } })
    } else {
      setConfirmResult(data)
    }

    setConfirming(false)
  }, [confirmForm, bankName, user])

  // ── Proactive Redistribution Engine Data Loading & Socket Listener ──
  const fetchSuggestions = useCallback(async () => {
    setLoadingSuggestions(true)
    const { ok, data } = await apiCall('/api/v1/redistribution/suggestions')
    if (ok && data?.suggestions) {
      setSuggestions(data.suggestions)
    } else {
      // Demo fallback suggestions
      setSuggestions([
        {
          id: 'RS-DEMO-1',
          sourceBankName: 'LifeSource Blood Bank',
          sourceBankCity: 'Delhi',
          targetBankName: 'Red Cross Center',
          targetBankCity: 'Mumbai',
          bloodGroup: 'B+',
          unitsSuggested: 8,
          daysToExpiry: 3,
          distanceKm: 12.4,
          reason: 'urgent-expiry',
          status: 'pending',
        },
        {
          id: 'RS-DEMO-2',
          sourceBankName: 'Hinduja Blood Center',
          sourceBankCity: 'Mumbai',
          targetBankName: 'Apollo Hospital Bank',
          targetBankCity: 'Mumbai',
          bloodGroup: 'O-',
          unitsSuggested: 4,
          daysToExpiry: 4,
          distanceKm: 5.2,
          reason: 'expiry',
          status: 'pending',
        },
      ])
    }
    setLoadingSuggestions(false)
  }, [])

  useEffect(() => {
    fetchSuggestions()

    if (!socket) return
    const handleNewSuggestions = (data) => {
      console.log('♻️ Live redistribution suggestion received:', data)
      showToast(`♻️ Proactive Redistribution: ${data.count || 1} new transfer suggested!`, 'success')
      fetchSuggestions()
    }
    const handleAcceptedTransfer = (data) => {
      showToast(`🚚 Inter-bank transfer accepted: ${data.message || ''}`, 'success')
      fetchSuggestions()
    }

    socket.on('redistribution:new', handleNewSuggestions)
    socket.on('redistribution:accepted', handleAcceptedTransfer)

    return () => {
      socket.off('redistribution:new', handleNewSuggestions)
      socket.off('redistribution:accepted', handleAcceptedTransfer)
    }
  }, [socket, fetchSuggestions])

  const handleUpdateSuggestionStatus = async (id, status) => {
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status } : s))
    const { ok } = await apiCall(`/api/v1/redistribution/suggestions/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    })
    if (status === 'accepted') {
      showToast('✅ Transfer accepted! Units marked as reserved for courier dispatch.')
    } else {
      showToast('Suggestion dismissed.')
    }
  }

  return (
    <div className="portal-layout">
      {/* Stock/Donation Toast */}
      {stockToast && (
        <div style={{
          position: 'fixed', top: 80, right: 24, zIndex: 99998,
          background: stockToast.type === 'success' ? 'linear-gradient(135deg, #0d1f0d, #052005)' : 'linear-gradient(135deg, #1a0010, #300020)',
          border: `1px solid ${stockToast.type === 'success' ? 'rgba(0,230,118,0.5)' : 'rgba(255,23,68,0.5)'}`,
          borderRadius: 12, padding: '14px 18px', maxWidth: 340, color: '#fff',
          boxShadow: '0 10px 40px rgba(0,0,0,0.6)', animation: 'fadeIn 0.4s ease',
        }}>
          <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{stockToast.msg}</div>
        </div>
      )}

      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon"><Building2 size={24} color="#ff4757" /></div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{bankName}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Blood Bank Portal</div>
          </div>
        </div>

        <div className="sidebar-user">
          <div className="avatar">{(user?.name || 'Ravi Kumar').split(' ').map(n => n[0]).join('').slice(0,2)}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{user?.name || 'Ravi Kumar'}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Bank Admin • {city}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            return (
              <button key={item.id} id={`bank-nav-${item.id}`}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}>
                <Icon size={20} />
                <span>{item.label}</span>
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
            <div className="eligibility-badge not-eligible">🚨 {criticalCount} blood group(s) critical!</div>
          </div>
        )}
      </aside>

      <main className="portal-main">
        <header className="portal-header">
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{NAV_ITEMS.find(n => n.id === activeTab)?.label}</h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{bankName} • {city}</p>
          </div>
          <div className="flex gap-md items-center">
            {expiryCount > 0 && <span className="badge badge-yellow">⚠️ {expiryCount} expiring soon</span>}
            <button id="add-stock-btn" className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>+ Add Stock</button>
          </div>
        </header>

        <div className="portal-content">
          {/* ── DASHBOARD ── */}
          {activeTab === 'dashboard' && (
            <div className="animate-fade-in">
              {criticalCount > 0 && (
                <div className="alert alert-danger" style={{ marginBottom: 24 }}>
                  🚨 <strong>{criticalCount} blood groups</strong> are critically low! Immediate action required.
                </div>
              )}

              <div className="grid-4" style={{ marginBottom: 24 }}>
                {[
                  { icon: Droplet,       label: 'Total Units',        value: totalUnits,   borderClass: 'border-red',    bgClass: 'red' },
                  { icon: AlertTriangle, label: 'Critical Groups',    value: criticalCount, borderClass: 'border-red',    bgClass: 'red', criticalBadge: criticalCount > 0 ? `${criticalCount} Low` : null },
                  { icon: Clock,         label: 'Expiring Soon',      value: expiryCount,  borderClass: 'border-blue',   bgClass: 'orange' },
                  { icon: ArrowLeftRight,label: 'Transfer Requests',  value: TRANSFER_REQUESTS.filter(t => t.status === 'pending').length, borderClass: 'border-purple', bgClass: 'blue' },
                ].map((s, i) => {
                  const Icon = s.icon
                  return (
                    <div key={i} className={`stat-card ${s.borderClass}`}>
                      <div className="stat-card-top">
                        <div className="stat-label-muted">{s.label}</div>
                        <div className={`stat-icon-circle ${s.bgClass}`}><Icon size={20} /></div>
                      </div>
                      <div className="stat-card-main">
                        <span className="stat-number-hero">{s.value}</span>
                        {s.criticalBadge && <span className="stat-critical-badge">🚨 {s.criticalBadge}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="glass-card" style={{ marginBottom: 24 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 16 }}>🩸 Blood Group Overview</h3>
                <div className="blood-groups-mini-grid">
                  {inventory.map(item => (
                    <div key={item.group} className={`blood-mini-card status-${item.status}`}>
                      <div className="blood-badge" style={{ width: 36, height: 36, fontSize: '0.75rem', margin: '0 auto 8px' }}>{item.group}</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{item.wholeBlood + item.plasma + item.platelets}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>units</div>
                      {item.expirySoon > 0 && <div style={{ fontSize: '0.7rem', color: 'var(--color-warning)' }}>⚠️ {item.expirySoon} expiring</div>}
                      <div className={`mini-status badge-${item.status === 'high' ? 'green' : item.status === 'normal' ? 'blue' : item.status === 'low' ? 'yellow' : 'red'}`}>
                        {item.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {TRANSFER_REQUESTS.filter(t => t.status === 'pending').length > 0 && (
                <div className="glass-card">
                  <h3 style={{ fontWeight: 700, marginBottom: 16 }}>🔄 Pending Transfer Requests</h3>
                  {TRANSFER_REQUESTS.filter(t => t.status === 'pending').map(tr => (
                    <div key={tr.id} className="alert-row">
                      <div className="flex justify-between items-center">
                        <div>
                          <strong>{tr.from}</strong> requests <span className="blood-badge" style={{ width: 28, height: 28, fontSize: '0.65rem', display: 'inline-flex' }}>{tr.group}</span> × {tr.units} units
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{tr.time}</div>
                        </div>
                        <div className="flex gap-sm">
                          <button className="btn btn-success btn-sm" onClick={() => showToast(`✅ Transfer to ${tr.from} approved!`)}>Approve</button>
                          <button className="btn btn-secondary btn-sm">Decline</button>
                          {/* ⚡ Fast Drone Transport entry point — Blood Bank Portal: Dashboard pending transfer row */}
                          <button
                            id={`dashboard-drone-btn-${tr.id}`}
                            className="btn btn-sm"
                            style={{
                              background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                              color: '#fff', border: 'none', borderRadius: 8,
                              padding: '6px 12px', fontWeight: 700, fontSize: '0.75rem',
                              cursor: 'pointer', boxShadow: '0 2px 8px rgba(6,182,212,0.3)',
                              whiteSpace: 'nowrap',
                            }}
                            onClick={() => navigate(`/drone-transport?group=${tr.group}&units=${tr.units}&requestId=${tr.id}&fromId=Bank 01&toId=Hosp. 01`)}
                          >
                            ⚡ Drone
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── INVENTORY ── */}
          {activeTab === 'inventory' && (
            <div className="animate-fade-in">
              <InventoryHeatmapMatrix />

              {/* ── Staleness Reminder Banner (shown when ANY row is stale) ── */}
              {inventory.some(i => isStale(i.lastUpdated)) && (
                <div style={{
                  marginBottom: 16, padding: '12px 18px',
                  borderRadius: 10, background: '#fffbeb',
                  border: '1.5px solid #f59e0b', color: '#92400e',
                  display: 'flex', alignItems: 'center', gap: 12,
                  fontSize: '0.875rem', fontWeight: 600
                }}>
                  <span style={{ fontSize: '1.2rem' }}>📋</span>
                  <div>
                    <strong>You haven't updated your inventory today</strong> — some entries are over 24 hours old.
                    Keep the network accurate for donors and hospitals.
                    <button
                      onClick={() => setShowAddModal(true)}
                      style={{ marginLeft: 12, background: '#f59e0b', color: '#fff', border: 'none',
                        borderRadius: 6, padding: '4px 12px', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      Update Now →
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
                <div>
                  <h2 className="section-title">Complete Inventory</h2>
                  <p className="section-subtitle">All blood groups and components — e-RaktKosh 14-type standard</p>
                </div>
                <button id="add-inventory-btn" className="btn btn-primary" onClick={() => setShowAddModal(true)}>+ Add Stock</button>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Blood Group</th>
                      <th>Whole Blood (Units)</th>
                      <th>Plasma (Units)</th>
                      <th>Platelets (Units)</th>
                      <th>Expiring Soon</th>
                      <th>Status</th>
                      <th>Last Updated</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map(item => (
                      <tr key={item.group}>
                        <td><span className="blood-badge" style={{ width: 36, height: 36, fontSize: '0.75rem' }}>{item.group}</span></td>
                        <td style={{ fontWeight: 700 }}>{item.wholeBlood}</td>
                        <td>{item.plasma}</td>
                        <td>{item.platelets}</td>
                        <td>
                          {item.expirySoon > 0
                            ? <span className="badge badge-yellow">⚠️ {item.expirySoon} units</span>
                            : <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                          }
                        </td>
                        <td>
                          <span className={`badge ${item.status === 'high' ? 'badge-green' : item.status === 'normal' ? 'badge-blue' : item.status === 'low' ? 'badge-yellow' : 'badge-red'}`}>
                            {item.status.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                          {isStale(item.lastUpdated) ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#b45309', background: '#fef3c7', borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>
                              ⚠️ Stale · {formatLastUpdated(item.lastUpdated)}
                            </span>
                          ) : (
                            <span style={{ color: '#059669', fontWeight: 600 }}>🔄 {formatLastUpdated(item.lastUpdated)}</span>
                          )}
                        </td>
                        <td>
                          <div className="flex gap-sm">
                            <button className="btn btn-secondary btn-sm" onClick={() => {
                              setNewStock(p => ({ ...p, group: item.group }))
                              setShowAddModal(true)
                            }}>Update</button>
                            {/* ⚡ Fast Drone Transport entry point — Blood Bank Portal: Inventory tab dispatch shortcut for critical/low groups */}
                            {(item.status === 'critical' || item.status === 'low') && (
                              <button
                                id={`inv-drone-btn-${item.group}`}
                                className="btn btn-sm"
                                style={{
                                  background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                                  color: '#fff', border: 'none', borderRadius: 8,
                                  padding: '5px 10px', fontWeight: 700, fontSize: '0.73rem',
                                  cursor: 'pointer', whiteSpace: 'nowrap',
                                  boxShadow: '0 2px 6px rgba(6,182,212,0.25)',
                                }}
                                onClick={() => navigate(`/drone-transport?group=${item.group}&units=2&fromId=Bank 01&toId=Hosp. 01`)}
                                title="Dispatch this blood group via fast drone transport"
                              >
                                ⚡ Drone
                              </button>
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

          {/* ── REDISTRIBUTION ENGINE (Feature 1) ── */}
          {activeTab === 'redistribution' && (
            <div className="animate-fade-in">
              {/* ── SPECIALIZED CROSS-SECTOR BLOOD BRIDGE VIEW ── */}
              <CrossSectorBloodBridge isAdmin={false} onSuggestionUpdate={fetchSuggestions} />

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
                      ♻️ Facility Proactive Redistribution Ledger
                    </h2>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
                      Rule-based system automatically matches near-expiry stock with nearby facilities (&lt;25 km) facing low reserves.
                    </p>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={fetchSuggestions}
                    disabled={loadingSuggestions}
                  >
                    {loadingSuggestions ? 'Scanning...' : '🔄 Refresh Scan'}
                  </button>
                </div>
              </div>

              {suggestions.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '40px 20px', color: '#475569' }}>
                  ✅ No urgent redistribution needed. All regional inventory is within balanced safety thresholds.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {suggestions.map(s => {
                    const isCrossSector = s.cross_sector || (s.sourceBankType === 'government' && (s.targetBankType === 'private' || s.targetBankType === 'trust_run'))
                    const isAccepted = s.status === 'accepted'
                    const isRejected = s.status === 'rejected'
                    return (
                      <div
                        key={s.id}
                        className="glass-card"
                        style={{
                          borderLeft: `4px solid ${isCrossSector ? '#a855f7' : s.reason === 'urgent-expiry' ? '#ff1744' : '#38bdf8'}`,
                          background: isAccepted ? 'rgba(0, 230, 118, 0.05)' : isCrossSector ? 'rgba(168, 85, 247, 0.05)' : undefined,
                          borderColor: isAccepted ? 'rgba(0, 230, 118, 0.3)' : undefined,
                          transition: 'all 0.3s ease',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                              <span className="badge badge-blue" style={{ fontFamily: 'monospace' }}>#{s.id}</span>
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
                                {s.reason === 'urgent-expiry' ? '🚨 Expiry Risk (< 3 Days)' : '⏳ Near-Expiry Balance'}
                              </span>
                              <span className="blood-badge" style={{ width: 28, height: 28, fontSize: '0.65rem' }}>{s.bloodGroup}</span>
                              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f1f5f9' }}>
                                Suggested: {s.unitsSuggested} Units
                              </span>
                            </div>

                            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', marginTop: 4 }}>
                              <span style={{ color: '#38bdf8' }}>{s.sourceBankName}</span>
                              <span style={{ color: '#64748b', margin: '0 8px' }}>➔</span>
                              <span style={{ color: '#00E676' }}>{s.targetBankName}</span>
                            </div>

                            <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: 6 }}>
                              📍 Distance: <strong>{s.distanceKm} km</strong> • Expiry in <strong>{s.daysToExpiry} days</strong> at source bank
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {isAccepted ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#00E676', fontWeight: 700, fontSize: '0.9rem' }}>
                                <CheckCircle2 size={18} />
                                <span>Transfer Accepted (In Transit)</span>
                              </div>
                            ) : isRejected ? (
                              <span className="badge badge-yellow">Dismissed</span>
                            ) : (
                              <>
                                <button
                                  id={`accept-transfer-${s.id}`}
                                  className="btn btn-success btn-sm"
                                  onClick={() => handleUpdateSuggestionStatus(s.id, 'accepted')}
                                >
                                  ✅ Accept Transfer
                                </button>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleUpdateSuggestionStatus(s.id, 'rejected')}
                                >
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

          {/* ── CONFIRM DONATION ── */}
          {activeTab === 'confirm' && (
            <div className="animate-fade-in">
              {confirmResult ? (
                <div className="glass-card" style={{ maxWidth: 560 }}>
                  <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ fontSize: '4rem', marginBottom: 12 }}>🎉</div>
                    <h2 style={{ fontWeight: 800, fontSize: '1.5rem', marginBottom: 8 }}>Donation Confirmed!</h2>
                    <p style={{ color: 'var(--color-text-muted)' }}>
                      Thank you for confirming. The donor's trust score has been updated.
                    </p>
                  </div>

                  <div className="glass-card" style={{ background: 'rgba(0,230,118,0.06)', borderColor: 'rgba(0,230,118,0.3)', marginBottom: 16 }}>
                    <div className="preview-row">
                      <span style={{ color: 'var(--color-text-muted)' }}>Certificate ID</span>
                      <strong style={{ color: '#00E676', fontFamily: 'monospace', fontSize: '0.85rem' }}>{confirmResult.certificateId}</strong>
                    </div>
                    <div className="preview-row">
                      <span style={{ color: 'var(--color-text-muted)' }}>Donor</span>
                      <strong>{confirmForm.donorName}</strong>
                    </div>
                    <div className="preview-row">
                      <span style={{ color: 'var(--color-text-muted)' }}>Blood Group</span>
                      <span className="blood-badge" style={{ width: 32, height: 32, fontSize: '0.7rem' }}>{confirmForm.bloodGroup}</span>
                    </div>
                    {confirmResult.trustScoreUpdate && (
                      <div className="preview-row">
                        <span style={{ color: 'var(--color-text-muted)' }}>New Trust Score</span>
                        <strong style={{ color: '#00E676' }}>{confirmResult.trustScoreUpdate.newScore || '+10'} pts</strong>
                      </div>
                    )}
                    {confirmResult.ledgerHash && (
                      <div className="preview-row">
                        <span style={{ color: 'var(--color-text-muted)' }}>Ledger Hash</span>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#475569' }}>{String(confirmResult.ledgerHash).slice(0, 20)}…</span>
                      </div>
                    )}
                  </div>

                  {confirmResult.demo && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: 16 }}>
                      💡 Running in demo mode — certificate ID generated client-side
                    </div>
                  )}

                  <button className="btn btn-primary w-full" onClick={() => { setConfirmResult(null); setConfirmForm({ donorName: '', donorId: '', bloodGroup: 'O+', requestId: '', units: '1', notes: '' }) }}>
                    ✅ Confirm Another Donation
                  </button>
                </div>
              ) : (
                <div className="glass-card" style={{ maxWidth: 560 }}>
                  <h2 style={{ fontWeight: 800, marginBottom: 8 }}>✅ Confirm Donation</h2>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: 24 }}>
                    After a donor completes their donation, confirm it here to update their trust score, generate a certificate, and record it on the ledger.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="grid-2">
                      <div className="form-group">
                        <label className="form-label">Donor Name</label>
                        <input id="confirm-donor-name" className="form-input" placeholder="Arjun Sharma"
                          value={confirmForm.donorName} onChange={e => setConfirmForm(p => ({ ...p, donorName: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Blood Group</label>
                        <select id="confirm-blood-group" className="form-select"
                          value={confirmForm.bloodGroup} onChange={e => setConfirmForm(p => ({ ...p, bloodGroup: e.target.value }))}>
                          {BLOOD_GROUPS.map(g => <option key={g}>{g}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid-2">
                      <div className="form-group">
                        <label className="form-label">Request ID (optional)</label>
                        <input id="confirm-request-id" className="form-input" placeholder="ER-001 or leave blank"
                          value={confirmForm.requestId} onChange={e => setConfirmForm(p => ({ ...p, requestId: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Units Donated</label>
                        <input id="confirm-units" type="number" min="1" className="form-input"
                          value={confirmForm.units} onChange={e => setConfirmForm(p => ({ ...p, units: e.target.value }))} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Notes</label>
                      <textarea className="form-input" style={{ minHeight: 70 }} placeholder="Any clinical notes..."
                        value={confirmForm.notes} onChange={e => setConfirmForm(p => ({ ...p, notes: e.target.value }))} />
                    </div>

                    <div className="alert alert-info" style={{ fontSize: '0.82rem' }}>
                      🔐 Confirming this donation will: <strong>+10 trust score</strong> for the donor, generate a <strong>certificate ID</strong>, and create a <strong>SHA-256 ledger entry</strong>.
                    </div>

                    <button id="confirm-donation-btn" className="btn btn-success btn-lg w-full"
                      onClick={handleConfirmDonation}
                      disabled={confirming || !confirmForm.donorName || !confirmForm.bloodGroup}>
                      {confirming ? <><span className="loading-spinner" /> Processing...</> : '🩸 Confirm & Generate Certificate'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── EXPIRY ALERTS ── */}
          {activeTab === 'expiry' && (
            <div className="animate-fade-in">
              <div className="alert alert-warning" style={{ marginBottom: 24 }}>
                ⚠️ <strong>{EXPIRING_UNITS.length} units</strong> are expiring within 10 days. Prioritize usage or arrange redistribution.
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Unit ID</th><th>Blood Group</th><th>Component</th>
                      <th>Collected</th><th>Expiry Date</th><th>Days Left</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {EXPIRING_UNITS.map(unit => (
                      <tr key={unit.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{unit.id}</td>
                        <td><span className="blood-badge" style={{ width: 36, height: 36, fontSize: '0.75rem' }}>{unit.group}</span></td>
                        <td>{unit.component}</td>
                        <td>{unit.collected}</td>
                        <td style={{ color: unit.daysLeft <= 5 ? 'var(--color-danger)' : 'var(--color-warning)' }}>{unit.expiry}</td>
                        <td><span className={`badge ${unit.daysLeft <= 5 ? 'badge-red' : 'badge-yellow'}`}>{unit.daysLeft} days</span></td>
                        <td>
                          <div className="flex gap-sm">
                            <button className="btn btn-secondary btn-sm" onClick={() => showToast(`Redistribution request sent for ${unit.id}`)}>Redistribute</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => showToast(`${unit.id} marked as used`)}>Mark Used</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── TRANSFERS ── */}
          {activeTab === 'transfers' && (
            <div className="animate-fade-in">
              {TRANSFER_REQUESTS.map(tr => (
                <div key={tr.id} className="glass-card" style={{ marginBottom: 16 }}>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex gap-sm items-center" style={{ marginBottom: 8 }}>
                        <span className="badge badge-blue">#{tr.id}</span>
                        <span className={`badge ${tr.status === 'pending' ? 'badge-yellow' : 'badge-green'}`}>{tr.status.toUpperCase()}</span>
                      </div>
                      <h3 style={{ fontWeight: 700 }}>From: {tr.from}</h3>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                        Requesting <strong>{tr.units} units</strong> of <span className="blood-badge" style={{ width: 28, height: 28, fontSize: '0.65rem', display: 'inline-flex' }}>{tr.group}</span> • {tr.time}
                      </p>
                    </div>
                    {tr.status === 'pending' && (
                      <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                        <button className="btn btn-success" onClick={() => showToast(`Transfer to ${tr.from} approved!`)}>✅ Approve</button>
                        <button className="btn btn-secondary">❌ Decline</button>
                        {/* ⚡ Fast Drone Transport entry point — Blood Bank Portal: Transfer Requests tab */}
                        <button
                          id={`transfer-drone-btn-${tr.id}`}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                            color: '#fff', border: 'none', borderRadius: 10,
                            padding: '9px 16px', fontWeight: 800, fontSize: '0.82rem',
                            cursor: 'pointer', boxShadow: '0 3px 12px rgba(6,182,212,0.4)',
                            whiteSpace: 'nowrap',
                          }}
                          onClick={() => navigate(`/drone-transport?group=${tr.group}&units=${tr.units}&requestId=${tr.id}&fromId=Bank 01&toId=Hosp. 01`)}
                        >
                          ⚡ Fast Drone Transport
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── SETTINGS ── */}
          {activeTab === 'settings' && (
            <div className="animate-fade-in">
              <div className="glass-card">
                <h3 style={{ fontWeight: 700, marginBottom: 16 }}>⚙️ Low-Stock Alert Thresholds</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: 20 }}>
                  When stock drops below threshold, automatic alerts will be sent.
                </p>
                <div className="grid-4">
                  {Object.entries(threshold).map(([group, val]) => (
                    <div key={group} className="form-group">
                      <label className="form-label">
                        <span className="blood-badge" style={{ width: 24, height: 24, fontSize: '0.6rem', display: 'inline-flex', marginRight: 6 }}>{group}</span>
                        {group} Threshold
                      </label>
                      <input type="number" className="form-input" value={val}
                        onChange={e => setThreshold(prev => ({ ...prev, [group]: parseInt(e.target.value) }))} />
                    </div>
                  ))}
                </div>
                <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => showToast('✅ Thresholds saved!')}>Save Thresholds</button>
              </div>

              <div className="glass-card" style={{ marginTop: 20 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 16 }}>🔔 Notification Preferences</h3>
                {['Email alerts for low stock', 'SMS for critical levels', 'Expiry alerts (5 days before)', 'Transfer request notifications'].map((pref, i) => (
                  <div key={i} className="flex justify-between items-center" style={{ padding: '12px 0', borderBottom: '1px solid var(--glass-border)' }}>
                    <span style={{ fontSize: '0.9rem' }}>{pref}</span>
                    <label className="toggle-switch">
                      <input type="checkbox" defaultChecked />
                      <span className="toggle-track" />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── RARE PHENOTYPE CRYOBANK ── */}
          {activeTab === 'rare-stock' && (
            <div className="animate-fade-in">
              <div className="flex justify-between items-center" style={{ marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>🧬 Rare Antigen Phenotype Cryo-Depot</h2>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                    Dedicated cold-chain inventory for rare blood phenotypes with extended cryopreservation tracking.
                  </p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
                  ➕ Deposit Rare Unit
                </button>
              </div>

              <div className="grid-3" style={{ marginBottom: 24 }}>
                <div className="glass-card">
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Ultra-Rare Units Stored</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#c084fc', marginTop: 4 }}>7 Units</div>
                  <div style={{ fontSize: '0.72rem', color: '#00E676', marginTop: 2 }}>● Cryo-Vault: -80°C Verified</div>
                </div>
                <div className="glass-card">
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Bombay Phenotype ($hh$)</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#FF1744', marginTop: 4 }}>3 Units</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 2 }}>LifeSource (2u), Red Cross (1u)</div>
                </div>
                <div className="glass-card">
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Rare Phenotype Donors on Standby</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#38bdf8', marginTop: 4 }}>14 Donors</div>
                  <div style={{ fontSize: '0.72rem', color: '#00E676', marginTop: 2 }}>GPS & SMS SOS Ready</div>
                </div>
              </div>

              <div className="glass-card table-wrapper">
                <table style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Cryo-Bag ID</th>
                      <th>Rare Phenotype</th>
                      <th>ABO/Rh Equiv</th>
                      <th>Storage Method</th>
                      <th>Collection Date</th>
                      <th>Valid Until</th>
                      <th>National Allocation Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { id: 'CRYO-BOM-091', pheno: 'Bombay (hh / Oh)', eq: 'O (apparent)', method: 'Glycerol Frozen (-80°C)', date: '10 Jun 2026', valid: '10 Jun 2036 (10 yr)', status: 'National Reserve' },
                      { id: 'CRYO-BOM-092', pheno: 'Bombay (hh / Oh)', eq: 'O (apparent)', method: 'PRBC (4°C)', date: '15 Aug 2026', valid: '26 Sep 2026', status: 'Immediate Dispatch' },
                      { id: 'CRYO-DUF-014', pheno: 'Duffy Null [Fy(a-b-)]', eq: 'A+', method: 'PRBC (4°C)', date: '18 Aug 2026', valid: '29 Sep 2026', status: 'Regional Standby' },
                      { id: 'CRYO-KEL-008', pheno: 'Kell Null (K0)', eq: 'B+', method: 'Glycerol Frozen (-80°C)', date: '01 May 2026', valid: '01 May 2036 (10 yr)', status: 'National Reserve' },
                    ].map((u, i) => (
                      <tr key={i}>
                        <td style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{u.id}</td>
                        <td><strong style={{ color: '#c084fc' }}>{u.pheno}</strong></td>
                        <td><span className="blood-badge" style={{ width: 28, height: 28, fontSize: '0.65rem' }}>{u.eq}</span></td>
                        <td style={{ fontSize: '0.8rem', color: '#334155' }}>{u.method}</td>
                        <td style={{ fontSize: '0.8rem', color: '#475569' }}>{u.date}</td>
                        <td style={{ fontSize: '0.8rem', color: '#00E676', fontWeight: 600 }}>{u.valid}</td>
                        <td>
                          <span className={`badge ${u.status === 'Immediate Dispatch' ? 'badge-red' : 'badge-green'}`}>
                            {u.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── CHRONIC PATIENT RESERVATIONS ── */}
          {activeTab === 'chronic-stock' && (
            <div className="animate-fade-in">
              <div className="flex justify-between items-center" style={{ marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>🏥 Chronic Patient Scheduled Reservations</h2>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                    Stock pre-allocation commitments for hospitals managing Thalassemia, Dialysis, and Oncology transfusion regimens.
                  </p>
                </div>
                <span className="badge badge-green" style={{ padding: '6px 14px' }}>
                  ✅ 28 Units Reserved & Isolated
                </span>
              </div>

              <div className="glass-card table-wrapper">
                <table style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Hospital Partner</th>
                      <th>Program</th>
                      <th>Reserved Group</th>
                      <th>Units Locked</th>
                      <th>Transfusion Date</th>
                      <th>Assigned Blood Bags</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { hosp: 'Apollo Hospital Mumbai', prog: 'Thalassemia Day Care', group: 'O+', units: 8, date: 'Tomorrow, 08:30 AM', bags: 'BAG-9810, BAG-9811, BAG-9812' },
                      { hosp: 'KEM Hospital Parel', prog: 'Pediatric Thalassemia', group: 'B+', units: 6, date: 'Friday, 10:00 AM', bags: 'BAG-9820, BAG-9821' },
                      { hosp: 'Tata Memorial Hospital', prog: 'Oncology Platelet Support', group: 'A+', units: 10, date: 'Saturday, 09:00 AM', bags: 'BAG-9830..9839 (Platelets)' },
                      { hosp: 'Hinduja Hospital', prog: 'Renal Dialysis Unit', group: 'O-', units: 4, date: '01 Sep 2026', bags: 'BAG-9840, BAG-9841' },
                    ].map((row, i) => (
                      <tr key={i}>
                        <td><strong>{row.hosp}</strong></td>
                        <td><span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: '#334155' }}>{row.prog}</span></td>
                        <td><span className="blood-badge" style={{ width: 28, height: 28, fontSize: '0.65rem' }}>{row.group}</span></td>
                        <td style={{ fontWeight: 800, color: '#00E676' }}>{row.units} Units</td>
                        <td style={{ fontSize: '0.82rem', color: '#0F172A', fontWeight: 600 }}>{row.date}</td>
                        <td style={{ fontSize: '0.76rem', fontFamily: 'monospace', color: '#475569' }}>{row.bags}</td>
                        <td>
                          <button className="btn btn-secondary btn-sm" onClick={() => alert(`Dispatching locked consignment to ${row.hosp} via cold-chain vehicle.`)}>
                            🚚 Dispatch
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Add Stock Modal ── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontWeight: 800, marginBottom: 8 }}>➕ Add Blood Stock</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: 24 }}>
              Expiry is auto-calculated: Whole Blood = 42 days, Plasma = 365 days, Platelets = 5 days.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Blood Group</label>
                <select id="add-stock-group" className="form-select" value={newStock.group} onChange={e => setNewStock(p => ({ ...p, group: e.target.value }))}>
                  <option value="">Select</option>
                  {BLOOD_GROUPS.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Component Type</label>
                <select id="add-stock-component" className="form-select" value={newStock.component} onChange={e => setNewStock(p => ({ ...p, component: e.target.value }))}>
                  {ERAKTKOSH_COMPONENTS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Units</label>
                <input id="add-stock-units" type="number" className="form-input" placeholder="Enter unit count"
                  value={newStock.units} onChange={e => setNewStock(p => ({ ...p, units: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Collection Date</label>
                <input id="add-stock-date" type="date" className="form-input"
                  value={newStock.collectionDate} onChange={e => setNewStock(p => ({ ...p, collectionDate: e.target.value }))} />
              </div>
              {newStock.collectionDate && (
                <div className="alert alert-info">
                  📅 Expiry Date (auto): <strong>
                    {new Date(new Date(newStock.collectionDate).getTime() +
                      (COMPONENT_EXPIRY_DAYS[newStock.component] || 42) * 86400000
                    ).toLocaleDateString('en-IN')}
                  </strong>
                  <span style={{ marginLeft: 8, fontSize: '0.78rem', color: '#64748b' }}>
                    ({COMPONENT_EXPIRY_DAYS[newStock.component] || 42} day shelf life)
                  </span>
                </div>
              )}
              <div className="flex gap-md">
                <button id="add-stock-submit" className="btn btn-primary flex-1" onClick={handleAddStock} disabled={addingStock || !newStock.group || !newStock.units || !newStock.collectionDate}>
                  {addingStock ? <><span className="loading-spinner" /> Adding...</> : '✅ Add Stock'}
                </button>
                <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
