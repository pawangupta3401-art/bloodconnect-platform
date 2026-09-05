// ─────────────────────────────────────────────────────────────────
// nagpurData.js — Shared Regional Data for Nagpur BloodConnect Hub
// Used by: NagpurLifeStreamGrid, DroneTransport
// ─────────────────────────────────────────────────────────────────

// Nagpur Center Coordinates (Zero Mile / Dhantoli)
export const NAGPUR_CENTER = { lat: 21.1458, lng: 79.0882 }

export const GOOGLE_MAPS_KEY =
  typeof window !== 'undefined' && window.__ENV__?.VITE_GOOGLE_MAPS_API_KEY
    ? window.__ENV__.VITE_GOOGLE_MAPS_API_KEY
    : (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_MAPS_API_KEY)
      ? import.meta.env.VITE_GOOGLE_MAPS_API_KEY
      : 'AIzaSyBHiUmVRMd_mJioAiHvijqx93Fm9d83P4g'

// Nagpur Bio-Bank Nodes
export const NAGPUR_BLOOD_BANKS = [
  {
    id: 'Bank 01',
    name: 'Nagpur Central Blood Bank',
    lat: 21.1465,
    lng: 79.0825,
    area: 'Sitabuldi',
    phone: '+91 712 256 0001',
    inventory: { 'O+': 45, 'O-': 8, 'A+': 38, 'A-': 10, 'B+': 28, 'B-': 6 },
    components: {
      'Whole Blood': 98,
      'Packed Red Blood Cells (PRBC)': 42,
      'Fresh Frozen Plasma (FFP)': 24,
      'Platelet Concentrate': 18,
    },
    unitsDetail: [
      { id: 'U-0101', group: 'O+', component: 'Whole Blood', collected: '20 Aug 2026', expiryDays: 14, status: 'safe' },
      { id: 'U-0102', group: 'O-', component: 'PRBC', collected: '12 Aug 2026', expiryDays: 4, status: 'near-expiry' },
      { id: 'U-0103', group: 'A+', component: 'Platelets', collected: '25 Aug 2026', expiryDays: 2, status: 'critical' },
      { id: 'U-0104', group: 'B+', component: 'FFP', collected: '10 Aug 2026', expiryDays: 180, status: 'safe' },
    ],
  },
  {
    id: 'Bank 02',
    name: 'Mayo Hospital Blood Bank',
    lat: 21.1550,
    lng: 79.0920,
    area: 'Central Avenue',
    phone: '+91 712 256 0002',
    inventory: { 'O+': 30, 'O-': 3, 'A+': 25, 'A-': 5, 'B+': 18, 'B-': 2 },
    components: {
      'Whole Blood': 52,
      'Packed Red Blood Cells (PRBC)': 22,
      'Fresh Frozen Plasma (FFP)': 16,
      'Platelet Concentrate': 8,
    },
    unitsDetail: [
      { id: 'U-0201', group: 'O-', component: 'Whole Blood', collected: '14 Aug 2026', expiryDays: 3, status: 'critical' },
      { id: 'U-0202', group: 'B-', component: 'PRBC', collected: '15 Aug 2026', expiryDays: 5, status: 'near-expiry' },
      { id: 'U-0203', group: 'A+', component: 'Whole Blood', collected: '22 Aug 2026', expiryDays: 20, status: 'safe' },
    ],
  },
  {
    id: 'Bank 03',
    name: 'Meditrina Bio-Depot',
    lat: 21.1340,
    lng: 79.0760,
    area: 'Ramdaspeth',
    phone: '+91 712 256 0003',
    inventory: { 'O+': 20, 'O-': 1, 'A+': 19, 'A-': 4, 'B+': 12, 'B-': 1 },
    components: {
      'Whole Blood': 32,
      'Packed Red Blood Cells (PRBC)': 14,
      'Fresh Frozen Plasma (FFP)': 10,
      'Platelet Concentrate': 4,
    },
    unitsDetail: [
      { id: 'U-0301', group: 'O-', component: 'PRBC', collected: '16 Aug 2026', expiryDays: 2, status: 'critical' },
      { id: 'U-0302', group: 'B-', component: 'Whole Blood', collected: '18 Aug 2026', expiryDays: 4, status: 'critical' },
    ],
  },
  {
    id: 'Bank 04',
    name: 'Care Hospital Blood Centre',
    lat: 21.1347,
    lng: 79.0772,
    area: 'Wardha Road',
    phone: '+91 712 256 0004',
    inventory: { 'O+': 52, 'O-': 12, 'A+': 41, 'A-': 9, 'B+': 33, 'B-': 7 },
    components: {
      'Whole Blood': 110,
      'Packed Red Blood Cells (PRBC)': 48,
      'Fresh Frozen Plasma (FFP)': 35,
      'Platelet Concentrate': 22,
    },
    unitsDetail: [
      { id: 'U-0401', group: 'O+', component: 'Whole Blood', collected: '24 Aug 2026', expiryDays: 28, status: 'safe' },
      { id: 'U-0402', group: 'O-', component: 'PRBC', collected: '20 Aug 2026', expiryDays: 16, status: 'safe' },
      { id: 'U-0403', group: 'A-', component: 'Platelets', collected: '26 Aug 2026', expiryDays: 3, status: 'near-expiry' },
    ],
  },
  {
    id: 'Bank 05',
    name: 'LifeLine Regional Bio-Centre',
    lat: 21.1378,
    lng: 79.0835,
    area: 'Dhantoli',
    phone: '+91 712 256 0005',
    inventory: { 'O+': 35, 'O-': 6, 'A+': 22, 'A-': 3, 'B+': 21, 'B-': 4 },
    components: {
      'Whole Blood': 64,
      'Packed Red Blood Cells (PRBC)': 26,
      'Fresh Frozen Plasma (FFP)': 18,
      'Platelet Concentrate': 9,
    },
    unitsDetail: [
      { id: 'U-0501', group: 'O+', component: 'Whole Blood', collected: '19 Aug 2026', expiryDays: 18, status: 'safe' },
      { id: 'U-0502', group: 'A-', component: 'PRBC', collected: '14 Aug 2026', expiryDays: 3, status: 'critical' },
    ],
  },
]

// Real Hospitals in Nagpur
export const NAGPUR_HOSPITALS = [
  {
    id: 'Hosp. 01',
    name: 'AIIMS Nagpur Trauma Care',
    lat: 21.0374,
    lng: 79.0270,
    area: 'MIHAN, Nagpur',
    phone: '+91 712 298 5000',
    verified: true,
    activeRequests: 1,
    traumaLevel: 'Level 1 Apex Center',
    icuBedsAvailable: 14,
    requests: [
      { id: 'REQ-AIIMS-01', group: 'AB-', units: 2, urgency: 'high', status: 'dispatch_ready', route: 'Wardha Rd ➔ MIHAN Corridor', eta: '12 mins', vehicle: 'Rapid Medical EV NGP-12', condition: 'Emergency Surgery - Acute Hemorrhage' },
    ],
  },
  {
    id: 'Hosp. 02',
    name: 'Government Medical College (GMCH)',
    lat: 21.1275,
    lng: 79.0963,
    area: 'Medical Square, Nagpur',
    phone: '+91 712 274 4401',
    verified: true,
    activeRequests: 0,
    traumaLevel: 'Tertiary State Trauma Center',
    icuBedsAvailable: 8,
    requests: [
      { id: 'REQ-GMCH-09', group: 'O+', units: 4, urgency: 'normal', status: 'fulfilled', route: 'Dhantoli ➔ Medical Square', eta: 'Delivered', vehicle: 'Express Cold-Van', condition: 'Elective Orthopedic Replacements' },
    ],
  },
  {
    id: 'Hosp. 03',
    name: 'City General (Kingsway Hospital)',
    lat: 21.1555,
    lng: 79.0854,
    area: 'Mohan Nagar / Station Rd',
    phone: '+91 712 666 8888',
    verified: true,
    activeRequests: 1,
    traumaLevel: 'Multi-Super Specialty Trauma Hub',
    icuBedsAvailable: 19,
    requests: [
      { id: 'REQ-KING-03', group: 'O-', units: 3, urgency: 'critical', status: 'in_transit', route: 'Nagpur Central (Bank 01) ➔ City General (Hosp. 03)', eta: '4 mins', vehicle: 'Cold-Chain 48v Drone MED-08', condition: 'Code Red Trauma Patient - Arterial Bleed' },
    ],
  },
]
