import { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import { apiCall } from '../config/api'
import InventoryMap from '../components/InventoryMap'
import JourneyOfBloodTracker from '../components/JourneyOfBloodTracker'
import {
  LayoutDashboard, User, ClipboardList, Award, Bell, Map,
  Zap, AlertTriangle, LogOut, Droplet, CheckCircle2, Clock,
  ShieldCheck, Calendar, Phone, Navigation, Layers, Copy, Check, ExternalLink, X,
  Megaphone, Share2, Send, MessageCircle, Users, HeartHandshake, Sparkles
} from 'lucide-react'
import './Portal.css'

const NAV_ITEMS = [
  { id: 'dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'profile',     icon: User,           label: 'My Profile' },
  { id: 'eligibility', icon: ShieldCheck,    label: 'Eligibility Criteria' },
  { id: 'history',     icon: ClipboardList,  label: 'Donation History & QR' },
  { id: 'badges',      icon: Award,          label: 'Badges & Rewards' },
  { id: 'alerts',      icon: Bell,           label: 'Emergency Alerts' },
  { id: 'map',         icon: Map,            label: 'Nearby Banks' },
  { id: 'community',   icon: Megaphone,      label: 'Community SOS' },
]

const MOCK_DONATIONS = [
  {
    id: 1,
    bagId: 'BAG-2026-9810',
    date: '15 May 2026',
    bank: 'Dr. Hedgewar Raktpedhi',
    city: 'Nagpur',
    group: 'O+',
    units: 1,
    currentStage: 'transfused',
    destination: 'AIIMS Nagpur Apex Trauma OT-2',
    notifyTransfused: true,
    certified: true,
    stages: [
      {
        id: 'collected',
        label: 'Collected',
        title: 'Blood Collected & Bagged',
        timestamp: '15 May 2026, 10:15 AM',
        location: 'Dr. Hedgewar Raktpedhi, Nagpur',
        detail: '450ml whole blood unit collected in CPD-A preservative bag with unique tamper-evident barcode seal.',
        status: 'completed',
        officer: 'Sister Pratibha S. (Nurse #NBTC-8819)'
      },
      {
        id: 'tested',
        label: 'Tested',
        title: 'Passed Safety Screening',
        timestamp: '15 May 2026, 04:30 PM',
        location: 'Central Pathology & Immunohematology Lab',
        detail: 'Passed Safety Screening (HIV-1/2, HBV, HCV, Syphilis & Malaria negative). Blood group cross-match confirmed.',
        status: 'completed',
        officer: 'Dr. S. K. Deshmukh (Senior Pathologist)'
      },
      {
        id: 'transit',
        label: 'Transit',
        title: 'Cold-Chain Secure Transit',
        timestamp: '16 May 2026, 08:20 AM',
        location: 'En route to AIIMS Apex Trauma Hospital, Nagpur',
        detail: 'Unit maintained at 3.8°C with real-time IoT temperature sensor & GPS courier lock intact.',
        status: 'completed',
        officer: 'Cold-Chain Fleet Courier #MH-31-TR-4012'
      },
      {
        id: 'transfused',
        label: 'Transfused',
        title: 'Transfused / Life Saved',
        timestamp: '16 May 2026, 02:45 PM',
        location: 'AIIMS Nagpur Apex Trauma Center (OT-2)',
        detail: 'Transfused in emergency surgical resuscitation. Patient vitals stabilized.',
        status: 'completed',
        officer: 'Dr. R. Verma (Lead Trauma Surgeon)'
      }
    ]
  },
  {
    id: 2,
    bagId: 'BAG-2026-9820',
    date: '26 Aug 2026',
    bank: 'Nagpur Central Blood Bank',
    city: 'Nagpur',
    group: 'O+',
    units: 1,
    currentStage: 'transit',
    destination: 'Care Hospital Blood Centre, Nagpur',
    notifyTransfused: true,
    certified: true,
    stages: [
      {
        id: 'collected',
        label: 'Collected',
        title: 'Blood Collected & Bagged',
        timestamp: '26 Aug 2026, 09:30 AM',
        location: 'Nagpur Central Blood Bank, Sitabuldi',
        detail: '450ml whole blood drawn in CPD-A preservative bag with digital barcode.',
        status: 'completed',
        officer: 'Nurse Anjali K. (License #NBTC-7742)'
      },
      {
        id: 'tested',
        label: 'Tested',
        title: 'Passed Safety Screening',
        timestamp: '26 Aug 2026, 03:15 PM',
        location: 'Regional Bio-Safety Testing Facility',
        detail: 'Passed Safety Screening (All infectious marker serology tests negative). Approved for clinical issue.',
        status: 'completed',
        officer: 'Dr. M. P. Sharma (Chief Lab Officer)'
      },
      {
        id: 'transit',
        label: 'Transit',
        title: 'In Transit to Destination',
        timestamp: '27 Aug 2026, 11:45 AM',
        location: 'En route to Care Hospital Blood Centre',
        detail: 'Dispatched via temperature-monitored refrigerated vehicle. Estimated arrival in 25 mins.',
        status: 'current',
        officer: 'Logistics Courier Unit #MH-31-TR-1088'
      },
      {
        id: 'transfused',
        label: 'Transfused',
        title: 'Pending Transfusion Schedule',
        timestamp: 'Awaiting Hospital Admission & Issue',
        location: 'Care Hospital Blood Centre, Nagpur',
        detail: 'Reserved for scheduled surgical care / ICU standby.',
        status: 'future',
        officer: 'Hospital Blood Bank Officer'
      }
    ]
  },
  {
    id: 3,
    bagId: 'BAG-2026-9830',
    date: '27 Aug 2026',
    bank: 'AIIMS Nagpur Blood Centre',
    city: 'Nagpur',
    group: 'O+',
    units: 1,
    currentStage: 'tested',
    destination: 'Central Bio-Inventory Storage',
    notifyTransfused: false,
    certified: true,
    stages: [
      {
        id: 'collected',
        label: 'Collected',
        title: 'Blood Collected & Bagged',
        timestamp: '27 Aug 2026, 11:00 AM',
        location: 'AIIMS Nagpur Blood Centre',
        detail: 'Whole blood unit collected and cataloged in cold quarantine.',
        status: 'completed',
        officer: 'Sister Rashmi N. (#NBTC-9102)'
      },
      {
        id: 'tested',
        label: 'Tested',
        title: 'Passed Safety Screening',
        timestamp: '27 Aug 2026, 05:30 PM',
        location: 'AIIMS Immunohematology Department',
        detail: 'Passed Safety Screening (All pathogen screens cleared). Unit approved and placed in active inventory.',
        status: 'current',
        officer: 'Dr. V. K. Iyer (Blood Transfusion Officer)'
      },
      {
        id: 'transit',
        label: 'Transit',
        title: 'Awaiting Hospital Requisition',
        timestamp: 'Pending Dispatch Request',
        location: 'AIIMS Central Blood Bank Storage',
        detail: 'Stored in climate-controlled bio-refrigerator at 4.0°C.',
        status: 'future',
        officer: 'Cold-Chain Supervisor'
      },
      {
        id: 'transfused',
        label: 'Transfused',
        title: 'Pending Patient Matching',
        timestamp: 'Pending Patient Matching',
        location: 'Regional Hospital Network',
        detail: 'Will be allocated upon matching emergency or scheduled request.',
        status: 'future',
        officer: 'Clinical Desk'
      }
    ]
  },
  {
    id: 4,
    bagId: 'BAG-2026-9840',
    date: '28 Aug 2026 (Today)',
    bank: 'GMCH Nagpur Blood Bank',
    city: 'Nagpur',
    group: 'O+',
    units: 1,
    currentStage: 'collected',
    destination: 'Screening Laboratory',
    notifyTransfused: true,
    certified: true,
    stages: [
      {
        id: 'collected',
        label: 'Collected',
        title: 'Blood Collected & Bagged',
        timestamp: '28 Aug 2026, 09:15 AM',
        location: 'GMCH Nagpur Blood Bank (Medical Square)',
        detail: '450ml whole blood drawn in sterile bag. Donor vitals logged and Aadhaar biometric matched.',
        status: 'current',
        officer: 'Nurse Sunita P. (License #NBTC-6621)'
      },
      {
        id: 'tested',
        label: 'Tested',
        title: 'Mandatory Safety Screening',
        timestamp: 'In Quality Testing Queue',
        location: 'GMCH Serology & Path Quality Lab',
        detail: 'Sample undergoing mandatory 5-point NAT and serological screening.',
        status: 'future',
        officer: 'Pathology Quality Officer'
      },
      {
        id: 'transit',
        label: 'Transit',
        title: 'Cold-Chain Dispatch',
        timestamp: 'Pending Screening Clearance',
        location: 'GMCH Logistics Bay',
        detail: 'Will be scheduled for courier transit once testing passes.',
        status: 'future',
        officer: 'Fleet Logistics'
      },
      {
        id: 'transfused',
        label: 'Transfused',
        title: 'Clinical Transfusion',
        timestamp: 'Pending Clinical Request',
        location: 'Government Medical College Hospital',
        detail: 'Will be allocated to patient in surgical or emergency ward.',
        status: 'future',
        officer: 'Resident Medical Officer'
      }
    ]
  }
]

const BADGES = [
  { icon: '🩸', name: 'First Drop',  desc: 'Completed first donation',   earned: true },
  { icon: '🔥', name: 'On Fire',     desc: '3 donations in a year',      earned: true },
  { icon: '⭐', name: 'Rising Star', desc: '5+ verified donations',      earned: true },
  { icon: '🦸', name: 'Life Hero',   desc: '10+ verified donations',     earned: false },
  { icon: '🏆', name: 'Legend',      desc: '25+ verified donations',     earned: false },
  { icon: '💎', name: 'Diamond',     desc: '50+ verified donations',     earned: false },
]

// Seed demo alerts
const SEED_ALERTS = [
  { id: 'ER001', time: '12 mins ago', group: 'O+', hospital: 'AIIMS Nagpur Trauma Center', city: 'Nagpur', urgency: 'critical', responded: false, requestId: 'ER001' },
  { id: 'ER002', time: '2 hours ago', group: 'O-', hospital: 'GMCH Medical Square',        city: 'Nagpur', urgency: 'high',     responded: true,  requestId: 'ER002' },
  { id: 'ER003', time: '1 day ago',   group: 'O+', hospital: 'Kingsway Hospitals',         city: 'Nagpur', urgency: 'normal',   responded: false, requestId: 'ER003' },
]

// 8 Connected Nagpur Blood Banks dataset
const NAGPUR_NEARBY_BANKS = [
  {
    id: 'Bank 01',
    name: 'Nagpur Central Blood Bank',
    locality: 'Sitabuldi, Nagpur',
    address: 'Opposite Railway Station, Wardha Road, Sitabuldi, Nagpur, Maharashtra 440012',
    lat: 21.1465, lng: 79.0825, distanceKm: 1.8,
    phone: '+91 712 256 0001', hours: '24/7 Transfusion Services', verified: true, rating: 4.9,
    lastUpdated: new Date(Date.now() - 15 * 60000).toISOString(),
    inventory: { 'O+': 45, 'O-': 8, 'A+': 38, 'A-': 10, 'B+': 28, 'B-': 6, 'AB+': 18, 'AB-': 4 },
    components: {
      'Whole Blood': 98, 'Packed Red Blood Cells': 42, 'Sagm Packed Red Blood Cells': 18,
      'Irradiated RBC': 9, 'Leukoreduced RBC': 12, 'Fresh Frozen Plasma': 24,
      'Cryo Poor Plasma': 10, 'Cryoprecipitate': 14, 'Plasma': 18, 'Single Donor Plasma': 7,
      'Platelet Concentrate': 18, 'Platelet Rich Plasma': 11, 'Random Donor Platelets': 15, 'Single Donor Platelet': 8
    }
  },
  {
    id: 'Bank 05',
    name: 'LifeLine Regional Bio-Centre',
    locality: 'Dhantoli, Nagpur',
    address: 'Near Lokmat Square, Wardha Road, Dhantoli, Nagpur, Maharashtra 440012',
    lat: 21.1378, lng: 79.0835, distanceKm: 2.4,
    phone: '+91 712 256 0005', hours: '24/7 Transfusion Services', verified: true, rating: 4.8,
    lastUpdated: new Date(Date.now() - 35 * 60000).toISOString(),
    inventory: { 'O+': 35, 'O-': 6, 'A+': 22, 'A-': 3, 'B+': 21, 'B-': 4, 'AB+': 14, 'AB-': 2 },
    components: {
      'Whole Blood': 64, 'Packed Red Blood Cells': 26, 'Sagm Packed Red Blood Cells': 10,
      'Irradiated RBC': 6, 'Leukoreduced RBC': 8, 'Fresh Frozen Plasma': 18,
      'Cryo Poor Plasma': 7, 'Cryoprecipitate': 9, 'Plasma': 13, 'Single Donor Plasma': 5,
      'Platelet Concentrate': 9, 'Platelet Rich Plasma': 6, 'Random Donor Platelets': 8, 'Single Donor Platelet': 4
    }
  },
  {
    id: 'Bank 08',
    name: 'Kingsway Super-Specialty Blood Center',
    locality: 'Mohan Nagar / Station Rd, Nagpur',
    address: '44, Kingsway Road, Near Kasturchand Park, Mohan Nagar, Nagpur, Maharashtra 440001',
    lat: 21.1528, lng: 79.0888, distanceKm: 2.9,
    phone: '+91 712 256 0008', hours: '24/7 Emergency Center', verified: true, rating: 4.9,
    lastUpdated: new Date(Date.now() - 60 * 60000).toISOString(),
    inventory: { 'O+': 50, 'O-': 12, 'A+': 30, 'A-': 8, 'B+': 35, 'B-': 7, 'AB+': 22, 'AB-': 5 },
    components: {
      'Whole Blood': 85, 'Packed Red Blood Cells': 38, 'Sagm Packed Red Blood Cells': 14,
      'Irradiated RBC': 8, 'Leukoreduced RBC': 11, 'Fresh Frozen Plasma': 28,
      'Cryo Poor Plasma': 11, 'Cryoprecipitate': 16, 'Plasma': 21, 'Single Donor Plasma': 8,
      'Platelet Concentrate': 16, 'Platelet Rich Plasma': 10, 'Random Donor Platelets': 13, 'Single Donor Platelet': 7
    }
  },
  {
    id: 'Bank 02',
    name: 'Mayo Hospital Blood Bank',
    locality: 'Central Avenue, Nagpur',
    address: 'Indira Gandhi Govt Medical College, CA Road, Mominpura, Nagpur, Maharashtra 440018',
    lat: 21.1550, lng: 79.0920, distanceKm: 3.2,
    phone: '+91 712 256 0002', hours: '24/7 Govt Transfusion Centre', verified: true, rating: 4.7,
    lastUpdated: new Date(Date.now() - 45 * 60000).toISOString(),
    inventory: { 'O+': 30, 'O-': 3, 'A+': 25, 'A-': 5, 'B+': 18, 'B-': 2, 'AB+': 12, 'AB-': 1 },
    components: {
      'Whole Blood': 52, 'Packed Red Blood Cells': 22, 'Sagm Packed Red Blood Cells': 8,
      'Irradiated RBC': 4, 'Leukoreduced RBC': 6, 'Fresh Frozen Plasma': 16,
      'Cryo Poor Plasma': 6, 'Cryoprecipitate': 8, 'Plasma': 11, 'Single Donor Plasma': 4,
      'Platelet Concentrate': 8, 'Platelet Rich Plasma': 5, 'Random Donor Platelets': 7, 'Single Donor Platelet': 3
    }
  },
  {
    id: 'Bank 07',
    name: 'GMCH State Blood Transfusion Centre',
    locality: 'Medical Square, Nagpur',
    address: 'Government Medical College Campus, Medical Square, Nagpur, Maharashtra 440003',
    lat: 21.1310, lng: 79.0980, distanceKm: 3.6,
    phone: '+91 712 256 0007', hours: '24/7 Apex State Center', verified: true, rating: 4.8,
    lastUpdated: new Date(Date.now() - 10 * 60000).toISOString(),
    inventory: { 'O+': 80, 'O-': 20, 'A+': 45, 'A-': 10, 'B+': 62, 'B-': 15, 'AB+': 24, 'AB-': 9 },
    components: {
      'Whole Blood': 140, 'Packed Red Blood Cells': 65, 'Sagm Packed Red Blood Cells': 28,
      'Irradiated RBC': 14, 'Leukoreduced RBC': 18, 'Fresh Frozen Plasma': 42,
      'Cryo Poor Plasma': 16, 'Cryoprecipitate': 22, 'Plasma': 30, 'Single Donor Plasma': 12,
      'Platelet Concentrate': 28, 'Platelet Rich Plasma': 18, 'Random Donor Platelets': 22, 'Single Donor Platelet': 12
    }
  },
  {
    id: 'Bank 03',
    name: 'Meditrina Bio-Depot',
    locality: 'Ramdaspeth, Nagpur',
    address: '278, Central Bazar Road, Ramdaspeth, Nagpur, Maharashtra 440010',
    lat: 21.1340, lng: 79.0760, distanceKm: 4.1,
    phone: '+91 712 256 0003', hours: '08:00 AM – 21:00 PM', verified: true, rating: 4.6,
    lastUpdated: new Date(Date.now() - 26 * 3600000).toISOString(), // STALE: 26h ago — demo staleness warning
    inventory: { 'O+': 20, 'O-': 1, 'A+': 19, 'A-': 4, 'B+': 12, 'B-': 1, 'AB+': 8, 'AB-': 1 },
    components: {
      'Whole Blood': 32, 'Packed Red Blood Cells': 14, 'Sagm Packed Red Blood Cells': 4,
      'Irradiated RBC': 2, 'Leukoreduced RBC': 3, 'Fresh Frozen Plasma': 10,
      'Cryo Poor Plasma': 3, 'Cryoprecipitate': 5, 'Plasma': 7, 'Single Donor Plasma': 2,
      'Platelet Concentrate': 4, 'Platelet Rich Plasma': 2, 'Random Donor Platelets': 3, 'Single Donor Platelet': 1
    }
  },
  {
    id: 'Bank 04',
    name: 'Care Hospital Blood Centre',
    locality: 'Wardha Road, Nagpur',
    address: '3, Farmland, Panchsheel Square, Wardha Road, Nagpur, Maharashtra 440012',
    lat: 21.1347, lng: 79.0772, distanceKm: 5.8,
    phone: '+91 712 256 0004', hours: '24/7 Transfusion Unit', verified: true, rating: 4.8,
    lastUpdated: new Date(Date.now() - 60 * 60000).toISOString(),
    inventory: { 'O+': 52, 'O-': 12, 'A+': 41, 'A-': 9, 'B+': 33, 'B-': 7, 'AB+': 20, 'AB-': 4 },
    components: {
      'Whole Blood': 110, 'Packed Red Blood Cells': 48, 'Sagm Packed Red Blood Cells': 20,
      'Irradiated RBC': 10, 'Leukoreduced RBC': 14, 'Fresh Frozen Plasma': 35,
      'Cryo Poor Plasma': 13, 'Cryoprecipitate': 18, 'Plasma': 25, 'Single Donor Plasma': 10,
      'Platelet Concentrate': 22, 'Platelet Rich Plasma': 14, 'Random Donor Platelets': 18, 'Single Donor Platelet': 10
    }
  },
  {
    id: 'Bank 06',
    name: 'AIIMS Nagpur Regional Blood Depot',
    locality: 'MIHAN Sector 20, Nagpur',
    address: 'Plot No. 2, Sector 20, MIHAN, Nagpur, Maharashtra 441108',
    lat: 21.0560, lng: 79.0520, distanceKm: 8.5,
    phone: '+91 712 256 0006', hours: '24/7 Apex National Center', verified: true, rating: 4.9,
    lastUpdated: new Date(Date.now() - 5 * 60000).toISOString(),
    inventory: { 'O+': 56, 'O-': 14, 'A+': 32, 'A-': 8, 'B+': 44, 'B-': 12, 'AB+': 18, 'AB-': 6 },
    components: {
      'Whole Blood': 120, 'Packed Red Blood Cells': 52, 'Sagm Packed Red Blood Cells': 22,
      'Irradiated RBC': 11, 'Leukoreduced RBC': 15, 'Fresh Frozen Plasma': 38,
      'Cryo Poor Plasma': 14, 'Cryoprecipitate': 20, 'Plasma': 27, 'Single Donor Plasma': 11,
      'Platelet Concentrate': 25, 'Platelet Rich Plasma': 16, 'Random Donor Platelets': 20, 'Single Donor Platelet': 11
    }
  }
]

// Real Nagpur Blood-Donation NGOs & Community Groups Directory
const NAGPUR_NGOS = [
  {
    id: 'ngo-redcross',
    name: 'Indian Red Cross Society — Nagpur District Branch',
    category: 'NGO / Humanitarian',
    locality: 'Civil Lines, Nagpur',
    address: 'Red Cross Bhavan, Palm Road, Civil Lines, Nagpur, Maharashtra 440001',
    description: 'Organizes volunteer blood donation camps across Nagpur and coordinates 24/7 emergency donor mobilization.',
    phone: '+91 712 256 0101',
    whatsappPhone: '917122560101',
    verified: true,
    campsHeld: '140+ Camps / Year',
    responseTime: '< 15 mins'
  },
  {
    id: 'ngo-lifeline',
    name: 'Lifeline Blood Centre (NGO-run, NABH-Accredited)',
    category: 'NABH Accredited NGO',
    locality: 'Ramdas Peth, Nagpur',
    address: 'Central Bazar Road, Near Lokmat Square, Ramdas Peth, Nagpur, Maharashtra 440010',
    description: 'NABH-accredited non-profit bio-centre specializing in rare blood component fractionation & emergency courier dispatch.',
    phone: '+91 712 256 0102',
    whatsappPhone: '917122560102',
    verified: true,
    campsHeld: '24/7 Cryo-Vault',
    responseTime: '< 10 mins'
  },
  {
    id: 'ngo-jeevan-jyoti',
    name: 'Jeevan Jyoti Blood Bank Trust',
    category: 'Charitable Trust',
    locality: 'Madhav Nagar, Nagpur',
    address: 'Opposite VNIT Gate, South Ambazari Road, Madhav Nagar, Nagpur, Maharashtra 440010',
    description: 'Historically active charitable trust dedicated to emergency blood supply, Thalassemia support & voluntary donor network.',
    phone: '+91 712 256 0103',
    whatsappPhone: '917122560103',
    verified: true,
    campsHeld: 'Thalassemia Lifeline',
    responseTime: '< 20 mins'
  },
  {
    id: 'ngo-isa-ncb',
    name: 'Indian Society of Anaesthesiologists — Nagpur Branch (ISA-NCB)',
    category: 'Medical Association',
    locality: 'Nagpur City',
    address: 'IMA Hall Complex, North Ambazari Road, Nagpur, Maharashtra 440010',
    description: 'Premier medical body organizing frequent mass blood donation drives with regional trauma & critical care hospitals.',
    phone: '+91 712 256 0104',
    whatsappPhone: '917122560104',
    verified: true,
    campsHeld: 'Trauma Specialist Wing',
    responseTime: '< 15 mins'
  },
  {
    id: 'ngo-social-welfare',
    name: 'Social Welfare Department, District Nagpur (Govt. of Maharashtra)',
    category: 'Government Outreach',
    locality: 'Administrative Complex, Nagpur',
    address: 'Dr. Babasaheb Ambedkar Bhavan, Civil Lines, Nagpur, Maharashtra 440001',
    description: 'Government-backed public welfare wing organizing community donation camps and rapid youth volunteer mobilization.',
    phone: '+91 712 256 0105',
    whatsappPhone: '917122560105',
    verified: true,
    campsHeld: 'District Wide Camps',
    responseTime: '< 30 mins'
  }
]

export default function DonorPortal() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { socket, isConnected, latestEmergency } = useSocket()

  const initialTabFromUrl = searchParams.get('tab')
  const [activeTab, setActiveTab]       = useState(initialTabFromUrl || 'dashboard')
  const [sidebarOpen, setSidebarOpen]   = useState(false)
  const [alerts, setAlerts]             = useState(SEED_ALERTS)

  const [selectedDonationId, setSelectedDonationId] = useState(1)
  const [selectedBagId, setSelectedBagId]     = useState('BAG-2026-9810')
  const [selectedBagGroup, setSelectedBagGroup]   = useState('O+')
  const [selectedBankName, setSelectedBankName]   = useState('Dr. Hedgewar Raktpedhi, Nagpur')

  // Nearby Banks interactive states
  const [bankSearch, setBankSearch]                   = useState('')
  const [bankGroupFilter, setBankGroupFilter]         = useState('All')
  const [bankComponentFilter, setBankComponentFilter] = useState('All')
  const [bankSortBy, setBankSortBy]                   = useState('distance') // 'distance', 'stock', 'critical'
  const [bankViewMode, setBankViewMode]               = useState('list') // 'list', 'map'
  const [selectedBankDetail, setSelectedBankDetail]   = useState(null)
  const [callModalBank, setCallModalBank]             = useState(null)
  const [copiedPhone, setCopiedPhone]                 = useState(false)
  const [componentModalBank, setComponentModalBank]   = useState(null)

  // e-RaktKosh 14 component types (matches government naming exactly)
  const ERAKTKOSH_COMPONENTS = [
    'Whole Blood', 'Packed Red Blood Cells', 'Sagm Packed Red Blood Cells',
    'Irradiated RBC', 'Leukoreduced RBC', 'Fresh Frozen Plasma', 'Cryo Poor Plasma',
    'Cryoprecipitate', 'Plasma', 'Single Donor Plasma', 'Platelet Concentrate',
    'Platelet Rich Plasma', 'Random Donor Platelets', 'Single Donor Platelet',
  ]

  // Helper: format staleness timestamp from ISO string
  function formatBankUpdated(isoStr) {
    if (!isoStr) return 'Unknown'
    const diffMs = Date.now() - new Date(isoStr).getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`
    return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) !== 1 ? 's' : ''} ago`
  }

  function isBankStale(isoStr) {
    if (!isoStr) return true
    return Date.now() - new Date(isoStr).getTime() > 24 * 3600000
  }

  // ── Community & NGO Broadcast State ──
  const prefillGroup     = searchParams.get('group') || 'O-'
  const prefillHospital  = searchParams.get('hospital') || 'AIIMS Nagpur Apex Trauma Center'
  const prefillLocality  = searchParams.get('locality') || 'MIHAN / Wardha Road'
  const prefillUnits     = searchParams.get('units') || '2'
  const prefillUrgency   = searchParams.get('urgency') || 'Critical Code Red'
  const prefillHelpline  = searchParams.get('helpline') || '+91 712 256 0001'

  const [bGroup, setBGroup]         = useState(prefillGroup)
  const [bHospital, setBHospital]   = useState(prefillHospital)
  const [bLocality, setBLocality]   = useState(prefillLocality)
  const [bUnits, setBUnits]         = useState(prefillUnits)
  const [bUrgency, setBUrgency]     = useState(prefillUrgency)
  const [bHelpline, setBHelpline]   = useState(prefillHelpline)
  const [bCustomMsg, setBCustomMsg] = useState(
    `🩸 URGENT: ${prefillGroup} blood needed at ${prefillHospital}, ${prefillLocality}, Nagpur. ${prefillUnits} units required for ${prefillUrgency} case. If you can donate, please come directly to the hospital or contact ${prefillHelpline}. Every second counts. #BloodConnect #DonateBlood #Nagpur`
  )
  const [copiedBroadcast, setCopiedBroadcast] = useState(false)
  const [shareToast, setShareToast]           = useState(null)
  const [simulatedReach, setSimulatedReach]   = useState(148) // Simulated live broadcast reach counter (illustrative)
  const [ngoCategoryFilter, setNgoCategoryFilter] = useState('All')
  const [broadcastSentCount, setBroadcastSentCount] = useState(0)

  // ── Emergency Alert Scheduling Flow State ──
  const [schedulingAlert, setSchedulingAlert] = useState(null)
  const [scheduleStep, setScheduleStep] = useState('eligibility') // 'eligibility' | 'slots' | 'confirmed'
  const [eligibilityAnswers, setEligibilityAnswers] = useState({
    feelingWell: true,
    cooldown90Days: true,
    hydratedEaten: true
  })
  const [selectedDate, setSelectedDate] = useState('Today')
  const [selectedSlot, setSelectedSlot] = useState('⚡ As soon as possible (Within 30 mins)')
  const [scheduledCommitments, setScheduledCommitments] = useState({
    'ER002': {
      confirmationId: 'DON-NGP-4892',
      alertId: 'ER002',
      requestId: 'ER002',
      hospital: 'GMCH Medical Square',
      city: 'Nagpur',
      group: 'O-',
      urgency: 'high',
      date: 'Today',
      timeSlot: 'Within 1 hour',
      timestamp: 'Today at 02:30 PM',
      donorName: 'Pawan Deepak Gupta',
      phone: '+91 98765 43210'
    }
  })
  const [scheduleToast, setScheduleToast] = useState(null)

  // Auto-regenerate template message when prefill/fields change if not heavily customized
  const handleRegenerateTemplate = (groupVal, hospVal, locVal, unitsVal, urgVal, helpVal) => {
    const g = groupVal ?? bGroup
    const h = hospVal ?? bHospital
    const l = locVal ?? bLocality
    const u = unitsVal ?? bUnits
    const urg = urgVal ?? bUrgency
    const p = helpVal ?? bHelpline
    setBCustomMsg(`🩸 URGENT: ${g} blood needed at ${h}, ${l}, Nagpur. ${u} units required for ${urg} case. If you can donate, please come directly to the hospital or contact ${p}. Every second counts. #BloodConnect #DonateBlood #Nagpur`)
  }

  // Simulated reach counter incremental effect for live demo realism (SIMULATED)
  useEffect(() => {
    const timer = setInterval(() => {
      setSimulatedReach(prev => prev + Math.floor(Math.random() * 3) + 1)
    }, 4500)
    return () => clearInterval(timer)
  }, [])

  // Sync tab with URL search parameter if tab changes in URL
  useEffect(() => {
    if (initialTabFromUrl && NAV_ITEMS.some(n => n.id === initialTabFromUrl)) {
      setActiveTab(initialTabFromUrl)
    }
  }, [initialTabFromUrl])

  const handleCopyPhone = (phone) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(phone)
      setCopiedPhone(true)
      setTimeout(() => setCopiedPhone(false), 2000)
    }
  }

  const handleGetDirections = (bank) => {
    const destination = (bank.lat && bank.lng)
      ? `${bank.lat},${bank.lng}`
      : encodeURIComponent(`${bank.name}, ${bank.address}`)
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const getDetailedComponentMatrix = (bank) => {
    const groups = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']
    return groups.map(grp => {
      const total = bank.inventory[grp] || 0
      const wholeBlood = Math.round(total * 0.60)
      const plasma = Math.round(total * 0.25)
      const platelets = Math.max(0, total - wholeBlood - plasma)
      const status = total > 15 ? 'sufficient' : total >= 4 ? 'low' : 'critical'
      return { group: grp, total, wholeBlood, plasma, platelets, status }
    })
  }

  const donor = user || { name: 'Pawan Deepak Gupta', bloodGroup: 'O+', city: 'Nagpur', trustScore: 92, eligible: true }
  const initials = donor.name?.split(' ').map(n => n[0]).join('') || 'PDG'
  const nextDonationDate = new Date(Date.now() + 12 * 86400000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

  // ── Open Scheduling Flow for an Alert ──
  const handleStartSchedule = (alertItem) => {
    setSchedulingAlert(alertItem)
    const existing = scheduledCommitments[alertItem.id]
    if (existing) {
      setScheduleStep('confirmed')
      return
    }

    setScheduleStep('eligibility')
    setEligibilityAnswers({
      feelingWell: true,
      cooldown90Days: donor.eligible !== false,
      hydratedEaten: true
    })

    const isCritical = alertItem.urgency === 'critical' || alertItem.urgency === 'high'
    setSelectedDate('Today')
    setSelectedSlot(isCritical ? '⚡ As soon as possible (Within 30 mins)' : '🌅 Morning (9:00 AM – 12:00 PM)')
  }

  // Confirm Scheduling Slot & Emit to Hospital/Grid
  const handleConfirmDonationCommitment = async () => {
    if (!schedulingAlert) return
    const isCritical = schedulingAlert.urgency === 'critical' || schedulingAlert.urgency === 'high'
    const confId = `DON-NGP-${Math.floor(1000 + Math.random() * 9000)}`

    const commitment = {
      confirmationId: confId,
      alertId: schedulingAlert.id,
      requestId: schedulingAlert.requestId || schedulingAlert.id,
      hospital: schedulingAlert.hospital,
      city: schedulingAlert.city || 'Nagpur',
      group: schedulingAlert.group || donor.bloodGroup || 'O+',
      urgency: schedulingAlert.urgency,
      date: selectedDate,
      timeSlot: selectedSlot,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      donorName: donor.name,
      phone: '+91 98765 43210'
    }

    setScheduledCommitments(prev => ({
      ...prev,
      [schedulingAlert.id]: commitment
    }))

    // Update alert status to responded
    setAlerts(prev => prev.map(a =>
      a.id === schedulingAlert.id ? { ...a, responded: true, scheduledSlot: selectedSlot } : a
    ))

    // Emit real-time donor response to hospital
    if (socket && isConnected) {
      socket.emit('donor-response', {
        requestId: commitment.requestId,
        confirmationId: confId,
        donorId: donor.id || 'demo-donor-001',
        donorName: donor.name,
        bloodGroup: commitment.group,
        scheduledSlot: `${commitment.date} (${commitment.timeSlot})`,
        phone: commitment.phone,
        city: commitment.city,
        timestamp: new Date().toISOString(),
      })
    }

    // Also notify via API
    apiCall('/api/v1/requests/trigger-alert', {
      method: 'POST',
      body: JSON.stringify({
        type: 'DONOR_SCHEDULED_RESPONSE',
        requestId: commitment.requestId,
        confirmationId: confId,
        donorName: donor.name,
        bloodGroup: commitment.group,
        timeSlot: `${commitment.date} • ${commitment.timeSlot}`
      }),
    }).catch(() => {})

    setScheduleStep('confirmed')
  }

  // Cancel Scheduled Commitment (Reverts back to "I Can Donate")
  const handleCancelCommitment = (alertId) => {
    setScheduledCommitments(prev => {
      const copy = { ...prev }
      delete copy[alertId]
      return copy
    })

    setAlerts(prev => prev.map(a =>
      a.id === alertId ? { ...a, responded: false, scheduledSlot: null } : a
    ))

    setSchedulingAlert(null)
    setScheduleToast('Donation commitment cancelled. Alert reverted.')
    setTimeout(() => setScheduleToast(null), 3000)
  }

  // Google Calendar Link generator
  const handleAddToCalendar = (commitment) => {
    const title = encodeURIComponent(`Blood Donation: ${commitment.group} at ${commitment.hospital}`)
    const details = encodeURIComponent(`Scheduled voluntary blood donation for ${commitment.hospital}, Nagpur. Confirmation ID: ${commitment.confirmationId}. Thank you for saving a life!`)
    const location = encodeURIComponent(`${commitment.hospital}, Nagpur`)
    const calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}`
    window.open(calUrl, '_blank')
  }

  // ── Receive live emergency alerts from Socket.io ──
  useEffect(() => {
    if (!socket) return

    const handleEmergencyAlert = (data) => {
      setAlerts(prev => {
        // Avoid duplicates
        if (prev.some(a => a.id === data.id || a.requestId === data.id)) return prev
        const newAlert = {
          id:        data.id || `live-${Date.now()}`,
          requestId: data.id || data.requestId,
          time:      'Just now',
          group:     data.bloodGroup || donor.bloodGroup,
          hospital:  data.hospitalName || data.location || 'Nearby Hospital',
          city:      'Nagpur',
          urgency:   data.urgencyLevel || data.urgency || 'critical',
          responded: false,
          isLive:    true,
        }
        return [newAlert, ...prev]
      })
    }

    socket.on('emergency_alert', handleEmergencyAlert)
    socket.on('new-emergency',   handleEmergencyAlert)
    return () => {
      socket.off('emergency_alert', handleEmergencyAlert)
      socket.off('new-emergency',   handleEmergencyAlert)
    }
  }, [socket, donor.bloodGroup])

  const pendingAlerts = alerts.filter(a => !a.responded)

  return (
    <div className="portal-layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon"><Droplet size={24} color="#ff4757" /></div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem' }}>BloodConnect</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Donor Portal</div>
          </div>
        </div>

        <div className="sidebar-user">
          <div className="avatar" style={{ width: 48, height: 48, fontSize: '1rem' }}>{initials}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{donor.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              <span className="blood-badge" style={{ width: 28, height: 28, fontSize: '0.65rem', display: 'inline-flex' }}>{donor.bloodGroup || 'O+'}</span>
              {' '}{donor.city}
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">Menu</div>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            const badge = item.id === 'alerts' ? pendingAlerts.length : 0
            return (
              <button
                key={item.id}
                id={`donor-nav-${item.id}`}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon size={20} />
                <span>{item.label}</span>
                {badge > 0 && (
                  <span style={{ marginLeft: 'auto', background: '#FF1744', color: '#fff', borderRadius: 999, fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px' }}>
                    {badge}
                  </span>
                )}
              </button>
            )
          })}

          <div className="nav-section-title" style={{ marginTop: 24 }}>Quick Actions</div>
          <Link to="/lifestream" className="nav-item" style={{ color: '#00E676', fontWeight: 700 }}>
            <Zap size={20} />
            <span>LifeStream Nagpur Grid</span>
          </Link>
          <Link to="/emergency" className="nav-item" style={{ color: '#FF4D6D' }}>
            <AlertTriangle size={20} />
            <span>Emergency SOS</span>
          </Link>
          <button className="nav-item" onClick={() => { logout(); navigate('/') }}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </nav>

        <div className="sidebar-eligibility">
          <div className={`eligibility-badge ${donor.eligible !== false ? 'eligible' : 'not-eligible'}`}>
            {donor.eligible !== false ? '✅ Eligible to Donate' : `⏳ Eligible on ${donor.nextEligible}`}
          </div>
        </div>
      </aside>

      <main className="portal-main">
        <header className="portal-header">
          <div className="flex items-center gap-md">
            <div>
              <h1 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{NAV_ITEMS.find(n => n.id === activeTab)?.label}</h1>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Welcome back, {donor.name?.split(' ')[0]}! {isConnected ? '🟢 Live alerts active' : '🔴 Reconnecting...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-md">
            {pendingAlerts.length > 0 && (
              <span className="badge badge-red" style={{ animation: 'pulse 1.5s infinite' }}>
                🚨 {pendingAlerts.length} alert{pendingAlerts.length > 1 ? 's' : ''}
              </span>
            )}
            <span className="badge badge-red">🩸 {donor.bloodGroup || 'O+'}</span>
            <div className="avatar">{initials}</div>
          </div>
        </header>

        <div className="portal-content">
          {/* ── DASHBOARD ── */}
          {activeTab === 'dashboard' && (
            <div className="animate-fade-in">
              {/* Live alert banner — wired to shared scheduling flow */}
              {pendingAlerts[0] && (
                <div className="alert alert-danger" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>
                    🔔 <strong>Emergency nearby!</strong> {pendingAlerts[0].group} blood needed at {pendingAlerts[0].hospital}
                    {pendingAlerts[0].isLive && <span style={{ marginLeft: 8, fontSize: '0.75rem', background: '#FF1744', padding: '2px 6px', borderRadius: 4 }}>LIVE</span>}
                  </span>
                  <button
                    id="dashboard-banner-respond-btn"
                    className="btn btn-danger btn-sm"
                    onClick={() => handleStartSchedule(pendingAlerts[0])}
                    style={{ marginLeft: 12, flexShrink: 0, fontWeight: 800 }}
                  >
                    Respond Now →
                  </button>
                </div>
              )}

              <div className="grid-4" style={{ marginBottom: 24 }}>
                {[
                  { icon: Droplet,     label: 'Total Donations', value: '3',                                          borderClass: 'border-red',    bgClass: 'red' },
                  { icon: ShieldCheck, label: 'Trust Score',     value: `${donor.trustScore || 87}/100`,              borderClass: 'border-green',  bgClass: 'green' },
                  { icon: Clock,       label: 'Next Eligible',   value: nextDonationDate, borderClass: 'border-blue',   bgClass: 'orange', isSm: true },
                  { icon: Award,       label: 'Badges Earned',   value: '3 / 6',                                       borderClass: 'border-purple', bgClass: 'purple' },
                ].map((s, i) => {
                  const Icon = s.icon
                  return (
                    <div key={i} className={`stat-card ${s.borderClass}`}>
                      <div className="stat-card-top">
                        <div className="stat-label-muted">{s.label}</div>
                        <div className={`stat-icon-circle ${s.bgClass}`}><Icon size={20} /></div>
                      </div>
                      <div className="stat-card-main">
                        <span className={`stat-number-hero ${s.isSm ? 'text-sm' : ''}`}>{s.value}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="glass-card" style={{ marginBottom: 24 }}>
                <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>⭐ Trust Score</h3>
                  <span className="badge badge-yellow">{donor.trustScore || 87} / 100</span>
                </div>
                <div className="trust-meter">
                  <div className="trust-fill high" style={{ width: `${donor.trustScore || 87}%` }} />
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 8 }}>Score increases with every verified donation. Reach 100 to unlock VIP status.</p>
              </div>

              <div className="glass-card" style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>📋 Recent Donations</h3>
                <div className="timeline">
                  {MOCK_DONATIONS.slice(0, 2).map(d => (
                    <div key={d.id} className="timeline-item">
                      <div className="timeline-dot" />
                      <div className="flex justify-between items-center">
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{d.bank}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{d.date} • {d.city}</div>
                        </div>
                        <div className="flex gap-sm">
                          <span className="blood-badge" style={{ width: 32, height: 32, fontSize: '0.7rem' }}>{d.group}</span>
                          {d.certified && <span className="badge badge-green">✅ Certified</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('history')}>View All →</button>
              </div>

              <div className="glass-card">
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>
                  🔔 Emergency Alerts Near You
                  {pendingAlerts.length > 0 && (
                    <span style={{ marginLeft: 8, fontSize: '0.75rem', background: '#FF1744', color: '#fff', padding: '2px 8px', borderRadius: 999, fontWeight: 800 }}>
                      {pendingAlerts.length} Pending
                    </span>
                  )}
                </h3>
                {alerts.slice(0, 3).map(alert => {
                  const miniCommitment = scheduledCommitments[alert.id]
                  return (
                    <div key={alert.id} className="alert-row" style={{ borderLeft: `3px solid ${alert.urgency === 'critical' ? '#FF1744' : alert.urgency === 'high' ? '#FFB300' : '#29B6F6'}` }}>
                      <div className="flex justify-between items-center">
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                            {alert.hospital}
                            {alert.isLive && <span style={{ marginLeft: 6, fontSize: '0.65rem', background: '#FF1744', color: '#fff', padding: '1px 5px', borderRadius: 4 }}>LIVE</span>}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{alert.city} • {alert.time}</div>
                        </div>
                        <div className="flex gap-sm items-center">
                          <span className="blood-badge" style={{ width: 32, height: 32, fontSize: '0.7rem' }}>{alert.group}</span>
                          <span className={`badge ${alert.urgency === 'critical' ? 'badge-red' : alert.urgency === 'high' ? 'badge-yellow' : 'badge-blue'}`}>{alert.urgency}</span>
                          {alert.responded ? (
                            <button
                              id={`dashboard-mini-responded-${alert.id}`}
                              className="badge badge-green"
                              style={{ cursor: 'pointer', border: 'none', background: 'rgba(0,230,118,0.15)', color: '#00E676' }}
                              title={miniCommitment ? `Scheduled: ${miniCommitment.date} (${miniCommitment.timeSlot}) — click to view` : 'You responded'}
                              onClick={() => handleStartSchedule(alert)}
                            >
                              ✅ Responded
                            </button>
                          ) : (
                            <button
                              id={`dashboard-mini-respond-${alert.id}`}
                              className="btn btn-primary btn-sm"
                              onClick={() => handleStartSchedule(alert)}
                            >
                              Respond
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setActiveTab('alerts')}>
                  View All Alerts →
                </button>
              </div>
            </div>
          )}

          {/* ── PROFILE ── */}
          {activeTab === 'profile' && (
            <div className="animate-fade-in">
              <div className="grid-2" style={{ marginBottom: 24 }}>
                <div className="glass-card">
                  <div className="profile-header">
                    <div className="avatar" style={{ width: 80, height: 80, fontSize: '1.8rem' }}>{initials}</div>
                    <div>
                      <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{donor.name}</h2>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{donor.city} • Donor since 2024</p>
                      <div className="flex gap-sm" style={{ marginTop: 8 }}>
                        <span className="blood-badge blood-badge-lg">{donor.bloodGroup || 'O+'}</span>
                        <span className="badge badge-green">✅ Verified</span>
                      </div>
                    </div>
                  </div>
                  <div className="divider" />
                  <div className="profile-details">
                    {[
                      { l: 'Email',          v: donor.email || 'arjun@example.com' },
                      { l: 'Phone',          v: '+91 98765 43210' },
                      { l: 'Blood Group',    v: donor.bloodGroup || 'O+' },
                      { l: 'City',           v: donor.city || 'Nagpur' },
                      { l: 'Last Donation',  v: '15 May 2026' },
                      { l: 'Total Donations',v: '3 verified' },
                    ].map((row, i) => (
                      <div key={i} className="preview-row">
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{row.l}</span>
                        <strong style={{ fontSize: '0.9rem' }}>{row.v}</strong>
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-secondary w-full" style={{ marginTop: 16 }}>✏️ Edit Profile</button>
                </div>
                <div>
                  <div className="glass-card" style={{ marginBottom: 16 }}>
                    <h3 style={{ fontWeight: 700, marginBottom: 16 }}>⭐ Trust Score Breakdown</h3>
                    {[
                      { label: 'Verified Donations',    points: 60, max: 100 },
                      { label: 'Response Rate',         points: 20, max: 30 },
                      { label: 'Profile Completeness',  points: 7,  max: 20 },
                    ].map((item, i) => (
                      <div key={i} style={{ marginBottom: 16 }}>
                        <div className="flex justify-between" style={{ marginBottom: 6, fontSize: '0.85rem' }}>
                          <span>{item.label}</span>
                          <span style={{ color: 'var(--color-text-muted)' }}>{item.points}/{item.max}</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${(item.points / item.max) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                    <div className="glass-card" style={{ cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setActiveTab('eligibility')}>
                      <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
                        <h3 style={{ fontWeight: 700, margin: 0 }}>🩺 Eligibility Status</h3>
                        <span style={{ fontSize: '0.75rem', color: '#00E676', fontWeight: 600 }}>Full Guide →</span>
                      </div>
                      <div className={`eligibility-badge ${donor.eligible !== false ? 'eligible' : 'not-eligible'}`} style={{ display: 'block', textAlign: 'center', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: 12 }}>
                        {donor.eligible !== false ? '✅ Currently Eligible to Donate' : `⏳ Next Eligible: ${donor.nextEligible}`}
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 12 }}>
                        90-day rule: Wait 90 days between whole blood donations. Last donation: 15 May 2026.
                      </p>
                      <button className="btn btn-secondary btn-sm w-full" onClick={(e) => { e.stopPropagation(); setActiveTab('eligibility') }}>
                        🔍 View Full Eligibility Criteria & Deferral Rules
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── ELIGIBILITY CRITERIA ── */}
            {activeTab === 'eligibility' && (
              <div className="animate-fade-in">
                {/* 1. Personal Eligibility Summary */}
                <div className="glass-card" style={{ marginBottom: 24, borderLeft: `4px solid ${donor.eligible !== false ? '#00E676' : '#FFB300'}` }}>
                  <div className="flex justify-between items-start" style={{ flexWrap: 'wrap', gap: 16 }}>
                    <div>
                      <div className="flex items-center gap-sm" style={{ marginBottom: 8 }}>
                        <span className={`badge ${donor.eligible !== false ? 'badge-green' : 'badge-yellow'}`} style={{ fontSize: '0.85rem', padding: '4px 12px' }}>
                          {donor.eligible !== false ? '✅ Currently Eligible to Donate' : '⏳ In 90-Day Cooldown Period'}
                        </span>
                        <span className="badge badge-red">🩸 Group: {donor.bloodGroup || 'O+'}</span>
                      </div>
                      <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '6px 0 4px' }}>
                        {donor.name || 'Pawan Deepak Gupta'}
                      </h2>
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>
                        Last Verified Whole Blood Donation: <strong>15 May 2026</strong> (105 days ago) • Cooldown Status: <strong>Cleared (0 days remaining)</strong>
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Next Safe Donation Window</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#00E676', marginTop: 2 }}>
                        {donor.eligible !== false ? '🟢 Available Today' : donor.nextEligible || '15 Aug 2026'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. General Eligibility Checklist Table */}
                <div className="glass-card" style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>📋 General Whole-Blood Donation Criteria</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                        Standard regulatory guidelines verified for safety of both donor and recipient.
                      </p>
                    </div>
                    <span className="badge badge-green">8 Verified Health Metrics</span>
                  </div>

                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Health / Medical Parameter</th>
                          <th>Standard Regulatory Rule</th>
                          <th>Your Profile Value</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { param: 'Age Limit', rule: '18 – 65 years', donorVal: '24 years', status: 'pass', note: 'Aadhaar Verified' },
                          { param: 'Body Weight', rule: 'Minimum 50 kg (110 lbs)', donorVal: '68 kg', status: 'pass', note: 'Profile Stored' },
                          { param: 'Hemoglobin Level', rule: 'At least 12.5 g/dL', donorVal: 'Checked at donation camp', status: 'camp', note: 'Spot check on-site' },
                          { param: 'Donation Interval', rule: 'Minimum 90 days between donations', donorVal: '105 days since last donation', status: 'pass', note: '90-Day Rule Cleared' },
                          { param: 'Pulse Rate', rule: '50 – 100 beats/min (Regular)', donorVal: 'Checked at donation camp', status: 'camp', note: 'Vitals at check-in' },
                          { param: 'Blood Pressure', rule: 'Systolic 100–180 / Diastolic 50–100 mmHg', donorVal: 'Checked at donation camp', status: 'camp', note: 'Vitals at check-in' },
                          { param: 'Body Temperature', rule: 'Normal (No fever / < 37.5°C)', donorVal: 'Checked at donation camp', status: 'camp', note: 'Thermometry check' },
                          { param: 'General Health', rule: 'No active cold, flu, infection, or antibiotics', donorVal: 'Self-certified Good Health', status: 'pass', note: 'Self-Attested' },
                        ].map((item, idx) => (
                          <tr key={idx}>
                            <td><strong>{item.param}</strong></td>
                            <td style={{ color: '#0F172A', fontSize: '0.85rem', fontWeight: 500 }}>{item.rule}</td>
                            <td>
                              <span style={{ fontSize: '0.85rem', color: '#0F172A', fontWeight: 600 }}>
                                {item.donorVal}
                              </span>
                            </td>
                            <td>
                              {item.status === 'pass' ? (
                                <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  ✅ Meets Criteria
                                </span>
                              ) : (
                                <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', fontSize: '0.72rem' }}>
                                  ℹ️ Checked at Camp
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. Temporary Deferral Reasons */}
                <div className="glass-card" style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: 4 }}>⏳ Temporary Deferral Reasons & Wait Periods</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 16 }}>
                    Common conditions requiring a temporary cooldown window before donating blood:
                  </p>
                  <div className="grid-3">
                    {[
                      { icon: '🎨', title: 'Tattoo or Body Piercing', wait: 'Wait 6 Months', desc: 'From the date of piercing/tattooing to ensure blood safety.' },
                      { icon: '👶', title: 'Pregnancy & Post-Delivery', wait: 'Wait 6 Months', desc: 'Wait 6 months after full-term delivery and while actively nursing.' },
                      { icon: '🩺', title: 'Major Surgical Procedure', wait: 'Wait 6–12 Months', desc: 'Depending on the surgical scope and full post-operative recovery.' },
                      { icon: '💉', title: 'Recent Vaccination', wait: 'Wait 2–4 Weeks', desc: 'Depending on whether live-attenuated or mRNA/inactivated vaccine.' },
                      { icon: '🦟', title: 'Travel to Malaria Endemic Area', wait: 'Wait 3–12 Months', desc: 'Depending on regional transmission risk and prophylaxis treatment.' },
                      { icon: '🩸', title: 'Low Hemoglobin (< 12.5 g/dL)', wait: 'Until Recovered', desc: 'Dietary iron recovery required before immediate re-testing.' },
                    ].map((def, i) => (
                      <div key={i} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', padding: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <span style={{ fontSize: '1.5rem' }}>{def.icon}</span>
                          <span className="badge badge-yellow" style={{ fontSize: '0.72rem', fontWeight: 700 }}>{def.wait}</span>
                        </div>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 4px', color: '#0F172A' }}>{def.title}</h4>
                        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.4 }}>{def.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Permanent Deferral / Exclusion Criteria */}
                <div className="glass-card" style={{ marginBottom: 24, borderLeft: '4px solid #DC2626', background: '#FEF2F2' }}>
                  <div className="flex items-center gap-sm" style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#ff6b81' }}>
                      Permanent Deferral / Medical Exclusion Criteria
                    </h3>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#334155', marginBottom: 14, fontWeight: 500 }}>
                    Individuals with the following medical histories are permanently excluded from blood donation for patient transfusion safety:
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, marginBottom: 14 }}>
                    {[
                      '• Confirmed HIV/AIDS or positive screening antibodies',
                      '• Chronic or active Hepatitis B or Hepatitis C',
                      '• Chronic severe cardiac, renal, liver, or respiratory disease',
                      '• History of hematological malignancies or specific cancers',
                      '• Bleeding disorders or use of specific blood thinners',
                      '• Intravenous drug use history',
                    ].map((text, i) => (
                      <div key={i} style={{ fontSize: '0.8rem', color: '#fca5a5', background: 'rgba(255, 71, 87, 0.08)', padding: '8px 12px', borderRadius: 6 }}>
                        {text}
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#94a3b8', fontStyle: 'italic', borderTop: '1px solid rgba(255, 71, 87, 0.2)', paddingTop: 8 }}>
                    ℹ️ <strong>Medical Notice:</strong> This checklist provides general public health guidance only. Final clinical eligibility is always confirmed by certified medical officers at the blood bank or donation camp during mandatory on-site screening.
                  </div>
                </div>

                {/* 5. What Happens Next / Action Section */}
                <div className="glass-card" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                  <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 16 }}>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                        Ready to Save Lives in Nagpur?
                      </h3>
                      <p style={{ fontSize: '0.82rem', color: '#334155', margin: '4px 0 0', fontWeight: 500 }}>
                        You will receive instant automated WhatsApp &amp; SMS alerts whenever a nearby hospital requests <strong>{donor.bloodGroup || 'O+'}</strong> blood.
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('map')}>
                        🗺️ Find Nearby Blood Banks
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => setActiveTab('alerts')}>
                        🔔 View Live Emergency Alerts ({pendingAlerts.length})
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* ── HISTORY ── */}
          {activeTab === 'history' && (() => {
            const selectedDonation = MOCK_DONATIONS.find(d => d.id === selectedDonationId) || MOCK_DONATIONS[0]
            return (
              <div className="animate-fade-in">
                <div className="table-wrapper" style={{ marginBottom: 24 }}>
                  <div style={{ padding: '16px 20px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>📋 Verified Donation Records</h3>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748B' }}>Click on any donation record to view its real-time <strong>"Journey of Blood"</strong> 4-stage lifecycle tracker.</p>
                    </div>
                    <span className="badge badge-green">{MOCK_DONATIONS.length} Verified Donations</span>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>Bag / Donation ID</th>
                        <th>Donation Date</th>
                        <th>Blood Bank / Facility</th>
                        <th>City</th>
                        <th>Group</th>
                        <th>Units</th>
                        <th>Current Lifecycle Stage</th>
                        <th>Provenance & Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MOCK_DONATIONS.map(d => {
                        const isSelected = selectedDonationId === d.id
                        return (
                          <tr key={d.id} style={{ cursor: 'pointer', background: isSelected ? '#FEF2F2' : 'transparent', transition: 'background 0.2s' }}
                            onClick={() => {
                              setSelectedDonationId(d.id)
                              setSelectedBagId(d.bagId)
                              setSelectedBagGroup(d.group)
                              setSelectedBankName(d.bank)
                            }}>
                            <td><strong style={{ color: '#DC2626' }}>{d.bagId}</strong></td>
                            <td>{d.date}</td>
                            <td><strong>{d.bank}</strong></td>
                            <td>{d.city}</td>
                            <td><span className="blood-badge" style={{ width: 30, height: 30, fontSize: '0.7rem' }}>{d.group}</span></td>
                            <td>{d.units} unit</td>
                            <td>
                              {d.currentStage === 'transfused' && (
                                <span className="badge badge-green" style={{ fontSize: '0.75rem' }}>✅ Transfused</span>
                              )}
                              {d.currentStage === 'transit' && (
                                <span className="badge badge-blue" style={{ fontSize: '0.75rem' }}>🚚 In Transit</span>
                              )}
                              {d.currentStage === 'tested' && (
                                <span className="badge badge-yellow" style={{ fontSize: '0.75rem' }}>🧪 Tested & Cleared</span>
                              )}
                              {d.currentStage === 'collected' && (
                                <span className="badge badge-red" style={{ fontSize: '0.75rem' }}>🩸 Collected</span>
                              )}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  className="btn btn-sm"
                                  style={{
                                    background: isSelected ? '#DC2626' : '#FFFFFF',
                                    color: isSelected ? '#FFFFFF' : '#0F172A',
                                    border: isSelected ? '1px solid #DC2626' : '1px solid #CBD5E1',
                                    padding: '4px 10px',
                                    fontSize: '0.75rem',
                                    borderRadius: 6
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedDonationId(d.id)
                                    setSelectedBagId(d.bagId)
                                    setSelectedBagGroup(d.group)
                                    setSelectedBankName(d.bank)
                                  }}
                                >
                                  {isSelected ? '📍 Active Tracker' : '🔍 View Journey'}
                                </button>
                                <Link
                                  to={`/certificate/BC-2026-HERO-${d.id}`}
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  🏆 Certificate
                                </Link>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <JourneyOfBloodTracker
                  donationRecord={selectedDonation}
                  donationId={selectedDonation.bagId}
                  initialGroup={selectedDonation.group}
                  bankName={selectedDonation.bank}
                />
              </div>
            )
          })()}

          {/* ── BADGES ── */}
          {activeTab === 'badges' && (
            <div className="animate-fade-in">
              <div className="grid-3">
                {BADGES.map((badge, i) => (
                  <div key={i} className={`glass-card text-center ${!badge.earned ? 'badge-locked' : ''}`}>
                    <div style={{ fontSize: '3rem', marginBottom: 12, filter: badge.earned ? 'none' : 'grayscale(1) opacity(0.4)' }}>{badge.icon}</div>
                    <h3 style={{ fontWeight: 700, marginBottom: 4 }}>{badge.name}</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{badge.desc}</p>
                    <div style={{ marginTop: 12 }}>
                      {badge.earned ? <span className="badge badge-green">✅ Earned</span> : <span className="badge" style={{ opacity: 0.5 }}>🔒 Locked</span>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="glass-card" style={{ marginTop: 24, textAlign: 'center' }}>
                <h3 style={{ fontWeight: 700, marginBottom: 8 }}>🏙️ City Leaderboard — {donor.city || 'Nagpur'}</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: 16 }}>Your rank: #47 out of 2,340 donors</p>
                {[
                  { rank: 1, name: 'Priya M.', group: 'A+', donations: 24 },
                  { rank: 2, name: 'Rahul S.', group: 'O+', donations: 21 },
                  { rank: 3, name: 'Anita K.', group: 'B+', donations: 19 },
                  { rank: 47, name: `${donor.name} (You)`, group: 'O+', donations: 3 },
                ].map(entry => (
                  <div key={entry.rank} className={`alert-row ${entry.rank === 47 ? 'highlight-row' : ''}`}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-md">
                        <span style={{ fontWeight: 800, fontSize: '1.2rem', color: entry.rank <= 3 ? 'var(--color-gold)' : 'var(--color-text-muted)', minWidth: 30 }}>#{entry.rank}</span>
                        <span>{entry.name}</span>
                      </div>
                      <div className="flex gap-sm">
                        <span className="blood-badge" style={{ width: 28, height: 28, fontSize: '0.65rem' }}>{entry.group}</span>
                        <span style={{ color: 'var(--color-primary-light)', fontWeight: 700 }}>{entry.donations} donations</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── ALERTS (Full Page) ── */}
          {activeTab === 'alerts' && (
            <div className="animate-fade-in">
              <div className="alert alert-info" style={{ marginBottom: 24 }}>
                🔔 You have <strong>{pendingAlerts.length}</strong> pending emergency alerts near you.
                {isConnected && <span style={{ marginLeft: 8, color: '#00E676', fontSize: '0.8rem' }}>🟢 Receiving live alerts</span>}
              </div>
              {alerts.length === 0 && (
                <div className="glass-card" style={{ textAlign: 'center', padding: 40 }}>
                  <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔔</div>
                  <p style={{ color: 'var(--color-text-muted)' }}>No emergency alerts at this time. You'll be notified in real-time when blood is needed nearby.</p>
                </div>
              )}
              {alerts.map(alert => {
                const commitment = scheduledCommitments[alert.id]
                return (
                  <div key={alert.id} className="glass-card" style={{ marginBottom: 16, borderLeft: `4px solid ${alert.urgency === 'critical' ? '#FF1744' : alert.urgency === 'high' ? '#FFB300' : '#29B6F6'}` }}>
                    <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 14 }}>
                      <div>
                        <div className="flex gap-sm items-center" style={{ marginBottom: 8 }}>
                          <span className={`badge ${alert.urgency === 'critical' ? 'badge-red' : alert.urgency === 'high' ? 'badge-yellow' : 'badge-blue'}`}>
                            {alert.urgency.toUpperCase()}
                          </span>
                          <span className="blood-badge" style={{ width: 32, height: 32, fontSize: '0.7rem' }}>{alert.group}</span>
                          {alert.isLive && (
                            <span style={{ fontSize: '0.7rem', background: '#FF1744', color: '#fff', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                              LIVE
                            </span>
                          )}
                        </div>
                        <h3 style={{ fontWeight: 700, margin: '0 0 4px 0' }}>{alert.hospital}</h3>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: 0 }}>{alert.city} • {alert.time}</p>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', color: '#25D366', marginTop: 6, background: 'rgba(37, 211, 102, 0.1)', padding: '2px 8px', borderRadius: 6, border: '1px solid rgba(37, 211, 102, 0.25)' }}>
                          <span>📲 Notified via WhatsApp Sandbox (Reply "YES" to confirm)</span>
                        </div>
                      </div>
                      <div>
                        {alert.responded ? (
                          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                            <span className="badge badge-green" style={{ fontSize: '0.82rem', padding: '6px 14px' }}>
                              ✅ You Responded
                            </span>
                            {commitment && (
                              <div style={{ fontSize: '0.74rem', color: '#047857', fontWeight: 600 }}>
                                📅 {commitment.date} ({commitment.timeSlot})
                              </div>
                            )}
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: '0.74rem', padding: '2px 6px', color: '#0284C7', textDecoration: 'underline' }}
                              onClick={() => handleStartSchedule(alert)}
                            >
                              View Confirmation / Reschedule ➔
                            </button>
                          </div>
                        ) : (
                          <button
                            id={`respond-btn-${alert.id}`}
                            className="btn btn-danger"
                            onClick={() => handleStartSchedule(alert)}
                            style={{ fontWeight: 800, padding: '10px 20px' }}
                          >
                            🩸 I Can Donate
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── NEARBY BLOOD BANKS (NAGPUR REGION) ── */}
          {activeTab === 'map' && (
            <div className="animate-fade-in">
              {/* Header & Overview */}
              <div className="flex justify-between items-center" style={{ marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                    🗺️ Nearby Blood Banks in {donor.city || 'Nagpur'}
                  </h2>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                    Real-time stock levels, distances from your location, and component availability across 8 verified regional facilities.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, background: 'rgba(255, 255, 255, 0.06)', padding: 4, borderRadius: 8 }}>
                  <button
                    className={`btn btn-sm ${bankViewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setBankViewMode('list')}
                    style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                  >
                    📋 List View (8 Banks)
                  </button>
                  <button
                    className={`btn btn-sm ${bankViewMode === 'map' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setBankViewMode('map')}
                    style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                  >
                    🗺️ Live Map Telemetry
                  </button>
                </div>
              </div>

              {/* Filters, Search & Sort Bar */}
              <div className="glass-card" style={{ marginBottom: 20, padding: 16 }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: 10, color: '#94a3b8' }}>🔍</span>
                    <input
                      type="text"
                      placeholder="Search bank name or locality (e.g. Sitabuldi, Dhantoli, Mayo, GMCH)..."
                      value={bankSearch}
                      onChange={e => setBankSearch(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 8, background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Sort by:</span>
                    <select
                      value={bankSortBy}
                      onChange={e => setBankSortBy(e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: 8, background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', fontWeight: 600, fontSize: '0.82rem' }}
                    >
                      <option value="distance">📍 Nearest First (Distance)</option>
                      <option value="stock">📈 Highest Total Stock First</option>
                      <option value="critical">🚨 Critical Shortage First</option>
                    </select>
                  </div>
                </div>

                {/* Blood Group Filter Chips */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Filter Blood Group:</span>
                  {['All', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => {
                    const isSelected = bankGroupFilter === bg
                    const isDonorGroup = bg === (donor.bloodGroup || 'O+')
                    return (
                      <button
                        key={bg}
                        onClick={() => setBankGroupFilter(bg)}
                        style={{
                          background: isSelected ? '#ff4757' : isDonorGroup ? 'rgba(255, 71, 87, 0.15)' : 'rgba(255,255,255,0.06)',
                          color: isSelected ? '#fff' : isDonorGroup ? '#ff6b81' : '#cbd5e1',
                          border: isSelected ? '1px solid #ff4757' : isDonorGroup ? '1px solid rgba(255, 71, 87, 0.4)' : '1px solid rgba(255,255,255,0.08)',
                          padding: '4px 10px',
                          borderRadius: 20,
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        {bg}
                        {isDonorGroup && bg !== 'All' && <span style={{ fontSize: '0.65rem' }}>🎯 (You)</span>}
                      </button>
                    )
                  })}
                </div>

                {/* Blood Component Filter — e-RaktKosh 14-type dropdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Filter Component:</span>
                  <select
                    value={bankComponentFilter}
                    onChange={e => setBankComponentFilter(e.target.value)}
                    style={{ padding: '6px 12px', borderRadius: 8, background: '#FFFFFF', border: '1px solid #CBD5E1',
                      color: '#0F172A', fontWeight: 600, fontSize: '0.82rem', minWidth: 220 }}
                  >
                    <option value="All">🦸 All Component Types</option>
                    {ERAKTKOSH_COMPONENTS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {bankComponentFilter !== 'All' && (
                    <button
                      onClick={() => setBankComponentFilter('All')}
                      style={{ background: 'rgba(255,71,87,0.12)', color: '#ff4757', border: '1px solid rgba(255,71,87,0.3)',
                        borderRadius: 6, padding: '4px 10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.76rem' }}
                    >
                      × Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Threshold Legend */}
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16, fontSize: '0.78rem', color: '#94a3b8' }}>
                <span>Stock Indicators:</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#00E676' }}></span> Sufficient (&gt;15)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFB300' }}></span> Low (4–15)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF1744' }}></span> Critical (≤3)
                </span>
              </div>

              {/* ── LIST VIEW (PRIMARY) ── */}
              {bankViewMode === 'list' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {NAGPUR_NEARBY_BANKS
                    .filter(b => {
                      const matchesSearch = bankSearch === '' ||
                        b.name.toLowerCase().includes(bankSearch.toLowerCase()) ||
                        b.locality.toLowerCase().includes(bankSearch.toLowerCase()) ||
                        b.address.toLowerCase().includes(bankSearch.toLowerCase())
                      // Component filter: bank must have > 0 units of the selected component
                      const matchesComponent = bankComponentFilter === 'All' ||
                        (b.components && b.components[bankComponentFilter] > 0)
                      return matchesSearch && matchesComponent
                    })
                    .sort((a, b) => {
                      if (bankSortBy === 'distance') return a.distanceKm - b.distanceKm
                      if (bankSortBy === 'stock') {
                        const totalA = Object.values(a.inventory).reduce((x, y) => x + y, 0)
                        const totalB = Object.values(b.inventory).reduce((x, y) => x + y, 0)
                        return totalB - totalA
                      }
                      if (bankSortBy === 'critical') {
                        const critA = Object.values(a.inventory).filter(v => v <= 3).length
                        const critB = Object.values(b.inventory).filter(v => v <= 3).length
                        return critB - critA
                      }
                      return 0
                    })
                    .map(b => {
                      const totalUnits = Object.values(b.inventory).reduce((x, y) => x + y, 0)
                      const donorGrp = donor.bloodGroup || 'O+'
                      const donorUnits = b.inventory[donorGrp] || 0
                      const isExpanded = selectedBankDetail?.id === b.id

                      return (
                        <div
                          key={b.id}
                          className="glass-card"
                          style={{
                            borderLeft: `4px solid ${b.distanceKm <= 2.5 ? '#00E676' : '#29B6F6'}`,
                            padding: '18px 20px',
                            transition: 'all 0.2s',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, background: 'rgba(41, 182, 246, 0.15)', color: '#38bdf8', padding: '2px 8px', borderRadius: 4 }}>
                                  {b.id}
                                </span>
                                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                                  {b.name}
                                </h3>
                                <span className="badge badge-green" style={{ fontSize: '0.72rem' }}>
                                  🟢 Verified Bio-Depot
                                </span>
                              </div>
                          {/* Staleness indicator */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                            <p style={{ fontSize: '0.82rem', color: '#334155', margin: '2px 0 6px' }}>
                              📍 <strong>{b.distanceKm} km away</strong> • {b.locality} &nbsp;•&nbsp; <span style={{ color: '#94a3b8' }}>{b.hours}</span>
                            </p>
                            {isBankStale(b.lastUpdated) ? (
                              <span style={{ fontSize: '0.72rem', background: '#fef3c7', color: '#b45309', border: '1px solid #f59e0b',
                                borderRadius: 6, padding: '2px 8px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                ⚠️ Stale data · {formatBankUpdated(b.lastUpdated)}
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                🔄 {formatBankUpdated(b.lastUpdated)}
                              </span>
                            )}
                          </div>
                            </div>

                            {/* Donor's Group Highlight & Total Units Badge */}
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <div style={{
                                background: donorUnits <= 3 ? 'rgba(255, 23, 68, 0.15)' : 'rgba(0, 230, 118, 0.15)',
                                border: `1px solid ${donorUnits <= 3 ? '#FF1744' : '#00E676'}`,
                                borderRadius: 8,
                                padding: '6px 12px',
                                textAlign: 'right'
                              }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                                  🎯 Your Group ({donorGrp})
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: 800, color: donorUnits <= 3 ? '#FF1744' : '#00E676' }}>
                                  {donorUnits} Units {donorUnits <= 3 ? '⚠️ Low' : '✅'}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right', background: 'rgba(255,255,255,0.04)', padding: '6px 12px', borderRadius: 8 }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Total Stock</div>
                                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>{totalUnits} u</div>
                              </div>
                            </div>
                          </div>

                          {/* 8-Blood Group Compact Stock Strip */}
                          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>
                              Available Stock Strip by Blood Group:
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))', gap: 8 }}>
                              {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => {
                                const count = b.inventory[bg] || 0
                                const isSelfGroup = bg === donorGrp
                                const isHighlightMatch = bankGroupFilter === bg || bankGroupFilter === 'All'
                                const statusColor = count > 15 ? '#00E676' : count >= 4 ? '#FFB300' : '#FF1744'
                                const statusBg = count > 15 ? 'rgba(0, 230, 118, 0.12)' : count >= 4 ? 'rgba(255, 179, 0, 0.12)' : 'rgba(255, 23, 68, 0.15)'

                                return (
                                  <div
                                    key={bg}
                                    style={{
                                      background: statusBg,
                                      border: isSelfGroup ? `2px solid ${statusColor}` : `1px solid ${statusColor}44`,
                                      borderRadius: 6,
                                      padding: '6px 4px',
                                      textAlign: 'center',
                                      opacity: isHighlightMatch ? 1 : 0.4,
                                      position: 'relative'
                                    }}
                                  >
                                    {isSelfGroup && (
                                      <span style={{ position: 'absolute', top: -7, right: -4, fontSize: '0.65rem' }}>🎯</span>
                                    )}
                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155' }}>{bg}</div>
                                    <div style={{ fontSize: '0.92rem', fontWeight: 900, color: statusColor, marginTop: 2 }}>{count}</div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          {/* Action buttons row */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              🔄 Updated {formatBankUpdated(b.lastUpdated)} • Helpline: <strong>{b.phone}</strong>
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <button
                                id={`call-btn-${b.id.replace(/\s+/g, '-').toLowerCase()}`}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                                onClick={() => {
                                  setCallModalBank(b)
                                  setCopiedPhone(false)
                                }}
                              >
                                <Phone size={13} color="#DC2626" /> Call Bank
                              </button>
                              <button
                                id={`directions-btn-${b.id.replace(/\s+/g, '-').toLowerCase()}`}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                                onClick={() => handleGetDirections(b)}
                              >
                                <Navigation size={13} color="#0284C7" /> Directions
                              </button>
                              <button
                                id={`comp-btn-${b.id.replace(/\s+/g, '-').toLowerCase()}`}
                                className="btn btn-primary btn-sm"
                                style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                                onClick={() => setComponentModalBank(b)}
                              >
                                <Layers size={13} /> Component Breakdown
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}

              {/* ── MAP VIEW (SECONDARY TOGGLE) ── */}
              {bankViewMode === 'map' && (
                <div className="glass-card" style={{ padding: 16 }}>
                  <InventoryMap selectedBloodGroup={bankGroupFilter === 'All' ? (donor.bloodGroup || 'O+') : bankGroupFilter} />
                </div>
              )}

              {/* ── CALL HELPLINE MODAL ── */}
              {callModalBank && (
                <div
                  className="modal-backdrop animate-fade-in"
                  style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: 16
                  }}
                  onClick={() => setCallModalBank(null)}
                >
                  <div
                    className="glass-card"
                    style={{
                      background: '#FFFFFF',
                      borderRadius: 14,
                      maxWidth: 460,
                      width: '100%',
                      padding: 24,
                      boxShadow: '0 20px 45px rgba(0,0,0,0.2)',
                      border: '1px solid #CBD5E1',
                      position: 'relative',
                      color: '#0F172A'
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setCallModalBank(null)}
                      style={{
                        position: 'absolute',
                        top: 14,
                        right: 14,
                        background: '#F1F5F9',
                        border: 'none',
                        borderRadius: '50%',
                        width: 32,
                        height: 32,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#64748B'
                      }}
                    >
                      <X size={16} />
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626' }}>
                        <Phone size={20} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#DC2626', textTransform: 'uppercase' }}>
                          Verified 24/7 Transfusion Helpline
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
                          {callModalBank.name}
                        </h3>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                      📍 {callModalBank.address} • {callModalBank.hours}
                    </p>

                    {/* Prominent Phone Number Display */}
                    <div style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: 10,
                      padding: '16px',
                      textAlign: 'center',
                      marginBottom: 18
                    }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Direct Bio-Depot Line
                      </div>
                      <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0F172A', letterSpacing: '0.5px', marginTop: 4 }}>
                        {callModalBank.phone}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 700, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669' }} /> Live Transfusion Desk Active
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <button
                        className="btn btn-secondary w-full"
                        onClick={() => handleCopyPhone(callModalBank.phone)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 14px', fontSize: '0.85rem' }}
                      >
                        {copiedPhone ? <Check size={16} color="#059669" /> : <Copy size={16} />}
                        <span>{copiedPhone ? 'Copied!' : 'Copy Number'}</span>
                      </button>

                      <a
                        href={`tel:${callModalBank.phone.replace(/[^0-9+]/g, '')}`}
                        className="btn btn-primary w-full"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none', padding: '10px 14px', fontSize: '0.85rem' }}
                      >
                        <Phone size={16} />
                        <span>Call Now</span>
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* ── COMPONENT BREAKDOWN MODAL (e-RaktKosh 14-type) ── */}
              {componentModalBank && (() => {
                const comps = componentModalBank.components || {}
                const totalAllComponents = Object.values(comps).reduce((s, v) => s + v, 0)
                const ERAKTKOSH_COMPONENTS_LIST = [
                  'Whole Blood', 'Packed Red Blood Cells', 'Sagm Packed Red Blood Cells',
                  'Irradiated RBC', 'Leukoreduced RBC', 'Fresh Frozen Plasma', 'Cryo Poor Plasma',
                  'Cryoprecipitate', 'Plasma', 'Single Donor Plasma', 'Platelet Concentrate',
                  'Platelet Rich Plasma', 'Random Donor Platelets', 'Single Donor Platelet',
                ]
                const COMP_CATEGORIES = {
                  'Whole Blood': { cat: 'Red Cell', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
                  'Packed Red Blood Cells': { cat: 'Red Cell', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
                  'Sagm Packed Red Blood Cells': { cat: 'Red Cell', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
                  'Irradiated RBC': { cat: 'Red Cell', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
                  'Leukoreduced RBC': { cat: 'Red Cell', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
                  'Fresh Frozen Plasma': { cat: 'Plasma', color: '#0284C7', bg: '#EFF6FF', border: '#BFDBFE' },
                  'Cryo Poor Plasma': { cat: 'Plasma', color: '#0284C7', bg: '#EFF6FF', border: '#BFDBFE' },
                  'Cryoprecipitate': { cat: 'Plasma', color: '#0284C7', bg: '#EFF6FF', border: '#BFDBFE' },
                  'Plasma': { cat: 'Plasma', color: '#0284C7', bg: '#EFF6FF', border: '#BFDBFE' },
                  'Single Donor Plasma': { cat: 'Plasma', color: '#0284C7', bg: '#EFF6FF', border: '#BFDBFE' },
                  'Platelet Concentrate': { cat: 'Platelet', color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
                  'Platelet Rich Plasma': { cat: 'Platelet', color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
                  'Random Donor Platelets': { cat: 'Platelet', color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
                  'Single Donor Platelet': { cat: 'Platelet', color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
                }

                return (
                  <div
                    className="modal-backdrop animate-fade-in"
                    style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}
                    onClick={() => setComponentModalBank(null)}
                  >
                    <div
                      className="glass-card"
                      style={{ background: '#FFFFFF', borderRadius: 14, maxWidth: 760, width: '100%',
                        maxHeight: '90vh', overflowY: 'auto', padding: 24,
                        boxShadow: '0 20px 45px rgba(0,0,0,0.2)', border: '1px solid #CBD5E1',
                        position: 'relative', color: '#0F172A' }}
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        onClick={() => setComponentModalBank(null)}
                        style={{ position: 'absolute', top: 16, right: 16, background: '#F1F5F9', border: 'none',
                          borderRadius: '50%', width: 32, height: 32, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}
                      >
                        <X size={16} />
                      </button>

                      {/* Modal Header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EFF6FF',
                          border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284C7' }}>
                          <Layers size={20} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0284C7', textTransform: 'uppercase' }}>
                            e-RaktKosh Component Inventory • All 14 Types
                          </div>
                          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0F172A' }}>
                            {componentModalBank.name}
                          </h3>
                        </div>
                      </div>

                      <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '0 0 8px 0' }}>
                        📍 {componentModalBank.address} • Helpline: <strong>{componentModalBank.phone}</strong>
                      </p>

                      {/* Staleness indicator */}
                      <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                        {isBankStale(componentModalBank.lastUpdated) ? (
                          <span style={{ fontSize: '0.78rem', background: '#fef3c7', color: '#b45309',
                            border: '1px solid #f59e0b', borderRadius: 6, padding: '3px 10px', fontWeight: 700 }}>
                            ⚠️ Stale data — last updated {formatBankUpdated(componentModalBank.lastUpdated)}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700 }}>
                            🔄 Live — updated {formatBankUpdated(componentModalBank.lastUpdated)}
                          </span>
                        )}
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {totalAllComponents} total units across all 14 component types
                        </span>
                      </div>

                      {/* 14-Row Component Table */}
                      <div className="table-wrapper" style={{ marginBottom: 16 }}>
                        <table style={{ width: '100%', fontSize: '0.82rem' }}>
                          <thead>
                            <tr style={{ background: '#F8FAFC', color: '#475569' }}>
                              <th style={{ width: 30 }}>#</th>
                              <th>Component Type <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 400 }}>(e-RaktKosh)</span></th>
                              <th>Category</th>
                              <th style={{ textAlign: 'right' }}>Units</th>
                              <th>Availability</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ERAKTKOSH_COMPONENTS_LIST.map((comp, idx) => {
                              const units = comps[comp] || 0
                              const meta = COMP_CATEGORIES[comp] || { cat: 'Other', color: '#64748b', bg: '#F8FAFC', border: '#CBD5E1' }
                              const avStatus = units >= 10 ? 'sufficient' : units >= 1 ? 'low' : 'out'
                              return (
                                <tr key={comp} style={{ background: idx % 2 === 0 ? '#ffffff' : '#F8FAFC' }}>
                                  <td style={{ color: '#94a3b8', fontWeight: 600 }}>{idx + 1}</td>
                                  <td style={{ fontWeight: 700, color: '#0F172A' }}>{comp}</td>
                                  <td>
                                    <span style={{ fontSize: '0.72rem', background: meta.bg, color: meta.color,
                                      border: `1px solid ${meta.border}`, borderRadius: 4, padding: '2px 7px', fontWeight: 600 }}>
                                      {meta.cat}
                                    </span>
                                  </td>
                                  <td style={{ textAlign: 'right', fontWeight: 900, color: units === 0 ? '#94a3b8' : '#0F172A' }}>
                                    {units} <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '0.75rem' }}>u</span>
                                  </td>
                                  <td>
                                    {avStatus === 'sufficient' && <span className="badge badge-green">🟢 Sufficient (≥10)</span>}
                                    {avStatus === 'low' && <span className="badge badge-yellow">🟡 Low (1–9)</span>}
                                    {avStatus === 'out' && <span className="badge badge-red">🔴 Not Available</span>}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        flexWrap: 'wrap', gap: 10, paddingTop: 10, borderTop: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                          ℹ️ Component data per e-RaktKosh standard • Refreshed every 3 minutes
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleGetDirections(componentModalBank)}>
                            <Navigation size={13} /> Get Directions
                          </button>
                          <button className="btn btn-primary btn-sm" onClick={() => {
                            setCallModalBank(componentModalBank)
                            setComponentModalBank(null)
                          }}>
                            <Phone size={13} /> Call Helpline
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* ── COMMUNITY & NGO BROADCAST (FALLBACK CHANNEL) ── */}
          {activeTab === 'community' && (
            <div className="animate-fade-in">
              {/* Header Hero Banner */}
              <div style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f766e 100%)',
                borderRadius: 18,
                padding: '24px 28px',
                color: '#fff',
                marginBottom: 24,
                boxShadow: '0 8px 30px rgba(15, 23, 42, 0.15)',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{ position: 'relative', zIndex: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{
                      background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
                      color: '#fff',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: 20,
                      letterSpacing: '0.5px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}>
                      <Megaphone size={12} /> FALLBACK ESCALATION CHANNEL
                    </span>
                    <span style={{ color: '#5eead4', fontSize: '0.78rem', fontWeight: 700 }}>
                      ⚡ Direct Peer-to-Peer & NGO Reach
                    </span>
                  </div>

                  <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: '0 0 6px 0', color: '#fff', letterSpacing: '-0.3px' }}>
                    📢 Community & NGO Emergency Broadcast
                  </h2>
                  <p style={{ color: '#cbd5e1', fontSize: '0.88rem', margin: 0, maxWidth: 760, lineHeight: 1.5 }}>
                    When connected hospital and bank inventories face critical stockouts or rare group shortages,
                    instantly generate a shareable emergency broadcast to mobilize voluntary donors through
                    <strong> WhatsApp groups, Instagram stories</strong>, and <strong>Nagpur blood NGOs</strong>.
                  </p>
                </div>
              </div>

              {/* Toast Feedback */}
              {shareToast && (
                <div
                  className="animate-fade-in"
                  style={{
                    background: shareToast.type === 'whatsapp' ? '#dcfce7' : '#e0f2fe',
                    border: `1px solid ${shareToast.type === 'whatsapp' ? '#86efac' : '#7dd3fc'}`,
                    color: shareToast.type === 'whatsapp' ? '#166534' : '#0369a1',
                    borderRadius: 12,
                    padding: '12px 18px',
                    marginBottom: 20,
                    fontSize: '0.86rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{shareToast.type === 'whatsapp' ? '💬' : '📋'}</span>
                    <span>{shareToast.msg}</span>
                  </div>
                  <button
                    onClick={() => setShareToast(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 800 }}
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* TOP SECTION: Quick Broadcast Composer */}
              <div className="glass-card" style={{ marginBottom: 24, padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>✍️</span> 1. Quick Emergency Broadcast Composer
                    </h3>
                    <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '3px 0 0 0' }}>
                      Pre-fill details to automatically format an actionable, urgent broadcast message.
                    </p>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleRegenerateTemplate()}
                    title="Reset message to match form fields"
                  >
                    🔄 Refresh Template
                  </button>
                </div>

                {/* Form Inputs Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                      🩸 Blood Group Required
                    </label>
                    <select
                      className="form-select"
                      style={{ width: '100%' }}
                      value={bGroup}
                      onChange={e => {
                        setBGroup(e.target.value)
                        handleRegenerateTemplate(e.target.value, null, null, null, null, null)
                      }}
                    >
                      {['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+', 'Bombay (hh)'].map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                      🏥 Hospital Name
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ width: '100%' }}
                      value={bHospital}
                      onChange={e => {
                        setBHospital(e.target.value)
                        handleRegenerateTemplate(null, e.target.value, null, null, null, null)
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                      📍 Locality / Area
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ width: '100%' }}
                      value={bLocality}
                      onChange={e => {
                        setBLocality(e.target.value)
                        handleRegenerateTemplate(null, null, e.target.value, null, null, null)
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                      📊 Units Needed
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      className="form-input"
                      style={{ width: '100%' }}
                      value={bUnits}
                      onChange={e => {
                        setBUnits(e.target.value)
                        handleRegenerateTemplate(null, null, null, e.target.value, null, null)
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                      🚨 Urgency Level
                    </label>
                    <select
                      className="form-select"
                      style={{ width: '100%' }}
                      value={bUrgency}
                      onChange={e => {
                        setBUrgency(e.target.value)
                        handleRegenerateTemplate(null, null, null, null, e.target.value, null)
                      }}
                    >
                      <option value="Critical Code Red">🚨 Critical Code Red</option>
                      <option value="Emergency Surgery">⚡ Emergency Surgery</option>
                      <option value="High Priority">⏳ High Priority</option>
                      <option value="Thalassemia Day-Care">🩺 Thalassemia Day-Care</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                      📞 Emergency Helpline Phone
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ width: '100%' }}
                      value={bHelpline}
                      onChange={e => {
                        setBHelpline(e.target.value)
                        handleRegenerateTemplate(null, null, null, null, null, e.target.value)
                      }}
                    />
                  </div>
                </div>

                {/* Editable Message Textarea Box */}
                <div style={{ marginBottom: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>
                      📋 Formatted Broadcast Message (Editable Preview):
                    </label>
                    <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      {bCustomMsg.length} characters • Ready to Send
                    </span>
                  </div>
                  <textarea
                    id="broadcast-custom-textarea"
                    rows={4}
                    className="form-input"
                    style={{
                      width: '100%',
                      fontFamily: 'inherit',
                      fontSize: '0.88rem',
                      lineHeight: 1.5,
                      padding: '12px 14px',
                      borderRadius: 10,
                      resize: 'vertical',
                      background: '#f8fafc',
                      border: '1.5px solid #cbd5e1',
                      color: '#0f172a',
                    }}
                    value={bCustomMsg}
                    onChange={e => setBCustomMsg(e.target.value)}
                  />
                </div>

                {/* 3 Share Action Buttons */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {/* Button 1: Share on WhatsApp */}
                  <button
                    id="btn-share-whatsapp"
                    style={{
                      flex: '1 1 200px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 10,
                      padding: '12px 20px',
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(34, 197, 94, 0.35)',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    }}
                    onClick={() => {
                      const url = `https://wa.me/?text=${encodeURIComponent(bCustomMsg)}`
                      window.open(url, '_blank', 'noopener,noreferrer')
                      setBroadcastSentCount(prev => prev + 1)
                      setShareToast({ type: 'whatsapp', msg: 'Opening WhatsApp! Select any family, group, or contact to broadcast instantly.' })
                    }}
                  >
                    <MessageCircle size={18} />
                    <span>Share on WhatsApp</span>
                    <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.25)', padding: '2px 6px', borderRadius: 10 }}>DIRECT</span>
                  </button>

                  {/* Button 2: Share on Instagram / Native Web Share */}
                  <button
                    id="btn-share-instagram"
                    style={{
                      flex: '1 1 200px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      background: 'linear-gradient(135deg, #ec4899 0%, #d946ef 50%, #8b5cf6 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 10,
                      padding: '12px 20px',
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(217, 70, 239, 0.35)',
                      transition: 'transform 0.15s ease',
                    }}
                    onClick={async () => {
                      if (navigator?.share) {
                        try {
                          await navigator.share({
                            title: `🩸 Urgent ${bGroup} Blood Needed — Nagpur`,
                            text: bCustomMsg,
                          })
                          setBroadcastSentCount(prev => prev + 1)
                          setShareToast({ type: 'whatsapp', msg: 'Shared via native app chooser!' })
                        } catch (err) {
                          if (err.name !== 'AbortError') {
                            if (navigator?.clipboard?.writeText) {
                              navigator.clipboard.writeText(bCustomMsg)
                              setCopiedBroadcast(true)
                              setShareToast({ type: 'copy', msg: '📋 Message copied! Open Instagram Story / DM and paste to share.' })
                              setTimeout(() => setCopiedBroadcast(false), 3000)
                            }
                          }
                        }
                      } else {
                        if (navigator?.clipboard?.writeText) {
                          navigator.clipboard.writeText(bCustomMsg)
                          setCopiedBroadcast(true)
                          setShareToast({ type: 'copy', msg: '📋 Message copied! Open Instagram Story / DM and paste to share.' })
                          setTimeout(() => setCopiedBroadcast(false), 3000)
                        }
                      }
                    }}
                  >
                    <Share2 size={18} />
                    <span>Share on Instagram / Story</span>
                  </button>

                  {/* Button 3: Copy to Clipboard */}
                  <button
                    id="btn-copy-broadcast"
                    className="btn btn-secondary"
                    style={{
                      flex: '1 1 160px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '12px 18px',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                    }}
                    onClick={() => {
                      if (navigator?.clipboard?.writeText) {
                        navigator.clipboard.writeText(bCustomMsg)
                        setCopiedBroadcast(true)
                        setShareToast({ type: 'copy', msg: '✅ Message copied to clipboard! Paste into Telegram, SMS, or any community group.' })
                        setTimeout(() => setCopiedBroadcast(false), 3000)
                      }
                    }}
                  >
                    {copiedBroadcast ? <Check size={18} color="#16a34a" /> : <Copy size={18} />}
                    <span>{copiedBroadcast ? 'Copied!' : 'Copy to Clipboard'}</span>
                  </button>
                </div>
              </div>

              {/* MIDDLE SECTION: Nagpur NGO & Community Group Directory */}
              <div className="glass-card" style={{ marginBottom: 24, padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>🏢</span> 2. Nagpur Blood NGOs &amp; Voluntary Community Groups Directory
                    </h3>
                    <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '3px 0 0 0' }}>
                      Real verified organizations in Nagpur with active volunteer donor networks on standby.
                    </p>
                  </div>

                  {/* Category Filter Pills */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['All', 'NGO / Humanitarian', 'NABH Accredited NGO', 'Charitable Trust', 'Medical Association', 'Government Outreach'].map(cat => (
                      <button
                        key={cat}
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: 20,
                          border: '1px solid',
                          borderColor: ngoCategoryFilter === cat ? '#2563eb' : '#cbd5e1',
                          background: ngoCategoryFilter === cat ? '#eff6ff' : '#fff',
                          color: ngoCategoryFilter === cat ? '#1e40af' : '#475569',
                          cursor: 'pointer',
                        }}
                        onClick={() => setNgoCategoryFilter(cat)}
                      >
                        {cat === 'All' ? `All (${NAGPUR_NGOS.length})` : cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* NGOs Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                  {NAGPUR_NGOS
                    .filter(ngo => ngoCategoryFilter === 'All' || ngo.category === ngoCategoryFilter)
                    .map(ngo => (
                      <div
                        key={ngo.id}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: 14,
                          padding: 16,
                          background: '#ffffff',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                            <span style={{
                              background: ngo.category.includes('Govt') ? '#fef3c7' : ngo.category.includes('NABH') ? '#dbeafe' : '#f0fdf4',
                              color: ngo.category.includes('Govt') ? '#92400e' : ngo.category.includes('NABH') ? '#1e40af' : '#166534',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: 6,
                            }}>
                              {ngo.category}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>
                              ● Verified
                            </span>
                          </div>

                          <h4 style={{ margin: '0 0 4px 0', fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>
                            {ngo.name}
                          </h4>

                          <div style={{ fontSize: '0.76rem', color: '#64748b', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span>📍 {ngo.locality}</span> • <span>⏱️ Avg Response: {ngo.responseTime}</span>
                          </div>

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
                            <Phone size={12} />
                            <span>Helpline: {ngo.phone}</span>
                          </div>

                          <p style={{ fontSize: '0.8rem', color: '#334155', margin: '0 0 14px 0', lineHeight: 1.4 }}>
                            {ngo.description}
                          </p>
                        </div>

                        {/* Contact Action Bar */}
                        <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                          <button
                            type="button"
                            onClick={() => setCallModalBank({ ...ngo, hours: '24/7 Emergency Transfusion Desk' })}
                            style={{
                              flex: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                              background: '#f8fafc',
                              color: '#0f172a',
                              borderRadius: 8,
                              padding: '8px 12px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              border: '1.5px solid #cbd5e1',
                              cursor: 'pointer'
                            }}
                          >
                            <Phone size={13} color="#2563eb" />
                            <span>Call {ngo.phone.split(' ').slice(-1)[0] || 'Helpline'}</span>
                          </button>

                          <button
                            style={{
                              flex: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                              background: '#22c55e',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 8,
                              padding: '8px 12px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                            onClick={() => {
                              const text = `Hello ${ngo.name}, we have an urgent blood requirement in Nagpur:\n\n${bCustomMsg}\n\nCan your volunteer network help mobilize donors?`
                              const url = `https://wa.me/${ngo.whatsappPhone}?text=${encodeURIComponent(text)}`
                              window.open(url, '_blank', 'noopener,noreferrer')
                            }}
                          >
                            <MessageCircle size={13} />
                            <span>WhatsApp SOS</span>
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* BOTTOM SECTION: Simulated Impact & Reach Tracker */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                padding: '20px 24px',
                marginBottom: 20,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      ⚡ Real-Time Community Reach Telemetry
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', marginTop: 2 }}>
                      📢 Broadcast reached ~<span style={{ color: '#dc2626' }}>{simulatedReach}</span> potential donors across 3 community channels
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
                      * Illustrative simulation tracking aggregate reach across Nagpur WhatsApp donor syndicates, Instagram stories, and NGO helplines.
                    </div>
                  </div>
                  <span className="badge badge-green" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                    🟢 3 Channels Active
                  </span>
                </div>

                {/* 3 Channels Breakdown Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
                  <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>📲 WhatsApp Groups &amp; Contacts</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#16a34a', marginTop: 2 }}>~{Math.round(simulatedReach * 0.58)} Donors</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Nagpur Riders, Techies, College Hubs</div>
                  </div>

                  <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>📸 Instagram Stories &amp; Direct</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#c026d3', marginTop: 2 }}>~{Math.round(simulatedReach * 0.28)} Views</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Youth Volunteer Stories &amp; Tags</div>
                  </div>

                  <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>🏢 Verified NGO Alert Network</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0284c7', marginTop: 2 }}>5 Org Desks</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Red Cross, Lifeline, Jeevan Jyoti, ISA</div>
                  </div>
                </div>

                {/* Simulated Recent Activity Feed */}
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
                    🩸 Recent Community Action Feed (Live Stream):
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#334155' }}>
                      <span>✅ <strong>Rohan M.</strong> shared broadcast to <em>Nagpur Youth Volunteers WhatsApp</em></span>
                      <span style={{ color: '#64748b' }}>Just now</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#334155' }}>
                      <span>✅ <strong>Pooja V.</strong> added story to Instagram with <em>#DonateBloodNagpur</em></span>
                      <span style={{ color: '#64748b' }}>3 mins ago</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#334155' }}>
                      <span>✅ <strong>Dr. Deshmukh</strong> forwarded alert to <em>Red Cross Voluntary Registry</em></span>
                      <span style={{ color: '#64748b' }}>7 mins ago</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ══════════════════════════════════════════════════════ */}
      {/* MODAL: PRE-DONATION ELIGIBILITY & SLOT SCHEDULING FLOW */}
      {/* ══════════════════════════════════════════════════════ */}
      {schedulingAlert && (
        <div className="schedule-modal-backdrop" onClick={() => setSchedulingAlert(null)}>
          <div className="schedule-modal-box" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="schedule-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.2rem' }}>
                  {scheduleStep === 'eligibility' ? '📋' : scheduleStep === 'slots' ? '📅' : '✅'}
                </span>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                  {scheduleStep === 'eligibility' && 'Step 1: Quick Pre-Donation Eligibility'}
                  {scheduleStep === 'slots' && 'Step 2: Choose Donation Time Slot'}
                  {scheduleStep === 'confirmed' && 'Donation Scheduled & Confirmed'}
                </h3>
              </div>
              <button
                onClick={() => setSchedulingAlert(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: '#64748B', cursor: 'pointer', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            <div className="schedule-modal-body">
              {/* Context Banner Pinned on Top */}
              <div className="schedule-context-banner">
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#DC2626', textTransform: 'uppercase', fontWeight: 800 }}>
                    Emergency Hospital Need
                  </div>
                  <h4 style={{ margin: '2px 0 0 0', fontSize: '0.96rem', fontWeight: 800, color: '#0F172A' }}>
                    {schedulingAlert.hospital}
                  </h4>
                  <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: 2 }}>
                    📍 {schedulingAlert.city || 'Nagpur'} • Distance: ~2.4 km
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span className="blood-badge" style={{ width: 34, height: 34, fontSize: '0.75rem' }}>
                    {schedulingAlert.group || donor.bloodGroup || 'O+'}
                  </span>
                  <span className={`badge ${schedulingAlert.urgency === 'critical' ? 'badge-red' : schedulingAlert.urgency === 'high' ? 'badge-yellow' : 'badge-blue'}`}>
                    {schedulingAlert.urgency.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* ── STEP 1: PRE-DONATION ELIGIBILITY ── */}
              {scheduleStep === 'eligibility' && (() => {
                const isFullyEligible = eligibilityAnswers.feelingWell && eligibilityAnswers.cooldown90Days && eligibilityAnswers.hydratedEaten && donor.eligible !== false

                return (
                  <div>
                    <p style={{ fontSize: '0.84rem', color: '#475569', margin: '0 0 14px 0' }}>
                      Please confirm standard pre-donation safety criteria before scheduling your arrival:
                    </p>

                    <div className="eligibility-check-list">
                      {/* Criteria 1: Feeling Well */}
                      <label className={`eligibility-check-card ${eligibilityAnswers.feelingWell ? 'checked' : ''}`}>
                        <input
                          type="checkbox"
                          className="eligibility-checkbox"
                          checked={eligibilityAnswers.feelingWell}
                          onChange={e => setEligibilityAnswers(p => ({ ...p, feelingWell: e.target.checked }))}
                        />
                        <div>
                          <strong style={{ fontSize: '0.88rem', color: '#0F172A', display: 'block' }}>
                            I am currently feeling well
                          </strong>
                          <span style={{ fontSize: '0.76rem', color: '#64748B' }}>
                            No fever, active cold, cough, sore throat, or recent viral infection.
                          </span>
                        </div>
                      </label>

                      {/* Criteria 2: 90 Days Cooldown */}
                      <label className={`eligibility-check-card ${eligibilityAnswers.cooldown90Days ? 'checked' : ''}`}>
                        <input
                          type="checkbox"
                          className="eligibility-checkbox"
                          checked={eligibilityAnswers.cooldown90Days}
                          onChange={e => setEligibilityAnswers(p => ({ ...p, cooldown90Days: e.target.checked }))}
                        />
                        <div>
                          <strong style={{ fontSize: '0.88rem', color: '#0F172A', display: 'block' }}>
                            At least 90 days since last whole blood donation
                          </strong>
                          <span style={{ fontSize: '0.76rem', color: '#64748B' }}>
                            Adheres to NBTC donor safety guidelines (Next eligible window: {nextDonationDate}).
                          </span>
                        </div>
                      </label>

                      {/* Criteria 3: Hydrated and Eaten */}
                      <label className={`eligibility-check-card ${eligibilityAnswers.hydratedEaten ? 'checked' : ''}`}>
                        <input
                          type="checkbox"
                          className="eligibility-checkbox"
                          checked={eligibilityAnswers.hydratedEaten}
                          onChange={e => setEligibilityAnswers(p => ({ ...p, hydratedEaten: e.target.checked }))}
                        />
                        <div>
                          <strong style={{ fontSize: '0.88rem', color: '#0F172A', display: 'block' }}>
                            I have eaten a meal &amp; I'm well-hydrated
                          </strong>
                          <span style={{ fontSize: '0.76rem', color: '#64748B' }}>
                            Had food within the last 3–4 hours and plenty of fluids.
                          </span>
                        </div>
                      </label>
                    </div>

                    {!isFullyEligible ? (
                      <div style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                        <div style={{ fontWeight: 800, color: '#991B1B', fontSize: '0.88rem', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>⚠️</span> You are not currently eligible to donate blood
                        </div>
                        <p style={{ fontSize: '0.8rem', color: '#7F1D1D', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                          Your mandatory cooldown or current health checklist prevents donation today (Next eligible: <strong>{nextDonationDate}</strong>). Thank you for wanting to help — you can still amplify this emergency by broadcasting it to community volunteers!
                        </p>
                        <button
                          className="btn w-full"
                          style={{ background: '#DC2626', color: '#fff', fontWeight: 800, padding: '10px' }}
                          onClick={() => {
                            setSchedulingAlert(null)
                            setActiveTab('community')
                          }}
                        >
                          📢 Share Request via Community SOS
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                        <button
                          className="btn btn-primary w-full"
                          style={{ padding: '12px', fontSize: '0.95rem', fontWeight: 800 }}
                          onClick={() => setScheduleStep('slots')}
                        >
                          Proceed to Slot Selection ➔
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '12px 18px' }}
                          onClick={() => setSchedulingAlert(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* ── STEP 2: DATE & TIME SLOT SELECTION ── */}
              {scheduleStep === 'slots' && (() => {
                const isCritical = schedulingAlert.urgency === 'critical' || schedulingAlert.urgency === 'high'

                const criticalSlots = [
                  { id: 'asap', label: '⚡ As soon as possible (Within 30 mins)', sub: 'Fastest response for emergency surgery resuscitation' },
                  { id: '1hr',  label: '⏱️ Within 1 hour', sub: 'Arrival expected at hospital blood bank within 60 mins' },
                  { id: '3hr',  label: '🕒 Within 3 hours', sub: 'Arrival planned for afternoon emergency shift' },
                ]

                const normalSlots = [
                  { id: 'morning',   label: '🌅 Morning (9:00 AM – 12:00 PM)', sub: 'Standard morning donation hours' },
                  { id: 'afternoon', label: '☀️ Afternoon (12:00 PM – 4:00 PM)', sub: 'Post-lunch scheduled slot' },
                  { id: 'evening',   label: '🌆 Evening (4:00 PM – 8:00 PM)', sub: 'Evening after-work donation slot' },
                ]

                const dateOptions = isCritical
                  ? ['Today (Immediate Dispatch)']
                  : ['Today', 'Tomorrow', 'In 2 Days', 'In 3 Days']

                return (
                  <div>
                    {isCritical && (
                      <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: '0.78rem', color: '#991B1B', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>⚡</span> CODE RED URGENT: Immediate slots prioritized for trauma emergency.
                      </div>
                    )}

                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                        Select Donation Date
                      </label>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {dateOptions.map(d => (
                          <button
                            key={d}
                            type="button"
                            className={`btn btn-sm ${selectedDate === d ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setSelectedDate(d)}
                            style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginBottom: 18 }}>
                      <label style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                        Choose Estimated Arrival Slot
                      </label>
                      <div className="slot-option-grid">
                        {(isCritical ? criticalSlots : normalSlots).map(slot => (
                          <div
                            key={slot.id}
                            className={`slot-option-card ${selectedSlot === slot.label ? 'active' : ''}`}
                            onClick={() => setSelectedSlot(slot.label)}
                          >
                            <div>
                              <strong style={{ fontSize: '0.88rem', color: '#0F172A', display: 'block' }}>
                                {slot.label}
                              </strong>
                              <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                                {slot.sub}
                              </span>
                            </div>
                            <span style={{ fontSize: '1rem', color: selectedSlot === slot.label ? '#DC2626' : '#CBD5E1' }}>
                              {selectedSlot === slot.label ? '●' : '○'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        className="btn btn-primary w-full"
                        style={{ padding: '12px', fontSize: '0.95rem', fontWeight: 800, background: 'linear-gradient(135deg, #DC2626, #B91C1C)' }}
                        onClick={handleConfirmDonationCommitment}
                      >
                        Confirm Donation Commitment ➔
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '12px 18px' }}
                        onClick={() => setScheduleStep('eligibility')}
                      >
                        ← Back
                      </button>
                    </div>
                  </div>
                )
              })()}

              {/* ── STEP 3: CONFIRMED SCREEN ── */}
              {scheduleStep === 'confirmed' && (() => {
                const commitment = scheduledCommitments[schedulingAlert.id] || {
                  confirmationId: 'DON-NGP-4892',
                  hospital: schedulingAlert.hospital,
                  group: schedulingAlert.group || 'O+',
                  date: selectedDate,
                  timeSlot: selectedSlot,
                  timestamp: 'Just now'
                }

                return (
                  <div>
                    <div style={{ textAlign: 'center', marginBottom: 18 }}>
                      <div style={{ fontSize: '3rem', marginBottom: 6 }}>🎉</div>
                      <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0F172A' }}>
                        Donation Scheduled Successfully!
                      </h4>
                      <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#059669', fontWeight: 700 }}>
                        Your commitment has been relayed to the hospital emergency trauma desk.
                      </p>
                    </div>

                    <div className="confirmation-summary-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: 10, marginBottom: 10 }}>
                        <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Confirmation ID</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 900, color: '#0284C7', fontSize: '1.1rem' }}>{commitment.confirmationId}</span>
                      </div>

                      <div className="confirmation-row">
                        <span style={{ color: '#64748B' }}>Destination:</span>
                        <strong style={{ color: '#0F172A' }}>{commitment.hospital}</strong>
                      </div>
                      <div className="confirmation-row">
                        <span style={{ color: '#64748B' }}>Required Group:</span>
                        <strong style={{ color: '#DC2626' }}>{commitment.group} Whole Blood</strong>
                      </div>
                      <div className="confirmation-row">
                        <span style={{ color: '#64748B' }}>Scheduled Slot:</span>
                        <strong style={{ color: '#059669' }}>{commitment.date} ({commitment.timeSlot})</strong>
                      </div>
                      <div className="confirmation-row">
                        <span style={{ color: '#64748B' }}>Reporting Station:</span>
                        <span style={{ color: '#334155' }}>Blood Bank Reception / Trauma Desk</span>
                      </div>
                    </div>

                    {/* Action Buttons: Directions & Calendar */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                      <button
                        className="btn btn-secondary w-full"
                        style={{ padding: '10px', fontSize: '0.84rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                        onClick={() => handleGetDirections({ name: commitment.hospital, address: `${commitment.hospital}, Nagpur, Maharashtra` })}
                      >
                        <Navigation size={15} color="#0284c7" />
                        <span>Get Directions</span>
                      </button>

                      <button
                        className="btn btn-secondary w-full"
                        style={{ padding: '10px', fontSize: '0.84rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                        onClick={() => handleAddToCalendar(commitment)}
                      >
                        <Calendar size={15} color="#16a34a" />
                        <span>Add to Calendar</span>
                      </button>
                    </div>

                    {/* Reassurance Note */}
                    <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 8, padding: '10px 12px', fontSize: '0.78rem', color: '#0369A1', lineHeight: 1.4, marginBottom: 16 }}>
                      ℹ️ <strong>Next Steps:</strong> The hospital blood bank medical officer will verify your donation on-site. Your trust score (+10 pts) and digital certificate update automatically upon on-site verification.
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, borderTop: '1px solid #E2E8F0', paddingTop: 14 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: '#0284C7', fontSize: '0.78rem' }}
                          onClick={() => setScheduleStep('slots')}
                        >
                          🔄 Reschedule Slot
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: '#DC2626', fontSize: '0.78rem' }}
                          onClick={() => handleCancelCommitment(commitment.alertId)}
                        >
                          ✕ Cancel Commitment
                        </button>
                      </div>

                      <button
                        className="btn btn-primary btn-sm"
                        style={{ padding: '8px 18px', fontWeight: 800 }}
                        onClick={() => setSchedulingAlert(null)}
                      >
                        Done &amp; Close
                      </button>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST NOTIFICATIONS ── */}
      {scheduleToast && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#0F172A',
          color: '#FFFFFF',
          padding: '12px 24px',
          borderRadius: 30,
          fontWeight: 700,
          fontSize: '0.88rem',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          zIndex: 99999
        }}>
          {scheduleToast}
        </div>
      )}
    </div>
  )
}
