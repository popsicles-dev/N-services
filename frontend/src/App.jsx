import { useState, useEffect } from 'react'
import './index.css'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import Steve from './components/Steve'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import logo from './assets/nodra-logo.png'

function AppContent() {
  const { isAuthenticated, user, logout } = useAuth()
  const [pageLoaded, setPageLoaded] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const isAuthPage = ['/login', '/register'].includes(location.pathname)

  // Initial page fade-in effect
  useEffect(() => {
    const timer = setTimeout(() => setPageLoaded(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // Track scroll for header transparency
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Smooth scroll to section
  const scrollToSection = (e, sectionId) => {
    e.preventDefault()
    const el = document.getElementById(sectionId)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className={`min-h-screen w-full text-gray-900 font-body relative overflow-x-hidden selection:bg-blue-500 selection:text-white transition-all duration-1000 ease-out ${pageLoaded ? 'opacity-100' : 'opacity-0'}`}>

      {/* Fixed Background Gradient */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-cyan-50"></div>
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200/20 rounded-full blur-[100px] animate-float"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-200/20 rounded-full blur-[100px] animate-float animation-delay-1000"></div>
      </div>

      {/* Fixed Header with scroll-aware styling */}
      <header className={`fixed top-0 left-0 right-0 z-50 px-6 lg:px-10 py-4 flex justify-between items-center transition-all duration-300 ${scrolled ? 'backdrop-blur-xl bg-white/90 shadow-lg shadow-gray-100/50 border-b border-gray-100' : 'bg-transparent'}`}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 overflow-hidden">
            <img src={logo} alt="N-Services Logo" className="h-full w-auto max-w-none object-cover object-left" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 font-display tracking-tight">
            N-Services
          </h1>
        </div>

        {/* Navigation Links */}
        {!isAuthPage && (
          <nav className="hidden lg:flex items-center gap-8">
            <a href="#lead-extraction" onClick={(e) => scrollToSection(e, 'lead-extraction')} className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">Lead Extraction</a>
            <a href="#seo-audit" onClick={(e) => scrollToSection(e, 'seo-audit')} className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">SEO Audit</a>
            <a href="#email-generation" onClick={(e) => scrollToSection(e, 'email-generation')} className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">Email Generation</a>
            <a href="#sending" onClick={(e) => scrollToSection(e, 'sending')} className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">Sending</a>
          </nav>
        )}

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/25">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:block text-sm font-medium text-gray-700">{user?.username}</span>
              </div>
              <button onClick={logout} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-red-500 transition-colors">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Login</Link>
              <Link to="/register" className="px-5 py-2.5 text-sm font-medium text-white bg-[#22d3ee] hover:bg-[#06b6d4] rounded-xl shadow-lg shadow-cyan-500/25 transition-all hover:scale-105 active:scale-95">
                Get Started
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10">
        <Routes>
          <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
        </Routes>
      </main>

      {/* Steve - Fixed Bottom Right */}
      {isAuthenticated && (
        <div className="fixed bottom-6 right-6 z-40">
          <Steve />
        </div>
      )}
    </div>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </AuthProvider>
    </Router>
  )
}

export default App
