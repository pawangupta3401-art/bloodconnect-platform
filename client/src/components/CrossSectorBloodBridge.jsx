import React, { useState, useEffect, useCallback } from 'react'
import {
  Building,
  Building2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  SunMedium,
  RotateCcw,
  CheckCircle2,
  Info,
  Layers,
  Sparkles,
  TrendingDown,
  TrendingUp,
  MapPin,
  Clock,
  ShieldCheck,
  Radio,
  FileCheck,
  Truck,
} from 'lucide-react'
import { apiCall } from '../config/api'
import { useAuth } from '../context/AuthContext'
import AuthorizeSectorTransferModal from './AuthorizeSectorTransferModal'
import './CrossSectorBloodBridge.css'

export default function CrossSectorBloodBridge({
  isAdmin = true,
  userRole = null,
  userBankName = null,
  onSuggestionUpdate = null,
  compact = false,
}) {
  const auth = useAuth()
  const currentRole = userRole || auth?.user?.role || (isAdmin ? 'admin' : 'donor')
  const currentBankName = userBankName || auth?.user?.bankName || 'Nagpur Central Blood Bank'

  const canSimulate = currentRole === 'admin'
  const canAuthorize = currentRole === 'admin' || currentRole === 'blood-bank'
  const [analysis, setAnalysis] = useState({
    governmentStockFullnessAvg: 62,
    privateStockFullnessAvg: 54,
    gapPercentage: 8,
    isImbalanced: false,
    alertMessage: null,
    crossSectorOpportunities: [],
    totalCrossSectorSuggestions: 0,
    summerSimulationActive: false,
    citationNote:
      'This feature addresses a documented real-world pattern — Nagpur experienced exactly this government/private stock imbalance during summer 2026 due to seasonal donor drop-off.',
    govBanksCount: 5,
    pvtBanksCount: 6,
  })

  const [loading, setLoading] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)
  const [filterType, setFilterType] = useState('hospital-connect') // 'hospital-connect' | 'cross-sector' | 'all'
  const [allSuggestions, setAllSuggestions] = useState([])
  const [activeTransfers, setActiveTransfers] = useState([])
  const [selectedSuggestionForAuth, setSelectedSuggestionForAuth] = useState(null)

  const showToast = (msg, type = 'info') => {
    setToastMessage({ msg, type })
    setTimeout(() => setToastMessage(null), 4000)
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const { ok, data } = await apiCall('/api/v1/redistribution/suggestions')
      if (ok && data) {
        if (data.crossSectorAnalysis) {
          setAnalysis(data.crossSectorAnalysis)
        }
        if (data.suggestions) {
          setAllSuggestions(data.suggestions)
        }
      }

      // Load active authorized transfers
      const transferRes = await apiCall('/api/v1/redistribution/transfers')
      if (transferRes.ok && transferRes.data?.transfers) {
        setActiveTransfers(transferRes.data.transfers)
      }
    } catch (err) {
      console.error('Failed to load Cross-Sector analysis:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSimulateSummer = async () => {
    setSimulating(true)
    try {
      const { ok, data } = await apiCall('/api/v1/redistribution/simulate-summer', {
        method: 'POST',
      })
      if (ok && data) {
        if (data.analysis) setAnalysis(data.analysis)
        if (data.suggestions) setAllSuggestions(data.suggestions)
        showToast(
          '☀️ Summer Shortage Pattern Simulated! Government surplus vs Private deficit active.',
          'warning'
        )
        if (onSuggestionUpdate) onSuggestionUpdate()
      } else {
        // Local simulation fallback
        setAnalysis((prev) => ({
          ...prev,
          governmentStockFullnessAvg: 85,
          privateStockFullnessAvg: 15,
          gapPercentage: 70,
          isImbalanced: true,
          summerSimulationActive: true,
          alertMessage:
            '⚠️ Sector Imbalance Detected: Government banks averaging 85% stocked vs Private banks averaging 15% stocked — plus 1 hospital with active critical need (AIIMS Nagpur Trauma Care)',
        }))
        showToast(
          '☀️ Summer Shortage Pattern Simulated (Local Fallback)',
          'warning'
        )
      }
    } catch (err) {
      console.error('Simulation error:', err)
    } finally {
      setSimulating(false)
    }
  }

  const handleResetSimulation = async () => {
    setSimulating(true)
    try {
      const { ok, data } = await apiCall('/api/v1/redistribution/reset-simulation', {
        method: 'POST',
      })
      if (ok && data) {
        if (data.analysis) setAnalysis(data.analysis)
        if (data.suggestions) setAllSuggestions(data.suggestions)
        showToast('🔄 Simulation Reset: Inventory returned to normal baseline.', 'success')
        if (onSuggestionUpdate) onSuggestionUpdate()
      } else {
        setAnalysis((prev) => ({
          ...prev,
          governmentStockFullnessAvg: 75,
          privateStockFullnessAvg: 56,
          gapPercentage: 19,
          isImbalanced: true,
          summerSimulationActive: false,
          alertMessage:
            '⚠️ Sector Imbalance Detected: Government banks averaging 75% stocked vs Private banks averaging 56% stocked — plus 1 hospital with active critical need (AIIMS Nagpur Trauma Care)',
        }))
        showToast('🔄 Simulation Reset to Normal (Local Fallback)', 'success')
      }
    } catch (err) {
      console.error('Reset simulation error:', err)
    } finally {
      setSimulating(false)
    }
  }

  const handleTransferCompleted = (transfer) => {
    showToast(`✅ Cross-Sector Transfer #${transfer.id} Handover Confirmed!`, 'success')
    loadData()
    if (onSuggestionUpdate) onSuggestionUpdate()
  }

  const hospitalSuggestions = allSuggestions.filter(
    (s) => s.isHospitalConnect || s.targetFacilityType === 'hospital' || s.targetBankType === 'hospital'
  )
  const bankToBankSuggestions = allSuggestions.filter(
    (s) => s.cross_sector && !s.isHospitalConnect && s.targetFacilityType !== 'hospital' && s.targetBankType !== 'hospital'
  )

  const displayedOpportunities =
    filterType === 'hospital-connect'
      ? hospitalSuggestions
      : filterType === 'cross-sector'
      ? bankToBankSuggestions
      : allSuggestions

  return (
    <div className={`cross-sector-bridge-card ${compact ? 'compact' : ''}`}>
      {/* ── AUTHORIZATION & LIVE TRACKING MODAL ── */}
      {selectedSuggestionForAuth && (
        <AuthorizeSectorTransferModal
          suggestion={selectedSuggestionForAuth}
          onClose={() => setSelectedSuggestionForAuth(null)}
          onTransferCompleted={handleTransferCompleted}
        />
      )}

      {/* ── TOAST NOTIFICATION ── */}
      {toastMessage && (
        <div className={`cs-toast cs-toast-${toastMessage.type} animate-fade-in`}>
          <span>{toastMessage.msg}</span>
        </div>
      )}

      {/* ── CARD HEADER ── */}
      <div className="cs-header">
        <div className="cs-title-group">
          <div className="cs-badge-pill">
            <span className="cs-pulse-dot"></span>
            {currentRole === 'health-officer' ? '🏛️ Public Health Policy Telemetry' : (currentRole === 'auditor' ? '📋 Compliance Audit Trail' : 'Cross-Sector Intelligence')}
          </div>
          <h3 className="cs-title">
            🏛️ ➔ 🏥 Cross-Sector Blood Bridge
          </h3>
          <p className="cs-subtitle">
            {currentRole === 'health-officer'
              ? 'Government / Private sector balance surveillance for state health policy planning and seasonal shortage mitigation.'
              : 'Proactive rebalancing bridging government-run blood reserves (GMC, AIIMS, SSH) to replenish deficit-hit private facilities & trauma hospitals.'}
          </p>
        </div>

        {/* ── SIMULATOR / TOOLBAR (Admin has simulator; others have refresh/oversight view) ── */}
        <div className="cs-simulator-toolbar">
          {canSimulate ? (
            <>
              <div className="cs-sim-tag-group">
                <span className="cs-sim-badge">
                  <Sparkles size={12} /> LIVE DEMO SIMULATOR
                </span>
              </div>
              <div className="cs-btn-group">
                {!analysis.summerSimulationActive ? (
                  <button
                    id="btn-simulate-summer"
                    className="cs-btn cs-btn-simulate"
                    onClick={handleSimulateSummer}
                    disabled={simulating}
                    title="Simulate Nagpur Summer Shortage: Govt surplus 75-90% vs Private deficit 10-25%"
                  >
                    <SunMedium size={15} />
                    <span>{simulating ? 'Simulating...' : 'Simulate Summer Shortage Pattern'}</span>
                  </button>
                ) : (
                  <button
                    id="btn-reset-simulation"
                    className="cs-btn cs-btn-reset"
                    onClick={handleResetSimulation}
                    disabled={simulating}
                    title="Reset inventory back to standard seed state"
                  >
                    <RotateCcw size={15} />
                    <span>{simulating ? 'Resetting...' : 'Reset to Normal'}</span>
                  </button>
                )}

                <button
                  className="cs-btn cs-btn-refresh"
                  onClick={loadData}
                  disabled={loading}
                  title="Refresh Cross-Sector Telemetry"
                >
                  <RefreshCw size={14} className={loading ? 'cs-spin' : ''} />
                </button>
              </div>
            </>
          ) : (
            <div className="cs-btn-group">
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                {currentRole === 'health-officer' ? '🏛️ Health Dept Oversight Mode' : '👁️ Read-Only Mode'}
              </span>
              <button
                className="cs-btn cs-btn-refresh"
                onClick={loadData}
                disabled={loading}
                title="Refresh Cross-Sector Telemetry"
              >
                <RefreshCw size={14} className={loading ? 'cs-spin' : ''} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── STEP 1: SECTOR FULLNESS COMPARISON GAUGES ── */}
      <div className="cs-gauges-grid">
        {/* Government Sector Card */}
        <div className="cs-gauge-card cs-gov-gauge">
          <div className="cs-gauge-top">
            <div className="cs-sector-icon-wrap gov-icon">
              <Building size={20} />
            </div>
            <div>
              <div className="cs-sector-label">GOVERNMENT SECTOR</div>
              <div className="cs-sector-sub">GMC, AIIMS, SSH, Model Banks</div>
            </div>
            <span className="cs-trend-badge trend-up">
              <TrendingUp size={13} /> {analysis.governmentStockFullnessAvg >= 70 ? 'Surplus' : 'Adequate'}
            </span>
          </div>

          <div className="cs-fullness-value-row">
            <span className="cs-fullness-percent">{analysis.governmentStockFullnessAvg}%</span>
            <span className="cs-fullness-caption">Avg. Stock Fullness</span>
          </div>

          <div className="cs-progress-track">
            <div
              className="cs-progress-fill gov-fill"
              style={{ width: `${analysis.governmentStockFullnessAvg}%` }}
            ></div>
          </div>

          <div className="cs-gauge-footer">
            <span>Reserves Status: <strong>{analysis.governmentStockFullnessAvg >= 70 ? 'High Buffer Available' : 'Nominal Safe Zone'}</strong></span>
          </div>
        </div>

        {/* Dynamic Sector Gap Badge */}
        <div className="cs-gap-indicator-card">
          <div className="cs-gap-title">SECTOR STOCK GAP</div>
          <div className={`cs-gap-val ${analysis.isImbalanced ? 'gap-alert' : 'gap-normal'}`}>
            {analysis.gapPercentage}%
          </div>
          <div className="cs-gap-sub">
            {analysis.gapPercentage >= 25 ? '🚨 Significant Asymmetry (≥25%)' : '✅ Balanced (<25% Gap)'}
          </div>
        </div>

        {/* Private Sector Card */}
        <div className="cs-gauge-card cs-pvt-gauge">
          <div className="cs-gauge-top">
            <div className="cs-sector-icon-wrap pvt-icon">
              <Building2 size={20} />
            </div>
            <div>
              <div className="cs-sector-label">PRIVATE SECTOR</div>
              <div className="cs-sector-sub">Kingsway, Care, Alexis, Clinics</div>
            </div>
            <span className={`cs-trend-badge ${analysis.privateStockFullnessAvg <= 30 ? 'trend-crit' : 'trend-down'}`}>
              <TrendingDown size={13} /> {analysis.privateStockFullnessAvg <= 30 ? 'Critical Deficit' : 'Normal'}
            </span>
          </div>

          <div className="cs-fullness-value-row">
            <span className="cs-fullness-percent pvt-val">{analysis.privateStockFullnessAvg}%</span>
            <span className="cs-fullness-caption">Avg. Stock Fullness</span>
          </div>

          <div className="cs-progress-track">
            <div
              className={`cs-progress-fill ${analysis.privateStockFullnessAvg <= 30 ? 'pvt-crit-fill' : 'pvt-fill'}`}
              style={{ width: `${analysis.privateStockFullnessAvg}%` }}
            ></div>
          </div>

          <div className="cs-gauge-footer">
            <span>Reserves Status: <strong>{analysis.privateStockFullnessAvg <= 30 ? '⚠️ Severe Seasonal Drop-Off' : 'Adequate Buffer'}</strong></span>
          </div>
        </div>
      </div>

      {/* ── STEP 1: IMBALANCE ALERT BANNER ── */}
      {(analysis.isImbalanced || analysis.alertMessage) && (
        <div className="cs-alert-banner animate-bounce-short">
          <div className="cs-alert-icon">
            <AlertTriangle size={24} />
          </div>
          <div className="cs-alert-content">
            <div className="cs-alert-title">
              {analysis.alertMessage ||
                `⚠️ Sector Imbalance Detected: Government banks averaging ${analysis.governmentStockFullnessAvg}% stocked vs Private banks averaging ${analysis.privateStockFullnessAvg}% stocked — plus 1 hospital with active critical need (AIIMS Nagpur Trauma Care)`}
            </div>
            <div className="cs-alert-desc">
              Summer donor migration and extreme temperatures have created critical shortages in private hospital blood banks, while regional government hubs maintain surplus units. Proactive direct redistribution to hospitals &amp; private facilities recommended below.
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 1 & 2: SPECIFIC REDISTRIBUTION OPPORTUNITIES WITH REVIEW BUTTON ── */}
      <div className="cs-opportunities-section">
        <div className="cs-section-header">
          <div className="cs-section-title-wrap">
            <Layers size={17} />
            <h4>Cross-Sector Redistribution Opportunities ({displayedOpportunities.length})</h4>
          </div>

          {/* STEP 1: 3-Way Filter Toggle including 🏛️➔🏥 Hospital Connect */}
          <div className="cs-filter-toggle">
            <button
              id="btn-filter-hospital-connect"
              className={`cs-filter-btn ${filterType === 'hospital-connect' ? 'active' : ''}`}
              onClick={() => setFilterType('hospital-connect')}
            >
              🏛️➔🏥 Hospital Connect ({hospitalSuggestions.length})
            </button>
            <button
              id="btn-filter-cross-sector"
              className={`cs-filter-btn ${filterType === 'cross-sector' ? 'active' : ''}`}
              onClick={() => setFilterType('cross-sector')}
            >
              🏛️➔🏦 Bank-to-Bank Priority ({bankToBankSuggestions.length})
            </button>
            <button
              id="btn-filter-all"
              className={`cs-filter-btn ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              All Suggestions ({allSuggestions.length})
            </button>
          </div>
        </div>

        {displayedOpportunities.length === 0 ? (
          <div className="cs-empty-state">
            <CheckCircle2 size={32} color="#00E676" />
            <p>
              {filterType === 'hospital-connect'
                ? 'No active Code Red hospital demands currently unfulfilled.'
                : 'No acute cross-sector transfers required at current inventory balance.'}
            </p>
            {isAdmin && !analysis.summerSimulationActive && (
              <button className="cs-btn cs-btn-sm cs-btn-simulate" onClick={handleSimulateSummer}>
                <SunMedium size={14} /> Test with "Simulate Summer Shortage Pattern"
              </button>
            )}
          </div>
        ) : (
          <div className="cs-opp-list">
            {displayedOpportunities.map((opp) => {
              const isHospital = opp.isHospitalConnect || opp.targetFacilityType === 'hospital' || opp.targetBankType === 'hospital'
              const isCrossSector = opp.cross_sector || isHospital || (opp.sourceBankType === 'government' && (opp.targetBankType === 'private' || opp.targetBankType === 'trust_run'))
              const isAccepted = opp.status === 'accepted'

              return (
                <div
                  key={opp.id}
                  className={`cs-opp-card ${isHospital ? 'cs-hospital-connect-highlight' : (isCrossSector ? 'cs-cross-sector-highlight' : '')} ${isAccepted ? 'cs-opp-accepted' : ''}`}
                >
                  <div className="cs-opp-main">
                    {/* Badge Row */}
                    <div className="cs-opp-badge-row">
                      <span className="cs-id-tag">#{opp.id}</span>
                      {isHospital ? (
                        <span className="cs-priority-badge cs-hospital-badge">
                          🏛️➔🏥 Hospital Connect
                        </span>
                      ) : isCrossSector ? (
                        <span className="cs-priority-badge">
                          🏛️➔🏦 Bank-to-Bank Transfer
                        </span>
                      ) : null}

                      {isHospital && opp.activeCodeRedCount > 0 && (
                        <span className="cs-code-red-pill animate-pulse">
                          🚨 {opp.urgencyLabel || `${opp.activeCodeRedCount} Active Code Red`}
                        </span>
                      )}

                      <span className="cs-blood-pill">{opp.bloodGroup}</span>
                      <span className="cs-units-tag">
                        <strong>{opp.unitsSuggested} Units</strong> Suggested
                      </span>
                      {opp.daysToExpiry && (
                        <span className="cs-expiry-pill">
                          <Clock size={12} /> Expiry in {opp.daysToExpiry}d at Source
                        </span>
                      )}
                    </div>

                    {/* Transfer Route */}
                    <div className="cs-route-row">
                      <div className="cs-route-node cs-node-src">
                        <span className="cs-node-type-tag gov-tag">🏛️ GOV SURPLUS</span>
                        <div className="cs-node-name">{opp.sourceBankName}</div>
                      </div>

                      <div className="cs-route-arrow-wrap">
                        <span className="cs-dist-badge">
                          <MapPin size={11} /> {opp.distanceKm} km
                        </span>
                        <ArrowRight size={20} className="cs-arrow-icon" />
                      </div>

                      <div className={`cs-route-node ${isHospital ? 'cs-node-hosp' : 'cs-node-tgt'}`}>
                        <span className={`cs-node-type-tag ${isHospital ? 'hosp-tag' : 'pvt-tag'}`}>
                          {isHospital ? '🏥 HOSPITAL DESTINATION (CODE RED)' : '🏦 PVT DEFICIT'}
                        </span>
                        <div className="cs-node-name">{opp.targetBankName}</div>
                        {isHospital && opp.targetArea && (
                          <div className="cs-node-sub-area">📍 {opp.targetArea}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Column — Connect to Hospital / Authorize Transfer */}
                  <div className="cs-opp-action-col">
                    {isAccepted ? (
                      <button
                        className="cs-btn cs-btn-review accepted"
                        onClick={() => setSelectedSuggestionForAuth(opp)}
                      >
                        <CheckCircle2 size={15} /> Dispatched • View Telemetry
                      </button>
                    ) : canAuthorize ? (
                      <button
                        id={`btn-auth-${opp.id}`}
                        className={`cs-btn cs-btn-review ${isHospital ? 'cs-btn-hospital-connect' : ''}`}
                        onClick={() => setSelectedSuggestionForAuth(opp)}
                      >
                        {isHospital ? '⚡ Connect to Hospital' : '📋 Review & Authorize Transfer'}
                      </button>
                    ) : (
                      <button
                        className="cs-btn cs-btn-review"
                        style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', cursor: 'default' }}
                        onClick={() => setSelectedSuggestionForAuth(opp)}
                        title="Read-only view for oversight roles"
                      >
                        👁️ View Details (Read-Only)
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── STEP 3: ACTIVE SECTOR TRANSFERS TRACKING TABLE ── */}
      {activeTransfers.length > 0 && (
        <div className="cs-transfers-table-section">
          <div className="cs-transfers-table-header">
            <div className="cs-section-title-wrap">
              <Radio size={16} color="#38bdf8" />
              <h4>Active Sector Transfers ({activeTransfers.length})</h4>
            </div>
            <span className="cs-transfers-count-badge">
              {activeTransfers.filter(t => t.status === 'in_transit').length} In Transit
            </span>
          </div>

          <div className="cs-transfers-table-wrap">
            <table className="cs-transfers-table">
              <thead>
                <tr>
                  <th>Transfer ID</th>
                  <th>Route (Gov ➔ Destination)</th>
                  <th>Blood Group &amp; Units</th>
                  <th>Transport Mode</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {activeTransfers.map((t) => {
                  const isInTransit = t.status === 'in_transit'
                  const isDrone = t.transportMethod === 'drone'
                  const isHospitalTarget = t.targetFacilityType === 'hospital' || t.targetBankType === 'hospital'

                  return (
                    <tr key={t.id} className={isInTransit ? 'row-in-transit' : ''}>
                      <td className="cell-id">
                        <code>{t.id}</code>
                        <div className="cell-time">{new Date(t.authorizedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="cell-route">
                        <div className="route-names">
                          <span className="gov-color">{t.sourceBankName.split(' ')[0]}</span>
                          <span className="route-arrow">➔</span>
                          <span className={isHospitalTarget ? 'hosp-color' : 'pvt-color'}>
                            {isHospitalTarget ? `🏥 ${t.targetBankName.replace(' Trauma Care', '')}` : t.targetBankName.split(' ')[0]}
                          </span>
                        </div>
                        <div className="route-dist">📍 {t.distanceKm} km</div>
                      </td>
                      <td className="cell-blood">
                        <span className="cs-blood-pill small">{t.bloodGroup}</span>
                        <span className="units-bold">{t.units} Units</span>
                      </td>
                      <td className="cell-mode">
                        <div className="transport-mode-pill">
                          <span>{isDrone ? '🛸 Drone' : '🚑 Ambulance'}</span>
                          <span className="mode-eta">~{t.etaMins}m ETA</span>
                        </div>
                      </td>
                      <td className="cell-status">
                        {isInTransit ? (
                          <span className="status-pill in-transit">
                            <span className="pulse-dot-green"></span> In Transit
                          </span>
                        ) : (
                          <span className="status-pill completed">
                            ✅ Completed
                          </span>
                        )}
                      </td>
                      <td className="cell-action">
                        <button
                          className="btn-track-transfer"
                          onClick={() => setSelectedSuggestionForAuth(t)}
                        >
                          📡 {isInTransit ? 'Live Radar' : 'View Slip'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── STEP 4: SUPPORTING CONTEXT / CITATION FOOTNOTE ── */}
      <div className="cs-citation-footnote">
        <Info size={15} className="cs-info-icon" />
        <span>
          <strong>Real-World Clinical Evidence:</strong> {analysis.citationNote}
        </span>
      </div>
    </div>
  )
}
