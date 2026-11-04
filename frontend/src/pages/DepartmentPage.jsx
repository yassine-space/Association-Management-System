import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentDept } from '../hooks/useCurrentDept'
import client from '../api/client'

export default function DepartmentPage() {
  const selectedDept = useCurrentDept()
  const navigate = useNavigate()
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedDept) return
    setLoading(true)
    client.get('/activities/').then(r => {
      const all = Array.isArray(r.data) ? r.data : (r.data.results ?? [])
      setActivities(all.filter(a => a.department === selectedDept.id))
    }).finally(() => setLoading(false))
  }, [selectedDept?.id])

  if (!selectedDept) return <div className="page-loading"><div className="spinner" /></div>
  if (loading) return <div className="page-loading"><div className="spinner" /></div>

  return (
    <div className="dept-page">
      <div className="dept-page-header">
        <div className="dept-page-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
          </svg>
        </div>
        <div>
          <h2>{selectedDept.name}</h2>
          {selectedDept.description && <p className="dept-page-desc">{selectedDept.description}</p>}
        </div>
      </div>

      <div className="dept-actions-row">
        <button className="btn-outline btn-sm" onClick={() => navigate(`/departments/${selectedDept.id}/members`)}>
          الأعضاء
        </button>
      </div>

      <h3 className="section-label">الأنشطة</h3>

      <div className="activity-grid">
        {activities.map(act => (
          <button key={act.id} className="activity-card" onClick={() => navigate(`/departments/${selectedDept.id}/activities/${act.id}`)}>
            <div className="activity-card-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
              </svg>
            </div>
            <h4>{act.name}</h4>
            {act.description && <p>{act.description}</p>}
            <span className="activity-card-cta">فتح ←</span>
          </button>
        ))}
      </div>

      {activities.length === 0 && (
        <div className="empty-state">لا توجد أنشطة في هذا القسم بعد.</div>
      )}
    </div>
  )
}