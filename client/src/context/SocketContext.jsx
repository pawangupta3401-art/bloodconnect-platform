import React, { createContext, useContext, useEffect, useState } from 'react'
import io from 'socket.io-client'
import { SOCKET_URL } from '../config/api'

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [latency, setLatency] = useState('8ms')
  const [activeClients, setActiveClients] = useState(156)
  const [latestEmergency, setLatestEmergency] = useState(null)
  const [livePulse, setLivePulse] = useState(null)
  const [realtimeNotification, setRealtimeNotification] = useState(null)

  useEffect(() => {
    // Initialize single global WebSocket connection
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
    })

    newSocket.on('connect', () => {
      console.log('⚡ [Socket.io] Connected to BloodConnect Real-Time Gateway:', newSocket.id)
      setIsConnected(true)
      // Auto-join common broadcast rooms
      newSocket.emit('join-room', 'donors')
      newSocket.emit('join-room', 'blood-banks')
      newSocket.emit('join-room', 'hospitals')
    })

    newSocket.on('disconnect', () => {
      console.log('⚠️ [Socket.io] Disconnected from Real-Time Gateway')
      setIsConnected(false)
    })

    // Listen for Emergency Broadcasts
    newSocket.on('emergency_alert', (data) => {
      console.log('🚨 [Socket.io] Real-time Emergency SOS Received:', data)
      setLatestEmergency(data)
      setRealtimeNotification({
        type: 'emergency',
        title: `🚨 Emergency SOS: ${data.bloodGroup || 'Blood Needed'}`,
        message: `${data.unitsNeeded || 1} units required at ${data.location || 'Hospital'} (${data.urgencyLevel || 'CRITICAL'})`,
        timestamp: new Date().toLocaleTimeString()
      })
    })

    newSocket.on('new-emergency', (data) => {
      setLatestEmergency(data)
    })

    // Listen for Periodic Telemetry Heartbeat
    newSocket.on('live-pulse', (pulse) => {
      setLivePulse(pulse)
      if (pulse.systemLatency) setLatency(pulse.systemLatency)
      if (pulse.activeNodes) setActiveClients(pulse.activeNodes)
    })

    // Listen for Appointment Bookings
    newSocket.on('appointment:new', (apt) => {
      setRealtimeNotification({
        type: 'appointment',
        title: `📅 New Appointment Scheduled`,
        message: `${apt.donor_name} booked a slot at ${apt.branch_name} (${apt.time_slot})`,
        timestamp: new Date().toLocaleTimeString()
      })
    })

    // Listen for Inventory Updates
    newSocket.on('inventory:update', (inv) => {
      setRealtimeNotification({
        type: 'inventory',
        title: `📦 Inventory Updated Live`,
        message: `${inv.bloodGroup || 'Blood units'} stock level updated at central hub`,
        timestamp: new Date().toLocaleTimeString()
      })
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [])

  // Auto-dismiss transient toast after 6 seconds
  useEffect(() => {
    if (realtimeNotification) {
      const timer = setTimeout(() => {
        setRealtimeNotification(null)
      }, 6000)
      return () => clearTimeout(timer)
    }
  }, [realtimeNotification])

  // Helper emitter functions
  const emitEmergencySOS = (data) => {
    if (socket && isConnected) {
      socket.emit('emergency-sos', data)
    }
  }

  const emitInventoryUpdate = (data) => {
    if (socket && isConnected) {
      socket.emit('inventory-update', data)
    }
  }

  const emitAppointmentBooked = (data) => {
    if (socket && isConnected) {
      socket.emit('appointment:book', data)
    }
  }

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        latency,
        activeClients,
        latestEmergency,
        livePulse,
        emitEmergencySOS,
        emitInventoryUpdate,
        emitAppointmentBooked,
        clearLatestEmergency: () => setLatestEmergency(null),
      }}
    >
      {children}

      {/* Floating Live Real-Time Toast Notification */}
      {realtimeNotification && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 99999,
            backgroundColor: realtimeNotification.type === 'emergency' ? '#1e0508' : '#0f172a',
            border: `1px solid ${realtimeNotification.type === 'emergency' ? '#FF1744' : '#38BDF8'}`,
            boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
            borderRadius: '12px',
            padding: '14px 18px',
            maxWidth: '360px',
            color: '#FFF',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            animation: 'fadeIn 0.3s ease',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div style={{ fontSize: '20px' }}>
            {realtimeNotification.type === 'emergency' ? '🚨' : '⚡'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: realtimeNotification.type === 'emergency' ? '#FF4D6D' : '#38BDF8' }}>
              {realtimeNotification.title}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#E2E8F0', marginTop: '3px', lineHeight: 1.4 }}>
              {realtimeNotification.message}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#94A3B8', marginTop: '6px' }}>
              {realtimeNotification.timestamp} • WebSocket Broadcast
            </div>
          </div>
          <button
            onClick={() => setRealtimeNotification(null)}
            style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '14px', padding: '0 4px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Persistent Real-Time Live Status Pill Badge */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9997,
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          border: `1px solid ${isConnected ? 'rgba(0, 230, 118, 0.4)' : 'rgba(255, 23, 68, 0.4)'}`,
          borderRadius: '999px',
          padding: '6px 14px',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: isConnected ? '#00E676' : '#FF1744',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isConnected ? '#00E676' : '#FF1744',
            display: 'inline-block',
            boxShadow: isConnected ? '0 0 8px #00E676' : 'none',
          }}
        />
        <span>{isConnected ? `WebSocket Live • ${latency}` : 'Reconnecting...'}</span>
      </div>
    </SocketContext.Provider>
  )
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

export default SocketContext
