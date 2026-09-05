import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import DonorPortal from './pages/DonorPortal'
import BloodBankPortal from './pages/BloodBankPortal'
import HospitalPortal from './pages/HospitalPortal'
import EmergencySOS from './pages/EmergencySOS'
import AdminPanel from './pages/AdminPanel'
import NagpurLifeStreamGrid from './pages/NagpurLifeStreamGrid'
import DesignSystemShowcase from './pages/DesignSystemShowcase'
import MobileAppSimulator from './pages/MobileAppSimulator'
import SosWidget from './pages/SosWidget'
import Certificate from './pages/Certificate'
import DroneTransport from './pages/DroneTransport'
import { AuthProvider } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import RealTimeAlertModal from './components/RealTimeAlertModal'
import AIChatbot from './components/AIChatbot'
import TransitTrackerModal from './components/TransitTrackerModal'
import PwaInstallPrompt from './components/PwaInstallPrompt'
import { Navigation } from 'lucide-react'

function App() {
  const [isTransitModalOpen, setIsTransitModalOpen] = useState(false)

  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
        {/* Global Real-Time Sockets Emergency Alert Popup */}
        <RealTimeAlertModal />

        {/* Global AI Eligibility Chatbot (Gemini) */}
        <AIChatbot />

        {/* Global PWA Install Prompt Banner */}
        <PwaInstallPrompt />

        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/donor/*" element={<DonorPortal />} />
          <Route path="/blood-bank/*" element={<BloodBankPortal />} />
          <Route path="/hospital/*" element={<HospitalPortal />} />
          <Route path="/emergency" element={<EmergencySOS />} />
          <Route path="/sos" element={<SosWidget />} />
          <Route path="/certificate/:certId" element={<Certificate />} />
          {/* Fast Drone Transport — simulated demo feature (see DroneTransport.jsx for disclaimer) */}
          <Route path="/drone-transport" element={<DroneTransport />} />
          <Route path="/admin/*" element={<AdminPanel />} />
          <Route path="/lifestream" element={<NagpurLifeStreamGrid />} />
          <Route path="/lifestream/:tab" element={<NagpurLifeStreamGrid />} />
          <Route path="/lifestream/:tab/:donorId" element={<NagpurLifeStreamGrid />} />
          <Route path="/grid" element={<NagpurLifeStreamGrid />} />
          <Route path="/grid/:tab" element={<NagpurLifeStreamGrid />} />
          <Route path="/grid/:tab/:donorId" element={<NagpurLifeStreamGrid />} />
          <Route path="/nagpur" element={<NagpurLifeStreamGrid />} />
          <Route path="/nagpur/:tab" element={<NagpurLifeStreamGrid />} />
          <Route path="/nagpur/:tab/:donorId" element={<NagpurLifeStreamGrid />} />
          <Route path="/design-system" element={<DesignSystemShowcase />} />
          <Route path="/mobile" element={<MobileAppSimulator />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  )
}

export default App

