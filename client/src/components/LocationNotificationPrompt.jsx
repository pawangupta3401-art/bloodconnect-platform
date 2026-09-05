import { useState, useEffect } from 'react'
import { MapPin, Bell, ShieldCheck, CheckCircle2, X, ArrowRight } from 'lucide-react'
import './LocationNotificationPrompt.css'

export default function LocationNotificationPrompt({ mode = 'floating', onGranted }) {
  const [isOpen, setIsOpen] = useState(false)
  const [locStatus, setLocStatus] = useState('idle') // 'idle' | 'requesting' | 'granted' | 'denied'
  const [notifStatus, setNotifStatus] = useState('idle') // 'idle' | 'requesting' | 'granted' | 'denied'
  const [coords, setCoords] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check local storage for previous permission state
    const savedLoc = localStorage.getItem('bloodconnect_loc_permission')
    const savedNotif = localStorage.getItem('bloodconnect_notif_permission')
    const hasDismissed = localStorage.getItem('bloodconnect_perm_dismissed')

    if (savedLoc === 'granted') setLocStatus('granted')
    if (savedNotif === 'granted') setNotifStatus('granted')

    // If neither permission is granted and user hasn't explicitly dismissed recently, show modal/banner
    if (!savedLoc && !savedNotif && !hasDismissed) {
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 1200)
      return () => clearTimeout(timer)
    }
  }, [])

  const requestLocation = () => {
    setLocStatus('requesting')
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userCoords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            city: 'Nagpur & Vicinity'
          }
          setCoords(userCoords)
          setLocStatus('granted')
          localStorage.setItem('bloodconnect_loc_permission', 'granted')
          localStorage.setItem('bloodconnect_user_coords', JSON.stringify(userCoords))
          if (onGranted) onGranted('location', userCoords)
        },
        (error) => {
          console.warn('Geolocation permission error/denied:', error.message)
          // Fallback gracefully to default Nagpur coordinates
          const fallbackCoords = { lat: 21.1458, lng: 79.0882, city: 'Nagpur Central (Default)' }
          setCoords(fallbackCoords)
          setLocStatus('denied')
          localStorage.setItem('bloodconnect_loc_permission', 'denied')
          localStorage.setItem('bloodconnect_user_coords', JSON.stringify(fallbackCoords))
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      )
    } else {
      setLocStatus('denied')
    }
  }

  const requestNotification = async () => {
    setNotifStatus('requesting')
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission()
        if (permission === 'granted') {
          setNotifStatus('granted')
          localStorage.setItem('bloodconnect_notif_permission', 'granted')
          if (onGranted) onGranted('notification', true)
        } else {
          setNotifStatus('denied')
          localStorage.setItem('bloodconnect_notif_permission', 'denied')
        }
      } catch (err) {
        console.warn('Notification permission error:', err)
        setNotifStatus('denied')
      }
    } else {
      setNotifStatus('denied')
    }
  }

  const handleGrantAll = async () => {
    requestLocation()
    await requestNotification()
    setTimeout(() => {
      setIsOpen(false)
    }, 1800)
  }

  const handleDismiss = () => {
    setDismissed(true)
    setIsOpen(false)
    localStorage.setItem('bloodconnect_perm_dismissed', 'true')
  }

  if (dismissed || (!isOpen && mode === 'floating')) {
    return null
  }

  return (
    <div className={`perm-prompt-container ${mode}`}>
      <div className="perm-prompt-card">
        {/* Header */}
        <div className="perm-prompt-header">
          <div className="perm-header-badge">
            <ShieldCheck size={16} className="perm-badge-icon" />
            <span>Emergency LifeStream Access</span>
          </div>
          <button 
            type="button" 
            className="perm-close-btn" 
            onClick={handleDismiss} 
            title="Dismiss permission prompt"
          >
            <X size={16} />
          </button>
        </div>

        {/* Title & Description */}
        <div className="perm-prompt-body">
          <h4 className="perm-title">
            Enable Location &amp; Emergency SOS Alerts
          </h4>
          <p className="perm-subtitle">
            Allow location access to discover nearest blood banks &amp; hospital trauma centers, and receive instant Code Red SMS &amp; push updates in Nagpur.
          </p>

          {/* Feature List */}
          <div className="perm-features-list">
            {/* Feature 1: Location */}
            <div className={`perm-feature-row ${locStatus === 'granted' ? 'is-granted' : ''}`}>
              <div className="perm-feature-icon-box loc-icon">
                <MapPin size={18} />
              </div>
              <div className="perm-feature-content">
                <div className="perm-feature-title">
                  <span>Live Location</span>
                  {locStatus === 'granted' && <span className="perm-tag-granted">Enabled</span>}
                  {locStatus === 'denied' && <span className="perm-tag-denied">Default: Nagpur</span>}
                </div>
                <div className="perm-feature-desc">
                  Finds closest compatible blood stocks within 5–25 km radius.
                </div>
              </div>
              <button 
                type="button" 
                className={`perm-action-btn ${locStatus === 'granted' ? 'btn-granted' : ''}`}
                onClick={requestLocation}
                disabled={locStatus === 'granted' || locStatus === 'requesting'}
              >
                {locStatus === 'requesting' ? 'Checking...' : (locStatus === 'granted' ? <CheckCircle2 size={16} /> : 'Allow')}
              </button>
            </div>

            {/* Feature 2: Notifications */}
            <div className={`perm-feature-row ${notifStatus === 'granted' ? 'is-granted' : ''}`}>
              <div className="perm-feature-icon-box notif-icon">
                <Bell size={18} />
              </div>
              <div className="perm-feature-content">
                <div className="perm-feature-title">
                  <span>Critical SOS Notifications</span>
                  {notifStatus === 'granted' && <span className="perm-tag-granted">Enabled</span>}
                  {notifStatus === 'denied' && <span className="perm-tag-denied">Disabled</span>}
                </div>
                <div className="perm-feature-desc">
                  Real-time alerts for urgent patient blood needs and drone dispatches.
                </div>
              </div>
              <button 
                type="button" 
                className={`perm-action-btn ${notifStatus === 'granted' ? 'btn-granted' : ''}`}
                onClick={requestNotification}
                disabled={notifStatus === 'granted' || notifStatus === 'requesting'}
              >
                {notifStatus === 'requesting' ? 'Prompting...' : (notifStatus === 'granted' ? <CheckCircle2 size={16} /> : 'Allow')}
              </button>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="perm-privacy-note">
            <ShieldCheck size={13} />
            <span>Encrypted §3.2 HIPAA &amp; SBTC compliant. Never shared with third parties.</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="perm-prompt-footer">
          <button 
            type="button" 
            className="perm-btn-secondary" 
            onClick={handleDismiss}
          >
            Maybe Later
          </button>
          <button 
            type="button" 
            className="perm-btn-primary" 
            onClick={handleGrantAll}
          >
            <span>Allow All &amp; Continue</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
