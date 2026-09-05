import React, { useState, useEffect } from 'react'

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsInstalled(true)
      return
    }

    const handler = (e) => {
      // Prevent default browser banner
      e.preventDefault()
      setDeferredPrompt(e)
      // Check if user dismissed recently
      const dismissed = localStorage.getItem('pwa_prompt_dismissed')
      if (!dismissed) {
        setShowPrompt(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handler)

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
      console.log('✅ [PWA] App successfully installed!')
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    console.log(`[PWA] User choice: ${outcome}`)
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa_prompt_dismissed', 'true')
  }

  if (isInstalled || !showPrompt) return null

  return (
    <aside
      aria-label="PWA install banner"
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 99999,
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        border: '1.5px solid rgba(220, 38, 38, 0.5)',
        borderRadius: 14,
        padding: '12px 16px',
        color: '#ffffff',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45), 0 0 20px rgba(220, 38, 38, 0.25)',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        maxWidth: 360,
        animation: 'slideUp 0.3s ease-out',
        backdropFilter: 'blur(10px)'
      }}
    >
      <img
        src="/icon-192.png"
        alt="BloodConnect App Icon"
        style={{
          width: 42,
          height: 42,
          borderRadius: 10,
          boxShadow: '0 4px 12px rgba(220, 38, 38, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.15)'
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>Install BloodConnect</span>
          <span style={{ fontSize: '0.62rem', padding: '1px 5px', borderRadius: 4, background: '#dc2626', color: '#fff', fontWeight: 700 }}>PWA</span>
        </div>
        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2, lineHeight: 1.3 }}>
          Add to home screen for full-screen native experience &amp; emergency alerts.
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button
          type="button"
          onClick={handleInstallClick}
          style={{
            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: '0.78rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(220, 38, 38, 0.35)',
            whiteSpace: 'nowrap'
          }}
        >
          Install
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            color: '#64748b',
            border: 'none',
            padding: '2px 4px',
            fontSize: '0.68rem',
            cursor: 'pointer',
            textAlign: 'center'
          }}
        >
          Later
        </button>
      </div>
    </aside>
  )
}
