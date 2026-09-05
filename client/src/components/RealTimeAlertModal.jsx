import { useState, useEffect } from 'react'
import io from 'socket.io-client'
import { SOCKET_URL } from '../config/api'
import { AlertTriangle, MapPin, Building, Clock, Check, X, ShieldAlert, HeartHandshake } from 'lucide-react'
import './RealTimeAlertModal.css'

export default function RealTimeAlertModal({ currentUserLocation = 'Nagpur' }) {
  const [activeAlert, setActiveAlert] = useState(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [isResponding, setIsResponding] = useState(false)
  const [responseStatus, setResponseStatus] = useState(null)
  const [hasResponded, setHasResponded] = useState(false)

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    })

    // Listen to real-time emergency events
    const handleEmergency = (data) => {
      console.log('[RealTimeAlertModal] Received Emergency Alert:', data)
      setActiveAlert(data)
      setHasResponded(false)

      // Optional audio notification
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
        const osc = audioCtx.createOscillator()
        const gain = audioCtx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(520, audioCtx.currentTime)
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime)
        osc.connect(gain)
        gain.connect(audioCtx.destination)
        osc.start()
        osc.stop(audioCtx.currentTime + 0.35)
      } catch (_) {}
    }

    socket.on('emergency_alert', handleEmergency)
    socket.on('new-emergency', handleEmergency)

    return () => {
      socket.off('emergency_alert', handleEmergency)
      socket.off('new-emergency', handleEmergency)
      socket.disconnect()
    }
  }, [])

  if (!activeAlert) return null

  const handleRespond = () => {
    setHasResponded(true)
    setTimeout(() => {
      setActiveAlert(null)
    }, 1800)
  }

  return (
    <div className="sos-overlay">
      <div className="sos-modal-card">
        <div className="sos-top-beacon" />

        <div className="sos-header">
          <div className="sos-siren-icon">
            <ShieldAlert size={26} />
          </div>
          <div className="sos-title-group">
            <h3>{activeAlert.title || '🚨 EMERGENCY BLOOD DISPATCH'}</h3>
            <p>High Priority • Immediate Action Required</p>
          </div>
        </div>

        <div className="sos-details-grid">
          <div className="sos-blood-badge">
            <span className="badge-label">Blood Needed</span>
            <span className="badge-value">{activeAlert.bloodGroup || 'O-'}</span>
          </div>

          <div className="sos-info-lines">
            <div className="sos-info-row">
              <Building size={16} />
              <span><strong>Hospital:</strong> {activeAlert.hospitalName || 'Central Trauma Hospital'}</span>
            </div>
            <div className="sos-info-row">
              <MapPin size={16} />
              <span><strong>Location:</strong> {activeAlert.location?.address || activeAlert.location || 'Emergency Ward'}</span>
            </div>
            <div className="sos-info-row">
              <Clock size={16} />
              <span><strong>Time:</strong> {activeAlert.timestamp || 'Just now'}</span>
            </div>
          </div>
        </div>

        {activeAlert.patientCondition && (
          <div className="sos-condition-note">
            <strong>Condition:</strong> {activeAlert.patientCondition}
          </div>
        )}

        <div className="sos-actions-row">
          {hasResponded ? (
            <button className="sos-btn-respond" style={{ background: '#16a34a' }}>
              <Check size={18} /> Response Registered (Dispatching)
            </button>
          ) : (
            <>
              <button className="sos-btn-respond" onClick={handleRespond}>
                <HeartHandshake size={18} /> I Can Donate / Dispatch
              </button>
              <button className="sos-btn-dismiss" onClick={() => setActiveAlert(null)}>
                Dismiss
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
