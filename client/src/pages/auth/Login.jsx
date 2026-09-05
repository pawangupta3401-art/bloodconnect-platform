import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { apiCall, saveAuthToken } from '../../config/api'
import BloodNetwork3D from '../../components/BloodNetwork3D'
import { ArrowLeft, ShieldCheck, Zap, Heart, MapPin, Bell, CheckCircle2 } from 'lucide-react'
import './Auth.css'

const ROLES = [
  { id: 'admin',          icon: '🛡️', label: 'Platform Admin',       desc: 'Full Central Command & Policy' },
  { id: 'blood-bank',     icon: '🏦', label: 'Blood Bank Admin',      desc: 'Cold-Chain & Bank Inventory' },
  { id: 'hospital',       icon: '🏥', label: 'Hospital Staff',        desc: 'Emergency Trauma & Request Triage' },
  { id: 'auditor',        icon: '📋', label: 'Auditor (Read-Only)',   desc: 'Compliance & Audit Trail' },
  { id: 'health-officer', icon: '🏛️', label: 'Health Officer',        desc: 'Regional & Public Health Oversight' },
  { id: 'donor',          icon: '🩸', label: 'Donor',                 desc: 'Voluntary Life Hero' },
]

// Demo credentials per role
const DEMO_CREDS = {
  admin:          { email: 'admin@bloodconnect.in',     password: 'demo123' },
  'blood-bank':   { email: 'bank@bloodconnect.in',      password: 'demo123' },
  hospital:       { email: 'hospital@bloodconnect.in',  password: 'demo123' },
  auditor:        { email: 'auditor@bloodconnect.in',   password: 'demo123' },
  'health-officer':{ email: 'officer@bloodconnect.in',  password: 'demo123' },
  donor:          { email: 'donor@bloodconnect.in',     password: 'demo123' },
}

// Fallback demo users for offline/demo mode
const DEMO_USERS = {
  'admin@bloodconnect.in':    { id: 'demo-admin-001',   name: 'Dr. S. Sharma', role: 'admin', city: 'Nagpur', title: 'Nagpur Regional Director & Platform Super Admin' },
  'bank@bloodconnect.in':     { id: 'demo-bank-001',    name: 'Ravi Kumar', role: 'blood-bank', bankName: 'Nagpur Central Blood Bank', bankId: 'Bank 01', city: 'Nagpur', title: 'Bio-Bank Medical Director' },
  'hospital@bloodconnect.in': { id: 'demo-hosp-001',    name: 'Dr. Priya Nair', role: 'hospital', hospital: 'AIIMS Nagpur Trauma Center', hospitalId: 'Hosp. 01', city: 'Nagpur', title: 'Chief of Trauma Surgery' },
  'auditor@bloodconnect.in':  { id: 'demo-auditor-001', name: 'CMA Anjali Verma', role: 'auditor', city: 'Nagpur', title: 'Chief Compliance Auditor (SBTC Maharashtra)' },
  'officer@bloodconnect.in':  { id: 'demo-officer-001', name: 'Dr. Rajesh Tope', role: 'health-officer', city: 'Nagpur', title: 'State Health Officer (Public Health Dept)' },
  'donor@bloodconnect.in':    { id: 'demo-donor-001',   name: 'Pawan Deepak Gupta', role: 'donor', bloodGroup: 'O+', trustScore: 92, city: 'Nagpur', eligible: true },
}

const ROLE_ROUTES = {
  admin: '/grid',
  'blood-bank': '/grid',
  hospital: '/grid',
  auditor: '/grid',
  'health-officer': '/grid',
  donor: '/donor',
}

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [selectedRole, setSelectedRole] = useState('donor')
  const [email, setEmail]       = useState(DEMO_CREDS['donor'].email)
  const [password, setPassword] = useState(DEMO_CREDS['donor'].password)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  // Location & Notification Permission States
  const [locGranted, setLocGranted] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem('bloodconnect_loc_permission') === 'granted'
  )
  const [notifGranted, setNotifGranted] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem('bloodconnect_notif_permission') === 'granted'
  )

  const handleRequestPerms = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocGranted(true)
          localStorage.setItem('bloodconnect_loc_permission', 'granted')
          localStorage.setItem('bloodconnect_user_coords', JSON.stringify({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            city: 'Nagpur & Vicinity'
          }))
        },
        () => {
          setLocGranted(false)
          localStorage.setItem('bloodconnect_loc_permission', 'denied')
        },
        { enableHighAccuracy: true, timeout: 6000 }
      )
    }
    if ('Notification' in window) {
      Notification.requestPermission().then((res) => {
        if (res === 'granted') {
          setNotifGranted(true)
          localStorage.setItem('bloodconnect_notif_permission', 'granted')
        }
      }).catch(() => {})
    }
  }

  // Fill demo credentials on role change
  const selectRole = (roleId) => {
    setSelectedRole(roleId)
    setEmail(DEMO_CREDS[roleId].email)
    setPassword(DEMO_CREDS[roleId].password)
    setError('')
  }

  const doLogin = async (emailVal, passVal) => {
    setLoading(true)
    setError('')

    // 1. Try real API
    const { ok, data, networkError } = await apiCall('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: emailVal, password: passVal, role: selectedRole }),
    })

    if (ok && data?.success) {
      if (data.token) saveAuthToken(data.token)
      login(data.user)
      navigate(ROLE_ROUTES[data.user.role] || '/')
      setLoading(false)
      return
    }

    // 2. Demo fallback
    const demoUser = DEMO_USERS[emailVal]
    if (demoUser) {
      login(demoUser)
      navigate(ROLE_ROUTES[demoUser.role] || '/')
      setLoading(false)
      return
    }

    // 3. Generic demo
    if (networkError || !ok) {
      const fallback = DEMO_USERS[DEMO_CREDS[selectedRole].email] || {
        id: 'demo-user',
        name: 'Demo User',
        role: selectedRole,
        bloodGroup: 'O+'
      }
      login(fallback)
      navigate(ROLE_ROUTES[selectedRole] || '/')
      setLoading(false)
      return
    }

    setError(data?.error || 'Invalid credentials. Try the Demo Login button.')
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await doLogin(email, password)
  }

  const handleDemoLogin = async () => {
    const creds = DEMO_CREDS[selectedRole]
    setEmail(creds.email)
    setPassword(creds.password)
    await doLogin(creds.email, creds.password)
  }

  return (
    <div className="auth-page">
      <div className="auth-container split-screen">
        {/* Left Panel: 3D Animated Blood Network (45% Width) */}
        <div className="auth-3d-visual-panel">
          <div className="auth-visual-header">
            <Link to="/" className="auth-logo-link">
              <div className="auth-logo-icon">🩸</div>
              <div>
                <div className="auth-logo-title">Blood<span style={{ color: '#DC2626' }}>Connect</span></div>
                <div className="auth-logo-subtitle">National LifeStream Grid</div>
              </div>
            </Link>
          </div>

          {/* Dedicated Three.js 3D Canvas */}
          <BloodNetwork3D className="auth-3d-canvas" />

          {/* Quick Metrics at Bottom of Visual Panel */}
          <div className="auth-visual-footer">
            <div className="auth-stat-mini">
              <strong>48,000+</strong>
              <span>Verified Donors</span>
            </div>
            <div className="auth-stat-divider" />
            <div className="auth-stat-mini">
              <strong>156</strong>
              <span>Connected Banks</span>
            </div>
            <div className="auth-stat-divider" />
            <div className="auth-stat-mini">
              <strong>&lt; 5 mins</strong>
              <span>Emergency Response</span>
            </div>
          </div>
        </div>

        {/* Right Panel: Clean, High-Contrast Login Form */}
        <div className="auth-form-panel">
          <div className="auth-form-inner">
            <div className="auth-form-top-nav">
              <Link to="/" className="btn-back-home">
                <ArrowLeft size={16} /> Back to Homepage
              </Link>
            </div>

            <div className="auth-header-block">
              <div className="auth-badge-pill">
                <ShieldCheck size={14} color="#059669" />
                <span>Secure Multi-Role Access</span>
              </div>
              <h1 className="auth-main-title">Sign In to BloodConnect</h1>
              <p className="auth-main-subtitle">
                Select your platform role to access real-time inventory, emergency alerts, and verified donation records.
              </p>
            </div>

            {/* Role Switcher Grid */}
            <div className="auth-role-selector">
              <label className="auth-role-label">Choose Role / Portal</label>
              <div className="auth-role-grid">
                {ROLES.map(role => (
                  <button
                    key={role.id}
                    id={`role-${role.id}`}
                    type="button"
                    className={`auth-role-card ${selectedRole === role.id ? 'active' : ''}`}
                    onClick={() => selectRole(role.id)}
                  >
                    <span className="role-card-icon">{role.icon}</span>
                    <span className="role-card-label">{role.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Demo Pill Helper */}
            <div className="auth-demo-helper" onClick={handleDemoLogin} title="Click to auto-fill and sign in">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Zap size={14} color="#D97706" />
                  <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.78rem' }}>Demo Account Loaded:</span>
                </div>
                <span className="auth-demo-email" style={{ fontWeight: 700 }}>{DEMO_USERS[DEMO_CREDS[selectedRole].email]?.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: '#64748B' }}>
                <span>{DEMO_CREDS[selectedRole].email}</span>
                <span style={{ color: '#0284C7', fontWeight: 600 }}>{DEMO_USERS[DEMO_CREDS[selectedRole].email]?.title || ROLES.find(r => r.id === selectedRole)?.desc}</span>
              </div>
            </div>

            {/* Login Form */}
            <form id="login-form" onSubmit={handleSubmit} className="auth-login-form">
              <div className="form-group">
                <label className="form-label" htmlFor="login-email">Email or Verified Phone</label>
                <input
                  id="login-email"
                  type="email"
                  className="form-input"
                  placeholder="name@bloodconnect.in"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="form-label" htmlFor="login-password" style={{ margin: 0 }}>Password / Passcode</label>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Default: <code>demo123</code></span>
                </div>
                <input
                  id="login-password"
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && <div className="alert alert-danger">{error}</div>}

              {/* Location & Notification Permission Status */}
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '10px 12px',
                marginBottom: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={14} color="#DC2626" />
                    Emergency Dispatch Permissions:
                  </span>
                  {(!locGranted || !notifGranted) && (
                    <button
                      type="button"
                      onClick={handleRequestPerms}
                      style={{
                        background: '#DC2626',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Enable Access
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '14px', fontSize: '0.74rem', color: '#475569' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} color={locGranted ? '#16A34A' : '#94A3B8'} />
                    Location: <strong style={{ color: locGranted ? '#16A34A' : '#64748B' }}>{locGranted ? 'Active (Nagpur)' : 'Prompt on Login'}</strong>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Bell size={12} color={notifGranted ? '#16A34A' : '#94A3B8'} />
                    SOS Updates: <strong style={{ color: notifGranted ? '#16A34A' : '#64748B' }}>{notifGranted ? 'Active' : 'Prompt on Login'}</strong>
                  </span>
                </div>
              </div>

              <button id="login-submit-btn" type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
                {loading ? <span className="loading-spinner" /> : `Sign In as ${ROLES.find(r => r.id === selectedRole)?.label} →`}
              </button>
            </form>

            <div className="auth-or-divider">
              <span>OR 1-CLICK TEST</span>
            </div>

            <button
              id="demo-login-btn"
              type="button"
              className="btn btn-secondary w-full"
              onClick={handleDemoLogin}
              disabled={loading}
            >
              ⚡ Instant 1-Click Demo Login
            </button>

            <div className="auth-footer-links">
              <p className="auth-register-text">
                Don't have an account? <Link to="/register" className="auth-brand-link">Register as Donor / Hospital</Link>
              </p>
              <Link to="/sos" className="auth-emergency-link">
                🆘 Need Blood Urgently? Launch Emergency SOS
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
