import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import LocationNotificationPrompt from '../components/LocationNotificationPrompt'
import './Landing.css'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']

const STATS = [
  { number: '2,847', label: 'Lives Saved', suffix: '+' },
  { number: '156', label: 'Blood Banks Connected', suffix: '' },
  { number: '48,200', label: 'Verified Donors', suffix: '+' },
  { number: '< 5', label: 'Mins to Find Blood', suffix: 'min' },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: '🩸',
    title: 'Register & Verify',
    desc: 'Create your profile, verify identity via OTP, and set your blood group and location. Done in under 3 minutes.'
  },
  {
    step: '02',
    icon: '🗺️',
    title: 'Real-Time Matching',
    desc: 'Our engine instantly scans all connected blood banks and hospitals to find the nearest available match.'
  },
  {
    step: '03',
    icon: '🆘',
    title: 'Instant SOS Dispatch',
    desc: 'If no stock is found, eligible donors nearby are alerted within seconds via SMS, push, and app notifications.'
  }
]

const PORTAL_CARDS = [
  {
    id: 'donor',
    icon: '🩸',
    title: 'Donor Portal',
    subtitle: 'For Voluntary Donors',
    desc: 'Track donation history, check 90-day cooldown eligibility, earn Life Hero badges, and receive instant emergency alerts.',
    route: '/donor',
    btnText: 'Open Donor Portal',
    color: '#00E676',
    isPrimary: true
  },
  {
    id: 'hospital',
    icon: '🏥',
    title: 'Hospital & Trauma Center',
    subtitle: 'For Medical Teams & ERs',
    desc: 'Search compatible blood units in real-time across regional banks, place emergency broadcasts, and manage chronic patients.',
    route: '/hospital',
    btnText: 'Open Hospital Portal',
    color: '#29B6F6'
  },
  {
    id: 'blood-bank',
    icon: '🏦',
    title: 'Blood Bank Portal',
    subtitle: 'For Bio-Depot Administrators',
    desc: 'Manage component inventories, monitor expiration alerts, and participate in automated inter-facility stock redistribution.',
    route: '/blood-bank',
    btnText: 'Open Blood Bank Portal',
    color: '#FF8F00'
  },
  {
    id: 'admin',
    icon: '🛡️',
    title: 'Admin Command Center',
    subtitle: 'For Healthcare Authorities',
    desc: 'Access regional live telemetry, trigger mass-casualty disaster protocols, and review district blood security metrics.',
    route: '/grid',
    btnText: 'Open Command Center',
    color: '#DC2626'
  },
  {
    id: 'certificate',
    icon: '🏆',
    title: 'Life Hero Certificate',
    subtitle: 'For Verified Donors',
    desc: 'View, verify, and download your official authenticated certificate of appreciation with instant PNG export and share links.',
    route: '/certificate/BC-2026-HERO-1',
    btnText: 'View Hero Certificate',
    color: '#EAB308'
  }
]

function AnimatedCounter({ target, suffix }) {
  const [count, setCount] = useState(0)
  const numericTarget = parseInt(target.replace(/[^0-9]/g, ''))

  useEffect(() => {
    let start = 0
    const duration = 2000
    const step = numericTarget / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= numericTarget) {
        setCount(numericTarget)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [numericTarget])

  return (
    <span>{target.includes('<') ? '< ' : ''}{count.toLocaleString()}{suffix}</span>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const [selectedGroup, setSelectedGroup] = useState('')
  const [searchLocation, setSearchLocation] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('Nagpur Metropolitan Region (Live Sync)')
  const [isScrolled, setIsScrolled] = useState(false)
  const [countersVisible, setCountersVisible] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
      if (window.scrollY > 300) setCountersVisible(true)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSearch = () => {
    if (selectedGroup) {
      navigate(`/hospital?group=${selectedGroup}&location=${searchLocation}`)
    }
  }

  return (
    <div className="landing">
      {/* ── Navbar ── */}
      <nav className={`landing-nav ${isScrolled ? 'scrolled' : ''}`}>
        <div className="nav-inner container">
          {/* Left: Logo */}
          <div className="nav-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <div className="nav-logo-icon">🩸</div>
            <span className="nav-logo-text">Blood<span className="gradient-text">Connect</span></span>
          </div>

          {/* Center: Primary Nav (Public Audience Links) */}
          <div className="nav-links nav-desktop-links">
            <a href="/hospital" className="nav-link">For Hospitals</a>
            <a href="/blood-bank" className="nav-link">For Blood Banks</a>
            <a href="/donor" className="nav-link">For Donors</a>
            <a href="#how-it-works" className="nav-link">How It Works</a>
          </div>

          {/* Right: Prioritized Actions */}
          <div className="nav-actions">
            <button
              id="nav-login-btn"
              className="btn-nav-login"
              onClick={() => navigate('/login')}
            >
              Login
            </button>
            <button
              id="nav-register-btn"
              className="btn-nav-register"
              onClick={() => navigate('/register')}
            >
              Register
            </button>
            <button
              id="nav-emergency-sos-btn"
              className="btn-nav-sos"
              onClick={() => navigate('/emergency')}
            >
              <span className="nav-sos-emoji">🆘</span>
              <span>Emergency SOS</span>
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              className="nav-mobile-toggle"
              onClick={() => setMobileMenuOpen(prev => !prev)}
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="nav-mobile-menu animate-fade-in">
            <a
              href="/hospital"
              className="nav-mobile-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              🏥 For Hospitals
            </a>
            <a
              href="/blood-bank"
              className="nav-mobile-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              🏦 For Blood Banks
            </a>
            <a
              href="/donor"
              className="nav-mobile-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              🩸 For Donors
            </a>
            <a
              href="#how-it-works"
              className="nav-mobile-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              ℹ️ How It Works
            </a>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-grid" />
        </div>

        <div className="hero-content container">
          <div className="hero-badge animate-fade-in">
            <span className="hero-badge-dot" />
            <span>Live Network • 156 Blood Banks Connected</span>
          </div>

          <h1 className="hero-title animate-fade-in">
            Every Second<br />
            <span className="gradient-text text-glow">Saves a Life.</span>
          </h1>

          <p className="hero-subtitle animate-fade-in">
            India's first centralized real-time blood inventory and donor matching platform.<br />
            From request to fulfillment — <strong>under 5 minutes.</strong>
          </p>

          {/* Quick Search */}
          <div className="hero-search animate-fade-in">
            <div className="search-label">🔍 Find Blood Now</div>
            <div className="search-bar">
              <select
                id="blood-group-select"
                className="search-select"
                value={selectedGroup}
                onChange={e => setSelectedGroup(e.target.value)}
              >
                <option value="">Select Blood Group</option>
                {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <input
                id="location-input"
                className="search-input"
                placeholder="Enter city or pin code"
                value={searchLocation}
                onChange={e => setSearchLocation(e.target.value)}
              />
              <button id="search-blood-btn" className="search-btn" onClick={handleSearch}>
                Search Availability
              </button>
            </div>
          </div>

          <div className="hero-cta animate-fade-in">
            <button id="hero-register-btn" className="btn btn-primary btn-lg" onClick={() => navigate('/register')}>
              🩸 Register as Donor
            </button>
            <button id="hero-sos-btn" className="btn btn-danger btn-lg animate-pulse-red" onClick={() => navigate('/emergency')}>
              🆘 Emergency SOS
            </button>
          </div>
        </div>

        {/* Floating blood drop animation */}
        <div className="hero-illustration animate-float">
          <div className="blood-drop">
            <div className="drop-inner">🩸</div>
            <div className="drop-pulse" />
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section id="stats" className="stats-section">
        <div className="container">
          <div className="stats-grid">
            {STATS.map((stat, i) => (
              <div key={i} className="stat-card animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="stat-number">
                  {countersVisible ? <AnimatedCounter target={stat.number} suffix={stat.suffix} /> : '0'}
                </div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="how-section">
        <div className="container">
          <div className="text-center" style={{ marginBottom: 48 }}>
            <p className="section-eyebrow">Simple & Fast</p>
            <h2 className="section-heading">How BloodConnect Works</h2>
            <p className="section-desc">From emergency to fulfillment in 3 simple steps</p>
          </div>
          <div className="how-grid">
            {HOW_IT_WORKS.map((item, i) => (
              <div key={i} className="how-card glass-card">
                <div className="how-step-badge">{item.step}</div>
                <div className="how-icon">{item.icon}</div>
                <h3 className="how-title">{item.title}</h3>
                <p className="how-desc">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Portal Cards ── */}
      <section id="portals" className="portals-section">
        <div className="container">
          <div className="text-center" style={{ marginBottom: 48 }}>
            <p className="section-eyebrow">Choose Your Role</p>
            <h2 className="section-heading">One Platform, Every Role</h2>
            <p className="section-desc">Tailored portals for every stakeholder in the life-saving blood supply chain</p>
          </div>
          <div className="portals-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            {PORTAL_CARDS.map((card) => (
              <div
                key={card.id}
                id={`portal-card-${card.id}`}
                className={`portal-card glass-card ${card.isPrimary ? 'portal-card-primary' : ''}`}
                style={{ '--card-color': card.color }}
              >
                <div className="portal-card-icon" style={{ background: `${card.color}22`, color: card.color }}>
                  {card.icon}
                </div>
                <div className="portal-card-subtitle">{card.subtitle}</div>
                <h3 className="portal-card-title">{card.title}</h3>
                <p className="portal-card-desc">{card.desc}</p>
                <button
                  className="btn w-full"
                  style={{
                    background: card.isPrimary ? `linear-gradient(135deg, ${card.color}, #059669)` : `${card.color}22`,
                    color: card.isPrimary ? 'white' : card.color,
                    border: `1px solid ${card.color}44`,
                    marginTop: 16
                  }}
                  onClick={() => navigate(card.route)}
                >
                  {card.btnText}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Blood Groups Available (With Scope & Location Selector) ── */}
      <section className="blood-groups-section">
        <div className="container">
          <div className="text-center" style={{ marginBottom: 28 }}>
            <h2 className="section-heading" style={{ marginBottom: 8 }}>
              Real-Time Blood Availability
            </h2>
            <p className="section-desc" style={{ marginBottom: 16 }}>
              Aggregate units in reserve across <strong>156 connected hospitals and blood banks</strong>
            </p>
            {/* Region Selector Context */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.06)', padding: '6px 14px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: '0.82rem', color: '#00E676' }}>● Live Sync Region:</span>
              <select
                value={selectedRegion}
                onChange={e => setSelectedRegion(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: '#f8fafc', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', outline: 'none' }}
              >
                <option value="Nagpur Metropolitan Region (Live Sync)" style={{ background: '#0f172a' }}>📍 Nagpur Metro (Zero Mile Hub)</option>
                <option value="Mumbai Metro Area" style={{ background: '#0f172a' }}>📍 Mumbai Metro Hub</option>
                <option value="Delhi NCR Capital Network" style={{ background: '#0f172a' }}>📍 Delhi NCR Network</option>
                <option value="Pune Regional Hub" style={{ background: '#0f172a' }}>📍 Pune Regional Hub</option>
              </select>
            </div>
          </div>

          <div className="blood-groups-grid">
            {[
              { group: 'A+', units: 142, status: 'high' },
              { group: 'A-', units: 23, status: 'low' },
              { group: 'B+', units: 89, status: 'medium' },
              { group: 'B-', units: 11, status: 'critical' },
              { group: 'O+', units: 204, status: 'high' },
              { group: 'O-', units: 31, status: 'low' },
              { group: 'AB+', units: 67, status: 'medium' },
              { group: 'AB-', units: 8, status: 'critical' },
            ].map(({ group, units, status }) => (
              <div key={group} className={`blood-group-card glass-card blood-status-${status}`}>
                <div className="blood-badge blood-badge-lg">{group}</div>
                <div className="bgroup-units">{units} units</div>
                <div className={`bgroup-status badge-${status === 'high' ? 'green' : status === 'medium' ? 'yellow' : 'red'}`}>
                  {status === 'high' ? '✅ Available' : status === 'medium' ? '⚠️ Limited' : status === 'low' ? '🔴 Low' : '🆘 Critical'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-card glass-card">
            <div className="cta-orb" />
            <div className="cta-content">
              <h2 className="cta-title">Ready to Save a Life Today?</h2>
              <p className="cta-desc">Join 48,000+ verified donors. Registration takes under 3 minutes.</p>
              <div className="cta-buttons">
                <button id="cta-register-btn" className="btn btn-primary btn-lg" onClick={() => navigate('/register')}>
                  🩸 Register as Donor
                </button>
                <button id="cta-register-bank-btn" className="btn btn-secondary btn-lg" onClick={() => navigate('/login')}>
                  Register Blood Bank / Hospital
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="container">
          <div className="footer-top">
            <div className="footer-brand">
              <div className="nav-logo" style={{ marginBottom: 12 }}>
                <div className="nav-logo-icon">🩸</div>
                <span className="nav-logo-text">Blood<span className="gradient-text">Connect</span></span>
              </div>
              <p className="footer-tagline">Centralized real-time blood inventory &amp; donor engagement platform. Built to save lives.</p>
            </div>
            <div className="footer-links-group">
              <h4>Portals</h4>
              <a href="/donor">Donor Portal</a>
              <a href="/hospital">Hospital &amp; Trauma Portal</a>
              <a href="/blood-bank">Blood Bank Portal</a>
              <a href="/grid">Admin Command Center</a>
              <a href="/certificate/BC-2026-HERO-1">Life Hero Certificate</a>
            </div>
            <div className="footer-links-group">
              <h4>Emergency &amp; Support</h4>
              <a href="/sos">🗣️ Voice SOS Broadcast</a>
              <a href="/emergency">🚨 Emergency SOS Dispatch</a>
              <a href="/register">Join as Voluntary Donor</a>
              <a href="/login">Facility Sign In</a>
            </div>
            <div className="footer-links-group">
              <h4>Blood Groups</h4>
              {BLOOD_GROUPS.map(g => <a key={g} href={`/hospital?group=${g}`}>Find {g} Blood</a>)}
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2026 BloodConnect Platform. Built to save lives across India.</p>
            <div className="footer-bottom-links">
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Security Audit</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Location & Emergency Notification Permission Prompt */}
      <LocationNotificationPrompt mode="floating" />
    </div>
  )
}
