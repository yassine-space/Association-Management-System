import { useApp } from '../context/AppContext'
import { useNavigate, useParams, useLocation } from 'react-router-dom'

export default function Header() {
  const { setSidebarOpen, currentUser, onLogout, departments } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const { deptId } = useParams()

  const dept = departments.find(d => String(d.id) === deptId)

  // Build breadcrumbs from URL
  const crumbs = []
  const path = location.pathname

  if (path !== '/home') {
    crumbs.push({ label: 'الرئيسية', action: () => navigate('/home') })
  }
  if (deptId && dept) {
    crumbs.push({ label: dept.name, action: () => navigate(`/departments/${deptId}`) })
  }
  if (path.includes('/members')) crumbs.push({ label: 'الأعضاء', action: null })
  if (path.includes('/add-activity')) crumbs.push({ label: 'إضافة نشاط', action: null })
  if (path === '/add-department') crumbs.push({ label: 'إضافة قسم', action: null })
  if (path === '/people') crumbs.push({ label: 'إدارة الأشخاص', action: null })
  if (path === '/profile') crumbs.push({ label: 'الملف الشخصي', action: null })

  // Mobile title
  let mobileTitle = 'جمعية الغد أفضل'
  if (path === '/people') mobileTitle = 'إدارة الأشخاص'
  else if (path === '/profile') mobileTitle = 'الملف الشخصي'
  else if (path.includes('/members') && dept) mobileTitle = `أعضاء ${dept.name}`
  else if (path.includes('/add-activity')) mobileTitle = 'إضافة نشاط'
  else if (path === '/add-department') mobileTitle = 'إضافة قسم'
  else if (deptId && dept) mobileTitle = dept.name
  else if (path === '/home') mobileTitle = 'الرئيسية'

  const isProfileActive = path === '/profile'

  return (
    <>
      <style>{`
        .topbar-mobile-menu { display: none; }
        @media (max-width: 768px) {
          .topbar-mobile-menu {
            display: inline-flex !important;
            align-items: center; justify-content: center;
            width: 38px; height: 38px; min-width: 38px;
            border-radius: 8px; border: none;
            background: transparent; color: #6366f1;
            cursor: pointer; flex-shrink: 0; z-index: 5; position: relative;
          }
          .topbar-mobile-menu:active { background: rgba(99,102,241,.12); }
          .topbar-breadcrumb { display: none !important; }
        }
      `}</style>

      <header className="topbar">
        <button className="topbar-mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="فتح القائمة">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="topbar-mobile-title">{mobileTitle}</div>

        <nav className="topbar-breadcrumb">
          {crumbs.map((c, i) => (
            <span key={i} className="topbar-bc-group">
              {i > 0 && <span className="topbar-bc-sep">›</span>}
              {c.action ? (
                <button className="topbar-bc-link" onClick={c.action}>{c.label}</button>
              ) : (
                <span className="topbar-bc-current">{c.label}</span>
              )}
            </span>
          ))}
        </nav>

        <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => navigate('/profile')}
            title="الملف الشخصي"
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: isProfileActive ? '#6366f122' : 'transparent',
              border: isProfileActive ? '1px solid #6366f144' : '1px solid transparent',
              borderRadius: 8, padding: '5px 10px',
              color: isProfileActive ? '#a5b4fc' : '#94a3b8',
              cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all .15s',
            }}
            onMouseEnter={e => { if (!isProfileActive) e.currentTarget.style.background = '#334155' }}
            onMouseLeave={e => { if (!isProfileActive) e.currentTarget.style.background = 'transparent' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span className="topbar-user">
              {currentUser?.first_name || currentUser?.username || 'حسابي'}
            </span>
          </button>

          <button
            onClick={onLogout}
            style={{
              background: '#334155', border: 'none', borderRadius: 8,
              padding: '6px 12px', color: '#94a3b8', cursor: 'pointer', fontSize: 12,
            }}
          >
            خروج
          </button>
        </div>
      </header>
    </>
  )
}