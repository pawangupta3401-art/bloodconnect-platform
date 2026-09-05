import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  MapPin, 
  Calendar, 
  Clock, 
  AlertCircle, 
  ShieldCheck, 
  Search, 
  User, 
  Activity, 
  Send, 
  CheckCircle2, 
  Navigation, 
  ChevronRight, 
  Droplet, 
  Smartphone,
  Sparkles,
  Layers,
  ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const COMPONENTS = ['Whole Blood', 'Plasma', 'Platelets', 'RBC'];

const MOCK_BRANCHES = [
  { id: 'NGP-01', name: 'AIIMS Blood Centre', area: 'MIHAN', distance: '1.2 km', stock: 204, rating: '4.9 ★' },
  { id: 'NGP-02', name: 'GMCH Blood Bank', area: 'Medical Square', distance: '3.4 km', stock: 265, rating: '4.8 ★' },
  { id: 'NGP-07', name: 'Dr. Hedgewar Raktpedhi', area: 'Dharampeth', distance: '4.8 km', stock: 394, rating: '4.9 ★' },
  { id: 'NGP-08', name: 'Jeevan Jyoti Blood Centre', area: 'Dhantoli', distance: '2.9 km', stock: 286, rating: '4.8 ★' }
];

export default function MobileAppSimulator() {
  const [activeTab, setActiveTab] = useState('donor'); // 'donor' | 'inventory' | 'appointments' | 'profile'
  const [selectedGroup, setSelectedGroup] = useState('O+');
  const [selectedComponent, setSelectedComponent] = useState('Whole Blood');
  
  // Eligibility screening state
  const [age, setAge] = useState(24);
  const [weight, setWeight] = useState(65);
  const [daysSinceLastDonation, setDaysSinceLastDonation] = useState(105);
  
  // Appointment Form
  const [selectedBranch, setSelectedBranch] = useState(MOCK_BRANCHES[0].id);
  const [aptDate, setAptDate] = useState('2026-08-30');
  const [aptSlot, setAptSlot] = useState('10:30 AM');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Request State
  const [requestUnits, setRequestUnits] = useState(2);
  const [requestUrgency, setRequestUrgency] = useState('Emergency');
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  const isEligible = age >= 18 && weight >= 50 && daysSinceLastDonation >= 90;
  const daysLeftForEligibility = Math.max(0, 90 - daysSinceLastDonation);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0B0F19', color: '#F1F5F9', fontFamily: 'var(--ds-font-primary)' }}>
      
      {/* Top Banner Header */}
      <header style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/" style={{ color: '#94A3B8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
            <ArrowLeft size={16} /> Back
          </Link>
          <span style={{ height: '16px', width: '1px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '1rem', color: '#38BDF8' }}>
            <Smartphone size={18} />
            <span>BloodConnect BBMS Mobile App (React Native Preview)</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.75rem', padding: '4px 10px', backgroundColor: 'rgba(14, 124, 123, 0.2)', color: '#0E7C7B', border: '1px solid rgba(14, 124, 123, 0.4)', borderRadius: '999px', fontWeight: 600 }}>
            iOS & Android Single Codebase
          </span>
          <Link to="/design-system" style={{ fontSize: '0.8rem', color: '#E2E8F0', textDecoration: 'none' }}>
            🎨 Design System
          </Link>
        </div>
      </header>

      {/* Main Container with Phone Viewport Frame */}
      <main style={{ display: 'flex', justifyContent: 'center', padding: '32px 16px' }}>
        
        {/* Mobile Phone Mockup Frame */}
        <div
          style={{
            width: '100%',
            maxWidth: '414px',
            minHeight: '740px',
            backgroundColor: '#0F172A',
            borderRadius: '40px',
            border: '8px solid #1E293B',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(56, 189, 248, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Status Bar */}
          <div style={{ height: '36px', backgroundColor: '#0B0F19', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600 }}>
            <span>9:41</span>
            <div style={{ width: '80px', height: '18px', backgroundColor: '#000', borderRadius: '10px', margin: '0 auto' }} />
            <span>5G 100%</span>
          </div>

          {/* App Header */}
          <div style={{ padding: '16px 20px', backgroundColor: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#DC143C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                🩸
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FFF' }}>BloodConnect</div>
                <div style={{ fontSize: '0.7rem', color: '#38BDF8' }}>Nagpur Regional Grid</div>
              </div>
            </div>

            <span style={{ fontSize: '0.7rem', padding: '3px 8px', backgroundColor: 'rgba(0, 230, 118, 0.15)', color: '#00E676', borderRadius: '999px', fontWeight: 600 }}>
              Live Telemetry
            </span>
          </div>

          {/* Dynamic Scrollable Screen Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* ── TAB 1: DONOR HUB ── */}
            {activeTab === 'donor' && (
              <>
                {/* 90-Day Eligibility Screening Card */}
                <div style={{ backgroundColor: '#1E293B', borderRadius: '16px', padding: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFF' }}>🧬 90-Day Eligibility Status</span>
                    {isEligible ? (
                      <span style={{ fontSize: '0.75rem', color: '#00E676', backgroundColor: 'rgba(0,230,118,0.1)', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>
                        Eligible to Donate
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#FFB300', backgroundColor: 'rgba(255,179,0,0.1)', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>
                        {daysLeftForEligibility} Days Left
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px', textAlign: 'center' }}>
                    <div style={{ backgroundColor: '#0F172A', padding: '8px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>Age</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: age >= 18 ? '#00E676' : '#FF1744' }}>{age} yrs</div>
                    </div>
                    <div style={{ backgroundColor: '#0F172A', padding: '8px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>Weight</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: weight >= 50 ? '#00E676' : '#FF1744' }}>{weight} kg</div>
                    </div>
                    <div style={{ backgroundColor: '#0F172A', padding: '8px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>Gap</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: daysSinceLastDonation >= 90 ? '#00E676' : '#FFB300' }}>{daysSinceLastDonation}d</div>
                    </div>
                  </div>

                  {/* Interactive Adjuster */}
                  <div style={{ fontSize: '0.72rem', color: '#94A3B8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Simulate Last Donation Gap:</span>
                    <button
                      onClick={() => setDaysSinceLastDonation(d => d >= 90 ? 45 : 95)}
                      style={{ background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', color: '#38BDF8', padding: '4px 8px', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer' }}
                    >
                      Toggle Gap ({daysSinceLastDonation}d)
                    </button>
                  </div>
                </div>

                {/* Quick Action: Book Appointment */}
                <div style={{ backgroundColor: '#1E293B', borderRadius: '16px', padding: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <Calendar size={18} color="#38BDF8" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFF' }}>Book Donation Slot</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94A3B8', marginBottom: '4px', display: 'block' }}>Select Blood Centre</label>
                      <select
                        value={selectedBranch}
                        onChange={e => setSelectedBranch(e.target.value)}
                        style={{ width: '100%', backgroundColor: '#0F172A', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#FFF', padding: '8px 10px', fontSize: '0.82rem' }}
                      >
                        {MOCK_BRANCHES.map(b => (
                          <option key={b.id} value={b.id}>{b.name} ({b.area} • {b.distance})</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '0.72rem', color: '#94A3B8', marginBottom: '4px', display: 'block' }}>Date</label>
                        <input
                          type="date"
                          value={aptDate}
                          onChange={e => setAptDate(e.target.value)}
                          style={{ width: '100%', backgroundColor: '#0F172A', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#FFF', padding: '6px 8px', fontSize: '0.8rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.72rem', color: '#94A3B8', marginBottom: '4px', display: 'block' }}>Time Slot</label>
                        <select
                          value={aptSlot}
                          onChange={e => setAptSlot(e.target.value)}
                          style={{ width: '100%', backgroundColor: '#0F172A', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#FFF', padding: '6px 8px', fontSize: '0.8rem' }}
                        >
                          <option>09:30 AM</option>
                          <option>10:30 AM</option>
                          <option>02:00 PM</option>
                          <option>04:30 PM</option>
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={() => setBookingSuccess(true)}
                      style={{
                        backgroundColor: '#DC143C',
                        color: '#FFF',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        marginTop: '4px'
                      }}
                    >
                      <CheckCircle2 size={16} /> Confirm Appointment
                    </button>

                    {bookingSuccess && (
                      <div style={{ backgroundColor: 'rgba(0,230,118,0.15)', border: '1px solid rgba(0,230,118,0.3)', color: '#00E676', padding: '8px', borderRadius: '8px', fontSize: '0.75rem', textAlign: 'center', fontWeight: 600 }}>
                        ✅ Confirmed at {MOCK_BRANCHES.find(b => b.id === selectedBranch)?.name} for {aptDate} ({aptSlot})! SMS sent.
                      </div>
                    )}
                  </div>
                </div>

                {/* Live SOS Alert Tile */}
                <div style={{ backgroundColor: 'rgba(220, 20, 60, 0.1)', border: '1px solid rgba(220, 20, 60, 0.3)', borderRadius: '16px', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FF4D6D', fontWeight: 700, fontSize: '0.82rem', marginBottom: '6px' }}>
                    <AlertCircle size={16} /> 🚨 Active Emergency SOS Nearby
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#E2E8F0', margin: '0 0 10px', lineHeight: 1.4 }}>
                    Alexis Multispeciality requires <strong>3 units O- Negative</strong> for cardiac surgery (1.8 km away).
                  </p>
                  <Link
                    to="/emergency"
                    style={{ display: 'block', textAlign: 'center', backgroundColor: '#FF1744', color: '#FFF', textDecoration: 'none', padding: '8px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700 }}
                  >
                    Respond to SOS
                  </Link>
                </div>
              </>
            )}

            {/* ── TAB 2: INVENTORY & COMPONENT TRACKER ── */}
            {activeTab === 'inventory' && (
              <>
                <div style={{ backgroundColor: '#1E293B', borderRadius: '16px', padding: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFF', display: 'block', marginBottom: '10px' }}>
                    🩸 Component-Wise Inventory Lookup
                  </span>

                  {/* Component Filter Pills */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', marginBottom: '12px' }}>
                    {COMPONENTS.map(comp => (
                      <button
                        key={comp}
                        onClick={() => setSelectedComponent(comp)}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: selectedComponent === comp ? '#0E7C7B' : '#0F172A',
                          color: selectedComponent === comp ? '#FFF' : '#94A3B8',
                          border: '1px solid rgba(255,255,255,0.1)',
                          cursor: 'pointer'
                        }}
                      >
                        {comp}
                      </button>
                    ))}
                  </div>

                  {/* Blood Group Selector */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '14px' }}>
                    {BLOOD_GROUPS.map(g => (
                      <button
                        key={g}
                        onClick={() => setSelectedGroup(g)}
                        style={{
                          padding: '8px 4px',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          backgroundColor: selectedGroup === g ? '#DC143C' : '#0F172A',
                          color: '#FFF',
                          border: selectedGroup === g ? '1px solid #FF4D6D' : '1px solid rgba(255,255,255,0.08)',
                          cursor: 'pointer'
                        }}
                      >
                        {g}
                      </button>
                    ))}
                  </div>

                  {/* Available Stock Units at Verified Branches */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {MOCK_BRANCHES.map(b => (
                      <div key={b.id} style={{ backgroundColor: '#0F172A', borderRadius: '8px', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#FFF' }}>{b.name}</div>
                          <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{b.area} • {b.distance}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#38BDF8' }}>
                            {Math.floor(b.stock / 8)} units
                          </span>
                          <div style={{ fontSize: '0.68rem', color: '#00E676' }}>Verified Active</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── TAB 3: RECIPIENT / REQUEST SYSTEM ── */}
            {activeTab === 'requests' && (
              <div style={{ backgroundColor: '#1E293B', borderRadius: '16px', padding: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFF', display: 'block', marginBottom: '12px' }}>
                  🏥 Submit Blood / Component Request
                </span>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Required Blood Group</label>
                    <select
                      value={selectedGroup}
                      onChange={e => setSelectedGroup(e.target.value)}
                      style={{ width: '100%', backgroundColor: '#0F172A', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#FFF', padding: '8px 10px', fontSize: '0.82rem', marginTop: '4px' }}
                    >
                      {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Component Type</label>
                    <select
                      value={selectedComponent}
                      onChange={e => setSelectedComponent(e.target.value)}
                      style={{ width: '100%', backgroundColor: '#0F172A', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#FFF', padding: '8px 10px', fontSize: '0.82rem', marginTop: '4px' }}
                    >
                      {COMPONENTS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Units Needed</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={requestUnits}
                        onChange={e => setRequestUnits(e.target.value)}
                        style={{ width: '100%', backgroundColor: '#0F172A', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#FFF', padding: '6px 8px', fontSize: '0.8rem', marginTop: '4px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Urgency</label>
                      <select
                        value={requestUrgency}
                        onChange={e => setRequestUrgency(e.target.value)}
                        style={{ width: '100%', backgroundColor: '#0F172A', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#FFF', padding: '6px 8px', fontSize: '0.8rem', marginTop: '4px' }}
                      >
                        <option>Normal</option>
                        <option>Emergency</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={() => setRequestSubmitted(true)}
                    style={{
                      backgroundColor: requestUrgency === 'Emergency' ? '#FF1744' : '#1A3A5C',
                      color: '#FFF',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      marginTop: '6px'
                    }}
                  >
                    {requestUrgency === 'Emergency' ? '🚨 Broadcast Emergency Request' : 'Submit Standard Request'}
                  </button>

                  {requestSubmitted && (
                    <div style={{ backgroundColor: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', color: '#38BDF8', padding: '8px', borderRadius: '8px', fontSize: '0.75rem', textAlign: 'center' }}>
                      ⚡ Request ticket <strong>REQ-{Math.floor(1000 + Math.random()*9000)}</strong> broadcasted to 4 nearby blood banks. Status: <strong>Pending Match</strong>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Tab Navigation Bar (React Native TabBar) */}
          <nav
            style={{
              height: '64px',
              backgroundColor: '#1E293B',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              alignItems: 'center',
              padding: '0 8px',
            }}
          >
            {[
              { id: 'donor', label: 'Donor Hub', icon: Heart },
              { id: 'inventory', label: 'Stock & Units', icon: Droplet },
              { id: 'requests', label: 'Blood Request', icon: Send },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    color: isActive ? '#38BDF8' : '#94A3B8',
                    cursor: 'pointer',
                    padding: '6px 0',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
                  <span style={{ fontSize: '0.68rem', fontWeight: isActive ? 700 : 500 }}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </main>
    </div>
  );
}
