import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { apiCall, saveAuthToken } from '../../config/api'
import './Auth.css'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']

const ROLE_OPTIONS = [
  { id: 'donor',      icon: '🩸', label: 'Blood Donor',        desc: 'I want to donate blood' },
  { id: 'hospital',   icon: '🏥', label: 'Hospital Staff',     desc: 'Requesting blood for patients' },
  { id: 'blood-bank', icon: '🏦', label: 'Blood Bank Admin',   desc: 'I manage blood inventory' },
]

const STEPS = [
  { id: 1, title: 'Personal Info', icon: '👤' },
  { id: 2, title: 'OTP Verify', icon: '🔐' },
  { id: 3, title: 'Health Info', icon: '🩺' },
  { id: 4, title: 'Activate', icon: '✅' },
]

export default function Register() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [step, setStep]       = useState(1)
  const [role, setRole]       = useState('donor')
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp]         = useState('')
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', password: '', orgName: '',
    bloodGroup: '', city: '', state: '', pincode: '',
    lastDonation: '', weight: '', medicalConditions: false,
    consent: false
  })

  const update = (field, val) => setFormData(prev => ({ ...prev, [field]: val }))

  const sendOTP = async () => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 1000))
    setOtpSent(true)
    setLoading(false)
  }

  const verifyOTP = async () => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    setStep(3)
    setLoading(false)
  }

  const handleActivate = async () => {
    setLoading(true)

    // Try real API first
    const payload = {
      name: formData.name, email: formData.email,
      phone: formData.phone, password: formData.password,
      bloodGroup: formData.bloodGroup || 'O+',
      city: formData.city, state: formData.state, pincode: formData.pincode,
      role,
      orgName: formData.orgName,
    }

    const { ok, data } = await apiCall(
      role === 'donor' ? '/api/v1/donors' : '/api/v1/auth/register',
      { method: 'POST', body: JSON.stringify(payload) }
    )

    if (ok && data?.token) saveAuthToken(data.token)

    // Calculate donor eligibility
    const lastDate = formData.lastDonation ? new Date(formData.lastDonation) : null
    const daysSince = lastDate ? Math.floor((Date.now() - lastDate) / 86400000) : 999
    const eligible  = daysSince >= 90

    const user = (ok && data?.user) ? data.user : {
      name:      formData.name,
      email:     formData.email,
      role,
      bloodGroup: formData.bloodGroup,
      city:      formData.city,
      orgName:   formData.orgName,
      trustScore: 0,
      eligible,
      nextEligible: eligible || !lastDate ? null : new Date(lastDate.getTime() + 90 * 86400000).toLocaleDateString('en-IN'),
    }

    login(user)
    const routes = { donor: '/donor', hospital: '/hospital', 'blood-bank': '/blood-bank' }
    navigate(routes[role] || '/donor')
  }

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-orb auth-orb-1" />
      </div>

      <div className="auth-container">
        {/* Left Panel */}
        <div className="auth-left">
          <Link to="/" className="auth-logo">
            <div className="nav-logo-icon" style={{ width: 48, height: 48, fontSize: '1.4rem' }}>🩸</div>
            <div>
              <div className="auth-brand">Blood<span className="gradient-text">Connect</span></div>
              <div className="auth-brand-sub">{role === 'donor' ? 'Donor Registration' : role === 'hospital' ? 'Hospital Registration' : 'Blood Bank Registration'}</div>
            </div>
          </Link>

          <div className="auth-left-content">
            <h2 className="auth-hero-text">One donation.<br /><span className="gradient-text">Three lives saved.</span></h2>
            <p className="auth-hero-desc">Register in under 3 minutes. OTP-verified. Trusted by 48,000+ donors across India.</p>

            {/* Steps Progress */}
            <div className="reg-steps">
              {STEPS.map(s => (
                <div key={s.id} className={`reg-step ${step >= s.id ? 'done' : ''} ${step === s.id ? 'active' : ''}`}>
                  <div className="reg-step-icon">{step > s.id ? '✓' : s.icon}</div>
                  <div className="reg-step-title">{s.title}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="auth-right">
          <div className="auth-form-card">
            {/* Step 1 */}
            {step === 1 && (
              <>
                <h1 className="auth-title">Create Your Account</h1>
                <p className="auth-subtitle">Step 1 of 4 — Choose your role &amp; enter details</p>

                {/* Role Selector */}
                <div className="role-selector" style={{ marginBottom: 20 }}>
                  <div className="role-selector-label">I am registering as a…</div>
                  <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                    {ROLE_OPTIONS.map(r => (
                      <button
                        key={r.id}
                        type="button"
                        className={`role-btn ${role === r.id ? 'active' : ''}`}
                        style={{ flex: 1, minWidth: 120 }}
                        onClick={() => setRole(r.id)}
                      >
                        <span className="role-icon">{r.icon}</span>
                        <span className="role-label" style={{ fontSize: '0.75rem' }}>{r.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="auth-form" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Full Name</label>
                      <input id="reg-name" className="form-input" placeholder="Arjun Sharma" value={formData.name} onChange={e => update('name', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email</label>
                      <input id="reg-email" type="email" className="form-input" placeholder="arjun@gmail.com" value={formData.email} onChange={e => update('email', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Phone</label>
                      <input id="reg-phone" type="tel" className="form-input" placeholder="+91 98765 43210" value={formData.phone} onChange={e => update('phone', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Blood Group</label>
                      <select id="reg-blood-group" className="form-select" value={formData.bloodGroup} onChange={e => update('bloodGroup', e.target.value)}>
                        <option value="">Select Blood Group</option>
                        {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                  </div>
                  {/* Org name field for hospital/bank roles */}
                  {role !== 'donor' && (
                    <div className="form-group">
                      <label className="form-label">{role === 'hospital' ? 'Hospital Name' : 'Blood Bank Name'}</label>
                      <input
                        id="reg-org-name"
                        className="form-input"
                        placeholder={role === 'hospital' ? 'Apollo Hospital, Mumbai' : 'LifeSource Blood Bank'}
                        value={formData.orgName}
                        onChange={e => update('orgName', e.target.value)}
                      />
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <input id="reg-password" type="password" className="form-input" placeholder="Min 8 characters" value={formData.password} onChange={e => update('password', e.target.value)} />
                  </div>
                  <div className="grid-3">
                    <div className="form-group">
                      <label className="form-label">City</label>
                      <input id="reg-city" className="form-input" placeholder="Mumbai" value={formData.city} onChange={e => update('city', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">State</label>
                      <input id="reg-state" className="form-input" placeholder="Maharashtra" value={formData.state} onChange={e => update('state', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Pincode</label>
                      <input id="reg-pincode" className="form-input" placeholder="400001" value={formData.pincode} onChange={e => update('pincode', e.target.value)} />
                    </div>
                  </div>
                  <button id="reg-step1-next" className="btn btn-primary w-full btn-lg" onClick={() => { sendOTP(); setStep(2) }}>
                    Continue & Send OTP →
                  </button>
                </div>
              </>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <>
                <h1 className="auth-title">Verify Your Identity</h1>
                <p className="auth-subtitle">Step 2 of 4 — OTP Verification</p>
                <div className="otp-section">
                  <div className="otp-phone-display">
                    📱 OTP sent to <strong>{formData.phone || '+91 98765 43210'}</strong>
                  </div>
                  <div className="otp-input-row">
                    {[0,1,2,3,4,5].map(i => (
                      <input
                        key={i}
                        id={`otp-${i}`}
                        className="otp-box"
                        maxLength={1}
                        type="text"
                        value={otp[i] || ''}
                        onChange={e => {
                          const newOtp = otp.split('')
                          newOtp[i] = e.target.value
                          setOtp(newOtp.join(''))
                          if (e.target.value && i < 5) document.getElementById(`otp-${i+1}`)?.focus()
                        }}
                      />
                    ))}
                  </div>
                  <div className="otp-hint">💡 For demo, enter any 6 digits</div>
                  <button id="verify-otp-btn" className="btn btn-primary w-full btn-lg" onClick={verifyOTP} disabled={loading || otp.length < 6}>
                    {loading ? <span className="loading-spinner" /> : '✅ Verify OTP'}
                  </button>
                  <button className="btn btn-ghost w-full" onClick={() => sendOTP()}>Resend OTP</button>
                </div>
              </>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <>
                <h1 className="auth-title">Health Information</h1>
                <p className="auth-subtitle">Step 3 of 4 — Eligibility Check</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Last Donation Date (if any)</label>
                    <input id="reg-last-donation" type="date" className="form-input" value={formData.lastDonation} onChange={e => update('lastDonation', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Weight (kg)</label>
                    <input id="reg-weight" type="number" className="form-input" placeholder="55+ kg required" value={formData.weight} onChange={e => update('weight', e.target.value)} />
                  </div>

                  <div className="eligibility-rules glass-card">
                    <div className="eligibility-title">📋 Eligibility Criteria</div>
                    {[
                      { rule: 'Age 18–65 years', ok: true },
                      { rule: 'Weight ≥ 55 kg', ok: parseInt(formData.weight) >= 55 },
                      { rule: '90 days since last donation', ok: !formData.lastDonation || Math.floor((Date.now() - new Date(formData.lastDonation)) / 86400000) >= 90 },
                      { rule: 'No major illness in last 6 months', ok: !formData.medicalConditions },
                    ].map((r, i) => (
                      <div key={i} className={`eligibility-rule ${r.ok ? 'ok' : 'fail'}`}>
                        {r.ok ? '✅' : '❌'} {r.rule}
                      </div>
                    ))}
                  </div>

                  <label className="consent-check">
                    <input id="reg-consent" type="checkbox" checked={formData.consent} onChange={e => update('consent', e.target.checked)} />
                    <span>I consent to data processing as per BloodConnect Privacy Policy. My health data will only be shared with verified medical staff.</span>
                  </label>

                  <button id="reg-step3-next" className="btn btn-primary w-full btn-lg" onClick={() => setStep(4)} disabled={!formData.consent}>
                    Complete Registration →
                  </button>
                </div>
              </>
            )}

            {/* Step 4 */}
            {step === 4 && (
              <>
                <div className="activation-screen">
                  <div className="activation-icon">🎉</div>
                  <h1 className="auth-title">Almost There!</h1>
                  <p className="auth-subtitle">Review your profile before activation</p>

                  <div className="profile-preview glass-card">
                    <div className="preview-row">
                      <span>Name</span>
                      <strong>{formData.name || 'Arjun Sharma'}</strong>
                    </div>
                    <div className="preview-row">
                      <span>Blood Group</span>
                      <span className="blood-badge" style={{ width: 36, height: 36, fontSize: '0.75rem' }}>{formData.bloodGroup || 'O+'}</span>
                    </div>
                    <div className="preview-row">
                      <span>City</span>
                      <strong>{formData.city || 'Mumbai'}</strong>
                    </div>
                    <div className="preview-row">
                      <span>Status</span>
                      <span className="badge badge-green">✅ Verified</span>
                    </div>
                    <div className="preview-row">
                      <span>Trust Score</span>
                      <strong>0 / 100 (New Donor)</strong>
                    </div>
                  </div>

                  <button id="activate-profile-btn" className="btn btn-primary w-full btn-lg" onClick={handleActivate} disabled={loading}>
                    {loading ? <span className="loading-spinner" /> : '🩸 Activate My Donor Profile'}
                  </button>
                </div>
              </>
            )}

            <p className="auth-switch" style={{ marginTop: 16 }}>
              Already have an account? <Link to="/login" className="auth-link">Sign In</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
