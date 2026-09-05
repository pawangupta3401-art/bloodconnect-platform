import { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Bot, Sparkles, CheckCircle2, ChevronDown, AlertCircle, HelpCircle } from 'lucide-react'
import { API_BASE } from '../config/api'
import './AIChatbot.css'

const QUICK_QUESTIONS = [
  'Can I donate after getting a tattoo?',
  'What are the age & weight limits?',
  'Can I donate after alcohol or beer?',
  'Can I donate if taking medicines/BP drugs?',
]

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: '👋 Hello! I am your **Blood Donation Eligibility Expert** powered by Gemini AI.\n\nAsk me any question about donor eligibility, waiting periods (tattoos, surgery), weight, or health criteria before you donate!',
    }
  ])

  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  const handleSendMessage = async (customQuery) => {
    const text = (customQuery || input).trim()
    if (!text || isLoading) return

    const userMsgId = `user-${Date.now()}`
    const newMessages = [...messages, { id: userMsgId, sender: 'user', text }]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    try {
      const API_URL = API_BASE
      const response = await fetch(`${API_URL}/api/v1/ai/chatbot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: newMessages.slice(-6).map(m => ({ sender: m.sender, text: m.text }))
        })
      })

      const data = await response.json()
      if (data.reply) {
        setMessages(prev => [...prev, {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: data.reply
        }])
      } else {
        throw new Error(data.error || 'No response')
      }
    } catch (err) {
      console.warn('[AIChatbot] Fallback local response:', err.message)
      setMessages(prev => [...prev, {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: '🩸 **Eligibility Guidelines:**\n• **Age:** 18 - 65 yrs\n• **Weight:** Min 45-50 kg\n• **Interval:** 90 days after previous donation\n• **Tattoos:** 6-12 months deferral period\n\nPlease check with our on-site team for a free pre-donation screening!'
      }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="ai-chatbot-wrapper">
      {!isOpen && (
        <button
          className="ai-floating-trigger"
          onClick={() => setIsOpen(true)}
          title="Ask Blood Donation Eligibility AI"
          aria-label="Open AI Eligibility Chatbot"
        >
          <div className="ai-badge-pulse" />
          <Bot size={28} />
        </button>
      )}

      {isOpen && (
        <div className="ai-chat-window">
          {/* Header */}
          <div className="ai-chat-header">
            <div className="ai-header-info">
              <div className="ai-avatar-icon">
                <Sparkles size={20} color="#fff" />
              </div>
              <div>
                <h4 className="ai-header-title">Eligibility AI Expert</h4>
                <p className="ai-header-subtitle">
                  <span className="ai-online-dot" /> Gemini AI Live
                </p>
              </div>
            </div>
            <button className="ai-close-btn" onClick={() => setIsOpen(false)}>
              <X size={18} />
            </button>
          </div>

          {/* Quick Query Pills */}
          <div className="ai-quick-pills">
            {QUICK_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                className="ai-pill-btn"
                onClick={() => handleSendMessage(q)}
                disabled={isLoading}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Messages Container */}
          <div className="ai-messages-list">
            {messages.map((m) => (
              <div key={m.id} className={`ai-msg-bubble ${m.sender}`}>
                {m.text}
              </div>
            ))}
            {isLoading && (
              <div className="ai-msg-bubble bot">
                <div className="ai-typing-dots">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <form
            className="ai-input-form"
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
          >
            <input
              type="text"
              className="ai-chat-input"
              placeholder="Ask about weight, tattoos, diseases..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="submit"
              className="ai-send-btn"
              disabled={!input.trim() || isLoading}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
