import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { useApp } from './context/AppContext'

import Sidebar from './components/Sidebar'
import Header from './components/Header'
import HomePage from './pages/HomePage'
import DepartmentPage from './pages/DepartmentPage'
import MembersPage from './pages/MembersPage'
import PeoplePage from './pages/PeoplePage'
import ActivityRouter from './pages/ActivityRouter'
import ProfilePage from './pages/ProfilePage'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage'
import { RequireAuth, RequireSuperuser } from './RequireAuth'
import FinanceDashboard from './pages/FinanceDashboard'
import QuranSchoolDashboard from './pages/QuranSchoolDashboard'  
// 👇 add your public pages here
import LandingPage from './pages/LandingPage'
// import DonationPublicForm from './pages/DonationPublicForm'

import client from './api/client'
import './App.css'

const savedToken = localStorage.getItem('access_token')
if (savedToken) client.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`

function RegularAppShell({ currentUser, onLogout }) {
  return (
    <AppProvider currentUser={currentUser} onLogout={onLogout}>
      <ShellInner />
    </AppProvider>
  )
}

function ShellInner() {
  const { sidebarOpen } = useApp()

  return (
    <div className="app-shell" dir="rtl">
      <Sidebar />
      <div className={`app-body ${sidebarOpen ? 'app-body--shifted' : ''}`}>
        <Header />
        <main className="app-main">
          <Routes>
            <Route path="home" element={<HomePage />} />
            <Route path="people" element={<PeoplePage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="departments/:deptId" element={<DepartmentPage />} />
            <Route path="departments/:deptId/members" element={<MembersPage />} />
            <Route path="departments/:deptId/activities/:activityId" element={<ActivityRouter />} />
            <Route path="finance" element={<FinanceDashboard />} />
            <Route path="quran-school" element={<QuranSchoolDashboard />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  const [user, setUser]   = useState(null)
  const [ready, setReady] = useState(() => !localStorage.getItem('access_token'))

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    const timeout = setTimeout(() => setReady(true), 8000)

    client.get('/auth/me/')
      .then(res => setUser(res.data))
      .catch(() => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        delete client.defaults.headers.common['Authorization']
      })
      .finally(() => {
        clearTimeout(timeout)
        setReady(true)
      })

    return () => clearTimeout(timeout)
  }, [])

  function handleLogin(userData) { setUser(userData) }
  function handleLogout() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    delete client.defaults.headers.common['Authorization']
    setUser(null)
  }

  if (!ready) {
    return <div className="boot-loading">جارٍ التحقق من الجلسة…</div>
  }

  return (
    <Routes>
      {/* ── PUBLIC ROUTES — no auth required ── */}
      <Route
        path="/"
        element={user ? <Navigate to="/home" replace /> : <LandingPage />}
      />
      <Route path="/login" element={user ? <Navigate to="/home" replace /> : <LoginPage onLogin={handleLogin} />} />
      <Route path="/landing" element={<Navigate to="/" replace />} />
      {/* <Route path="/donate-form" element={<DonationPublicForm />} /> */}

      {/* ── SUPERUSER ONLY ── */}
      <Route
        path="/admin/*"
        element={
          <RequireSuperuser user={user}>
            <AdminPage currentUser={user} onLogout={handleLogout} />
          </RequireSuperuser>
        }
      />

      {/* ── REGULAR AUTHENTICATED APP ── */}
      <Route
        path="/*"
        element={
          <RequireAuth user={user}>
            {user?.is_superuser
              ? <Navigate to="/admin" replace />
              : <RegularAppShell currentUser={user} onLogout={handleLogout} />}
          </RequireAuth>
        }
      />
    </Routes>
  )
}