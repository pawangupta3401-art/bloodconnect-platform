import { useState, useEffect } from 'react'
import { Database, Sparkles, RefreshCw, CheckCircle2, AlertTriangle, MapPin, Radio, ShieldCheck } from 'lucide-react'
import './SupabaseGeminiDataHub.css'

import { API_BASE } from '../config/api'
const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']

export default function SupabaseGeminiDataHub() {
  const [banks, setBanks] = useState([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [region, setRegion] = useState('Nagpur')
  const [count, setCount] = useState(8)
  const [status, setStatus] = useState({
    supabaseConnected: true,
    activeMode: 'Supabase Cloud Database & Realtime Sync',
    totalBloodBanks: 0,
    lastSyncTimestamp: null,
  })
  const [notification, setNotification] = useState(null)

  // Fetch Supabase status and blood banks
  const loadData = async () => {
    try {
      setLoading(true)
      const [resStatus, resBanks] = await Promise.all([
        fetch(`${API_BASE}/api/v1/supabase/status`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/api/v1/supabase/blood-banks`).then(r => r.json()).catch(() => null)
      ])

      if (resStatus && resStatus.success) {
        setStatus(resStatus)
      }
      if (resBanks && resBanks.success && Array.isArray(resBanks.data)) {
        setBanks(resBanks.data)
      }
    } catch (err) {
      console.error('Failed to fetch Supabase data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Trigger Gemini AI generation and seed to Supabase
  const handleGenerateAndSeed = async () => {
    try {
      setGenerating(true)
      setNotification({ type: 'info', message: `🤖 Gemini AI is generating ${count} realistic blood banks for ${region}...` })

      const res = await fetch(`${API_BASE}/api/v1/supabase/generate-and-seed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ region, count })
      })

      const data = await res.json()
      if (data.success) {
        setBanks(data.data)
        setNotification({
          type: 'success',
          message: `✅ Generated ${data.data.length} blood banks via Gemini 3.6 Flash and saved directly to Supabase!`
        })
        loadData()
      } else {
        setNotification({ type: 'error', message: `⚠️ ${data.message || 'Generation failed'}` })
      }
    } catch (err) {
      setNotification({ type: 'error', message: `❌ Error connecting to backend: ${err.message}` })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="supabase-hub-container animate-fade-in">
      <div className="supabase-hub-header">
        <div className="supabase-hub-title">
          <Database size={28} color="#00E676" />
          <div>
            <h2>Supabase Cloud Database & Gemini AI Pipeline</h2>
            <p>Live synchronized blood bank inventory repository powered by Google Gemini generative telemetry</p>
          </div>
        </div>

        <div className="supabase-badge-group">
          <div className="supabase-status-pill">
            <Radio size={14} />
            <span>Supabase Cloud Sync: Active</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={loadData} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className={`alert ${notification.type === 'success' ? 'alert-success' : notification.type === 'error' ? 'alert-danger' : 'alert-info'}`} style={{ marginBottom: 18 }}>
          {notification.message}
        </div>
      )}

      {/* Generator Control Bar */}
      <div className="supabase-control-bar">
        <div className="supabase-control-inputs">
          <div>
            <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: 4, fontWeight: 700 }}>
              SELECT REGION
            </label>
            <select className="supabase-select" value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="Nagpur">Nagpur (Maharashtra)</option>
              <option value="Mumbai">Mumbai (Maharashtra)</option>
              <option value="Pune">Pune (Maharashtra)</option>
              <option value="Delhi">Delhi NCR</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: 4, fontWeight: 700 }}>
              FACILITY COUNT
            </label>
            <select className="supabase-select" value={count} onChange={(e) => setCount(Number(e.target.value))}>
              <option value={4}>4 Blood Banks</option>
              <option value={8}>8 Blood Banks (Recommended)</option>
              <option value={12}>12 Full Corridor Facilities</option>
            </select>
          </div>
        </div>

        <button
          className="supabase-gen-btn"
          onClick={handleGenerateAndSeed}
          disabled={generating}
        >
          <Sparkles size={18} />
          <span>{generating ? 'Generating with Gemini AI...' : '⚡ Generate with Gemini & Seed Supabase'}</span>
        </button>
      </div>

      {/* Generated Blood Banks Grid */}
      <div className="supabase-banks-grid">
        {banks.map((bank) => {
          const criticalShortages = bank.critical_shortages || []
          return (
            <div key={bank.id} className="supabase-bank-card">
              <div>
                <div className="supabase-card-top">
                  <div>
                    <h4 className="supabase-bank-name">{bank.name}</h4>
                    <div className="supabase-bank-loc">
                      <MapPin size={12} />
                      <span>{bank.area}, {bank.city}</span>
                    </div>
                  </div>
                  <div className="supabase-total-badge">
                    {bank.total_units || 0} Units
                  </div>
                </div>

                {/* 8-Group Inventory Matrix */}
                <div className="supabase-inv-grid">
                  {BLOOD_GROUPS.map((grp) => {
                    const units = bank.inventory ? bank.inventory[grp] ?? 0 : 0
                    const isCritical = units < 5
                    return (
                      <div
                        key={grp}
                        className="supabase-inv-cell"
                        style={{
                          background: isCritical ? 'rgba(239, 68, 68, 0.15)' : 'rgba(2, 6, 23, 0.6)',
                          borderColor: isCritical ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.06)'
                        }}
                      >
                        <div className="supabase-inv-group">{grp}</div>
                        <div className="supabase-inv-count" style={{ color: isCritical ? '#fca5a5' : '#ffffff' }}>
                          {units}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {bank.ai_analysis && (
                  <div className="supabase-ai-comment">
                    <strong>🤖 Gemini Telemetry:</strong> {bank.ai_analysis}
                  </div>
                )}
              </div>

              <div className="supabase-card-footer">
                <span>Contact: {bank.contact || '24x7 Emergency'}</span>
                <span style={{ color: '#00E676', fontWeight: 600 }}>• Synced in Supabase</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
