import { createContext, useContext, useState, useEffect } from 'react'
import client from '../api/client'

const AppContext = createContext()

export function AppProvider({ children, currentUser, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth > 768 : true
  )
  const [departments, setDepartments] = useState([])
  const [expandedDept, setExpandedDept] = useState(null)

  const fetchDepartments = () => {
    client.get('/departments/').then(r => {
      const data = r.data
      setDepartments(Array.isArray(data) ? data : (data.results ?? []))
    }).catch(() => setDepartments([]))
  }

  useEffect(() => { fetchDepartments() }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const onChange = (e) => { if (e.matches) setSidebarOpen(false) }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return (
    <AppContext.Provider value={{
      sidebarOpen, setSidebarOpen,
      departments, fetchDepartments,
      expandedDept, setExpandedDept,
      currentUser, onLogout,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)