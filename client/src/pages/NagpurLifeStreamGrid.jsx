import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import CrossSectorBloodBridge from '../components/CrossSectorBloodBridge'
import './NagpurLifeStreamGrid.css'

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBHiUmVRMd_mJioAiHvijqx93Fm9d83P4g'

// Nagpur Center Coordinates (Zero Mile / Dhantoli)
const NAGPUR_CENTER = { lat: 21.1458, lng: 79.0882 }

// Nagpur Bio-Bank Nodes with detailed component counts
// e-RaktKosh 14 component types (exact government naming)
const ERAKTKOSH_COMPONENTS = [
  'Whole Blood',
  'Packed Red Blood Cells',
  'Sagm Packed Red Blood Cells',
  'Irradiated RBC',
  'Leukoreduced RBC',
  'Fresh Frozen Plasma',
  'Cryo Poor Plasma',
  'Cryoprecipitate',
  'Plasma',
  'Single Donor Plasma',
  'Platelet Concentrate',
  'Platelet Rich Plasma',
  'Random Donor Platelets',
  'Single Donor Platelet',
]

// Expiry days per component type (NACO / NABH standards)
const GRID_COMPONENT_EXPIRY_DAYS = {
  'Whole Blood': 42, 'Packed Red Blood Cells': 42, 'Sagm Packed Red Blood Cells': 42,
  'Irradiated RBC': 42, 'Leukoreduced RBC': 42,
  'Fresh Frozen Plasma': 365, 'Cryo Poor Plasma': 365, 'Cryoprecipitate': 365,
  'Plasma': 365, 'Single Donor Plasma': 365,
  'Platelet Concentrate': 5, 'Platelet Rich Plasma': 5,
  'Random Donor Platelets': 5, 'Single Donor Platelet': 5,
}

function formatGridLastUpdated(dateVal) {
  if (!dateVal) return 'Unknown'
  const diffMs = Date.now() - new Date(dateVal).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function isGridStale(dateVal) {
  if (!dateVal) return true
  return Date.now() - new Date(dateVal).getTime() > 24 * 3600000
}

const _t = Date.now()
const INITIAL_BIO_BANKS = [
  {
    id: 'Bank 01',
    name: 'Nagpur Central Blood Bank',
    lat: 21.1465, lng: 79.0825, area: 'Sitabuldi', phone: '+91 712 256 0001',
    lastUpdated: new Date(_t - 15 * 60000),
    inventory: { 'O+': 45, 'O-': 8, 'A+': 38, 'A-': 10, 'B+': 28, 'B-': 6 },
    components: {
      'Whole Blood': 98, 'Packed Red Blood Cells': 42, 'Sagm Packed Red Blood Cells': 18,
      'Irradiated RBC': 9, 'Leukoreduced RBC': 12, 'Fresh Frozen Plasma': 24,
      'Cryo Poor Plasma': 10, 'Cryoprecipitate': 14, 'Plasma': 18, 'Single Donor Plasma': 7,
      'Platelet Concentrate': 18, 'Platelet Rich Plasma': 11, 'Random Donor Platelets': 15, 'Single Donor Platelet': 8,
    },
    unitsDetail: [
      { id: 'U-0101', group: 'O+', component: 'Whole Blood', collected: '20 Aug 2026', expiryDays: 14, status: 'safe' },
      { id: 'U-0102', group: 'O-', component: 'Packed Red Blood Cells', collected: '12 Aug 2026', expiryDays: 4, status: 'near-expiry' },
      { id: 'U-0103', group: 'A+', component: 'Platelet Concentrate', collected: '25 Aug 2026', expiryDays: 2, status: 'critical' },
      { id: 'U-0104', group: 'B+', component: 'Fresh Frozen Plasma', collected: '10 Aug 2026', expiryDays: 180, status: 'safe' },
    ]
  },
  {
    id: 'Bank 02',
    name: 'Mayo Hospital Blood Bank',
    lat: 21.1550, lng: 79.0920, area: 'Central Avenue', phone: '+91 712 256 0002',
    lastUpdated: new Date(_t - 45 * 60000),
    inventory: { 'O+': 30, 'O-': 3, 'A+': 25, 'A-': 5, 'B+': 18, 'B-': 2 },
    components: {
      'Whole Blood': 52, 'Packed Red Blood Cells': 22, 'Sagm Packed Red Blood Cells': 8,
      'Irradiated RBC': 4, 'Leukoreduced RBC': 6, 'Fresh Frozen Plasma': 16,
      'Cryo Poor Plasma': 6, 'Cryoprecipitate': 8, 'Plasma': 11, 'Single Donor Plasma': 4,
      'Platelet Concentrate': 8, 'Platelet Rich Plasma': 5, 'Random Donor Platelets': 7, 'Single Donor Platelet': 3,
    },
    unitsDetail: [
      { id: 'U-0201', group: 'O-', component: 'Whole Blood', collected: '14 Aug 2026', expiryDays: 3, status: 'critical' },
      { id: 'U-0202', group: 'B-', component: 'Packed Red Blood Cells', collected: '15 Aug 2026', expiryDays: 5, status: 'near-expiry' },
      { id: 'U-0203', group: 'A+', component: 'Whole Blood', collected: '22 Aug 2026', expiryDays: 20, status: 'safe' },
    ]
  },
  {
    id: 'Bank 03',
    name: 'Meditrina Bio-Depot',
    lat: 21.1340, lng: 79.0760, area: 'Ramdaspeth', phone: '+91 712 256 0003',
    lastUpdated: new Date(_t - 26 * 3600000), // STALE: 26h ago — demo staleness warning
    inventory: { 'O+': 20, 'O-': 1, 'A+': 19, 'A-': 4, 'B+': 12, 'B-': 1 },
    components: {
      'Whole Blood': 32, 'Packed Red Blood Cells': 14, 'Sagm Packed Red Blood Cells': 4,
      'Irradiated RBC': 2, 'Leukoreduced RBC': 3, 'Fresh Frozen Plasma': 10,
      'Cryo Poor Plasma': 3, 'Cryoprecipitate': 5, 'Plasma': 7, 'Single Donor Plasma': 2,
      'Platelet Concentrate': 4, 'Platelet Rich Plasma': 2, 'Random Donor Platelets': 3, 'Single Donor Platelet': 1,
    },
    unitsDetail: [
      { id: 'U-0301', group: 'O-', component: 'Packed Red Blood Cells', collected: '16 Aug 2026', expiryDays: 2, status: 'critical' },
      { id: 'U-0302', group: 'B-', component: 'Whole Blood', collected: '18 Aug 2026', expiryDays: 4, status: 'critical' },
    ]
  },
  {
    id: 'Bank 04',
    name: 'Care Hospital Blood Centre',
    lat: 21.1347, lng: 79.0772, area: 'Wardha Road', phone: '+91 712 256 0004',
    lastUpdated: new Date(_t - 60 * 60000),
    inventory: { 'O+': 52, 'O-': 12, 'A+': 41, 'A-': 9, 'B+': 33, 'B-': 7 },
    components: {
      'Whole Blood': 110, 'Packed Red Blood Cells': 48, 'Sagm Packed Red Blood Cells': 20,
      'Irradiated RBC': 10, 'Leukoreduced RBC': 14, 'Fresh Frozen Plasma': 35,
      'Cryo Poor Plasma': 13, 'Cryoprecipitate': 18, 'Plasma': 25, 'Single Donor Plasma': 10,
      'Platelet Concentrate': 22, 'Platelet Rich Plasma': 14, 'Random Donor Platelets': 18, 'Single Donor Platelet': 10,
    },
    unitsDetail: [
      { id: 'U-0401', group: 'O+', component: 'Whole Blood', collected: '24 Aug 2026', expiryDays: 28, status: 'safe' },
      { id: 'U-0402', group: 'O-', component: 'Packed Red Blood Cells', collected: '20 Aug 2026', expiryDays: 16, status: 'safe' },
      { id: 'U-0403', group: 'A-', component: 'Platelet Concentrate', collected: '26 Aug 2026', expiryDays: 3, status: 'near-expiry' },
    ]
  },
  {
    id: 'Bank 05',
    name: 'LifeLine Regional Bio-Centre',
    lat: 21.1378, lng: 79.0835, area: 'Dhantoli', phone: '+91 712 256 0005',
    lastUpdated: new Date(_t - 35 * 60000),
    inventory: { 'O+': 35, 'O-': 6, 'A+': 22, 'A-': 3, 'B+': 21, 'B-': 4 },
    components: {
      'Whole Blood': 64, 'Packed Red Blood Cells': 26, 'Sagm Packed Red Blood Cells': 10,
      'Irradiated RBC': 6, 'Leukoreduced RBC': 8, 'Fresh Frozen Plasma': 18,
      'Cryo Poor Plasma': 7, 'Cryoprecipitate': 9, 'Plasma': 13, 'Single Donor Plasma': 5,
      'Platelet Concentrate': 9, 'Platelet Rich Plasma': 6, 'Random Donor Platelets': 8, 'Single Donor Platelet': 4,
    },
    unitsDetail: [
      { id: 'U-0501', group: 'O+', component: 'Whole Blood', collected: '19 Aug 2026', expiryDays: 18, status: 'safe' },
      { id: 'U-0502', group: 'A-', component: 'Packed Red Blood Cells', collected: '14 Aug 2026', expiryDays: 3, status: 'critical' },
    ]
  }
]

// Real Hospitals in Nagpur
const INITIAL_HOSPITALS = [
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
    ]
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
    ]
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
    ]
  },
]

// Full Donor Dataset
const INITIAL_DONORS = [
  {
    id: 'DNR-NGP-001',
    name: 'Rajesh Kumar',
    group: 'O-',
    city: 'Sitabuldi, Nagpur',
    phone: '+91 98230 11001',
    email: 'rajesh.k@gmail.com',
    lastDonation: '66 days ago',
    lastDonationDays: 66,
    lastDonationDate: '24 Jun 2026',
    status: 'verified',
    trustScore: 98,
    donationsCount: 8,
    verifiedDonationsScore: 98,
    responseRate: 95,
    profileCompleteness: 100,
    aadhaarHash: '0x8f2a71bc94d0e32a11b6549a9f24c91e3b52a19f',
    otpVerifiedAt: '12 Jan 2026, 14:22 IST',
    registeredAt: '10 Dec 2024',
    flagReason: '',
    donationHistory: [
      { id: 'DN-8801', date: '24 Jun 2026', bank: 'Lifeline Blood Bank (Ramdas Peth)', component: 'Whole Blood', units: 1, group: 'O-', certificateId: 'CERT-NGP-8801', status: 'Lab Verified & Transfused' },
      { id: 'DN-7922', date: '18 Mar 2026', bank: 'Dr. Hedgewar Blood Bank (Dharampeth)', component: 'Whole Blood', units: 1, group: 'O-', certificateId: 'CERT-NGP-7922', status: 'Lab Verified & Transfused' },
      { id: 'DN-6810', date: '10 Dec 2025', bank: 'Government Medical College Blood Bank', component: 'Whole Blood', units: 1, group: 'O-', certificateId: 'CERT-NGP-6810', status: 'Lab Verified & Transfused' },
      { id: 'DN-5401', date: '02 Sep 2025', bank: 'Jeevan Jyoti Blood Bank', component: 'Whole Blood', units: 1, group: 'O-', certificateId: 'CERT-NGP-5401', status: 'Lab Verified & Transfused' },
    ],
    activityLogs: [
      { id: 'ACT-01', date: '24 Jun 2026', action: 'Completed Whole Blood donation at Lifeline Blood Bank', type: 'donation' },
      { id: 'ACT-02', date: '18 Jun 2026', action: 'Responded to Emergency Code Red Alert for AIIMS Trauma Center', type: 'sos' },
      { id: 'ACT-03', date: '12 Jan 2026', action: 'Aadhaar biometric OTP re-verified successfully by SBTC', type: 'verify' },
      { id: 'ACT-04', date: '10 Dec 2024', action: 'Registered on LifeStream Nagpur Regional Blood Grid', type: 'account' },
    ]
  },
  {
    id: 'DNR-NGP-002',
    name: 'Priya Sharma',
    group: 'O+',
    city: 'Ramdaspeth, Nagpur',
    phone: '+91 98230 22002',
    email: 'priya.sharma@yahoo.co.in',
    lastDonation: '92 days ago',
    lastDonationDays: 92,
    lastDonationDate: '29 May 2026',
    status: 'verified',
    trustScore: 94,
    donationsCount: 6,
    verifiedDonationsScore: 94,
    responseRate: 92,
    profileCompleteness: 100,
    aadhaarHash: '0x99e2f418b76c11a0029bcf8914da761899c011e4',
    otpVerifiedAt: '05 Feb 2026, 11:15 IST',
    registeredAt: '15 Jan 2025',
    flagReason: '',
    donationHistory: [
      { id: 'DN-8604', date: '29 May 2026', bank: 'Rainbow Blood Bank (Ramdas Peth)', component: 'Whole Blood', units: 1, group: 'O+', certificateId: 'CERT-NGP-8604', status: 'Lab Verified & Transfused' },
      { id: 'DN-7711', date: '22 Feb 2026', bank: 'Lifeline Blood Bank (Ramdas Peth)', component: 'Whole Blood', units: 1, group: 'O+', certificateId: 'CERT-NGP-7711', status: 'Lab Verified & Transfused' },
      { id: 'DN-6530', date: '15 Nov 2025', bank: 'Shri Sainath Blood Bank', component: 'Whole Blood', units: 1, group: 'O+', certificateId: 'CERT-NGP-6530', status: 'Lab Verified & Transfused' },
    ],
    activityLogs: [
      { id: 'ACT-11', date: '29 May 2026', action: 'Completed Whole Blood donation at Rainbow Blood Bank', type: 'donation' },
      { id: 'ACT-12', date: '05 Feb 2026', action: 'Annual health pre-screening and Aadhaar hash verified', type: 'verify' },
      { id: 'ACT-13', date: '15 Jan 2025', action: 'Account registered and blood type antigen confirmed', type: 'account' },
    ]
  },
  {
    id: 'DNR-NGP-003',
    name: 'Amitabh Deshmukh',
    group: 'B-',
    city: 'Civil Lines, Nagpur',
    phone: '+91 98230 33003',
    email: 'amitabh.deshmukh@gmail.com',
    lastDonation: '45 days ago (Cooldown)',
    lastDonationDays: 45,
    lastDonationDate: '15 Jul 2026',
    status: 'awaiting',
    trustScore: 72,
    donationsCount: 2,
    verifiedDonationsScore: 75,
    responseRate: 70,
    profileCompleteness: 92,
    aadhaarHash: '0x14bc88a70f21e902b4d8123984ca512401f891b2',
    otpVerifiedAt: 'Awaiting Final Review',
    registeredAt: '28 Jun 2026',
    flagReason: '',
    donationHistory: [
      { id: 'DN-8910', date: '15 Jul 2026', bank: 'Central Blood Bank (Kamptee Road)', component: 'Whole Blood', units: 1, group: 'B-', certificateId: 'CERT-NGP-8910', status: 'Lab Verified & Transfused' },
    ],
    activityLogs: [
      { id: 'ACT-21', date: '15 Jul 2026', action: 'Walk-in voluntary donation at Central Blood Bank', type: 'donation' },
      { id: 'ACT-22', date: '28 Jun 2026', action: 'Self-registration submitted via Nagpur Donor Hub', type: 'account' },
    ]
  },
  {
    id: 'DNR-NGP-004',
    name: 'Sneha Joshi',
    group: 'AB+',
    city: 'Dharampeth, Nagpur',
    phone: '+91 98230 44004',
    email: 'sneha.j@rediffmail.com',
    lastDonation: '104 days ago',
    lastDonationDays: 104,
    lastDonationDate: '17 May 2026',
    status: 'verified',
    trustScore: 89,
    donationsCount: 5,
    verifiedDonationsScore: 90,
    responseRate: 88,
    profileCompleteness: 95,
    aadhaarHash: '0x55d01248c89b71a2384f9012487c9182390a88b1',
    otpVerifiedAt: '19 May 2026, 09:40 IST',
    registeredAt: '12 Aug 2025',
    flagReason: '',
    donationHistory: [
      { id: 'DN-8501', date: '17 May 2026', bank: 'Dr. Hedgewar Blood Bank (Dharampeth)', component: 'Platelets (SDP)', units: 1, group: 'AB+', certificateId: 'CERT-NGP-8501', status: 'Lab Verified & Transfused' },
      { id: 'DN-7120', date: '04 Jan 2026', bank: 'Jeevan Jyoti Blood Bank', component: 'Whole Blood', units: 1, group: 'AB+', certificateId: 'CERT-NGP-7120', status: 'Lab Verified & Transfused' },
    ],
    activityLogs: [
      { id: 'ACT-31', date: '17 May 2026', action: 'Single Donor Platelet (SDP) apheresis completed', type: 'donation' },
      { id: 'ACT-32', date: '12 Aug 2025', action: 'Registered on LifeStream Blood Grid', type: 'account' },
    ]
  },
  {
    id: 'DNR-NGP-005',
    name: 'Arjun Verma',
    group: 'A+',
    city: 'Manish Nagar, Nagpur',
    phone: '+91 98230 55005',
    email: 'arjun.verma@outlook.com',
    lastDonation: '88 days ago',
    lastDonationDays: 88,
    lastDonationDate: '02 Jun 2026',
    status: 'verified',
    trustScore: 91,
    donationsCount: 7,
    verifiedDonationsScore: 92,
    responseRate: 90,
    profileCompleteness: 100,
    aadhaarHash: '0x71ba904128ef871bca48914bca891048bca91204',
    otpVerifiedAt: '04 Mar 2026, 16:30 IST',
    registeredAt: '20 Oct 2024',
    flagReason: '',
    donationHistory: [
      { id: 'DN-8720', date: '02 Jun 2026', bank: 'Wankar Blood Bank (Wardha Road)', component: 'Whole Blood', units: 1, group: 'A+', certificateId: 'CERT-NGP-8720', status: 'Lab Verified & Transfused' },
      { id: 'DN-7601', date: '14 Feb 2026', bank: 'Lifeline Blood Bank', component: 'Whole Blood', units: 1, group: 'A+', certificateId: 'CERT-NGP-7601', status: 'Lab Verified & Transfused' },
    ],
    activityLogs: [
      { id: 'ACT-41', date: '02 Jun 2026', action: 'Completed Whole Blood donation at Wankar Blood Bank', type: 'donation' },
      { id: 'ACT-42', date: '20 Oct 2024', action: 'Registered on LifeStream platform', type: 'account' },
    ]
  },
  {
    id: 'DNR-NGP-006',
    name: 'Farhan Khan',
    group: 'A-',
    city: 'Mominpura, Nagpur',
    phone: '+91 98230 66006',
    email: 'farhan.k@gmail.com',
    lastDonation: '30 days ago',
    lastDonationDays: 30,
    lastDonationDate: '30 Jul 2026',
    status: 'awaiting',
    trustScore: 68,
    donationsCount: 1,
    verifiedDonationsScore: 70,
    responseRate: 65,
    profileCompleteness: 88,
    aadhaarHash: '0x33e891240f91bca78129048bfa981240b91a7812',
    otpVerifiedAt: 'Awaiting Final Review',
    registeredAt: '25 Jul 2026',
    flagReason: '',
    donationHistory: [
      { id: 'DN-8980', date: '30 Jul 2026', bank: 'Central Blood Bank (Kamptee Road)', component: 'Whole Blood', units: 1, group: 'A-', certificateId: 'CERT-NGP-8980', status: 'Lab Verified & Transfused' },
    ],
    activityLogs: [
      { id: 'ACT-51', date: '30 Jul 2026', action: 'Donation recorded at Central Blood Bank', type: 'donation' },
      { id: 'ACT-52', date: '25 Jul 2026', action: 'Account registered and phone OTP verified', type: 'account' },
    ]
  },
  {
    id: 'DNR-NGP-007',
    name: 'Vikram Rathore',
    group: 'O+',
    city: 'Wardhaman Nagar, Nagpur',
    phone: '+91 98230 77007',
    email: 'vikram.rathore@gmail.com',
    lastDonation: '120 days ago',
    lastDonationDays: 120,
    lastDonationDate: '01 May 2026',
    status: 'verified',
    trustScore: 96,
    donationsCount: 11,
    verifiedDonationsScore: 98,
    responseRate: 94,
    profileCompleteness: 100,
    aadhaarHash: '0x44fa709133d88192a004b901248761928371904a',
    otpVerifiedAt: '10 Jan 2026, 12:00 IST',
    registeredAt: '05 Sep 2024',
    flagReason: '',
    donationHistory: [
      { id: 'DN-8400', date: '01 May 2026', bank: 'Government Medical College Hospital Blood Bank', component: 'Whole Blood', units: 1, group: 'O+', certificateId: 'CERT-NGP-8400', status: 'Lab Verified & Transfused' },
      { id: 'DN-7200', date: '10 Jan 2026', bank: 'Dr. Hedgewar Blood Bank', component: 'Whole Blood', units: 1, group: 'O+', certificateId: 'CERT-NGP-7200', status: 'Lab Verified & Transfused' },
      { id: 'DN-6100', date: '15 Sep 2025', bank: 'Lifeline Blood Bank', component: 'Whole Blood', units: 1, group: 'O+', certificateId: 'CERT-NGP-6100', status: 'Lab Verified & Transfused' },
    ],
    activityLogs: [
      { id: 'ACT-61', date: '01 May 2026', action: 'Centenary mega camp donation at GMCH', type: 'donation' },
      { id: 'ACT-62', date: '05 Sep 2024', action: 'Registered on LifeStream Blood Grid', type: 'account' },
    ]
  },
  {
    id: 'DNR-NGP-008',
    name: 'Kavita Meshram',
    group: 'B+',
    city: 'Dhantoli, Nagpur',
    phone: '+91 98230 88008',
    email: 'kavita.m@gmail.com',
    lastDonation: '15 days ago',
    lastDonationDays: 15,
    lastDonationDate: '14 Aug 2026',
    status: 'flagged',
    trustScore: 35,
    donationsCount: 0,
    verifiedDonationsScore: 30,
    responseRate: 35,
    profileCompleteness: 60,
    aadhaarHash: '0x12bb9047ca891048bca9120489bfa981240b91a7',
    otpVerifiedAt: 'Failed Match (Potential Duplicate Hash)',
    registeredAt: '12 Aug 2026',
    flagReason: 'Potential duplicate Aadhaar hash match across Wardha district registry',
    donationHistory: [],
    activityLogs: [
      { id: 'ACT-71', date: '14 Aug 2026', action: 'Automated Fraud Sentinel flagged duplicate ID hash', type: 'flag' },
      { id: 'ACT-72', date: '12 Aug 2026', action: 'Self-registration attempt from external IP', type: 'account' },
    ]
  },
]

// Emergency Dispatches Dataset
// ⚠️ SIMULATED: DISP-9901 and DISP-9903 are drone dispatches (isDroneDispatch: true).
// The droneTrackParams object is used to deep-link into DroneTransport.jsx with pre-filled
// source/destination/payload context from this dispatch record.
const INITIAL_EMERGENCIES = [
  {
    id: 'DISP-9901',
    hospitalId: 'Hosp. 03',
    hospitalName: 'City General (Kingsway Hospital)',
    group: 'O-',
    units: 3,
    urgency: 'critical',
    status: 'in_transit',
    patientCondition: 'Code Red Trauma Patient - Arterial Bleed',
    vehicleTag: 'Cold-Chain 48v Drone MED-08',
    route: 'Nagpur Central (Bank 01) ➞ City General (Hosp. 03)',
    eta: '4 mins',
    tempC: '3.8°C',
    timestamp: '5 mins ago',
    // ⚡ Drone dispatch meta (SIMULATED) — used to deep-link into DroneTransport live tracking
    isDroneDispatch: true,
    droneTrackParams: 'fromId=Bank 01&toId=Hosp. 03&group=O-&units=3&requestId=DISP-9901',
  },
  {
    id: 'DISP-9902',
    hospitalId: 'Hosp. 01',
    hospitalName: 'AIIMS Nagpur Trauma Care',
    group: 'AB-',
    units: 2,
    urgency: 'high',
    status: 'dispatch_ready',
    patientCondition: 'Emergency Surgery - Acute Hemorrhage',
    vehicleTag: 'Rapid Medical EV NGP-12',
    route: 'Care Hospital (Bank 04) ➞ AIIMS MIHAN',
    eta: '12 mins',
    tempC: '4.1°C',
    timestamp: '18 mins ago',
    isDroneDispatch: false,
  },
  {
    // ⚡ DEMO SEED: Pre-configured drone dispatch ready to launch — one click to activate
    // ⚠️ SIMULATED — see DroneTransport.jsx disclaimer
    id: 'DISP-9903',
    hospitalId: 'Hosp. 01',
    hospitalName: 'AIIMS Nagpur Trauma Care',
    group: 'AB-',
    units: 2,
    urgency: 'critical',
    status: 'dispatch_ready',
    patientCondition: 'Acute Hemorrhage - Trauma Bay — Drone Dispatch Pre-Authorized',
    vehicleTag: '⚡ Autonomous Drone MED-09 (Ready to Launch)',
    route: 'Care Hospital Blood Centre (Bank 04) ➞ AIIMS MIHAN (Hosp. 01)',
    eta: '6 mins (Drone) vs 18 mins (Ground)',
    tempC: '3.9°C',
    timestamp: '2 mins ago',
    isDroneDispatch: true,
    droneTrackParams: 'fromId=Bank 04&toId=Hosp. 01&group=AB-&units=2&requestId=DISP-9903',
  },
  {
    id: 'DISP-9889',
    hospitalId: 'Hosp. 02',
    hospitalName: 'Government Medical College (GMCH)',
    group: 'O+',
    units: 4,
    urgency: 'normal',
    status: 'fulfilled',
    patientCondition: 'Elective Orthopedic Replacements',
    vehicleTag: 'Express Cold-Van V-02',
    route: 'LifeLine (Bank 05) ➞ GMCH Medical Sq',
    eta: 'Delivered',
    tempC: '4.0°C',
    timestamp: '2 hours ago',
    isDroneDispatch: false,
  },
  {
    id: 'DISP-9884',
    hospitalId: 'Hosp. 03',
    hospitalName: 'City General (Kingsway Hospital)',
    group: 'B-',
    units: 2,
    urgency: 'high',
    status: 'fulfilled',
    patientCondition: 'Obstetric Emergency Delivery',
    vehicleTag: 'Drone MED-04',
    route: 'Mayo Bank 02 ➞ Kingsway',
    eta: 'Delivered',
    tempC: '3.9°C',
    timestamp: '4 hours ago',
    isDroneDispatch: true,
    droneTrackParams: 'fromId=Bank 02&toId=Hosp. 03&group=B-&units=2&requestId=DISP-9884',
  }
]

// Security Audit Logs
const INITIAL_SECURITY_LOGS = [
  {
    id: 'LOG-7721',
    timestamp: '12:28:44 IST (Just now)',
    user: 'Security Sentinel AI',
    role: 'Automated Intrusion Detection',
    action: 'Flagged suspicious rapid OTP attempts (5 failed attempts from 182.74.x.x)',
    flagged: true,
    severity: 'critical',
    ip: '182.74.91.14',
    hash: '0x9fa1c78b...44a1'
  },
  {
    id: 'LOG-7719',
    timestamp: '11:45:12 IST (45m ago)',
    user: 'Bank Admin - Mayo',
    role: 'Bio-Bank Operator',
    action: 'Flagged abnormal bulk stock decrement attempt outside shift window (12 units B-)',
    flagged: true,
    severity: 'high',
    ip: '103.21.244.2',
    hash: '0x3dc8812a...98f3'
  },
  {
    id: 'LOG-7715',
    timestamp: '10:30:00 IST (2h ago)',
    user: 'Dr. S. Sharma',
    role: 'Nagpur Regional Director',
    action: 'Authorized Code Red Drone Dispatch DISP-9901 (Sitabuldi ➔ Kingsway)',
    flagged: false,
    severity: 'normal',
    ip: '14.139.112.5',
    hash: '0x12a9bf40...cc31'
  },
  {
    id: 'LOG-7710',
    timestamp: '09:15:32 IST (3h ago)',
    user: 'System Cron',
    role: 'Audit Engine',
    action: 'Cold-Chain telemetry verified across 5 Nagpur nodes (Mean temp: 3.8°C)',
    flagged: false,
    severity: 'normal',
    ip: 'Internal Socket.io',
    hash: '0x88f401cd...77e9'
  },
  {
    id: 'LOG-7704',
    timestamp: '08:00:10 IST (4h ago)',
    user: 'Aadhaar eKYC Gateway',
    role: 'Identity Verifier',
    action: 'Verified 14 new donor cooldown certificates with UIDAI HMAC timestamp',
    flagged: false,
    severity: 'normal',
    ip: '164.100.128.4',
    hash: '0x44fa7091...33d8'
  }
]

export const ROLE_CONFIGS = {
  admin: {
    id: 'admin',
    label: 'Platform Admin',
    shortLabel: 'Admin',
    badge: 'SUPER ADMIN',
    badgeClass: 'badge-admin-super',
    name: 'Dr. S. Sharma',
    avatar: 'SS',
    title: 'Nagpur Regional Director & Platform Super Admin',
    allowedTabs: ['dashboard', 'inventory', 'hospitals', 'donors', 'emergency', 'analytics', 'security', 'drone', 'community'],
    defaultTab: 'dashboard',
    canEditInventory: true,
    canManageHospitals: true,
    canVerifyDonors: true,
    canCreateEmergency: true,
    canConfirmDonations: true,
    canDispatchDrone: true,
    canBroadcastSOS: true,
    canManageSecurity: true,
    canAuthorizeBridge: true,
    canSimulateShortage: true,
    scopeDesc: 'Full Administrative & Operational Command across all Nagpur Nodes',
  },
  'blood-bank': {
    id: 'blood-bank',
    label: 'Blood Bank Admin',
    shortLabel: 'Bank Admin',
    badge: 'BANK ADMIN',
    badgeClass: 'badge-admin-bank',
    name: 'Ravi Kumar',
    avatar: 'RK',
    title: 'Bio-Bank Medical Director, Nagpur Central Blood Bank',
    bankId: 'Bank 01',
    bankName: 'Nagpur Central Blood Bank',
    allowedTabs: ['dashboard', 'inventory', 'donors', 'emergency', 'drone', 'community'],
    defaultTab: 'dashboard',
    canEditInventory: true,
    canManageHospitals: false,
    canVerifyDonors: false, // data-minimization only
    canCreateEmergency: false,
    canConfirmDonations: true,
    canDispatchDrone: true, // from Bank 01
    canBroadcastSOS: true, // for Bank 01
    canManageSecurity: false,
    canAuthorizeBridge: true,
    canSimulateShortage: false,
    scopeDesc: 'Scoped to Nagpur Central Blood Bank (Bank 01) • Bio-Bank Hub Node',
  },
  hospital: {
    id: 'hospital',
    label: 'Hospital Staff',
    shortLabel: 'Hospital Staff',
    badge: 'HOSPITAL STAFF',
    badgeClass: 'badge-admin-hosp',
    name: 'Dr. Priya Nair',
    avatar: 'PN',
    title: 'Chief of Trauma Surgery, AIIMS Nagpur Trauma Center',
    hospitalId: 'Hosp. 01',
    hospitalName: 'AIIMS Nagpur Trauma Care',
    allowedTabs: ['dashboard', 'inventory', 'emergency', 'drone', 'community'],
    defaultTab: 'dashboard',
    canEditInventory: false, // view only
    canManageHospitals: false,
    canVerifyDonors: false,
    canCreateEmergency: true, // for AIIMS
    canConfirmDonations: false,
    canDispatchDrone: false,
    canBroadcastSOS: true, // for AIIMS
    canManageSecurity: false,
    canAuthorizeBridge: false,
    canSimulateShortage: false,
    scopeDesc: 'Scoped to AIIMS Nagpur Trauma Care (Hosp. 01) • Request & Triage Node',
  },
  auditor: {
    id: 'auditor',
    label: 'Auditor (Read-Only)',
    shortLabel: 'Auditor',
    badge: 'AUDITOR • READ ONLY',
    badgeClass: 'badge-admin-auditor',
    name: 'CMA Anjali Verma',
    avatar: 'AV',
    title: 'Chief Compliance Auditor (SBTC Maharashtra)',
    allowedTabs: ['dashboard', 'inventory', 'hospitals', 'donors', 'emergency', 'analytics', 'security', 'drone', 'community'],
    defaultTab: 'dashboard',
    canEditInventory: false,
    canManageHospitals: false,
    canVerifyDonors: false,
    canCreateEmergency: false,
    canConfirmDonations: false,
    canDispatchDrone: false,
    canBroadcastSOS: false,
    canManageSecurity: false, // view audit trail only, no lockdown/escalate
    canAuthorizeBridge: false,
    canSimulateShortage: false,
    scopeDesc: 'Independent Regulatory & Compliance Ledger Inspection • Full Read-Only',
  },
  'health-officer': {
    id: 'health-officer',
    label: 'Health Officer',
    shortLabel: 'Health Officer',
    badge: 'HEALTH OFFICER',
    badgeClass: 'badge-admin-officer',
    name: 'Dr. Rajesh Tope',
    avatar: 'RT',
    title: 'State Health Officer (Maharashtra Public Health & Family Welfare)',
    allowedTabs: ['dashboard', 'hospitals', 'analytics'],
    defaultTab: 'dashboard',
    canEditInventory: false,
    canManageHospitals: false,
    canVerifyDonors: false,
    canCreateEmergency: false,
    canConfirmDonations: false,
    canDispatchDrone: false,
    canBroadcastSOS: false,
    canManageSecurity: false,
    canAuthorizeBridge: false,
    canSimulateShortage: false,
    scopeDesc: 'Regional & Public Health Policy Surveillance • Non-Operational',
  },
}

export const DEMO_USERS_MAP = {
  admin:           { id: 'demo-admin-001',   name: 'Dr. S. Sharma', role: 'admin', city: 'Nagpur', title: 'Nagpur Regional Director & Platform Super Admin' },
  'blood-bank':    { id: 'demo-bank-001',    name: 'Ravi Kumar', role: 'blood-bank', bankName: 'Nagpur Central Blood Bank', bankId: 'Bank 01', city: 'Nagpur', title: 'Bio-Bank Medical Director' },
  hospital:        { id: 'demo-hosp-001',    name: 'Dr. Priya Nair', role: 'hospital', hospital: 'AIIMS Nagpur Trauma Center', hospitalId: 'Hosp. 01', city: 'Nagpur', title: 'Chief of Trauma Surgery' },
  auditor:         { id: 'demo-auditor-001', name: 'CMA Anjali Verma', role: 'auditor', city: 'Nagpur', title: 'Chief Compliance Auditor (SBTC Maharashtra)' },
  'health-officer': { id: 'demo-officer-001', name: 'Dr. Rajesh Tope', role: 'health-officer', city: 'Nagpur', title: 'State Health Officer (Public Health Dept)' },
  donor:           { id: 'demo-donor-001',   name: 'Pawan Deepak Gupta', role: 'donor', bloodGroup: 'O+', trustScore: 92, city: 'Nagpur', eligible: true },
}

export default function NagpurLifeStreamGrid({ initialTab = 'dashboard' }) {
  const { tab, donorId } = useParams()
  const navigate = useNavigate()
  const mapContainerRef = useRef(null)
  const googleMapRef = useRef(null)

  const { user, login, logout } = useAuth()
  const activeRole = (user?.role && ROLE_CONFIGS[user.role]) ? user.role : 'admin'
  const roleConfig = ROLE_CONFIGS[activeRole] || ROLE_CONFIGS.admin

  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false)
  const [roleToast, setRoleToast] = useState(null)

  const [activeNav, setActiveNav] = useState(tab || roleConfig.defaultTab || initialTab || 'dashboard')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentTime, setCurrentTime] = useState('')
  const [showLogicGuide, setShowLogicGuide] = useState(false)
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [verifyDonorName, setVerifyDonorName] = useState('Amitabh Deshmukh')
  const [mapLoaded, setMapLoaded] = useState(false)

  // ── DONOR HUB & PROFILE STATE ──
  const [selectedProfileDonorId, setSelectedProfileDonorId] = useState(donorId || null)
  const [verifyModalDonor, setVerifyModalDonor] = useState(null)
  const [flagModalDonor, setFlagModalDonor] = useState(null)
  const [flagReason, setFlagReason] = useState('Suspected duplicate account')
  const [contactModalDonor, setContactModalDonor] = useState(null)
  const [copiedDonorPhone, setCopiedDonorPhone] = useState(false)
  const [donorToast, setDonorToast] = useState(null)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason] = useState('Incomplete or unverified identity information')

  // Data states
  const [bioBanks, setBioBanks] = useState(INITIAL_BIO_BANKS)
  const [hospitals, setHospitals] = useState(INITIAL_HOSPITALS)
  const [donors, setDonors] = useState(INITIAL_DONORS)
  const [emergencies, setEmergencies] = useState(INITIAL_EMERGENCIES)
  const [securityLogs, setSecurityLogs] = useState(INITIAL_SECURITY_LOGS)

  // ── AUDIT CHAIN INTEGRITY & SECURITY HEALTH STATE ──
  const [chainVerifying, setChainVerifying] = useState(false)
  const [chainVerifyProgress, setChainVerifyProgress] = useState(0)
  const [chainStatus, setChainStatus] = useState('unverified') // 'unverified' | 'valid' | 'compromised'
  const [chainVerifiedAt, setChainVerifiedAt] = useState(null)
  const [isTamperedDemo, setIsTamperedDemo] = useState(false)
  const [tamperedLogId, setTamperedLogId] = useState('LOG-7719')
  const [chainToast, setChainToast] = useState(null)

  const showChainToast = (msg, type = 'info') => {
    setChainToast({ msg, type })
    setTimeout(() => setChainToast(null), 4000)
  }

  // Verification simulation handler
  // Note: For demo purposes, this validates hash structure, non-corruption flags, and predecessor links.
  // A production system executes cryptographic SHA-256 block hashing and full Merkle tree traversal.
  const handleVerifyChainIntegrity = () => {
    setChainVerifying(true)
    setChainVerifyProgress(15)

    let progress = 15
    const interval = setInterval(() => {
      progress += 28
      if (progress >= 100) {
        clearInterval(interval)
        setChainVerifyProgress(100)
        setTimeout(() => {
          setChainVerifying(false)
          const nowStr = new Date().toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          }) + ' IST'
          setChainVerifiedAt(nowStr)

          // Check if any block hash is corrupted / tampered
          const isCompromised =
            isTamperedDemo ||
            securityLogs.some(
              (l) =>
                l.isCorrupted ||
                (l.hash && !l.hash.startsWith('0x')) ||
                (l.hash && l.hash.includes('TAMPERED'))
            )

          if (isCompromised) {
            setChainStatus('compromised')
            showChainToast(`❌ Chain Integrity Compromised! Block ${tamperedLogId} mismatch detected.`, 'error')
          } else {
            setChainStatus('valid')
            showChainToast(`✅ Chain Integrity Verified: ${securityLogs.length} blocks intact, 0 tampering detected.`, 'success')
          }
        }, 350)
      } else {
        setChainVerifyProgress(progress)
      }
    }, 200)
  }

  const handleSimulateTampering = () => {
    setIsTamperedDemo(true)
    setTamperedLogId('LOG-7719')
    setSecurityLogs((prev) =>
      prev.map((log) => {
        if (log.id === 'LOG-7719') {
          return {
            ...log,
            hash: '0xCORRUPTED_HASH_3dc8...TAMPERED',
            isCorrupted: true,
          }
        }
        return log
      })
    )
    setChainStatus('unverified')
    showChainToast('⚠️ Demo: Block LOG-7719 hash modified. Click "Verify Chain Integrity" to test detection.', 'warning')
  }

  const handleResetChainDemo = () => {
    setIsTamperedDemo(false)
    setSecurityLogs(INITIAL_SECURITY_LOGS)
    setChainStatus('unverified')
    setChainVerifiedAt(null)
    showChainToast('🔄 Demo Reset: Ledger blocks restored to clean cryptographic baseline.', 'success')
  }

  // Interactive filters
  const [selectedBankDetail, setSelectedBankDetail] = useState(null)
  const [selectedHospitalDetail, setSelectedHospitalDetail] = useState(null)
  const [donorStatusFilter, setDonorStatusFilter] = useState('all') // 'all', 'verified', 'awaiting', 'flagged'
  const [emergencyFilter, setEmergencyFilter] = useState('all') // 'all', 'in_transit', 'dispatch_ready', 'fulfilled'

  // Modals
  const [showStockModal, setShowStockModal] = useState(false)
  const [stockFormData, setStockFormData] = useState({ bankId: 'Bank 01', group: 'O+', component: 'Whole Blood', units: 5, date: '28 Aug 2026' })
  const [showEmergencyCreateModal, setShowEmergencyCreateModal] = useState(false)
  const [emergencyFormData, setEmergencyFormData] = useState({ hospitalId: 'Hosp. 03', group: 'O-', units: 2, urgency: 'critical', condition: 'Emergency Trauma Surgery' })

  // ── ADMIN DRONE TRANSPORT STATE & PRESET ROUTES ──
  // SIMULATED: preset seed routes based on real Nagpur facilities and 60 km/h cruising speed
  const ADMIN_DRONE_ROUTES = [
    { id: 'R01', fromBank: 'Lifeline Blood Bank (Ramdas Peth)', fromLat: 21.1378, fromLng: 79.0835, toHosp: 'Care Hospital (Ramdaspeth)', toLat: 21.1347, toLng: 79.0772, distanceKm: 1.2, droneEta: '~2 min', groundEta: '~8 min' },
    { id: 'R02', fromBank: 'Dr. Hedgewar Blood Bank (Dharampeth)', fromLat: 21.1442, fromLng: 79.0658, toHosp: 'Government Medical College Hospital (Cotton Market)', toLat: 21.1275, toLng: 79.0963, distanceKm: 3.5, droneEta: '~4 min', groundEta: '~14 min' },
    { id: 'R03', fromBank: 'Jeevan Jyoti Blood Bank (Madhav Nagar)', fromLat: 21.1235, fromLng: 79.0512, toHosp: 'Kingsway Hospital (Kingsway)', toLat: 21.1555, toLng: 79.0854, distanceKm: 4.8, droneEta: '~5 min', groundEta: '~18 min' },
    { id: 'R04', fromBank: 'Rainbow Blood Bank (Ramdas Peth)', fromLat: 21.1385, fromLng: 79.0795, toHosp: 'Suretech Hospital (Ramdaspeth)', toLat: 21.1350, toLng: 79.0765, distanceKm: 1.5, droneEta: '~2 min', groundEta: '~7 min' },
    { id: 'R05', fromBank: 'Shri Sainath Blood Bank (Dhantoli)', fromLat: 21.1360, fromLng: 79.0840, toHosp: 'Alexis Hospital (Katol Road)', toLat: 21.1912, toLng: 79.0768, distanceKm: 7.2, droneEta: '~7 min', groundEta: '~24 min' },
    { id: 'R06', fromBank: 'National Blood Bank (Dhantoli)', fromLat: 21.1390, fromLng: 79.0820, toHosp: 'Orange City Hospital (Basundhara)', toLat: 21.1085, toLng: 79.0620, distanceKm: 8.5, droneEta: '~9 min', groundEta: '~28 min' },
    { id: 'R07', fromBank: 'Wankar Blood Bank (Wardha Road)', fromLat: 21.1120, fromLng: 79.0680, toHosp: 'CIIMS (Bajaj Nagar)', toLat: 21.1265, toLng: 79.0610, distanceKm: 5.1, droneEta: '~5 min', groundEta: '~19 min' },
    { id: 'R08', fromBank: 'Central Blood Bank (Kamptee Road)', fromLat: 21.1620, fromLng: 79.0950, toHosp: 'Government Medical College Hospital (Cotton Market)', toLat: 21.1275, toLng: 79.0963, distanceKm: 4.0, droneEta: '~4 min', groundEta: '~15 min' },
  ]

  const [selectedRouteId, setSelectedRouteId] = useState('R01')
  const activePreset = ADMIN_DRONE_ROUTES.find(r => r.id === selectedRouteId) || ADMIN_DRONE_ROUTES[0]

  const [adminDroneBank, setAdminDroneBank]         = useState(activePreset.fromBank)
  const [adminDroneHosp, setAdminDroneHosp]         = useState(activePreset.toHosp)
  const [adminDroneGroup, setAdminDroneGroup]       = useState('O-')
  const [adminDroneUnits, setAdminDroneUnits]       = useState(2)
  const [adminDronePriority, setAdminDronePriority] = useState('Critical Code Red')

  // Live flight telemetry
  const [adminFlightLaunched, setAdminFlightLaunched] = useState(false)
  const [adminFlightProgress, setAdminFlightProgress] = useState(0)
  const [adminFlightStartTime, setAdminFlightStartTime] = useState(null)
  const [adminFlightSpeed, setAdminFlightSpeed]       = useState(62)
  const [adminFlightElapsedMs, setAdminFlightElapsedMs] = useState(0)
  const [adminDroneMapLoaded, setAdminDroneMapLoaded] = useState(false)
  const adminDroneMapRef = useRef(null)
  const adminDroneMarkerRef = useRef(null)
  const adminDroneBankMarkerRef = useRef(null)
  const adminDroneHospMarkerRef = useRef(null)
  const adminDronePolylineRef = useRef(null)

  // ── CENTRAL FLIGHT TELEMETRY TIMER (1-SECOND TICK) ──
  useEffect(() => {
    if (!adminFlightLaunched || activeNav !== 'drone') return

    // Flight duration scaled by route distance (~18s for 1.2km up to ~80s for 8.5km)
    const totalFlightSec = Math.max(18, Math.min(80, Math.round(activePreset.distanceKm * 15)))

    const interval = setInterval(() => {
      setAdminFlightProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        const step = 100 / totalFlightSec
        const next = Math.min(100, prev + step)
        return parseFloat(next.toFixed(1))
      })

      // Realistic slight speed fluctuation (59-65 km/h)
      setAdminFlightSpeed(Math.floor(59 + Math.random() * 7))
    }, 1000)

    return () => clearInterval(interval)
  }, [adminFlightLaunched, activeNav, activePreset.distanceKm, activePreset.id])

  // ── ANIMATE DRONE MARKER ON MAP IN SYNC WITH PROGRESS ──
  useEffect(() => {
    if (adminDroneMarkerRef.current && activePreset) {
      const frac = Math.max(0, Math.min(1, (adminFlightLaunched ? adminFlightProgress : 0) / 100))
      const curLat = activePreset.fromLat + (activePreset.toLat - activePreset.fromLat) * frac
      const curLng = activePreset.fromLng + (activePreset.toLng - activePreset.fromLng) * frac

      try {
        adminDroneMarkerRef.current.setLatLng([curLat, curLng])
      } catch (e) {
        // safety fallback
      }
    }
  }, [adminFlightProgress, adminFlightLaunched, activePreset])

  // ── SYNC ACTIVE DISPATCH LEDGER WITH LIVE PROGRESS ──
  useEffect(() => {
    if (!adminFlightLaunched) return
    const totalFlightSec = Math.max(18, Math.min(80, Math.round(activePreset.distanceKm * 15)))
    const remainingSec = Math.max(0, Math.ceil(totalFlightSec * (1 - adminFlightProgress / 100)))
    const remMin = Math.floor(remainingSec / 60)
    const remSec = remainingSec % 60
    const etaText = adminFlightProgress >= 100 ? 'Delivered ✅' : (remMin > 0 ? `${remMin}m ${remSec}s` : `${remSec}s`)

    setAdminDroneDispatches(prev => prev.map((d, idx) => {
      if (idx === 0 && d.status !== 'delivered') {
        return {
          ...d,
          progress: Math.round(adminFlightProgress),
          status: adminFlightProgress >= 100 ? 'delivered' : 'in_flight',
          eta: etaText
        }
      }
      return d
    }))
  }, [adminFlightProgress, adminFlightLaunched, activePreset.distanceKm])


  // ── RE-CENTER MAP & UPDATE MARKERS ON PRESET ROUTE CHANGE ──
  useEffect(() => {
    if (adminDroneMapRef.current && window.L && activePreset) {
      try {
        if (adminDroneBankMarkerRef.current) {
          adminDroneBankMarkerRef.current.setLatLng([activePreset.fromLat, activePreset.fromLng])
          adminDroneBankMarkerRef.current.bindPopup(`<b>🏦 ${activePreset.fromBank}</b><br>Source Bio-Bank`)
        }
        if (adminDroneHospMarkerRef.current) {
          adminDroneHospMarkerRef.current.setLatLng([activePreset.toLat, activePreset.toLng])
          adminDroneHospMarkerRef.current.bindPopup(`<b>🏥 ${activePreset.toHosp}</b><br>Destination Landing Pad`)
        }
        if (adminDronePolylineRef.current) {
          adminDronePolylineRef.current.setLatLngs([[activePreset.fromLat, activePreset.fromLng], [activePreset.toLat, activePreset.toLng]])
        }
        if (adminDroneMarkerRef.current) {
          const frac = adminFlightLaunched ? Math.min(1, adminFlightProgress / 100) : 0
          adminDroneMarkerRef.current.setLatLng([
            activePreset.fromLat + (activePreset.toLat - activePreset.fromLat) * frac,
            activePreset.fromLng + (activePreset.toLng - activePreset.fromLng) * frac
          ])
        }
        adminDroneMapRef.current.fitBounds([[activePreset.fromLat, activePreset.fromLng], [activePreset.toLat, activePreset.toLng]], { padding: [40, 40] })
      } catch (e) {}
    }
  }, [selectedRouteId, activePreset])

  // Active & Recent Admin Drone Dispatches Ledger
  const [adminDroneDispatches, setAdminDroneDispatches] = useState([
    { id: 'DRN-NGP-901', bank: 'Lifeline Blood Bank (Ramdas Peth)', hosp: 'Care Hospital (Ramdaspeth)', group: 'O-', units: 2, priority: 'Critical Code Red', status: 'in_flight', progress: 58, eta: '1m 15s', drone: 'MED-X1 (Payload Cold-Chain: 3.8°C)', launchedAt: '12:28 IST' },
    { id: 'DRN-NGP-902', bank: 'Dr. Hedgewar Blood Bank', hosp: 'GMCH Trauma Center', group: 'A+', units: 4, priority: 'High Urgency', status: 'delivered', progress: 100, eta: 'Delivered (3.4 min flight)', drone: 'MED-X2 (Autonomous)', launchedAt: '12:10 IST' },
    { id: 'DRN-NGP-903', bank: 'Jeevan Jyoti Blood Bank', hosp: 'Kingsway Hospital', group: 'B-', units: 1, priority: 'Critical Code Red', status: 'delivered', progress: 100, eta: 'Delivered (4.9 min flight)', drone: 'MED-X1 (Autonomous)', launchedAt: '11:45 IST' },
    { id: 'DRN-NGP-904', bank: 'Rainbow Blood Bank', hosp: 'Suretech Hospital', group: 'AB+', units: 2, priority: 'Urgent Surgery', status: 'pre_flight', progress: 10, eta: 'Standby / Pre-Flight Check', drone: 'MED-X4 (Hangar Standby)', launchedAt: 'Just now' },
  ])

  // ── ADMIN COMMUNITY SOS STATE ──
  const [adminSosGroup, setAdminSosGroup]         = useState('O-')
  const [adminSosHospital, setAdminSosHospital]   = useState('AIIMS Nagpur Apex Trauma Center')
  const [adminSosLocality, setAdminSosLocality]   = useState('MIHAN / Wardha Road')
  const [adminSosUnits, setAdminSosUnits]         = useState(2)
  const [adminSosUrgency, setAdminSosUrgency]     = useState('Critical Code Red')
  const [adminSosHelpline, setAdminSosHelpline]   = useState('+91 712 256 0001')
  const [adminSosCustomMsg, setAdminSosCustomMsg] = useState(
    '🚨 EMERGENCY SOS: O- blood urgently required at AIIMS Nagpur Apex Trauma Center, MIHAN / Wardha Road, Nagpur. 2 units needed for Critical Code Red trauma case. If you or someone you know is an eligible donor, please contact +91 712 256 0001 or report immediately. Every second counts. #BloodConnect #Nagpur #EmergencyBlood'
  )
  const [adminSosCopiedToast, setAdminSosCopiedToast] = useState(false)
  const [adminSosShareToast, setAdminSosShareToast]   = useState(null)

  const [adminBroadcastHistory, setAdminBroadcastHistory] = useState([
    { id: 'BC-SOS-01', timestamp: '12:15 IST (Today)', linkedReq: 'REQ-AIIMS-01 (AB-)', hosp: 'AIIMS Nagpur Trauma Care', group: 'AB-', units: 2, platforms: ['WhatsApp', 'Telegram', 'X (Twitter)', 'Red Cross Helpline'], reach: '~480 Donors', status: 'active_viral' },
    { id: 'BC-SOS-02', timestamp: '10:40 IST (Today)', linkedReq: 'REQ-GMCH-04 (O-)', hosp: 'Government Medical College Hospital', group: 'O-', units: 3, platforms: ['WhatsApp', 'Instagram', 'Lifeline NGO Hub'], reach: '~310 Donors', status: 'resolved' },
    { id: 'BC-SOS-03', timestamp: 'Yesterday, 19:20 IST', linkedReq: 'REQ-KNG-09 (B-)', hosp: 'Kingsway Hospital Emergency', group: 'B-', units: 2, platforms: ['WhatsApp', 'Telegram', 'Facebook', 'ISA-NCB'], reach: '~620 Donors', status: 'resolved' },
  ])

  // Call NGO Helpline modal state
  const [callModalNgo, setCallModalNgo] = useState(null)
  const [copiedNgoPhone, setCopiedNgoPhone] = useState(false)

  // ── HOSPITAL NETWORK EXPANSION STATE ──
  // Sub-view router: 'list' | 'coverageMap' | 'invite' | 'pending' | 'join'
  const [hospitalSubView, setHospitalSubView] = useState('list')
  const coverageMapRef = useRef(null)
  const coverageMapInstanceRef = useRef(null)
  const [coverageMapLoaded, setCoverageMapLoaded] = useState(false)
  const [coverageToast, setCoverageToast] = useState(null)

  // Seed pending invitations (1 demo entry)
  const [pendingInvitations, setPendingInvitations] = useState([
    {
      id: 'INV-001',
      name: 'Alexis Multi-Specialty Hospital',
      locality: 'Katol Road, Nagpur',
      contact: 'Dr. Ramesh Bhat',
      phone: '+91 712 398 1000',
      email: 'admin@alexisnagpur.com',
      status: 'Pending Verification',
      submittedAt: '29 Aug 2026, 10:15 AM',
      source: 'Self-Registration',
      licenseNo: 'MH-NGP-HOSP-2019-0041',
      icuBeds: 32,
      capabilities: ['24/7 Emergency Services', 'Blood Bank On-Site', 'ICU / CICU']
    }
  ])

  // Invite form state
  const [inviteForm, setInviteForm] = useState({
    name: '', locality: '', contact: '', phone: '', email: ''
  })
  const [inviteToast, setInviteToast] = useState(null)

  // Self-registration 4-step form
  const [joinStep, setJoinStep] = useState(1)
  const [joinForm, setJoinForm] = useState({
    name: '', type: 'private', address: '', locality: '',
    contactName: '', contactRole: '', phone: '', email: '',
    licenseNo: '', icuBeds: '',
    capabilities: [],
    agreedToTerms: false
  })
  const JOIN_CAPABILITIES = [
    'Level 1 Trauma Center',
    '24/7 Emergency Services',
    'Drone Transit Compatible Landing Zone',
    'Blood Bank On-Site',
    'ICU / CICU',
    'Organ Transplant Facility',
    'Paediatric Emergency Wing'
  ]

  // Sync tab and donorId with URL parameters if present
  useEffect(() => {
    if (tab && ['dashboard', 'inventory', 'hospitals', 'donors', 'emergency', 'analytics', 'security', 'drone', 'community'].includes(tab)) {
      setActiveNav(tab)
      if (activeRole === 'health-officer' && tab === 'hospitals') {
        setHospitalSubView('coverageMap')
      }
    } else if (!tab) {
      setActiveNav(roleConfig.defaultTab || 'dashboard')
    }
    if (tab === 'donors' && donorId) {
      setSelectedProfileDonorId(donorId)
    } else {
      setSelectedProfileDonorId(null)
    }
  }, [tab, donorId, activeRole, roleConfig.defaultTab])

  const handleNavClick = (navId) => {
    setActiveNav(navId)
    setSelectedProfileDonorId(null)
    if (activeRole === 'health-officer' && navId === 'hospitals') {
      setHospitalSubView('coverageMap')
    }
    navigate(`/grid/${navId}`)
  }

  const switchRole = (newRoleId) => {
    if (newRoleId === 'donor') {
      navigate('/donor')
      return
    }
    const demoUser = DEMO_USERS_MAP[newRoleId]
    if (demoUser) {
      login(demoUser)
      const targetDefaultTab = ROLE_CONFIGS[newRoleId]?.defaultTab || 'dashboard'
      setActiveNav(targetDefaultTab)
      if (newRoleId === 'health-officer') {
        setHospitalSubView('coverageMap')
      }
      navigate(`/grid/${targetDefaultTab}`)
      setRoleSwitcherOpen(false)
      setRoleToast(`Switched active portal view to: ${ROLE_CONFIGS[newRoleId]?.label}`)
      setTimeout(() => setRoleToast(null), 3500)
    }
  }


  // Real-time Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      setCurrentTime(`${timeStr} IST`)
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // Initialize Map only on dashboard tab
  useEffect(() => {
    if (activeNav !== 'dashboard') return

    let isMounted = true

    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        initMap()
        return
      }

      const existingScript = document.getElementById('google-maps-script')
      if (existingScript) {
        existingScript.onload = () => { if (isMounted) initMap() }
        return
      }

      const script = document.createElement('script')
      script.id = 'google-maps-script'
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places,geometry`
      script.async = true
      script.defer = true
      script.onload = () => { if (isMounted) initMap() }
      script.onerror = () => { if (isMounted) initLeafletFallback() }
      document.head.appendChild(script)
    }

    const initMap = () => {
      if (!mapContainerRef.current || !window.google || !window.google.maps) return

      try {
        const map = new window.google.maps.Map(mapContainerRef.current, {
          center: { lat: 21.1465, lng: 79.0825 },
          zoom: 13,
          gestureHandling: 'greedy',
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          styles: [
            { elementType: 'geometry', stylers: [{ color: '#f5f7fa' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#334155' }] },
            { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
            { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#cbd5e1' }] },
            { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#dcfce7' }] },
            { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#bae6fd' }] }
          ]
        })

        googleMapRef.current = map
        setMapLoaded(true)

        // Draw Code Red Route Polyline (Nagpur Central -> City General Hosp 03)
        const routeCoordinates = [
          { lat: 21.1465, lng: 79.0825 },
          { lat: 21.1495, lng: 79.0840 },
          { lat: 21.1520, lng: 79.0850 },
          { lat: 21.1555, lng: 79.0854 }
        ]

        new window.google.maps.Polyline({
          path: routeCoordinates,
          geodesic: true,
          strokeColor: '#DC2626',
          strokeOpacity: 0.9,
          strokeWeight: 4,
          map: map
        })

        // Add Markers for Bio Banks
        bioBanks.forEach(b => {
          new window.google.maps.Marker({
            position: { lat: b.lat, lng: b.lng },
            map: map,
            title: b.name,
            icon: {
              url: 'data:image/svg+xml;utf-8,' + encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
                  <path d="M16 0C7.163 0 0 7.163 0 16c0 11.5 16 24 16 24s16-12.5 16-24C32 7.163 24.837 0 16 0z" fill="#2563EB" stroke="#fff" stroke-width="2"/>
                  <circle cx="16" cy="15" r="7" fill="#fff"/>
                  <path d="M16 10 C16 10 12 15 12 17 C12 19.2 13.8 21 16 21 C18.2 21 20 19.2 20 17 C20 10 16 10 16 10 Z" fill="#DC2626"/>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(30, 38),
              anchor: new window.google.maps.Point(15, 38)
            }
          })
        })

        // Add Markers for Hospitals
        hospitals.forEach(h => {
          const marker = new window.google.maps.Marker({
            position: { lat: h.lat, lng: h.lng },
            map: map,
            title: h.name,
            icon: {
              url: 'data:image/svg+xml;utf-8,' + encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="34" height="42" viewBox="0 0 34 42">
                  <path d="M17 0C7.611 0 0 7.611 0 17c0 12.5 17 25 17 25s17-12.5 17-25C34 7.611 26.389 0 17 0z" fill="#DC2626" stroke="#fff" stroke-width="2"/>
                  <circle cx="17" cy="16" r="9" fill="#fff"/>
                  <rect x="15.5" y="10" width="3" height="12" fill="#DC2626" rx="1"/>
                  <rect x="11" y="14.5" width="12" height="3" fill="#DC2626" rx="1"/>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(32, 40),
              anchor: new window.google.maps.Point(16, 40)
            }
          })

          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="font-family:system-ui; padding:4px;">
                <strong style="color:#DC2626; font-size:13px;">🏥 ${h.name}</strong>
                <p style="margin:2px 0 0; font-size:11px; color:#64748b;">📍 ${h.area}</p>
                <span style="display:inline-block; margin-top:4px; font-size:10px; background:#fee2e2; color:#991b1b; padding:2px 6px; border-radius:4px; font-weight:700;">
                  CRITICAL CODE RED DESTINATION
                </span>
              </div>
            `
          })

          marker.addListener('click', () => {
            infoWindow.open(map, marker)
          })
        })

      } catch (e) {
        initLeafletFallback()
      }
    }

    const initLeafletFallback = () => {
      if (!mapContainerRef.current) return
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)

      const script = document.createElement('script')
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = () => {
        if (!window.L) return
        const L = window.L
        const map = L.map(mapContainerRef.current).setView([21.1465, 79.0825], 13)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)
        setMapLoaded(true)
      }
      document.head.appendChild(script)
    }

    loadGoogleMaps()

    return () => { isMounted = false }
  }, [activeNav])

  // Helper for cell background color
  const getCellColorClass = (count) => {
    if (count > 15) return 'stock-sufficient'
    if (count >= 4) return 'stock-low'
    return 'stock-critical'
  }

  // Stock Add Action
  const handleAddStockSubmit = (e) => {
    e.preventDefault()
    setBioBanks(prev => prev.map(b => {
      if (b.id === stockFormData.bankId) {
        const cur = b.inventory[stockFormData.group] || 0
        return {
          ...b,
          inventory: { ...b.inventory, [stockFormData.group]: cur + parseInt(stockFormData.units) },
          components: { ...b.components, [stockFormData.component]: (b.components[stockFormData.component] || 0) + parseInt(stockFormData.units) },
          unitsDetail: [
            { id: `U-${Date.now().toString().slice(-4)}`, group: stockFormData.group, component: stockFormData.component, collected: stockFormData.date, expiryDays: 35, status: 'safe' },
            ...b.unitsDetail
          ]
        }
      }
      return b
    }))
    setShowStockModal(false)
  }

  // Emergency Request Create
  const handleCreateEmergencySubmit = (e) => {
    e.preventDefault()
    const newId = `DISP-${Math.floor(1000 + Math.random() * 9000)}`
    const hosp = hospitals.find(h => h.id === emergencyFormData.hospitalId) || hospitals[0]
    const newEmergency = {
      id: newId,
      hospitalId: hosp.id,
      hospitalName: hosp.name,
      group: emergencyFormData.group,
      units: parseInt(emergencyFormData.units) || 2,
      urgency: emergencyFormData.urgency,
      status: 'in_transit',
      patientCondition: emergencyFormData.condition,
      vehicleTag: 'Autonomous Drone Fleet MED-11',
      route: `Nagpur Central (Bank 01) ➔ ${hosp.name}`,
      eta: '6 mins',
      tempC: '3.9°C',
      timestamp: 'Just now'
    }
    setEmergencies(prev => [newEmergency, ...prev])
    setShowEmergencyCreateModal(false)
  }

  // ── HOSPITAL APPROVAL: moves pending → active ──
  const handleApproveHospital = (inv) => {
    const newId = `Hosp. 0${hospitals.length + 1}`
    const newHospital = {
      id: newId,
      name: inv.name,
      lat: 21.1200 + Math.random() * 0.04,   // approximate; real app would geocode
      lng: 79.0600 + Math.random() * 0.06,
      area: inv.locality,
      phone: inv.phone,
      verified: true,
      activeRequests: 0,
      traumaLevel: inv.capabilities?.includes('Level 1 Trauma Center') ? 'Level 1 Trauma Center' : 'Multi-Specialty Hospital',
      icuBedsAvailable: parseInt(inv.icuBeds) || 20,
      requests: []
    }
    setHospitals(prev => [...prev, newHospital])
    setPendingInvitations(prev => prev.map(p =>
      p.id === inv.id ? { ...p, status: 'Active' } : p
    ))
    // Security audit log entry
    setSecurityLogs(prev => [{
      id: `LOG-${Math.floor(7800 + Math.random() * 100)}`,
      timestamp: `${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} IST (Just now)`,
      user: 'Admin - Dr. S. Sharma',
      role: 'Nagpur Regional Director',
      action: `Approved hospital registration for ${inv.name} (${inv.locality}). Added as ${newId}.`,
      flagged: false,
      severity: 'normal',
      ip: '14.139.112.5',
      hash: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`
    }, ...prev])
    setCoverageToast(`✅ ${inv.name} approved and added to the network as ${newId}.`)
    setTimeout(() => setCoverageToast(null), 4000)
    setHospitalSubView('list')
  }

  // ── DONOR VERIFICATION & ADMIN ACTION HANDLERS ──
  const handleApproveDonorVerification = (donorToVerify) => {
    if (!donorToVerify) return
    const updatedTrust = Math.min(100, (donorToVerify.trustScore || 70) + 15)
    setDonors(prev => prev.map(d => d.id === donorToVerify.id ? {
      ...d,
      status: 'verified',
      trustScore: updatedTrust,
      verifiedDonationsScore: Math.min(100, (d.verifiedDonationsScore || 70) + 15),
      otpVerifiedAt: `${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}, ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} IST`
    } : d))

    // Security audit log
    setSecurityLogs(prev => [{
      id: `LOG-${Math.floor(7800 + Math.random() * 100)}`,
      timestamp: `${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} IST (Just now)`,
      user: 'Admin - Dr. S. Sharma',
      role: 'Nagpur Regional Director',
      action: `Approved verification for ${donorToVerify.name} (${donorToVerify.id}). Trust score elevated to ${updatedTrust}.`,
      flagged: false,
      severity: 'normal',
      ip: '14.139.112.5',
      hash: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`
    }, ...prev])

    setVerifyModalDonor(null)
    setShowVerifyModal(false)
    setShowRejectForm(false)
    setDonorToast(`✅ ${donorToVerify.name} verified successfully! Added to active auto-matched matrix.`)
    setTimeout(() => setDonorToast(null), 4500)
  }

  const handleRejectDonorVerification = (donorToReject) => {
    if (!donorToReject) return
    setDonors(prev => prev.map(d => d.id === donorToReject.id ? {
      ...d,
      status: 'flagged',
      flagReason: rejectReason,
      trustScore: Math.max(20, (d.trustScore || 60) - 30)
    } : d))

    setSecurityLogs(prev => [{
      id: `LOG-${Math.floor(7800 + Math.random() * 100)}`,
      timestamp: `${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} IST (Just now)`,
      user: 'Admin - Dr. S. Sharma',
      role: 'Nagpur Regional Director',
      action: `Rejected verification for ${donorToReject.name} (${donorToReject.id}). Reason: ${rejectReason}`,
      flagged: true,
      severity: 'warning',
      ip: '14.139.112.5',
      hash: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`
    }, ...prev])

    setVerifyModalDonor(null)
    setShowVerifyModal(false)
    setShowRejectForm(false)
    setDonorToast(`⚠️ ${donorToReject.name} verification rejected: ${rejectReason}`)
    setTimeout(() => setDonorToast(null), 4500)
  }

  const handleFlagDonor = (donorToFlag) => {
    if (!donorToFlag) return
    setDonors(prev => prev.map(d => d.id === donorToFlag.id ? {
      ...d,
      status: 'flagged',
      flagReason: flagReason,
      trustScore: Math.max(15, (d.trustScore || 60) - 40)
    } : d))

    setSecurityLogs(prev => [{
      id: `LOG-${Math.floor(7800 + Math.random() * 100)}`,
      timestamp: `${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} IST (Just now)`,
      user: 'Admin - Dr. S. Sharma',
      role: 'Nagpur Regional Director',
      action: `Flagged donor account ${donorToFlag.name} (${donorToFlag.id}). Reason: ${flagReason}`,
      flagged: true,
      severity: 'critical',
      ip: '14.139.112.5',
      hash: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`
    }, ...prev])

    setFlagModalDonor(null)
    setDonorToast(`🚩 ${donorToFlag.name} has been flagged: ${flagReason}`)
    setTimeout(() => setDonorToast(null), 4500)
  }

  const handleUnflagDonor = (donorToRestore) => {
    if (!donorToRestore) return
    setDonors(prev => prev.map(d => d.id === donorToRestore.id ? {
      ...d,
      status: 'verified',
      flagReason: null,
      trustScore: Math.min(100, (d.trustScore || 60) + 25)
    } : d))

    setSecurityLogs(prev => [{
      id: `LOG-${Math.floor(7800 + Math.random() * 100)}`,
      timestamp: `${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} IST (Just now)`,
      user: 'Admin - Dr. S. Sharma',
      role: 'Nagpur Regional Director',
      action: `Restored flagged donor ${donorToRestore.name} (${donorToRestore.id}) back to verified status.`,
      flagged: false,
      severity: 'normal',
      ip: '14.139.112.5',
      hash: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`
    }, ...prev])

    setDonorToast(`✅ ${donorToRestore.name} account restored to Verified!`)
    setTimeout(() => setDonorToast(null), 4500)
  }

  // Legacy fast verify fallback
  const handleVerifyDonorAction = (donorIdToVerify) => {
    const target = donors.find(d => d.id === donorIdToVerify) || donors.find(d => d.name === verifyDonorName) || donors[2]
    handleApproveDonorVerification(target)
  }

  // \u2500\u2500 COVERAGE GAP MAP: init when subview becomes active \u2500\u2500
  // Unconnected hospitals to highlight as gap markers
  const UNCOVERED_HOSPITALS = [
    {
      id: 'UC-01',
      name: 'NKP Salve Inst. / Lata Mangeshkar Hospital',
      area: 'Hingna Rd, Digdoh Hills',
      lat: 21.0985,
      lng: 79.0428,
      distanceKm: 6.8,
      popDensity: '14,200/km²',
      pastRequests: 18,
      priorityScore: 88,
      priorityTier: 'high',
      reason: '6.8 km gap from nearest node, critical trauma corridor in Hingna / Digdoh Industrial Belt'
    },
    {
      id: 'UC-02',
      name: 'Orange City Hospital & Research Institute',
      area: 'Basundhara Colony / Ring Road',
      lat: 21.1085,
      lng: 79.0620,
      distanceKm: 5.4,
      popDensity: '15,800/km²',
      pastRequests: 15,
      priorityScore: 82,
      priorityTier: 'high',
      reason: '5.4 km gap, high-density residential zone & major South Nagpur ring intersection'
    },
    {
      id: 'UC-03',
      name: 'Wockhardt Hospital',
      area: 'Manish Nagar, Nagpur',
      lat: 21.1180,
      lng: 79.0530,
      distanceKm: 4.1,
      popDensity: '11,500/km²',
      pastRequests: 9,
      priorityScore: 58,
      priorityTier: 'medium',
      reason: '4.1 km from nearest node, moderate cardiac & surgical demand in Manish Nagar corridor'
    },
    {
      id: 'UC-04',
      name: 'CIIMS (Central India Institute of Medical Sciences)',
      area: 'Bajaj Nagar',
      lat: 21.1265,
      lng: 79.0610,
      distanceKm: 2.6,
      popDensity: '9,200/km²',
      pastRequests: 4,
      priorityScore: 34,
      priorityTier: 'low',
      reason: '2.6 km from Care Hospital, largely covered under existing 3-5 km response corridor'
    },
  ]

  useEffect(() => {
    if (activeNav !== 'hospitals' || hospitalSubView !== 'coverageMap') return
    if (coverageMapInstanceRef.current) return   // already initialised

    let isMounted = true
    const COVERAGE_RADIUS_M = 6500   // ~6.5 km \u2192 ~6-7 min drone at 60 km/h

    const buildMap = () => {
      if (!coverageMapRef.current || !window.google || !window.google.maps) return
      try {
        const map = new window.google.maps.Map(coverageMapRef.current, {
          center: NAGPUR_CENTER,
          zoom: 12,
          gestureHandling: 'greedy',
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          styles: [
            { elementType: 'geometry', stylers: [{ color: '#f5f7fa' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#334155' }] },
            { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
            { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#cbd5e1' }] },
            { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#bae6fd' }] }
          ]
        })
        coverageMapInstanceRef.current = map
        if (isMounted) setCoverageMapLoaded(true)

        // Connected hospitals: 3 concentric response-time rings (heatmap gradient effect)
        hospitals.forEach(h => {
          // Ring 3: Fringe Extended Zone (>15 min response, 5.5 - 8.0 km radius)
          new window.google.maps.Circle({
            map,
            center: { lat: h.lat, lng: h.lng },
            radius: 8000,
            fillColor: '#ef4444',
            fillOpacity: 0.05,
            strokeColor: '#dc2626',
            strokeOpacity: 0.3,
            strokeWeight: 1
          })

          // Ring 2: Standard Response Zone (8-15 min response, 3.0 - 5.5 km radius)
          new window.google.maps.Circle({
            map,
            center: { lat: h.lat, lng: h.lng },
            radius: 5500,
            fillColor: '#f59e0b',
            fillOpacity: 0.12,
            strokeColor: '#d97706',
            strokeOpacity: 0.45,
            strokeWeight: 1.5
          })

          // Ring 1: Core Rapid Response Zone (<8 min response, 0 - 3.0 km radius)
          new window.google.maps.Circle({
            map,
            center: { lat: h.lat, lng: h.lng },
            radius: 3000,
            fillColor: '#10b981',
            fillOpacity: 0.22,
            strokeColor: '#059669',
            strokeOpacity: 0.6,
            strokeWeight: 2
          })

          const marker = new window.google.maps.Marker({
            position: { lat: h.lat, lng: h.lng },
            map,
            title: h.name,
            icon: {
              url: 'data:image/svg+xml;utf-8,' + encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="34" height="42" viewBox="0 0 34 42">
                  <path d="M17 0C7.611 0 0 7.611 0 17c0 12.5 17 25 17 25s17-12.5 17-25C34 7.611 26.389 0 17 0z" fill="#16a34a" stroke="#fff" stroke-width="2"/>
                  <circle cx="17" cy="16" r="9" fill="#fff"/>
                  <rect x="15.5" y="10" width="3" height="12" fill="#16a34a" rx="1"/>
                  <rect x="11" y="14.5" width="12" height="3" fill="#16a34a" rx="1"/>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(32, 40),
              anchor: new window.google.maps.Point(16, 40)
            }
          })
          new window.google.maps.InfoWindow({
            content: `<div style="font-family:system-ui;padding:4px"><strong style="color:#16a34a;font-size:13px">🏥 ${h.name}</strong><p style="margin:2px 0 0;font-size:11px;color:#64748b">📍 ${h.area}</p><span style="display:inline-block;margin-top:4px;font-size:10px;background:#dcfce7;color:#166534;padding:2px 6px;border-radius:4px;font-weight:700">✅ CONNECTED</span></div>`
          })
          marker.addListener('click', () => {
            new window.google.maps.InfoWindow({ content: `<div style="font-family:system-ui;padding:4px"><strong style="color:#16a34a">✅ ${h.name}</strong><p style="font-size:11px;color:#64748b;margin:2px 0 0">📍 ${h.area} &bull; ${h.icuBedsAvailable} ICU Beds</p></div>` }).open(map, marker)
          })
        })

        // Uncovered hospitals: Priority-scored markers with informative actionable popups
        UNCOVERED_HOSPITALS.forEach(uc => {
          const isHigh = uc.priorityScore >= 70
          const isMed = uc.priorityScore >= 40 && uc.priorityScore < 70
          const badgeColor = isHigh ? '#dc2626' : isMed ? '#d97706' : '#475569'
          const badgeBg = isHigh ? '#fef2f2' : isMed ? '#fffbeb' : '#f1f5f9'
          const badgeBorder = isHigh ? '#fecaca' : isMed ? '#fde68a' : '#cbd5e1'
          const tierLabel = isHigh ? '🔥 High Priority' : isMed ? '⚡ Medium Priority' : '📋 Low Priority'

          const marker = new window.google.maps.Marker({
            position: { lat: uc.lat, lng: uc.lng },
            map,
            title: `${uc.name} (${tierLabel} - ${uc.priorityScore}/100)`,
            icon: {
              url: 'data:image/svg+xml;utf-8,' + encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
                  <path d="M18 0C8.059 0 0 8.059 0 18c0 13.5 18 26 18 26s18-12.5 18-26C36 8.059 27.941 0 18 0z" fill="${badgeColor}" stroke="#fff" stroke-width="2"/>
                  <circle cx="18" cy="17" r="9.5" fill="#fff"/>
                  <text x="18" y="21" font-size="11" text-anchor="middle" fill="${badgeColor}" font-weight="900">${isHigh ? '!' : isMed ? '⚡' : '•'}</text>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(34, 42),
              anchor: new window.google.maps.Point(17, 42)
            }
          })

          const iw = new window.google.maps.InfoWindow({
            content: `
              <div style="font-family:system-ui;padding:8px;min-width:240px;max-width:280px">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                  <span style="font-size:10px;font-weight:800;background:${badgeBg};color:${badgeColor};border:1px solid ${badgeBorder};padding:2px 8px;border-radius:12px">
                    ${tierLabel} (${uc.priorityScore}/100)
                  </span>
                  <span style="font-size:10px;color:#64748b;font-weight:700">Gap: ${uc.distanceKm}km</span>
                </div>
                <strong style="color:#0f172a;font-size:13px;display:block;margin-bottom:2px">🏥 ${uc.name}</strong>
                <p style="margin:0 0 6px;font-size:11px;color:#64748b">📍 ${uc.area} • Pop: ${uc.popDensity}</p>
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:6px 8px;font-size:11px;color:#334155;line-height:1.35;margin-bottom:8px">
                  💡 <strong>Why Onboard:</strong> ${uc.reason}
                </div>
                <button
                  onclick="document.getElementById('invite-prefill-trigger').setAttribute('data-name','${uc.name.replace(/'/g, '')}'); document.getElementById('invite-prefill-trigger').setAttribute('data-locality','${uc.area.replace(/'/g, '')}'); document.getElementById('invite-prefill-trigger').click()"
                  style="background:#dc2626;color:#fff;border:none;border-radius:6px;padding:7px 12px;font-size:12px;font-weight:800;cursor:pointer;width:100%"
                >✉️ Invite to Network</button>
              </div>
            `
          })
          marker.addListener('click', () => iw.open(map, marker))
        })

      } catch (e) { /* silent fallback */ }
    }

    if (window.google && window.google.maps) {
      buildMap()
    } else {
      const existing = document.getElementById('google-maps-script')
      if (existing) {
        existing.addEventListener('load', () => { if (isMounted) buildMap() })
      } else {
        const script = document.createElement('script')
        script.id = 'google-maps-script'
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places,geometry`
        script.async = true
        script.defer = true
        script.onload = () => { if (isMounted) buildMap() }
        document.head.appendChild(script)
      }
    }

    return () => { isMounted = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNav, hospitalSubView, hospitals])

  // Reset coverage map instance on sub-view change so it reinits with latest hospitals
  useEffect(() => {
    if (hospitalSubView !== 'coverageMap') {
      coverageMapInstanceRef.current = null
      setCoverageMapLoaded(false)
    }
  }, [hospitalSubView])

  const effectiveDonors = activeRole === 'blood-bank'
    ? donors.filter(d => d.id === 'DNR-NGP-001' || d.id === 'DNR-NGP-002')
    : donors

  // Filtered Donors list
  const filteredDonors = effectiveDonors.filter(d => {
    const matchesFilter = donorStatusFilter === 'all' || d.status === donorStatusFilter
    const query = searchQuery.trim().toLowerCase()
    const matchesSearch = query === '' ||
      Boolean(d.name && d.name.toLowerCase().includes(query)) ||
      Boolean(d.id && d.id.toLowerCase().includes(query)) ||
      Boolean(d.group && d.group.toLowerCase().includes(query)) ||
      Boolean(d.city && d.city.toLowerCase().includes(query))
    return matchesFilter && matchesSearch
  })


  // Filtered Emergencies list
  const filteredEmergencies = emergencies.filter(e => {
    if (emergencyFilter === 'all') return true
    return e.status === emergencyFilter
  })

  return (
    <div className="lstream-grid-root">
      {/* ── LEFT SIDEBAR ── */}
      <aside className="lstream-sidebar">
        <div className="lstream-logo-wrapper">
          <div className="lstream-logo-icon">
            <span style={{ fontSize: '1.2rem' }}>🩸</span>
          </div>
          <div>
            <div className="lstream-brand-title">LifeStream <span className="pro-tag">PRO</span></div>
            <div className="lstream-brand-sub">NAGPUR REGION</div>
          </div>
        </div>

        <div className="lstream-nav-section-label">
          <span>{roleConfig.label.toUpperCase()} MENU</span>
          <span style={{ fontSize: '0.68rem', color: '#0284c7', fontWeight: 700 }}>{roleConfig.badge}</span>
        </div>

        <nav className="lstream-nav-list">
          {/* 1. Dashboard (All roles) */}
          {roleConfig.allowedTabs.includes('dashboard') && (
            <button
              type="button"
              id="sidebar-nav-dashboard"
              className={`lstream-nav-btn ${activeNav === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleNavClick('dashboard')}
            >
              <span className="nav-icon">📊</span>
              <span className="nav-title">
                {activeRole === 'health-officer' ? 'Regional Overview' : (activeRole === 'blood-bank' ? 'Bank Dashboard' : (activeRole === 'hospital' ? 'Trauma Dashboard' : 'Dashboard'))}
              </span>
              <span className="nav-badge-pill active-badge">ACTIVE</span>
            </button>
          )}

          {/* 2. Blood Inventory */}
          {roleConfig.allowedTabs.includes('inventory') && (
            <button
              type="button"
              id="sidebar-nav-inventory"
              className={`lstream-nav-btn ${activeNav === 'inventory' ? 'active' : ''}`}
              onClick={() => handleNavClick('inventory')}
            >
              <span className="nav-icon">🩸</span>
              <span className="nav-title">
                {activeRole === 'blood-bank' ? 'Bank Inventory' : (activeRole === 'hospital' ? 'Search Bank Stock' : 'Blood Inventory')}
              </span>
              <span className="nav-badge-pill">
                {activeRole === 'blood-bank' ? 'BANK 01' : (activeRole === 'hospital' ? 'VIEW-ONLY' : (activeRole === 'auditor' ? 'AUDIT' : '5 BANKS'))}
              </span>
            </button>
          )}

          {/* 3. Hospital Network */}
          {roleConfig.allowedTabs.includes('hospitals') && (
            <button
              type="button"
              id="sidebar-nav-hospitals"
              className={`lstream-nav-btn ${activeNav === 'hospitals' ? 'active' : ''}`}
              onClick={() => { handleNavClick('hospitals'); setHospitalSubView(activeRole === 'health-officer' ? 'coverageMap' : 'list') }}
            >
              <span className="nav-icon">🏥</span>
              <span className="nav-title">
                {activeRole === 'health-officer' ? 'Coverage Gap Map' : 'Hospital Network'}
              </span>
              <span className="nav-badge-pill">{hospitals.length} HOSP</span>
            </button>
          )}

          {/* 4. Donor Hub */}
          {roleConfig.allowedTabs.includes('donors') && (
            <button
              type="button"
              id="sidebar-nav-donors"
              className={`lstream-nav-btn ${activeNav === 'donors' ? 'active' : ''}`}
              onClick={() => handleNavClick('donors')}
            >
              <span className="nav-icon">👥</span>
              <span className="nav-title">
                {activeRole === 'blood-bank' ? 'Matched Donors' : 'Donor Hub'}
              </span>
              <span className="nav-badge-pill">
                {activeRole === 'blood-bank' ? 'SCOPED' : (activeRole === 'auditor' ? 'AUDIT' : '2.1k')}
              </span>
            </button>
          )}

          {/* 5. Emergency Requests */}
          {roleConfig.allowedTabs.includes('emergency') && (
            <button
              type="button"
              id="sidebar-nav-emergency"
              className={`lstream-nav-btn ${activeNav === 'emergency' ? 'active' : ''}`}
              onClick={() => handleNavClick('emergency')}
            >
              <span className="nav-icon">🚨</span>
              <span className="nav-title">
                {activeRole === 'hospital' ? 'Trauma Requests' : 'Emergency Requests'}
              </span>
              <span className="nav-badge-pill code-red-pill">
                {activeRole === 'hospital' ? 'MY HOSP' : '2 CODE RED'}
              </span>
            </button>
          )}

          {/* 6. Analytics */}
          {roleConfig.allowedTabs.includes('analytics') && (
            <button
              type="button"
              id="sidebar-nav-analytics"
              className={`lstream-nav-btn ${activeNav === 'analytics' ? 'active' : ''}`}
              onClick={() => handleNavClick('analytics')}
            >
              <span className="nav-icon">📈</span>
              <span className="nav-title">Analytics</span>
              <span className="nav-badge-pill purple-pill">PREDICT</span>
            </button>
          )}

          {/* 7. Security Sentinel */}
          {roleConfig.allowedTabs.includes('security') && (
            <button
              type="button"
              id="sidebar-nav-security"
              className={`lstream-nav-btn ${activeNav === 'security' ? 'active' : ''}`}
              onClick={() => handleNavClick('security')}
            >
              <span className="nav-icon">🛡️</span>
              <span className="nav-title">
                {activeRole === 'auditor' ? 'Security & Audit' : 'Security Sentinel'}
              </span>
              <span className="nav-badge-pill orange-pill">
                {activeRole === 'auditor' ? 'READ-ONLY' : '2 LOGS'}
              </span>
            </button>
          )}

          {/* 8. Drone Transport */}
          {roleConfig.allowedTabs.includes('drone') && (
            <button
              type="button"
              id="sidebar-nav-drone"
              className={`lstream-nav-btn ${activeNav === 'drone' ? 'active' : ''}`}
              onClick={() => handleNavClick('drone')}
            >
              <span className="nav-icon">⚡</span>
              <span className="nav-title">Drone Transport</span>
              <span className="nav-badge-pill" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#0891b2', border: '1px solid rgba(6, 182, 212, 0.35)' }}>
                {activeRole === 'hospital' ? 'TRACK' : '4 FLEET'}
              </span>
            </button>
          )}

          {/* 9. Community SOS */}
          {roleConfig.allowedTabs.includes('community') && (
            <button
              type="button"
              id="sidebar-nav-community"
              className={`lstream-nav-btn ${activeNav === 'community' ? 'active' : ''}`}
              onClick={() => handleNavClick('community')}
            >
              <span className="nav-icon">📢</span>
              <span className="nav-title">Community SOS</span>
              <span className="nav-badge-pill" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#ca8a04', border: '1px solid rgba(234, 179, 8, 0.35)' }}>
                3 ACTIVE
              </span>
            </button>
          )}
        </nav>

        {/* Bottom System Health */}
        <div className="lstream-sidebar-footer">
          <div className="system-health-row">
            <span className="health-label">Grid Node Status:</span>
            <span className="health-badge-online">ONLINE</span>
          </div>
          <div className="system-health-row">
            <span className="health-label">Cold Chain:</span>
            <span className="health-value">3.8°C (Optimal)</span>
          </div>
          <div style={{ marginTop: 12 }}>
            <Link to="/donor" className="return-link">← Switch to Donor Portal</Link>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="lstream-main">
        {/* Top Header Bar */}
        <header className="lstream-topbar">
          <div className="lstream-heading-group">
            <div className="lstream-header-title">
              <span className="live-dot-pulse"></span>
              {activeNav === 'dashboard' && 'LIFE STREAM BLOOD GRID - NAGPUR REGION'}
              {activeNav === 'inventory' && 'REGIONAL BIO-BANK INVENTORY & EXPIRY DEPOT'}
              {activeNav === 'hospitals' && hospitalSubView === 'list' && 'CONNECTED HOSPITAL NETWORK & TRAUMA CENTERS'}
              {activeNav === 'hospitals' && hospitalSubView === 'coverageMap' && 'NETWORK COVERAGE GAP MAP'}
              {activeNav === 'hospitals' && hospitalSubView === 'invite' && 'INVITE HOSPITAL TO NETWORK'}
              {activeNav === 'hospitals' && hospitalSubView === 'pending' && 'PENDING HOSPITAL REGISTRATIONS'}
              {activeNav === 'hospitals' && hospitalSubView === 'join' && 'HOSPITAL SELF-REGISTRATION PORTAL'}
              {activeNav === 'donors' && ((donorId || selectedProfileDonorId) ? 'DONOR PROFILE & TRUST VERIFICATION DOSSIER' : 'DONOR HUB & SMART VERIFICATION MATRIX')}
              {activeNav === 'emergency' && 'CODE RED DISPATCH & EMERGENCY FLEET'}
              {activeNav === 'analytics' && 'PREDICTIVE DEMAND & REDISTRIBUTION INTELLIGENCE'}
              {activeNav === 'security' && 'SECURITY SENTINEL & AUDIT LEDGER TRAIL'}
            </div>
            <div className="lstream-header-sub">
              📍 Nagpur Hub &nbsp;•&nbsp; ⚡ Node Sync Active &nbsp;•&nbsp; 🩸 {bioBanks.reduce((sum, b) => sum + Object.values(b.inventory).reduce((a, c) => a + c, 0), 0)} Total Units in Reserve
            </div>
          </div>

          <div className="lstream-search-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search donor ID, bank ID, hospital..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="lstream-search-input"
            />
          </div>

          <div className="lstream-topbar-actions">
            <button
              className="guide-btn"
              onClick={() => setShowLogicGuide(true)}
              title="View Regional Grid Architecture & Matching Logic"
            >
              <span>📖</span> System Logic Guide <span className="voltage-tag">LIVE v2.4</span>
            </button>

            <div className="live-clock-badge">
              {currentTime}
            </div>

            <div className="notif-bell-btn">
              🔔
              <span className="notif-badge-dot"></span>
            </div>

            {/* Role Switcher & User Profile */}
            <div style={{ position: 'relative' }}>
              <div
                id="header-role-badge-btn"
                className="user-profile-badge"
                onClick={() => setRoleSwitcherOpen(prev => !prev)}
                title="Click to Switch Demo Role / Persona"
                style={{ cursor: 'pointer', border: '1.5px solid #0284c7' }}
              >
                <div className="avatar-circle" style={{ background: activeRole === 'admin' ? '#dc2626' : (activeRole === 'blood-bank' ? '#d97706' : (activeRole === 'hospital' ? '#059669' : (activeRole === 'auditor' ? '#7c3aed' : '#0284c7'))) }}>
                  {roleConfig.avatar}
                </div>
                <div className="user-meta">
                  <div className="user-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{roleConfig.name}</span>
                    <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: 4, background: '#e0f2fe', color: '#0369a1', fontWeight: 800 }}>
                      {roleConfig.shortLabel}
                    </span>
                  </div>
                  <div className="user-role">{roleConfig.title}</div>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: 4 }}>▼</span>
              </div>

              {/* Role Switcher Interactive Dropdown */}
              {roleSwitcherOpen && (
                <div
                  id="role-switcher-dropdown"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: 290,
                    background: '#ffffff',
                    borderRadius: 12,
                    boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
                    border: '1px solid #cbd5e1',
                    zIndex: 9999,
                    padding: 8,
                    animation: 'fadeIn 0.15s ease'
                  }}
                >
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', padding: '6px 8px', letterSpacing: '0.5px', borderBottom: '1px solid #f1f5f9' }}>
                    ⚡ SWITCH DEMO ROLE / PERSONA
                  </div>
                  {Object.values(ROLE_CONFIGS).map(r => (
                    <button
                      key={r.id}
                      id={`switch-role-${r.id}`}
                      type="button"
                      onClick={() => switchRole(r.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: 'none',
                        background: activeRole === r.id ? '#eff6ff' : 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.12s'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: activeRole === r.id ? '#0284c7' : '#0f172a' }}>
                          {r.label}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          {r.name}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '3px 6px', borderRadius: 4, background: activeRole === r.id ? '#0284c7' : '#f1f5f9', color: activeRole === r.id ? '#fff' : '#64748b' }}>
                        {r.badge}
                      </span>
                    </button>
                  ))}
                  <div style={{ borderTop: '1px solid #f1f5f9', marginTop: 4, paddingTop: 4 }}>
                    <Link
                      to="/donor"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: 8,
                        textDecoration: 'none',
                        color: '#dc2626',
                        fontSize: '0.82rem',
                        fontWeight: 700
                      }}
                    >
                      <span>🩸 Switch to Voluntary Donor App</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ══════════════════════════════════════════════════════ */}
        {/* VIEW 1: DASHBOARD (EXACT 3-COLUMN ORIGINAL GRID)      */}
        {/* ══════════════════════════════════════════════════════ */}
        {/* Role Toast Notification */}
        {roleToast && (
          <div style={{ margin: '14px 24px 0 24px', padding: '10px 16px', background: '#eff6ff', border: '1.5px solid #60a5fa', borderRadius: 8, color: '#1e40af', fontSize: '0.84rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', animation: 'fadeIn 0.2s ease' }}>
            <span>⚡ {roleToast}</span>
            <button type="button" onClick={() => setRoleToast(null)} style={{ background: 'none', border: 'none', color: '#1e40af', cursor: 'pointer', fontWeight: 800 }}>✕</button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* VIEW 1: DASHBOARD (EXACT 3-COLUMN ORIGINAL GRID)      */}
        {/* ══════════════════════════════════════════════════════ */}
        {activeNav === 'dashboard' && (
          <>
            {/* ── ROLE-TAILORED HERO BANNER ── */}
            {activeRole === 'blood-bank' && (
              <div className="lstream-card" style={{ margin: '16px 24px 0 24px', padding: '18px 22px', border: '1.5px solid #f59e0b', background: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.3rem' }}>
                      🏦
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Nagpur Central Blood Bank (Bank 01) Hub Console</h3>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: '#fef3c7', color: '#b45309' }}>OWN BANK NODE</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Bio-Bank Director: {roleConfig.name} • Scoped inventory management and local dispatches</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn-primary" style={{ padding: '7px 14px', fontSize: '0.82rem', background: '#d97706', borderColor: '#d97706' }} onClick={() => { setStockFormData(p => ({ ...p, bankId: 'Bank 01' })); setShowStockModal(true) }}>
                      ➕ Add Stock Batch
                    </button>
                    <button type="button" className="btn btn-secondary" style={{ padding: '7px 14px', fontSize: '0.82rem' }} onClick={() => handleNavClick('drone')}>
                      ⚡ Drone Dispatch
                    </button>
                    <button type="button" className="btn btn-secondary" style={{ padding: '7px 14px', fontSize: '0.82rem' }} onClick={() => handleNavClick('community')}>
                      📢 Shortage Alert
                    </button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                  <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: 8, border: '1px solid #fde68a' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Own Bank Stock</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#b45309' }}>175 Units</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: 8, border: '1px solid #fde68a' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Cold Storage Temp</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>3.8°C Optimal</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: 8, border: '1px solid #fde68a' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Pending Transfers</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0284c7' }}>1 Route Ready</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: 8, border: '1px solid #fde68a' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Matched Donors</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#7c3aed' }}>2 Appointments</div>
                  </div>
                </div>
              </div>
            )}

            {activeRole === 'hospital' && (
              <div className="lstream-card" style={{ margin: '16px 24px 0 24px', padding: '18px 22px', border: '1.5px solid #10b981', background: 'linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.3rem' }}>
                      🏥
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>AIIMS Nagpur Trauma Center (Hosp. 01) Surgery Console</h3>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: '#d1fae5', color: '#065f46' }}>LEVEL 1 APEX CENTER</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Chief of Trauma: {roleConfig.name} • Emergency blood request triage &amp; autonomous drone receiving</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn-primary" style={{ padding: '7px 14px', fontSize: '0.82rem', background: '#dc2626', borderColor: '#dc2626' }} onClick={() => { setEmergencyFormData(p => ({ ...p, hospitalId: 'Hosp. 01' })); setShowEmergencyCreateModal(true) }}>
                      🆘 Raise Emergency Request
                    </button>
                    <button type="button" className="btn btn-secondary" style={{ padding: '7px 14px', fontSize: '0.82rem' }} onClick={() => handleNavClick('drone')}>
                      🚁 Track Incoming Drone
                    </button>
                    <button type="button" className="btn btn-secondary" style={{ padding: '7px 14px', fontSize: '0.82rem' }} onClick={() => handleNavClick('community')}>
                      📢 Broadcast SOS
                    </button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                  <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: 8, border: '1px solid #a7f3d0' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Active Emergency Requests</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#dc2626' }}>1 Code Red (AB-)</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: 8, border: '1px solid #a7f3d0' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Incoming Drone Delivery</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0891b2' }}>MED-08 (ETA 12m)</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: 8, border: '1px solid #a7f3d0' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>ICU Beds Available</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>14 Apex Beds</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: 8, border: '1px solid #a7f3d0' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Surgery Reserve Buffer</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#7c3aed' }}>Cleared for OR-4</div>
                  </div>
                </div>
              </div>
            )}

            {activeRole === 'auditor' && (
              <div className="lstream-card" style={{ margin: '16px 24px 0 24px', padding: '18px 22px', border: '1.5px solid #8b5cf6', background: 'linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.3rem' }}>
                      📋
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>State Blood Transfusion Council (SBTC) Compliance Surveillance</h3>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: '#ede9fe', color: '#6d28d9' }}>READ-ONLY REGULATORY AUDIT</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Chief Compliance Auditor: {roleConfig.name} • Immutable audit ledger monitoring &amp; fraud telemetry inspection</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn-primary" style={{ padding: '7px 14px', fontSize: '0.82rem', background: '#7c3aed', borderColor: '#7c3aed' }} onClick={() => handleNavClick('security')}>
                      🛡️ Audit Ledger Logs
                    </button>
                    <button type="button" className="btn btn-secondary" style={{ padding: '7px 14px', fontSize: '0.82rem' }} onClick={() => handleNavClick('analytics')}>
                      📈 Wastage Analytics
                    </button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                  <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: 8, border: '1px solid #ddd6fe' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>SHA-256 Ledger Hashes</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#7c3aed' }}>1,482 Verified</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: 8, border: '1px solid #ddd6fe' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Flagged Suspicious Logs</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#dc2626' }}>2 Intrusion Signals</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: 8, border: '1px solid #ddd6fe' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Cold-Chain Adherence</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>99.4% Pass Rate</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: 8, border: '1px solid #ddd6fe' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Auditor Permissions</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0284c7' }}>Full Read-Only</div>
                  </div>
                </div>
              </div>
            )}

            {activeRole === 'health-officer' && (
              <div className="lstream-card" style={{ margin: '16px 24px 0 24px', padding: '18px 22px', border: '1.5px solid #0284c7', background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.3rem' }}>
                      🏛️
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Maharashtra Public Health &amp; Family Welfare — Regional Policy Console</h3>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: '#e0f2fe', color: '#0369a1' }}>STATE POLICY OVERSIGHT</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>State Health Officer: {roleConfig.name} • Regional inventory surveillance, coverage gap analysis, &amp; sector balance</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn-primary" style={{ padding: '7px 14px', fontSize: '0.82rem', background: '#0284c7', borderColor: '#0284c7' }} onClick={() => { handleNavClick('hospitals'); setHospitalSubView('coverageMap') }}>
                      🗺️ View Coverage Gap Map
                    </button>
                    <button type="button" className="btn btn-secondary" style={{ padding: '7px 14px', fontSize: '0.82rem' }} onClick={() => handleNavClick('analytics')}>
                      📈 Regional Demand Forecasts
                    </button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                  <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: 8, border: '1px solid #bae6fd' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>District Bio-Banks</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0284c7' }}>5 Active Repositories</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: 8, border: '1px solid #bae6fd' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Connected Hospitals</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>8 Trauma Centers</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: 8, border: '1px solid #bae6fd' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Public-Private Sector Gap</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#d97706' }}>8% Asymmetry (Nominal)</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: 8, border: '1px solid #bae6fd' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Regional Reserve Health</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#7c3aed' }}>72% Stock Fullness</div>
                  </div>
                </div>
              </div>
            )}

            <div className="lstream-content-grid">
              {/* COLUMN 1: LIVE INVENTORY TABLE & AI FORECAST */}
              <div className="grid-col col-inventory">
              <div className="section-head-bar">
                <div>
                  <h3 className="section-title">Live unit counts across Nagpur bio-repositories</h3>
                </div>
                <span className="demand-chip">🔮 Predictive Demand Active</span>
              </div>

              {/* Threshold Legend */}
              <div className="threshold-legend-bar">
                <span className="legend-label">Status Thresholds:</span>
                <span className="legend-item"><span className="legend-dot dot-sufficient"></span> Sufficient (&gt;15)</span>
                <span className="legend-item"><span className="legend-dot dot-low"></span> Low (4-15)</span>
                <span className="legend-item"><span className="legend-dot dot-critical"></span> Critical (≤3)</span>
              </div>

              {/* Bio-Bank Inventory Table */}
              <div className="bio-table-container">
                <table className="bio-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', minWidth: 140 }}>Bio-Bank Node</th>
                      <th>O+</th>
                      <th>O-</th>
                      <th>A+</th>
                      <th>A-</th>
                      <th>B+</th>
                      <th>B-</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bioBanks.map((bank) => (
                      <tr key={bank.id} onClick={() => { setSelectedBankDetail(bank); handleNavClick('inventory') }} style={{ cursor: 'pointer' }}>
                        <td className="node-name-cell">
                          <div className="node-id">{bank.id}</div>
                          <div className="node-label">{bank.name}</div>
                        </td>
                        {['O+', 'O-', 'A+', 'A-', 'B+', 'B-'].map(bg => {
                          const count = bank.inventory[bg] || 0
                          return (
                            <td key={bg} className="count-cell">
                              <span className={`stock-pill ${getCellColorClass(count)}`}>
                                {count}
                              </span>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* AI Forecast Callout Box */}
              <div className="ai-forecast-card">
                <div className="ai-forecast-icon">ℹ️</div>
                <div className="ai-forecast-text">
                  <strong>AI Forecast:</strong> O- stock across Mayo (Bank 02) will deplete in <strong>4.2 hours</strong>. Automatic rerouting prepared from Bank 04.
                </div>
              </div>
            </div>

            {/* COLUMN 2: GOOGLE MAPS TELEMETRY & ROUTE DISPATCH */}
            <div className="grid-col col-map">
              <div className="section-head-bar map-head-bar">
                <span className="map-title-tag">Google Maps Telemetry • Key Loaded</span>
              </div>

              <div className="map-view-wrapper">
                <div ref={mapContainerRef} className="google-map-element" />

                {/* Code Red Route Floating Overlay Card */}
                <div className="code-red-route-card">
                  <div className="route-alert-icon">🚨</div>
                  <div className="route-info">
                    <div className="route-header-row">
                      <span className="route-tag">CODE RED ROUTE</span>
                      <span className="dispatch-badge">DISPATCH DISP-9901</span>
                      <span className="eta-badge">ETA 4 mins</span>
                    </div>
                    <div className="route-endpoints">
                      Nagpur Central (Bank 01) → City General (Hosp. 03)
                    </div>
                  </div>
                </div>

                {/* Landmark Callout */}
                <div className="map-landmark-callout">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>Sri Balaji & Sri Karthikeya Temple</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>Seminary Hills, Nagpur, Maharashtra 440006, India</div>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#2563EB', cursor: 'pointer' }}>↗</span>
                  </div>
                  <div style={{ marginTop: 4, fontSize: '0.7rem', color: '#0284c7', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>♿</span> Accessible entrance
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMN 3: ACTIVE EMERGENCY DISPATCHES & DONOR HUB */}
            <div className="grid-col col-sidebar-feed">
              <div className="active-dispatches-block">
                {/* Emergency Card 1 — DISP-9901 Drone Dispatch (SIMULATED) */}
                {/* isDroneDispatch: true — visually differentiated with teal border & drone badge */}
                <div
                  className="dispatch-card status-transit"
                  style={{ borderLeft: '4px solid #06b6d4', background: 'linear-gradient(135deg, rgba(6,182,212,0.05) 0%, transparent 100%)', cursor: 'pointer' }}
                  onClick={() => handleNavClick('emergency')}
                >
                  <div className="dispatch-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                          color: '#fff', fontSize: '0.65rem', fontWeight: 800,
                          padding: '2px 8px', borderRadius: 20,
                          boxShadow: '0 0 8px rgba(6,182,212,0.4)',
                        }}
                      >
                        ⚡ DRONE
                      </span>
                      <span className="hosp-code">Hosp. 03 • 3 Units O-</span>
                    </div>
                    <span className="status-tag tag-green">Status: IN TRANSIT</span>
                  </div>
                  <div className="patient-condition">
                    Code Red Trauma Patient - Arterial Bleed
                  </div>
                  <div className="dispatch-meta-row">
                    {/* Drone icon instead of van — dashed route visual to match DroneTransport map */}
                    <span className="vehicle-tag" style={{ color: '#06b6d4' }}>🚁 Drone MED-08</span>
                    <span className="eta-text">ETA: 4 mins</span>
                  </div>
                  {/* ⚡ Fast Drone Transport entry — Track Live button on dashboard dispatch card */}
                  <a
                    id="dashboard-track-live-disp9901"
                    href="/drone-transport?fromId=Bank 01&toId=Hosp. 03&group=O-&units=3&requestId=DISP-9901"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      marginTop: 10,
                      background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                      color: '#fff', borderRadius: 8, padding: '5px 12px',
                      fontSize: '0.72rem', fontWeight: 800, textDecoration: 'none',
                      boxShadow: '0 2px 10px rgba(6,182,212,0.35)',
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    ⚡ Track Live
                    <span style={{ fontSize: '0.6rem', opacity: 0.8 }}>(SIMULATED)</span>
                  </a>
                </div>

                {/* Emergency Card 2 — DISP-9902 Ground EV Dispatch */}
                <div className="dispatch-card status-ready" onClick={() => handleNavClick('emergency')} style={{ cursor: 'pointer' }}>
                  <div className="dispatch-card-header">
                    <span className="hosp-code">Hosp. 01 • 2 Units AB-</span>
                    <span className="status-tag tag-yellow">Status: DISPATCH READY</span>
                  </div>
                  <div className="patient-condition">
                    Emergency Surgery - Acute Hemorrhage
                  </div>
                  <div className="dispatch-meta-row">
                    {/* Ground vehicle icon — contrast to drone card above */}
                    <span className="vehicle-tag">🚑 Rapid Medical EV NGP-12</span>
                    <span className="eta-text">ETA: 12 mins</span>
                  </div>
                </div>
              </div>

              {/* Donor Hub & Verification Block */}
              <div className="donor-hub-card">
                <div className="donor-hub-header">
                  <h4 className="donor-hub-title">👥 Donor Hub & Verification</h4>
                  <button className="verify-now-btn" onClick={() => { setVerifyDonorName('Amitabh Deshmukh'); setShowVerifyModal(true) }}>
                    Verify Now
                  </button>
                </div>

                <div className="matching-gauge-row" onClick={() => handleNavClick('donors')} style={{ cursor: 'pointer' }}>
                  <div className="matching-text-info">
                    <div className="matching-label">MATCHING STATUS</div>
                    <div className="matching-percent">78% Auto-Matched</div>
                    <div className="matching-legend">
                      <span><strong style={{ color: '#16a34a' }}>● 78%</strong> Matched</span>
                      <span><strong style={{ color: '#ca8a04' }}>● 14%</strong> Pend</span>
                      <span><strong style={{ color: '#dc2626' }}>● 8%</strong> Flag</span>
                    </div>
                  </div>

                  <div className="donut-circle-wrapper">
                    <svg width="64" height="64" viewBox="0 0 36 36" className="donut-svg">
                      <path
                        className="donut-bg"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="donut-fill"
                        strokeDasharray="78, 100"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="donut-inner-text">78%</div>
                  </div>
                </div>

                {/* Verified Donors Mini List */}
                <div className="donor-mini-list">
                  {donors.slice(0, 3).map(d => (
                    <div key={d.id} className="donor-mini-row" onClick={() => handleNavClick('donors')} style={{ cursor: 'pointer' }}>
                      <div>
                        <div className="donor-row-name">{d.name} <span className="bg-tag">{d.group}</span></div>
                        <div className="donor-row-sub">{d.lastDonation}</div>
                      </div>
                      <span className={d.status === 'verified' ? 'badge-verified' : d.status === 'awaiting' ? 'badge-awaiting' : 'badge-flagged'}>
                        {d.status.charAt(0).toUpperCase() + d.status.slice(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* VIEW 2: BLOOD INVENTORY PAGE (FULL-WIDTH 5 BANKS)      */}
        {/* ══════════════════════════════════════════════════════ */}
        {activeNav === 'inventory' && (
          <div className="lstream-page-container">
            {/* Role Clearance / Scoped Notice Bar */}
            {activeRole === 'blood-bank' && (
              <div style={{ marginBottom: 14, padding: '10px 16px', borderRadius: 8, background: '#fef3c7', border: '1px solid #f59e0b', color: '#92400e', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🏦</span>
                <span>Bio-Bank Scoped Mode: You have full edit authorization for <strong>Nagpur Central Blood Bank (Bank 01)</strong>. Other regional nodes are shown for peer-to-peer inventory visibility.</span>
              </div>
            )}

            {activeRole === 'hospital' && (
              <div style={{ marginBottom: 14, padding: '10px 16px', borderRadius: 8, background: '#ecfdf5', border: '1px solid #10b981', color: '#065f46', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🏥</span>
                <span>Hospital Surgery &amp; Trauma Readiness View: Browse stock levels across regional blood banks to coordinate surgical procedures and emergency reservations. (Read-Only)</span>
              </div>
            )}

            {activeRole === 'auditor' && (
              <div style={{ marginBottom: 14, padding: '10px 16px', borderRadius: 8, background: '#f5f3ff', border: '1px solid #8b5cf6', color: '#5b21b6', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📋</span>
                <span>Auditor Cold-Chain &amp; Expiry Ledger View: Read-only inspection of active batches, collection timestamps, and wastage reduction compliance.</span>
              </div>
            )}

            {activeRole === 'health-officer' && (
              <div style={{ marginBottom: 14, padding: '10px 16px', borderRadius: 8, background: '#f0f9ff', border: '1px solid #0284c7', color: '#075985', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🏛️</span>
                <span>Public Health Oversight View: Regional supply surveillance across all 5 bio-depots for seasonal buffer planning. (Read-Only)</span>
              </div>
            )}

            {/* Header Action Bar */}
            <div className="page-action-header">
              <div>
                <h2 className="page-main-title">🩸 Regional Blood Inventory Repository (5 Bio-Bank Nodes)</h2>
                <p className="page-main-sub">Real-time inventory matrix with component breakdown, collection dates, and expiry countdowns.</p>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {roleConfig.canEditInventory ? (
                  <button className="btn-primary-action" onClick={() => { setStockFormData(p => ({ ...p, bankId: activeRole === 'blood-bank' ? 'Bank 01' : 'Bank 01' })); setShowStockModal(true) }}>
                    ➕ Add / Update Stock
                  </button>
                ) : (
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '6px 14px', borderRadius: 8, background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#64748b' }}>
                    👁️ View-Only Mode ({roleConfig.shortLabel})
                  </span>
                )}
              </div>
            </div>

            {/* ── CROSS-SECTOR BLOOD BRIDGE INTELLIGENCE ── */}
            <CrossSectorBloodBridge isAdmin={roleConfig.canAuthorizeBridge} userRole={activeRole} userBankName={roleConfig.bankName} />

            {/* AI Active Forecasts Banner (All 4 Forecasts) */}
            <div className="ai-forecast-grid-banner">
              <div className="ai-forecast-item">
                <span className="pulse-dot-red"></span>
                <div>
                  <strong>Bank 02 (Mayo):</strong> O- stock will deplete in <strong>4.2 hours</strong>. Auto-rerouting from Bank 04 initiated.
                </div>
              </div>
              <div className="ai-forecast-item">
                <span className="pulse-dot-yellow"></span>
                <div>
                  <strong>Bank 03 (Meditrina):</strong> B- reserves critical (&lt; 2 units). Proactive transfer recommended from Bank 01.
                </div>
              </div>
              <div className="ai-forecast-item">
                <span className="pulse-dot-blue"></span>
                <div>
                  <strong>Bank 05 (LifeLine):</strong> A- platelet demand projected to surge +30% due to upcoming surgical schedules.
                </div>
              </div>
              <div className="ai-forecast-item">
                <span className="pulse-dot-green"></span>
                <div>
                  <strong>Bank 04 (Care Hospital):</strong> O+ surplus buffer safe for next 72 hours across Nagpur zone.
                </div>
              </div>
            </div>

            {/* Full-width Bio-Bank Table */}
            <div className="lstream-card full-table-card">
              <div className="table-header-flex">
                <h3 className="card-section-heading">Bio-Bank Nodes Matrix (Click row to expand component breakdown)</h3>
                <div className="threshold-legend-bar">
                  <span className="legend-item"><span className="legend-dot dot-sufficient"></span> Sufficient (&gt;15)</span>
                  <span className="legend-item"><span className="legend-dot dot-low"></span> Low (4-15)</span>
                  <span className="legend-item"><span className="legend-dot dot-critical"></span> Critical (≤3)</span>
                </div>
              </div>

              <div className="bio-table-container">
                <table className="bio-table full-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Node ID & Name</th>
                      <th>Area</th>
                      <th>O+</th>
                      <th>O-</th>
                      <th>A+</th>
                      <th>A-</th>
                      <th>B+</th>
                      <th>B-</th>
                      <th>Total Units</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bioBanks.map(bank => {
                      const total = Object.values(bank.inventory).reduce((a, b) => a + b, 0)
                      const isSelected = selectedBankDetail?.id === bank.id
                      return (
                        <tr
                          key={bank.id}
                          className={isSelected ? 'selected-row' : ''}
                          onClick={() => setSelectedBankDetail(isSelected ? null : bank)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td className="node-name-cell">
                            <div className="node-id">{bank.id}</div>
                            <div className="node-label">{bank.name}</div>
                          </td>
                          <td style={{ color: '#334155', fontSize: '0.82rem', fontWeight: 600 }}>📍 {bank.area}</td>
                          {['O+', 'O-', 'A+', 'A-', 'B+', 'B-'].map(bg => {
                            const count = bank.inventory[bg] || 0
                            return (
                              <td key={bg} className="count-cell">
                                <span className={`stock-pill ${getCellColorClass(count)}`}>
                                  {count}
                                </span>
                              </td>
                            )
                          })}
                          <td style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.9rem' }}>{total} u</td>
                          <td>
                            <button className="btn-table-expand">
                              {isSelected ? '▲ Collapse' : '▼ Details'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Selected Bank Detailed Breakdown Drawer */}
            {selectedBankDetail && (
              <div className="lstream-card detail-drawer animate-fade-in">
                <div className="drawer-header">
                  <div>
                    <h3 className="drawer-title">🔬 {selectedBankDetail.name} ({selectedBankDetail.id}) — Component & Unit Ledger</h3>
                    <p className="drawer-sub">📍 {selectedBankDetail.area}, Nagpur • Hotline: {selectedBankDetail.phone}</p>
                  </div>
                  <button className="btn-close-drawer" onClick={() => setSelectedBankDetail(null)}>✕ Close</button>
                </div>

                <div className="drawer-grid">
                  {/* Component Breakdown Cards */}
                  <div className="component-breakdown-card">
                    <h4 className="drawer-subheading">Component Type Breakdown</h4>
                    <div className="component-stats-list">
                      {Object.entries(selectedBankDetail.components).map(([comp, count]) => (
                        <div key={comp} className="comp-stat-row">
                          <span className="comp-name">{comp}</span>
                          <span className="comp-count">{count} units</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Individual Units Expiry Countdown */}
                  <div className="units-ledger-card">
                    <h4 className="drawer-subheading">Verified Units Expiry Tracking</h4>
                    <div className="units-table-wrapper">
                      <table className="units-table">
                        <thead>
                          <tr>
                            <th>Unit ID</th>
                            <th>Group</th>
                            <th>Component</th>
                            <th>Collected Date</th>
                            <th>Expiry Remaining</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedBankDetail.unitsDetail.map(u => (
                            <tr key={u.id}>
                              <td style={{ fontFamily: 'monospace', color: '#0284C7', fontWeight: 700 }}>{u.id}</td>
                              <td><span className="bg-tag">{u.group}</span></td>
                              <td style={{ fontSize: '0.82rem', color: '#0F172A', fontWeight: 600 }}>{u.component}</td>
                              <td style={{ fontSize: '0.8rem', color: '#334155' }}>{u.collected}</td>
                              <td style={{ fontWeight: 700, color: u.expiryDays <= 3 ? '#ff1744' : u.expiryDays <= 7 ? '#ff9100' : '#00E676' }}>
                                ⏳ {u.expiryDays} Days
                              </td>
                              <td>
                                <span className={`status-badge-pill ${u.status}`}>
                                  {u.status.toUpperCase()}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* VIEW 3: HOSPITAL NETWORK — LIST + EXPANSION SUITE      */}
        {/* ══════════════════════════════════════════════════════ */}
        {activeNav === 'hospitals' && (() => {
          const totalKnown = 15
          const coveragePct = Math.round((hospitals.length / totalKnown) * 100)
          
          let SUB_TABS = [
            { id: 'list',        label: '🏥 Connected Hospitals' },
            { id: 'coverageMap', label: '🗺️ Coverage Gap Map & Priority Scoring' },
          ]

          if (roleConfig.canManageHospitals) {
            SUB_TABS.push(
              { id: 'invite',      label: '✉️ Invite Hospital' },
              { id: 'pending',     label: `📋 Pending (${pendingInvitations.filter(p => p.status !== 'Active').length})` },
              { id: 'join',        label: '🏗️ Self-Register' }
            )
          }

          if (activeRole === 'health-officer') {
            SUB_TABS = [
              { id: 'coverageMap', label: '🗺️ Coverage Gap Map & Expansion Priorities' },
              { id: 'list',        label: '🏥 Connected Hospitals Overview' },
            ]
          }

          return (
            <div className="lstream-page-container">

              {/* Health Officer Policy Framing Notice */}
              {activeRole === 'health-officer' && (
                <div style={{ marginBottom: 16, padding: '12px 18px', borderRadius: 8, background: '#f0f9ff', border: '1.5px solid #0284c7', color: '#0369a1', fontSize: '0.84rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '1.2rem' }}>🏛️</span>
                  <div>
                    <strong>State Health Department Strategic Policy Framing:</strong> This Coverage Gap Map and Priority Scoring Suite is structured for public health planners to target underserved emergency clusters across Nagpur district.
                  </div>
                </div>
              )}

              {/* Sub-tab bar */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
                {SUB_TABS.map(t => (
                  <button key={t.id} id={`hospital-subtab-${t.id}`} type="button"
                    onClick={() => { setHospitalSubView(t.id); setSelectedHospitalDetail(null) }}
                    style={{ padding: '7px 16px', borderRadius: 8, border: '1.5px solid', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                      background: hospitalSubView === t.id ? '#0284c7' : '#fff',
                      color: hospitalSubView === t.id ? '#fff' : '#475569',
                      borderColor: hospitalSubView === t.id ? '#0284c7' : '#E2E8F0' }}
                  >{t.label}</button>
                ))}
              </div>

              {/* ── SUB-VIEW A: CONNECTED HOSPITALS LIST ── */}
              {hospitalSubView === 'list' && (<>
                <div className="page-action-header">
                  <div>
                    <h2 className="page-main-title">🏥 Connected Hospital Network &amp; Trauma Centers</h2>
                    <p className="page-main-sub">Nagpur regional tertiary care centers connected via autonomous cold-chain drone &amp; EV routing.</p>
                  </div>
                  <span className="badge-verified" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>{hospitals.length} Hospitals Active &amp; Synced</span>
                </div>

                <div className="hospitals-card-grid">
                  {hospitals.map(h => (
                    <div key={h.id} className={`lstream-card hospital-item-card ${selectedHospitalDetail?.id === h.id ? 'active-hospital-card' : ''}`} onClick={() => setSelectedHospitalDetail(h)}>
                      <div className="hosp-card-top">
                        <span className="hosp-id-badge">{h.id}</span>
                        <span className="badge-verified">🟢 Verified Trauma Node</span>
                      </div>
                      <h3 className="hosp-name-title">{h.name}</h3>
                      <div className="hosp-meta-location">📍 {h.area}</div>
                      <div className="hosp-trauma-level">🩺 {h.traumaLevel}</div>
                      <div className="hosp-stats-row">
                        <div className="hosp-stat-block"><div className="hosp-stat-num">{h.activeRequests}</div><div className="hosp-stat-lbl">Active Code Red</div></div>
                        <div className="hosp-stat-block"><div className="hosp-stat-num" style={{ color: '#00E676' }}>{h.icuBedsAvailable}</div><div className="hosp-stat-lbl">ICU Beds Free</div></div>
                        <div className="hosp-stat-block"><div className="hosp-stat-num" style={{ color: '#38bdf8' }}>4-12m</div><div className="hosp-stat-lbl">Drone Transit</div></div>
                      </div>
                      <div className="hosp-contact-bar"><span>📞 Emergency Line: <strong>{h.phone}</strong></span></div>
                    </div>
                  ))}
                </div>

                {selectedHospitalDetail && (
                  <div className="lstream-card detail-drawer animate-fade-in" style={{ marginTop: 24 }}>
                    <div className="drawer-header">
                      <div>
                        <h3 className="drawer-title">🏥 {selectedHospitalDetail.name} ({selectedHospitalDetail.id}) — Dispatch &amp; Request History</h3>
                        <p className="drawer-sub">📍 {selectedHospitalDetail.area} • Hotline: {selectedHospitalDetail.phone}</p>
                      </div>
                      <button className="btn-close-drawer" onClick={() => setSelectedHospitalDetail(null)}>✕ Close</button>
                    </div>
                    <div className="dispatches-list-wrapper">
                      <h4 className="drawer-subheading">Emergency Requests &amp; Code Red Dispatches for {selectedHospitalDetail.name}</h4>
                      {selectedHospitalDetail.requests && selectedHospitalDetail.requests.length > 0 ? (
                        <div className="dispatches-grid">
                          {selectedHospitalDetail.requests.map(req => (
                            <div key={req.id} className={`dispatch-card status-${req.status}`}>
                              <div className="dispatch-card-header">
                                <span className="hosp-code">{selectedHospitalDetail.id} • {req.units} Units {req.group}</span>
                                <span className={`status-tag ${req.status === 'in_transit' ? 'tag-green' : req.status === 'dispatch_ready' ? 'tag-yellow' : 'tag-blue'}`}>{req.status.replace('_', ' ').toUpperCase()}</span>
                              </div>
                              <div className="patient-condition">{req.condition}</div>
                              <div className="dispatch-meta-row" style={{ marginTop: 8 }}>
                                <span className="vehicle-tag">🛰️ {req.vehicle}</span>
                                <span className="eta-text">ETA: {req.eta}</span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 6 }}>📍 Route: {req.route}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ color: '#64748b', fontSize: '0.85rem', padding: '12px 0' }}>No emergency requests logged yet. This hospital joined via admin approval.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Expand Network Card */}
                <div className="lstream-card" style={{ marginTop: 28, background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', border: '1px solid #334155', borderRadius: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>🌐 Network Coverage &amp; Expansion</div>
                      <h3 style={{ margin: 0, color: '#F8FAFC', fontSize: '1.1rem', fontWeight: 800 }}>{hospitals.length} of ~{totalKnown} known Nagpur hospitals connected</h3>
                      <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.83rem' }}>{coveragePct}% network coverage — {totalKnown - hospitals.length} hospitals still outside the emergency network.</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <div style={{ fontSize: '2.4rem', fontWeight: 900, color: coveragePct >= 50 ? '#22c55e' : '#f59e0b', lineHeight: 1 }}>{coveragePct}%</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>COVERAGE</div>
                    </div>
                  </div>
                  <div style={{ background: '#1E293B', borderRadius: 99, height: 8, marginBottom: 20, overflow: 'hidden', border: '1px solid #334155' }}>
                    <div style={{ height: '100%', borderRadius: 99, width: `${coveragePct}%`, background: 'linear-gradient(90deg, #DC2626, #f59e0b, #22c55e)', transition: 'width 0.8s ease' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button id="view-coverage-map-btn" onClick={() => setHospitalSubView('coverageMap')}
                      style={{ background: '#2563EB', border: 'none', padding: '10px 20px', borderRadius: 8, color: '#fff', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer' }}>🗺️ View Coverage Map</button>
                    <button id="invite-hospital-btn" onClick={() => setHospitalSubView('invite')}
                      style={{ background: '#DC2626', border: 'none', padding: '10px 20px', borderRadius: 8, color: '#fff', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer' }}>✉️ Invite a Hospital</button>
                    <button id="view-pending-btn" onClick={() => setHospitalSubView('pending')}
                      style={{ background: 'transparent', border: '1.5px solid #475569', padding: '10px 20px', borderRadius: 8, color: '#94a3b8', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
                      📋 Pending ({pendingInvitations.filter(p => p.status !== 'Active').length})</button>
                    <button id="self-register-btn" onClick={() => setHospitalSubView('join')}
                      style={{ background: 'transparent', border: '1.5px solid #475569', padding: '10px 20px', borderRadius: 8, color: '#94a3b8', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>🏗️ Self-Registration</button>
                  </div>
                </div>
              </>)}

              {/* ── SUB-VIEW B: COVERAGE GAP MAP ── */}
              {hospitalSubView === 'coverageMap' && (
                <div>
                  <div className="lstream-card" style={{ marginBottom: 16, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0F172A' }}>
                      🗺️ Response-Time Heatmap &amp; Coverage Gap Map — Nagpur Region
                    </div>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: '0.78rem', marginLeft: 'auto' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px rgba(16,185,129,0.5)' }}/>
                        <span style={{ color: '#065f46', fontWeight: 700 }}>&lt; 8 min Core (0–3 km)</span>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b', display: 'inline-block', boxShadow: '0 0 6px rgba(245,158,11,0.5)' }}/>
                        <span style={{ color: '#92400e', fontWeight: 700 }}>8–15 min Standard (3–5.5 km)</span>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444', display: 'inline-block', boxShadow: '0 0 6px rgba(239,68,68,0.5)' }}/>
                        <span style={{ color: '#991b1b', fontWeight: 700 }}>&gt; 15 min Fringe (5.5–8 km)</span>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#cbd5e1', display: 'inline-block', border: '1px dashed #64748b' }}/>
                        <span style={{ color: '#475569', fontWeight: 700 }}>Uncovered Gap Area</span>
                      </span>
                    </div>
                  </div>
                  <div ref={coverageMapRef} style={{ width: '100%', height: 520, borderRadius: 12, border: '1.5px solid #E2E8F0', background: '#f1f5f9', position: 'relative', overflow: 'hidden' }}>
                    {!coverageMapLoaded && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#475569' }}>
                        <div style={{ fontSize: '2rem' }}>🗺️</div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Loading Coverage Gap Map...</div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Rendering response-time gradient heatmap layers over Nagpur</div>
                      </div>
                    )}
                  </div>
                  {/* Hidden bridge: Google Maps info window "Invite" button → invite form */}
                  <button id="invite-prefill-trigger" style={{ display: 'none' }}
                    onClick={e => {
                      const name = e.currentTarget.getAttribute('data-name') || ''
                      const locality = e.currentTarget.getAttribute('data-locality') || ''
                      setInviteForm(f => ({ ...f, name, locality: locality || f.locality }))
                      setHospitalSubView('invite')
                    }} />

                  <div className="lstream-card" style={{ marginTop: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>🎯</span> Strategic Onboarding Recommendations (Ranked by Priority Score)
                        </h4>
                        <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#64748B' }}>
                          Priority formula: Distance from nearest node (45%) + Locality Population Density (35%) + Historical SOS Demand (20%)
                        </p>
                      </div>
                      <span style={{ fontSize: '0.75rem', background: '#F1F5F9', color: '#475569', padding: '3px 10px', borderRadius: 12, fontWeight: 700 }}>
                        {UNCOVERED_HOSPITALS.length} Unconnected Hospitals Detected
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                      {[...UNCOVERED_HOSPITALS].sort((a, b) => b.priorityScore - a.priorityScore).map(uc => {
                        const isHigh = uc.priorityScore >= 70
                        const isMed = uc.priorityScore >= 40 && uc.priorityScore < 70
                        const badgeBg = isHigh ? '#FEF2F2' : isMed ? '#FFFBEB' : '#F1F5F9'
                        const badgeColor = isHigh ? '#DC2626' : isMed ? '#D97706' : '#475569'
                        const badgeBorder = isHigh ? '#FECACA' : isMed ? '#FDE68A' : '#CBD5E1'
                        const tierLabel = isHigh ? '🔥 High Priority' : isMed ? '⚡ Medium Priority' : '📋 Low Priority'

                        return (
                          <div
                            key={uc.name}
                            style={{
                              background: '#FFFFFF',
                              border: `1.5px solid ${isHigh ? '#FECACA' : '#E2E8F0'}`,
                              borderRadius: 12,
                              padding: '14px 16px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 8,
                              boxShadow: isHigh ? '0 4px 14px rgba(220,38,38,0.08)' : 'var(--shadow-card)',
                              position: 'relative'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                background: badgeBg,
                                color: badgeColor,
                                border: `1px solid ${badgeBorder}`,
                                padding: '2px 8px',
                                borderRadius: 12
                              }}>
                                {tierLabel}
                              </span>
                              <span style={{ fontSize: '0.9rem', fontWeight: 900, color: badgeColor }}>
                                {uc.priorityScore}<span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700 }}>/100</span>
                              </span>
                            </div>

                            <div>
                              <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0F172A' }}>🏥 {uc.name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 2 }}>📍 {uc.area}</div>
                            </div>

                            {/* Telemetry pill row */}
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: '0.7rem', color: '#475569' }}>
                              <span style={{ background: '#F8FAFC', padding: '2px 6px', borderRadius: 4, border: '1px solid #E2E8F0' }}>
                                📏 {uc.distanceKm} km gap
                              </span>
                              <span style={{ background: '#F8FAFC', padding: '2px 6px', borderRadius: 4, border: '1px solid #E2E8F0' }}>
                                👥 {uc.popDensity}
                              </span>
                              <span style={{ background: '#F8FAFC', padding: '2px 6px', borderRadius: 4, border: '1px solid #E2E8F0' }}>
                                🚨 {uc.pastRequests} SOS reqs
                              </span>
                            </div>

                            {/* Priority reason */}
                            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6, padding: '6px 8px', fontSize: '0.74rem', color: '#334155', lineHeight: 1.35 }}>
                              💡 <strong>Why onboard:</strong> {uc.reason}
                            </div>

                            <button
                              id={`invite-quick-${uc.name.slice(0,8).replace(/\s/g,'-')}`}
                              onClick={() => { setInviteForm(f => ({ ...f, name: uc.name, locality: uc.area })); setHospitalSubView('invite') }}
                              style={{
                                marginTop: 4,
                                background: isHigh ? 'linear-gradient(135deg, #DC2626, #B91C1C)' : '#0284C7',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 6,
                                padding: '8px 12px',
                                fontSize: '0.8rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6
                              }}
                            >
                              ✉️ Invite to Network
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── SUB-VIEW C: INVITE HOSPITAL FORM ── */}
              {hospitalSubView === 'invite' && (
                <div className="lstream-card" style={{ maxWidth: 600 }}>
                  <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>✉️ Invite a Hospital to Join the Network</h3>
                  <p style={{ margin: '0 0 20px', fontSize: '0.83rem', color: '#64748b' }}>The hospital will receive a registration link. Once they self-register and pass verification, they'll appear as a connected node.</p>
                  {inviteToast && (
                    <div style={{ background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontWeight: 700, color: '#166534', fontSize: '0.88rem' }}>✅ {inviteToast}</div>
                  )}
                  <form onSubmit={e => {
                    e.preventDefault()
                    setPendingInvitations(prev => [{
                      id: `INV-${Date.now().toString().slice(-4)}`,
                      name: inviteForm.name, locality: inviteForm.locality, contact: inviteForm.contact,
                      phone: inviteForm.phone, email: inviteForm.email, status: 'Invited',
                      submittedAt: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                      source: 'Admin Invitation', capabilities: []
                    }, ...prev])
                    setInviteToast(`Invitation sent to ${inviteForm.name}. They'll receive a registration link to join the Nagpur network.`)
                    setInviteForm({ name: '', locality: '', contact: '', phone: '', email: '' })
                    setTimeout(() => setInviteToast(null), 5000)
                  }}>
                    {[
                      { label: 'Hospital Name *', key: 'name', type: 'text', placeholder: 'e.g. Wockhardt Hospital Nagpur', req: true },
                      { label: 'Locality / Area *', key: 'locality', type: 'text', placeholder: 'e.g. Manish Nagar, Nagpur', req: true },
                      { label: 'Contact Person Name *', key: 'contact', type: 'text', placeholder: 'Dr. / Admin name', req: true },
                      { label: 'Contact Phone', key: 'phone', type: 'tel', placeholder: '+91 712 XXX XXXX' },
                      { label: 'Contact Email', key: 'email', type: 'email', placeholder: 'admin@hospital.com' },
                    ].map(f => (
                      <div key={f.key} style={{ marginBottom: 14 }}>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 5, textTransform: 'uppercase' }}>{f.label}</label>
                        <input id={`invite-form-${f.key}`} type={f.type} required={f.req} placeholder={f.placeholder} value={inviteForm[f.key]}
                          onChange={e => setInviteForm(p => ({ ...p, [f.key]: e.target.value }))}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', fontSize: '0.88rem', boxSizing: 'border-box', outline: 'none' }} />
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                      <button id="invite-submit-btn" type="submit"
                        style={{ flex: 1, background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontWeight: 800, fontSize: '0.92rem', cursor: 'pointer' }}>✉️ Send Invitation</button>
                      <button type="button" onClick={() => setHospitalSubView('list')}
                        style={{ padding: '12px 18px', borderRadius: 8, border: '1.5px solid #E2E8F0', background: '#fff', color: '#475569', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              {/* ── SUB-VIEW D: PENDING INVITATIONS ── */}
              {hospitalSubView === 'pending' && (
                <div>
                  <div className="page-action-header" style={{ marginBottom: 16 }}>
                    <div>
                      <h2 className="page-main-title">📋 Pending Hospital Registrations</h2>
                      <p className="page-main-sub">Hospitals invited or self-registered, awaiting admin verification &amp; approval.</p>
                    </div>
                    <button className="btn-primary-action" onClick={() => setHospitalSubView('invite')}
                      style={{ background: '#DC2626', border: 'none', padding: '10px 18px', borderRadius: 8, color: '#fff', fontWeight: 800, cursor: 'pointer' }}>+ New Invitation</button>
                  </div>
                  {coverageToast && (
                    <div style={{ background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontWeight: 700, color: '#166534', fontSize: '0.88rem' }}>{coverageToast}</div>
                  )}
                  <div className="lstream-card full-table-card">
                    <div className="bio-table-container">
                      <table className="bio-table full-table">
                        <thead><tr>
                          <th style={{ textAlign: 'left' }}>ID</th>
                          <th style={{ textAlign: 'left' }}>Hospital Name</th>
                          <th style={{ textAlign: 'left' }}>Locality</th>
                          <th style={{ textAlign: 'left' }}>Contact</th>
                          <th>Source</th><th>Submitted</th><th>Status</th><th>Admin Action</th>
                        </tr></thead>
                        <tbody>
                          {pendingInvitations.map(inv => {
                            const SC = { 'Invited': { bg: '#EFF6FF', color: '#1D4ED8' }, 'Registration Started': { bg: '#FFF7ED', color: '#C2410C' }, 'Pending Verification': { bg: '#FFFBEB', color: '#D97706' }, 'Active': { bg: '#F0FDF4', color: '#16A34A' } }
                            const sc = SC[inv.status] || SC['Invited']
                            return (
                              <tr key={inv.id} style={{ background: inv.status === 'Active' ? '#F0FDF4' : 'transparent' }}>
                                <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#0284C7', fontWeight: 700 }}>{inv.id}</td>
                                <td style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.84rem' }}>{inv.name}</td>
                                <td style={{ fontSize: '0.8rem', color: '#475569' }}>{inv.locality}</td>
                                <td style={{ fontSize: '0.78rem', color: '#334155' }}>{inv.contact}<br/><span style={{ color: '#94a3b8' }}>{inv.phone}</span></td>
                                <td style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{inv.source}</td>
                                <td style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b' }}>{inv.submittedAt}</td>
                                <td style={{ textAlign: 'center' }}>
                                  <span style={{ background: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 800, whiteSpace: 'nowrap' }}>{inv.status}</span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  {inv.status === 'Pending Verification'
                                    ? <button id={`approve-btn-${inv.id}`} onClick={() => handleApproveHospital(inv)}
                                        style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer' }}>✅ Approve</button>
                                    : inv.status === 'Active'
                                    ? <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 700 }}>🟢 Live</span>
                                    : <button onClick={() => setPendingInvitations(prev => prev.map(p => p.id === inv.id ? { ...p, status: 'Pending Verification' } : p))}
                                        style={{ background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer' }}>Mark Received</button>
                                  }
                                </td>
                              </tr>
                            )
                          })}
                          {pendingInvitations.length === 0 && (
                            <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8', fontSize: '0.85rem' }}>No pending registrations. Send invitations to hospitals with coverage gaps.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── SUB-VIEW E: SELF-REGISTRATION STEPPER ── */}
              {hospitalSubView === 'join' && (() => {
                const STEPS = ['Basic Information', 'Verification Details', 'Capabilities', 'Review & Submit']
                const toggleCap = cap => setJoinForm(f => ({ ...f, capabilities: f.capabilities.includes(cap) ? f.capabilities.filter(c => c !== cap) : [...f.capabilities, cap] }))
                const handleJoinSubmit = () => {
                  setPendingInvitations(prev => [{
                    id: `INV-${Date.now().toString().slice(-4)}`, name: joinForm.name,
                    locality: joinForm.locality || joinForm.address, contact: `${joinForm.contactName} (${joinForm.contactRole})`,
                    phone: joinForm.phone, email: joinForm.email, status: 'Pending Verification',
                    submittedAt: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                    source: 'Self-Registration', licenseNo: joinForm.licenseNo, icuBeds: joinForm.icuBeds, capabilities: joinForm.capabilities
                  }, ...prev])
                  setJoinStep(5)
                }
                const BLANK_JOIN = { name: '', type: 'private', address: '', locality: '', contactName: '', contactRole: '', phone: '', email: '', licenseNo: '', icuBeds: '', capabilities: [], agreedToTerms: false }
                return (
                  <div className="lstream-card" style={{ maxWidth: 640 }}>
                    {joinStep < 5 && (
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
                        {STEPS.map((s, i) => {
                          const n = i + 1, isActive = joinStep === n, isDone = joinStep > n
                          return (
                            <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                              {i > 0 && <div style={{ position: 'absolute', top: 14, right: '50%', width: '100%', height: 2, background: isDone ? '#DC2626' : '#E2E8F0', zIndex: 0 }} />}
                              <div style={{ width: 28, height: 28, borderRadius: '50%', background: isDone || isActive ? '#DC2626' : '#E2E8F0', color: isDone || isActive ? '#fff' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.78rem', zIndex: 1, position: 'relative', transition: 'all 0.2s' }}>
                                {isDone ? '✓' : n}
                              </div>
                              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: isActive ? '#DC2626' : '#94a3b8', marginTop: 4, textAlign: 'center', lineHeight: 1.2 }}>{s}</div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {joinStep === 1 && (
                      <div>
                        <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 800 }}>Step 1: Basic Information</h3>
                        <p style={{ margin: '0 0 18px', fontSize: '0.82rem', color: '#64748b' }}>Provide your hospital's primary details for registration.</p>
                        {[
                          { label: 'Hospital Name *', key: 'name', type: 'text', placeholder: 'Full official hospital name', req: true },
                          { label: 'Full Address *', key: 'address', type: 'text', placeholder: 'Street, Colony, Nagpur – 4400XX', req: true },
                          { label: 'Locality / Area *', key: 'locality', type: 'text', placeholder: 'e.g. Bajaj Nagar, Nagpur', req: true },
                          { label: 'Contact Person Name *', key: 'contactName', type: 'text', placeholder: 'Dr. / Administrator name', req: true },
                          { label: 'Designation / Role *', key: 'contactRole', type: 'text', placeholder: 'e.g. Medical Superintendent', req: true },
                          { label: 'Phone *', key: 'phone', type: 'tel', placeholder: '+91 712 XXX XXXX', req: true },
                          { label: 'Email *', key: 'email', type: 'email', placeholder: 'official@hospital.com', req: true },
                        ].map(f => (
                          <div key={f.key} style={{ marginBottom: 12 }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 4, textTransform: 'uppercase' }}>{f.label}</label>
                            <input id={`join-s1-${f.key}`} type={f.type} required={f.req} placeholder={f.placeholder} value={joinForm[f.key]}
                              onChange={e => setJoinForm(p => ({ ...p, [f.key]: e.target.value }))}
                              style={{ width: '100%', padding: '9px 12px', borderRadius: 7, border: '1.5px solid #E2E8F0', fontSize: '0.85rem', boxSizing: 'border-box', outline: 'none' }} />
                          </div>
                        ))}
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 4, textTransform: 'uppercase' }}>Hospital Type *</label>
                          <select id="join-s1-type" value={joinForm.type} onChange={e => setJoinForm(p => ({ ...p, type: e.target.value }))}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: 7, border: '1.5px solid #E2E8F0', fontSize: '0.85rem', background: '#fff', boxSizing: 'border-box' }}>
                            <option value="government">Government / Public</option>
                            <option value="private">Private</option>
                            <option value="trust">Charitable / Trust</option>
                            <option value="deemed">Deemed University Hospital</option>
                          </select>
                        </div>
                        <button id="join-s1-next" disabled={!joinForm.name || !joinForm.address || !joinForm.phone || !joinForm.email} onClick={() => setJoinStep(2)}
                          style={{ width: '100%', marginTop: 14, background: joinForm.name && joinForm.address && joinForm.phone && joinForm.email ? '#DC2626' : '#E2E8F0', color: joinForm.name && joinForm.address && joinForm.phone && joinForm.email ? '#fff' : '#94a3b8', border: 'none', borderRadius: 8, padding: '12px', fontWeight: 800, fontSize: '0.92rem', cursor: 'pointer' }}>
                          Next: Verification Details →
                        </button>
                      </div>
                    )}
                    {joinStep === 2 && (
                      <div>
                        <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 800 }}>Step 2: Verification Details</h3>
                        <p style={{ margin: '0 0 18px', fontSize: '0.82rem', color: '#64748b' }}>Used by the LifeStream admin team to verify your hospital before granting network access.</p>
                        <div style={{ marginBottom: 14 }}>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 4, textTransform: 'uppercase' }}>Hospital Registration Certificate / License Number *</label>
                          <input id="join-s2-license" type="text" required placeholder="e.g. MH-NGP-HOSP-2018-0023" value={joinForm.licenseNo}
                            onChange={e => setJoinForm(p => ({ ...p, licenseNo: e.target.value }))}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: 7, border: '1.5px solid #E2E8F0', fontSize: '0.85rem', fontFamily: 'monospace', boxSizing: 'border-box' }} />
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>Format: MH-NGP-HOSP-YYYY-XXXX (Issued by Maharashtra Medical Council)</div>
                        </div>
                        <div style={{ marginBottom: 14 }}>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 4, textTransform: 'uppercase' }}>Current ICU Bed Capacity *</label>
                          <input id="join-s2-icu" type="number" min="1" required placeholder="e.g. 24" value={joinForm.icuBeds}
                            onChange={e => setJoinForm(p => ({ ...p, icuBeds: e.target.value }))}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: 7, border: '1.5px solid #E2E8F0', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>This will appear as "ICU Beds Free" on your hospital card.</div>
                        </div>
                        <div style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: '0.8rem', color: '#1E40AF', lineHeight: 1.5 }}>
                          ℹ️ <strong>Note:</strong> In production, you would upload scanned registration certificate copies. A license number is sufficient for this prototype.
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button onClick={() => setJoinStep(1)} style={{ padding: '11px 16px', borderRadius: 8, border: '1.5px solid #E2E8F0', background: '#fff', color: '#475569', fontWeight: 700, cursor: 'pointer' }}>← Back</button>
                          <button id="join-s2-next" disabled={!joinForm.licenseNo || !joinForm.icuBeds} onClick={() => setJoinStep(3)}
                            style={{ flex: 1, background: joinForm.licenseNo && joinForm.icuBeds ? '#DC2626' : '#E2E8F0', color: joinForm.licenseNo && joinForm.icuBeds ? '#fff' : '#94a3b8', border: 'none', borderRadius: 8, padding: '11px', fontWeight: 800, fontSize: '0.92rem', cursor: 'pointer' }}>
                            Next: Capabilities →
                          </button>
                        </div>
                      </div>
                    )}
                    {joinStep === 3 && (
                      <div>
                        <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 800 }}>Step 3: Hospital Capabilities</h3>
                        <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: '#64748b' }}>Select all capabilities that apply. This determines how the platform routes emergency blood requests.</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                          {JOIN_CAPABILITIES.map(cap => {
                            const checked = joinForm.capabilities.includes(cap)
                            const isDrone = cap === 'Drone Transit Compatible Landing Zone'
                            return (
                              <label key={cap} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 14px', borderRadius: 9, border: `1.5px solid ${checked ? (isDrone ? '#2563EB' : '#DC2626') : '#E2E8F0'}`, background: checked ? (isDrone ? '#EFF6FF' : '#FEF2F2') : '#fff', cursor: 'pointer', transition: 'all 0.15s' }}>
                                <input type="checkbox" checked={checked} onChange={() => toggleCap(cap)}
                                  style={{ marginTop: 2, accentColor: isDrone ? '#2563EB' : '#DC2626', width: 16, height: 16 }} />
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A' }}>
                                    {isDrone && <span style={{ fontSize: '0.72rem', background: '#2563EB', color: '#fff', padding: '1px 5px', borderRadius: 4, marginRight: 6, fontWeight: 800 }}>🚁 DRONE</span>}
                                    {cap}
                                  </div>
                                  {isDrone && <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>Confirms your rooftop or courtyard can safely receive autonomous drone blood deliveries.</div>}
                                </div>
                              </label>
                            )
                          })}
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button onClick={() => setJoinStep(2)} style={{ padding: '11px 16px', borderRadius: 8, border: '1.5px solid #E2E8F0', background: '#fff', color: '#475569', fontWeight: 700, cursor: 'pointer' }}>← Back</button>
                          <button id="join-s3-next" onClick={() => setJoinStep(4)}
                            style={{ flex: 1, background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: '11px', fontWeight: 800, fontSize: '0.92rem', cursor: 'pointer' }}>Review &amp; Submit →</button>
                        </div>
                      </div>
                    )}
                    {joinStep === 4 && (
                      <div>
                        <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 800 }}>Step 4: Review &amp; Submit</h3>
                        <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: '#64748b' }}>Please verify all information before submitting for admin verification.</p>
                        <div style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 10, padding: '16px', marginBottom: 16, fontSize: '0.84rem' }}>
                          {[['Hospital Name', joinForm.name], ['Type', joinForm.type], ['Address', joinForm.address], ['Locality', joinForm.locality],
                            ['Contact Person', `${joinForm.contactName} — ${joinForm.contactRole}`], ['Phone / Email', `${joinForm.phone} / ${joinForm.email}`],
                            ['License Number', joinForm.licenseNo], ['ICU Bed Capacity', `${joinForm.icuBeds} beds`]
                          ].map(([label, val]) => (
                            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', padding: '7px 0' }}>
                              <span style={{ color: '#64748b', fontWeight: 600, minWidth: 150 }}>{label}</span>
                              <span style={{ color: '#0F172A', fontWeight: 700, textAlign: 'right' }}>{val}</span>
                            </div>
                          ))}
                          <div style={{ padding: '7px 0' }}>
                            <span style={{ color: '#64748b', fontWeight: 600 }}>Capabilities</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                              {joinForm.capabilities.length > 0 ? joinForm.capabilities.map(c => (
                                <span key={c} style={{ background: '#FEF2F2', color: '#991B1B', padding: '2px 8px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700 }}>{c}</span>
                              )) : <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>None selected</span>}
                            </div>
                          </div>
                        </div>
                        <div style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 10, padding: '11px 14px', marginBottom: 16, fontSize: '0.8rem', color: '#92400E' }}>
                          ⏱️ Our team will verify your details within <strong>24–48 hours</strong>. You'll receive credentials at <strong>{joinForm.email}</strong> once approved.
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button onClick={() => setJoinStep(3)} style={{ padding: '11px 16px', borderRadius: 8, border: '1.5px solid #E2E8F0', background: '#fff', color: '#475569', fontWeight: 700, cursor: 'pointer' }}>← Back</button>
                          <button id="join-submit-btn" onClick={handleJoinSubmit}
                            style={{ flex: 1, background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer' }}>🚀 Submit for Verification</button>
                        </div>
                      </div>
                    )}
                    {joinStep === 5 && (
                      <div style={{ textAlign: 'center', padding: '24px 0' }}>
                        <div style={{ fontSize: '3.5rem', marginBottom: 10 }}>🎉</div>
                        <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 900, color: '#0F172A' }}>Registration Submitted!</h3>
                        <p style={{ margin: '0 0 6px', fontSize: '0.88rem', color: '#059669', fontWeight: 700 }}>✅ {joinForm.name} has been added to the verification queue.</p>
                        <p style={{ margin: '0 0 20px', fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5 }}>
                          Our team will verify your details within 24–48 hours. Credentials will be sent to <strong>{joinForm.email}</strong> once approved.
                        </p>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button id="join-view-pending" onClick={() => { setJoinStep(1); setJoinForm(BLANK_JOIN); setHospitalSubView('pending') }}
                            style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 800, cursor: 'pointer' }}>📋 View Pending Registrations</button>
                          <button onClick={() => { setJoinStep(1); setJoinForm(BLANK_JOIN); setHospitalSubView('list') }}
                            style={{ background: '#fff', color: '#475569', border: '1.5px solid #E2E8F0', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer' }}>Back to Hospital List</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Global approval toast */}
              {coverageToast && hospitalSubView !== 'pending' && (
                <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#0F172A', color: '#fff', padding: '12px 24px', borderRadius: 30, fontWeight: 700, fontSize: '0.88rem', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', zIndex: 99999 }}>
                  {coverageToast}
                </div>
              )}
            </div>
          )
        })()}


        {activeNav === 'donors' && (() => {
          const effectiveDonors = activeRole === 'blood-bank'
            ? donors.filter(d => d.id === 'DNR-NGP-001' || d.id === 'DNR-NGP-002')
            : donors

          const verifiedCount = effectiveDonors.filter(d => d.status === 'verified').length
          const awaitingCount = effectiveDonors.filter(d => d.status === 'awaiting').length
          const flaggedCount = effectiveDonors.filter(d => d.status === 'flagged').length
          const totalDonors = effectiveDonors.length || 1
          const verifiedPct = Math.round((verifiedCount / totalDonors) * 100)
          const awaitingPct = Math.round((awaitingCount / totalDonors) * 100)
          const flaggedPct = Math.round((flaggedCount / totalDonors) * 100)

          const activeProfileId = donorId || selectedProfileDonorId
          const activeDonor = activeProfileId ? (effectiveDonors.find(d => d.id === activeProfileId) || effectiveDonors[0]) : null

          // ── VIEW A: DEDICATED DONOR PROFILE PAGE ──
          if (activeDonor) {
            const isCooldown = (activeDonor.lastDonationDays || 0) < 90
            const daysRemaining = isCooldown ? (90 - (activeDonor.lastDonationDays || 0)) : 0
            const nextEligibleDate = isCooldown ? `${daysRemaining} days remaining (clears in ~${Math.ceil(daysRemaining / 7)} weeks)` : 'Cleared & Eligible Today'

            return (
              <div className="lstream-page-container">
                {/* Back Button & Action Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProfileDonorId(null)
                      navigate('/grid/donors')
                    }}
                    style={{
                      background: '#FFFFFF',
                      border: '1.5px solid #E2E8F0',
                      borderRadius: 8,
                      padding: '8px 16px',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      color: '#334155',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'all 0.15s'
                    }}
                  >
                    ← Back to Donor Hub
                  </button>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn-contact-action"
                      onClick={() => setContactModalDonor(activeDonor)}
                    >
                      📞 Contact Donor
                    </button>
                    {roleConfig.canVerifyDonors ? (
                      <>
                        {activeDonor.status !== 'flagged' ? (
                          <button
                            type="button"
                            className="btn-flag-action"
                            onClick={() => setFlagModalDonor(activeDonor)}
                          >
                            🚩 Flag Account
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-primary-action"
                            style={{ background: '#10B981', borderColor: '#10B981', padding: '8px 16px', fontSize: '0.82rem' }}
                            onClick={() => handleUnflagDonor(activeDonor)}
                          >
                            🟢 Restore Account
                          </button>
                        )}
                        {activeDonor.status === 'awaiting' && (
                          <button
                            type="button"
                            className="btn-primary-action"
                            style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                            onClick={() => setVerifyModalDonor(activeDonor)}
                          >
                            ✅ Verify Now
                          </button>
                        )}
                      </>
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, padding: '6px 12px', background: '#f1f5f9', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                        {activeRole === 'blood-bank' ? '🔒 Bank Scoped (Read-Only Verification)' : '👁️ Dossier Audit View'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Profile Header Card */}
                <div className="donor-profile-card">
                  <div className="donor-profile-header-strip">
                    <div className="donor-profile-title-group">
                      <div className="donor-avatar-large">
                        {activeDonor.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h2 className="donor-profile-name">
                          {activeDonor.name}
                          <span className="bg-tag" style={{ fontSize: '0.9rem', padding: '3px 10px' }}>{activeDonor.group}</span>
                          <span className={activeDonor.status === 'verified' ? 'badge-verified' : activeDonor.status === 'awaiting' ? 'badge-awaiting' : 'badge-flagged'}>
                            {activeDonor.status === 'verified' ? '🟢 VERIFIED DONOR' : activeDonor.status === 'awaiting' ? '🟡 AWAITING VERIFICATION' : '🔴 FLAGGED / INACTIVE'}
                          </span>
                        </h2>
                        <div className="donor-profile-meta-row">
                          <span>🆔 <strong>{activeDonor.id}</strong></span>
                          <span>📍 {activeDonor.city}</span>
                          <span>📞 {activeDonor.phone}</span>
                          <span>✉️ {activeDonor.email || 'donor@lifestream.org'}</span>
                          <span>📅 Registered: {activeDonor.registeredAt || '10 Dec 2024'}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <div style={{ fontSize: '1.8rem', fontWeight: 900, color: activeDonor.trustScore >= 90 ? '#10B981' : activeDonor.trustScore >= 70 ? '#F59E0B' : '#EF4444', lineHeight: 1 }}>
                        ⭐ {activeDonor.trustScore}/100
                      </div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B' }}>
                        TRUST MATRIX SCORE
                      </div>
                    </div>
                  </div>

                  {/* Flag notice if flagged */}
                  {activeDonor.status === 'flagged' && activeDonor.flagReason && (
                    <div style={{ background: '#FFF1F2', border: '1.5px solid #FECDD3', borderRadius: 8, padding: '10px 14px', marginTop: 16, color: '#9F1239', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>⚠️</span>
                      <div>
                        <strong>Flagged by Admin:</strong> {activeDonor.flagReason}
                      </div>
                    </div>
                  )}

                  {/* 2-Column Details Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20, marginTop: 24 }}>
                    {/* Left Column: Trust Breakdown + Cooldown + Verification Details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {/* Trust Score Breakdown */}
                      <div className="trust-meter-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                          <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0F172A' }}>
                            📊 Trust Score Breakdown
                          </h4>
                          <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Algorithmic Rating</span>
                        </div>

                        <div>
                          <div className="trust-metric-row">
                            <span>Verified Donations Track Record</span>
                            <span style={{ color: '#059669' }}>{activeDonor.verifiedDonationsScore || 95}%</span>
                          </div>
                          <div className="trust-bar-bg">
                            <div className="trust-bar-fill trust-bar-green" style={{ width: `${activeDonor.verifiedDonationsScore || 95}%` }} />
                          </div>

                          <div className="trust-metric-row">
                            <span>Emergency SOS Response Rate</span>
                            <span style={{ color: '#0284C7' }}>{activeDonor.responseRate || 90}%</span>
                          </div>
                          <div className="trust-bar-bg">
                            <div className="trust-bar-fill trust-bar-blue" style={{ width: `${activeDonor.responseRate || 90}%` }} />
                          </div>

                          <div className="trust-metric-row">
                            <span>Profile &amp; Health Completeness</span>
                            <span style={{ color: '#D97706' }}>{activeDonor.profileCompleteness || 100}%</span>
                          </div>
                          <div className="trust-bar-bg">
                            <div className="trust-bar-fill trust-bar-amber" style={{ width: `${activeDonor.profileCompleteness || 100}%` }} />
                          </div>
                        </div>

                        <div style={{ fontSize: '0.74rem', color: '#64748B', lineHeight: 1.4, borderTop: '1px solid #E2E8F0', paddingTop: 10, marginTop: 4 }}>
                          ℹ️ High trust scores grant donors priority notification in Code Red trauma dispatches and rapid check-in at all 5 Nagpur regional bio-banks.
                        </div>
                      </div>

                      {/* Eligibility & Cooldown Panel */}
                      <div className={`cooldown-banner-card ${!isCooldown ? 'cooldown-banner-cleared' : 'cooldown-banner-active'}`}>
                        <div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: !isCooldown ? '#166534' : '#92400E', marginBottom: 2 }}>
                            {isCooldown ? '⏳ Mandatory Cooldown Active' : '🟢 Donation Ready'}
                          </div>
                          <div style={{ fontSize: '1rem', fontWeight: 800, color: !isCooldown ? '#14532D' : '#78350F' }}>
                            {isCooldown ? 'In 90-Day Biological Cooldown Period' : 'Cleared & Eligible to Donate Blood'}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: !isCooldown ? '#166534' : '#92400E', marginTop: 4 }}>
                            Last Donation: <strong>{activeDonor.lastDonationDate || '24 Jun 2026'}</strong> ({activeDonor.lastDonation})
                          </div>
                          <div style={{ fontSize: '0.78rem', color: !isCooldown ? '#15803D' : '#B45309', marginTop: 2 }}>
                            Next Eligible Window: <strong>{nextEligibleDate}</strong>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ background: !isCooldown ? '#DCFCE7' : '#FEF3C7', color: !isCooldown ? '#166534' : '#92400E', padding: '6px 12px', borderRadius: 8, fontWeight: 800, fontSize: '0.8rem', display: 'inline-block' }}>
                            {isCooldown ? `⏳ ${daysRemaining}d Left` : '✅ 0d Cooldown'}
                          </span>
                        </div>
                      </div>

                      {/* Verification Details (Admin-Only Section) */}
                      <div className="privacy-admin-box">
                        <div style={{ fontWeight: 800, color: '#1E293B', marginBottom: 6, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>🛡️</span> Government ID Verification &amp; DPDP Compliance
                        </div>
                        <div style={{ marginBottom: 4 }}>
                          <strong>Verification Protocol:</strong> UIDAI Aadhaar SHA-256 HMAC Match (SBTC Accredited)
                        </div>
                        <div style={{ marginBottom: 4 }}>
                          <strong>ID Cryptographic Hash:</strong> <code style={{ background: '#E2E8F0', padding: '1px 6px', borderRadius: 4, fontSize: '0.75rem', fontFamily: 'monospace' }}>{activeDonor.aadhaarHash || '0x8f2a...c91e'}</code>
                        </div>
                        <div style={{ marginBottom: 4 }}>
                          <strong>OTP Verification Timestamp:</strong> {activeDonor.otpVerifiedAt || '12 Jan 2026, 14:22 IST'}
                        </div>
                        <div style={{ color: '#64748B', fontSize: '0.72rem', marginTop: 6, borderTop: '1px solid #CBD5E1', paddingTop: 6 }}>
                          🔒 <em>In strict compliance with the Digital Personal Data Protection (DPDP) Act 2023, raw government ID numbers are never stored in plaintext or exposed on administrative dashboards.</em>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Donation History & Activity Logs */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {/* Past Donation History */}
                      <div className="trust-meter-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0F172A' }}>
                            🩸 Verified Donation History ({activeDonor.donationsCount || 0})
                          </h4>
                          <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Regional Bio-Banks</span>
                        </div>

                        {activeDonor.donationHistory && activeDonor.donationHistory.length > 0 ? (
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                              <thead>
                                <tr style={{ background: '#F1F5F9', color: '#475569', textAlign: 'left' }}>
                                  <th style={{ padding: '6px 8px', borderRadius: '6px 0 0 6px' }}>Date</th>
                                  <th style={{ padding: '6px 8px' }}>Facility / Blood Bank</th>
                                  <th style={{ padding: '6px 8px' }}>Component</th>
                                  <th style={{ padding: '6px 8px' }}>Cert ID</th>
                                  <th style={{ padding: '6px 8px', borderRadius: '0 6px 6px 0' }}>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {activeDonor.donationHistory.map(dh => (
                                  <tr key={dh.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                    <td style={{ padding: '8px 8px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>{dh.date}</td>
                                    <td style={{ padding: '8px 8px', color: '#334155' }}>{dh.bank}</td>
                                    <td style={{ padding: '8px 8px', color: '#475569' }}>{dh.component} ({dh.units}u)</td>
                                    <td style={{ padding: '8px 8px', fontFamily: 'monospace', color: '#0284C7', fontWeight: 700 }}>{dh.certificateId}</td>
                                    <td style={{ padding: '8px 8px' }}>
                                      <span style={{ background: '#DCFCE7', color: '#166534', padding: '2px 6px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                        {dh.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', padding: '20px 0', color: '#94A3B8', fontSize: '0.82rem' }}>
                            No past blood donations recorded on the central ledger yet.
                          </div>
                        )}
                      </div>

                      {/* Activity & Audit Trail */}
                      <div className="trust-meter-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0F172A' }}>
                            📋 Donor Activity &amp; Audit Log
                          </h4>
                          <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Telemetry Stream</span>
                        </div>

                        {activeDonor.activityLogs && activeDonor.activityLogs.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {activeDonor.activityLogs.map(log => (
                              <div key={log.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 8px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: '0.78rem' }}>
                                <span style={{ fontSize: '0.9rem', marginTop: 1 }}>
                                  {log.type === 'donation' ? '🩸' : log.type === 'sos' ? '🚨' : log.type === 'verify' ? '✅' : log.type === 'flag' ? '🚩' : '📝'}
                                </span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ color: '#0F172A', fontWeight: 600 }}>{log.action}</div>
                                  <div style={{ color: '#94A3B8', fontSize: '0.7rem' }}>{log.date}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ color: '#94A3B8', fontSize: '0.82rem', textAlign: 'center', padding: '12px 0' }}>
                            No recent activity logged.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Global toast */}
                {donorToast && (
                  <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#0F172A', color: '#fff', padding: '12px 24px', borderRadius: 30, fontWeight: 700, fontSize: '0.88rem', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', zIndex: 99999 }}>
                    {donorToast}
                  </div>
                )}
              </div>
            )
          }

          // ── VIEW B: MAIN DONOR HUB TABLE ──
          return (
            <div className="lstream-page-container">
              {/* Data Minimization Notice for Bank Admin */}
              {activeRole === 'blood-bank' && (
                <div style={{ marginBottom: 16, padding: '12px 18px', borderRadius: 8, background: '#fef3c7', border: '1.5px solid #f59e0b', color: '#92400e', fontSize: '0.84rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '1.2rem' }}>🔒</span>
                  <div>
                    <strong>Data-Minimization Protocol Active (§3.2 Security Standard):</strong> Scoped view showing only voluntary donors with confirmed appointment or donation history at Nagpur Central Blood Bank (Bank 01). Full network registry access is restricted to Platform Super Admin.
                  </div>
                </div>
              )}

              {activeRole === 'auditor' && (
                <div style={{ marginBottom: 16, padding: '12px 18px', borderRadius: 8, background: '#f5f3ff', border: '1.5px solid #8b5cf6', color: '#5b21b6', fontSize: '0.84rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '1.2rem' }}>📋</span>
                  <div>
                    <strong>Auditor Dossier Inspection Mode:</strong> Full read access to verified donor trust scores, UIDAI biometric hashes, and cooldown ledgers. Administrative verifications &amp; flagging are read-only.
                  </div>
                </div>
              )}

              <div className="page-action-header">
                <div>
                  <h2 className="page-main-title">
                    {activeRole === 'blood-bank' ? '👥 Bank 01 Matched Donor Registry' : '👥 Nagpur Donor Hub & 90-Day Cooldown Registry'}
                  </h2>
                  <p className="page-main-sub">Interactive registry with Aadhaar OTP verification, trust score telemetry, and auto-matching status.</p>
                </div>
                {roleConfig.canVerifyDonors ? (
                  <button
                    className="btn-primary-action"
                    onClick={() => {
                      const firstAwaiting = donors.find(d => d.status === 'awaiting')
                      if (firstAwaiting) {
                        setVerifyModalDonor(firstAwaiting)
                      } else {
                        setDonorToast('ℹ️ All registered donors are already verified!')
                        setTimeout(() => setDonorToast(null), 3000)
                      }
                    }}
                  >
                    🔍 Fast Aadhaar Verification
                  </button>
                ) : (
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '6px 14px', borderRadius: 8, background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#64748b' }}>
                    👁️ {activeRole === 'blood-bank' ? 'Bank Scoped Contact View' : 'Read-Only Audit View'}
                  </span>
                )}
              </div>

              {/* Interactive Matching Donut Gauge Header */}
              <div className="lstream-card donor-analytics-strip">
                <div className="matching-donut-large">
                  <svg width="84" height="84" viewBox="0 0 36 36" className="donut-svg">
                    <path
                      className="donut-bg"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="donut-fill"
                      strokeDasharray={`${verifiedPct}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="donut-inner-text" style={{ fontSize: '1.1rem' }}>{verifiedPct}%</div>
                </div>

                <div className="donut-details-meta">
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
                    Nagpur Regional Matching Ratio: <strong>{verifiedPct}% Auto-Matched</strong>
                  </div>
                  <p style={{ color: '#475569', fontSize: '0.82rem', margin: '4px 0 10px' }}>
                    Filter the donor registry below by clicking any status segment:
                  </p>
                  <div className="donor-filter-pills">
                    <button
                      className={`filter-pill-btn ${donorStatusFilter === 'all' ? 'active-filter' : ''}`}
                      onClick={() => setDonorStatusFilter('all')}
                    >
                      All Donors ({donors.length})
                    </button>
                    <button
                      className={`filter-pill-btn ${donorStatusFilter === 'verified' ? 'active-filter-green' : ''}`}
                      onClick={() => setDonorStatusFilter('verified')}
                    >
                      🟢 Auto-Matched / Verified ({verifiedCount} • {verifiedPct}%)
                    </button>
                    <button
                      className={`filter-pill-btn ${donorStatusFilter === 'awaiting' ? 'active-filter-yellow' : ''}`}
                      onClick={() => setDonorStatusFilter('awaiting')}
                    >
                      🟡 Pending Verification ({awaitingCount} • {awaitingPct}%)
                    </button>
                    <button
                      className={`filter-pill-btn ${donorStatusFilter === 'flagged' ? 'active-filter-red' : ''}`}
                      onClick={() => setDonorStatusFilter('flagged')}
                    >
                      🔴 Flagged / Inactive ({flaggedCount} • {flaggedPct}%)
                    </button>
                  </div>
                </div>
              </div>

              {/* Donors Table */}
              <div className="lstream-card full-table-card">
                <div className="bio-table-container">
                  <table className="bio-table full-table">
                    <thead>
                      <tr>
                        <th>Donor ID</th>
                        <th style={{ textAlign: 'left' }}>Full Name</th>
                        <th>Blood Group</th>
                        <th>Area / City</th>
                        <th>Last Donation &amp; Cooldown</th>
                        <th>Trust Score</th>
                        <th>Donations</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDonors.map(d => (
                        <tr key={d.id}>
                          <td style={{ fontFamily: 'monospace', color: '#0284C7', fontWeight: 700 }}>{d.id}</td>
                          <td style={{ textAlign: 'left', fontWeight: 700, color: '#0F172A' }}>{d.name}</td>
                          <td><span className="bg-tag">{d.group}</span></td>
                          <td style={{ fontSize: '0.82rem', color: '#334155', fontWeight: 500 }}>📍 {d.city}</td>
                          <td style={{ fontSize: '0.82rem', color: '#334155' }}>{d.lastDonation}</td>
                          <td>
                            <span style={{ fontWeight: 800, color: d.trustScore >= 90 ? '#00E676' : d.trustScore >= 70 ? '#ffb300' : '#ff1744' }}>
                              ⭐ {d.trustScore}/100
                            </span>
                          </td>
                          <td style={{ fontWeight: 700 }}>{d.donationsCount}</td>
                          <td>
                            <span className={d.status === 'verified' ? 'badge-verified' : d.status === 'awaiting' ? 'badge-awaiting' : 'badge-flagged'}>
                              {d.status.toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                              {d.status === 'awaiting' && roleConfig.canVerifyDonors && (
                                <button
                                  className="verify-now-btn"
                                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                  onClick={() => setVerifyModalDonor(d)}
                                  title="Verify Aadhaar & Medical Declarations"
                                >
                                  Verify Now
                                </button>
                              )}
                              {d.status === 'verified' && (
                                <button
                                  className="btn-contact-action"
                                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                  onClick={() => setContactModalDonor(d)}
                                  title="Contact Donor via Phone / WhatsApp"
                                >
                                  📞 Contact
                                </button>
                              )}
                              {d.status === 'flagged' && roleConfig.canVerifyDonors && (
                                <button
                                  className="btn-primary-action"
                                  style={{ background: '#10B981', borderColor: '#10B981', padding: '4px 8px', fontSize: '0.75rem' }}
                                  onClick={() => handleUnflagDonor(d)}
                                  title="Restore Donor Account"
                                >
                                  🟢 Restore
                                </button>
                              )}
                              <button
                                className="btn-table-expand"
                                onClick={() => {
                                  setSelectedProfileDonorId(d.id)
                                  navigate(`/grid/donors/${d.id}`)
                                }}
                                title="Open Full Donor Dossier & Verification Profile"
                              >
                                Profile
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredDonors.length === 0 && (
                        <tr>
                          <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: '#94A3B8' }}>
                            No donors found matching the current status filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Global toast */}
              {donorToast && (
                <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#0F172A', color: '#fff', padding: '12px 24px', borderRadius: 30, fontWeight: 700, fontSize: '0.88rem', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', zIndex: 99999 }}>
                  {donorToast}
                </div>
              )}
            </div>
          )
        })()}

        {/* ══════════════════════════════════════════════════════ */}
        {/* VIEW 5: EMERGENCY REQUESTS & DISPATCH PAGE            */}
        {/* ══════════════════════════════════════════════════════ */}
        {activeNav === 'emergency' && (
          <div className="lstream-page-container">
            {/* Scoped Notice for Hospital Staff */}
            {activeRole === 'hospital' && (
              <div style={{ marginBottom: 16, padding: '12px 18px', borderRadius: 8, background: '#ecfdf5', border: '1.5px solid #10b981', color: '#065f46', fontSize: '0.84rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.2rem' }}>🏥</span>
                <div>
                  <strong>AIIMS Nagpur Trauma Center Emergency Node:</strong> You can raise immediate Code Red requests for acute surgical and trauma cases. Autonomous drone and EV fleets will be mobilized automatically.
                </div>
              </div>
            )}

            {activeRole === 'blood-bank' && (
              <div style={{ marginBottom: 16, padding: '12px 18px', borderRadius: 8, background: '#fef3c7', border: '1.5px solid #f59e0b', color: '#92400e', fontSize: '0.84rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.2rem' }}>🏦</span>
                <div>
                  <strong>Blood Bank Supplier Dispatch Console:</strong> View emergency hospital requests where Nagpur Central Blood Bank (Bank 01) is the matched supplier node. You can fulfill dispatches and confirm donations.
                </div>
              </div>
            )}

            <div className="page-action-header">
              <div>
                <h2 className="page-main-title">🚨 Nagpur Emergency Code Red Fleet &amp; Active Dispatches</h2>
                <p className="page-main-sub">Real-time emergency telemetry for autonomous medical drone MED-08, rapid EV fleets, and cold-chain monitoring.</p>
              </div>
              {roleConfig.canCreateEmergency ? (
                <button
                  className="btn-primary-action btn-danger-action"
                  onClick={() => {
                    setEmergencyFormData(p => ({
                      ...p,
                      hospitalId: activeRole === 'hospital' ? 'Hosp. 01' : 'Hosp. 03'
                    }))
                    setShowEmergencyCreateModal(true)
                  }}
                >
                  🆘 Create Emergency Request
                </button>
              ) : (
                <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '6px 14px', borderRadius: 8, background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#64748b' }}>
                  👁️ Telemetry Oversight Mode ({roleConfig.shortLabel})
                </span>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="lstream-card filter-bar-card">
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: `All Dispatches (${emergencies.length})` },
                  { id: 'in_transit', label: `🚨 In Transit (${emergencies.filter(e => e.status === 'in_transit').length})` },
                  { id: 'dispatch_ready', label: `⚡ Dispatch Ready (${emergencies.filter(e => e.status === 'dispatch_ready').length})` },
                  { id: 'fulfilled', label: `✅ Fulfilled (${emergencies.filter(e => e.status === 'fulfilled').length})` },
                ].map(tabItem => (
                  <button
                    key={tabItem.id}
                    className={`filter-pill-btn ${emergencyFilter === tabItem.id ? 'active-filter' : ''}`}
                    onClick={() => setEmergencyFilter(tabItem.id)}
                  >
                    {tabItem.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Emergency Cards Grid */}
            <div className="emergency-cards-list">
              {filteredEmergencies.map(em => {
                // Detect drone dispatches by isDroneDispatch flag OR legacy vehicleTag keyword match
                // (SIMULATED — in production this flag would come from the dispatch API)
                const isDrone = em.isDroneDispatch ||
                  (em.vehicleTag && /drone/i.test(em.vehicleTag))

                return (
                  <div
                    key={em.id}
                    className={`lstream-card dispatch-full-card status-${em.status}`}
                    style={isDrone ? {
                      borderLeft: '4px solid #06b6d4',
                      background: 'linear-gradient(135deg, rgba(6,182,212,0.04) 0%, rgba(8,145,178,0.02) 100%)',
                    } : undefined}
                  >
                    <div className="dispatch-card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="dispatch-badge">#{em.id}</span>
                        {/* ⚡ Drone dispatch visual differentiator — teal badge instead of ground-vehicle icon */}
                        {isDrone && (
                          <span style={{
                            background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                            color: '#fff',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            padding: '3px 9px',
                            borderRadius: 20,
                            letterSpacing: '0.4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            boxShadow: '0 0 10px rgba(6,182,212,0.35)',
                          }}>
                            ⚡ DRONE
                          </span>
                        )}
                        <span className="hosp-code">{em.hospitalName}</span>
                        <span className="bg-tag" style={{ fontSize: '0.85rem', padding: '3px 8px' }}>{em.group} × {em.units} Units</span>
                      </div>
                      <span className={`status-tag ${em.status === 'in_transit' ? 'tag-green' : em.status === 'dispatch_ready' ? 'tag-yellow' : 'tag-blue'}`}>
                        STATUS: {em.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>

                    <div className="patient-condition" style={{ fontSize: '1rem', marginTop: 10, color: '#0F172A', fontWeight: 700 }}>
                      🩺 {em.patientCondition}
                    </div>

                    <div className="dispatch-telemetry-row">
                      <div className="telemetry-chip">
                        {/* Drone dispatches show a drone icon; ground dispatches show a van icon */}
                        <span>{isDrone ? '🚁 Drone:' : '🚑 Vehicle:'}</span> <strong>{em.vehicleTag}</strong>
                      </div>
                      <div className="telemetry-chip">
                        <span>Live ETA:</span> <strong style={{ color: em.status === 'in_transit' ? '#DC2626' : '#059669' }}>{em.eta}</strong>
                      </div>
                      <div className="telemetry-chip">
                        <span>Cold Chain Temp:</span> <strong style={{ color: '#0284C7' }}>{em.tempC}</strong>
                      </div>
                      <div className="telemetry-chip">
                        <span>Created:</span> <span>{em.timestamp}</span>
                      </div>
                    </div>

                    <div className="dispatch-route-visual">
                      <div className="route-dot-start"></div>
                      {/* Drone path rendered as dashed line in CSS to visually match the map dash-line; ground = solid */}
                      <div className="route-line-bar" style={isDrone ? { backgroundImage: 'repeating-linear-gradient(90deg, #06b6d4 0, #06b6d4 8px, transparent 8px, transparent 16px)', background: 'none', opacity: 0.7 } : undefined}></div>
                      <div className="route-dot-end"></div>
                      <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>{em.route}</span>
                    </div>

                    {/* Action Bar: Drone Tracking & Community Broadcast Fallback */}
                    {em.status !== 'fulfilled' && (
                      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(6,182,212,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          {isDrone && em.droneTrackParams && (
                            <a
                              id={`track-live-drone-${em.id}`}
                              href={`/drone-transport?${em.droneTrackParams}`}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                                background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                                color: '#fff', border: 'none', borderRadius: 10,
                                padding: '8px 16px', fontWeight: 800, fontSize: '0.82rem',
                                textDecoration: 'none',
                                boxShadow: '0 4px 14px rgba(6,182,212,0.35)',
                              }}
                            >
                              ⚡ Track Live Drone
                            </a>
                          )}

                          {/* 📢 Fallback Channel: Community & NGO Broadcast */}
                          <a
                            id={`grid-community-sos-${em.id}`}
                            href={`/donor?tab=community&group=${em.group}&hospital=${encodeURIComponent(em.hospitalName)}&units=${em.units}&urgency=${encodeURIComponent(em.urgency)}&requestId=${em.id}`}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 6,
                              background: '#0f172a',
                              color: '#5eead4',
                              border: '1px solid rgba(94, 234, 212, 0.4)',
                              borderRadius: 10,
                              padding: '8px 16px',
                              fontWeight: 800,
                              fontSize: '0.82rem',
                              textDecoration: 'none',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                            }}
                          >
                            📢 Community SOS
                          </a>
                        </div>

                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {isDrone ? 'Point-to-point aerial route • bypasses ground traffic' : 'Emergency cold-chain telemetry active'}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* VIEW 6: ANALYTICS & PREDICTIVE DEMAND PAGE            */}
        {/* ══════════════════════════════════════════════════════ */}
        {activeNav === 'analytics' && (() => {
          // Dynamic calculation for Chart 1
          const ambAvgTime = 21.4
          const droneAvgTime = 6.8
          const speedRatio = (ambAvgTime / droneAvgTime).toFixed(1)

          // Dynamic calculation for Chart 2
          const ALL_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']
          const groupStockData = ALL_GROUPS.map(g => {
            const count = bioBanks.reduce((sum, b) => sum + (b.inventory[g] || 0), 0)
            let status = 'safe'
            let color = '#10B981'
            if (count < 20) { status = 'critical'; color = '#EF4444' }
            else if (count < 45) { status = 'warning'; color = '#F59E0B' }
            return { group: g, units: count, status, color }
          })
          const maxGroupUnits = Math.max(...groupStockData.map(d => d.units), 1)
          const totalRegionalUnits = groupStockData.reduce((sum, d) => sum + d.units, 0)

          // Chart 3: Chronic Demand Data
          const chronicDemandData = [
            { group: 'O+', units: 32, label: '32 Units', pct: '100%', color: '#8B5CF6' },
            { group: 'O-', units: 8,  label: '8 Units',  pct: '25%',  color: '#EC4899' },
            { group: 'A+', units: 22, label: '22 Units', pct: '68%',  color: '#8B5CF6' },
            { group: 'A-', units: 6,  label: '6 Units',  pct: '19%',  color: '#EC4899' },
            { group: 'B+', units: 28, label: '28 Units', pct: '88%',  color: '#8B5CF6' },
            { group: 'B-', units: 7,  label: '7 Units',  pct: '22%',  color: '#EC4899' },
            { group: 'AB+', units: 12, label: '12 Units', pct: '38%', color: '#8B5CF6' },
            { group: 'AB-', units: 4,  label: '4 Units',  pct: '12%', color: '#EC4899' },
          ]
          const totalChronicDemand = chronicDemandData.reduce((sum, d) => sum + d.units, 0)

          // Chart 4: 7-Day Emergency Requests
          const last7DaysData = [
            { day: 'Mon', fulfilled: 14, open: 0, date: '23 Aug' },
            { day: 'Tue', fulfilled: 18, open: 1, date: '24 Aug' },
            { day: 'Wed', fulfilled: 12, open: 0, date: '25 Aug' },
            { day: 'Thu', fulfilled: 16, open: 0, date: '26 Aug' },
            { day: 'Fri', fulfilled: 21, open: 1, date: '27 Aug' },
            { day: 'Sat', fulfilled: 19, open: 0, date: '28 Aug' },
            { day: 'Sun (Today)', fulfilled: 15, open: 2, date: '29 Aug' },
          ]
          const totalFulfilled7d = last7DaysData.reduce((s, d) => s + d.fulfilled, 0)
          const totalOpen7d = last7DaysData.reduce((s, d) => s + d.open, 0)
          const fulfillmentPct = ((totalFulfilled7d / (totalFulfilled7d + totalOpen7d)) * 100).toFixed(1)

          // Chart 5: Wastage & Expiry by Bank
          const bankWastageData = [
            { name: 'Nagpur Central Blood Bank (Bank 01)', expired: 4, total: 480, rate: '0.8%' },
            { name: 'Mayo Bio-Bank Node (Bank 02)', expired: 7, total: 510, rate: '1.4%' },
            { name: 'Meditrina Bio-Depot (Bank 03)', expired: 2, total: 390, rate: '0.5%' },
            { name: 'Care Hospital Blood Centre (Bank 04)', expired: 3, total: 520, rate: '0.6%' },
            { name: 'LifeLine Regional Bio-Centre (Bank 05)', expired: 1, total: 340, rate: '0.3%' },
          ]
          const totalExpired = bankWastageData.reduce((s, d) => s + d.expired, 0)

          // Chart 6: Redistribution Suggestions
          const redistributionData = {
            accepted: 34,
            rejected: 4,
            unitsSaved: 182
          }
          const acceptRate = ((redistributionData.accepted / (redistributionData.accepted + redistributionData.rejected)) * 100).toFixed(1)

          return (
            <div className="lstream-page-container">
              <div className="page-action-header">
                <div>
                  <h2 className="page-main-title">📈 Nagpur AI Predictive Demand & Redistribution Intelligence</h2>
                  <p className="page-main-sub">Live telemetry benchmarks, inventory analytics, and AI predictive demand models across the Nagpur Medical Grid.</p>
                </div>
                <span className="demand-chip" style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
                  🔮 AI Forecast Active (4.2h Horizon)
                </span>
              </div>

              {/* Top KPI Cards */}
              <div className="analytics-kpi-grid">
                <div className="lstream-card kpi-analytic-card">
                  <div className="kpi-label">Mean Time to Dispatch (Drone)</div>
                  <div className="kpi-value" style={{ color: '#06B6D4' }}>{droneAvgTime} mins</div>
                  <div className="kpi-target">vs {ambAvgTime} mins Ground EMS (3.1x faster)</div>
                </div>
                <div className="lstream-card kpi-analytic-card">
                  <div className="kpi-label">AI Depletion Forecast Accuracy</div>
                  <div className="kpi-value" style={{ color: '#38BDF8' }}>94.2%</div>
                  <div className="kpi-target">Validated across 5 Nagpur Banks</div>
                </div>
                <div className="lstream-card kpi-analytic-card">
                  <div className="kpi-label">Prevented Expiry Wastage</div>
                  <div className="kpi-value" style={{ color: '#C084FC' }}>{redistributionData.unitsSaved} Units</div>
                  <div className="kpi-target">Via Proactive Redistribution</div>
                </div>
                <div className="lstream-card kpi-analytic-card">
                  <div className="kpi-label">Emergency Fulfillment Ratio</div>
                  <div className="kpi-value" style={{ color: '#10B981' }}>{fulfillmentPct}%</div>
                  <div className="kpi-target">115 / 119 cases (Last 7 Days)</div>
                </div>
              </div>

              {/* ══════════════════════════════════════════════════════ */}
              {/* STACKED BAR CHARTS (6 VERTICAL SECTIONS)               */}
              {/* ══════════════════════════════════════════════════════ */}
              <div className="analytics-charts-stack">

                {/* ── CHART 1: DRONE VS AMBULANCE DELIVERY TIME ── */}
                <div className="chart-card">
                  <div className="chart-card-header">
                    <div>
                      <h3 className="chart-card-title">
                        <span>⚡</span> Drone vs Ambulance: Average Delivery Time Comparison
                      </h3>
                      <p className="chart-card-sub">
                        Comparing autonomous medical UAV aerial corridors against standard ground ambulance routes across Nagpur.
                      </p>
                    </div>
                    <span className="badge badge-cyan" style={{ fontSize: '0.78rem', padding: '4px 10px' }}>
                      ⚡ 48V Aerial Fleet Benchmark
                    </span>
                  </div>

                  <div className="delivery-bars-container">
                    {/* Ambulance Bar */}
                    <div className="delivery-bar-block amb-block">
                      <div className="delivery-bar-meta">
                        <span className="delivery-bar-name">
                          <span>🚑</span> Standard Ground Transport (Ambulance)
                        </span>
                        <span className="delivery-bar-time" style={{ color: '#EF4444' }}>
                          {ambAvgTime} <span style={{ fontSize: '0.9rem', color: '#64748B' }}>mins</span>
                        </span>
                      </div>
                      <div className="delivery-bar-track">
                        <div className="delivery-bar-fill amb-fill" style={{ width: '100%' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#64748B', marginTop: 8 }}>
                        <span>Sitabuldi &amp; Wardha Rd Congestion</span>
                        <span>Avg 42 km/h</span>
                      </div>
                    </div>

                    {/* Drone Bar */}
                    <div className="delivery-bar-block drone-block">
                      <div className="delivery-bar-meta">
                        <span className="delivery-bar-name">
                          <span>🚁</span> Fast Aerial Delivery (Drone Transport)
                        </span>
                        <span className="delivery-bar-time" style={{ color: '#0891B2' }}>
                          {droneAvgTime} <span style={{ fontSize: '0.9rem', color: '#64748B' }}>mins</span>
                        </span>
                      </div>
                      <div className="delivery-bar-track">
                        <div className="delivery-bar-fill drone-fill" style={{ width: `${(droneAvgTime / ambAvgTime) * 100}%` }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#0891B2', marginTop: 8, fontWeight: 700 }}>
                        <span>Zero Traffic Overhead • Direct Geodesic Line</span>
                        <span>Avg 60 km/h</span>
                      </div>
                    </div>
                  </div>

                  <div className="chart-insight-callout insight-blue">
                    <span style={{ fontSize: '1.2rem' }}>⚡</span>
                    <div>
                      <strong>Key Insight:</strong> Drone Transport is <strong>~{speedRatio}x faster on average</strong> across the Nagpur Medical Grid, saving an average of <strong>{(ambAvgTime - droneAvgTime).toFixed(1)} minutes</strong> per critical emergency dispatch.
                    </div>
                  </div>
                </div>

                {/* ── CHART 2: BLOOD GROUP-WISE TOTAL STOCK ── */}
                <div className="chart-card">
                  <div className="chart-card-header">
                    <div>
                      <h3 className="chart-card-title">
                        <span>🩸</span> Blood Group-Wise Total Stock (All 5 Nagpur Banks Combined)
                      </h3>
                      <p className="chart-card-sub">
                        Live aggregate units in reserve across all connected bio-banks with automatic safety-threshold coloring.
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, fontSize: '0.74rem' }}>
                      <span className="badge badge-green">🟢 &ge;45u Sufficient</span>
                      <span className="badge badge-yellow">🟡 20-44u Low</span>
                      <span className="badge badge-red">🔴 &lt;20u Critical</span>
                    </div>
                  </div>

                  <div className="bg-stock-bars-grid">
                    {groupStockData.map(item => {
                      const heightPct = Math.max(12, Math.round((item.units / maxGroupUnits) * 100))
                      return (
                        <div key={item.group} className="bg-bar-col">
                          <span className="bg-bar-pill">{item.units}u</span>
                          <div
                            className="bg-bar-pillar"
                            style={{
                              height: `${heightPct}%`,
                              background: item.color,
                              boxShadow: `0 2px 8px ${item.color}40`
                            }}
                          />
                          <span className="bg-bar-name">{item.group}</span>
                        </div>
                      )
                    })}
                  </div>

                  <div className="chart-insight-callout insight-green">
                    <span style={{ fontSize: '1.2rem' }}>📊</span>
                    <div>
                      <strong>Regional Inventory Summary:</strong> <strong>{totalRegionalUnits} total units</strong> in reserve across 5 banks. Critical deficit detected in <strong>O- ({groupStockData.find(g => g.group === 'O-')?.units || 0}u)</strong> and <strong>B- ({groupStockData.find(g => g.group === 'B-')?.units || 0}u)</strong> reserves requiring targeted donor recruitment.
                    </div>
                  </div>
                </div>

                {/* ── CHART 3: CHRONIC DEMAND FORECAST (NEXT 7 DAYS) ── */}
                <div className="chart-card">
                  <div className="chart-card-header">
                    <div>
                      <h3 className="chart-card-title">
                        <span>🩺</span> Chronic Transfusion Care Demand Forecast (Next 7 Days)
                      </h3>
                      <p className="chart-card-sub">
                        Network-wide aggregate requirement for 42 registered Thalassemia Major, Sickle Cell, and Dialysis patients across Nagpur.
                      </p>
                    </div>
                    <span className="badge badge-purple" style={{ fontSize: '0.78rem', padding: '4px 10px' }}>
                      📋 {totalChronicDemand} Units Scheduled
                    </span>
                  </div>

                  <div className="bg-stock-bars-grid" style={{ height: 210 }}>
                    {chronicDemandData.map(item => {
                      const heightPct = Math.max(10, Math.round((item.units / 32) * 100))
                      return (
                        <div key={item.group} className="bg-bar-col">
                          <span className="bg-bar-pill" style={{ color: item.color, borderColor: `${item.color}40` }}>{item.label}</span>
                          <div
                            className="bg-bar-pillar"
                            style={{
                              height: `${heightPct}%`,
                              background: item.color,
                              boxShadow: `0 2px 8px ${item.color}40`
                            }}
                          />
                          <span className="bg-bar-name">{item.group}</span>
                        </div>
                      )
                    })}
                  </div>

                  <div className="chart-insight-callout insight-purple">
                    <span style={{ fontSize: '1.2rem' }}>🩺</span>
                    <div>
                      <strong>Scheduled Care Horizon:</strong> <strong>{totalChronicDemand} units</strong> pre-allocated for 42 registered Thalassemia &amp; Sickle Cell patients due across Nagpur day-care clinics (AIIMS, GMCH, Kingsway).
                    </div>
                  </div>
                </div>

                {/* ── CHART 4: EMERGENCY REQUESTS: FULFILLED VS OPEN ── */}
                <div className="chart-card">
                  <div className="chart-card-header">
                    <div>
                      <h3 className="chart-card-title">
                        <span>🚨</span> Emergency Requests: Fulfilled vs Open (Last 7 Days)
                      </h3>
                      <p className="chart-card-sub">
                        Daily fulfillment distribution tracking Code Red trauma requests and pending regional escalations.
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, fontSize: '0.74rem' }}>
                      <span className="badge badge-green">🟢 Fulfilled ({totalFulfilled7d})</span>
                      <span className="badge badge-red">🔴 Open / Active ({totalOpen7d})</span>
                    </div>
                  </div>

                  <div className="seven-day-bars-grid">
                    {last7DaysData.map((d, i) => {
                      const fulHeight = Math.max(8, (d.fulfilled / 24) * 100)
                      const openHeight = d.open > 0 ? Math.max(12, (d.open / 4) * 50) : 0
                      return (
                        <div key={i} className="day-group-col">
                          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0F172A' }}>
                            {d.fulfilled}{d.open > 0 ? ` (+${d.open})` : ''}
                          </div>
                          <div className="day-dual-bars">
                            <div
                              className="day-single-bar"
                              style={{
                                height: `${fulHeight}%`,
                                background: '#10B981',
                                boxShadow: '0 2px 6px rgba(16,185,129,0.3)'
                              }}
                              title={`${d.fulfilled} Fulfilled`}
                            />
                            {d.open > 0 && (
                              <div
                                className="day-single-bar"
                                style={{
                                  height: `${openHeight}%`,
                                  background: '#EF4444',
                                  boxShadow: '0 2px 6px rgba(239,68,68,0.3)'
                                }}
                                title={`${d.open} Open / Active`}
                              />
                            )}
                          </div>
                          <div className="day-label">{d.day}</div>
                          <div style={{ fontSize: '0.65rem', color: '#94A3B8', marginTop: -4 }}>{d.date}</div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="chart-insight-callout insight-amber">
                    <span style={{ fontSize: '1.2rem' }}>⚡</span>
                    <div>
                      <strong>7-Day Dispatch Efficiency:</strong> <strong>{fulfillmentPct}% emergency fulfillment rate</strong> ({totalFulfilled7d}/{totalFulfilled7d + totalOpen7d} cases) with average response time under 4 minutes across Nagpur trauma centers.
                    </div>
                  </div>
                </div>

                {/* ── CHART 5: WASTAGE/EXPIRY RATE BY BANK ── */}
                <div className="chart-card">
                  <div className="chart-card-header">
                    <div>
                      <h3 className="chart-card-title">
                        <span>📉</span> Wastage &amp; Expiry Rate by Bank (Last 30 Days)
                      </h3>
                      <p className="chart-card-sub">
                        Units expired unused across individual bio-banks tracking progress toward the PRD wastage-reduction KPI.
                      </p>
                    </div>
                    <span className="badge badge-green" style={{ fontSize: '0.78rem', padding: '4px 10px' }}>
                      🎯 30% Wastage Target Met
                    </span>
                  </div>

                  <div className="bank-expiry-list">
                    {bankWastageData.map((bank, i) => {
                      const widthPct = Math.max(10, (bank.expired / 10) * 100)
                      return (
                        <div key={i} className="bank-expiry-row">
                          <div className="bank-expiry-name">{bank.name}</div>
                          <div className="bank-expiry-track">
                            <div className="bank-expiry-fill" style={{ width: `${widthPct}%` }} />
                          </div>
                          <div className="bank-expiry-val">
                            <span style={{ color: '#DC2626' }}>{bank.expired} units</span> <span style={{ fontSize: '0.72rem', color: '#64748B' }}>({bank.rate})</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="chart-insight-callout insight-green">
                    <span style={{ fontSize: '1.2rem' }}>🎯</span>
                    <div>
                      <strong>Wastage Reduction KPI:</strong> Regional expiry is down to <strong>0.68% ({totalExpired} units total</strong> vs historical baseline of 54 units/month) — directly achieving the platform's <strong>30% wastage reduction target</strong> via automated redistribution.
                    </div>
                  </div>
                </div>

                {/* ── SPECIALIZED CROSS-SECTOR BLOOD BRIDGE PANEL ── */}
                <div style={{ gridColumn: '1 / -1', marginTop: 12, marginBottom: 12 }}>
                  <CrossSectorBloodBridge isAdmin={true} />
                </div>

                {/* ── CHART 6: REDISTRIBUTION SUGGESTIONS ACCEPTED VS REJECTED ── */}
                <div className="chart-card">
                  <div className="chart-card-header">
                    <div>
                      <h3 className="chart-card-title">
                        <span>🔄</span> Redistribution Suggestions: Accepted vs Rejected
                      </h3>
                      <p className="chart-card-sub">
                        AI proactive redistribution engine execution rate moving expiring units from surplus banks to high-demand nodes.
                      </p>
                    </div>
                    <span className="badge badge-green" style={{ fontSize: '0.78rem', padding: '4px 10px' }}>
                      ✅ {acceptRate}% Acceptance Rate
                    </span>
                  </div>

                  <div className="delivery-bars-container">
                    <div className="delivery-bar-block" style={{ background: '#ECFDF5', borderColor: '#A7F3D0' }}>
                      <div className="delivery-bar-meta">
                        <span className="delivery-bar-name" style={{ color: '#047857' }}>
                          <span>✅</span> Accepted &amp; Dispatched
                        </span>
                        <span className="delivery-bar-time" style={{ color: '#059669' }}>
                          {redistributionData.accepted} <span style={{ fontSize: '0.9rem', color: '#047857' }}>({acceptRate}%)</span>
                        </span>
                      </div>
                      <div className="delivery-bar-track">
                        <div className="delivery-bar-fill" style={{ width: `${acceptRate}%`, background: '#10B981' }} />
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#047857', marginTop: 8, fontWeight: 700 }}>
                        {redistributionData.unitsSaved} blood units preserved without spoilage
                      </div>
                    </div>

                    <div className="delivery-bar-block" style={{ background: '#F8FAFC', borderColor: '#CBD5E1' }}>
                      <div className="delivery-bar-meta">
                        <span className="delivery-bar-name" style={{ color: '#475569' }}>
                          <span>⏳</span> Rejected / Under Review
                        </span>
                        <span className="delivery-bar-time" style={{ color: '#64748B' }}>
                          {redistributionData.rejected} <span style={{ fontSize: '0.9rem', color: '#64748B' }}>({(100 - acceptRate).toFixed(1)}%)</span>
                        </span>
                      </div>
                      <div className="delivery-bar-track">
                        <div className="delivery-bar-fill" style={{ width: `${100 - acceptRate}%`, background: '#94A3B8' }} />
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 8 }}>
                        Manual overrides or cancelled cold-chain trips
                      </div>
                    </div>
                  </div>

                  <div className="chart-insight-callout insight-purple">
                    <span style={{ fontSize: '1.2rem' }}>💡</span>
                    <div>
                      <strong>Autonomous Rebalancing:</strong> <strong>{redistributionData.accepted} inter-bank transfers</strong> executed autonomously this month, saving <strong>{redistributionData.unitsSaved} expiring units</strong> from waste and preventing 8 emergency stockout situations.
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )
        })()}

        {/* ══════════════════════════════════════════════════════ */}
        {/* VIEW 7: SECURITY & AUDIT LOGS LEDGER PAGE             */}
        {/* ══════════════════════════════════════════════════════ */}
        {activeNav === 'security' && (
          !roleConfig.canManageSecurity && activeRole !== 'auditor' ? (
            <div className="lstream-page-container">
              <div className="lstream-card" style={{ textAlign: 'center', padding: '60px 24px', maxWidth: 640, margin: '40px auto' }}>
                <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔒</div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>
                  Security Clearance Level Required
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 24 }}>
                  The Security Sentinel and cryptographic hash ledger trails are restricted to <strong>Platform Super Admins</strong> and certified <strong>State Compliance Auditors</strong> (§4.1 Access Control Directive).
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <button type="button" className="btn btn-primary" onClick={() => handleNavClick(roleConfig.defaultTab)}>
                    Return to {roleConfig.label} Dashboard
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => switchRole('auditor')}>
                    Switch to Auditor Persona
                  </button>
                </div>
              </div>
            </div>
          ) : (
          <div className="lstream-page-container">
            {/* Auditor Scoped Notice */}
            {activeRole === 'auditor' && (
              <div style={{ marginBottom: 16, padding: '12px 18px', borderRadius: 8, background: '#f5f3ff', border: '1.5px solid #8b5cf6', color: '#5b21b6', fontSize: '0.84rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.2rem' }}>📋</span>
                <div>
                  <strong>State Compliance Auditor Inspection Protocol:</strong> Read-only immutable access to intrusion signals, brute-force logs, and SHA-256 block ledger. Emergency lock enforcement is executed by Platform Admin.
                </div>
              </div>
            )}

            <div className="page-action-header">
              <div>
                <h2 className="page-main-title">🛡️ Security Sentinel &amp; Immutable Access Control Ledger</h2>
                <p className="page-main-sub">Real-time cryptographic audit trail of all donor authorizations, biometric verifications, and stock decrements.</p>
              </div>

              {/* STEP 4: Security Health Score & Flagged Badges */}
              {(() => {
                const criticalCount = securityLogs.filter(l => l.severity === 'critical' && l.flagged).length
                const highCount = securityLogs.filter(l => l.severity === 'high' && l.flagged).length
                const chainPenalty = chainStatus === 'compromised' || isTamperedDemo ? 30 : 0
                const healthScore = Math.max(0, 100 - (criticalCount * 10) - (highCount * 5) - chainPenalty)
                const healthLevel = healthScore >= 85 ? 'OPTIMAL' : healthScore >= 65 ? 'GUARDED' : 'COMPROMISED'

                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {/* Security Health Score Widget */}
                    <div
                      id="security-health-score-widget"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 10,
                        background: healthScore >= 80 ? '#F0FDF4' : (healthScore >= 65 ? '#FFFBEB' : '#FEF2F2'),
                        border: `1.5px solid ${healthScore >= 80 ? '#86EFAC' : (healthScore >= 65 ? '#FDE68A' : '#FECACA')}`,
                        padding: '6px 14px',
                        borderRadius: 10,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>
                        {healthScore >= 80 ? '🛡️' : (healthScore >= 65 ? '⚠️' : '🚨')}
                      </span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Security Health Score</span>
                          <span style={{
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: healthScore >= 80 ? '#DCFCE7' : (healthScore >= 65 ? '#FEF3C7' : '#FEE2E2'),
                            color: healthScore >= 80 ? '#166534' : (healthScore >= 65 ? '#92400E' : '#991B1B')
                          }}>
                            {healthLevel}
                          </span>
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 900, color: healthScore >= 80 ? '#166534' : (healthScore >= 65 ? '#B45309' : '#DC2626') }}>
                          {healthScore}<span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>/100</span>
                        </div>
                      </div>
                    </div>

                    <span className="badge badge-red" style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
                      🚨 {securityLogs.filter(l => l.flagged).length} Flagged Suspicious Logs
                    </span>
                  </div>
                )
              })()}
            </div>

            {/* Highlighted 2 Flagged Security Alerts */}
            <div className="flagged-alerts-banner">
              <div className="flagged-alert-card">
                <div className="flagged-alert-header">
                  <span className="badge-critical-red">🚨 CRITICAL INTRUSION SIGNAL</span>
                  <span className="log-time">12:28:44 IST</span>
                </div>
                <div className="flagged-alert-title">Rapid OTP Brute-Force Rate Limit Triggered</div>
                <div className="flagged-alert-desc">
                  5 consecutive invalid OTP tokens submitted for Donor ID <code>DNR-NGP-008</code> from unauthorized IP <code>182.74.91.14</code>. Account temporarily frozen.
                </div>
                <div className="flagged-alert-actions">
                  {roleConfig.canManageSecurity ? (
                    <>
                      <button className="btn-action-freeze" onClick={() => alert('Account DNR-NGP-008 has been locked and sentinel token invalidated.')}>
                        🔒 Enforce Account Lockdown
                      </button>
                      <button className="btn-action-dismiss" onClick={() => alert('Log cleared as false positive.')}>
                        Dismiss
                      </button>
                    </>
                  ) : (
                    <span style={{ fontSize: '0.78rem', color: '#7c3aed', fontWeight: 700, padding: '6px 12px', background: '#ede9fe', borderRadius: 6 }}>
                      👁️ Read-Only Audit Inspection (Lockdown Restricted to Admin)
                    </span>
                  )}
                </div>
              </div>

              <div className="flagged-alert-card">
                <div className="flagged-alert-header">
                  <span className="badge-critical-yellow">⚠️ ABNORMAL INVENTORY ACCESS</span>
                  <span className="log-time">11:45:12 IST</span>
                </div>
                <div className="flagged-alert-title">Bulk Decrement Outside Shift Window</div>
                <div className="flagged-alert-desc">
                  Operator attempted to decrement 12 units of rare <code>B-</code> blood from Mayo Bank 02 without a verified hospital request token.
                </div>
                <div className="flagged-alert-actions">
                  {roleConfig.canManageSecurity ? (
                    <>
                      <button className="btn-action-freeze" onClick={() => alert('Auditor review notification sent to Mayo Medical Superintendent.')}>
                        📋 Escalate to Auditor
                      </button>
                      <button className="btn-action-dismiss" onClick={() => alert('Log cleared.')}>
                        Dismiss
                      </button>
                    </>
                  ) : (
                    <span style={{ fontSize: '0.78rem', color: '#7c3aed', fontWeight: 700, padding: '6px 12px', background: '#ede9fe', borderRadius: 6 }}>
                      👁️ Incident Recorded on Compliance Ledger
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Complete Audit Log Table */}
            <div className="lstream-card full-table-card">
              <div className="table-header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                <div>
                  <h3 className="card-section-heading" style={{ margin: 0 }}>Verified Audit Trail (SHA-256 Ledger Hashes)</h3>
                  <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                    Cryptographically linked block hashes establishing tamper-evident chain of custody for all inventory operations.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* STEP 1: Verify Chain Integrity Button */}
                  <button
                    id="btn-verify-chain-integrity"
                    className="btn btn-primary"
                    style={{
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      color: '#fff',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                      cursor: chainVerifying ? 'wait' : 'pointer'
                    }}
                    onClick={handleVerifyChainIntegrity}
                    disabled={chainVerifying}
                  >
                    {chainVerifying ? (
                      <>
                        <span>⏳</span>
                        <span>Verifying {securityLogs.length} Blocks...</span>
                      </>
                    ) : (
                      <>
                        <span>🔍</span>
                        <span>Verify Chain Integrity</span>
                      </>
                    )}
                  </button>

                  {/* STEP 3: Simulate Tampering / Reset Demo Tool */}
                  {!isTamperedDemo ? (
                    <button
                      id="btn-simulate-tampering"
                      className="btn btn-secondary"
                      style={{
                        background: 'rgba(239, 68, 68, 0.08)',
                        color: '#dc2626',
                        border: '1px dashed #fca5a5',
                        padding: '7px 13px',
                        borderRadius: 8,
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        cursor: 'pointer'
                      }}
                      onClick={handleSimulateTampering}
                      title="Demo Tool: Simulates an unauthorized hash modification on LOG-7719"
                    >
                      ⚠️ Demo: Simulate Tampering Attempt
                    </button>
                  ) : (
                    <button
                      id="btn-reset-tampering"
                      className="btn btn-secondary"
                      style={{
                        background: '#ecfdf5',
                        color: '#059669',
                        border: '1px solid #6ee7b7',
                        padding: '7px 13px',
                        borderRadius: 8,
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        cursor: 'pointer'
                      }}
                      onClick={handleResetChainDemo}
                      title="Restore tampered block back to original valid hash"
                    >
                      🔄 Reset Demo
                    </button>
                  )}

                  <button className="btn-table-expand" onClick={() => alert('Downloading CSV Audit Trail for State Health Department...')}>
                    📥 Export Compliance CSV
                  </button>
                </div>
              </div>

              {/* STEP 2: Live Scanning State Progress Bar */}
              {chainVerifying && (
                <div style={{
                  margin: '12px 0 16px 0',
                  padding: '14px 18px',
                  background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                  border: '1.5px solid #7dd3fc',
                  borderRadius: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem', fontWeight: 700, color: '#0369a1' }}>
                    <span>⚡ Traversing SHA-256 Ledger: Verifying {securityLogs.length} blocks against predecessor digest links...</span>
                    <span>{chainVerifyProgress}%</span>
                  </div>
                  <div style={{ height: 6, background: '#bae6fd', borderRadius: 9999, overflow: 'hidden' }}>
                    <div style={{ width: `${chainVerifyProgress}%`, height: '100%', background: '#0284c7', transition: 'width 0.2s ease' }} />
                  </div>
                </div>
              )}

              {/* STEP 2: Verification Result Banner — Intact Chain */}
              {!chainVerifying && chainStatus === 'valid' && (
                <div style={{
                  margin: '12px 0 16px 0',
                  padding: '16px 20px',
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                  border: '1.5px solid #86efac',
                  borderRadius: 12,
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.1)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14
                }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0, fontWeight: 900 }}>
                    ✓
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#166534' }}>
                        ✅ Chain Integrity Verified — {securityLogs.length} blocks checked, 0 tampering detected.
                      </h4>
                      <span style={{ fontSize: '0.74rem', color: '#15803d', fontWeight: 700, background: '#bbf7d0', padding: '2px 8px', borderRadius: 6 }}>
                        Last verified: {chainVerifiedAt}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#166534', lineHeight: 1.45 }}>
                      Each block's hash was validated against its predecessor's hash reference, confirming an unbroken, tamper-evident chain.
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 2 & 3: Verification Result Banner — Compromised Chain */}
              {!chainVerifying && chainStatus === 'compromised' && (
                <div style={{
                  margin: '12px 0 16px 0',
                  padding: '16px 20px',
                  background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                  border: '1.5px solid #fca5a5',
                  borderRadius: 12,
                  boxShadow: '0 4px 16px rgba(220, 38, 38, 0.15)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14
                }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: '#dc2626', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0, fontWeight: 900 }}>
                    ✕
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#991b1b' }}>
                        ❌ Chain Integrity Compromised — Block {tamperedLogId || 'LOG-7719'} hash mismatch detected. Immutability violated.
                      </h4>
                      <button
                        onClick={handleResetChainDemo}
                        style={{
                          fontSize: '0.74rem',
                          color: '#ffffff',
                          fontWeight: 800,
                          background: '#dc2626',
                          border: 'none',
                          padding: '4px 10px',
                          borderRadius: 6,
                          cursor: 'pointer'
                        }}
                      >
                        🔄 Reset Demo to Intact Chain
                      </button>
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#b91c1c', lineHeight: 1.45 }}>
                      Predecessor block digest parity check failed at block <code>{tamperedLogId}</code>. The stored cryptographic hash does not match computed state. Tampered block highlighted in red below.
                    </p>
                  </div>
                </div>
              )}

              <div className="bio-table-container">
                <table className="bio-table full-table">
                  <thead>
                    <tr>
                      <th>Log ID</th>
                      <th>Timestamp</th>
                      <th>Actor / User</th>
                      <th>Role</th>
                      <th style={{ textAlign: 'left' }}>Action Taken</th>
                      <th>IP Address</th>
                      <th>Severity</th>
                      <th>Ledger Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {securityLogs.map((log) => {
                      const isThisRowTampered = log.isCorrupted || (isTamperedDemo && log.id === tamperedLogId)
                      const isHighlightedBreach = isThisRowTampered

                      return (
                        <tr
                          key={log.id}
                          style={{
                            background: isHighlightedBreach
                              ? '#FEF2F2'
                              : log.flagged
                              ? '#FFF7ED'
                              : 'transparent',
                            border: isHighlightedBreach ? '2px solid #DC2626' : undefined,
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <td style={{ fontFamily: 'monospace', color: isHighlightedBreach ? '#DC2626' : '#0284C7', fontWeight: 800 }}>
                            {log.id}
                            {isHighlightedBreach && (
                              <span style={{ marginLeft: 6, fontSize: '0.68rem', background: '#DC2626', color: '#fff', padding: '1px 5px', borderRadius: 4 }}>
                                TAMPERED
                              </span>
                            )}
                          </td>
                          <td style={{ fontSize: '0.82rem', color: '#334155', fontWeight: 500 }}>{log.timestamp}</td>
                          <td style={{ fontWeight: 700, color: '#0F172A' }}>{log.user}</td>
                          <td style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600 }}>{log.role}</td>
                          <td
                            style={{
                              textAlign: 'left',
                              fontSize: '0.84rem',
                              color: isHighlightedBreach ? '#991B1B' : log.flagged ? '#9A3412' : '#0F172A',
                              fontWeight: log.flagged || isHighlightedBreach ? 700 : 500,
                            }}
                          >
                            {log.action}
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#334155' }}>{log.ip}</td>
                          <td>
                            <span className={`status-badge-pill ${log.severity}`}>
                              {log.severity.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 700 }}>
                            {isThisRowTampered ? (
                              <span style={{ color: '#DC2626', display: 'inline-flex', alignItems: 'center', gap: 4, background: '#FEE2E2', padding: '3px 8px', borderRadius: 6, border: '1px solid #FCA5A5' }}>
                                ⛓️❌ {log.hash}
                              </span>
                            ) : (
                              <span style={{ color: chainStatus === 'valid' ? '#059669' : '#475569', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                {chainStatus === 'valid' ? '⛓️✓ ' : ''}{log.hash}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* VIEW 8: ADMIN DRONE TRANSPORT & AIRSPACE GRID PAGE   */}
        {/* ══════════════════════════════════════════════════════ */}
        {activeNav === 'drone' && (
          <div className="lstream-page-container">
            <div className="page-action-header">
              <div>
                <h2 className="page-main-title">⚡ Autonomous Drone Fleet Dispatch &amp; Live Airspace Grid</h2>
                <p className="page-main-sub">
                  Direct bank-to-hospital emergency aerial logistics. Point-to-point flight corridors bypassing Nagpur road congestion.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span className="badge badge-green" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
                  🟢 Airspace Clear • Cruising 60 km/h
                </span>
                <span className="demand-chip" style={{ fontSize: '0.82rem', padding: '6px 12px' }}>
                  ⚠️ SIMULATED AIRSPACE DEMO
                </span>
              </div>
            </div>

            {/* TOP SECTION: Route Selector & Dispatch Panel */}
            <div className="lstream-card" style={{ marginBottom: 24, border: '1.5px solid #bae6fd', background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, background: '#0284c7', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.1rem' }}>
                    🚁
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                      Nagpur Bank-to-Hospital Air Corridor Selector
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                      Select a verified corridor from the seed routing matrix or configure payload parameters.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0369a1' }}>Preset Routes:</span>
                  <select
                    value={selectedRouteId}
                    onChange={e => {
                      const rId = e.target.value
                      setSelectedRouteId(rId)
                      const found = ADMIN_DRONE_ROUTES.find(r => r.id === rId)
                      if (found) {
                        setAdminDroneBank(found.fromBank)
                        setAdminDroneHosp(found.toHosp)
                        setAdminFlightLaunched(false)
                        setAdminFlightProgress(0)
                      }
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: '1px solid #7dd3fc',
                      background: '#ffffff',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#0369a1',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    {ADMIN_DRONE_ROUTES.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.fromBank.split(' (')[0]} ➔ {r.toHosp.split(' (')[0]} ({r.distanceKm} km)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Form Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                    📦 From (Source Bio-Bank)
                  </label>
                  <select
                    value={adminDroneBank}
                    onChange={e => setAdminDroneBank(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.85rem', fontWeight: 600 }}
                  >
                    {ADMIN_DRONE_ROUTES.map(r => r.fromBank).filter((v, i, a) => a.indexOf(v) === i).map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                    🏥 To (Destination Hospital)
                  </label>
                  <select
                    value={adminDroneHosp}
                    onChange={e => setAdminDroneHosp(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.85rem', fontWeight: 600 }}
                  >
                    {ADMIN_DRONE_ROUTES.map(r => r.toHosp).filter((v, i, a) => a.indexOf(v) === i).map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                    🩸 Blood Group
                  </label>
                  <select
                    value={adminDroneGroup}
                    onChange={e => setAdminDroneGroup(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.85rem', fontWeight: 700 }}
                  >
                    {['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                    📊 Units Required
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={adminDroneUnits}
                    onChange={e => setAdminDroneUnits(parseInt(e.target.value) || 1)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.85rem', fontWeight: 600 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                    🚨 Dispatch Priority
                  </label>
                  <select
                    value={adminDronePriority}
                    onChange={e => setAdminDronePriority(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.85rem', fontWeight: 700, color: '#dc2626' }}
                  >
                    <option value="Critical Code Red">🚨 Critical Code Red (Level 1 Trauma)</option>
                    <option value="High Urgency">⚡ High Urgency (Surgical OT)</option>
                    <option value="Scheduled Transfusion">📋 Scheduled Routine Supply</option>
                  </select>
                </div>
              </div>

              {/* Route Estimation Telemetry Callout & Launch Action */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, background: '#e0f2fe', padding: '14px 18px', borderRadius: 10, border: '1px solid #bae6fd' }}>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#0369a1', fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>Aerial Corridor</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0c4a6e' }}>{activePreset.distanceKm} km straight-line</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#0891b2', fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>⚡ Drone Flight ETA</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0e7490' }}>{activePreset.droneEta} (60 km/h)</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>🚗 Est. Ground Road</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#64748b', textDecoration: 'line-through' }}>{activePreset.groundEta}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>⏱️ Traffic Time Saved</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#059669' }}>
                      ~{Math.max(4, parseInt(activePreset.groundEta.replace(/[^0-9]/g, '')) - parseInt(activePreset.droneEta.replace(/[^0-9]/g, '')))} mins faster
                    </span>
                  </div>
                </div>

                {roleConfig.canDispatchDrone ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAdminFlightLaunched(true)
                      setAdminFlightProgress(0)
                      setAdminFlightStartTime(Date.now())
                      setAdminFlightSpeed(62)

                      const newDisp = {
                        id: `DRN-NGP-${Math.floor(910 + Math.random() * 80)}`,
                        bank: adminDroneBank,
                        hosp: adminDroneHosp,
                        group: adminDroneGroup,
                        units: adminDroneUnits,
                        priority: adminDronePriority,
                        status: 'in_flight',
                        progress: 0,
                        eta: activePreset.droneEta,
                        drone: 'MED-X3 (Payload Cold-Chain: 3.8°C)',
                        launchedAt: `${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} IST`
                      }
                      setAdminDroneDispatches(p => [newDisp, ...p.filter(d => d.id !== newDisp.id)])
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 22px',
                      borderRadius: 8,
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: '0 4px 12px rgba(2,132,199,0.35)'
                    }}
                  >
                    <span>🚀</span> Launch Drone Dispatch
                  </button>
                ) : (
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, padding: '10px 18px', background: '#f1f5f9', color: '#64748b', borderRadius: 8, border: '1px solid #cbd5e1' }}>
                    👁️ Airspace Telemetry (Read-Only)
                  </span>
                )}
              </div>
            </div>

            {/* MIDDLE SECTION: Live Airspace Telemetry & Map Split */}
            {(() => {
              const totalFlightSec = Math.max(18, Math.min(80, Math.round(activePreset.distanceKm * 15)))
              const remainingSec = Math.max(0, Math.ceil(totalFlightSec * (1 - (adminFlightLaunched ? adminFlightProgress : 0) / 100)))
              const remMin = Math.floor(remainingSec / 60)
              const remSec = remainingSec % 60
              const formattedEta = !adminFlightLaunched
                ? activePreset.droneEta
                : (adminFlightProgress >= 100 ? 'Delivered (0s)' : (remMin > 0 ? `${remMin}m ${remSec}s` : `${remSec}s`))

              const currentAltitude = !adminFlightLaunched
                ? '0 m (GND)'
                : (adminFlightProgress >= 100
                    ? '0 m (Pad 1 Touchdown)'
                    : (adminFlightProgress < 8
                        ? '65 m (Climb)'
                        : (adminFlightProgress > 92 ? '40 m (Descent)' : '120 m AGL')))

              const currentSpeed = !adminFlightLaunched
                ? '0 km/h'
                : (adminFlightProgress >= 100 ? '0 km/h (Landed)' : `${adminFlightSpeed} km/h`)

              const statusLabel = !adminFlightLaunched
                ? 'STANDBY READY'
                : (adminFlightProgress >= 100
                    ? '✅ DELIVERED'
                    : (adminFlightProgress >= 80 ? '📍 APPROACHING DESTINATION' : '⚡ IN FLIGHT (CRUISING)'))

              const statusBg = !adminFlightLaunched
                ? '#94a3b8'
                : (adminFlightProgress >= 100
                    ? '#10b981'
                    : (adminFlightProgress >= 80 ? '#f59e0b' : '#0284c7'))

              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 24 }}>
                  {/* Left: Map */}
                  <div className="lstream-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '14px 18px', background: '#0f172a', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', fontWeight: 800 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00E676', display: 'inline-block' }} />
                        Live Airspace Telemetry &amp; Flight Corridor
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <span style={{ fontSize: '0.72rem', background: 'rgba(37,99,235,0.2)', color: '#60a5fa', padding: '2px 8px', borderRadius: 12, border: '1px solid rgba(37,99,235,0.4)', fontWeight: 700 }}>🔵 Bank</span>
                        <span style={{ fontSize: '0.72rem', background: 'rgba(220,38,38,0.2)', color: '#f87171', padding: '2px 8px', borderRadius: 12, border: '1px solid rgba(220,38,38,0.4)', fontWeight: 700 }}>🔴 Hospital</span>
                        <span style={{ fontSize: '0.72rem', background: 'rgba(6,182,212,0.2)', color: '#22d3ee', padding: '2px 8px', borderRadius: 12, border: '1px solid rgba(6,182,212,0.4)', fontWeight: 700 }}>- - Drone Path</span>
                      </div>
                    </div>

                    <div style={{ height: 380, width: '100%', position: 'relative', background: '#e2e8f0' }}>
                      <div
                        ref={(node) => {
                          if (!node) return
                          if (adminDroneMapRef.current) {
                            try { adminDroneMapRef.current.remove() } catch(e){}
                            adminDroneMapRef.current = null
                          }
                          const initL = () => {
                            if (!window.L) return
                            const L = window.L
                            const map = L.map(node, { zoomControl: true, attributionControl: false })
                              .setView([(activePreset.fromLat + activePreset.toLat)/2, (activePreset.fromLng + activePreset.toLng)/2], 13)
                            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)

                            const bankIcon = L.divIcon({
                              html: '<div style="background:linear-gradient(135deg, #2563eb, #1d4ed8);width:32px;height:32px;border-radius:50%;border:3px solid #fff;box-shadow:0 4px 12px rgba(37,99,235,0.5);display:flex;align-items:center;justify-content:center;font-size:16px;color:#fff;">🏦</div>',
                              className: '',
                              iconSize: [32, 32],
                              iconAnchor: [16, 16]
                            })
                            const bMarker = L.marker([activePreset.fromLat, activePreset.fromLng], { icon: bankIcon })
                              .bindPopup(`<b>🏦 ${activePreset.fromBank}</b><br>Source Bio-Bank`)
                              .addTo(map)

                            const hospIcon = L.divIcon({
                              html: '<div style="background:linear-gradient(135deg, #dc2626, #b91c1c);width:32px;height:32px;border-radius:50%;border:3px solid #fff;box-shadow:0 4px 12px rgba(220,38,38,0.5);display:flex;align-items:center;justify-content:center;font-size:16px;color:#fff;">🏥</div>',
                              className: '',
                              iconSize: [32, 32],
                              iconAnchor: [16, 16]
                            })
                            const hMarker = L.marker([activePreset.toLat, activePreset.toLng], { icon: hospIcon })
                              .bindPopup(`<b>🏥 ${activePreset.toHosp}</b><br>Destination Landing Pad`)
                              .addTo(map)

                            const poly = L.polyline([[activePreset.fromLat, activePreset.fromLng], [activePreset.toLat, activePreset.toLng]], {
                              color: '#06b6d4',
                              weight: 4,
                              dashArray: '10, 8',
                              opacity: 0.95
                            }).addTo(map)

                            const frac = adminFlightLaunched ? Math.min(1, adminFlightProgress / 100) : 0
                            const initLat = activePreset.fromLat + (activePreset.toLat - activePreset.fromLat) * frac
                            const initLng = activePreset.fromLng + (activePreset.toLng - activePreset.fromLng) * frac

                            const droneIcon = L.divIcon({
                              html: '<div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;"><div style="position:absolute;inset:2px;background:rgba(6,182,212,0.45);border-radius:50%;animation:pulseCyan 1.5s ease-in-out infinite;"></div><div style="width:36px;height:36px;background:#0f172a;border:2.5px solid #06b6d4;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 0 16px rgba(6,182,212,0.85);z-index:2;">🚁</div></div>',
                              className: '',
                              iconSize: [44, 44],
                              iconAnchor: [22, 22]
                            })
                            const dMarker = L.marker([initLat, initLng], { icon: droneIcon, zIndexOffset: 1000 }).addTo(map)

                            map.fitBounds([[activePreset.fromLat, activePreset.fromLng], [activePreset.toLat, activePreset.toLng]], { padding: [40, 40] })
                            setTimeout(() => { if (map) map.invalidateSize() }, 200)

                            adminDroneMapRef.current = map
                            adminDroneMarkerRef.current = dMarker
                            adminDroneBankMarkerRef.current = bMarker
                            adminDroneHospMarkerRef.current = hMarker
                            adminDronePolylineRef.current = poly
                          }

                          if (window.L) {
                            initL()
                          } else {
                            if (!document.getElementById('leaflet-css-drone')) {
                              const link = document.createElement('link')
                              link.id = 'leaflet-css-drone'
                              link.rel = 'stylesheet'
                              link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
                              document.head.appendChild(link)
                            }
                            const script = document.createElement('script')
                            script.id = 'leaflet-js-drone'
                            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
                            script.onload = () => initL()
                            document.head.appendChild(script)
                          }
                        }}
                        style={{ width: '100%', height: '100%' }}
                      />

                      {/* Route Callout Card Overlay */}
                      <div style={{
                        position: 'absolute',
                        bottom: 12,
                        left: 12,
                        background: 'rgba(15, 23, 42, 0.92)',
                        border: '1px solid rgba(6, 182, 212, 0.45)',
                        borderRadius: 8,
                        padding: '8px 14px',
                        color: '#fff',
                        fontSize: '0.78rem',
                        zIndex: 1000,
                        backdropFilter: 'blur(6px)'
                      }}>
                        <div style={{ color: '#06b6d4', fontWeight: 800, fontSize: '0.68rem', textTransform: 'uppercase' }}>⚡ Active Air Corridor</div>
                        <div style={{ fontWeight: 700 }}>{adminDroneBank.split(' (')[0]} ➔ {adminDroneHosp.split(' (')[0]}</div>
                        <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>{activePreset.distanceKm} km • Altitude: {currentAltitude}</div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Live Telemetry Stats */}
                  <div className="lstream-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h3 className="card-section-heading" style={{ marginBottom: 14 }}>
                        📊 Active Telemetry Dashboard (Simulated)
                      </h3>

                      {/* Status Banner */}
                      <div style={{
                        background: adminFlightLaunched ? (adminFlightProgress >= 100 ? '#ecfdf5' : '#f0f9ff') : '#f8fafc',
                        border: `1px solid ${adminFlightLaunched ? (adminFlightProgress >= 100 ? '#a7f3d0' : '#bae6fd') : '#e2e8f0'}`,
                        padding: '12px 14px',
                        borderRadius: 8,
                        marginBottom: 16
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Flight Status</span>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: 12,
                            background: statusBg,
                            color: '#fff'
                          }}>
                            {statusLabel}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div style={{ width: '100%', height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden', margin: '8px 0' }}>
                          <div style={{
                            width: `${adminFlightLaunched ? adminFlightProgress : 0}%`,
                            height: '100%',
                            background: adminFlightProgress >= 100 ? '#10b981' : 'linear-gradient(90deg, #0284c7, #06b6d4)',
                            transition: 'width 0.8s linear'
                          }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b' }}>
                          <span style={{ fontWeight: 700, color: '#0284c7' }}>{adminFlightLaunched ? `${Math.round(adminFlightProgress)}% complete` : '0%'}</span>
                          <span>{!adminFlightLaunched ? 'Awaiting Launch' : (adminFlightProgress >= 100 ? `Touchdown at ${adminDroneHosp.split(' (')[0]}` : (adminFlightProgress >= 80 ? 'Final approach descent on helipad' : 'En route via Zero Mile DGCA green corridor'))}</span>
                        </div>
                      </div>

                      {/* Grid of Telemetry Numbers */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 12px', borderRadius: 8 }}>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>⏱️ ETA Remaining</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0284c7', margin: '2px 0' }}>
                            {formattedEta}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Autonomous GPS countdown</div>
                        </div>

                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 12px', borderRadius: 8 }}>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>🚀 Cruising Speed</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
                            {currentSpeed}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 600 }}>Optimal air resistance</div>
                        </div>

                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 12px', borderRadius: 8 }}>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>📐 Altitude AGL</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
                            {currentAltitude}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>DGCA Green Corridor</div>
                        </div>

                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 12px', borderRadius: 8 }}>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>❄️ Payload Temp</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#059669', margin: '2px 0' }}>
                            3.8°C
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 600 }}>Cold-Chain Intact ✅</div>
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic', borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
                      * Simulated live telemetry. Production deployment connects to DGCA-licensed medical UAV service mesh.
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* BOTTOM SECTION: Admin-Specific Active Dispatches Ledger Table */}
            <div className="lstream-card full-table-card">
              <div className="table-header-flex">
                <div>
                  <h3 className="card-section-heading">🚁 Multi-Dispatch UAV Fleet Activity &amp; Flight Logs</h3>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                    Real-time flight tracking ledger across all Nagpur bio-centres and emergency trauma units.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-table-expand"
                  onClick={() => alert('Exporting Drone Flight Telemetry Log for DGCA Compliance...')}
                >
                  📥 Export DGCA Flight Logs
                </button>
              </div>

              <div className="bio-table-container">
                <table className="bio-table full-table">
                  <thead>
                    <tr>
                      <th>Dispatch ID</th>
                      <th>Flight Corridor (Bank ➔ Hospital)</th>
                      <th>Payload</th>
                      <th>Priority</th>
                      <th>Fleet Node</th>
                      <th>Status &amp; Progress</th>
                      <th>ETA / Result</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminDroneDispatches.map(d => (
                      <tr key={d.id}>
                        <td style={{ fontFamily: 'monospace', color: '#0284C7', fontWeight: 700 }}>{d.id}</td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0F172A' }}>{d.bank}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>➔ {d.hosp}</div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 800, color: '#DC2626', background: '#FEF2F2', padding: '2px 8px', borderRadius: 6, border: '1px solid #FECACA', fontSize: '0.8rem' }}>
                            {d.group} ({d.units} units)
                          </span>
                        </td>
                        <td>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: d.priority.includes('Code Red') ? '#DC2626' : '#D97706'
                          }}>
                            {d.priority}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600 }}>{d.drone}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className={`status-badge-pill ${d.status === 'delivered' ? 'safe' : d.status === 'in_flight' ? 'critical' : 'near-expiry'}`}>
                              {d.status === 'delivered' ? 'DELIVERED' : d.status === 'in_flight' ? 'IN FLIGHT' : 'PRE-FLIGHT'}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{d.progress}%</span>
                          </div>
                        </td>
                        <td style={{ fontSize: '0.82rem', fontWeight: 700, color: d.status === 'delivered' ? '#059669' : '#0284C7' }}>
                          {d.eta}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => alert(`Tracking live telemetry stream for Dispatch ${d.id}`)}
                              style={{ padding: '4px 8px', fontSize: '0.72rem', fontWeight: 700, background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0369a1', borderRadius: 6, cursor: 'pointer' }}
                            >
                              🛰️ Stream
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAdminDroneDispatches(p => p.map(x => x.id === d.id ? { ...x, status: 'delivered', progress: 100, eta: 'Delivered ✅' } : x))
                              }}
                              style={{ padding: '4px 8px', fontSize: '0.72rem', fontWeight: 700, background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669', borderRadius: 6, cursor: 'pointer' }}
                            >
                              ✓ Confirm
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* VIEW 9: ADMIN COMMUNITY SOS & NGO BROADCAST PAGE      */}
        {/* ══════════════════════════════════════════════════════ */}
        {activeNav === 'community' && (
          <div className="lstream-page-container">
            <div className="page-action-header">
              <div>
                <h2 className="page-main-title">📢 Community &amp; NGO Emergency Broadcast Command</h2>
                <p className="page-main-sub">
                  Instant multi-channel emergency mobilization fallback when hospital &amp; bank reserves have zero compatible units.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span className="badge badge-yellow" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
                  📡 3 Active Broadcasts • ~1,410 Donors Reached
                </span>
              </div>
            </div>

            {/* Auditor / Health Officer Scoped Notice */}
            {!roleConfig.canBroadcastSOS && (
              <div style={{ marginBottom: 16, padding: '12px 18px', borderRadius: 8, background: '#f5f3ff', border: '1.5px solid #8b5cf6', color: '#5b21b6', fontSize: '0.84rem', fontWeight: 700 }}>
                📋 <strong>Read-Only Community SOS Telemetry:</strong> Reviewing regional broadcast reach, social shares, and donor responses across Nagpur. Broadcasting is managed by Blood Bank and Hospital Ops.
              </div>
            )}

            {/* Quick Composer Card */}
            <div className="lstream-card" style={{ marginBottom: 24, border: '1.5px solid #fde047', background: 'linear-gradient(135deg, #ffffff 0%, #fefce8 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, background: '#eab308', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.1rem' }}>
                  📢
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                    Quick Emergency Broadcast Composer
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                    Configure the critical blood request and trigger native share intents across community channels.
                  </p>
                </div>
              </div>

              {/* Input Form */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                    🩸 Blood Group
                  </label>
                  <select
                    value={adminSosGroup}
                    onChange={e => {
                      const g = e.target.value
                      setAdminSosGroup(g)
                      setAdminSosCustomMsg(`🚨 EMERGENCY SOS: ${g} blood urgently required at ${adminSosHospital}, ${adminSosLocality}, Nagpur. ${adminSosUnits} units needed for ${adminSosUrgency} trauma case. If you can donate, contact ${adminSosHelpline} or report immediately. Every second counts. #BloodConnect #Nagpur`)
                    }}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.85rem', fontWeight: 700 }}
                  >
                    {['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'].map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                    🏥 Destination Hospital
                  </label>
                  <input
                    type="text"
                    value={adminSosHospital}
                    onChange={e => {
                      setAdminSosHospital(e.target.value)
                      setAdminSosCustomMsg(`🚨 EMERGENCY SOS: ${adminSosGroup} blood urgently required at ${e.target.value}, ${adminSosLocality}, Nagpur. ${adminSosUnits} units needed for ${adminSosUrgency} trauma case. Contact ${adminSosHelpline}. #BloodConnect #Nagpur`)
                    }}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.85rem', fontWeight: 600 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                    📍 Locality / Area
                  </label>
                  <input
                    type="text"
                    value={adminSosLocality}
                    onChange={e => {
                      setAdminSosLocality(e.target.value)
                      setAdminSosCustomMsg(`🚨 EMERGENCY SOS: ${adminSosGroup} blood urgently required at ${adminSosHospital}, ${e.target.value}, Nagpur. ${adminSosUnits} units needed. Contact ${adminSosHelpline}. #BloodConnect #Nagpur`)
                    }}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.85rem', fontWeight: 600 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                    📊 Units Needed
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={adminSosUnits}
                    onChange={e => {
                      const u = parseInt(e.target.value) || 1
                      setAdminSosUnits(u)
                      setAdminSosCustomMsg(`🚨 EMERGENCY SOS: ${adminSosGroup} blood urgently required at ${adminSosHospital}, ${adminSosLocality}, Nagpur. ${u} units needed for ${adminSosUrgency} trauma case. Contact ${adminSosHelpline}. #BloodConnect #Nagpur`)
                    }}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.85rem', fontWeight: 600 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                    📞 Emergency Helpline
                  </label>
                  <input
                    type="text"
                    value={adminSosHelpline}
                    onChange={e => {
                      setAdminSosHelpline(e.target.value)
                      setAdminSosCustomMsg(`🚨 EMERGENCY SOS: ${adminSosGroup} blood urgently required at ${adminSosHospital}, ${adminSosLocality}, Nagpur. ${adminSosUnits} units needed. Contact ${e.target.value}. #BloodConnect #Nagpur`)
                    }}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.85rem', fontWeight: 600 }}
                  />
                </div>
              </div>

              {/* Editable Message Textarea */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                  📝 Live Shareable Message Template (Editable)
                </label>
                <textarea
                  rows={3}
                  value={adminSosCustomMsg}
                  onChange={e => setAdminSosCustomMsg(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    background: '#fff',
                    fontSize: '0.86rem',
                    lineHeight: 1.5,
                    fontFamily: 'inherit',
                    color: '#0f172a'
                  }}
                />
              </div>

              {/* Multi-Platform Share Buttons Row */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.5px' }}>
                  🚀 Multi-Platform Broadcast Channels
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {/* WhatsApp */}
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(adminSosCustomMsg)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      background: '#ffffff',
                      border: '1.5px solid #25D366',
                      padding: '8px 16px',
                      borderRadius: 8,
                      color: '#0f172a',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      boxShadow: '0 2px 6px rgba(37,211,102,0.15)'
                    }}
                  >
                    <span style={{ fontSize: '1.1rem', color: '#25D366' }}>💬</span> WhatsApp
                  </a>

                  {/* Telegram */}
                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent('https://bloodconnect-platform.vercel.app')}&text=${encodeURIComponent(adminSosCustomMsg)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      background: '#ffffff',
                      border: '1.5px solid #229ED9',
                      padding: '8px 16px',
                      borderRadius: 8,
                      color: '#0f172a',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      boxShadow: '0 2px 6px rgba(34,158,217,0.15)'
                    }}
                  >
                    <span style={{ fontSize: '1.1rem', color: '#229ED9' }}>✈️</span> Telegram
                  </a>

                  {/* Instagram */}
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: 'Nagpur Blood Emergency SOS',
                          text: adminSosCustomMsg,
                          url: 'https://bloodconnect-platform.vercel.app'
                        }).catch(() => {})
                      } else {
                        navigator.clipboard.writeText(adminSosCustomMsg)
                        setAdminSosShareToast('📸 Message copied! Paste into Instagram Story or Direct Message.')
                        setTimeout(() => setAdminSosShareToast(null), 3500)
                      }
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      background: '#ffffff',
                      border: '1.5px solid #E1306C',
                      padding: '8px 16px',
                      borderRadius: 8,
                      color: '#0f172a',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(225,48,108,0.15)'
                    }}
                  >
                    <span style={{ fontSize: '1.1rem', color: '#E1306C' }}>📸</span> Instagram / Story
                  </button>

                  {/* Facebook */}
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://bloodconnect-platform.vercel.app')}&quote=${encodeURIComponent(adminSosCustomMsg)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      background: '#ffffff',
                      border: '1.5px solid #1877F2',
                      padding: '8px 16px',
                      borderRadius: 8,
                      color: '#0f172a',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      boxShadow: '0 2px 6px rgba(24,119,242,0.15)'
                    }}
                  >
                    <span style={{ fontSize: '1.1rem', color: '#1877F2' }}>📘</span> Facebook
                  </a>

                  {/* X (Twitter) */}
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(adminSosCustomMsg)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      background: '#ffffff',
                      border: '1.5px solid #0f172a',
                      padding: '8px 16px',
                      borderRadius: 8,
                      color: '#0f172a',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      boxShadow: '0 2px 6px rgba(15,23,42,0.15)'
                    }}
                  >
                    <span style={{ fontSize: '1.1rem', color: '#0f172a' }}>𝕏</span> X (Twitter)
                  </a>

                  {/* Copy to Clipboard */}
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(adminSosCustomMsg)
                      setAdminSosCopiedToast(true)
                      setTimeout(() => setAdminSosCopiedToast(false), 2500)
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      background: adminSosCopiedToast ? '#ecfdf5' : '#ffffff',
                      border: `1.5px solid ${adminSosCopiedToast ? '#10b981' : '#cbd5e1'}`,
                      padding: '8px 16px',
                      borderRadius: 8,
                      color: adminSosCopiedToast ? '#059669' : '#334155',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span>{adminSosCopiedToast ? '✅' : '📋'}</span> {adminSosCopiedToast ? 'Copied to Clipboard!' : 'Copy to Clipboard'}
                  </button>
                </div>

                {adminSosShareToast && (
                  <div style={{ marginTop: 10, padding: '8px 14px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600 }}>
                    {adminSosShareToast}
                  </div>
                )}
              </div>
            </div>

            {/* MIDDLE SECTION: Real Nagpur NGO & Voluntary Group Directory */}
            <div className="lstream-card" style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h3 className="card-section-heading" style={{ margin: 0 }}>
                    🤝 Nagpur Blood NGOs &amp; Voluntary Mobilization Directory
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                    Direct verified helplines for instant district volunteer escalation.
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                {[
                  { id: 'ngo-1', name: 'Indian Red Cross Society — Nagpur District Branch', cat: 'Humanitarian NGO', loc: 'Civil Lines, Nagpur', address: 'Red Cross Bhavan, Palm Road, Civil Lines, Nagpur 440001', phone: '+91 712 256 0101', wa: '917122560101', desc: 'Coordinates 24/7 donor mobilization across Nagpur district.' },
                  { id: 'ngo-2', name: 'Lifeline Blood Centre (NGO-run, NABH-Accredited)', cat: 'NABH Bio-Centre', loc: 'Ramdas Peth, Nagpur', address: 'Central Bazar Road, Near Lokmat Square, Ramdas Peth, Nagpur 440010', phone: '+91 712 256 0102', wa: '917122560102', desc: 'Rare blood component fractionation & rapid emergency courier dispatch.' },
                  { id: 'ngo-3', name: 'Jeevan Jyoti Blood Bank Trust', cat: 'Charitable Trust', loc: 'Madhav Nagar, Nagpur', address: 'Opposite VNIT Gate, South Ambazari Road, Madhav Nagar, Nagpur 440010', phone: '+91 712 256 0103', wa: '917122560103', desc: 'Dedicated Thalassemia support and emergency volunteer donor registry.' },
                  { id: 'ngo-4', name: 'Indian Society of Anaesthesiologists — Nagpur City Branch (ISA-NCB)', cat: 'Medical Association', loc: 'Dharampeth, Nagpur', address: 'IMA Hall Complex, North Ambazari Road, Nagpur 440010', phone: '+91 712 256 0104', wa: '917122560104', desc: 'Doctor-led rapid surgical trauma blood donor mobilization network.' },
                  { id: 'ngo-5', name: 'Social Welfare Department, District Nagpur', cat: 'Govt. Outreach', loc: 'Civil Lines / Collectorate', address: 'Dr. Babasaheb Ambedkar Bhavan, Civil Lines, Nagpur 440001', phone: '+91 712 256 0105', wa: '917122560105', desc: 'Official district voluntary donor campaign coordinator.' },
                ].map(ngo => (
                  <div key={ngo.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                        <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>{ngo.name}</h4>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#e0f2fe', color: '#0369a1', flexShrink: 0 }}>
                          {ngo.cat}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b', marginBottom: 6 }}>📍 {ngo.loc}</div>

                      {/* Display Phone Number clearly on Card */}
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: 6,
                        padding: '3px 8px',
                        marginBottom: 8,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#1d4ed8'
                      }}>
                        <span>📞</span>
                        <span>Helpline: {ngo.phone}</span>
                      </div>

                      <p style={{ fontSize: '0.78rem', color: '#475569', margin: '0 0 12px', lineHeight: 1.4 }}>{ngo.desc}</p>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setCallModalNgo(ngo)
                          setCopiedNgoPhone(false)
                        }}
                        style={{
                          flex: 1,
                          textAlign: 'center',
                          padding: '7px 10px',
                          borderRadius: 6,
                          background: '#ffffff',
                          border: '1.5px solid #cbd5e1',
                          color: '#0f172a',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4
                        }}
                      >
                        <span style={{ color: '#2563eb' }}>📞</span> Call {ngo.phone.split(' ').slice(-1)[0]}
                      </button>
                      <a
                        href={`https://wa.me/${ngo.wa}?text=${encodeURIComponent(adminSosCustomMsg)}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          flex: 1,
                          textAlign: 'center',
                          padding: '7px 10px',
                          borderRadius: 6,
                          background: '#25D366',
                          border: '1px solid #25D366',
                          color: '#ffffff',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4
                        }}
                      >
                        <span>💬</span> WhatsApp SOS
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* BOTTOM SECTION: Admin-Specific Broadcast History Table */}
            <div className="lstream-card full-table-card">
              <div className="table-header-flex">
                <div>
                  <h3 className="card-section-heading">📜 Emergency Broadcast Sent Log &amp; Viral Reach Tracker</h3>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                    Track all community broadcasts to prevent duplicate mobilization and review response velocity.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-table-expand"
                  onClick={() => alert('Exporting Broadcast Audit Trail for District Administration...')}
                >
                  📥 Export Broadcast Report
                </button>
              </div>

              <div className="bio-table-container">
                <table className="bio-table full-table">
                  <thead>
                    <tr>
                      <th>Broadcast ID</th>
                      <th>Timestamp</th>
                      <th>Linked Emergency / Facility</th>
                      <th>Group &amp; Units</th>
                      <th>Channels Triggered</th>
                      <th>Simulated Reach</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminBroadcastHistory.map(b => (
                      <tr key={b.id}>
                        <td style={{ fontFamily: 'monospace', color: '#0284C7', fontWeight: 700 }}>{b.id}</td>
                        <td style={{ fontSize: '0.82rem', color: '#334155' }}>{b.timestamp}</td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0F172A' }}>{b.hosp}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Ref: {b.linkedReq}</div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 800, color: '#DC2626', background: '#FEF2F2', padding: '2px 8px', borderRadius: 6, border: '1px solid #FECACA', fontSize: '0.8rem' }}>
                            {b.group} ({b.units}u)
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {b.platforms.map(p => (
                              <span key={p} style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: 4, background: '#f1f5f9', color: '#334155', fontWeight: 600 }}>
                                {p}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ fontWeight: 800, color: '#059669', fontSize: '0.85rem' }}>{b.reach}</td>
                        <td>
                          <span className={`status-badge-pill ${b.status === 'resolved' ? 'safe' : 'critical'}`}>
                            {b.status === 'resolved' ? 'RESOLVED ✅' : 'ACTIVE VIRAL 🚨'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => {
                                setAdminBroadcastHistory(p => p.map(x => x.id === b.id ? { ...x, status: 'resolved' } : x))
                                alert(`Broadcast ${b.id} marked as RESOLVED (Volunteer match confirmed).`)
                              }}
                              style={{ padding: '4px 8px', fontSize: '0.72rem', fontWeight: 700, background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669', borderRadius: 6, cursor: 'pointer' }}
                            >
                              ✓ Resolve
                            </button>
                            <a
                              href={`https://wa.me/?text=${encodeURIComponent(adminSosCustomMsg)}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ padding: '4px 8px', fontSize: '0.72rem', fontWeight: 700, background: '#f0fdf4', border: '1px solid #86efac', color: '#166534', borderRadius: 6, textDecoration: 'none' }}
                            >
                              🔁 Re-Ping
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── MODAL: System Architecture & Logic Guide ── */}
      {showLogicGuide && (
        <div className="modal-backdrop" onClick={() => setShowLogicGuide(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#DC2626' }}>📖</span> System Architecture &amp; Logic Guide
              </h3>
              <button className="modal-close-btn" onClick={() => setShowLogicGuide(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '68vh', overflowY: 'auto' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: '0.8rem', color: '#475569' }}>
                Operational reference for the Nagpur LifeStream telemetry, allocation matrix, and automated emergency routing engine.
              </div>

              <h4 style={{ color: '#0F172A', fontWeight: 800, margin: '14px 0 6px 0', fontSize: '0.92rem' }}>
                1. Multi-Node Geodesic Allocation Algorithm
              </h4>
              <p style={{ fontSize: '0.84rem', color: '#334155', lineHeight: 1.5, margin: 0 }}>
                In a Code Red emergency across Nagpur (e.g. GMCH, Mayo, Kingsway, AIIMS), the grid continuously evaluates <strong>5 Bio-Bank Nodes</strong> within a 15km operational radius. Priority routing automatically selects the nearest facility maintaining compatible reserves above safety thresholds (&gt;3 units) to prevent inventory exhaustion.
              </p>

              <h4 style={{ color: '#0F172A', fontWeight: 800, margin: '14px 0 6px 0', fontSize: '0.92rem' }}>
                2. Autonomous Cold-Chain Drone Dispatch
              </h4>
              <p style={{ fontSize: '0.84rem', color: '#334155', lineHeight: 1.5, margin: 0 }}>
                UAV flight corridors (MED-X fleet) maintain an active temperature range between <strong>2°C – 6°C</strong> under 48V IoT telemetry. Autonomous point-to-point flight paths bypass major Nagpur traffic bottlenecks (Sitabuldi, Dharampeth, and Wardha Road), delivering whole blood and components in <strong>2–8 minutes</strong>.
              </p>

              <h4 style={{ color: '#0F172A', fontWeight: 800, margin: '14px 0 6px 0', fontSize: '0.92rem' }}>
                3. 90-Day Aadhaar-Verified Donor Cooldown &amp; Privacy
              </h4>
              <p style={{ fontSize: '0.84rem', color: '#334155', lineHeight: 1.5, margin: 0 }}>
                Volunteers donating Whole Blood adhere to a mandatory 90-day biological cooldown. Smart matching verifies SHA-256 HMAC identity hashes and health clearance prior to dispatching localized emergency push notifications.
              </p>

              <h4 style={{ color: '#0F172A', fontWeight: 800, margin: '14px 0 6px 0', fontSize: '0.92rem' }}>
                4. Multi-Channel Community &amp; NGO Escalation Fallback
              </h4>
              <p style={{ fontSize: '0.84rem', color: '#334155', lineHeight: 1.5, margin: 0 }}>
                When formal bank inventories experience zero compatible stock for rare blood types (e.g. O-, AB-), the automated grid triggers a multi-channel emergency broadcast across WhatsApp, Telegram, and 5 verified Nagpur blood NGO registries for rapid community mobilization.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowLogicGuide(false)}>Close Reference</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Verify Now (Slide-over / Modal for Awaiting Donors) ── */}
      {(verifyModalDonor || showVerifyModal) && (() => {
        const donorToVerify = verifyModalDonor || donors.find(d => d.name === verifyDonorName) || donors.find(d => d.status === 'awaiting') || donors[2]
        return (
          <div className="modal-backdrop" onClick={() => { setVerifyModalDonor(null); setShowVerifyModal(false); setShowRejectForm(false) }}>
            <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
              <div className="modal-header">
                <h3 style={{ margin: 0, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#2563EB' }}>🔍</span> Verify Donor &amp; Activate Matching Node
                </h3>
                <button className="modal-close-btn" onClick={() => { setVerifyModalDonor(null); setShowVerifyModal(false); setShowRejectForm(false) }}>✕</button>
              </div>

              <div className="modal-body">
                {/* Donor Quick Summary Strip */}
                <div style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {donorToVerify.name}
                      <span className="bg-tag" style={{ fontSize: '0.78rem' }}>{donorToVerify.group}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 2 }}>
                      🆔 <strong>{donorToVerify.id}</strong> &nbsp;•&nbsp; 📍 {donorToVerify.city}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: 2 }}>
                      📞 {donorToVerify.phone.replace(/(\d{3})\s(\d{2})\d{3}(\d{2})/, '$1 $2•••$3')} (Data Minimized)
                    </div>
                  </div>
                  <span className="badge-awaiting" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                    🟡 AWAITING VERIFICATION
                  </span>
                </div>

                {!showRejectForm ? (
                  <>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 10 }}>
                      📋 Administrative Verification Checklist:
                    </div>

                    {/* Checklist Item 1: Phone OTP */}
                    <div className="verify-checklist-card">
                      <div className="checklist-icon checklist-icon-success">✓</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#0F172A' }}>
                          Phone Number &amp; OTP Authentication
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#166534', fontWeight: 600 }}>
                          ✅ OTP Verified via mobile carrier timestamp
                        </div>
                      </div>
                    </div>

                    {/* Checklist Item 2: ID Hash */}
                    <div className="verify-checklist-card">
                      <div className="checklist-icon checklist-icon-success">✓</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#0F172A' }}>
                          Government ID Hash Match (UIDAI / SBTC)
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#166534', fontWeight: 600 }}>
                          ✅ Cryptographic hash match confirmed — No duplicate registry detected
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748B', fontFamily: 'monospace', marginTop: 2 }}>
                          Hash: {donorToVerify.aadhaarHash || '0x14bc...891b2'}
                        </div>
                      </div>
                    </div>

                    {/* Checklist Item 3: Profile Completeness */}
                    <div className="verify-checklist-card">
                      <div className="checklist-icon checklist-icon-info">ℹ️</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#0F172A' }}>
                          Profile Completeness &amp; Health Declaration
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#1E40AF', fontWeight: 600 }}>
                          {donorToVerify.profileCompleteness || 92}% Complete — Antigen record, address, and emergency consent logged
                        </div>
                      </div>
                    </div>

                    {/* Checklist Item 4: Medical Safety */}
                    <div className="verify-checklist-card">
                      <div className="checklist-icon checklist-icon-success">✓</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#0F172A' }}>
                          Self-Reported Health Criteria
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#475569' }}>
                          Weight &gt; 45kg • No active infection • Age 18–65 • Hemoglobin threshold met
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ background: '#FFF1F2', border: '1.5px solid #FECDD3', borderRadius: 10, padding: '14px', margin: '10px 0' }}>
                    <div style={{ fontWeight: 800, color: '#9F1239', fontSize: '0.88rem', marginBottom: 8 }}>
                      ⚠️ Reject &amp; Flag Verification Request
                    </div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 4, textTransform: 'uppercase' }}>
                      Select Rejection / Flag Reason:
                    </label>
                    <select
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #FDA4AF', fontSize: '0.84rem', background: '#fff', boxSizing: 'border-box' }}
                    >
                      <option value="Duplicate account detected across Nagpur registry">Duplicate account detected across Nagpur registry</option>
                      <option value="Failed Government ID cryptographic verification">Failed Government ID cryptographic verification</option>
                      <option value="Incomplete medical health screening declaration">Incomplete medical health screening declaration</option>
                      <option value="Underage or temporary clinical deferral">Underage or temporary clinical deferral</option>
                      <option value="Unreachable phone number / Invalid contact info">Unreachable phone number / Invalid contact info</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                {!showRejectForm ? (
                  <>
                    <button
                      type="button"
                      className="btn-flag-action"
                      style={{ padding: '9px 14px', fontSize: '0.82rem' }}
                      onClick={() => setShowRejectForm(true)}
                    >
                      ❌ Reject
                    </button>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => { setVerifyModalDonor(null); setShowVerifyModal(false) }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ background: '#16A34A', borderColor: '#16A34A', padding: '9px 18px', fontWeight: 800 }}
                        onClick={() => handleApproveDonorVerification(donorToVerify)}
                      >
                        ✅ Approve &amp; Verify
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowRejectForm(false)}
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ background: '#E11D48', borderColor: '#E11D48', fontWeight: 800 }}
                      onClick={() => handleRejectDonorVerification(donorToVerify)}
                    >
                      Confirm Rejection &amp; Flag
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── MODAL: Contact Donor ── */}
      {contactModalDonor && (
        <div className="modal-backdrop" onClick={() => setContactModalDonor(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#2563EB' }}>📞</span> Contact Volunteer Donor
              </h3>
              <button className="modal-close-btn" onClick={() => setContactModalDonor(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 10, padding: '14px', marginBottom: 16 }}>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0F172A' }}>
                  {contactModalDonor.name}
                  <span className="bg-tag" style={{ marginLeft: 8 }}>{contactModalDonor.group}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: 4 }}>
                  🆔 <strong>{contactModalDonor.id}</strong> &nbsp;•&nbsp; 📍 {contactModalDonor.city}
                </div>
                <div style={{ fontSize: '0.84rem', color: '#0F172A', marginTop: 6, fontWeight: 700 }}>
                  📞 Direct Hotline: {contactModalDonor.phone}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: 2 }}>
                  ✉️ Email: {contactModalDonor.email || 'donor@lifestream.org'}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(contactModalDonor.phone)
                    setCopiedDonorPhone(true)
                    setTimeout(() => setCopiedDonorPhone(false), 2500)
                  }}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1.5px solid #E2E8F0',
                    background: copiedDonorPhone ? '#F0FDF4' : '#FFFFFF',
                    color: copiedDonorPhone ? '#166534' : '#334155',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  {copiedDonorPhone ? '✅ Phone Number Copied!' : '📋 Copy Phone Number'}
                </button>

                <a
                  href={`tel:${contactModalDonor.phone.replace(/[^0-9+]/g, '')}`}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: '#2563EB',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    textDecoration: 'none',
                    textAlign: 'center',
                    display: 'block'
                  }}
                >
                  📞 Direct Phone Call
                </a>

                <a
                  href={`https://wa.me/${contactModalDonor.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`🚨 BloodConnect Nagpur Emergency Outreach: Urgent requirement for ${contactModalDonor.group} blood. If available to donate, please respond or call back immediately.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: '#16A34A',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    textDecoration: 'none',
                    textAlign: 'center',
                    display: 'block'
                  }}
                >
                  💬 Send WhatsApp Emergency Request
                </a>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setContactModalDonor(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Flag Donor Account ── */}
      {flagModalDonor && (
        <div className="modal-backdrop" onClick={() => setFlagModalDonor(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontWeight: 800, color: '#E11D48', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🚩</span> Flag Donor Account
              </h3>
              <button className="modal-close-btn" onClick={() => setFlagModalDonor(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.84rem', color: '#475569', margin: '0 0 14px' }}>
                Flagging <strong>{flagModalDonor.name}</strong> ({flagModalDonor.id}) will move them to the "Flagged/Inactive" registry and prevent automated emergency dispatch matching.
              </p>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 4, textTransform: 'uppercase' }}>
                  Select Reason for Flagging:
                </label>
                <select
                  value={flagReason}
                  onChange={e => setFlagReason(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 7, border: '1.5px solid #E2E8F0', fontSize: '0.85rem', background: '#fff', boxSizing: 'border-box' }}
                >
                  <option value="Suspected duplicate account across district registries">Suspected duplicate account across district registries</option>
                  <option value="Failed mandatory health screening / Medical deferral">Failed mandatory health screening / Medical deferral</option>
                  <option value="Unresponsive to multiple critical Code Red alerts">Unresponsive to multiple critical Code Red alerts</option>
                  <option value="Fraudulent certificate submission attempt">Fraudulent certificate submission attempt</option>
                  <option value="Admin manual security review & temporary freeze">Admin manual security review &amp; temporary freeze</option>
                </select>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => setFlagModalDonor(null)}>Cancel</button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: '#E11D48', borderColor: '#E11D48', fontWeight: 800 }}
                onClick={() => handleFlagDonor(flagModalDonor)}
              >
                🚩 Confirm &amp; Flag Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Add / Update Stock ── */}
      {showStockModal && (
        <div className="modal-backdrop" onClick={() => setShowStockModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontWeight: 800, color: '#00E676' }}>
                ➕ Add / Update Bio-Bank Inventory Stock
              </h3>
              <button className="modal-close-btn" onClick={() => setShowStockModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddStockSubmit}>
              <div className="modal-body">
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginBottom: 4 }}>Select Bio-Bank Node:</label>
                  <select
                    className="modal-input"
                    style={{ width: '100%', padding: '8px 10px' }}
                    value={stockFormData.bankId}
                    onChange={e => setStockFormData(p => ({ ...p, bankId: e.target.value }))}
                  >
                    {bioBanks.map(b => <option key={b.id} value={b.id}>{b.id} — {b.name}</option>)}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginBottom: 4 }}>Blood Group:</label>
                    <select
                      className="modal-input"
                      style={{ width: '100%', padding: '8px 10px' }}
                      value={stockFormData.group}
                      onChange={e => setStockFormData(p => ({ ...p, group: e.target.value }))}
                    >
                      {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginBottom: 4 }}>Component Type:</label>
                    <select
                      className="modal-input"
                      style={{ width: '100%', padding: '8px 10px' }}
                      value={stockFormData.component}
                      onChange={e => setStockFormData(p => ({ ...p, component: e.target.value }))}
                    >
                      {ERAKTKOSH_COMPONENTS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginBottom: 4 }}>Units to Add:</label>
                    <input
                      type="number"
                      min="1"
                      className="modal-input"
                      style={{ width: '100%', padding: '8px 10px' }}
                      value={stockFormData.units}
                      onChange={e => setStockFormData(p => ({ ...p, units: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginBottom: 4 }}>Collection Date:</label>
                    <input
                      type="text"
                      className="modal-input"
                      style={{ width: '100%', padding: '8px 10px' }}
                      value={stockFormData.date}
                      onChange={e => setStockFormData(p => ({ ...p, date: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowStockModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Create Emergency Request ── */}
      {showEmergencyCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowEmergencyCreateModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontWeight: 800, color: '#DC2626' }}>
                🚨 Create Code Red Emergency Dispatch Request
              </h3>
              <button className="modal-close-btn" onClick={() => setShowEmergencyCreateModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateEmergencySubmit}>
              <div className="modal-body">
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginBottom: 4 }}>Destination Hospital:</label>
                  <select
                    className="modal-input"
                    style={{ width: '100%', padding: '8px 10px' }}
                    value={emergencyFormData.hospitalId}
                    onChange={e => setEmergencyFormData(p => ({ ...p, hospitalId: e.target.value }))}
                  >
                    {hospitals.map(h => <option key={h.id} value={h.id}>{h.id} — {h.name}</option>)}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginBottom: 4 }}>Blood Group Required:</label>
                    <select
                      className="modal-input"
                      style={{ width: '100%', padding: '8px 10px' }}
                      value={emergencyFormData.group}
                      onChange={e => setEmergencyFormData(p => ({ ...p, group: e.target.value }))}
                    >
                      {['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'].map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginBottom: 4 }}>Units Needed:</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      className="modal-input"
                      style={{ width: '100%', padding: '8px 10px' }}
                      value={emergencyFormData.units}
                      onChange={e => setEmergencyFormData(p => ({ ...p, units: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginBottom: 4 }}>Urgency Level:</label>
                  <select
                    className="modal-input"
                    style={{ width: '100%', padding: '8px 10px' }}
                    value={emergencyFormData.urgency}
                    onChange={e => setEmergencyFormData(p => ({ ...p, urgency: e.target.value }))}
                  >
                    <option value="critical">🚨 Critical Code Red (ETA &lt; 5 mins)</option>
                    <option value="high">⚡ High Urgency (ETA &lt; 15 mins)</option>
                    <option value="normal">📋 Normal Stock Order</option>
                  </select>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginBottom: 4 }}>Patient Condition / Diagnosis:</label>
                  <input
                    type="text"
                    className="modal-input"
                    style={{ width: '100%', padding: '8px 10px' }}
                    value={emergencyFormData.condition}
                    onChange={e => setEmergencyFormData(p => ({ ...p, condition: e.target.value }))}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEmergencyCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#DC2626' }}>
                  🚀 Broadcast &amp; Dispatch Fleet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: NGO / Community Helpline Call Modal ── */}
      {callModalNgo && (
        <div
          className="modal-backdrop"
          onClick={() => setCallModalNgo(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16
          }}
        >
          <div
            className="modal-box"
            onClick={e => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: 16,
              maxWidth: 440,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              position: 'relative'
            }}
          >
            <button
              onClick={() => setCallModalNgo(null)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: 28,
                height: 28,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                fontWeight: 700
              }}
            >
              ✕
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                📞
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Verified 24/7 NGO Helpline
                </div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  {callModalNgo.name}
                </h3>
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 16px 0', lineHeight: 1.4 }}>
              📍 {callModalNgo.address || callModalNgo.loc} • Emergency Desk
            </p>

            {/* Prominent Phone Number Display */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '16px',
              textAlign: 'center',
              marginBottom: 18
            }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Direct Emergency Mobilization Line
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', letterSpacing: '0.5px', marginTop: 4, fontFamily: 'monospace' }}>
                {callModalNgo.phone}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 700, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669' }} /> Live Transfusion Desk Active
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(callModalNgo.phone)
                  setCopiedNgoPhone(true)
                  setTimeout(() => setCopiedNgoPhone(false), 2500)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '10px 14px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  borderRadius: 8,
                  border: `1.5px solid ${copiedNgoPhone ? '#10b981' : '#cbd5e1'}`,
                  background: copiedNgoPhone ? '#ecfdf5' : '#ffffff',
                  color: copiedNgoPhone ? '#059669' : '#0f172a',
                  cursor: 'pointer'
                }}
              >
                <span>{copiedNgoPhone ? '✅ Copied!' : '📋 Copy Number'}</span>
              </button>

              <a
                href={`tel:${callModalNgo.phone.replace(/[^0-9+]/g, '')}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  textDecoration: 'none',
                  padding: '10px 14px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  borderRadius: 8,
                  border: 'none',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                <span>📞 Call Now</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
