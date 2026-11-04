import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import client from '../api/client'
import logoImage from '../assets/photo_2026-06-13_11-54-41.jpg'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'

const Icons = {
  school: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.5 2.5 3 6 3s6-1.5 6-3v-5"/></svg>,
  finance: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  menu: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  home: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>,
  dept: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
  activity: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>,
  members: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  plus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  chevron: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6,9 12,15 18,9"/></svg>,
  pharmacy: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/><path d="M13 13h3M14.5 11.5v3"/></svg>,
}

function ActivityItem({ activity, dept }) {
  const { activityId } = useParams()
  const isActive = String(activityId) === String(activity.id)
  return (
    <Link
      to={`/departments/${dept.id}/activities/${activity.id}`}
      className={`sidebar-activity ${isActive ? 'sidebar-activity--active' : ''}`}
    >
      <span className="sidebar-activity-icon">{Icons.pharmacy}</span>
      <span className="sidebar-activity-name">{activity.name}</span>
    </Link>
  )
}

function DeptItem({ dept }) {
  const { expandedDept, setExpandedDept } = useApp()
  const { deptId } = useParams()
  const navigate = useNavigate()
  const isExpanded = expandedDept === dept.id
  const isDeptActive = String(deptId) === String(dept.id)
  const [activities, setActivities] = useState([])

  useEffect(() => {
    if (!isExpanded) return
    client.get('/activities/').then(r => {
      const all = Array.isArray(r.data) ? r.data : (r.data.results ?? [])
      setActivities(all.filter(a => a.department === dept.id))
    }).catch(() => {})
  }, [isExpanded, dept.id])

  const toggleExpand = () => {
    setExpandedDept(isExpanded ? null : dept.id)
  }

  return (
    <div className="sidebar-dept-group">
      <div className={`sidebar-dept-btn ${isDeptActive ? 'sidebar-dept-btn--active' : ''}`}>
        <button
          className="sidebar-dept-main"
          onClick={() => navigate(`/departments/${dept.id}`)}
        >
          <span className="sidebar-dept-icon">{Icons.dept}</span>
          <span className="sidebar-dept-name">{dept.name}</span>
        </button>
        <button
          className={`sidebar-chevron ${isExpanded ? 'sidebar-chevron--open' : ''}`}
          onClick={toggleExpand}
        >
          {Icons.chevron}
        </button>
      </div>

      {isExpanded && (
        <div className="sidebar-sub">
          {activities.map(a => (
            <ActivityItem key={a.id} activity={a} dept={dept} />
          ))}
          <button
            className="sidebar-sub-link sidebar-members-btn"
            onClick={() => navigate(`/departments/${dept.id}/members`)}
          >
            {Icons.members} <span>الأعضاء</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen, departments, expandedDept, setExpandedDept } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const { deptId } = useParams()
  const path = location.pathname
  const isHomeActive = path === '/home'
  const isPeopleActive = path === '/people'
  const isFinanceActive = path === '/finance'
  const isQuranSchoolActive = path === '/quran-school'
  useEffect(() => {
    if (!deptId) return
    const dept = departments.find(d => String(d.id) === deptId)
    if (dept && expandedDept !== dept.id) setExpandedDept(dept.id)
  }, [deptId, departments, expandedDept, setExpandedDept])

  return (
    <>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : 'sidebar--closed'}`}>
        <div className="sidebar-header">
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {Icons.menu}
          </button>
          {sidebarOpen && (
            <div className="sidebar-brand">
              <div className="sidebar-logo">
                <img src={logoImage} alt="جمعية الغد أفضل" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div className="sidebar-brand-text">
                <span className="sidebar-brand-name">جمعية الغد أفضل</span>
                <span className="sidebar-brand-sub">نظام إدارة الأنشطة</span>
              </div>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          <button className={`sidebar-home-btn ${isHomeActive ? 'sidebar-home-btn--active' : ''}`} onClick={() => navigate('/home')}>
            <span>{Icons.home}</span>
            {sidebarOpen && <span>الرئيسية</span>}
          </button>

          <button className={`sidebar-home-btn ${isPeopleActive ? 'sidebar-home-btn--active' : ''}`} onClick={() => navigate('/people')} title="إدارة الأشخاص">
            <span>{Icons.members}</span>
            {sidebarOpen && <span>إدارة الأشخاص</span>}
          </button>

          {sidebarOpen && (
            <>
              <div className="sidebar-section-label">الأقسام</div>
              {departments.map(d => <DeptItem key={d.id} dept={d} />)}
            </>
          )}

          {!sidebarOpen && departments.map(d => (
            <button
              key={d.id}
              className={`sidebar-icon-btn ${String(deptId) === String(d.id) ? 'sidebar-icon-btn--active' : ''}`}
              title={d.name}
              onClick={() => navigate(`/departments/${d.id}`)}
            >
              {Icons.dept}
            </button>

          ))}
          {/* ── Finance, kept separate from People Management ── */}
          {sidebarOpen && <div className="sidebar-section-label">الإدارة</div>}
          <button className={`sidebar-home-btn ${isFinanceActive ? 'sidebar-home-btn--active' : ''}`} onClick={() => navigate('/finance')} title="إدارة المالية">
            <span>{Icons.finance}</span>
            {sidebarOpen && <span>إدارة المالية</span>}
          </button>
          
          {/* ── New: Quranic School Management ── */}
          <button className={`sidebar-home-btn ${isQuranSchoolActive ? 'sidebar-home-btn--active' : ''}`} onClick={() => navigate('/quran-school')} title="إدارة المدرسة القرآنية">
            <span>{Icons.school}</span>
            {sidebarOpen && <span>المدرسة القرآنية</span>}
          </button>
        </nav>
      </aside>
    </>
  )
}