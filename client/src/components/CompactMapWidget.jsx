import { useEffect, useRef, useState } from 'react'
import { MapPin, Navigation, ExternalLink, Activity, Radio, AlertTriangle } from 'lucide-react'
import './CompactMapWidget.css'

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBHiUmVRMd_mJioAiHvijqx93Fm9d83P4g'

// Key Facilities for Compact Preview
const PREVIEW_FACILITIES = [
  { id: 'bb1', name: 'Dr. Hedgewar Raktpedhi', type: 'blood-bank', lat: 21.1180, lng: 79.0880, units: 84 },
  { id: 'bb2', name: 'LifeSource Blood Bank', type: 'blood-bank', lat: 21.1420, lng: 79.0790, units: 145 },
  { id: 'h1', name: 'GMCH Hospital (Code Red Requester)', type: 'hospital', lat: 21.1275, lng: 79.0963, emergency: true },
  { id: 'h2', name: 'AIIMS Nagpur Blood Centre', type: 'hospital', lat: 21.0374, lng: 79.0270, emergency: false },
  { id: 'h3', name: 'Kingsway Hospitals', type: 'hospital', lat: 21.1555, lng: 79.0854, emergency: false },
]

// Emergency Route Waypoints (Code Red Corridor: Blood Bank -> GMCH)
const EMERGENCY_ROUTE = [
  { lat: 21.1180, lng: 79.0880 },
  { lat: 21.1215, lng: 79.0910 },
  { lat: 21.1240, lng: 79.0935 },
  { lat: 21.1275, lng: 79.0963 },
]

export default function CompactMapWidget({ onViewFullMap, hasActiveEmergency = true }) {
  const mapRef = useRef(null)
  const [mapEngine, setMapEngine] = useState('google') // 'google' | 'leaflet'

  useEffect(() => {
    let isMounted = true

    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        initGoogleMap()
        return
      }

      const existingScript = document.getElementById('google-maps-script')
      if (existingScript) {
        existingScript.onload = () => initGoogleMap()
        return
      }

      const script = document.createElement('script')
      script.id = 'google-maps-script'
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places,geometry`
      script.async = true
      script.defer = true
      script.onload = () => {
        if (isMounted) initGoogleMap()
      }
      script.onerror = () => {
        if (isMounted) loadLeafletMap()
      }
      document.head.appendChild(script)
    }

    const loadLeafletMap = () => {
      setMapEngine('leaflet')
      if (window.L) {
        initLeafletMap()
        return
      }

      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)

      const script = document.createElement('script')
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = () => {
        if (isMounted) initLeafletMap()
      }
      document.head.appendChild(script)
    }

    loadGoogleMaps()

    return () => {
      isMounted = false
    }
  }, [hasActiveEmergency])

  // Google Maps Initialization
  const initGoogleMap = () => {
    if (!mapRef.current || !window.google || !window.google.maps) return

    try {
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: 21.1300, lng: 79.0900 },
        zoom: 13,
        disableDefaultUI: true,
        zoomControl: true,
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#020617' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
          { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#334155' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#020617' }] },
        ],
      })

      // Plot Facility Markers
      PREVIEW_FACILITIES.forEach(fac => {
        const isBank = fac.type === 'blood-bank'
        const isEmergency = fac.emergency && hasActiveEmergency

        const markerColor = isEmergency ? '#ef4444' : isBank ? '#38bdf8' : '#22c55e'

        const svgPin = `
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="${markerColor}">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            <circle cx="12" cy="9" r="3" fill="#ffffff"/>
          </svg>
        `

        new window.google.maps.Marker({
          position: { lat: fac.lat, lng: fac.lng },
          map,
          title: fac.name,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgPin),
            scaledSize: new window.google.maps.Size(28, 28),
          },
        })
      })

      // Draw Code Red Emergency Polyline Route
      if (hasActiveEmergency) {
        new window.google.maps.Polyline({
          path: EMERGENCY_ROUTE,
          geodesic: true,
          strokeColor: '#ef4444',
          strokeOpacity: 0.9,
          strokeWeight: 4,
          map,
        })
      }
    } catch (e) {
      console.warn('Google map initialization error, falling back to Leaflet', e)
    }
  }

  // Leaflet OpenStreetMap Fallback
  const initLeafletMap = () => {
    if (!mapRef.current || !window.L) return

    try {
      if (mapRef.current._leaflet_id) return

      const map = window.L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([21.1300, 79.0900], 13)

      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map)

      // Add Markers
      PREVIEW_FACILITIES.forEach(fac => {
        const isBank = fac.type === 'blood-bank'
        const isEmergency = fac.emergency && hasActiveEmergency
        const color = isEmergency ? '#ef4444' : isBank ? '#38bdf8' : '#22c55e'

        const customIcon = window.L.divIcon({
          className: 'compact-custom-pin',
          html: `<div style="background:${color}; width:16px; height:16px; border-radius:50%; border:2px solid #fff; box-shadow:0 0 10px ${color}"></div>`,
          iconSize: [16, 16],
        })

        window.L.marker([fac.lat, fac.lng], { icon: customIcon }).addTo(map)
      })

      // Code Red Polyline
      if (hasActiveEmergency) {
        window.L.polyline(
          EMERGENCY_ROUTE.map(p => [p.lat, p.lng]),
          { color: '#ef4444', weight: 4, opacity: 0.9, dashArray: '6, 6' }
        ).addTo(map)
      }
    } catch (err) {
      console.error('Leaflet fallback init failed', err)
    }
  }

  return (
    <div className="compact-map-widget animate-fade-in">
      <div className="compact-map-header">
        <div className="compact-map-title">
          <MapPin size={18} color="#38bdf8" />
          <span>Live Regional Map & Transit</span>
        </div>

        {hasActiveEmergency && (
          <div className="compact-map-status-pill">
            <Radio size={12} />
            <span>CODE RED ACTIVE</span>
          </div>
        )}
      </div>

      <div className="compact-map-canvas" ref={mapRef}>
        {hasActiveEmergency && (
          <div className="compact-map-route-banner">
            <div className="compact-map-route-text">
              <AlertTriangle size={14} />
              <span>Dr. Hedgewar Bank ➔ GMCH Emergency Transit</span>
            </div>
            <div className="compact-map-route-eta">ETA: 4 min</div>
          </div>
        )}
      </div>

      <div className="compact-map-footer">
        <div className="compact-map-legend">
          <div className="compact-legend-item">
            <div className="compact-legend-dot bank" />
            <span>Blood Bank</span>
          </div>
          <div className="compact-legend-item">
            <div className="compact-legend-dot hospital" />
            <span>Hospital</span>
          </div>
          <div className="compact-legend-item">
            <div className="compact-legend-dot emergency" />
            <span>Code Red Route</span>
          </div>
        </div>

        <button
          className="compact-map-full-btn"
          onClick={onViewFullMap}
          title="Open Full Screen Map"
        >
          <span>View Full Map</span>
          <ExternalLink size={14} />
        </button>
      </div>
    </div>
  )
}
