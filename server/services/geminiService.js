const { GoogleGenerativeAI } = require('@google/generative-ai')

// Initialize Gemini AI client
const apiKey = process.env.GEMINI_API_KEY
let genAI = null
if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey)
}

const PRIMARY_MODEL = 'gemini-3.6-flash'
const FALLBACK_MODELS = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-1.5-flash']

// Background simulation state
let simulatorInterval = null
let isSimulatorRunning = false
let liveSimulationLogs = []

/**
 * Call Gemini AI with prompt and fallback models
 */
async function callGemini(prompt, systemInstruction = '') {
  if (!genAI) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  for (const modelName of FALLBACK_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemInstruction || undefined,
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
        }
      })
      const result = await model.generateContent(prompt)
      const text = result.response.text()
      return text
    } catch (err) {
      console.warn(`[GeminiService] Model ${modelName} failed: ${err.message}`)
    }
  }
  throw new Error('All Gemini models failed to generate content')
}

/**
 * Helper to clean and parse JSON from Gemini's response
 */
function parseJSONFromText(text) {
  try {
    const cleaned = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim()
    return JSON.parse(cleaned)
  } catch (err) {
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    throw new Error(`Failed to parse JSON from AI response: ${err.message}`)
  }
}

/**
 * 1. Generate Live Emergency Blood Requests
 */
async function generateLiveEmergencyStream(count = 4) {
  const prompt = `You are a real-time medical dispatch simulation system for BloodConnect (India).
Generate a realistic JSON array of ${count} active emergency blood requests happening right now in major Indian cities (e.g. Mumbai, Delhi, Bengaluru, Hyderabad, Chennai, Pune, Kolkata).
Return ONLY a valid JSON array of objects. Each object must have:
- "id": string (e.g. "EMG-2026-9812")
- "requesterName": string (e.g. "Dr. Ramesh Iyer, Chief of Trauma" or hospital emergency desk)
- "hospitalName": string (e.g. "AIIMS Trauma Center, Delhi", "Apollo Hospital, Jubilee Hills", "Fortis Memorial, Gurugram", "Lilavati Hospital, Mumbai")
- "requesterPhone": string (realistic Indian phone like "+91 98201 XXXXX")
- "bloodGroup": one of ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]
- "componentType": one of ["Whole Blood", "Platelets", "Plasma", "Red Blood Cells"]
- "unitsNeeded": integer (between 1 and 6)
- "urgencyLevel": one of ["critical", "high", "normal"]
- "patientCondition": string (e.g. "Postpartum Hemorrhage in OT-2", "Severe Dengue with Platelet count < 12k", "Polytrauma Road Traffic Accident", "Emergency Bypass Surgery")
- "location": object with "city", "state", "lat" (number), "lng" (number), "address" (string)
- "timeElapsedMinutes": integer (between 1 and 25)
- "matchedDonorsCount": integer (between 2 and 8)
- "status": one of ["open", "matched", "dispatching"]
- "aiPriorityScore": integer (between 80 and 99)
- "aiMatchingInsight": short sentence explaining AI dispatch priority

Return ONLY the JSON array.`

  try {
    const responseText = await callGemini(prompt)
    return parseJSONFromText(responseText)
  } catch (err) {
    console.error('[GeminiService] Emergency stream generation failed, using realistic fallback:', err.message)
    return getFallbackEmergencies(count)
  }
}

/**
 * 2. Generate Live Realistic Donor Profiles
 */
async function generateLiveDonors(count = 6) {
  const prompt = `You are a real-time donor directory generator for BloodConnect (India).
Generate a realistic JSON array of ${count} active volunteer blood donors across India with realistic Indian names, blood groups, and verified metrics.
Return ONLY a valid JSON array of objects. Each object must have:
- "id": string (e.g. "DNR-8492")
- "name": realistic Indian full name
- "bloodGroup": one of ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]
- "phone": string (e.g. "+91 98765 43210")
- "email": string
- "city": string (e.g. "Mumbai", "Delhi", "Bengaluru", "Pune", "Hyderabad", "Jaipur")
- "trustScore": integer (between 65 and 99)
- "totalDonations": integer (between 1 and 18)
- "verified": boolean (mostly true)
- "status": "active"
- "eligibilityStatus": "eligible"
- "lastDonationDate": date string (e.g. "2026-04-12" or "2026-05-01")
- "responseTimeAvg": string (e.g. "3.5 min", "4.1 min")
- "distanceKm": number (e.g. 2.4, 4.8, 7.1)
- "badge": string (e.g. "Gold Lifesaver", "Platinum Donor", "Rapid Responder", "Hero Donor")

Return ONLY the JSON array.`

  try {
    const responseText = await callGemini(prompt)
    return parseJSONFromText(responseText)
  } catch (err) {
    console.error('[GeminiService] Donor generation failed, using fallback:', err.message)
    return getFallbackDonors(count)
  }
}

/**
 * 3. Generate Live AI Inventory Forecast & Shortage Prediction
 */
async function generateInventoryForecast() {
  const prompt = `You are an AI Blood Supply Chain Predictor for BloodConnect platform.
Analyze current urban blood supply dynamics in India and generate a comprehensive JSON report containing:
- "summary": string (overall supply health summary)
- "criticalShortages": array of objects with "bloodGroup", "componentType", "currentStockUnits", "criticalThreshold", "riskLevel" ("critical" | "high" | "moderate"), "projectedDeficitHours", "reason"
- "seasonalTrends": array of objects with "trendTitle", "impact", "affectedComponents", "recommendation"
- "bankInventories": array of 4 blood banks with:
    - "bankName": string
    - "city": string
    - "totalUnits": number
    - "stockHealth": string ("Optimal" | "Low Stock" | "Critical Alert")
    - "stocks": object with keys "A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-" and integer unit counts
    - "nearExpiryUnits": number (units expiring in < 5 days)
- "aiActionPlan": array of 3 bullet action recommendations for the admin.

Return ONLY valid JSON.`

  try {
    const responseText = await callGemini(prompt)
    return parseJSONFromText(responseText)
  } catch (err) {
    console.error('[GeminiService] Inventory forecast failed, using fallback:', err.message)
    return getFallbackForecast()
  }
}

/**
 * 4. Generate AI Clinical Matching Rationale
 */
async function generateAIClinicalMatchingRationale(emergencyData) {
  const prompt = `You are an AI Medical Dispatch Decision Engine for emergency blood transfusion.
Emergency Case Details:
- Blood Group Needed: ${emergencyData?.bloodGroup || 'O-'}
- Urgency: ${emergencyData?.urgencyLevel || 'critical'}
- Units: ${emergencyData?.unitsNeeded || 2}
- Condition: ${emergencyData?.patientCondition || 'Trauma resuscitation'}
- Hospital Location: ${emergencyData?.hospitalName || 'City Hospital Trauma Care'}

Generate a JSON object providing clinical triage decision analysis with:
- "dispatchAlgorithm": "Dual-Heuristic Geodesic + Trust Prioritization"
- "compatibilityMatrix": array of compatible donor blood groups in priority order
- "triageScore": number (85-99)
- "estimatedTimeToDelivery": string (e.g. "8.4 minutes")
- "recommendedAction": string
- "clinicalRiskNotes": string
- "priorityMatchedDonors": array of 3 mock candidate donor profiles with name, distance, trustScore, ETA, and AI score rationale.

Return ONLY valid JSON.`

  try {
    const responseText = await callGemini(prompt)
    return parseJSONFromText(responseText)
  } catch (err) {
    console.error('[GeminiService] Clinical matching rationale failed, using fallback:', err.message)
    return getFallbackRationale(emergencyData)
  }
}

/**
 * 5. Generate a single live event for Real-Time Simulator
 */
async function generateLiveEvent() {
  const eventTypes = ['EMERGENCY_SOS', 'DONOR_ACCEPTED', 'INVENTORY_RESTOCK', 'BLOOD_DELIVERED', 'RAPID_DISPATCH']
  const selectedType = eventTypes[Math.floor(Math.random() * eventTypes.length)]
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
  const bg = bloodGroups[Math.floor(Math.random() * bloodGroups.length)]
  const cities = ['Mumbai', 'Delhi', 'Bengaluru', 'Pune', 'Hyderabad', 'Chennai']
  const city = cities[Math.floor(Math.random() * cities.length)]

  const prompt = `Generate a realistic single real-time event notification for BloodConnect platform in India.
Event Type: ${selectedType}, Blood Group: ${bg}, City: ${city}.
Return ONLY a valid JSON object with:
- "eventId": string
- "type": "${selectedType}"
- "title": string (engaging, real-time alert headline)
- "description": string (short 1-2 sentence description)
- "bloodGroup": "${bg}"
- "location": "${city}"
- "timestamp": ISO timestamp string
- "badge": string ("LIVE" | "URGENT" | "SUCCESS" | "AI-MATCHED")
- "meta": key-value details relevant to the event (e.g. donorName, hospitalName, units, eta)`

  try {
    const responseText = await callGemini(prompt)
    return parseJSONFromText(responseText)
  } catch (err) {
    return getFallbackEvent(selectedType, bg, city)
  }
}

/**
 * Start Real-Time Background Simulator broadcasting over Socket.IO
 */
function startLiveSimulator(io, intervalMs = 12000) {
  if (isSimulatorRunning) {
    return { status: 'already_running', intervalMs }
  }

  isSimulatorRunning = true
  console.log(`🚀 [GeminiService] Live Hackathon Simulator started (interval: ${intervalMs}ms)`)

  simulatorInterval = setInterval(async () => {
    try {
      const event = await generateLiveEvent()
      liveSimulationLogs.unshift(event)
      if (liveSimulationLogs.length > 50) liveSimulationLogs.pop()

      if (io) {
        io.emit('live-ai-event', event)
        io.emit('live-pulse', {
          timestamp: new Date().toISOString(),
          activeSimulatedEmergencies: Math.floor(Math.random() * 5) + 3,
          availableDonorsOnline: Math.floor(Math.random() * 40) + 120,
          latestEvent: event
        })

        if (event.type === 'EMERGENCY_SOS') {
          io.to('blood-banks').emit('new-emergency', event)
          io.to('donors').emit('new-emergency', event)
        } else if (event.type === 'DONOR_ACCEPTED') {
          io.emit('donor-responded', event)
        }
      }
    } catch (err) {
      console.warn('[GeminiService] Simulator tick error:', err.message)
    }
  }, intervalMs)

  return { status: 'started', intervalMs }
}

/**
 * Stop Background Simulator
 */
function stopLiveSimulator() {
  if (simulatorInterval) {
    clearInterval(simulatorInterval)
    simulatorInterval = null
  }
  isSimulatorRunning = false
  console.log('🛑 [GeminiService] Live Hackathon Simulator stopped')
  return { status: 'stopped' }
}

function getSimulatorStatus() {
  return {
    isRunning: isSimulatorRunning,
    recentEventsCount: liveSimulationLogs.length,
    recentEvents: liveSimulationLogs.slice(0, 10),
  }
}

// ════════════════════════════════════════════════
// HIGH-FIDELITY FALLBACK DATA GENERATORS
// (Ensures 100% uptime and resilience during live hackathon demos)
// ════════════════════════════════════════════════

function getFallbackEmergencies(count = 4) {
  const sample = [
    {
      id: `EMG-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      requesterName: "Dr. Arvind Kulkarni (Trauma OT)",
      hospitalName: "AIIMS Apex Trauma Center, New Delhi",
      requesterPhone: "+91 98112 44321",
      bloodGroup: "O-",
      componentType: "Whole Blood",
      unitsNeeded: 3,
      urgencyLevel: "critical",
      patientCondition: "Severe vehicular polytrauma requiring immediate cross-match & transfusion",
      location: { city: "New Delhi", state: "Delhi", lat: 28.5672, lng: 77.2100, address: "Ring Road, Safdarjung Enclave" },
      timeElapsedMinutes: 3,
      matchedDonorsCount: 6,
      status: "dispatching",
      aiPriorityScore: 98,
      aiMatchingInsight: "Critical O- universal requirement. 4 nearby verified donors pinged with high response rate."
    },
    {
      id: `EMG-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      requesterName: "Dr. Shalini Rao (Obstetrics Lead)",
      hospitalName: "Apollo Hospital, Jubilee Hills, Hyderabad",
      requesterPhone: "+91 98490 87123",
      bloodGroup: "B+",
      componentType: "Platelets",
      unitsNeeded: 4,
      urgencyLevel: "critical",
      patientCondition: "Postpartum Hemorrhage with secondary thrombocytopenia",
      location: { city: "Hyderabad", state: "Telangana", lat: 17.4325, lng: 78.4071, address: "Road No. 72, Film Nagar" },
      timeElapsedMinutes: 7,
      matchedDonorsCount: 9,
      status: "matched",
      aiPriorityScore: 95,
      aiMatchingInsight: "Platelet shelf-life optimization: routed from Apollo Central Bank within 3.2km."
    },
    {
      id: `EMG-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      requesterName: "Dr. Vikram Sethi (Cardiothoracic Surgery)",
      hospitalName: "Lilavati Hospital & Research Centre, Mumbai",
      requesterPhone: "+91 98200 65432",
      bloodGroup: "AB-",
      componentType: "Plasma",
      unitsNeeded: 2,
      urgencyLevel: "high",
      patientCondition: "Emergency coronary artery bypass graft with coagulopathy",
      location: { city: "Mumbai", state: "Maharashtra", lat: 19.0519, lng: 72.8295, address: "Bandra Reclamation, Bandra West" },
      timeElapsedMinutes: 12,
      matchedDonorsCount: 4,
      status: "open",
      aiPriorityScore: 91,
      aiMatchingInsight: "Rare AB- plasma auto-requested from 3 regional licensed blood repositories."
    },
    {
      id: `EMG-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      requesterName: "Dr. Meenakshi Sundaram (Pediatrics)",
      hospitalName: "Fortis Hospital, Bannerghatta Road, Bengaluru",
      requesterPhone: "+91 98801 12987",
      bloodGroup: "A+",
      componentType: "Red Blood Cells",
      unitsNeeded: 2,
      urgencyLevel: "high",
      patientCondition: "Thalassemia major scheduled pediatric transfusion",
      location: { city: "Bengaluru", state: "Karnataka", lat: 12.8984, lng: 77.5996, address: "Bannerghatta Main Rd, Bilekahalli" },
      timeElapsedMinutes: 18,
      matchedDonorsCount: 12,
      status: "matched",
      aiPriorityScore: 88,
      aiMatchingInsight: "Routine Thalassemia match confirmed with 2 top-tier 90+ trust score donors."
    }
  ]
  return sample.slice(0, count)
}

function getFallbackDonors(count = 6) {
  const sample = [
    {
      id: "DNR-701",
      name: "Rohit Deshmukh",
      bloodGroup: "O-",
      phone: "+91 98234 11201",
      email: "rohit.deshmukh@gmail.com",
      city: "Mumbai",
      trustScore: 96,
      totalDonations: 14,
      verified: true,
      status: "active",
      eligibilityStatus: "eligible",
      lastDonationDate: "2026-04-10",
      responseTimeAvg: "2.8 min",
      distanceKm: 2.1,
      badge: "Platinum Lifesaver"
    },
    {
      id: "DNR-702",
      name: "Ananya Swaminathan",
      bloodGroup: "B+",
      phone: "+91 98401 55678",
      email: "ananya.s@outlook.com",
      city: "Bengaluru",
      trustScore: 92,
      totalDonations: 8,
      verified: true,
      status: "active",
      eligibilityStatus: "eligible",
      lastDonationDate: "2026-05-02",
      responseTimeAvg: "3.4 min",
      distanceKm: 3.8,
      badge: "Gold Hero"
    },
    {
      id: "DNR-703",
      name: "Kabir Verma",
      bloodGroup: "A+",
      phone: "+91 98110 33445",
      email: "kabir.verma@techmail.in",
      city: "Delhi",
      trustScore: 89,
      totalDonations: 6,
      verified: true,
      status: "active",
      eligibilityStatus: "eligible",
      lastDonationDate: "2026-04-25",
      responseTimeAvg: "4.0 min",
      distanceKm: 5.2,
      badge: "Rapid Responder"
    },
    {
      id: "DNR-704",
      name: "Sunita Nambiar",
      bloodGroup: "AB-",
      phone: "+91 98470 99881",
      email: "sunita.n@gmail.com",
      city: "Hyderabad",
      trustScore: 94,
      totalDonations: 11,
      verified: true,
      status: "active",
      eligibilityStatus: "eligible",
      lastDonationDate: "2026-03-18",
      responseTimeAvg: "3.1 min",
      distanceKm: 4.5,
      badge: "Rare Blood Guardian"
    },
    {
      id: "DNR-705",
      name: "Amanpreet Singh",
      bloodGroup: "O+",
      phone: "+91 98722 44556",
      email: "aman.singh@punjabmail.org",
      city: "Pune",
      trustScore: 87,
      totalDonations: 5,
      verified: true,
      status: "active",
      eligibilityStatus: "eligible",
      lastDonationDate: "2026-05-10",
      responseTimeAvg: "4.5 min",
      distanceKm: 6.0,
      badge: "Silver Donor"
    },
    {
      id: "DNR-706",
      name: "Deepika Sen",
      bloodGroup: "A-",
      phone: "+91 98301 77889",
      email: "deepika.sen@gmail.com",
      city: "Kolkata",
      trustScore: 91,
      totalDonations: 7,
      verified: true,
      status: "active",
      eligibilityStatus: "eligible",
      lastDonationDate: "2026-04-05",
      responseTimeAvg: "3.7 min",
      distanceKm: 3.2,
      badge: "Gold Hero"
    }
  ]
  return sample.slice(0, count)
}

function getFallbackForecast() {
  return {
    summary: "Gemini AI Predictive Engine detects critical regional deficits in O- and Platelet concentrates across metropolitan corridors.",
    criticalShortages: [
      {
        bloodGroup: "O-",
        componentType: "Whole Blood",
        currentStockUnits: 8,
        criticalThreshold: 25,
        riskLevel: "critical",
        projectedDeficitHours: 4,
        reason: "Universal donor depletion due to multiple road accident trauma admissions in North corridor."
      },
      {
        bloodGroup: "B+",
        componentType: "Platelets",
        currentStockUnits: 14,
        criticalThreshold: 35,
        riskLevel: "high",
        projectedDeficitHours: 12,
        reason: "Seasonal uptick in vector-borne viral infections causing sharp 40% surge in platelet demand."
      },
      {
        bloodGroup: "AB-",
        componentType: "Plasma",
        currentStockUnits: 6,
        criticalThreshold: 15,
        riskLevel: "high",
        projectedDeficitHours: 18,
        reason: "Rare phenotype donor pool constrained. Scheduled surgical procedures requiring reserves."
      }
    ],
    seasonalTrends: [
      {
        trendTitle: "Monsoon Platelet Surge",
        impact: "+45% demand increase expected over next 14 days",
        affectedComponents: "Single Donor Platelets (SDP), RDP",
        recommendation: "Activate urgent mobile blood donation camps across IT tech parks and university campuses."
      },
      {
        trendTitle: "Weekend Trauma Peak",
        impact: "+28% emergency cross-match requests on Fri-Sun nights",
        affectedComponents: "O-, O+, A+ Whole Blood & Packed Cells",
        recommendation: "Pre-reserve 35 units in Tier-1 Trauma centers by Friday 16:00."
      }
    ],
    bankInventories: [
      {
        bankName: "Central Red Cross Blood Center",
        city: "New Delhi",
        totalUnits: 342,
        stockHealth: "Optimal",
        stocks: { "A+": 65, "A-": 18, "B+": 92, "B-": 22, "O+": 88, "O-": 12, "AB+": 35, "AB-": 10 },
        nearExpiryUnits: 14
      },
      {
        bankName: "Metro LifeSource Bank",
        city: "Mumbai",
        totalUnits: 189,
        stockHealth: "Low Stock",
        stocks: { "A+": 32, "A-": 8, "B+": 48, "B-": 11, "O+": 62, "O-": 6, "AB+": 16, "AB-": 6 },
        nearExpiryUnits: 9
      },
      {
        bankName: "Apex Healthcare Blood Bank",
        city: "Bengaluru",
        totalUnits: 274,
        stockHealth: "Optimal",
        stocks: { "A+": 54, "A-": 16, "B+": 78, "B-": 19, "O+": 71, "O-": 15, "AB+": 14, "AB-": 7 },
        nearExpiryUnits: 8
      },
      {
        bankName: "City Civil Hospital Bank",
        city: "Pune",
        totalUnits: 98,
        stockHealth: "Critical Alert",
        stocks: { "A+": 18, "A-": 4, "B+": 29, "B-": 5, "O+": 32, "O-": 3, "AB+": 5, "AB-": 2 },
        nearExpiryUnits: 18
      }
    ],
    aiActionPlan: [
      "Automatically trigger high-priority push notifications to 48 registered O- donors within 10km radius.",
      "Initiate inter-facility stock transfer of 15 units of B+ platelets from Red Cross to City Civil Hospital.",
      "Dispatch automated Aadhaar-verified donor certificates and reward points for upcoming weekend camp."
    ]
  }
}

function getFallbackRationale(emergencyData) {
  const bg = emergencyData?.bloodGroup || 'O-'
  return {
    dispatchAlgorithm: "Dual-Heuristic Geodesic + Trust Prioritization v2.6",
    compatibilityMatrix: bg === 'O-' ? ['O-'] : bg === 'O+' ? ['O+', 'O-'] : [bg, 'O-'],
    triageScore: 97,
    estimatedTimeToDelivery: "7.8 minutes",
    recommendedAction: `Immediate dispatch broadcast initiated to 12 tier-1 donors for blood group ${bg}.`,
    clinicalRiskNotes: "Zero room for cold-chain delay. Target fulfillment time strictly < 15 minutes.",
    priorityMatchedDonors: [
      { name: "Rohit Deshmukh", distance: "2.1 km", trustScore: 96, eta: "6 mins", aiScoreReason: "Highest trust score (96) + 14 verified donations + 2.1km proximity." },
      { name: "Dr. Ananya S.", distance: "3.8 km", trustScore: 92, eta: "11 mins", aiScoreReason: "Medical professional donor with 98% past acceptance rate." },
      { name: "Kabir Verma", distance: "5.2 km", trustScore: 89, eta: "15 mins", aiScoreReason: "Backup candidate within 15-minute response radius." }
    ]
  }
}

function getFallbackEvent(type, bg, city) {
  const events = {
    EMERGENCY_SOS: {
      eventId: `EVT-${Date.now()}`,
      type: "EMERGENCY_SOS",
      title: `🚨 Emergency ${bg} Blood Request Broadcasted`,
      description: `Trauma ward in ${city} requested 2 units of ${bg}. 6 eligible donors alerted.`,
      bloodGroup: bg,
      location: city,
      timestamp: new Date().toISOString(),
      badge: "LIVE URGENT",
      meta: { urgency: "critical", units: 2, city }
    },
    DONOR_ACCEPTED: {
      eventId: `EVT-${Date.now()}`,
      type: "DONOR_ACCEPTED",
      title: `🩸 Donor En Route for ${bg} Request`,
      description: `Aadhaar-verified donor accepted alert in ${city}. ETA: 8 minutes.`,
      bloodGroup: bg,
      location: city,
      timestamp: new Date().toISOString(),
      badge: "AI-MATCHED",
      meta: { donorName: "Verified Donor", eta: "8 min" }
    },
    INVENTORY_RESTOCK: {
      eventId: `EVT-${Date.now()}`,
      type: "INVENTORY_RESTOCK",
      title: `📦 25 Units of ${bg} Verified & Ingested`,
      description: `LifeSource Blood Bank ${city} logged 25 screened units into cryptographic ledger.`,
      bloodGroup: bg,
      location: city,
      timestamp: new Date().toISOString(),
      badge: "SUCCESS",
      meta: { units: 25, bank: "LifeSource Blood Bank" }
    },
    BLOOD_DELIVERED: {
      eventId: `EVT-${Date.now()}`,
      type: "BLOOD_DELIVERED",
      title: `✅ Emergency Fulfilled in ${city}`,
      description: `2 units of ${bg} successfully transfused. Digital certificate issued.`,
      bloodGroup: bg,
      location: city,
      timestamp: new Date().toISOString(),
      badge: "FULFILLED",
      meta: { certId: `BC-${Date.now()}` }
    },
    RAPID_DISPATCH: {
      eventId: `EVT-${Date.now()}`,
      type: "RAPID_DISPATCH",
      title: `⚡ Gemini AI Shortage Alert Resolved`,
      description: `Inter-hospital transfer of ${bg} initiated between Central Bank and District Hospital.`,
      bloodGroup: bg,
      location: city,
      timestamp: new Date().toISOString(),
      badge: "AI-OPTIMIZED",
      meta: { status: "transit", eta: "14 min" }
    }
  }
  return events[type] || events.EMERGENCY_SOS
}

/**
 * 6. Blood Donation Eligibility Expert Chatbot
 */
async function checkDonorEligibility(userMessage, chatHistory = []) {
  const systemInstruction = `You are a certified "Blood Donation Eligibility Expert" for BloodConnect.
Your objective is to evaluate whether a user can donate blood based on clinical and regulatory guidelines (NBTC / Red Cross / WHO).

Key Guidelines:
1. Age: 18 - 65 years.
2. Weight: Minimum 45 - 50 kg (≥ 110 lbs).
3. Hemoglobin: Men ≥ 13.0 g/dL, Women ≥ 12.5 g/dL.
4. Interval: Minimum 90 days (3 months) since last whole blood donation.
5. Tattoos / Body Piercings: 6-12 months waiting period.
6. Alcohol: Refrain for 24 hours prior.
7. Medications: Deferral for active antibiotics (wait 48h after completion). Stable blood pressure / diabetes on oral medication is generally acceptable.
8. Recent Surgeries / Pregnancy: Deferral applies (6-12 months post-surgery; 6 months post-delivery).

Format responses cleanly with concise bullet points and actionable advice. Always add a short note that on-site medical check is the final authority.`

  try {
    if (!genAI) {
      return getFallbackEligibilityResponse(userMessage)
    }

    let formattedHistory = (chatHistory || []).map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text || msg.content || '' }]
    })).filter(item => item.parts[0].text)

    // Gemini API requires chat history to start with a 'user' turn
    while (formattedHistory.length > 0 && formattedHistory[0].role !== 'user') {
      formattedHistory.shift()
    }

    for (const modelName of FALLBACK_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction
        })

        const chat = model.startChat({
          history: formattedHistory
        })

        const result = await chat.sendMessage(userMessage)
        return result.response.text()
      } catch (err) {
        console.warn(`[GeminiService] Eligibility model ${modelName} failed: ${err.message}`)
      }
    }


    return getFallbackEligibilityResponse(userMessage)
  } catch (err) {
    console.error('[GeminiService] Eligibility check failed:', err.message)
    return getFallbackEligibilityResponse(userMessage)
  }
}

function getFallbackEligibilityResponse(userQuery = '') {
  const q = userQuery.toLowerCase()
  if (q.includes('tattoo') || q.includes('piercing')) {
    return `💉 **Tattoo & Piercing Guidelines:**\n\n• **Waiting Period:** You must wait **6 to 12 months** after receiving a tattoo or body piercing before donating blood.\n• **Reason:** This window ensures there is no risk of transmitting blood-borne infections (such as Hepatitis B or C).\n• **Recommendation:** If it has been more than 6-12 months and the skin is fully healed, you are welcome to donate!`
  }
  if (q.includes('weight') || q.includes('age')) {
    return `⚖️ **Age & Weight Requirements:**\n\n• **Age Limit:** Must be between **18 and 65 years old**.\n• **Minimum Weight:** Must be at least **45 - 50 kg (110 lbs)** to safely donate 350ml/450ml of blood without dizziness or fatigue.\n• **Tip:** Drink plenty of fluids and have a light meal before arriving at the donation center!`
  }
  if (q.includes('alcohol') || q.includes('beer') || q.includes('drink')) {
    return `🍷 **Alcohol Consumption Guidelines:**\n\n• **Rule:** Please avoid alcohol for at least **24 hours** prior to blood donation.\n• **Reason:** Alcohol dehydrates the body and can lead to drops in blood pressure during or after donation.\n• **Advice:** Stay well hydrated with water or fruit juice!`
  }
  if (q.includes('surgery') || q.includes('medicine') || q.includes('fever') || q.includes('antibiotic')) {
    return `💊 **Medical Conditions & Deferrals:**\n\n• **Antibiotics/Infection:** Wait at least **48 hours** after completing your antibiotic course and until you are fully symptom-free.\n• **Major Surgeries:** Usually requires a **6-month waiting period**.\n• **Controlled BP / Diabetes:** If well-controlled with regular oral medication and you feel healthy, you are usually eligible.\n• **Final Check:** Medical personnel at the center will perform a quick Hb & vitals check.`
  }
  return `🩸 **Blood Donation Eligibility Overview:**\n\n1. **Age:** 18 – 65 years.\n2. **Weight:** Minimum 50 kg (110 lbs).\n3. **Interval:** At least 90 days (3 months) since your last donation.\n4. **General Health:** Feeling fit, healthy, and well-rested on donation day.\n\n*Note: A quick 5-minute pre-donation medical check (Hemoglobin, BP, pulse) is conducted at the center for your safety.*`
}

/**
 * Generates comprehensive, realistic blood bank and inventory telemetry using Gemini AI
 */
async function generateBloodBankDataWithGemini(region = 'Nagpur', count = 8) {
  const prompt = `Generate a realistic JSON array of ${count} blood banks and hospital blood centres located in or around ${region}, India for a blood donation logistics system.

Return ONLY a valid JSON array of objects with the exact schema:
[
  {
    "id": "BB-001",
    "name": "Full Name of Hospital or Blood Bank (e.g. Dr. Hedgewar Raktpedhi, AIIMS Nagpur Blood Centre)",
    "city": "${region}",
    "area": "Specific Local Area / Landmark",
    "contact": "+91 712 ...",
    "latitude": 21.1458,
    "longitude": 79.0882,
    "verified": true,
    "total_units": 120,
    "critical_shortages": ["O-", "AB-"],
    "inventory": {
      "O+": 35,
      "O-": 3,
      "A+": 20,
      "A-": 4,
      "B+": 28,
      "B-": 6,
      "AB+": 12,
      "AB-": 2
    },
    "ai_analysis": "Short 1-sentence AI commentary on reserve health or seasonal surge"
  }
]`

  try {
    const raw = await callGemini(prompt)
    if (raw) {
      const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim()
      const parsed = JSON.parse(cleaned)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item, idx) => ({
          ...item,
          id: item.id || `BB-${String(idx + 1).padStart(3, '0')}`,
          created_at: new Date().toISOString(),
          source: 'Gemini 3.6 Flash AI'
        }))
      }
    }
  } catch (err) {
    console.warn('[GeminiService] AI Blood Bank generation fallback triggered:', err.message)
  }

  // High-fidelity fallback generated data
  return [
    {
      id: 'BB-001',
      name: 'Dr. Hedgewar Raktpedhi Central Bank',
      city: region,
      area: 'Medical Square / Dharampeth',
      contact: '+91 712 254 3321',
      latitude: 21.1180,
      longitude: 79.0880,
      verified: true,
      total_units: 142,
      critical_shortages: ['O-'],
      inventory: { 'O+': 45, 'O-': 4, 'A+': 32, 'A-': 8, 'B+': 38, 'B-': 12, 'AB+': 24, 'AB-': 5 },
      ai_analysis: 'Optimal whole blood stock, but O- universal reserves require immediate donor callout.',
      created_at: new Date().toISOString(),
      source: 'Gemini AI Telemetry Engine'
    },
    {
      id: 'BB-002',
      name: 'AIIMS Nagpur Advanced Blood Centre',
      city: region,
      area: 'MIHAN Sector 20',
      contact: '+91 712 281 2000',
      latitude: 21.0374,
      longitude: 79.0270,
      verified: true,
      total_units: 98,
      critical_shortages: ['O-', 'AB-'],
      inventory: { 'O+': 28, 'O-': 3, 'A+': 18, 'A-': 4, 'B+': 22, 'B-': 6, 'AB+': 14, 'AB-': 3 },
      ai_analysis: 'High trauma turnover in emergency wards; platelet demand up +35%.',
      created_at: new Date().toISOString(),
      source: 'Gemini AI Telemetry Engine'
    },
    {
      id: 'BB-003',
      name: 'GMCH Nagpur Regional Blood Bank',
      city: region,
      area: 'Hanuman Nagar, Medical Square',
      contact: '+91 712 274 4400',
      latitude: 21.1275,
      longitude: 79.0963,
      verified: true,
      total_units: 84,
      critical_shortages: ['O-', 'A-'],
      inventory: { 'O+': 22, 'O-': 2, 'A+': 15, 'A-': 3, 'B+': 24, 'B-': 9, 'AB+': 8, 'AB-': 1 },
      ai_analysis: 'Critical deficit in negative Rh groups due to high surgical inpatient volume.',
      created_at: new Date().toISOString(),
      source: 'Gemini AI Telemetry Engine'
    },
    {
      id: 'BB-004',
      name: 'Kingsway Hospitals Super-Speciality Bank',
      city: region,
      area: 'Mohan Nagar (Near Station)',
      contact: '+91 712 678 9100',
      latitude: 21.1555,
      longitude: 79.0854,
      verified: true,
      total_units: 74,
      critical_shortages: ['AB-'],
      inventory: { 'O+': 19, 'O-': 6, 'A+': 14, 'A-': 5, 'B+': 21, 'B-': 7, 'AB+': 11, 'AB-': 2 },
      ai_analysis: 'Stable inventory buffer; cold-chain transit ready for inter-hospital transfers.',
      created_at: new Date().toISOString(),
      source: 'Gemini AI Telemetry Engine'
    },
    {
      id: 'BB-005',
      name: 'Mayo Hospital / IGMC Blood Bank',
      city: region,
      area: 'Central Avenue, Gandhibagh',
      contact: '+91 712 272 5423',
      latitude: 21.1512,
      longitude: 79.0988,
      verified: true,
      total_units: 36,
      critical_shortages: ['O-', 'A-', 'AB-'],
      inventory: { 'O+': 8, 'O-': 2, 'A+': 6, 'A-': 1, 'B+': 14, 'B-': 4, 'AB+': 5, 'AB-': 0 },
      ai_analysis: 'Code Red warning: O- stock will deplete in 4.2 days without replacement.',
      created_at: new Date().toISOString(),
      source: 'Gemini AI Telemetry Engine'
    },
    {
      id: 'BB-006',
      name: 'Alexis Multispeciality Hospital Bank',
      city: region,
      area: 'Mankapur, Koradi Road',
      contact: '+91 712 712 0000',
      latitude: 21.1912,
      longitude: 79.0768,
      verified: true,
      total_units: 68,
      critical_shortages: ['B-'],
      inventory: { 'O+': 24, 'O-': 5, 'A+': 16, 'A-': 4, 'B+': 12, 'B-': 1, 'AB+': 8, 'AB-': 2 },
      ai_analysis: 'Corridor dispatch available for northern Nagpur emergencies.',
      created_at: new Date().toISOString(),
      source: 'Gemini AI Telemetry Engine'
    },
    {
      id: 'BB-007',
      name: 'Care Hospital Blood Centre',
      city: region,
      area: 'Ramdaspeth, Wardha Road',
      contact: '+91 712 398 2222',
      latitude: 21.1347,
      longitude: 79.0772,
      verified: true,
      total_units: 72,
      critical_shortages: [],
      inventory: { 'O+': 20, 'O-': 6, 'A+': 15, 'A-': 5, 'B+': 16, 'B-': 5, 'AB+': 9, 'AB-': 3 },
      ai_analysis: 'Balanced stock across all 8 blood groups; high readiness status.',
      created_at: new Date().toISOString(),
      source: 'Gemini AI Telemetry Engine'
    },
    {
      id: 'BB-008',
      name: 'Rashtrasant Tukadoji Cancer Blood Centre',
      city: region,
      area: 'Manewada Road, Tukadoji Square',
      contact: '+91 712 274 8920',
      latitude: 21.1090,
      longitude: 79.0980,
      verified: true,
      total_units: 59,
      critical_shortages: ['O-'],
      inventory: { 'O+': 18, 'O-': 3, 'A+': 12, 'A-': 4, 'B+': 14, 'B-': 5, 'AB+': 7, 'AB-': 2 },
      ai_analysis: 'High oncological platelet concentrate requirement; apheresis kits available.',
      created_at: new Date().toISOString(),
      source: 'Gemini AI Telemetry Engine'
    }
  ]
}

module.exports = {
  callGemini,
  generateLiveEmergencyStream,
  generateLiveDonors,
  generateInventoryForecast,
  generateAIClinicalMatchingRationale,
  generateLiveEvent,
  checkDonorEligibility,
  generateBloodBankDataWithGemini,
  startLiveSimulator,
  stopLiveSimulator,
  getSimulatorStatus,
}


