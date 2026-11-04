import { useEffect, useState, useMemo, useCallback } from 'react'
import client from '../api/client'

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  bg:         '#0a1518',
  surface:    '#0f1e22',
  surfaceAlt: '#15282d',
  border:     '#1e3a41',
  sea:        '#5eead4',
  seaDeep:    '#14b8a6',
  seaDim:     'rgba(94,234,212,0.10)',
  coral:      '#fb7a6b',
  amber:      '#f5b94a',
  text:       '#eef7f6',
  textMute:   '#7fa0a3',
  textFaint:  '#35545a',
}

// Suggestions only — the field stays free text.
const COMMON_SPECIALITIES = [
  'جراحة الأعصاب', 'الأمراض الجلدية', 'طب العيون', 'طب الأطفال',
  'أمراض القلب', 'أمراض النساء والتوليد', 'جراحة العظام', 'أنف وأذن وحنجرة',
  'الطب الداخلي', 'طب الأسنان', 'الغدد والسكري', 'أمراض الكلى',
  'المسالك البولية', 'الطب النفسي', 'الطب العام',
]

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function unwrap(res) {
  const d = res.data
  return Array.isArray(d) ? d : (d?.results ?? [])
}

function fmtDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('ar-DZ', { day: '2-digit', month: 'long', year: 'numeric' })
}

function fmtTime(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })
}

function calcAge(dateStr) {
  if (!dateStr) return null
  const b = new Date(dateStr)
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--
  return age
}

function dayParts(dateStr) {
  const d = new Date(dateStr)
  return {
    day:   d.toLocaleDateString('ar-DZ', { day: '2-digit' }),
    month: d.toLocaleDateString('ar-DZ', { month: 'long' }),
    year:  d.toLocaleDateString('ar-DZ', { year: 'numeric' }),
  }
}

function errText(e, fallback = 'حدث خطأ.') {
  const d = e?.response?.data
  if (!d) return fallback
  if (typeof d === 'string') return d
  if (d.detail) return d.detail
  return Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`).join(' — ')
}

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL STYLES
// ─────────────────────────────────────────────────────────────────────────────
function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Reem+Kufi:wght@400;600;700&family=Cairo:wght@400;500;600;700&display=swap');

      .md-root {
        min-height: 100%;
        background: ${T.bg};
        color: ${T.text};
        font-family: 'Cairo', system-ui, -apple-system, sans-serif;
        padding-bottom: 48px;
      }
      .md-root * { box-sizing: border-box; }
      .md-root :focus-visible { outline: 2px solid ${T.sea}; outline-offset: 2px; }

      /* ── HEADER ── */
      .md-header {
        background: ${T.surface};
        border-bottom: 1px solid ${T.border};
        position: relative;
        overflow: hidden;
      }
      .md-header::before {
        content: '';
        position: absolute;
        inset: 0;
        background: radial-gradient(ellipse at 90% -20%, ${T.seaDim}, transparent 60%);
        pointer-events: none;
      }
      .md-header-inner {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 22px 24px;
        flex-wrap: wrap;
      }
      .md-brand { display: flex; align-items: center; gap: 14px; }
      .md-brand-mark {
        width: 50px; height: 50px; border-radius: 14px;
        background: ${T.surfaceAlt}; border: 1px solid ${T.border};
        display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      }
      .md-title {
        font-family: 'Reem Kufi', 'Cairo', serif;
        font-size: 24px; font-weight: 700; color: ${T.sea}; margin: 0;
      }
      .md-subtitle { font-size: 12.5px; color: ${T.textMute}; margin-top: 2px; }
      .md-header-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
      .md-icon-btn {
        background: ${T.surfaceAlt}; border: 1px solid ${T.border}; border-radius: 10px;
        padding: 9px 14px; color: ${T.textMute}; cursor: pointer; font-size: 18px; line-height: 1;
        font-family: inherit;
      }
      .md-icon-btn:hover { color: ${T.text}; }
      .md-back {
        display: inline-flex; align-items: center; gap: 8px;
        background: ${T.surfaceAlt}; border: 1px solid ${T.border}; border-radius: 10px;
        padding: 9px 14px; color: ${T.text}; cursor: pointer; font-size: 13px; font-weight: 600;
        font-family: inherit;
      }
      .md-back:hover { border-color: ${T.seaDeep}; }

      .md-content { padding: 22px; display: flex; flex-direction: column; gap: 20px; }

      /* ── DAY CARDS (page 1) ── */
      .md-days-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
        gap: 16px;
      }
      .md-day {
        display: flex; gap: 16px; align-items: stretch;
        background: ${T.surface}; border: 1px solid ${T.border}; border-radius: 16px;
        padding: 16px; cursor: pointer; text-align: right; color: inherit; font-family: inherit;
        transition: border-color 0.15s, transform 0.15s;
        width: 100%;
      }
      .md-day:hover { border-color: ${T.seaDeep}; transform: translateY(-2px); }
      .md-leaf {
        width: 78px; flex-shrink: 0; border-radius: 12px; overflow: hidden;
        background: ${T.surfaceAlt}; border: 1px solid ${T.border};
        display: flex; flex-direction: column; text-align: center;
      }
      .md-leaf-month {
        background: ${T.seaDeep}; color: #04211d; font-size: 11.5px; font-weight: 700;
        padding: 4px 2px;
      }
      .md-leaf-day {
        font-family: 'Reem Kufi', 'Cairo', serif;
        font-size: 30px; font-weight: 700; color: ${T.text};
        padding: 6px 0 0; line-height: 1.1;
      }
      .md-leaf-year { font-size: 11px; color: ${T.textMute}; padding-bottom: 6px; }
      .md-day-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
      .md-day-name { font-size: 15.5px; font-weight: 700; color: ${T.text}; overflow-wrap: anywhere; }
      .md-day-desc {
        font-size: 12.5px; color: ${T.textMute};
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
      }
      .md-day-foot { margin-top: auto; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .md-day-count { font-size: 12.5px; color: ${T.sea}; font-weight: 600; }
      .md-day-actions { display: flex; gap: 6px; }

      .md-new-day {
        display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
        min-height: 130px; border-radius: 16px; border: 1.5px dashed ${T.border};
        background: transparent; color: ${T.textMute}; cursor: pointer; font-family: inherit;
        font-size: 14px; font-weight: 600;
      }
      .md-new-day:hover { border-color: ${T.seaDeep}; color: ${T.sea}; }
      .md-new-day-plus { font-size: 28px; line-height: 1; }

      /* ── DAY DETAIL ── */
      .md-summary { display: flex; gap: 14px; flex-wrap: wrap; align-items: stretch; }
      .md-total {
        background: ${T.surface}; border: 1px solid ${T.border}; border-radius: 16px;
        padding: 20px 26px; min-width: 190px;
        display: flex; flex-direction: column; justify-content: center;
      }
      .md-total-val {
        font-family: 'Reem Kufi', 'Cairo', serif;
        font-size: 54px; font-weight: 700; color: ${T.sea}; line-height: 1;
      }
      .md-total-lbl { font-size: 13px; color: ${T.textMute}; margin-top: 8px; }

      .md-spec-panel {
        flex: 1; min-width: 280px;
        background: ${T.surface}; border: 1px solid ${T.border}; border-radius: 16px;
        padding: 16px 18px;
      }
      .md-spec-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
      .md-spec-title { font-size: 14px; font-weight: 700; }
      .md-spec-clear {
        background: none; border: none; color: ${T.sea}; font-size: 12.5px; cursor: pointer; font-family: inherit;
      }
      .md-spec-list { display: flex; flex-direction: column; gap: 4px; max-height: 210px; overflow-y: auto; }
      .md-spec-row {
        position: relative; display: flex; justify-content: space-between; align-items: center;
        gap: 10px; padding: 7px 10px; border-radius: 8px; border: 1px solid transparent;
        background: transparent; cursor: pointer; font-family: inherit; color: ${T.text};
        font-size: 13px; text-align: right; width: 100%; overflow: hidden;
      }
      .md-spec-row:hover { background: ${T.surfaceAlt}; }
      .md-spec-row--active { border-color: ${T.seaDeep}; background: ${T.seaDim}; }
      .md-spec-bar {
        position: absolute; top: 0; bottom: 0; right: 0;
        background: ${T.seaDim}; pointer-events: none;
      }
      .md-spec-name, .md-spec-n { position: relative; }
      .md-spec-n { font-weight: 700; color: ${T.sea}; font-variant-numeric: tabular-nums; }

      /* ── CARD / TABLE ── */
      .md-card { background: ${T.surface}; border: 1px solid ${T.border}; border-radius: 16px; overflow: hidden; }
      .md-card-head {
        display: flex; align-items: center; justify-content: space-between; gap: 10px;
        padding: 14px 18px; border-bottom: 1px solid ${T.border}; flex-wrap: wrap;
      }
      .md-card-title { font-size: 14px; font-weight: 700; }
      .md-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .md-table-scroll { overflow-x: auto; }
      .md-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
      .md-table thead tr { background: ${T.surfaceAlt}; }
      .md-table th {
        padding: 10px 15px; text-align: right; font-weight: 600; font-size: 12px;
        color: ${T.textMute}; white-space: nowrap;
      }
      .md-table td { padding: 12px 15px; color: #cfe3e2; vertical-align: middle; text-align: right; }
      .md-table tbody tr { border-top: 1px solid ${T.border}; transition: background 0.12s; }
      .md-table tbody tr:hover { background: ${T.surfaceAlt}; }

      /* ── INPUTS ── */
      .md-input {
        background: ${T.surfaceAlt}; border: 1px solid ${T.border}; border-radius: 8px;
        color: ${T.text}; padding: 9px 12px; font-size: 14px; outline: none; width: 100%;
        font-family: inherit; transition: border-color 0.15s; text-align: right;
      }
      .md-input:focus { border-color: ${T.sea}; }
      .md-input::placeholder { color: ${T.textFaint}; }
      .md-search-wrap { position: relative; }
      .md-search-icon {
        position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
        color: ${T.textMute}; pointer-events: none; font-size: 13px;
      }
      .md-search { padding-right: 32px !important; }

      /* ── BUTTONS ── */
      .md-btn {
        display: inline-flex; align-items: center; gap: 6px; padding: 8px 15px;
        border: none; border-radius: 9px; font-size: 13px; font-weight: 700; cursor: pointer;
        font-family: inherit; transition: opacity 0.15s, transform 0.1s; white-space: nowrap;
      }
      .md-btn:active { transform: scale(0.97); }
      .md-btn:disabled { opacity: 0.55; cursor: not-allowed; }
      .md-btn--sea   { background: ${T.sea}; color: #04211d; }
      .md-btn--coral { background: ${T.coral}; color: #2a0a06; }
      .md-btn--ghost { background: ${T.surfaceAlt}; color: ${T.text}; border: 1px solid ${T.border}; }
      .md-btn--sm {
        background: ${T.surfaceAlt}; border: 1px solid ${T.border}; border-radius: 6px;
        padding: 4px 10px; color: ${T.textMute}; cursor: pointer; font-size: 12px; font-family: inherit;
      }
      .md-btn--sm:hover { color: ${T.text}; }
      .md-btn--del {
        background: rgba(251,122,107,0.10); border: 1px solid rgba(251,122,107,0.25);
        border-radius: 6px; padding: 4px 10px; color: ${T.coral}; cursor: pointer;
        font-size: 12px; font-family: inherit;
      }

      /* ── BADGE ── */
      .md-badge {
        display: inline-block; padding: 3px 11px; border-radius: 20px; font-size: 12px; font-weight: 600;
        background: ${T.seaDim}; color: ${T.sea}; border: 1px solid rgba(94,234,212,0.18);
      }
      .md-badge--none { background: rgba(127,160,163,0.12); color: ${T.textMute}; border-color: transparent; }

      /* ── MODAL ── */
      .md-modal-backdrop {
        position: fixed; inset: 0; background: rgba(0,0,0,0.72);
        display: flex; align-items: center; justify-content: center; z-index: 999; padding: 16px;
      }
      .md-modal {
        background: ${T.surface}; border: 1px solid ${T.border}; border-radius: 18px;
        width: 100%; max-width: 500px; max-height: 92vh; overflow: hidden;
        display: flex; flex-direction: column;
      }
      .md-modal-head {
        padding: 18px 22px; border-bottom: 1px solid ${T.border};
        display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;
      }
      .md-modal-title { font-family: 'Reem Kufi', 'Cairo', serif; font-size: 19px; font-weight: 700; color: ${T.sea}; }
      .md-modal-close { background: none; border: none; color: ${T.textMute}; font-size: 24px; cursor: pointer; line-height: 1; padding: 0; }
      .md-modal-body { padding: 20px 22px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }

      .md-field { display: flex; flex-direction: column; gap: 5px; }
      .md-field label { font-size: 12.5px; font-weight: 600; color: ${T.textMute}; }
      .md-field .req { color: ${T.coral}; }
      .md-form-actions { display: flex; gap: 10px; margin-top: 4px; flex-wrap: wrap; }
      .md-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      @media (max-width: 480px) { .md-form-row { grid-template-columns: 1fr; } }
      .md-err { color: ${T.coral}; font-size: 13px; margin: 0; }
      .md-hint { font-size: 12px; color: ${T.textMute}; margin: 0; }

      .md-empty   { padding: 48px 24px; text-align: center; color: ${T.textMute}; font-size: 14px; }
      .md-loading { padding: 48px; text-align: center; color: ${T.textMute}; }

      .md-toast {
        position: fixed; top: 18px; left: 50%; transform: translateX(-50%);
        padding: 10px 20px; border-radius: 10px; font-weight: 600; font-size: 14px; z-index: 9999;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5); animation: md-toast-in 0.25s ease; max-width: 90vw;
      }
      .md-toast--success { background: ${T.seaDeep}; color: #04211d; }
      .md-toast--error   { background: ${T.coral};   color: #2a0a06; }
      @keyframes md-toast-in {
        from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
        to   { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
      @media (prefers-reduced-motion: reduce) {
        .md-toast { animation: none; }
        .md-day, .md-btn { transition: none; }
      }
    `}</style>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SMALL PIECES
// ─────────────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3800)
    return () => clearTimeout(t)
  }, [onClose])
  return <div className={`md-toast md-toast--${type}`}>{type === 'success' ? '✓' : '✗'} {msg}</div>
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const h = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="md-modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="md-modal" role="dialog" aria-modal="true">
        <div className="md-modal-head">
          <span className="md-modal-title">{title}</span>
          <button type="button" className="md-modal-close" onClick={onClose} aria-label="إغلاق">×</button>
        </div>
        <div className="md-modal-body">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <div className="md-field">
      <label>{label}{required && <span className="req"> *</span>}</label>
      {children}
    </div>
  )
}

function SearchInput({ value, onChange, placeholder, style }) {
  return (
    <div className="md-search-wrap" style={style}>
      <span className="md-search-icon">🔍</span>
      <input
        className="md-input md-search"
        placeholder={placeholder || 'بحث…'}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE 1 — CHOOSE A MEDICAL DAY
// ─────────────────────────────────────────────────────────────────────────────
function DaysPage({ days, loading, onOpen, onRefresh, notify }) {
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState(null)
  const emptyForm = { name: '', date: '', description: '' }
  const [f, setF] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  function openAdd() {
    setEditing(null); setF(emptyForm); setErr(''); setShowForm(true)
  }
  function openEdit(d) {
    setEditing(d)
    setF({ name: d.name, date: d.date, description: d.description || '' })
    setErr(''); setShowForm(true)
  }

  async function save() {
    if (!f.name.trim() || !f.date) { setErr('الاسم والتاريخ مطلوبان.'); return }
    setSaving(true); setErr('')
    const payload = { name: f.name.trim(), date: f.date, description: f.description }
    try {
      if (editing) await client.put(`/medical-days/${editing.id}/`, payload)
      else         await client.post('/medical-days/', payload)
      setShowForm(false)
      onRefresh()
      notify(editing ? 'تم تحديث اليوم الطبي.' : 'تم إنشاء اليوم الطبي.', 'success')
    } catch (e) { setErr(errText(e)) }
    finally { setSaving(false) }
  }

  async function del(d) {
    const warn = d.attendance_count > 0
      ? `حذف "${d.name}" سيحذف أيضاً ${d.attendance_count} سجل حضور. هل أنت متأكد؟`
      : `حذف "${d.name}"؟`
    if (!window.confirm(warn)) return
    try {
      await client.delete(`/medical-days/${d.id}/`)
      onRefresh()
      notify('تم حذف اليوم الطبي.', 'success')
    } catch (e) { notify(errText(e, 'فشل الحذف.'), 'error') }
  }

  return (
    <>
      {loading
        ? <div className="md-loading">جارٍ التحميل…</div>
        : (
          <div className="md-days-grid">
            <button type="button" className="md-new-day" onClick={openAdd}>
              <span className="md-new-day-plus">+</span>
              إنشاء يوم طبي جديد
            </button>

            {days.map(d => {
              const p = dayParts(d.date)
              return (
                <div
                  key={d.id}
                  role="button"
                  tabIndex={0}
                  className="md-day"
                  onClick={() => onOpen(d)}
                  onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onOpen(d)}
                >
                  <div className="md-leaf" aria-hidden="true">
                    <div className="md-leaf-month">{p.month}</div>
                    <div className="md-leaf-day">{p.day}</div>
                    <div className="md-leaf-year">{p.year}</div>
                  </div>
                  <div className="md-day-body">
                    <div className="md-day-name">{d.name}</div>
                    {d.description && <div className="md-day-desc">{d.description}</div>}
                    <div className="md-day-foot">
                      <span className="md-day-count">{d.attendance_count ?? 0} مريض</span>
                      <div className="md-day-actions" onClick={e => e.stopPropagation()}>
                        <button type="button" className="md-btn--sm" onClick={() => openEdit(d)}>تعديل</button>
                        <button type="button" className="md-btn--del" onClick={() => del(d)}>حذف</button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      {!loading && days.length === 0 && (
        <div className="md-empty">لا توجد أيام طبية بعد. أنشئ أول يوم للبدء في تسجيل المرضى.</div>
      )}

      {showForm && (
        <Modal title={editing ? 'تعديل اليوم الطبي' : 'يوم طبي جديد'} onClose={() => setShowForm(false)}>
          <Field label="اسم اليوم الطبي" required>
            <input
              className="md-input" autoFocus value={f.name}
              onChange={e => setF({ ...f, name: e.target.value })}
              placeholder="مثال: اليوم الطبي 2026"
            />
          </Field>
          <Field label="التاريخ" required>
            <input type="date" className="md-input" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} />
          </Field>
          <Field label="ملاحظات">
            <textarea
              rows={3} className="md-input" style={{ resize: 'vertical' }}
              value={f.description}
              onChange={e => setF({ ...f, description: e.target.value })}
              placeholder="اختياري: المكان، الشركاء، الأطباء المشاركون…"
            />
          </Field>
          {err && <p className="md-err">{err}</p>}
          <div className="md-form-actions">
            <button type="button" className="md-btn md-btn--ghost" onClick={() => setShowForm(false)}>إلغاء</button>
            <button type="button" className="md-btn md-btn--sea" onClick={save} disabled={saving}>
              {saving ? 'جارٍ الحفظ…' : editing ? 'حفظ التعديلات' : 'إنشاء اليوم'}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE 2 — ONE MEDICAL DAY: ATTENDANCE
// ─────────────────────────────────────────────────────────────────────────────
function DayDetail({ day, notify }) {
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [specFilter, setSpecFilter] = useState(null)

  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState(null)
  const emptyForm = { last_name: '', first_name: '', date_of_birth: '', speciality: '' }
  const [f, setF] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const fetchRows = useCallback(async () => {
    setLoading(true)
    try {
      const res = await client.get(`/medical-day-attendances/?medical_day=${day.id}`)
      setRows(unwrap(res))
    } catch (e) { notify(errText(e, 'فشل تحميل قائمة الحضور.'), 'error') }
    finally { setLoading(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day.id])

  useEffect(() => { fetchRows() }, [fetchRows])

  // Speciality counts, biggest first — also acts as the filter list.
  const specStats = useMemo(() => {
    const map = new Map()
    rows.forEach(r => {
      const key = (r.speciality || '').trim() || '—'
      map.set(key, (map.get(key) || 0) + 1)
    })
    return [...map.entries()].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n)
  }, [rows])

  const maxN = specStats[0]?.n || 1

  // Suggestions = what's already used today + the common list
  const suggestions = useMemo(() => {
    const used = specStats.map(s => s.name).filter(n => n !== '—')
    return [...new Set([...used, ...COMMON_SPECIALITIES])]
  }, [specStats])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(r => {
      const spec = (r.speciality || '').trim() || '—'
      const okSpec = !specFilter || spec === specFilter
      const okSearch = !q || r.patient_name?.toLowerCase().includes(q) || spec.toLowerCase().includes(q)
      return okSpec && okSearch
    })
  }, [rows, search, specFilter])

  function openAdd() {
    setEditing(null); setF(emptyForm); setErr(''); setShowForm(true)
  }
  function openEdit(r) {
    setEditing(r)
    setF({
      last_name: r.last_name || '',
      first_name: r.first_name || '',
      date_of_birth: r.date_of_birth || '',
      speciality: r.speciality || '',
    })
    setErr(''); setShowForm(true)
  }

  async function save(addAnother = false) {
    if (!f.last_name.trim() || !f.first_name.trim()) { setErr('اللقب والاسم مطلوبان.'); return }
    if (!f.date_of_birth) { setErr('تاريخ الميلاد مطلوب.'); return }
    setSaving(true); setErr('')
    const payload = {
      medical_day: day.id,
      last_name: f.last_name.trim(),
      first_name: f.first_name.trim(),
      date_of_birth: f.date_of_birth,
      speciality: f.speciality.trim(),
    }
    try {
      if (editing) await client.put(`/medical-day-attendances/${editing.id}/`, payload)
      else         await client.post('/medical-day-attendances/', payload)
      await fetchRows()
      notify(editing ? 'تم تحديث السجل.' : 'تم تسجيل المريض.', 'success')
      if (addAnother && !editing) {
        // keep the speciality: usually several patients in a row see the same doctor
        setF({ ...emptyForm, speciality: f.speciality })
      } else {
        setShowForm(false)
      }
    } catch (e) { setErr(errText(e)) }
    finally { setSaving(false) }
  }

  async function del(r) {
    if (!window.confirm(`حذف تسجيل "${r.patient_name}"؟`)) return
    try {
      await client.delete(`/medical-day-attendances/${r.id}/`)
      await fetchRows()
      notify('تم حذف السجل.', 'success')
    } catch (e) { notify(errText(e, 'فشل الحذف.'), 'error') }
  }

  return (
    <>
      <div className="md-summary">
        <div className="md-total">
          <div className="md-total-val">{rows.length}</div>
          <div className="md-total-lbl">مريض مسجّل في هذا اليوم</div>
        </div>

        <div className="md-spec-panel">
          <div className="md-spec-head">
            <span className="md-spec-title">حسب التخصص</span>
            {specFilter && (
              <button type="button" className="md-spec-clear" onClick={() => setSpecFilter(null)}>
                إظهار الكل
              </button>
            )}
          </div>
          {specStats.length === 0
            ? <p className="md-hint">ستظهر التخصصات هنا بعد تسجيل أول مريض.</p>
            : (
              <div className="md-spec-list">
                {specStats.map(s => (
                  <button
                    key={s.name}
                    type="button"
                    className={`md-spec-row${specFilter === s.name ? ' md-spec-row--active' : ''}`}
                    onClick={() => setSpecFilter(specFilter === s.name ? null : s.name)}
                    aria-pressed={specFilter === s.name}
                  >
                    <span className="md-spec-bar" style={{ width: `${(s.n / maxN) * 100}%` }} />
                    <span className="md-spec-name">{s.name === '—' ? 'بدون تخصص' : s.name}</span>
                    <span className="md-spec-n">{s.n}</span>
                  </button>
                ))}
              </div>
            )}
        </div>
      </div>

      <div className="md-card">
        <div className="md-card-head">
          <span className="md-card-title">
            قائمة المرضى ({filtered.length}{filtered.length !== rows.length ? ` من ${rows.length}` : ''})
          </span>
          <div className="md-toolbar">
            <SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم أو التخصص…" style={{ width: 230 }} />
            <button type="button" className="md-btn md-btn--sea" onClick={openAdd}>+ تسجيل مريض</button>
          </div>
        </div>

        {loading
          ? <div className="md-loading">جارٍ التحميل…</div>
          : filtered.length === 0
            ? <div className="md-empty">
                {rows.length === 0 ? 'لم يُسجَّل أي مريض بعد. اضغط «تسجيل مريض» للبدء.' : 'لا توجد نتائج مطابقة.'}
              </div>
            : (
              <div className="md-table-scroll">
                <table className="md-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>اللقب والاسم</th>
                      <th>تاريخ الميلاد</th>
                      <th>التخصص</th>
                      <th>وقت التسجيل</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => (
                      <tr key={r.id}>
                        <td style={{ color: T.textMute }}>{i + 1}</td>
                        <td><strong style={{ color: T.text }}>{r.patient_name}</strong></td>
                        <td style={{ color: T.textMute, whiteSpace: 'nowrap' }}>
                          {r.date_of_birth ? fmtDate(r.date_of_birth) : '—'}
                          {r.date_of_birth && <span style={{ marginRight: 8, color: T.sea }}>({calcAge(r.date_of_birth)} سنة)</span>}
                        </td>
                        <td>
                          {r.speciality
                            ? <span className="md-badge">{r.speciality}</span>
                            : <span className="md-badge md-badge--none">—</span>}
                        </td>
                        <td style={{ color: T.textMute, whiteSpace: 'nowrap' }}>{fmtTime(r.attended_at)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button type="button" className="md-btn--sm" onClick={() => openEdit(r)}>تعديل</button>
                            <button type="button" className="md-btn--del" onClick={() => del(r)}>حذف</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
      </div>

      {showForm && (
        <Modal title={editing ? 'تعديل تسجيل مريض' : 'تسجيل مريض'} onClose={() => setShowForm(false)}>
          <div className="md-form-row">
            <Field label="اللقب" required>
              <input
                className="md-input" autoFocus value={f.last_name}
                onChange={e => setF({ ...f, last_name: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && save(!editing)}
                placeholder="اللقب"
              />
            </Field>
            <Field label="الاسم" required>
              <input
                className="md-input" value={f.first_name}
                onChange={e => setF({ ...f, first_name: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && save(!editing)}
                placeholder="الاسم"
              />
            </Field>
          </div>
          <Field label="تاريخ الميلاد" required>
            <input
              type="date" className="md-input" value={f.date_of_birth}
              max={new Date().toISOString().slice(0, 10)}
              onChange={e => setF({ ...f, date_of_birth: e.target.value })}
            />
          </Field>
          <Field label="التخصص (الطبيب المختص)">
            <input
              className="md-input" list="md-spec-list" value={f.speciality}
              onChange={e => setF({ ...f, speciality: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && save(!editing)}
              placeholder="اختر من القائمة أو اكتب تخصصاً"
            />
            <datalist id="md-spec-list">
              {suggestions.map(s => <option key={s} value={s} />)}
            </datalist>
          </Field>
          {!editing && <p className="md-hint">عند اختيار «حفظ وإضافة آخر» يبقى التخصص كما هو لتسريع التسجيل.</p>}
          {err && <p className="md-err">{err}</p>}
          <div className="md-form-actions">
            <button type="button" className="md-btn md-btn--ghost" onClick={() => setShowForm(false)}>إلغاء</button>
            {!editing && (
              <button type="button" className="md-btn md-btn--ghost" onClick={() => save(true)} disabled={saving}>
                حفظ وإضافة آخر
              </button>
            )}
            <button type="button" className="md-btn md-btn--sea" onClick={() => save(false)} disabled={saving}>
              {saving ? 'جارٍ الحفظ…' : editing ? 'حفظ التعديلات' : 'حفظ'}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function MedicalDayDashboard() {
  const [days,    setDays]    = useState([])
  const [loading, setLoading] = useState(true)
  const [toast,   setToast]   = useState(null)
  const [current, setCurrent] = useState(null) // the medical day being managed

  const fetchDays = useCallback(async () => {
    setLoading(true)
    try {
      const res = await client.get('/medical-days/')
      setDays(unwrap(res))
    } catch (e) {
      setToast({ msg: errText(e, 'فشل تحميل الأيام الطبية.'), type: 'error' })
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchDays() }, [fetchDays])

  const notify = useCallback((msg, type) => setToast({ msg, type }), [])

  function goBack() {
    setCurrent(null)
    fetchDays() // refresh patient counts on the cards
  }

  return (
    <div className="md-root" dir="rtl">
      <GlobalStyles />
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <header className="md-header">
        <div className="md-header-inner">
          <div className="md-brand">
            <div className="md-brand-mark" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={T.sea} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="17" rx="3" />
                <path d="M3 9h18M8 2v4M16 2v4" />
                <path d="M12 12v6M9 15h6" />
              </svg>
            </div>
            <div>
              <h1 className="md-title">{current ? current.name : 'اليوم الطبي'}</h1>
              <p className="md-subtitle">
                {current ? fmtDate(current.date) : 'اختر يوماً طبياً لإدارة حضور المرضى'}
              </p>
            </div>
          </div>

          <div className="md-header-actions">
            {current && (
              <button type="button" className="md-back" onClick={goBack}>
                <span aria-hidden="true">→</span> كل الأيام الطبية
              </button>
            )}
            {!current && (
              <button type="button" className="md-icon-btn" onClick={fetchDays} title="تحديث" aria-label="تحديث البيانات">↻</button>
            )}
          </div>
        </div>
      </header>

      <main className="md-content">
        {current
          ? <DayDetail key={current.id} day={current} notify={notify} />
          : <DaysPage days={days} loading={loading} onOpen={setCurrent} onRefresh={fetchDays} notify={notify} />}
      </main>
    </div>
  )
}