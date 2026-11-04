import { useEffect, useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { useCurrentDept } from '../hooks/useCurrentDept'
import client from '../api/client'

export default function MembersPage() {
  const { currentUser } = useApp()
  const selectedDept = useCurrentDept()
  const [members, setMembers] = useState([])
  const [persons, setPersons] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ person: '', role: '', join_date: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [search, setSearch] = useState('')

  const personMap = useMemo(() => {
    const map = {}
    persons.forEach(p => { map[p.id] = p })
    return map
  }, [persons])

  const fetchData = () => {
    if (!selectedDept?.id) return
    setLoading(true)
    Promise.all([
      client.get('/members/'),
      client.get('/persons/'),
    ]).then(([membersRes, personsRes]) => {
      const allMembers = Array.isArray(membersRes.data) ? membersRes.data : (membersRes.data.results ?? [])
      const allPersons = Array.isArray(personsRes.data) ? personsRes.data : (personsRes.data.results ?? [])
      setMembers(allMembers.filter(m => m.department === selectedDept.id))
      setPersons(allPersons)
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchData()
  }, [selectedDept?.id])

  const resetForm = () => {
    setForm({ person: '', role: '', join_date: '' })
    setEditingId(null)
    setError('')
  }

  const openEdit = (member) => {
    setForm({
      person: String(member.person),
      role: member.role,
      join_date: member.join_date,
    })
    setEditingId(member.id)
    setShowForm(true)
    setError('')
  }

  const submit = async () => {
    if (!form.person || !form.role.trim() || !form.join_date) {
      setError('جميع الحقول مطلوبة')
      return
    }
    setSaving(true)
    const payload = {
      person: Number(form.person),
      department: selectedDept.id,
      role: form.role.trim(),
      join_date: form.join_date,
    }
    try {
      if (editingId) {
        await client.put(`/members/${editingId}/`, payload)
      } else {
        await client.post('/members/', payload)
      }
      resetForm()
      setShowForm(false)
      fetchData()
    } catch (e) {
      setError(JSON.stringify(e.response?.data || 'حدث خطأ'))
    } finally {
      setSaving(false)
    }
  }

  const deleteMember = async (id) => {
    setSaving(true)
    try {
      await client.delete(`/members/${id}/`)
      setDeleteConfirm(null)
      fetchData()
    } catch (e) {
      setError(JSON.stringify(e.response?.data || 'حدث خطأ'))
    } finally {
      setSaving(false)
    }
  }

  const filtered = members.filter(m => {
    const p = personMap[m.person]
    const q = search.toLowerCase()
    if (!q) return true
    const name = p ? `${p.first_name} ${p.last_name}`.toLowerCase() : ''
    return name.includes(q) || m.role?.toLowerCase().includes(q)
  })

  const availablePersons = persons.filter(p =>
    !members.some(m => m.person === p.id && m.id !== editingId)
  )
  const isSuperuser = !!currentUser?.is_superuser

  if (!selectedDept) {
    return <div className="empty-state">يرجى اختيار قسم من القائمة الجانبية.</div>
  }

  if (loading) return <div className="page-loading"><div className="spinner" /></div>

  return (
    <div className="members-page">
      <div className="dept-page-header">
        <div className="dept-page-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <h2>{isSuperuser ? `أعضاء ${selectedDept.name}` : `عرض أعضاء ${selectedDept.name}`}</h2>
          <p className="dept-page-desc">{members.length} عضو</p>
        </div>
      </div>


      <div className="table-wrapper">
        <div className="table-toolbar">
          <span style={{ fontWeight: 700, fontSize: 14 }}>قائمة الأعضاء ({filtered.length})</span>
          <input
            className="search-input"
            placeholder="بحث بالاسم أو الدور…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="mobile-card-list">
          {filtered.map(m => {
            const p = personMap[m.person]
            return (
              <div key={m.id} className="mobile-card">
                <div className="mobile-card-header">
                  <div>
                    <div className="mobile-card-title">
                      {p ? `${p.first_name} ${p.last_name}` : `عضو #${m.person}`}
                    </div>
                    <div className="mobile-card-sub">{m.role}</div>
                  </div>
                </div>
                <div className="mobile-card-meta">
                  <span>📅 انضم في {m.join_date}</span>
                  {p?.phone && <span>📞 {p.phone}</span>}
                </div>
              </div>
            )
          })}
        </div>

        <div className="data-table-desktop" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>الدور</th>
                <th className="col-hide-mobile">الهاتف</th>
                <th>تاريخ الانضمام</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => {
                const p = personMap[m.person]
                return (
                  <tr key={m.id}>
                    <td><strong>{p ? `${p.first_name} ${p.last_name}` : `#${m.person}`}</strong></td>
                    <td>{m.role}</td>
                    <td className="col-hide-mobile">{p?.phone || '—'}</td>
                    <td>{m.join_date}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && <p className="empty-msg">لا يوجد أعضاء في هذا القسم بعد.</p>}
      </div>

      {deleteConfirm && (
        <div className="confirm-overlay">
          <div className="confirm-box">
            <h3>تأكيد الحذف</h3>
            <p>هل أنت متأكد من رغبتك في إزالة هذا العضو من القسم؟</p>
            <div className="form-actions" style={{ justifyContent: 'center' }}>
              <button className="btn-danger" onClick={() => deleteMember(deleteConfirm)} disabled={saving}>
                {saving ? 'جارٍ الحذف…' : 'حذف'}
              </button>
              <button className="btn-ghost" onClick={() => setDeleteConfirm(null)} disabled={saving}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
