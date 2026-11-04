import { useEffect, useMemo, useState } from 'react'
import client from '../api/client'

export default function HomePage() {
  const [officeMembers, setOfficeMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showOfficeMembers, setShowOfficeMembers] = useState(false)
  const [selectedMandate, setSelectedMandate] = useState('')
  const MANDATE_PDFS = {
    '2026-2029': '/mandates/mandate-2026-2029.pdf',
    '2023-2026': '/mandates/mandate-2023-2026.pdf',
   }
  useEffect(() => {
    async function fetchOfficeMembers() {
      setLoading(true)
      setError('')
      try {
        const res = await client.get('/office-members/')
        const all = Array.isArray(res.data) ? res.data : (res.data?.results ?? [])
        setOfficeMembers(all)
      } catch {
        setError('تعذر تحميل أعضاء المكتب حالياً.')
      } finally {
        setLoading(false)
      }
    }

    fetchOfficeMembers()
  }, [])

  const groupedByMandate = useMemo(() => {
    const groups = {}
    for (const member of officeMembers) {
      const key = member.mandate || 'بدون عهدة'
      if (!groups[key]) groups[key] = []
      groups[key].push(member)
    }
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]))
  }, [officeMembers])

  const mandateOptions = useMemo(
    () => groupedByMandate.map(([mandate]) => mandate),
    [groupedByMandate]
  )

  const selectedMembers = useMemo(() => {
    const found = groupedByMandate.find(([mandate]) => mandate === selectedMandate)
    return found ? found[1] : []
  }, [groupedByMandate, selectedMandate])

  useEffect(() => {
    if (mandateOptions.length > 0 && !selectedMandate) {
      setSelectedMandate(mandateOptions[0])
    }
  }, [mandateOptions, selectedMandate])

  if (loading) return <div className="page-loading"><div className="spinner" /></div>

  return (
    <div className="dept-page home-page" dir="rtl">
      <div className="dept-page-header">
        <div className="dept-page-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <div>
          <h2>أعضاء المكتب</h2>
          <p className="dept-page-desc">عرض الأعضاء حسب العهدة. يمكنك إضافة أقسام أخرى في الصفحة لاحقاً.</p>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {!error && (
        <div className="home-dept-grid">
          <button
            type="button"
            className="home-dept-card"
            onClick={() => setShowOfficeMembers(v => !v)}
            style={{ minHeight: 180 }}
          >
            <div className="home-dept-card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3>أعضاء المكتب</h3>
            <p>عرض الأعضاء حسب العهدة</p>
            <span className="activity-card-cta">{showOfficeMembers ? 'إخفاء' : 'فتح'} ←</span>
          </button>
        </div>
      )}

      {!error && showOfficeMembers && groupedByMandate.length === 0 && (
        <div className="empty-state">لا يوجد أعضاء مكتب مسجلون حالياً.</div>
      )}

      {!error && showOfficeMembers && groupedByMandate.length > 0 && (
        <div className="table-wrapper" style={{ marginTop: 16 }}>
          <div className="table-toolbar">
           <h3 className="form-title" style={{ marginBottom: 0 }}>أعضاء المكتب</h3>
           <select
             className="search-input"
             value={selectedMandate}
             onChange={(e) => setSelectedMandate(e.target.value)}
             style={{ minWidth: 180 }}
           >
             {mandateOptions.map(m => (
               <option key={m} value={m}>{m}</option>
             ))}
           </select>
         
           {MANDATE_PDFS[selectedMandate] ? (
             <a
               href={MANDATE_PDFS[selectedMandate]}
               target="_blank"
               rel="noopener noreferrer"
               className="ph-btn ph-btn--cyan"
               style={{ textDecoration: 'none' }}
             >
               📄 الاعتماد
             </a>
           ) : (
             <span className="text-muted" style={{ fontSize: 12 }}>لا يوجد ملف اعتماد لهذه العهدة</span>
           )}
         </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>الدور</th>
                <th>رقم التعريف</th>
              </tr>
            </thead>
            <tbody>
              {selectedMembers.map((m) => (
                <tr key={m.id}>
                  <td><strong>{m.person_name || `#${m.person}`}</strong></td>
                  <td>{m.role || 'بدون دور'}</td>
                  <td className="text-muted">{m.person_nin || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}