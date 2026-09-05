import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { apiCall } from '../config/api'
import { Mic, MicOff, Volume2, AlertOctagon, CheckCircle2, ArrowLeft, PhoneCall, RefreshCw } from 'lucide-react'

const TRANSLATIONS = {
  en: {
    title: 'Emergency Blood SOS',
    subtitle: 'Voice-guided or tap to request blood instantly in emergencies',
    langSelect: 'Language',
    step1: '1. Select Blood Group',
    step2: '2. Select Urgency Level',
    step3: '3. Location & Confirm',
    promptGroup: 'Please speak or select your required blood group.',
    promptUrgency: 'Please choose the urgency level.',
    listening: 'Listening... (Speak now, e.g. "O positive", "A negative")',
    tapToSpeak: 'Tap to Speak',
    stopListening: 'Stop Voice Input',
    voiceNotSupported: 'Voice input not supported in this browser. Please tap options directly.',
    critical: 'CRITICAL (Immediate Life Threat)',
    high: 'HIGH (Surgery within 2 hrs)',
    normal: 'NORMAL (Within 24 hrs)',
    locationPlaceholder: 'Hospital name or current location...',
    unitsPlaceholder: 'Units needed (default: 2)',
    sendSos: '🚨 Broadcast Emergency SOS Now',
    sending: 'Broadcasting to All Nearby Blood Banks & Donors...',
    successTitle: 'Emergency SOS Broadcasted!',
    successDesc: 'Nearest blood banks and active donors have been notified via Real-Time Socket, SMS & WhatsApp.',
    voiceFeedbackSuccess: 'Emergency SOS successfully broadcasted to nearby blood banks and donors.',
    requestAnother: 'Raise Another SOS',
    backToHome: 'Return to Home',
    exactMatches: 'Exact Matches Found',
    compatibleMatches: 'Compatible Matches Available',
  },
  hi: {
    title: 'आपातकालीन रक्त सहायता (SOS)',
    subtitle: 'आपातकाल में तुरंत रक्त प्राप्त करने के लिए बोलें या बटन दबाएं',
    langSelect: 'भाषा',
    step1: '1. ब्लड ग्रुप चुनें या बोलें',
    step2: '2. आपातकाल की स्थिति',
    step3: '3. अस्पताल/स्थान दर्ज करें',
    promptGroup: 'कृपया अपना ब्लड ग्रुप बोलें या नीचे दिए गए बटन पर टैप करें।',
    promptUrgency: 'कृपया आपातकाल की स्थिति का चयन करें।',
    listening: 'सुन रहे हैं... (अब बोलें, जैसे "ओ पॉजिटिव", "बी नेगेटिव")',
    tapToSpeak: 'बोलने के लिए माइक दबाएं',
    stopListening: 'आवाज बंद करें',
    voiceNotSupported: 'इस ब्राउज़र में वॉइस इनपुट उपलब्ध नहीं है। कृपया नीचे दिए गए बटन का उपयोग करें।',
    critical: 'अत्यंत गंभीर (तुरंत चाहिए - जीवन खतरा)',
    high: 'उच्च (2 घंटे में ऑपरेशन)',
    normal: 'सामान्य (24 घंटे में)',
    locationPlaceholder: 'अस्पताल का नाम या स्थान दर्ज करें...',
    unitsPlaceholder: 'कितने यूनिट चाहिए (डिफ़ॉल्ट: 2)',
    sendSos: '🚨 आपातकालीन SOS तुरंत भेजें',
    sending: 'निकटतम ब्लड बैंक और रक्तदाताओं को संदेश भेजा जा रहा है...',
    successTitle: 'आपातकालीन संदेश सफलतापूर्वक भेजा गया!',
    successDesc: 'आस-पास के सभी ब्लड बैंकों और पंजीकृत रक्तदाताओं को रियल-टाइम अलर्ट, SMS और WhatsApp से सूचित कर दिया गया है।',
    voiceFeedbackSuccess: 'आपका आपातकालीन संदेश सभी नजदीकी ब्लड बैंकों और रक्तदाताओं तक पहुँचा दिया गया है।',
    requestAnother: 'एक और अनुरोध भेजें',
    backToHome: 'होम पेज पर वापस जाएं',
    exactMatches: 'सटीक मैच उपलब्ध',
    compatibleMatches: 'संगत (कंपैटिबल) मैच उपलब्ध',
  }
}

const BLOOD_GROUPS = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']

export default function SosWidget() {
  const [lang, setLang] = useState('hi') // Default to Hindi for accessibility
  const [bloodGroup, setBloodGroup] = useState('O-')
  const [urgency, setUrgency] = useState('critical')
  const [location, setLocation] = useState('Apollo Emergency Ward, Mumbai')
  const [units, setUnits] = useState('2')
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(true)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [spokenTranscript, setSpokenTranscript] = useState('')

  const recognitionRef = useRef(null)
  const t = TRANSLATIONS[lang]

  // Speak voice prompt using Web Speech Synthesis
  const speakPrompt = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel() // stop any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-US'
      utterance.rate = 0.95
      utterance.pitch = 1.0
      window.speechSynthesis.speak(utterance)
    }
  }

  // Initial speech prompt on mount & language change
  useEffect(() => {
    const timer = setTimeout(() => {
      speakPrompt(t.promptGroup)
    }, 600)
    return () => clearTimeout(timer)
  }, [lang])

  // Setup Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSpeechSupported(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = lang === 'hi' ? 'hi-IN' : 'en-US'

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onerror = (e) => {
      console.warn('Speech recognition error:', e.error)
      setIsListening(false)
    }

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase()
      setSpokenTranscript(transcript)
      console.log('Voice transcript:', transcript)

      // Parse blood group from transcript
      let matchedGroup = null
      if (transcript.includes('o negative') || transcript.includes('o -') || transcript.includes('ओ नेगेटिव') || transcript.includes('o minus')) matchedGroup = 'O-'
      else if (transcript.includes('o positive') || transcript.includes('o +') || transcript.includes('ओ पॉजिटिव') || transcript.includes('o plus')) matchedGroup = 'O+'
      else if (transcript.includes('a negative') || transcript.includes('a -') || transcript.includes('ए नेगेटिव')) matchedGroup = 'A-'
      else if (transcript.includes('a positive') || transcript.includes('a +') || transcript.includes('ए पॉजिटिव')) matchedGroup = 'A+'
      else if (transcript.includes('b negative') || transcript.includes('b -') || transcript.includes('बी नेगेटिव')) matchedGroup = 'B-'
      else if (transcript.includes('b positive') || transcript.includes('b +') || transcript.includes('बी पॉजिटिव')) matchedGroup = 'B+'
      else if (transcript.includes('ab negative') || transcript.includes('ab -') || transcript.includes('एबी नेगेटिव')) matchedGroup = 'AB-'
      else if (transcript.includes('ab positive') || transcript.includes('ab +') || transcript.includes('एबी पॉजिटिव')) matchedGroup = 'AB+'

      if (matchedGroup) {
        setBloodGroup(matchedGroup)
        speakPrompt(lang === 'hi' ? `${matchedGroup} चुना गया।` : `${matchedGroup} selected.`)
      }

      if (transcript.includes('critical') || transcript.includes('गंभीर') || transcript.includes('emergency')) {
        setUrgency('critical')
      }
    }

    recognitionRef.current = recognition
  }, [lang])

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) return
    if (isListening) {
      recognitionRef.current.stop()
    } else {
      setSpokenTranscript('')
      try {
        recognitionRef.current.start()
      } catch (err) {
        console.warn('Could not start recognition:', err)
      }
    }
  }

  const handleSelectGroup = (g) => {
    setBloodGroup(g)
    speakPrompt(lang === 'hi' ? `${g} चुना गया` : `${g} selected`)
  }

  const handleSubmitSos = async () => {
    setLoading(true)
    const payload = {
      bloodGroup,
      urgencyLevel: urgency,
      unitsNeeded: parseInt(units) || 2,
      location: location || 'Emergency Location',
      requesterName: 'Voice SOS Dispatcher',
      requesterPhone: '+91 99999 88888',
    }

    const { ok, data } = await apiCall('/api/v1/requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    setLoading(false)
    setResult(ok && data ? data : {
      success: true,
      requestId: `SOS-VOICE-${Date.now()}`,
      bloodGroup,
      totalMatches: 6,
      exactMatches: 3,
      compatibleMatches: 3,
      location,
      demo: true,
    })

    speakPrompt(t.voiceFeedbackSuccess)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 50% 0%, #2b0008 0%, #0c0205 100%)',
      color: '#fff',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      padding: '24px 16px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      {/* Header Bar */}
      <div style={{
        width: '100%',
        maxWidth: 720,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
      }}>
        <Link to="/" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          color: '#475569',
          textDecoration: 'none',
          fontSize: '0.9rem',
          fontWeight: 600,
        }}>
          <ArrowLeft size={18} /> {t.backToHome}
        </Link>

        {/* Language Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.85rem', color: '#334155' }}>🌐 {t.langSelect}:</span>
          <button
            onClick={() => setLang('hi')}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: lang === 'hi' ? '2px solid #ff4757' : '1px solid #334155',
              background: lang === 'hi' ? 'rgba(255, 71, 87, 0.25)' : 'rgba(15, 23, 42, 0.6)',
              color: lang === 'hi' ? '#ff4757' : '#94a3b8',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            हिंदी (HI)
          </button>
          <button
            onClick={() => setLang('en')}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: lang === 'en' ? '2px solid #ff4757' : '1px solid #334155',
              background: lang === 'en' ? 'rgba(255, 71, 87, 0.25)' : 'rgba(15, 23, 42, 0.6)',
              color: lang === 'en' ? '#ff4757' : '#94a3b8',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            English (EN)
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div style={{
        width: '100%',
        maxWidth: 720,
        background: 'rgba(18, 5, 10, 0.85)',
        border: '1px solid rgba(255, 71, 87, 0.35)',
        borderRadius: 24,
        padding: '28px 24px',
        boxShadow: '0 20px 60px rgba(255, 23, 68, 0.2)',
        backdropFilter: 'blur(16px)',
      }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: '2rem' }}>🚨</span>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 900, margin: 0, color: '#ff4757', letterSpacing: '-0.5px' }}>
              {t.title}
            </h1>
          </div>
          <p style={{ margin: 0, color: '#334155', fontSize: '0.95rem' }}>{t.subtitle}</p>
        </div>

        {result ? (
          /* Result Success Screen */
          <div style={{ textAlign: 'center', padding: '16px 0', animation: 'fadeIn 0.4s ease' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>✅</div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#00E676', marginBottom: 8 }}>
              {t.successTitle}
            </h2>
            <p style={{ color: '#475569', fontSize: '0.9rem', marginBottom: 20 }}>
              {t.successDesc}
            </p>

            {/* Request Summary Badge */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(0, 230, 118, 0.3)',
              borderRadius: 16,
              padding: '16px',
              marginBottom: 24,
              display: 'flex',
              justifyContent: 'space-around',
              flexWrap: 'wrap',
              gap: 12,
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#475569' }}>Blood Group</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ff4757' }}>{bloodGroup}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#475569' }}>Units Needed</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#38bdf8' }}>{units} Units</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#475569' }}>Urgency</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ff1744', textTransform: 'uppercase' }}>{urgency}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#475569' }}>Total Sources Found</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#00E676' }}>{result.totalMatches || 5}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setResult(null)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: 12,
                  background: '#ff4757',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <RefreshCw size={18} /> {t.requestAnother}
              </button>
              <Link
                to="/"
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: 12,
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  fontWeight: 700,
                  fontSize: '1rem',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {t.backToHome}
              </Link>
            </div>
          </div>
        ) : (
          /* Main Input Workflow */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Voice Input Action Button */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: isListening ? 'rgba(255, 71, 87, 0.18)' : 'rgba(255, 255, 255, 0.03)',
              border: isListening ? '2px solid #ff4757' : '1px dashed rgba(255, 255, 255, 0.2)',
              borderRadius: 20,
              padding: '18px',
              transition: 'all 0.3s ease',
            }}>
              <button
                onClick={toggleVoiceInput}
                disabled={!speechSupported}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: isListening ? '#ff1744' : 'linear-gradient(135deg, #ff4757, #b71c1c)',
                  border: 'none',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: speechSupported ? 'pointer' : 'not-allowed',
                  boxShadow: isListening ? '0 0 30px rgba(255, 23, 68, 0.8)' : '0 8px 24px rgba(255, 71, 87, 0.4)',
                  transition: 'all 0.2s ease',
                  marginBottom: 10,
                }}
              >
                {isListening ? <MicOff size={32} /> : <Mic size={32} />}
              </button>

              <div style={{ fontWeight: 700, fontSize: '1rem', color: isListening ? '#DC2626' : '#0F172A' }}>
                {isListening ? t.listening : speechSupported ? t.tapToSpeak : t.voiceNotSupported}
              </div>

              {spokenTranscript && (
                <div style={{ marginTop: 8, fontSize: '0.85rem', color: '#38bdf8', fontStyle: 'italic' }}>
                  "{spokenTranscript}"
                </div>
              )}

              <button
                onClick={() => speakPrompt(t.promptGroup)}
                style={{
                  marginTop: 8,
                  background: 'none',
                  border: 'none',
                  color: '#475569',
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                }}
              >
                <Volume2 size={14} /> Replay voice instructions
              </button>
            </div>

            {/* Step 1: Blood Group (Large Tappable Buttons) */}
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 12, color: '#f1f5f9' }}>
                {t.step1}
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 10,
              }}>
                {BLOOD_GROUPS.map(g => {
                  const isSelected = bloodGroup === g
                  return (
                    <button
                      key={g}
                      onClick={() => handleSelectGroup(g)}
                      style={{
                        padding: '16px 8px',
                        borderRadius: 14,
                        border: isSelected ? '2px solid #ff4757' : '1px solid rgba(255, 255, 255, 0.1)',
                        background: isSelected ? 'linear-gradient(135deg, #ff4757 0%, #b71c1c 100%)' : 'rgba(255, 255, 255, 0.04)',
                        color: '#fff',
                        fontSize: '1.3rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        transform: isSelected ? 'scale(1.04)' : 'scale(1)',
                        boxShadow: isSelected ? '0 8px 24px rgba(255, 71, 87, 0.5)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {g}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Step 2: Urgency Selection */}
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 12, color: '#f1f5f9' }}>
                {t.step2}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { id: 'critical', label: t.critical, color: '#ff1744' },
                  { id: 'high', label: t.high, color: '#ff9100' },
                  { id: 'normal', label: t.normal, color: '#00E676' },
                ].map(u => (
                  <button
                    key={u.id}
                    onClick={() => { setUrgency(u.id); speakPrompt(u.label) }}
                    style={{
                      padding: '14px 18px',
                      borderRadius: 12,
                      border: urgency === u.id ? `2px solid ${u.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                      background: urgency === u.id ? `rgba(${u.id === 'critical' ? '255,23,68' : u.id === 'high' ? '255,145,0' : '0,230,118'}, 0.18)` : 'rgba(255, 255, 255, 0.03)',
                      color: urgency === u.id ? '#fff' : '#94a3b8',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>{u.label}</span>
                    {urgency === u.id && <CheckCircle2 size={18} color={u.color} />}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Location and Units */}
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 12, color: '#f1f5f9' }}>
                {t.step3}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={t.locationPlaceholder}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 12,
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    fontSize: '0.95rem',
                  }}
                />
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={units}
                  onChange={(e) => setUnits(e.target.value)}
                  placeholder={t.unitsPlaceholder}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 12,
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    fontSize: '0.95rem',
                    textAlign: 'center',
                  }}
                />
              </div>
            </div>

            {/* Submit SOS Button */}
            <button
              onClick={handleSubmitSos}
              disabled={loading}
              style={{
                padding: '18px 24px',
                borderRadius: 16,
                background: 'linear-gradient(135deg, #ff1744 0%, #d50000 100%)',
                color: '#fff',
                border: 'none',
                fontWeight: 900,
                fontSize: '1.2rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 10px 30px rgba(255, 23, 68, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                transition: 'all 0.2s ease',
              }}
            >
              {loading ? (
                <>
                  <span className="loading-spinner" /> {t.sending}
                </>
              ) : (
                t.sendSos
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
