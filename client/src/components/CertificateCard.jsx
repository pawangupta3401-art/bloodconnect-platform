import React, { useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { Download, Share2, Award, CheckCircle2, ShieldCheck, Heart } from 'lucide-react'

export default function CertificateCard({
  certificateId = 'BC-2026-X99Q-88A',
  donorName = 'Arjun Sharma',
  bloodGroup = 'O+',
  donationDate = '28 August 2026',
  bankName = 'LifeSource Central Blood Bank',
  livesImpacted = 3,
  showActions = true,
}) {
  const cardRef = useRef(null)
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleDownloadImage = async () => {
    if (!cardRef.current) return
    setDownloading(true)
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: '#0c0205',
        useCORS: true,
      })
      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `BloodConnect-Certificate-${donorName.replace(/\s+/g, '_')}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Failed to generate certificate image:', err)
    } finally {
      setDownloading(false)
    }
  }

  const handleCopyShareLink = () => {
    const url = `${window.location.origin}/certificate/${certificateId}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', maxWidth: 640 }}>
      {/* Printable / Renderable Certificate Frame */}
      <div
        ref={cardRef}
        style={{
          width: '100%',
          background: 'linear-gradient(135deg, #180309 0%, #2b0410 40%, #120206 100%)',
          border: '2px solid rgba(255, 71, 87, 0.5)',
          borderRadius: 24,
          padding: '36px 32px',
          boxShadow: '0 25px 60px rgba(255, 23, 68, 0.25)',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {/* Subtle background decorative seals */}
        <div
          style={{
            position: 'absolute',
            right: '-30px',
            bottom: '-30px',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255, 71, 87, 0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Certificate Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#ff4757', marginBottom: 6 }}>
            <Award size={28} />
            <span style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase' }}>
              Official Certificate of Donation
            </span>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, margin: '6px 0', color: '#fff' }}>
            Blood<span style={{ color: '#ff4757' }}>Connect</span> Life Hero Award
          </h2>
          <div style={{ fontSize: '0.78rem', color: '#475569' }}>
            National Real-Time Blood Inventory Platform • Verified Ledger Entry
          </div>
        </div>

        {/* Presented To */}
        <div style={{ textAlign: 'center', margin: '24px 0' }}>
          <div style={{ fontSize: '0.85rem', color: '#334155', fontStyle: 'italic', marginBottom: 6 }}>
            This certificate is proudly awarded to
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#ff4757', letterSpacing: '-0.5px' }}>
            {donorName}
          </div>
          <div style={{ fontSize: '0.95rem', color: '#0F172A', marginTop: 8 }}>
            for voluntarily donating blood and helping save up to <strong style={{ color: '#00E676' }}>{livesImpacted} precious lives</strong>.
          </div>
        </div>

        {/* Details Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 16,
            padding: '16px',
            margin: '20px 0',
            textAlign: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '0.7rem', color: '#475569', textTransform: 'uppercase' }}>Blood Group</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ff4757', marginTop: 2 }}>{bloodGroup}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#475569', textTransform: 'uppercase', fontWeight: 700 }}>Date</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A', marginTop: 4 }}>{donationDate}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#475569', textTransform: 'uppercase', fontWeight: 700 }}>Certified At</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0F172A', marginTop: 4 }}>{bankName}</div>
          </div>
        </div>

        {/* Footer info & Security Hash */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid #E2E8F0', fontSize: '0.75rem', color: '#475569' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <ShieldCheck size={14} color="#059669" />
            <span>Cert ID: <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>{certificateId}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Heart size={14} color="#ff4757" />
            <span style={{ color: '#00E676', fontWeight: 700 }}>+10 Trust Score Added</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div style={{ display: 'flex', gap: 12, width: '100%', justifyContent: 'center' }}>
          <button
            onClick={handleDownloadImage}
            disabled={downloading}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #ff4757, #b71c1c)',
              color: '#fff',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: downloading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 8px 20px rgba(255, 71, 87, 0.4)',
            }}
          >
            <Download size={16} />
            {downloading ? 'Generating Image...' : 'Download Certificate (PNG)'}
          </button>

          <button
            onClick={handleCopyShareLink}
            style={{
              padding: '12px 18px',
              borderRadius: 12,
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {copied ? <CheckCircle2 size={16} color="#00E676" /> : <Share2 size={16} />}
            {copied ? 'Link Copied!' : 'Share'}
          </button>
        </div>
      )}
    </div>
  )
}
