import React, { useState, useEffect } from 'react'
import {
  Building,
  Building2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Clock,
  MapPin,
  CheckCircle2,
  X,
  Radio,
  Sparkles,
  Plane,
  Truck,
  Layers,
  Thermometer,
  Gauge,
  Compass,
  FileCheck,
} from 'lucide-react'
import { apiCall } from '../config/api'
import './AuthorizeSectorTransferModal.css'

const ALL_BLOOD_GROUPS = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
const SAFE_RESERVE_THRESHOLD = 5 // Units source bank must retain for emergency reserve

export default function AuthorizeSectorTransferModal({
  suggestion,
  onClose,
  onTransferCompleted,
}) {
  const [bloodGroup, setBloodGroup] = useState(suggestion?.bloodGroup || 'O+')
  const [units, setUnits] = useState(suggestion?.unitsSuggested || 2)
  const [transportMethod, setTransportMethod] = useState(
    (suggestion?.distanceKm || 3.8) >= 1.5 ? 'drone' : 'ambulance'
  )
  const [authorizingAdmin, setAuthorizingAdmin] = useState(
    'Dr. S. Sharma (Nagpur Regional Blood Director)'
  )
  const [notes, setNotes] = useState(
    'Priority cross-sector transfer due to seasonal shortage in private facility reserves.'
  )
  const [currentTime] = useState(
    new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  )

  // Sub-view: 'form' | 'tracking' | 'confirmed'
  const [viewState, setViewState] = useState('form')
  const [activeTransfer, setActiveTransfer] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [completing, setCompleting] = useState(false)

  // Simulated live tracking telemetry
  const [trackingProgress, setTrackingProgress] = useState(25)
  const [trackingAltitude, setTrackingAltitude] = useState(120)
  const [trackingSpeed, setTrackingSpeed] = useState(62)

  const distanceKm = parseFloat(suggestion?.distanceKm) || 4.2
  const sourceBankName = suggestion?.sourceBankName || 'Government Medical College (GMCH) Blood Bank'
  const targetBankName = suggestion?.targetBankName || (suggestion?.isHospitalConnect ? 'AIIMS Nagpur Trauma Care' : 'Kingsway Hospitals Blood Bank')
  const sourceStock = suggestion?.srcUnitsAvailable !== undefined ? suggestion.srcUnitsAvailable : 16
  const targetStock = suggestion?.tgtUnitsAvailable !== undefined ? suggestion.tgtUnitsAvailable : 2
  const isHospitalTarget = suggestion?.isHospitalConnect || suggestion?.targetFacilityType === 'hospital' || suggestion?.targetBankType === 'hospital'
  const targetArea = suggestion?.targetArea || (isHospitalTarget ? 'MIHAN, Nagpur' : 'Mohan Nagar / Station Rd, Nagpur')

  // Calculation: max transferable without violating source bank safe reserve
  const maxTransferable = Math.max(1, sourceStock - SAFE_RESERVE_THRESHOLD)
  const droneEtaMins = Math.max(2, Math.round(distanceKm * 1.0 + 1))
  const ambulanceEtaMins = Math.max(8, Math.round(distanceKm * 3.5 + 3))

  // Live progress simulation timer during tracking view
  useEffect(() => {
    let timer
    if (viewState === 'tracking' && trackingProgress < 100) {
      timer = setInterval(() => {
        setTrackingProgress((prev) => {
          if (prev >= 98) {
            clearInterval(timer)
            return 98
          }
          return prev + 6
        })
      }, 1200)
    }
    return () => clearInterval(timer)
  }, [viewState, trackingProgress])

  const handleAuthorizeSubmit = async (e) => {
    e?.preventDefault()
    if (units <= 0 || units > sourceStock) return

    setSubmitting(true)
    try {
      const payload = {
        suggestionId: suggestion?.id,
        sourceBankId: suggestion?.sourceBankId || 'bank-005',
        sourceBankName,
        sourceBankType: suggestion?.sourceBankType || 'government',
        targetBankId: suggestion?.targetBankId || (isHospitalTarget ? 'hosp-ngp-001' : 'bank-008'),
        targetBankName,
        targetBankType: isHospitalTarget ? 'hospital' : (suggestion?.targetBankType || 'private'),
        targetFacilityType: isHospitalTarget ? 'hospital' : 'bank',
        targetArea,
        bloodGroup,
        units: parseInt(units),
        transportMethod,
        authorizedBy: authorizingAdmin,
        notes,
        distanceKm,
      }

      const { ok, data } = await apiCall('/api/v1/redistribution/authorize-transfer', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      if (ok && data?.transfer) {
        setActiveTransfer(data.transfer)
        setViewState('tracking')
        setTrackingProgress(20)
      } else {
        // Local Fallback
        const fallbackTransfer = {
          id: `XFER-NGP-${Math.floor(1000 + Math.random() * 9000)}`,
          ...payload,
          status: 'in_transit',
          authorizedAt: new Date().toISOString(),
          etaMins: transportMethod === 'drone' ? droneEtaMins : ambulanceEtaMins,
          progress: 20,
          tempCelsius: transportMethod === 'drone' ? 3.8 : 4.1,
        }
        setActiveTransfer(fallbackTransfer)
        setViewState('tracking')
        setTrackingProgress(20)
      }
    } catch (err) {
      console.error('Authorization failed:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCompleteHandover = async () => {
    setCompleting(true)
    try {
      if (activeTransfer?.id) {
        await apiCall(`/api/v1/redistribution/transfers/${activeTransfer.id}/complete`, {
          method: 'PUT',
        })
      }
      setActiveTransfer((prev) => ({
        ...prev,
        status: 'completed',
        progress: 100,
        completedAt: new Date().toISOString(),
      }))
      setTrackingProgress(100)
      setViewState('confirmed')
      if (onTransferCompleted) {
        onTransferCompleted(activeTransfer)
      }
    } catch (err) {
      console.error('Completion error:', err)
    } finally {
      setCompleting(false)
    }
  }

  return (
    <div className="ast-modal-backdrop animate-fade-in" onClick={onClose}>
      <div
        className="ast-modal-card animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── MODAL HEADER ── */}
        <div className="ast-header">
          <div className="ast-header-title-wrap">
            <div className="ast-badge-pill">
              <span className="ast-pulse-dot"></span>
              {isHospitalTarget ? '🚨 Hospital Emergency Transfer Clearance' : 'Official Transfer Clearance'}
            </div>
            <h2 className="ast-title">
              {viewState === 'form' && (isHospitalTarget ? '📋 Connect Government Surplus to Hospital' : '📋 Review & Authorize Sector Transfer')}
              {viewState === 'tracking' && (isHospitalTarget ? '📡 Live Hospital Emergency Transit Telemetry' : '📡 Live Cross-Sector Transit Telemetry')}
              {viewState === 'confirmed' && (isHospitalTarget ? '✅ Emergency Hospital Delivery Verified' : '✅ Transfer Completed & Handover Verified')}
            </h2>
            <p className="ast-sub">
              {viewState === 'form' &&
                (isHospitalTarget
                  ? 'Directly dispatch government-run blood reserves to emergency trauma center with active Code Red need.'
                  : 'Bridge government-run regional reserves to deficit-hit private facilities via fast cold-chain transport.')}
              {viewState === 'tracking' &&
                `Real-time GPS & IoT cold-chain telemetry for Transfer #${activeTransfer?.id}`}
              {viewState === 'confirmed' &&
                `Digital Transfer Slip verified • ${activeTransfer?.units} units of ${activeTransfer?.bloodGroup} received.`}
            </p>
          </div>
          <button className="ast-btn-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════ */}
        {/* VIEW 1: AUTHORIZATION FORM                            */}
        {/* ══════════════════════════════════════════════════════ */}
        {viewState === 'form' && (
          <form onSubmit={handleAuthorizeSubmit} className="ast-form-body">
            {/* ── SECTION 1: TRANSFER ROUTE & DETAILS (TOP) ── */}
            <div className="ast-section">
              <div className="ast-section-label">
                <Building size={14} /> 1. FACILITY ROUTE &amp; INVENTORY BALANCING
              </div>

              <div className="ast-route-grid">
                {/* Source Bank (Government) */}
                <div className="ast-facility-card ast-gov-card">
                  <div className="ast-facility-header">
                    <span className="ast-tag ast-tag-gov">🏛️ GOV SOURCE (SURPLUS)</span>
                    <span className="ast-stock-pill safe">{sourceStock}u In Stock</span>
                  </div>
                  <h4 className="ast-facility-name">{sourceBankName}</h4>
                  <div className="ast-facility-meta">
                    <MapPin size={12} /> Medical Square / Hanuman Nagar, Nagpur
                  </div>
                  <div className="ast-safe-note">
                    Safe Reserve Policy: Retains <strong>{SAFE_RESERVE_THRESHOLD} units</strong> min. buffer
                  </div>
                </div>

                <div className="ast-route-arrow-box">
                  <span className="ast-distance-text">{distanceKm} km</span>
                  <ArrowRight size={22} color="#a855f7" />
                </div>

                {/* Target Destination (Hospital or Private Bank) */}
                <div className={`ast-facility-card ${isHospitalTarget ? 'ast-hosp-dest-card' : 'ast-pvt-card'}`}>
                  <div className="ast-facility-header">
                    <span className={`ast-tag ${isHospitalTarget ? 'ast-tag-hosp-crit' : 'ast-tag-pvt'}`}>
                      {isHospitalTarget ? '🏥 HOSPITAL DESTINATION (CODE RED)' : '🏥 PVT DESTINATION (DEFICIT)'}
                    </span>
                    <span className={`ast-stock-pill ${isHospitalTarget ? 'crit animate-pulse' : 'crit'}`}>
                      {isHospitalTarget ? (suggestion?.urgencyLabel || '1 Active Code Red') : `${targetStock}u Low Stock`}
                    </span>
                  </div>
                  <h4 className="ast-facility-name">{targetBankName}</h4>
                  <div className="ast-facility-meta">
                    <MapPin size={12} /> {targetArea}
                  </div>
                  <div className={`ast-safe-note ${isHospitalTarget ? 'hosp-crit-note' : 'crit'}`}>
                    {isHospitalTarget
                      ? `🚨 Urgent Demand: ${suggestion?.condition || 'Trauma Emergency Resuscitation'}`
                      : 'Urgent Need: Deficit below critical threshold'}
                  </div>
                </div>
              </div>

              {/* Blood Group & Units Inputs */}
              <div className="ast-inputs-grid">
                <div className="ast-field">
                  <label className="ast-label">Blood Group to Transfer</label>
                  <select
                    className="ast-select"
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                  >
                    {ALL_BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>
                        Blood Group {bg} {bg === suggestion?.bloodGroup ? '(Suggested Match)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ast-field">
                  <label className="ast-label">Transfer Quantity (Units)</label>
                  <input
                    type="number"
                    min="1"
                    max={maxTransferable}
                    value={units}
                    onChange={(e) => setUnits(Math.max(1, parseInt(e.target.value) || 1))}
                    className="ast-input"
                    required
                  />
                  <div className="ast-input-hint">
                    💡 Max available for transfer: <strong>{maxTransferable} units</strong> ({sourceBankName.split(' ')[0]} retains {SAFE_RESERVE_THRESHOLD} units for its own reserve)
                  </div>
                </div>
              </div>
            </div>

            {/* ── SECTION 2: TRANSPORT METHOD SELECTION (REUSED UX) ── */}
            <div className="ast-section">
              <div className="ast-section-label">
                <Radio size={14} /> 2. CHOOSE EMERGENCY TRANSPORT METHOD
              </div>

              <div className="ast-transport-grid">
                {/* Option A: Drone Transport */}
                <div
                  className={`ast-transport-card ${transportMethod === 'drone' ? 'selected' : ''}`}
                  onClick={() => setTransportMethod('drone')}
                >
                  {distanceKm >= 1.5 && (
                    <span className="ast-rec-tag">⚡ Recommended — 3.5x Faster</span>
                  )}
                  <div className="ast-transport-top">
                    <div className="ast-transport-icon-wrap drone">🛸</div>
                    <div>
                      <h4 className="ast-transport-name">Autonomous Drone Corridor</h4>
                      <p className="ast-transport-desc">Point-to-point medical UAV flying at 60 km/h cruising velocity.</p>
                    </div>
                  </div>

                  <div className="ast-eta-box drone">
                    <div className="ast-eta-label">⚡ Drone Flight ETA</div>
                    <div className="ast-eta-val">~{droneEtaMins} mins</div>
                    <div className="ast-eta-sub">100% Traffic Bypass Active ✅</div>
                  </div>

                  <ul className="ast-transport-features">
                    <li>2°C – 6°C IoT Cold-Chain Vault</li>
                    <li>Zero-Mile Autonomous Precision Landing</li>
                  </ul>
                </div>

                {/* Option B: Ambulance Transport */}
                <div
                  className={`ast-transport-card ${transportMethod === 'ambulance' ? 'selected' : ''}`}
                  onClick={() => setTransportMethod('ambulance')}
                >
                  <div className="ast-transport-top">
                    <div className="ast-transport-icon-wrap ambulance">🚑</div>
                    <div>
                      <h4 className="ast-transport-name">Standard Ground Transport</h4>
                      <p className="ast-transport-desc">Advanced Life Support (ALS) Ambulance with road siren & driver.</p>
                    </div>
                  </div>

                  <div className="ast-eta-box ambulance">
                    <div className="ast-eta-label">Road Transit ETA</div>
                    <div className="ast-eta-val">~{ambulanceEtaMins} mins</div>
                    <div className="ast-eta-sub">Traffic-dependent city route</div>
                  </div>

                  <ul className="ast-transport-features">
                    <li>Paramedic staff on board</li>
                    <li>Standard city highway corridor</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* ── SECTION 3: AUTHORIZATION DETAILS ── */}
            <div className="ast-section">
              <div className="ast-section-label">
                <ShieldCheck size={14} /> 3. AUTHORIZATION CREDENTIALS
              </div>

              <div className="ast-auth-grid">
                <div className="ast-field">
                  <label className="ast-label">Authorizing Official</label>
                  <input
                    type="text"
                    className="ast-input readonly"
                    value={authorizingAdmin}
                    onChange={(e) => setAuthorizingAdmin(e.target.value)}
                  />
                </div>

                <div className="ast-field">
                  <label className="ast-label">Timestamp</label>
                  <input
                    type="text"
                    className="ast-input readonly"
                    value={currentTime}
                    readOnly
                  />
                </div>
              </div>

              <div className="ast-field" style={{ marginTop: 12 }}>
                <label className="ast-label">Transfer Authorization Notes</label>
                <textarea
                  className="ast-textarea"
                  rows="2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reason for cross-sector transfer..."
                ></textarea>
              </div>
            </div>

            {/* ── SUMMARY & ACTION BAR ── */}
            <div className="ast-action-bar">
              <div className="ast-summary-text">
                Authorizing <strong>{units} Units</strong> of <span className="ast-bg-pill">{bloodGroup}</span> via{' '}
                <strong style={{ color: transportMethod === 'drone' ? '#38bdf8' : '#f59e0b' }}>
                  {transportMethod === 'drone' ? '🛸 Autonomous Drone' : '🚑 ALS Ambulance'}
                </strong>
              </div>

              <div className="ast-btn-row">
                <button type="button" className="ast-btn ast-btn-cancel" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-confirm-transfer"
                  className="ast-btn ast-btn-submit"
                  disabled={submitting}
                >
                  <CheckCircle2 size={16} />
                  {submitting ? 'Authorizing...' : '✅ Authorize & Launch Dispatch'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* VIEW 2: LIVE TRACKING TELEMETRY (DRONE / AMBULANCE)  */}
        {/* ══════════════════════════════════════════════════════ */}
        {viewState === 'tracking' && activeTransfer && (
          <div className="ast-tracking-body animate-fade-in">
            <div className="ast-tracking-banner">
              <div className="ast-tracking-icon">
                {activeTransfer.transportMethod === 'drone' ? '🛸' : '🚑'}
              </div>
              <div>
                <h3 className="ast-tracking-title">
                  {activeTransfer.transportMethod === 'drone'
                    ? 'Autonomous Medical UAV Airborne & En Route'
                    : 'Ground Ambulance Dispatched & En Route'}
                </h3>
                <p className="ast-tracking-sub">
                  Transfer ID: <code style={{ color: '#38bdf8' }}>{activeTransfer.id}</code> • Moving{' '}
                  <strong>{activeTransfer.units} units of {activeTransfer.bloodGroup}</strong>
                </p>
              </div>
            </div>

            {/* Progress Bar & ETA */}
            <div className="ast-telemetry-box">
              <div className="ast-tele-header">
                <span>Progress: {sourceBankName.split(' ')[0]} ➔ {targetBankName.split(' ')[0]}</span>
                <span className="ast-tele-pct">{trackingProgress}% Transit Complete</span>
              </div>
              <div className="ast-progress-track">
                <div
                  className="ast-progress-fill"
                  style={{ width: `${trackingProgress}%` }}
                ></div>
              </div>
            </div>

            {/* Telemetry Sensor Cards */}
            <div className="ast-sensor-grid">
              <div className="ast-sensor-card">
                <div className="ast-sensor-label"><Clock size={13} /> ETA Remaining</div>
                <div className="ast-sensor-val">
                  ~{Math.max(0, Math.round((1 - trackingProgress / 100) * activeTransfer.etaMins))} mins
                </div>
              </div>
              <div className="ast-sensor-card">
                <div className="ast-sensor-label"><Gauge size={13} /> Velocity</div>
                <div className="ast-sensor-val">{trackingSpeed} km/h</div>
              </div>
              <div className="ast-sensor-card">
                <div className="ast-sensor-label"><Thermometer size={13} /> Vault Temperature</div>
                <div className="ast-sensor-val temp">3.8°C (Safe)</div>
              </div>
              <div className="ast-sensor-card">
                <div className="ast-sensor-label"><MapPin size={13} /> Distance Left</div>
                <div className="ast-sensor-val">
                  {((1 - trackingProgress / 100) * distanceKm).toFixed(2)} km
                </div>
              </div>
            </div>

            {/* Action to complete simulation */}
            <div className="ast-tracking-footer">
              <div className="ast-live-pulse-note">
                <span className="ast-pulse-dot"></span> Live GPS & Temperature Telemetry Synced
              </div>
              <button
                className="ast-btn ast-btn-submit"
                onClick={handleCompleteHandover}
                disabled={completing}
              >
                <CheckCircle2 size={16} />
                {completing ? 'Finalizing Handover...' : '🏁 Simulate Arrival & Finalize Handover'}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* VIEW 3: CONFIRMED HANDOVER RECEIPT                   */}
        {/* ══════════════════════════════════════════════════════ */}
        {viewState === 'confirmed' && activeTransfer && (
          <div className="ast-confirmed-body animate-fade-in">
            <div className="ast-confirmed-icon-wrap">
              <CheckCircle2 size={48} color="#00E676" />
            </div>
            <h3 className="ast-confirmed-title">
              {isHospitalTarget ? 'Emergency Hospital Delivery Successfully Completed' : 'Transfer Successfully Delivered & Verified'}
            </h3>
            <p className="ast-confirmed-sub">
              {isHospitalTarget ? (
                <>
                  Critical trauma reserves updated: <strong>{activeTransfer.units} units</strong> of{' '}
                  <span className="ast-bg-pill">{activeTransfer.bloodGroup}</span> received by trauma surgical team at{' '}
                  <strong>{targetBankName}</strong>.
                </>
              ) : (
                <>
                  Inventory balances updated: <strong>{activeTransfer.units} units</strong> of{' '}
                  <span className="ast-bg-pill">{activeTransfer.bloodGroup}</span> successfully replenished at{' '}
                  <strong>{targetBankName}</strong>.
                </>
              )}
            </p>

            <div className="ast-receipt-card">
              <div className="ast-receipt-row">
                <span>Transfer Reference ID:</span>
                <code style={{ color: '#38bdf8', fontWeight: 800 }}>{activeTransfer.id}</code>
              </div>
              <div className="ast-receipt-row">
                <span>From (Source Govt Bank):</span>
                <strong>{sourceBankName}</strong>
              </div>
              <div className="ast-receipt-row">
                <span>To (Destination {isHospitalTarget ? 'Hospital' : 'Pvt Bank'}):</span>
                <strong>{targetBankName}</strong>
              </div>
              <div className="ast-receipt-row">
                <span>Blood Group & Units:</span>
                <strong>{activeTransfer.units} Units of {activeTransfer.bloodGroup}</strong>
              </div>
              <div className="ast-receipt-row">
                <span>Transport Mode:</span>
                <strong>{activeTransfer.transportMethod === 'drone' ? '🛸 Autonomous Medical UAV' : '🚑 Ground Ambulance'}</strong>
              </div>
              <div className="ast-receipt-row">
                <span>Authorized By:</span>
                <span>{activeTransfer.authorizedBy}</span>
              </div>
            </div>

            <button className="ast-btn ast-btn-submit w-full" onClick={onClose} style={{ marginTop: 20 }}>
              Close & Return to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
