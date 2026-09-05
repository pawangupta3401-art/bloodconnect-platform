import { useState } from 'react'
import { Activity, ShieldAlert, Sparkles, Filter, RefreshCw } from 'lucide-react'
import './InventoryHeatmapMatrix.css'

const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']

/**
 * ==============================================================================
 * REAL-TIME INVENTORY HEATMAP MATRIX DATA SOURCE
 * ==============================================================================
 * NOTE FOR PRODUCTION / BACKEND INTEGRATION:
 * To plug in live database/API data, replace this mock array with a `useEffect`
 * hook fetching from: `GET /api/v1/inventory/matrix` or listening to the 
 * `io.on('inventory_updated')` WebSocket event:
 *
 *   const [matrixData, setMatrixData] = useState([])
 *   useEffect(() => {
 *     fetch('/api/v1/inventory/matrix')
 *       .then(res => res.json())
 *       .then(data => setMatrixData(data))
 *       .catch(err => console.error(err))
 *   }, [])
 * ==============================================================================
 */
const INITIAL_HEATMAP_DATA = [
  {
    id: 'bank-1',
    name: 'AIIMS Nagpur Blood Centre',
    city: 'Nagpur, MH',
    stock: { 'O+': 28, 'O-': 3, 'A+': 18, 'A-': 4, 'B+': 22, 'B-': 6, 'AB+': 14, 'AB-': 2 }
  },
  {
    id: 'bank-2',
    name: 'GMCH Medical Square',
    city: 'Nagpur, MH',
    stock: { 'O+': 12, 'O-': 1, 'A+': 9, 'A-': 2, 'B+': 16, 'B-': 3, 'AB+': 7, 'AB-': 1 }
  },
  {
    id: 'bank-3',
    name: 'Dr. Hedgewar Raktpedhi',
    city: 'Nagpur, MH',
    stock: { 'O+': 45, 'O-': 11, 'A+': 32, 'A-': 8, 'B+': 38, 'B-': 12, 'AB+': 24, 'AB-': 5 }
  },
  {
    id: 'bank-4',
    name: 'Kingsway Hospitals Blood Bank',
    city: 'Nagpur, MH',
    stock: { 'O+': 19, 'O-': 4, 'A+': 14, 'A-': 5, 'B+': 21, 'B-': 7, 'AB+': 11, 'AB-': 3 }
  },
  {
    id: 'bank-5',
    name: 'Mayo Hospital / IGMC',
    city: 'Nagpur, MH',
    stock: { 'O+': 8, 'O-': 2, 'A+': 6, 'A-': 1, 'B+': 14, 'B-': 4, 'AB+': 5, 'AB-': 0 }
  },
  {
    id: 'bank-6',
    name: 'LifeSource Central Blood Bank',
    city: 'Mumbai, MH',
    stock: { 'O+': 67, 'O-': 14, 'A+': 45, 'A-': 8, 'B+': 34, 'B-': 4, 'AB+': 23, 'AB-': 3 }
  },
  {
    id: 'bank-7',
    name: 'Hinduja Hospital',
    city: 'Mumbai, MH',
    stock: { 'O+': 12, 'O-': 3, 'A+': 15, 'A-': 4, 'B+': 19, 'B-': 5, 'AB+': 8, 'AB-': 2 }
  },
  {
    id: 'bank-8',
    name: 'KEM Hospital Blood Centre',
    city: 'Mumbai, MH',
    stock: { 'O+': 8, 'O-': 1, 'A+': 11, 'A-': 2, 'B+': 12, 'B-': 3, 'AB+': 4, 'AB-': 1 }
  },
  {
    id: 'bank-9',
    name: 'Breach Candy Hospital',
    city: 'Mumbai, MH',
    stock: { 'O+': 0, 'O-': 0, 'A+': 4, 'A-': 1, 'B+': 7, 'B-': 2, 'AB+': 3, 'AB-': 0 }
  },
]

export default function InventoryHeatmapMatrix() {
  const [data, setData] = useState(INITIAL_HEATMAP_DATA)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCell, setSelectedCell] = useState(null)

  // Determine background color class based on threshold rules
  const getCellClass = (units) => {
    if (units < 5) return 'cell-critical' // Red: < 5 units (Critical)
    if (units <= 15) return 'cell-low'     // Yellow: 5 - 15 units (Low)
    return 'cell-healthy'                  // Green: > 15 units (Healthy)
  }

  const filteredData = data.filter(bank =>
    bank.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bank.city.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCellClick = (bankName, group, units) => {
    setSelectedCell({ bankName, group, units })
  }

  return (
    <div className="heatmap-container animate-fade-in">
      <div className="heatmap-header">
        <div className="heatmap-title-group">
          <h3>
            <Activity size={20} color="#ff4757" />
            Real-Time Inventory Heatmap Matrix
          </h3>
          <p>Spreadsheet view of regional blood unit reserves categorized by critical thresholds</p>
        </div>

        <div className="heatmap-controls">
          <input
            type="text"
            placeholder="Filter blood banks..."
            className="heatmap-filter-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="heatmap-table-wrapper">
        <table className="heatmap-table">
          <thead>
            <tr>
              <th className="heatmap-th heatmap-th-bank">Blood Bank / Hospital</th>
              {BLOOD_GROUPS.map(group => (
                <th key={group} className="heatmap-th heatmap-th-group">
                  {group}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map(bank => (
              <tr key={bank.id}>
                <td className="heatmap-td-bank">
                  {bank.name}
                  <span className="heatmap-bank-city">{bank.city}</span>
                </td>
                {BLOOD_GROUPS.map(group => {
                  const units = bank.stock[group] ?? 0
                  const cellClass = getCellClass(units)
                  return (
                    <td
                      key={group}
                      className={`heatmap-cell ${cellClass}`}
                      onClick={() => handleCellClick(bank.name, group, units)}
                      title={`${bank.name} • ${group}: ${units} units`}
                    >
                      {units}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Heatmap Legend */}
      <div className="heatmap-legend">
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-box critical" />
            <span><strong>Critical Shortage:</strong> &lt; 5 Units</span>
          </div>
          <div className="legend-item">
            <div className="legend-box low" />
            <span><strong>Low Stock:</strong> 5 – 15 Units</span>
          </div>
          <div className="legend-item">
            <div className="legend-box healthy" />
            <span><strong>Healthy Stock:</strong> &gt; 15 Units</span>
          </div>
        </div>

        <div className="legend-info">
          {selectedCell ? (
            <span style={{ color: '#38bdf8', fontWeight: 600 }}>
              Selected: {selectedCell.bankName} ({selectedCell.group}) → {selectedCell.units} units available
            </span>
          ) : (
            <span>Click any cell to inspect or request inter-bank transfer</span>
          )}
        </div>
      </div>
    </div>
  )
}
