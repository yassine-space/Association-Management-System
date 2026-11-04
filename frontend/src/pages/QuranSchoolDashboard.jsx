import { useEffect, useState, useMemo, useCallback } from 'react'
import client from '../api/client'

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  bg:         '#0a1410',
  surface:    '#0f1f18',
  surfaceAlt: '#152a20',
  border:     '#1f3a2b',
  gold:       '#d4a94f',
  goldDim:    'rgba(212,169,79,0.12)',
  emerald:    '#2f9e6e',
  rose:       '#e0665f',
  violet:     '#8f7fd8',
  text:       '#f3ede0',
  textMute:   '#7c9284',
  textFaint:  '#324339',
}

const GENDER_LABELS = { M: 'ذكر', F: 'أنثى' }

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function unwrap(res) {
  const d = res.data
  return Array.isArray(d) ? d : (d?.results ?? [])
}
function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('ar-DZ', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL STYLES
// ─────────────────────────────────────────────────────────────────────────────
function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Inter:wght@400;500;600;700;800&display=swap');

      .qr-root {
        min-height: 100%;
        background: ${T.bg};
        color: ${T.text};
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        padding-bottom: 48px;
      }
      .qr-root * { box-sizing: border-box; }
      .qr-root :focus-visible { outline: 2px solid ${T.gold}; outline-offset: 2px; }

      .qr-header {
        position: relative;
        background: ${T.surface};
        border-bottom: 1px solid ${T.border};
        overflow: hidden;
      }
      .qr-header::before {
        content: '';
        position: absolute;
        inset: 0;
        background: radial-gradient(circle at 15% 0%, ${T.goldDim}, transparent 55%);
        pointer-events: none;
      }
      .qr-header-inner {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 22px 24px;
        flex-wrap: wrap;
      }
      .qr-brand { display: flex; align-items: center; gap: 14px; }
      .qr-brand-mark {
        width: 52px; height: 52px; border-radius: 14px;
        background: ${T.surfaceAlt}; border: 1px solid ${T.border};
        display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      }
      .qr-title { font-family: 'Amiri', Georgia, serif; font-size: 24px; font-weight: 700; color: ${T.gold}; margin: 0; }
      .qr-subtitle { font-size: 12px; color: ${T.textMute}; margin-top: 3px; }
      .qr-hstat {
        display: flex; align-items: center; gap: 10px;
        background: ${T.surfaceAlt}; border: 1px solid ${T.border}; border-radius: 11px; padding: 9px 14px;
      }
      .qr-hstat-val { font-family: 'Amiri', Georgia, serif; font-size: 18px; color: ${T.text}; line-height: 1; }
      .qr-hstat-lbl { font-size: 10px; color: ${T.textMute}; margin-top: 2px; }

      .qr-content { padding: 20px 22px; display: flex; flex-direction: column; gap: 18px; }

      /* ── GENDER STAT CARDS ── */
      .qr-stats { display: flex; gap: 12px; flex-wrap: wrap; }
      .qr-stat {
        flex: 1;
        min-width: 150px;
        background: ${T.surface};
        border: 1px solid ${T.border};
        border-radius: 14px;
        padding: 16px 18px;
        position: relative;
        overflow: hidden;
        cursor: pointer;
        transition: border-color 0.15s, transform 0.15s;
      }
      .qr-stat:hover { transform: translateY(-2px); }
      .qr-stat--active { border-color: ${T.gold}; }
      .qr-stat-accent { position: absolute; top: 0; left: 0; right: 0; height: 2px; }
      .qr-stat-val { font-family: 'Amiri', Georgia, serif; font-size: 26px; color: ${T.text}; line-height: 1; }
      .qr-stat-lbl { font-size: 11.5px; color: ${T.textMute}; margin-top: 5px; }

      .qr-card { background: ${T.surface}; border: 1px solid ${T.border}; border-radius: 16px; overflow: hidden; }
      .qr-card-head {
        display: flex; align-items: center; justify-content: space-between; gap: 10px;
        padding: 14px 18px; border-bottom: 1px solid ${T.border}; flex-wrap: wrap;
      }
      .qr-card-title { font-size: 14px; font-weight: 700; color: ${T.text}; }
      .qr-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .qr-table-scroll { overflow-x: auto; }
      .qr-table { width: 100%; border-collapse: collapse; font-size: 13px; }
      .qr-table thead tr { background: ${T.surfaceAlt}; }
      .qr-table th {
        padding: 10px 15px; text-align: right; font-weight: 600; font-size: 10.5px;
        text-transform: uppercase; letter-spacing: 0.5px; color: ${T.textMute}; white-space: nowrap;
      }
      .qr-table td { padding: 12px 15px; color: #dbe6df; vertical-align: middle; text-align: right; }
      .qr-table tbody tr { border-top: 1px solid ${T.border}; transition: background 0.12s; cursor: pointer; }
      .qr-table tbody tr:hover { background: ${T.surfaceAlt}; }

      .qr-input {
        background: ${T.surfaceAlt}; border: 1px solid ${T.border}; border-radius: 8px;
        color: ${T.text}; padding: 9px 12px; font-size: 13.5px; outline: none;
        width: 100%; font-family: inherit; transition: border-color 0.15s; text-align: right;
      }
      .qr-input:focus { border-color: ${T.gold}; }
      .qr-input::placeholder { color: ${T.textFaint}; }
      .qr-search-wrap { position: relative; }
      .qr-search-icon { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: ${T.textMute}; font-size: 13px; pointer-events: none; }
      .qr-search { padding-right: 32px !important; }

      .qr-btn {
        display: inline-flex; align-items: center; gap: 6px; padding: 8px 15px;
        border: none; border-radius: 9px; font-size: 12.5px; font-weight: 700;
        cursor: pointer; font-family: inherit; transition: opacity 0.15s, transform 0.1s; white-space: nowrap;
      }
      .qr-btn:active { transform: scale(0.97); }
      .qr-btn:disabled { opacity: 0.55; cursor: not-allowed; }
      .qr-btn--gold  { background: ${T.gold}; color: #1a1305; }
      .qr-btn--ghost { background: ${T.surfaceAlt}; color: ${T.text}; border: 1px solid ${T.border}; }
      .qr-btn--ghost-sm {
        background: ${T.surfaceAlt}; border: 1px solid ${T.border}; border-radius: 6px;
        padding: 4px 9px; color: ${T.textMute}; cursor: pointer; font-size: 12px; font-family: inherit;
      }

      /* ── GENDER FILTER PILLS ── */
      .qr-filter-row { display: flex; gap: 6px; flex-wrap: wrap; }
      .qr-filter-btn {
        background: ${T.surfaceAlt};
        border: 1px solid ${T.border};
        border-radius: 8px;
        color: ${T.textMute};
        font-size: 12px;
        font-weight: 600;
        padding: 5px 11px;
        cursor: pointer;
        font-family: inherit;
        transition: all 0.15s;
      }
      .qr-filter-btn:hover,
      .qr-filter-btn--active { background: ${T.gold}; color: #1a1305; border-color: ${T.gold}; }

      .qr-badge { display: inline-block; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 600; }
      .qr-badge--green { background: rgba(47,158,110,0.14);  color: #86e0b8; }
      .qr-badge--rose  { background: rgba(224,102,95,0.14);  color: #f3aca6; }
      .qr-badge--gray  { background: rgba(124,146,132,0.15); color: #a9bdb1; }
      .qr-badge--blue  { background: rgba(122,162,224,0.16); color: #a9c4f0; }
      .qr-badge--pink  { background: rgba(224,122,190,0.16); color: #f0acd9; }

      .qr-modal-backdrop {
        position: fixed; inset: 0; background: rgba(0,0,0,0.72);
        display: flex; align-items: center; justify-content: center; z-index: 999; padding: 16px;
      }
      .qr-modal {
        background: ${T.surface}; border: 1px solid ${T.border}; border-radius: 18px;
        width: 100%; max-width: 560px; max-height: 92vh; overflow: hidden; display: flex; flex-direction: column;
      }
      .qr-modal-head {
        padding: 18px 22px; border-bottom: 1px solid ${T.border};
        display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;
      }
      .qr-modal-title { font-family: 'Amiri', Georgia, serif; font-size: 19px; color: ${T.gold}; }
      .qr-modal-close { background: none; border: none; color: ${T.textMute}; font-size: 24px; cursor: pointer; line-height: 1; padding: 0; }
      .qr-modal-body { padding: 20px 22px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }

      .qr-field { display: flex; flex-direction: column; gap: 5px; }
      .qr-field label { font-size: 11.5px; font-weight: 600; color: ${T.textMute}; letter-spacing: 0.4px; }
      .qr-field .req { color: ${T.rose}; }
      .qr-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .qr-form-actions { display: flex; gap: 10px; margin-top: 4px; }
      .qr-err { color: ${T.rose}; font-size: 13px; }

      .qr-empty   { padding: 48px; text-align: center; color: ${T.textMute}; font-size: 14px; }
      .qr-loading { padding: 48px; text-align: center; color: ${T.textMute}; }

      .qr-toast {
        position: fixed; top: 18px; left: 50%; transform: translateX(-50%);
        padding: 10px 20px; border-radius: 10px; font-weight: 600; font-size: 14px; z-index: 9999;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5); white-space: nowrap;
      }
      .qr-toast--success { background: ${T.emerald}; color: #fff; }
      .qr-toast--error   { background: ${T.rose};    color: #fff; }
    `}</style>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SMALL PIECES
// ─────────────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3800); return () => clearTimeout(t) }, [onClose])
  return <div className={`qr-toast qr-toast--${type}`}>{type === 'success' ? '✓' : '✗'} {msg}</div>
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const h = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="qr-modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="qr-modal" role="dialog" aria-modal="true">
        <div className="qr-modal-head">
          <span className="qr-modal-title">{title}</span>
          <button type="button" className="qr-modal-close" onClick={onClose} aria-label="إغلاق">×</button>
        </div>
        <div className="qr-modal-body">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <div className="qr-field">
      <label>{label}{required && <span className="req"> *</span>}</label>
      {children}
    </div>
  )
}

function SearchInput({ value, onChange, placeholder, style }) {
  return (
    <div className="qr-search-wrap" style={style}>
      <span className="qr-search-icon">🔍</span>
      <input className="qr-input qr-search" placeholder={placeholder || 'بحث…'} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )
}

function PersonSearchSelect({ persons, value, onChange, excludeIds }) {
  const [query, setQuery] = useState('')
  const [open, setOpen]   = useState(false)
  const selected = useMemo(() => persons.find(p => String(p.id) === String(value)), [persons, value])
  const label = p => {
    const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()
    return p.phone ? `${name} (${p.phone})` : name
  }
  const results = useMemo(() => {
    let list = persons.filter(p => !excludeIds?.includes(p.id))
    if (query.length >= 1) {
      const q = query.toLowerCase()
      list = list.filter(p => `${p.first_name ?? ''} ${p.last_name ?? ''}`.toLowerCase().includes(q) || (p.phone ?? '').includes(q))
    }
    return list.slice(0, 30)
  }, [persons, query, excludeIds])

  function pick(p)  { onChange(String(p.id)); setQuery(''); setOpen(false) }
  function clear(e) { e.stopPropagation(); onChange(''); setQuery(''); setOpen(false) }

  return (
    <div style={{ position: 'relative' }}>
      {selected && !open ? (
        <div onClick={() => setOpen(true)} className="qr-input" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
          <span>{label(selected)}</span>
          <span onClick={clear} style={{ color: T.textMute, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</span>
        </div>
      ) : (
        <input
          autoFocus={open}
          className="qr-input"
          placeholder="ابحث بالاسم أو رقم الهاتف…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
        />
      )}
      {open && (
        <div style={{ position: 'absolute', top: '100%', right: 0, left: 0, zIndex: 999, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, maxHeight: 220, overflowY: 'auto', marginTop: 4 }}>
          {results.length === 0
            ? <div style={{ padding: 12, color: T.textMute, fontSize: 12 }}>لا توجد نتائج{query ? ` لـ "${query}"` : ''}</div>
            : results.map(p => (
              <div key={p.id} onMouseDown={() => pick(p)} style={{ padding: '10px 15px', cursor: 'pointer', borderBottom: `1px solid ${T.border}`, fontSize: 13 }}>
                {label(p)}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

function TableWrap({ children, title, toolbar, empty, loading }) {
  return (
    <div className="qr-card">
      {(title || toolbar) && (
        <div className="qr-card-head">
          {title && <span className="qr-card-title">{title}</span>}
          {toolbar}
        </div>
      )}
      {loading ? <div className="qr-loading">جارٍ التحميل…</div>
        : empty ? <div className="qr-empty">{empty}</div>
        : <div className="qr-table-scroll">{children}</div>}
    </div>
  )
}

function Table({ head, rows, onRowClick }) {
  return (
    <table className="qr-table">
      <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} onClick={() => onRowClick && onRowClick(i)}>
            {row.map((cell, j) => <td key={j}>{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function StatCard({ label, value, accent, active, onClick }) {
  return (
    <div className={`qr-stat${active ? ' qr-stat--active' : ''}`} onClick={onClick}>
      <div className="qr-stat-accent" style={{ background: accent }} />
      <div className="qr-stat-val">{value ?? '—'}</div>
      <div className="qr-stat-lbl">{label}</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function QuranSchoolDashboard() {
  const [loading,  setLoading]  = useState(true)
  const [toast,    setToast]    = useState(null)
  const [students, setStudents] = useState([])
  const [persons,  setPersons]  = useState([])

  const [search,       setSearch]       = useState('')
  const [genderFilter, setGenderFilter] = useState('all') // 'all' | 'M' | 'F'
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)

  const emptyForm = { person: '', medical_situation: '', school_degree: '', role_model: '', goal: '', hobby: '' }
  const [f, setF] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const results = await Promise.allSettled([
      client.get('/quran-students/'),
      client.get('/persons/'),
    ])
  
    if (results[0].status === 'fulfilled') {
      setStudents(unwrap(results[0].value))
    } else {
      console.error('quran-students fetch failed:', results[0].reason?.response?.status, results[0].reason?.response?.data)
    }
  
    if (results[1].status === 'fulfilled') {
      setPersons(unwrap(results[1].value))
    } else {
      console.error('persons fetch failed:', results[1].reason?.response?.status, results[1].reason?.response?.data)
    }
  
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  function notify(msg, type) { setToast({ msg, type }); fetchAll() }

  // Map person id → gender, so we can group students by the Person's gender
  const genderByPersonId = useMemo(() => {
    const map = {}
    persons.forEach(p => { map[p.id] = p.gender })
    return map
  }, [persons])

  // Attach the resolved gender onto each student record
  const studentsWithGender = useMemo(
    () => students.map(s => ({ ...s, _gender: genderByPersonId[s.person] })),
    [students, genderByPersonId]
  )

  const maleCount   = studentsWithGender.filter(s => s._gender === 'M').length
  const femaleCount = studentsWithGender.filter(s => s._gender === 'F').length

  const enrolledPersonIds = students.filter(s => !editing || s.id !== editing.id).map(s => s.person)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return studentsWithGender.filter(s => {
      const matchesSearch = !q || s.person_name?.toLowerCase().includes(q)
      const matchesGender = genderFilter === 'all' || s._gender === genderFilter
      return matchesSearch && matchesGender
    })
  }, [studentsWithGender, search, genderFilter])

  function openAdd()  { setEditing(null); setF(emptyForm); setErr(''); setShowAdd(true) }
  function openEdit(s) {
    setEditing(s)
    setF({
      person: String(s.person),
      medical_situation: s.medical_situation || '',
      school_degree: s.school_degree || '',
      role_model: s.role_model || '',
      goal: s.goal || '',
      hobby: s.hobby || '',
    })
    setErr(''); setShowAdd(true)
  }

  async function submit() {
    if (!f.person) { setErr('يرجى اختيار الشخص.'); return }
    setSaving(true); setErr('')
    try {
      if (editing) await client.put(`/quran-students/${editing.id}/`, f)
      else         await client.post('/quran-students/', f)
      setShowAdd(false); notify(editing ? 'تم تحديث بيانات الطالب.' : 'تم تسجيل الطالب.', 'success')
    } catch (e) { setErr(JSON.stringify(e.response?.data || 'خطأ')) }
    finally { setSaving(false) }
  }

  async function toggleActive(s) {
    try {
      await client.patch(`/quran-students/${s.id}/`, { is_active: !s.is_active })
      notify(s.is_active ? 'تم تعطيل الطالب.' : 'تم تفعيل الطالب.', 'success')
    } catch { notify('فشل تحديث حالة الطالب.', 'error') }
  }

  async function del(s) {
    if (!window.confirm(`حذف "${s.person_name}"؟`)) return
    try {
      await client.delete(`/quran-students/${s.id}/`)
      notify('تم حذف الطالب.', 'success')
    } catch { notify('لا يمكن الحذف: يوجد سجلات مرتبطة.', 'error') }
  }

  return (
    <div className="qr-root" dir="rtl">
      <GlobalStyles />
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <header className="qr-header">
        <div className="qr-header-inner">
          <div className="qr-brand">
            <div className="qr-brand-mark" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={T.gold} strokeWidth="1.8" strokeLinecap="round">
                <path d="M4 19V6a2 2 0 0 1 2-2h5v15" />
                <path d="M20 19V6a2 2 0 0 0-2-2h-5v15" />
                <path d="M4 19h16" />
              </svg>
            </div>
            <div>
              <h1 className="qr-title">مدرسة تحفيظ القرآن</h1>
              <p className="qr-subtitle">إدارة بيانات الطلاب</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div className="qr-hstat"><div><div className="qr-hstat-val">{students.length || '—'}</div><div className="qr-hstat-lbl">طالب مسجّل</div></div></div>
            {loading && <div className="qr-hstat"><div style={{ color: T.textMute, fontSize: 12 }}>جارٍ التحديث…</div></div>}
            <button
              type="button" onClick={fetchAll}
              style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 10, padding: '9px 14px', color: T.textMute, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
              title="تحديث" aria-label="تحديث البيانات"
            >↻</button>
          </div>
        </div>
      </header>

      <main className="qr-content">
        {/* ── GENDER GROUP CARDS ── */}
        <div className="qr-stats">
          <StatCard
            label="كل الطلاب"
            value={students.length}
            accent={T.gold}
            active={genderFilter === 'all'}
            onClick={() => setGenderFilter('all')}
          />
          <StatCard
            label="الذكور"
            value={maleCount}
            accent={T.emerald}
            active={genderFilter === 'M'}
            onClick={() => setGenderFilter('M')}
          />
          <StatCard
            label="الإناث"
            value={femaleCount}
            accent={T.violet}
            active={genderFilter === 'F'}
            onClick={() => setGenderFilter('F')}
          />
        </div>

        <TableWrap
          title={`قائمة الطلاب (${filtered.length})`}
          toolbar={
            <div className="qr-toolbar">
              <SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم…" style={{ width: 200 }} />
              <div className="qr-filter-row">
                {[['all', 'الكل'], ['M', `ذكور (${maleCount})`], ['F', `إناث (${femaleCount})`]].map(([v, l]) => (
                  <button
                    key={v}
                    className={`qr-filter-btn${genderFilter === v ? ' qr-filter-btn--active' : ''}`}
                    onClick={() => setGenderFilter(v)}
                  >{l}</button>
                ))}
              </div>
              <button className="qr-btn qr-btn--gold" onClick={openAdd}>+ تسجيل طالب</button>
            </div>
          }
          loading={loading}
          empty={filtered.length === 0 ? 'لا يوجد طلاب مطابقون.' : null}
        >
          <Table
            head={['الاسم', 'الجنس', 'المستوى الدراسي', 'القدوة', 'الهدف', 'الهواية', 'تاريخ التسجيل', 'الحالة', '']}
            rows={filtered.map(s => [
              <strong style={{ color: T.text }}>{s.person_name}</strong>,
              s._gender
                ? <span className={`qr-badge ${s._gender === 'M' ? 'qr-badge--blue' : 'qr-badge--pink'}`}>
                    {GENDER_LABELS[s._gender] || s._gender}
                  </span>
                : <span className="qr-badge qr-badge--gray">—</span>,
              <span style={{ color: T.textMute }}>{s.school_degree || '—'}</span>,
              <span style={{ color: T.textMute }}>{s.role_model || '—'}</span>,
              <span style={{ color: T.textMute }}>{s.goal || '—'}</span>,
              <span style={{ color: T.textMute }}>{s.hobby || '—'}</span>,
              <span style={{ color: T.textMute, whiteSpace: 'nowrap' }}>{fmt(s.date_registered)}</span>,
              s.is_active
                ? <span className="qr-badge qr-badge--green">نشط</span>
                : <span className="qr-badge qr-badge--rose">غير نشط</span>,
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                <button className="qr-btn--ghost-sm" onClick={() => openEdit(s)}>تعديل</button>
                <button className="qr-btn--ghost-sm" onClick={() => toggleActive(s)}>{s.is_active ? 'تعطيل' : 'تفعيل'}</button>
                <button className="qr-btn--ghost-sm" onClick={() => del(s)}>حذف</button>
              </div>,
            ])}
          />
        </TableWrap>
      </main>

      {showAdd && (
        <Modal title={editing ? 'تعديل بيانات الطالب' : 'تسجيل طالب جديد'} onClose={() => setShowAdd(false)}>
          <Field label="الشخص" required>
            <PersonSearchSelect persons={persons} value={f.person} onChange={v => setF({ ...f, person: v })} excludeIds={enrolledPersonIds} />
          </Field>
          <div className="qr-form-grid">
            <Field label="المستوى الدراسي">
              <input className="qr-input" value={f.school_degree} onChange={e => setF({ ...f, school_degree: e.target.value })} placeholder="مثال: السنة الثالثة متوسط" />
            </Field>
            <Field label="القدوة">
              <input className="qr-input" value={f.role_model} onChange={e => setF({ ...f, role_model: e.target.value })} placeholder="مثال: الشيخ عبد الحميد بن باديس " />
            </Field>
            <Field label="الهدف">
              <input className="qr-input" value={f.goal} onChange={e => setF({ ...f, goal: e.target.value })} placeholder="مثال: حفظ القرآن كاملاً" />
            </Field>
            <Field label="الهواية">
              <input className="qr-input" value={f.hobby} onChange={e => setF({ ...f, hobby: e.target.value })} placeholder="مثال: الخط العربي" />
            </Field>
          </div>
          <Field label="الحالة الصحية">
            <textarea rows={2} className="qr-input" style={{ resize: 'vertical' }} value={f.medical_situation} onChange={e => setF({ ...f, medical_situation: e.target.value })} placeholder="اختياري" />
          </Field>
          {err && <p className="qr-err">{err}</p>}
          <div className="qr-form-actions">
            <button className="qr-btn qr-btn--ghost" onClick={() => setShowAdd(false)}>إلغاء</button>
            <button className="qr-btn qr-btn--gold" onClick={submit} disabled={saving}>
              {saving ? 'جارٍ الحفظ…' : editing ? 'حفظ التعديلات' : 'تسجيل'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}