import { useEffect, useState } from 'react'
import client from '../api/client'

export default function PeoplePage() {
  const [persons, setPersons] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    nin: '',
    phone: '',
    address: '',
    date_of_birth: '',
    gender: 'M'
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const isCoordinates = (address) => {
    if (!address) return false
    return /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/.test(address.trim())
  }
  const renderAddress = (address) => {
    if (isCoordinates(address)) {
      const coords = address.trim()
      return (
        <a
          href={`https://www.google.com/maps?q=${coords}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#a855f7', textDecoration: 'underline' }}
        >
          {coords}
        </a>
      )
    }
    return address
  }
  const fetchPersons = () => {
    client.get('/persons/').then(r => {
      setPersons(Array.isArray(r.data) ? r.data : (r.data.results ?? []))
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchPersons()
  }, [])

  const resetForm = () => {
    setForm({
      first_name: '',
      last_name: '',
      nin: '',
      phone: '',
      address: '',
      date_of_birth: '',
      gender: 'M'
    })
    setEditingId(null)
    setError('')
  }

  const openEditForm = (person) => {
    setForm({
      first_name: person.first_name,
      last_name: person.last_name,
      nin: person.nin,
      phone: person.phone,
      address: person.address,
      date_of_birth: person.date_of_birth,
      gender: person.gender
    })
    setEditingId(person.id)
    setShowForm(true)
  }

  const submit = async () => {
    if (!form.first_name || !form.last_name  || !form.date_of_birth || !form.address) {
      setError(' الاسم الأول والاسم الأخير و تاريخ الميلاد و العنوان والجنس فقط هي الحقول الإلزامية')
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await client.put(`/persons/${editingId}/`, form)
      } else {
        await client.post('/persons/', form)
      }
      resetForm()
      setShowForm(false)
      fetchPersons()
    } catch (e) {
      setError(JSON.stringify(e.response?.data || 'حدث خطأ'))
    } finally {
      setSaving(false)
    }
  }

  const deletePerson = async (id) => {
    setSaving(true)
    try {
      await client.delete(`/persons/${id}/`)
      setDeleteConfirm(null)
      fetchPersons()
    } catch (e) {
      setError(JSON.stringify(e.response?.data || 'حدث خطأ'))
    } finally {
      setSaving(false)
    }
  }

  const filteredPersons = persons.filter(p => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return true
    const fullName = `${p.first_name ?? ''} ${p.last_name ?? ''}`.toLowerCase()
    const phone = (p.phone ?? '').toLowerCase()
    return fullName.includes(term) || phone.includes(term)
  })

  if (loading) return <div className="page-loading"><div className="spinner" /></div>

  return (
    <div className="people-page">
      <div className="dept-page-header">
        <div className="dept-page-icon" style={{ background: '#f3e8ff', color: '#a855f7' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H4a4 4 0 0 0-4 4v2"/>
            <circle cx="8" cy="5" r="4"/>
            <path d="M23 11h-6M20 8v6"/>
          </svg>
        </div>
        <div>
          <h2>إدارة الأشخاص</h2>
          <p className="dept-page-desc">{filteredPersons.length} شخص{searchTerm ? ` (من أصل ${persons.length})` : ''}</p>
        </div>
        <button className="btn-primary btn-sm" style={{ marginRight: 'auto' }} onClick={() => setShowForm(!showForm)}>
          + إضافة شخص
        </button>
      </div>

      <div className="search-bar" style={{ marginBottom: 16 }}>
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="ابحث بالاسم أو رقم الهاتف..."
          className="search-input"
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: 8,
            border: '1px solid #e2e2e2',
            fontSize: 14
          }}
        />
      </div>

      {showForm && (
        <div className="form-card" style={{ marginBottom: 24 }}>
          <h4 className="form-title">{editingId ? 'تعديل الشخص' : 'إضافة شخص جديد'}</h4>
          {error && <div className="form-error">{error}</div>}
          <div className="form-grid">
            <label className="field">
              <span>الاسم الأول *</span>
              <input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} placeholder="الاسم الأول" />
            </label>
            <label className="field">
              <span>الاسم الأخير *</span>
              <input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} placeholder="الاسم الأخير" />
            </label>
            <label className="field">
              <span>رقم التعريف (NIN) *</span>
              <input value={form.nin} onChange={e => setForm({ ...form, nin: e.target.value })} placeholder="رقم التعريف"  />
            </label>
            <label className="field">
              <span>رقم الهاتف *</span>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="رقم الهاتف" />
            </label>
            <label className="field">
              <span>تاريخ الميلاد *</span>
              <input type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} />
            </label>
            <label className="field">
              <span>الجنس *</span>
              <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                <option value="M">ذكر</option>
                <option value="F">أنثى</option>
              </select>
            </label>
            <label className="field" style={{ gridColumn: '1 / -1' }}>
              <span>العنوان *</span>
              <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="العنوان" rows="3" />
            </label>
          </div>
          <div className="form-actions">
            <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? 'جارٍ الحفظ…' : editingId ? 'تحديث' : 'إضافة'}</button>
            <button className="btn-ghost" onClick={() => {
              resetForm()
              setShowForm(false)
            }}>إلغاء</button>
          </div>
        </div>
      )}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>الاسم الكامل</th>
              <th>رقم التعريف</th>
              <th>الهاتف</th>
              <th>العنوان</th>
              <th>تاريخ الميلاد</th>
              <th>الجنس</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredPersons.map(p => (
              <tr key={p.id}>
                <td><strong>{p.first_name} {p.last_name}</strong></td>
                <td className="text-muted">{p.nin}</td>
                <td>{p.phone}</td>
                <td className="text-muted">{renderAddress(p.address)}</td>
                <td>{p.date_of_birth}</td>
                <td>{p.gender === 'M' ? 'ذكر' : 'أنثى'}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button 
                    className="btn-sm btn-primary" 
                    onClick={() => openEditForm(p)}
                    style={{ marginRight: 8 }}
                  >
                    تعديل
                  </button>
                  <button 
                    className="btn-sm btn-danger" 
                    onClick={() => setDeleteConfirm(p.id)}
                  >
                    حذف
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredPersons.length === 0 && (
          <p className="empty-msg">
            {searchTerm ? 'لا توجد نتائج مطابقة للبحث.' : 'لا يوجد أشخاص مسجلين بعد.'}
          </p>
        )}
      </div>

      {deleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: 24,
            borderRadius: 8,
            maxWidth: 400,
            textAlign: 'center'
          }}>
            <h3>تأكيد الحذف</h3>
            <p>هل أنت متأكد من رغبتك في حذف هذا الشخص؟</p>
            <div className="form-actions">
              <button 
                className="btn-danger" 
                onClick={() => deletePerson(deleteConfirm)}
                disabled={saving}
              >
                {saving ? 'جارٍ الحذف…' : 'حذف'}
              </button>
              <button 
                className="btn-ghost" 
                onClick={() => setDeleteConfirm(null)}
                disabled={saving}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}