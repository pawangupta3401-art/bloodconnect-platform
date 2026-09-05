import React, { useState, useEffect } from 'react'
import { apiCall } from '../config/api'
import { ShieldAlert, AlertTriangle, CheckCircle2, Download, Info, Building2 } from 'lucide-react'

const BLOOD_GROUPS = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']

export default function BloodSecurityIndex() {
  const [indexData, setIndexData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedCell, setSelectedCell] = useState(null)

  useEffect(() => {
    async function fetchSecurityIndex() {
      setLoading(true)
      const { ok, data } = await apiCall('/api/v1/admin/security-index')
      if (ok && data?.districts) {
        setIndexData(data)
      } else {
        // Fallback demo data
        setIndexData({
          summary: {
            totalDistricts: 4,
            totalCriticalCells: 7,
            totalWarningCells: 13,
            totalStableCells: 12,
            vulnerabilityRate: '22%',
            policyRecommendation: 'Immediate inter-district transfer from South Mumbai to Nagpur & Central Delhi recommended for O- and B- reserves.',
          },
          districts: [
            {
              district: 'Nagpur Metro',
              state: 'Maharashtra',
              banksCount: 14,
              groups: {
                'O-':  { units: 18,  daysSupply: 1.9, status: 'critical', dailyUsage: 9.5 },
                'O+':  { units: 142, daysSupply: 5.1, status: 'stable',   dailyUsage: 28.0 },
                'A-':  { units: 22,  daysSupply: 3.5, status: 'warning',  dailyUsage: 6.2 },
                'A+':  { units: 98,  daysSupply: 4.7, status: 'warning',  dailyUsage: 21.0 },
                'B-':  { units: 14,  daysSupply: 1.8, status: 'critical', dailyUsage: 7.8 },
                'B+':  { units: 110, daysSupply: 4.9, status: 'warning',  dailyUsage: 22.5 },
                'AB-': { units: 9,   daysSupply: 2.2, status: 'warning',  dailyUsage: 4.1 },
                'AB+': { units: 62,  daysSupply: 6.2, status: 'stable',   dailyUsage: 10.0 },
              }
            },
            {
              district: 'South Mumbai',
              state: 'Maharashtra',
              banksCount: 22,
              groups: {
                'O-':  { units: 46,  daysSupply: 3.3, status: 'warning',  dailyUsage: 14.0 },
                'O+':  { units: 280, daysSupply: 6.7, status: 'stable',   dailyUsage: 42.0 },
                'A-':  { units: 38,  daysSupply: 4.0, status: 'warning',  dailyUsage: 9.5 },
                'A+':  { units: 195, daysSupply: 6.3, status: 'stable',   dailyUsage: 31.0 },
                'B-':  { units: 24,  daysSupply: 2.1, status: 'warning',  dailyUsage: 11.2 },
                'B+':  { units: 210, daysSupply: 6.2, status: 'stable',   dailyUsage: 34.0 },
                'AB-': { units: 16,  daysSupply: 2.9, status: 'warning',  dailyUsage: 5.5 },
                'AB+': { units: 115, daysSupply: 7.2, status: 'stable',   dailyUsage: 16.0 },
              }
            },
            {
              district: 'Central Delhi',
              state: 'Delhi NCR',
              banksCount: 18,
              groups: {
                'O-':  { units: 29,  daysSupply: 2.4, status: 'warning',  dailyUsage: 12.0 },
                'O+':  { units: 210, daysSupply: 6.4, status: 'stable',   dailyUsage: 33.0 },
                'A-':  { units: 19,  daysSupply: 2.4, status: 'warning',  dailyUsage: 8.0 },
                'A+':  { units: 145, daysSupply: 5.8, status: 'stable',   dailyUsage: 25.0 },
                'B-':  { units: 12,  daysSupply: 1.3, status: 'critical', dailyUsage: 9.0 },
                'B+':  { units: 160, daysSupply: 5.9, status: 'stable',   dailyUsage: 27.0 },
                'AB-': { units: 8,   daysSupply: 1.8, status: 'critical', dailyUsage: 4.5 },
                'AB+': { units: 85,  daysSupply: 7.1, status: 'stable',   dailyUsage: 12.0 },
              }
            },
            {
              district: 'Pune District',
              state: 'Maharashtra',
              banksCount: 19,
              groups: {
                'O-':  { units: 21,  daysSupply: 1.8, status: 'critical', dailyUsage: 11.5 },
                'O+':  { units: 190, daysSupply: 5.4, status: 'stable',   dailyUsage: 35.0 },
                'A-':  { units: 15,  daysSupply: 1.8, status: 'critical', dailyUsage: 8.2 },
                'A+':  { units: 130, daysSupply: 4.8, status: 'warning',  dailyUsage: 27.0 },
                'B-':  { units: 18,  daysSupply: 1.9, status: 'critical', dailyUsage: 9.5 },
                'B+':  { units: 140, daysSupply: 5.0, status: 'stable',   dailyUsage: 28.0 },
                'AB-': { units: 11,  daysSupply: 2.2, status: 'warning',  dailyUsage: 5.0 },
                'AB+': { units: 75,  daysSupply: 5.8, status: 'stable',   dailyUsage: 13.0 },
              }
            }
          ]
        })
      }
      setLoading(false)
    }

    fetchSecurityIndex()
  }, [])

  const getCellColor = (status) => {
    if (status === 'critical') return { bg: 'rgba(255, 23, 68, 0.22)', border: '#ff1744', text: '#ff4757', label: '< 2 Days' }
    if (status === 'warning')  return { bg: 'rgba(255, 145, 0, 0.18)', border: '#ff9100', text: '#ffb300', label: '2-5 Days' }
    return { bg: 'rgba(0, 230, 118, 0.15)', border: '#00E676', text: '#00E676', label: '5+ Days' }
  }

  const exportCSV = () => {
    if (!indexData?.districts) return
    const headers = ['District,State,Banks,' + BLOOD_GROUPS.map(g => `${g} Units,${g} Days Supply`).join(',')]
    const rows = indexData.districts.map(d => {
      const gVals = BLOOD_GROUPS.map(g => `${d.groups[g]?.units || 0},${d.groups[g]?.daysSupply || 0}`).join(',')
      return `"${d.district}","${d.state}",${d.banksCount},${gVals}`
    })
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `BloodConnect-Security-Index-${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#475569' }}>Calculating district blood security index...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header & Policy Summary */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        borderRadius: 18,
        padding: '24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#38bdf8', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              <Building2 size={16} /> State Health Department Policy Intelligence
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', margin: '6px 0' }}>
              District-Level Blood Security Index (Vulnerability Matrix)
            </h2>
            <p style={{ color: '#475569', fontSize: '0.88rem', margin: 0 }}>
              Days of supply remaining = <code>Total Units / Average Daily Consumption</code>.
            </p>
          </div>

          <button
            onClick={exportCSV}
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              color: '#38bdf8',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Download size={16} /> Export State Report (CSV)
          </button>
        </div>

        {/* Metric Cards */}
        {indexData?.summary && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 20 }}>
            <div style={{ background: 'rgba(255, 23, 68, 0.1)', border: '1px solid rgba(255, 23, 68, 0.3)', borderRadius: 12, padding: '12px 16px' }}>
              <div style={{ fontSize: '0.75rem', color: '#ff4757', fontWeight: 700 }}>🚨 Critical Reserves (&lt; 2 Days)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', marginTop: 4 }}>{indexData.summary.totalCriticalCells} Groups</div>
            </div>
            <div style={{ background: 'rgba(255, 145, 0, 0.1)', border: '1px solid rgba(255, 145, 0, 0.3)', borderRadius: 12, padding: '12px 16px' }}>
              <div style={{ fontSize: '0.75rem', color: '#ffb300', fontWeight: 700 }}>⚠️ Warning Reserves (2-5 Days)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', marginTop: 4 }}>{indexData.summary.totalWarningCells} Groups</div>
            </div>
            <div style={{ background: 'rgba(0, 230, 118, 0.1)', border: '1px solid rgba(0, 230, 118, 0.3)', borderRadius: 12, padding: '12px 16px' }}>
              <div style={{ fontSize: '0.75rem', color: '#00E676', fontWeight: 700 }}>✅ Stable Reserves (5+ Days)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', marginTop: 4 }}>{indexData.summary.totalStableCells} Groups</div>
            </div>
          </div>
        )}

        {/* Policy Recommendation Callout */}
        {indexData?.summary?.policyRecommendation && (
          <div style={{ marginTop: 16, background: '#FEF2F2', borderLeft: '4px solid #DC2626', border: '1px solid #FECACA', padding: '12px 16px', borderRadius: 8, fontSize: '0.85rem', color: '#991B1B' }}>
            <strong>💡 AI Policy Action:</strong> {indexData.summary.policyRecommendation}
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', fontSize: '0.82rem', color: '#334155' }}>
        <span style={{ fontWeight: 700 }}>Legend:</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: '#ff1744' }} />
          Critical Vulnerability (&lt; 2.0 days supply)
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: '#ff9100' }} />
          Moderate Risk (2.0 - 5.0 days)
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: '#00E676' }} />
          Secure Buffer (&gt; 5.0 days)
        </span>
      </div>

      {/* Security Matrix Table */}
      <div style={{ overflowX: 'auto', borderRadius: 16, border: '1px solid #E2E8F0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#FFFFFF', color: '#0F172A', border: '1px solid #E2E8F0' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
              <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 800, color: '#0F172A' }}>District</th>
              <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, fontSize: '0.82rem', color: '#334155' }}>Banks</th>
              {BLOOD_GROUPS.map(g => (
                <th key={g} style={{ padding: '14px 12px', textAlign: 'center', fontWeight: 900, color: '#DC2626', fontSize: '0.95rem' }}>
                  {g}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {indexData?.districts?.map(d => (
              <tr key={d.district} style={{ borderBottom: '1px solid #E2E8F0' }}>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.95rem' }}>{d.district}</div>
                  <div style={{ fontSize: '0.75rem', color: '#475569' }}>{d.state}</div>
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'center', color: '#334155', fontWeight: 600, fontSize: '0.85rem' }}>
                  {d.banksCount}
                </td>
                {BLOOD_GROUPS.map(g => {
                  const cell = d.groups[g] || { units: 0, daysSupply: 0, status: 'critical', dailyUsage: 0 }
                  const color = getCellColor(cell.status)
                  return (
                    <td
                      key={g}
                      onClick={() => setSelectedCell({ district: d.district, group: g, ...cell })}
                      style={{
                        padding: '10px 8px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          background: color.bg,
                          border: `1px solid ${color.border}`,
                          borderRadius: 8,
                          padding: '6px 4px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 2,
                        }}
                      >
                        <span style={{ fontWeight: 900, fontSize: '0.92rem', color: color.text }}>
                          {cell.daysSupply}d
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#334155' }}>
                          {cell.units}u
                        </span>
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Selected Cell Detail Modal */}
      {selectedCell && (
        <div style={{
          background: 'rgba(30, 41, 59, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 16,
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>
              📍 {selectedCell.district} • Blood Group <span style={{ color: '#ff4757' }}>{selectedCell.group}</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#334155', marginTop: 4 }}>
              Available Stock: <strong>{selectedCell.units} units</strong> | Avg Daily Burn Rate: <strong>{selectedCell.dailyUsage} units/day</strong>
            </div>
            <div style={{ fontSize: '0.85rem', color: selectedCell.status === 'critical' ? '#ff4757' : selectedCell.status === 'warning' ? '#ffb300' : '#00E676', fontWeight: 700, marginTop: 2 }}>
              Reserves will last: {selectedCell.daysSupply} Days ({selectedCell.status.toUpperCase()})
            </div>
          </div>
          <button
            onClick={() => setSelectedCell(null)}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}
