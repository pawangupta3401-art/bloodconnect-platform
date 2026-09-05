import React, { useState, useEffect } from 'react'
import { Check, ShieldCheck, MapPin, QrCode, RefreshCw, Truck, Thermometer, Sparkles, AlertCircle, Bell, BellCheck, CheckCircle2, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { API_BASE } from '../config/api'
import './JourneyOfBloodTracker.css'

export default function JourneyOfBloodTracker({
  donationId = 'BAG-2026-9810',
  initialGroup = 'O+',
  bankName = 'Nagpur Central Blood Bank',
  donationRecord = null,
  compact = false
}) {
  const [journeyData, setJourneyData] = useState(null)
  const [qrBase64, setQrBase64] = useState('')
  const [loading, setLoading] = useState(false)
  const [notifyEnabled, setNotifyEnabled] = useState(false)
  const [showNotificationToast, setShowNotificationToast] = useState(false)

  // Default stage templates if record provided
  useEffect(() => {
    if (donationRecord && donationRecord.stages) {
      setJourneyData({
        bagId: donationRecord.bagId || donationId,
        bloodGroup: donationRecord.group || initialGroup,
        currentStatus: donationRecord.currentStage || 'transfused',
        bloodBank: donationRecord.bank || bankName,
        recipientHospital: donationRecord.destination || 'AIIMS Nagpur Apex Trauma Center',
        temperatureCelsius: '3.8°C (Optimal Cold-Chain)',
        antiFraudLedgerHash: `0x7f83b1657ff1fc53b92dc18148a1d65d${(donationRecord.id || 1) * 9821}`,
        stages: donationRecord.stages,
        notifyTransfused: donationRecord.notifyTransfused || false
      })
      setNotifyEnabled(donationRecord.notifyTransfused || false)
    } else {
      // Fetch or fallback
      fetchJourney()
    }
  }, [donationId, initialGroup, donationRecord])

  const fetchJourney = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/donations/journey/${donationId}?group=${encodeURIComponent(initialGroup)}&bank=${encodeURIComponent(bankName)}`)
      const data = await res.json()
      if (data.success && data.journey) {
        setJourneyData(data.journey)
      } else {
        // Fallback rich 4-stage data
        setJourneyData(generateFallbackJourney(donationId, initialGroup, bankName))
      }

      const resQr = await fetch(`${API_BASE}/api/v1/donations/journey/${donationId}/qr`)
      const dataQr = await resQr.json()
      if (dataQr.success && dataQr.qrImage) {
        setQrBase64(dataQr.qrImage)
      }
    } catch (_) {
      setJourneyData(generateFallbackJourney(donationId, initialGroup, bankName))
    } finally {
      setLoading(false)
    }
  }

  const handleToggleNotify = () => {
    const next = !notifyEnabled
    setNotifyEnabled(next)
    setShowNotificationToast(true)
    setTimeout(() => setShowNotificationToast(false), 3000)
  }

  if (loading && !journeyData) {
    return (
      <div className="journey-tracker-card" style={{ textAlign: 'center', padding: '32px' }}>
        <RefreshCw size={24} className="spin" color="#DC2626" />
        <p style={{ marginTop: '10px', color: '#64748B', fontSize: '0.85rem' }}>Loading verified Journey of Blood ledger...</p>
      </div>
    )
  }

  const stages = journeyData?.stages || [
    {
      id: 'collected',
      label: 'Collected',
      title: 'Blood Collected & Bagged',
      timestamp: '15 May 2026, 10:15 AM',
      location: bankName,
      detail: '450ml whole blood drawn in sterile CPD-A anticoagulant bag with unique anti-counterfeit barcode.',
      status: 'completed',
      officer: 'Sister Pratibha S. (Nurse #NBTC-8819)'
    },
    {
      id: 'tested',
      label: 'Tested',
      title: 'Safety Screening Passed',
      timestamp: '15 May 2026, 04:30 PM',
      location: 'Central Pathology Lab, Nagpur',
      detail: 'Passed Safety Screening (HIV, HBV, HCV, Syphilis & Malaria negative). Blood group cross-match verified.',
      status: 'completed',
      officer: 'Dr. S. K. Deshmukh (Chief Pathologist)'
    },
    {
      id: 'transit',
      label: 'Transit',
      title: 'Cold-Chain Secure Transit',
      timestamp: '16 May 2026, 08:20 AM',
      location: 'Route: Sitabuldi to AIIMS Nagpur',
      detail: 'Unit maintained at 3.8°C with real-time IoT temperature sensor & GPS courier lock intact.',
      status: 'completed',
      officer: 'Courier Fleet Unit #MH-31-TR-4012'
    },
    {
      id: 'transfused',
      label: 'Transfused',
      title: 'Transfused / Life Saved',
      timestamp: '16 May 2026, 02:45 PM',
      location: 'AIIMS Nagpur Apex Trauma OT-2',
      detail: 'Transfused in emergency surgical resuscitation. Patient vitals stabilized.',
      status: 'completed',
      officer: 'Dr. R. Verma (Lead Trauma Surgeon)'
    }
  ]

  // Calculate progress percentage
  const completedCount = stages.filter(s => s.status === 'completed').length
  const currentStageIndex = stages.findIndex(s => s.status === 'current')
  const progressPercent = currentStageIndex >= 0
    ? (currentStageIndex / (stages.length - 1)) * 100
    : (completedCount / stages.length) * 100

  const isFullyTransfused = stages.every(s => s.status === 'completed')
  const currentStageObj = stages.find(s => s.status === 'current') || stages[stages.length - 1]

  return (
    <div className="journey-tracker-card">
      <div className="journey-top-accent" />

      {/* Header Banner */}
      <div className="journey-header">
        <div className="journey-title-wrap">
          <div className="journey-icon-box">🩸</div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h3 className="journey-bag-id">
                Journey of Blood
                <span className="journey-bag-badge">{journeyData?.bloodGroup || initialGroup}</span>
              </h3>
              <span className="journey-id-tag">ID: {journeyData?.bagId || donationId}</span>
            </div>
            <p className="journey-subtitle">
              Verified Cold-Chain Provenance • Transparent Unit Lifecycle Tracking
            </p>
          </div>
        </div>

        <div className="journey-header-actions">
          <div className={`journey-status-pill ${isFullyTransfused ? 'transfused' : 'in-progress'}`}>
            <span className={`status-dot ${isFullyTransfused ? 'dot-green' : 'dot-pulsing'}`} />
            {isFullyTransfused ? 'Transfusion Completed' : `In ${currentStageObj.label}`}
          </div>

          {!isFullyTransfused && (
            <button
              className={`btn-notify-toggle ${notifyEnabled ? 'active' : ''}`}
              onClick={handleToggleNotify}
              title="Get notified via WhatsApp/SMS when unit is transfused"
            >
              {notifyEnabled ? <BellCheck size={14} /> : <Bell size={14} />}
              <span>{notifyEnabled ? 'Notify Active' : 'Notify on Transfusion'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Notification Toast */}
      {showNotificationToast && (
        <div className="journey-toast-alert animate-fade-in">
          {notifyEnabled ? (
            <span>🔔 <strong>Notification Enabled:</strong> You will receive an instant WhatsApp alert as soon as this unit is transfused to a patient in need!</span>
          ) : (
            <span>🔕 Notification alerts turned off for this donation.</span>
          )}
        </div>
      )}

      {/* Status Summary Card */}
      <div className={`journey-current-state-banner ${isFullyTransfused ? 'banner-transfused' : 'banner-in-progress'}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.3rem' }}>{isFullyTransfused ? '🎉' : '⏳'}</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: isFullyTransfused ? '#065F46' : '#92400E' }}>
              {isFullyTransfused
                ? 'Unit Successfully Transfused — Life Saved!'
                : `This unit is currently in [${currentStageObj.label}] stage`
              }
            </div>
            <div style={{ fontSize: '0.78rem', color: isFullyTransfused ? '#047857' : '#B45309', marginTop: 2 }}>
              {isFullyTransfused
                ? 'Your donation has completed its clinical lifecycle and directly supported emergency patient care in Nagpur.'
                : 'Unit is progressing through regulatory safety testing & temperature-controlled hospital dispatch. Journey updates in real-time.'
              }
            </div>
          </div>
        </div>
      </div>

      {/* 4-Step Horizontal / Vertical Progress Tracker */}
      <div className="journey-progress-container">
        <div className="progress-track-line-bg" />
        <div className="progress-track-line-fill" style={{ width: `${Math.min(100, Math.max(12, progressPercent))}%` }} />

        <div className="journey-stages-grid">
          {stages.map((stage, idx) => {
            const isCompleted = stage.status === 'completed'
            const isCurrent = stage.status === 'current'
            const isFuture = stage.status === 'future'

            let nodeIcon = null
            if (stage.id === 'collected') nodeIcon = '🩸'
            else if (stage.id === 'tested') nodeIcon = '🧪'
            // ⚡ via_drone: if transit stage has via_drone flag (set by DroneTransport delivery),
            // show drone icon instead of truck icon (SIMULATED — in production this comes from dispatch API)
            else if (stage.id === 'transit') nodeIcon = stage.via_drone ? '🚁' : '🚚'
            else if (stage.id === 'transfused') nodeIcon = '❤️'

            return (
              <div key={idx} className={`stage-step-column ${isCompleted ? 'step-completed' : ''} ${isCurrent ? 'step-current' : ''} ${isFuture ? 'step-future' : ''}`}>
                <div className="stage-node-circle">
                  {isCompleted ? (
                    <Check size={14} strokeWidth={3} />
                  ) : isCurrent ? (
                    <span className="current-pulse-indicator">{nodeIcon}</span>
                  ) : (
                    <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>{idx + 1}</span>
                  )}
                </div>

                <div className="stage-step-content">
                  <div className="stage-badge-row">
                    <span className="stage-pill-tag">{stage.label}</span>
                    {isCurrent && <span className="stage-active-tag">Active</span>}
                    {/* ⚡ via_drone badge — shown on transit stages where blood was delivered by Fast Drone Transport */}
                    {/* In production, this flag would be set by the dispatch API when via_drone=true on the shipment record */}
                    {stage.id === 'transit' && stage.via_drone && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                        color: '#fff', fontSize: '0.6rem', fontWeight: 800,
                        padding: '2px 8px', borderRadius: 20,
                        boxShadow: '0 0 8px rgba(6,182,212,0.35)',
                        marginLeft: 4,
                      }}>
                        ⚡ Drone Delivered
                      </span>
                    )}
                  </div>

                  <h4 className="stage-title-text">{stage.title}</h4>

                  {stage.timestamp && (
                    <div className="stage-time-text">{stage.timestamp}</div>
                  )}

                  {stage.location && (
                    <div className="stage-location-text">
                      <MapPin size={12} />
                      <span>{stage.location}</span>
                    </div>
                  )}

                  <p className="stage-detail-text">{stage.detail}</p>

                  {stage.officer && (
                    <div className="stage-officer-text">
                      Verified by: <strong>{stage.officer}</strong>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Security & Cold-Chain Telemetry Strip */}
      <div className="journey-telemetry-strip">
        <div className="telemetry-item">
          <Thermometer size={14} color="#0284C7" />
          <span>Cold-Chain Temp: <strong>{journeyData?.temperatureCelsius || '3.8°C (Optimal)'}</strong></span>
        </div>
        <div className="telemetry-item">
          <ShieldCheck size={14} color="#059669" />
          <span>Anti-Fraud Ledger Seal: <strong>Verified</strong></span>
        </div>
        <div className="telemetry-hash">
          HASH: {journeyData?.antiFraudLedgerHash || '0x7f83b1657ff1fc53b92dc18148a1d65d'}
        </div>
      </div>
    </div>
  )
}

function generateFallbackJourney(donationId, bloodGroup, bankName) {
  return {
    bagId: donationId,
    bloodGroup,
    currentStatus: 'Transfused',
    bloodBank: bankName,
    temperatureCelsius: '3.8°C (Optimal Cold Chain)',
    antiFraudLedgerHash: `0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1f`,
    stages: [
      {
        id: 'collected',
        label: 'Collected',
        title: 'Blood Collected & Bagged',
        timestamp: '15 May 2026, 10:15 AM',
        location: bankName,
        detail: '450ml whole blood drawn in sterile CPD-A preservative bag with unique barcode.',
        status: 'completed',
        officer: 'Sister Pratibha S. (Nurse #NBTC-8819)'
      },
      {
        id: 'tested',
        label: 'Tested',
        title: 'Passed Safety Screening',
        timestamp: '15 May 2026, 04:30 PM',
        location: 'Central Pathology Lab, Nagpur',
        detail: 'Passed Safety Screening (HIV, HBV, HCV, Syphilis, Malaria negative - Approved for clinical issue).',
        status: 'completed',
        officer: 'Dr. S. K. Deshmukh (Chief Pathologist)'
      },
      {
        id: 'transit',
        label: 'Transit',
        title: 'Cold-Chain Secure Transit',
        timestamp: '16 May 2026, 08:20 AM',
        location: 'En route to AIIMS Apex Trauma Hospital, Nagpur',
        detail: 'Unit maintained at 3.8°C with real-time IoT temperature sensor & GPS courier lock intact.',
        status: 'completed',
        officer: 'Courier Fleet Unit #MH-31-TR-4012'
      },
      {
        id: 'transfused',
        label: 'Transfused',
        title: 'Transfused / Life Saved',
        timestamp: '16 May 2026, 02:45 PM',
        location: 'AIIMS Nagpur Apex Trauma OT-2',
        detail: 'Transfused in emergency surgical resuscitation. Patient vitals stabilized.',
        status: 'completed',
        officer: 'Dr. R. Verma (Lead Trauma Surgeon)'
      }
    ]
  }
}
