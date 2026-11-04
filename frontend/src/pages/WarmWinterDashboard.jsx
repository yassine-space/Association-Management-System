/**
 * WarmWinterDashboard.jsx
 * نشاط "شتاء دافئ" — تسجيل المستفيدين من مساعدات الشتاء
 *
 * API contract (backend already implemented):
 *   GET/POST       /warm-winter/          → list / create beneficiary ({ beneficiary: <person_id>, date })
 *   PUT/PATCH      /warm-winter/{id}/     → edit beneficiary
 *   DELETE         /warm-winter/{id}/     → delete beneficiary
 *   GET            /persons/              → list of persons to choose the beneficiary from
 */

import { useEffect, useState, useMemo, useCallback } from 'react'
import client from '../api/client'

const T = {
  bg: '#0b1014', surface: '#121821', surfaceAlt: '#161d27', border: '#1f2a36',
  teal: '#14b8a6', tealSoft: '#5eead4', cyan: '#38bdf8', amber: '#f59e0b',
  red: '#ef4444', emerald: '#10b981', text: '#eef2f6', textMute: '#8b98a8', textFaint: '#57667a',
}

function unwrap(res) {
  const d = res.data
  return Array.isArray(d) ? d : (d?.results ?? [])
}
function fmtDate(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('ar-DZ', { day: '2-digit', month: 'short', year: 'numeric' })
}

function GlobalStyles() {
  return (
    <style>{`
      .ww-root{background:${T.bg};color:${T.text};min-height:100%;font-family:Inter,system-ui,sans-serif}
      .ww-header{background:${T.surface};border-bottom:1px solid ${T.border};padding:18px 22px}
      .ww-header-inner{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px}
      .ww-brand{display:flex;align-items:center;gap:12px}
      .ww-brand-mark{width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,${T.cyan},${T.teal});display:flex;align-items:center;justify-content:center;font-size:20px}
      .ww-title{margin:0;font-size:18px;font-weight:700}
      .ww-subtitle{margin:2px 0 0;font-size:12.5px;color:${T.textMute}}
      .ww-header-stats{display:flex;align-items:center;gap:18px}
      .ww-hstat-val{font-size:18px;font-weight:700}
      .ww-hstat-lbl{font-size:11.5px;color:${T.textMute}}
      .ww-icon-btn{background:${T.surfaceAlt};border:1px solid ${T.border};border-radius:10px;padding:9px 13px;color:${T.textMute};cursor:pointer;font-size:16px;line-height:1}
      .ww-icon-btn:hover{color:${T.text}}
      .ww-content{padding:22px;max-width:1000px;margin:0 auto}
      .ww-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:20px}
      .ww-stat{background:${T.surface};border:1px solid ${T.border};border-radius:14px;padding:16px;display:flex;align-items:center;gap:12px}
      .ww-stat-icon{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
      .ww-stat-val{font-size:21px;font-weight:700}
      .ww-stat-lbl{font-size:12px;color:${T.textMute}}
      .ww-card{background:${T.surface};border:1px solid ${T.border};border-radius:14px;overflow:hidden}
      .ww-card-head{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;padding:14px 18px;border-bottom:1px solid ${T.border}}
      .ww-card-title{font-size:14px;font-weight:700}
      .ww-table-scroll{overflow-x:auto}
      .ww-table{width:100%;border-collapse:collapse;font-size:13px}
      .ww-table th{text-align:right;padding:10px 14px;color:${T.textFaint};font-weight:600;font-size:12px;border-bottom:1px solid ${T.border}}
      .ww-table td{padding:11px 14px;border-bottom:1px solid ${T.border};vertical-align:middle}
      .ww-table tr:last-child td{border-bottom:none}
      .ww-loading,.ww-empty{padding:40px;text-align:center;color:${T.textMute};font-size:13px}
      .ww-btn{display:inline-flex;align-items:center;gap:6px;border:1px solid ${T.border};background:${T.surfaceAlt};color:${T.text};border-radius:9px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer}
      .ww-btn--primary{background:${T.teal};border-color:${T.teal};color:#06201c}
      .ww-btn--danger{color:${T.red};border-color:#3a1f1f}
      .ww-btn--sm{padding:5px 10px;font-size:12px}
      .ww-btn:disabled{opacity:.4;cursor:not-allowed}
      .ww-input{width:100%;background:${T.bg};border:1px solid ${T.border};border-radius:9px;padding:9px 12px;color:${T.text};font-size:13.5px}
      .ww-field{display:flex;flex-direction:column;gap:5px;margin-bottom:13px}
      .ww-field label{font-size:12.5px;color:${T.textMute}}
      .ww-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:60;padding:20px}
      .ww-modal{background:${T.surface};border:1px solid ${T.border};border-radius:16px;width:100%;max-width:440px;max-height:88vh;overflow:auto}
      .ww-modal-head{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid ${T.border}}
      .ww-modal-body{padding:18px 20px}
      .ww-modal-foot{display:flex;justify-content:flex-end;gap:10px;padding:14px 20px;border-top:1px solid ${T.border}}
      .ww-toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:${T.surfaceAlt};border:1px solid ${T.border};border-radius:10px;padding:12px 20px;font-size:13.5px;z-index:80;box-shadow:0 8px 24px rgba(0,0,0,.4)}
      .ww-toast--success{border-color:${T.emerald};color:${T.emerald}}
      .ww-toast--error{border-color:${T.red};color:${T.red}}
      .ww-err{color:${T.red};font-size:12.5px;margin-top:6px}
    `}</style>
  )
}

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3200); return () => clearTimeout(t) }, [onClose])
  return <div className={`ww-toast ww-toast--${type === 'error' ? 'error' : 'success'}`}>{msg}</div>
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="ww-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="ww-modal">
        <div className="ww-modal-head">
          <strong>{title}</strong>
          <button className="ww-icon-btn" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, required, children }) {
  return <div className="ww-field"><label>{label}{required && ' *'}</label>{children}</div>
}

function StatCard({ label, value, icon, accent }) {
  return (
    <div className="ww-stat">
      <div className="ww-stat-icon" style={{ background: accent + '22', color: accent }}>{icon}</div>
      <div><div className="ww-stat-val">{value ?? '—'}</div><div className="ww-stat-lbl">{label}</div></div>
    </div>
  )
}

function TableWrap({ children, title, toolbar, empty, loading }) {
  return (
    <div className="ww-card">
      {(title || toolbar) && (
        <div className="ww-card-head">
          {title && <span className="ww-card-title">{title}</span>}
          {toolbar}
        </div>
      )}
      {loading ? <div className="ww-loading">جارٍ التحميل…</div>
        : empty ? <div className="ww-empty">{empty}</div>
        : <div className="ww-table-scroll">{children}</div>}
    </div>
  )
}

function Table({ head, rows }) {
  return (
    <table className="ww-table">
      <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((row, i) => <tr key={i}>{row.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
    </table>
  )
}

function PersonSearchSelect({ persons, value, onChange, placeholder }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const rootRef = useMemo(() => ({ current: null }), [])

  useEffect(() => {
    function handler(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [rootRef])

  const selectedPerson = useMemo(
    () => persons.find(p => String(p.id) === String(value)) || null,
    [persons, value]
  )

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return persons.slice(0, 30)
    return persons.filter(p => {
      const name = `${p.first_name} ${p.last_name}`.toLowerCase()
      const phone = (p.phone || '').toLowerCase()
      return name.includes(q) || phone.includes(q)
    }).slice(0, 30)
  }, [persons, query])

  function pick(p) {
    onChange(String(p.id))
    setQuery('')
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative' }} ref={rootRef}>
      <input
        className="ww-input"
        placeholder={placeholder || 'ابحث بالاسم أو الهاتف…'}
        value={open ? query : (selectedPerson ? `${selectedPerson.first_name} ${selectedPerson.last_name}` : query)}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => { setQuery(''); setOpen(true) }}
      />
      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', right: 0, left: 0, zIndex: 50,
            background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 10,
            maxHeight: 220, overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,.45)',
          }}
        >
          {matches.length === 0 && (
            <div style={{ padding: '10px 12px', fontSize: 13, color: T.textMute }}>لا توجد نتائج.</div>
          )}
          {matches.map(p => (
            <div
              key={p.id}
              onClick={() => pick(p)}
              style={{ padding: '9px 12px', cursor: 'pointer', fontSize: 13.5, borderBottom: `1px solid ${T.border}` }}
              onMouseDown={e => e.preventDefault()}
            >
              <div>{p.first_name} {p.last_name}</div>
              {p.phone && <div style={{ fontSize: 11.5, color: T.textMute }}>{p.phone}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function WarmWinterDashboard() {
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [persons, setPersons] = useState([])
  const [search, setSearch] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [f, setF] = useState({ beneficiary: '', date: new Date().toISOString().slice(0, 10) })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [confirmDel, setConfirmDel] = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [ww, pr] = await Promise.all([
        client.get('/warm-winter/'),
        client.get('/persons/'),
      ])
      setItems(unwrap(ww))
      setPersons(unwrap(pr))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  function notify(msg, type) { setToast({ msg, type }); fetchAll() }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter(it => !q || (it.beneficiary_name || '').toLowerCase().includes(q))
  }, [items, search])

  const thisMonthCount = useMemo(() => {
    const now = new Date()
    return items.filter(it => {
      const d = new Date(it.date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length
  }, [items])

  function openAdd() {
    setEditing(null)
    setF({ beneficiary: '', date: new Date().toISOString().slice(0, 10) })
    setErr(''); setShowForm(true)
  }
  function openEdit(it) {
    setEditing(it)
    setF({ beneficiary: it.beneficiary, date: it.date })
    setErr(''); setShowForm(true)
  }

  async function submit() {
    if (!f.beneficiary) { setErr('اختر المستفيد.'); return }
    if (!f.date) { setErr('التاريخ مطلوب.'); return }
    setSaving(true); setErr('')
    const payload = { beneficiary: +f.beneficiary, date: f.date }
    try {
      if (editing) await client.put(`/warm-winter/${editing.id}/`, payload)
      else await client.post('/warm-winter/', payload)
      setShowForm(false)
      notify(editing ? 'تم تحديث بيانات المستفيد.' : 'تمت إضافة المستفيد.', 'success')
    } catch (e) { setErr(JSON.stringify(e.response?.data || 'خطأ')) }
    finally { setSaving(false) }
  }

  async function confirmDelete() {
    try {
      await client.delete(`/warm-winter/${confirmDel.id}/`)
      setConfirmDel(null)
      notify('تم حذف المستفيد.', 'success')
    } catch { notify('فشل الحذف.', 'error') }
  }

  return (
    <div className="ww-root" dir="rtl">
      <GlobalStyles />
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <header className="ww-header">
        <div className="ww-header-inner">
          <div className="ww-brand">
            <div className="ww-brand-mark">🧣</div>
            <div>
              <h1 className="ww-title">شتاء دافئ</h1>
              <p className="ww-subtitle">تسجيل المستفيدين من مساعدات الشتاء</p>
            </div>
          </div>
          <div className="ww-header-stats">
            <div><div className="ww-hstat-val">{items.length}</div><div className="ww-hstat-lbl">إجمالي المستفيدين</div></div>
            <div><div className="ww-hstat-val" style={{ color: T.cyan }}>{thisMonthCount}</div><div className="ww-hstat-lbl">هذا الشهر</div></div>
            {loading && <div style={{ color: T.textMute, fontSize: 12 }}>جارٍ التحديث…</div>}
            <button className="ww-icon-btn" onClick={fetchAll} title="تحديث">↻</button>
          </div>
        </div>
      </header>

      <main className="ww-content">
        <div className="ww-stats">
          <StatCard label="إجمالي المستفيدين" value={items.length} icon="🧣" accent={T.teal} />
          <StatCard label="مستفيدون هذا الشهر" value={thisMonthCount} icon="📅" accent={T.cyan} />
        </div>

        <TableWrap
          title={`المستفيدون (${filtered.length})`}
          loading={loading}
          empty={filtered.length === 0 && 'لا يوجد مستفيدون.'}
          toolbar={
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                className="ww-input"
                style={{ width: 200 }}
                placeholder="بحث باسم المستفيد…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <button className="ww-btn ww-btn--primary" onClick={openAdd}>+ إضافة مستفيد</button>
            </div>
          }
        >
          <Table
            head={['#', 'اسم المستفيد', 'التاريخ', 'إجراءات']}
            rows={filtered.map((it, idx) => [
              idx + 1,
              it.beneficiary_name,
              fmtDate(it.date),
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="ww-btn ww-btn--sm" onClick={() => openEdit(it)}>تعديل</button>
                <button className="ww-btn ww-btn--sm ww-btn--danger" onClick={() => setConfirmDel(it)}>حذف</button>
              </div>,
            ])}
          />
        </TableWrap>
      </main>

      {showForm && (
        <Modal title={editing ? 'تعديل مستفيد' : 'إضافة مستفيد'} onClose={() => setShowForm(false)}>
          <div className="ww-modal-body">
            <Field label="المستفيد" required>
              <PersonSearchSelect
                persons={persons}
                value={f.beneficiary}
                onChange={val => setF({ ...f, beneficiary: val })}
              />
            </Field>
            <Field label="التاريخ" required>
              <input
                type="date"
                className="ww-input"
                value={f.date}
                onChange={e => setF({ ...f, date: e.target.value })}
              />
            </Field>
            {err && <div className="ww-err">{err}</div>}
          </div>
          <div className="ww-modal-foot">
            <button className="ww-btn" onClick={() => setShowForm(false)}>إلغاء</button>
            <button className="ww-btn ww-btn--primary" disabled={saving} onClick={submit}>
              {saving ? 'جارٍ الحفظ…' : 'حفظ'}
            </button>
          </div>
        </Modal>
      )}

      {confirmDel && (
        <Modal title="تأكيد الحذف" onClose={() => setConfirmDel(null)}>
          <div className="ww-modal-body">هل تريد حذف المستفيد «{confirmDel.beneficiary_name}»؟</div>
          <div className="ww-modal-foot">
            <button className="ww-btn" onClick={() => setConfirmDel(null)}>إلغاء</button>
            <button className="ww-btn ww-btn--danger" onClick={confirmDelete}>حذف</button>
          </div>
        </Modal>
      )}
    </div>
  )
}