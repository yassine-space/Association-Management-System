/**
 * FinanceDashboard.jsx
 * نشاط "إدارة المالية" — إدارة التبرعات والمصروفات وميزانية الجمعية
 *
 * API contract (backend already implemented):
 *   GET/POST       /finance/categories/?active=true
 *   PUT/DELETE     /finance/categories/{id}/
 *   GET/POST       /finance/donations/?donor=&category=&date_from=&date_to=
 *   PUT/DELETE     /finance/donations/{id}/
 *   GET            /finance/donations/{id}/receipt/         (PDF, single receipt, 4-up A4 sheet)
 *   POST           /finance/donations/print-receipts/       ({ ids: [...] } → 4-up PDF, auth required → fetched as blob)
 *   GET/POST       /finance/expenses/?category=&date_from=&date_to=
 *   PUT/DELETE     /finance/expenses/{id}/
 *   GET            /finance/expenses/{id}/receipt/          (PDF, single receipt, 4-up A4 sheet)
 *   POST           /finance/expenses/print-receipts/        ({ ids: [...] } → 4-up PDF, auth required → fetched as blob)
 *   GET            /finance/dashboard/                      (spending_by_category only includes active categories)
 *   GET            /finance/reports/?year=&month=&category=&format=json|excel|pdf
 *   GET            /finance/audit-log/
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
function fmtMoney(n) {
  const num = Number(n || 0)
  return `${num.toLocaleString('ar-DZ', { maximumFractionDigits: 2 })} د.ج`
}

// Fetches a receipt PDF through the authenticated API client (so the JWT
// header is actually sent) and opens it in a new tab as a blob URL.
// window.open(url) alone would hit the API with no auth header and 401.
async function openReceipt(url, notify) {
  try {
    const res = await client.get(url, { responseType: 'blob' })
    const blobUrl = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    window.open(blobUrl, '_blank')
  } catch {
    notify('فشل تحميل الإيصال.', 'error')
  }
}

// Prints multiple selected receipts together on a 4-up A4 layout, same
// pattern as machine barcode bulk printing.
async function printSelectedReceipts(url, ids, notify) {
  try {
    const res = await client.post(url, { ids }, { responseType: 'blob' })
    const blobUrl = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    window.open(blobUrl, '_blank')
  } catch {
    notify('فشل طباعة الإيصالات المحددة.', 'error')
  }
}

function GlobalStyles() {
  return (
    <style>{`
      .fn-root{background:${T.bg};color:${T.text};min-height:100%;font-family:Inter,system-ui,sans-serif}
      .fn-header{background:${T.surface};border-bottom:1px solid ${T.border};padding:18px 22px}
      .fn-header-inner{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px}
      .fn-brand{display:flex;align-items:center;gap:12px}
      .fn-brand-mark{width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,${T.teal},${T.cyan});display:flex;align-items:center;justify-content:center;font-size:20px}
      .fn-title{margin:0;font-size:18px;font-weight:700}
      .fn-subtitle{margin:2px 0 0;font-size:12.5px;color:${T.textMute}}
      .fn-tabs{display:flex;gap:6px;padding:10px 22px;background:${T.surface};border-bottom:1px solid ${T.border};overflow-x:auto}
      .fn-tab{display:flex;align-items:center;gap:6px;border:none;background:transparent;color:${T.textMute};padding:9px 16px;border-radius:9px;cursor:pointer;font-size:13.5px;font-weight:600;white-space:nowrap}
      .fn-tab--active{background:${T.surfaceAlt};color:${T.tealSoft}}
      .fn-content{padding:22px;max-width:1180px;margin:0 auto}
      .fn-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:20px}
      .fn-stat{background:${T.surface};border:1px solid ${T.border};border-radius:14px;padding:16px;display:flex;align-items:center;gap:12px}
      .fn-stat-icon{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
      .fn-stat-val{font-size:19px;font-weight:700}
      .fn-stat-lbl{font-size:12px;color:${T.textMute}}
      .fn-card{background:${T.surface};border:1px solid ${T.border};border-radius:14px;overflow:hidden}
      .fn-card-head{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;padding:14px 18px;border-bottom:1px solid ${T.border}}
      .fn-card-title{font-size:14px;font-weight:700}
      .fn-table-scroll{overflow-x:auto}
      .fn-table{width:100%;border-collapse:collapse;font-size:13px}
      .fn-table th{text-align:right;padding:10px 14px;color:${T.textFaint};font-weight:600;font-size:12px;border-bottom:1px solid ${T.border}}
      .fn-table td{padding:11px 14px;border-bottom:1px solid ${T.border};vertical-align:middle}
      .fn-table tr:last-child td{border-bottom:none}
      .fn-loading,.fn-empty{padding:40px;text-align:center;color:${T.textMute};font-size:13px}
      .fn-badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:99px;font-size:11.5px;font-weight:700}
      .fn-btn{display:inline-flex;align-items:center;gap:6px;border:1px solid ${T.border};background:${T.surfaceAlt};color:${T.text};border-radius:9px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer}
      .fn-btn--primary{background:${T.teal};border-color:${T.teal};color:#06201c}
      .fn-btn--danger{color:${T.red};border-color:#3a1f1f}
      .fn-btn--sm{padding:5px 10px;font-size:12px}
      .fn-btn:disabled{opacity:.4;cursor:not-allowed}
      .fn-input,.fn-select,select.fn-input{width:100%;background:${T.bg};border:1px solid ${T.border};border-radius:9px;padding:9px 12px;color:${T.text};font-size:13.5px}
      .fn-field{display:flex;flex-direction:column;gap:5px;margin-bottom:13px}
      .fn-field label{font-size:12.5px;color:${T.textMute}}
      .fn-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:60;padding:20px}
      .fn-modal{background:${T.surface};border:1px solid ${T.border};border-radius:16px;width:100%;max-width:480px;max-height:88vh;overflow:auto}
      .fn-modal-head{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid ${T.border}}
      .fn-modal-body{padding:18px 20px}
      .fn-modal-foot{display:flex;justify-content:flex-end;gap:10px;padding:14px 20px;border-top:1px solid ${T.border}}
      .fn-toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:${T.surfaceAlt};border:1px solid ${T.border};border-radius:10px;padding:12px 20px;font-size:13.5px;z-index:80;box-shadow:0 8px 24px rgba(0,0,0,.4)}
      .fn-toast--success{border-color:${T.emerald};color:${T.emerald}}
      .fn-toast--error{border-color:${T.red};color:${T.red}}
      .fn-err{color:${T.red};font-size:12.5px;margin-top:6px}
      .fn-icon-btn{background:${T.surfaceAlt};border:1px solid ${T.border};border-radius:10px;padding:9px 13px;color:${T.textMute};cursor:pointer;font-size:16px;line-height:1}
      .fn-bar-row{display:flex;align-items:center;gap:10px;margin-bottom:10px}
      .fn-bar-label{width:130px;font-size:12.5px;color:${T.textMute};flex-shrink:0}
      .fn-bar-track{flex:1;background:${T.bg};border-radius:6px;overflow:hidden;height:18px}
      .fn-bar-fill{height:100%;background:linear-gradient(90deg,${T.teal},${T.cyan})}
      .fn-bar-val{width:110px;text-align:left;font-size:12px;color:${T.textMute};flex-shrink:0}
      .fn-msd-trigger{display:flex}
      .fn-msd-panel{
        position:absolute;top:calc(100% + 6px);right:0;z-index:40;
        min-width:200px;
        background:${T.surfaceAlt};border:1px solid ${T.border};border-radius:10px;
        box-shadow:0 10px 30px rgba(0,0,0,.45);padding:10px;
      }
      .fn-msd-option{
        display:flex;align-items:center;justify-content:space-between;
        padding:9px 10px;border-radius:7px;
        font-size:14px;cursor:pointer;color:${T.text};
      }
      .fn-msd-option:hover{background:${T.surface}}
      .fn-msd-option input{accent-color:${T.teal};width:18px;height:18px;cursor:pointer;flex-shrink:0}
      .fn-msd-option--all{font-weight:700;color:${T.tealSoft}}
      .fn-msd-divider{height:1px;background:${T.border};margin:6px 2px}
      .fn-msd-list{max-height:240px;overflow-y:auto}
      .fn-filter-card{
         background:${T.surface};border:1px solid ${T.border};border-radius:14px;
         overflow:visible; /* allow dropdown panels to escape */
       }
    `}</style>
  )
}

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3200); return () => clearTimeout(t) }, [onClose])
  return <div className={`fn-toast fn-toast--${type === 'error' ? 'error' : 'success'}`}>{msg}</div>
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fn-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="fn-modal">
        <div className="fn-modal-head">
          <strong>{title}</strong>
          <button className="fn-icon-btn" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, required, children }) {
  return <div className="fn-field"><label>{label}{required && ' *'}</label>{children}</div>
}

function StatCard({ label, value, icon, accent }) {
  return (
    <div className="fn-stat">
      <div className="fn-stat-icon" style={{ background: accent + '22', color: accent }}>{icon}</div>
      <div><div className="fn-stat-val">{value}</div><div className="fn-stat-lbl">{label}</div></div>
    </div>
  )
}

function TableWrap({ children, title, toolbar, empty, loading }) {
  return (
    <div className="fn-card">
      {(title || toolbar) && (
        <div className="fn-card-head">
          {title && <span className="fn-card-title">{title}</span>}
          {toolbar}
        </div>
      )}
      {loading ? <div className="fn-loading">جارٍ التحميل…</div>
        : empty ? <div className="fn-empty">{empty}</div>
        : <div className="fn-table-scroll">{children}</div>}
    </div>
  )
}

function Table({ head, rows }) {
  return (
    <table className="fn-table">
      <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((row, i) => <tr key={i}>{row.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
    </table>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD TAB
// ─────────────────────────────────────────────────────────────────────────────
function FinDashboardTab() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await client.get('/finance/dashboard/')
      setStats(res.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading || !stats) return <div className="fn-loading">جارٍ التحميل…</div>

  const maxCat = Math.max(1, ...stats.spending_by_category.map(c => Number(c.total)))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="fn-stats">
        <StatCard label="الرصيد الحالي" value={fmtMoney(stats.balance)} icon="💰" accent={T.teal} />
        <StatCard label="إجمالي التبرعات" value={fmtMoney(stats.total_donations)} icon="📥" accent={T.emerald} />
        <StatCard label="إجمالي المصروفات" value={fmtMoney(stats.total_expenses)} icon="📤" accent={T.red} />
        <StatCard label="تبرعات هذا الشهر" value={fmtMoney(stats.month_donations)} icon="📅" accent={T.cyan} />
        <StatCard label="مصروفات هذا الشهر" value={fmtMoney(stats.month_expenses)} icon="📅" accent={T.amber} />
      </div>

      <TableWrap title="توزيع المصروفات حسب الفئة" empty={stats.spending_by_category.length === 0 && 'لا توجد بيانات.'}>
        <div style={{ padding: '18px' }}>
          {stats.spending_by_category.map((c, i) => (
            <div className="fn-bar-row" key={i}>
              <div className="fn-bar-label">{c.category__name || '—'}</div>
              <div className="fn-bar-track">
                <div className="fn-bar-fill" style={{ width: `${(Number(c.total) / maxCat) * 100}%` }} />
              </div>
              <div className="fn-bar-val">{fmtMoney(c.total)}</div>
            </div>
          ))}
        </div>
      </TableWrap>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORIES TAB
// ─────────────────────────────────────────────────────────────────────────────
function CategoriesTab({ categories, onRefresh, notify }) {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [confirmDel, setConfirmDel] = useState(null)
  const [togglingId, setTogglingId] = useState(null)

  async function submit() {
    if (!name.trim()) { setErr('اسم الفئة مطلوب.'); return }
    setSaving(true); setErr('')
    try {
      await client.post('/finance/categories/', { name: name.trim() })
      setShowForm(false); setName(''); onRefresh()
      notify('تمت إضافة الفئة.', 'success')
    } catch (e) { setErr(JSON.stringify(e.response?.data || 'خطأ')) }
    finally { setSaving(false) }
  }

  async function confirmDelete() {
    try {
      await client.delete(`/finance/categories/${confirmDel.id}/`)
      setConfirmDel(null); onRefresh()
      notify('تم حذف الفئة.', 'success')
    } catch { notify('فشل الحذف — قد تكون مستخدمة في معاملات.', 'error') }
  }

  async function toggleActive(c) {
    setTogglingId(c.id)
    try {
      await client.put(`/finance/categories/${c.id}/`, { name: c.name, is_active: !c.is_active })
      onRefresh()
      notify(c.is_active ? 'تم إلغاء تفعيل الفئة.' : 'تم تفعيل الفئة.', 'success')
    } catch { notify('فشل تحديث حالة الفئة.', 'error') }
    finally { setTogglingId(null) }
  }

  return (
    <>
      <TableWrap
        title={`الفئات المالية (${categories.length})`}
        empty={categories.length === 0 && 'لا توجد فئات.'}
        toolbar={<button className="fn-btn fn-btn--primary" onClick={() => { setName(''); setErr(''); setShowForm(true) }}>+ فئة جديدة</button>}
      >
        <Table
          head={['الاسم', 'الحالة', 'إجراءات']}
          rows={categories.map(c => [
            c.name,
            c.is_active
              ? <span className="fn-badge" style={{ color: T.emerald, background: T.emerald + '1f' }}>نشطة</span>
              : <span className="fn-badge" style={{ color: T.textMute, background: T.textMute + '1f' }}>غير نشطة</span>,
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="fn-btn fn-btn--sm" disabled={togglingId === c.id} onClick={() => toggleActive(c)}>
                {c.is_active ? 'إلغاء التفعيل' : 'تفعيل'}
              </button>
              <button className="fn-btn fn-btn--sm fn-btn--danger" onClick={() => setConfirmDel(c)}>حذف</button>
            </div>,
          ])}
        />
      </TableWrap>

      {showForm && (
        <Modal title="فئة مالية جديدة" onClose={() => setShowForm(false)}>
          <div className="fn-modal-body">
            <Field label="اسم الفئة" required>
              <input className="fn-input" value={name} onChange={e => setName(e.target.value)} placeholder="مثال: مساعدة عائلية" />
            </Field>
            {err && <div className="fn-err">{err}</div>}
          </div>
          <div className="fn-modal-foot">
            <button className="fn-btn" onClick={() => setShowForm(false)}>إلغاء</button>
            <button className="fn-btn fn-btn--primary" disabled={saving} onClick={submit}>{saving ? 'جارٍ الحفظ…' : 'حفظ'}</button>
          </div>
        </Modal>
      )}

      {confirmDel && (
        <Modal title="تأكيد الحذف" onClose={() => setConfirmDel(null)}>
          <div className="fn-modal-body">هل تريد حذف الفئة «{confirmDel.name}»؟</div>
          <div className="fn-modal-foot">
            <button className="fn-btn" onClick={() => setConfirmDel(null)}>إلغاء</button>
            <button className="fn-btn fn-btn--danger" onClick={confirmDelete}>حذف</button>
          </div>
        </Modal>
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DONATIONS TAB
// ─────────────────────────────────────────────────────────────────────────────
function DonationsTab({ donations, categories, onRefresh, notify }) {
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [f, setF] = useState({ donor_name: '', amount: '', payment_method: 'cash', category: '', date: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [confirmDel, setConfirmDel] = useState(null)
  const [selected, setSelected] = useState(() => new Set())

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return donations.filter(d =>
      !q ||
      d.donor_name.toLowerCase().includes(q) ||
      String(d.amount).toLowerCase().includes(q)
    )
  }, [donations, search])

  const allFilteredSelected = filtered.length > 0 && filtered.every(d => selected.has(d.id))

  function toggleOne(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  function toggleAll() {
    setSelected(prev => {
      if (allFilteredSelected) return new Set()
      return new Set(filtered.map(d => d.id))
    })
  }
  async function printSelected() {
    if (selected.size === 0) { notify('يرجى تحديد تبرع واحد على الأقل.', 'error'); return }
    await printSelectedReceipts('/finance/donations/print-receipts/', Array.from(selected), notify)
  }

  function openAdd() {
    setEditing(null)
    setF({ donor_name: '', amount: '', payment_method: 'cash', category: categories[0]?.id || '', date: new Date().toISOString().slice(0, 10), notes: '' })
    setErr(''); setShowForm(true)
  }
  function openEdit(d) {
    setEditing(d)
    setF({ donor_name: d.donor_name, amount: d.amount, payment_method: d.payment_method, category: d.category, date: d.date, notes: d.notes || '' })
    setErr(''); setShowForm(true)
  }

  async function submit() {
    if (!f.donor_name.trim() || !f.amount || !f.category || !f.date) { setErr('يرجى ملء جميع الحقول المطلوبة.'); return }
    setSaving(true); setErr('')
    const payload = {
      donor_name: f.donor_name,
      amount: f.amount,
      payment_method: f.payment_method,
      category: f.category,
      date: f.date,
      notes: f.notes || '',
    }
    try {
      if (editing) await client.put(`/finance/donations/${editing.id}/`, payload)
      else await client.post('/finance/donations/', payload)
      setShowForm(false); onRefresh()
      notify(editing ? 'تم تحديث التبرع.' : 'تمت إضافة التبرع.', 'success')
    } catch (e) { setErr(JSON.stringify(e.response?.data || 'خطأ')) }
    finally { setSaving(false) }
  }

  async function confirmDelete() {
    try {
      await client.delete(`/finance/donations/${confirmDel.id}/`)
      setConfirmDel(null); onRefresh()
      notify('تم حذف التبرع.', 'success')
    } catch { notify('فشل الحذف.', 'error') }
  }

  return (
    <>
      <TableWrap
        title={`التبرعات (${filtered.length})`}
        empty={filtered.length === 0 && 'لا توجد تبرعات.'}
        toolbar={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input className="fn-input" style={{ width: 180 }} placeholder="بحث بالاسم أو المبلغ…" value={search} onChange={e => setSearch(e.target.value)} />
            <button className="fn-btn" disabled={selected.size === 0} onClick={printSelected}>🖨️ طباعة المحدد ({selected.size})</button>
            <button className="fn-btn fn-btn--primary" onClick={openAdd}>+ تبرع جديد</button>
          </div>
        }
      >
        <Table
          head={[
            '#',
            <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} />,
            'المتبرع', 'المبلغ', 'طريقة الدفع', 'الفئة', 'التاريخ', 'إجراءات',
          ]}
          rows={filtered.map((d, idx) => [
            idx + 1,
            <input type="checkbox" checked={selected.has(d.id)} onChange={() => toggleOne(d.id)} />,
            d.donor_name,
            fmtMoney(d.amount),
            d.payment_method === 'cash' ? 'نقداً' : 'حساب بنكي',
            d.category_name,
            fmtDate(d.date),
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="fn-btn fn-btn--sm" onClick={() => openEdit(d)}>تعديل</button>
              <button className="fn-btn fn-btn--sm" onClick={() => openReceipt(`/finance/donations/${d.id}/receipt/`, notify)}>🧾 إيصال</button>
              <button className="fn-btn fn-btn--sm fn-btn--danger" onClick={() => setConfirmDel(d)}>حذف</button>
            </div>,
          ])}
        />
      </TableWrap>

      {showForm && (
        <Modal title={editing ? 'تعديل تبرع' : 'تبرع جديد'} onClose={() => setShowForm(false)}>
          <div className="fn-modal-body">
            <Field label="اسم المتبرع" required>
              <input className="fn-input" value={f.donor_name} onChange={e => setF({ ...f, donor_name: e.target.value })} />
            </Field>
            <Field label="المبلغ (د.ج)" required>
              <input className="fn-input" type="number" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} />
            </Field>
            <Field label="طريقة الدفع" required>
              <select className="fn-input" value={f.payment_method} onChange={e => setF({ ...f, payment_method: e.target.value })}>
                <option value="cash">نقداً</option>
                <option value="bank">حساب بنكي</option>
              </select>
            </Field>
            <Field label="الفئة" required>
              <select className="fn-input" value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>
                <option value="">اختر فئة…</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="التاريخ" required>
              <input type="date" className="fn-input" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} />
            </Field>
            <Field label="ملاحظات">
              <textarea className="fn-input" rows={2} value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} />
            </Field>
            {err && <div className="fn-err">{err}</div>}
          </div>
          <div className="fn-modal-foot">
            <button className="fn-btn" onClick={() => setShowForm(false)}>إلغاء</button>
            <button className="fn-btn fn-btn--primary" disabled={saving} onClick={submit}>{saving ? 'جارٍ الحفظ…' : 'حفظ'}</button>
          </div>
        </Modal>
      )}

      {confirmDel && (
        <Modal title="تأكيد الحذف" onClose={() => setConfirmDel(null)}>
          <div className="fn-modal-body">هل تريد حذف تبرع «{confirmDel.donor_name}» بمبلغ {fmtMoney(confirmDel.amount)}؟</div>
          <div className="fn-modal-foot">
            <button className="fn-btn" onClick={() => setConfirmDel(null)}>إلغاء</button>
            <button className="fn-btn fn-btn--danger" onClick={confirmDelete}>حذف</button>
          </div>
        </Modal>
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPENSES TAB
// ─────────────────────────────────────────────────────────────────────────────
function ExpensesTab({ expenses, categories, onRefresh, notify }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [f, setF] = useState({ amount: '', category: '', description: '', date: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [confirmDel, setConfirmDel] = useState(null)
  const [selected, setSelected] = useState(() => new Set())
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return expenses.filter(e => !q || String(e.amount).toLowerCase().includes(q))
  }, [expenses, search])

  const allSelected = filtered.length > 0 && filtered.every(e => selected.has(e.id))
  function toggleOne(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  function toggleAll() {
    setSelected(prev => (allSelected ? new Set() : new Set(filtered.map(e => e.id))))
  }
  async function printSelected() {
    if (selected.size === 0) { notify('يرجى تحديد مصروف واحد على الأقل.', 'error'); return }
    await printSelectedReceipts('/finance/expenses/print-receipts/', Array.from(selected), notify)
  }

  function openAdd() {
    setEditing(null)
    setF({ amount: '', category: categories[0]?.id || '', description: '', date: new Date().toISOString().slice(0, 10) })
    setErr(''); setShowForm(true)
  }
  function openEdit(e) {
    setEditing(e)
    setF({ amount: e.amount, category: e.category, description: e.description, date: e.date })
    setErr(''); setShowForm(true)
  }

  async function submit() {
    if (!f.amount || !f.category || !f.description.trim() || !f.date) { setErr('يرجى ملء جميع الحقول المطلوبة.'); return }
    setSaving(true); setErr('')
    const payload = {
      amount: f.amount,
      category: f.category,
      description: f.description,
      date: f.date,
    }
    try {
      if (editing) await client.put(`/finance/expenses/${editing.id}/`, payload)
      else await client.post('/finance/expenses/', payload)
      setShowForm(false); onRefresh()
      notify(editing ? 'تم تحديث المصروف.' : 'تمت إضافة المصروف.', 'success')
    } catch (e) { setErr(JSON.stringify(e.response?.data || 'خطأ')) }
    finally { setSaving(false) }
  }

  async function confirmDelete() {
    try {
      await client.delete(`/finance/expenses/${confirmDel.id}/`)
      setConfirmDel(null); onRefresh()
      notify('تم حذف المصروف.', 'success')
    } catch { notify('فشل الحذف.', 'error') }
  }

  return (
    <>
      <TableWrap
        title={`المصروفات (${filtered.length})`}
        empty={filtered.length === 0 && 'لا توجد مصروفات.'}
        toolbar={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input className="fn-input" style={{ width: 180 }} placeholder="بحث بالمبلغ…" value={search} onChange={e => setSearch(e.target.value)} />
            <button className="fn-btn" disabled={selected.size === 0} onClick={printSelected}>🖨️ طباعة المحدد ({selected.size})</button>
            <button className="fn-btn fn-btn--primary" onClick={openAdd}>+ مصروف جديد</button>
          </div>
        }
      >
        <Table
          head={[
            '#',
            <input type="checkbox" checked={allSelected} onChange={toggleAll} />,
            'المبلغ', 'الفئة', 'الوصف', 'التاريخ', 'مصدر', 'إجراءات',
          ]}
          rows={filtered.map((e, idx) => [
            idx + 1,
            <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggleOne(e.id)} />,
            fmtMoney(e.amount),
            e.category_name,
            e.description,
            fmtDate(e.date),
            e.related_donation ? <span className="fn-badge" style={{ color: T.cyan, background: T.cyan + '1f' }}>فاتورة دواء</span> : '—',
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="fn-btn fn-btn--sm" onClick={() => openEdit(e)}>تعديل</button>
              <button className="fn-btn fn-btn--sm" onClick={() => openReceipt(`/finance/expenses/${e.id}/receipt/`, notify)}>🧾 إيصال</button>
              <button className="fn-btn fn-btn--sm fn-btn--danger" onClick={() => setConfirmDel(e)}>حذف</button>
            </div>,
          ])}
        />
      </TableWrap>

      {showForm && (
        <Modal title={editing ? 'تعديل مصروف' : 'مصروف جديد'} onClose={() => setShowForm(false)}>
          <div className="fn-modal-body">
            <Field label="المبلغ (د.ج)" required>
              <input className="fn-input" type="number" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} />
            </Field>
            <Field label="الفئة" required>
              <select className="fn-input" value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>
                <option value="">اختر فئة…</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="الوصف" required>
              <textarea className="fn-input" rows={2} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} />
            </Field>
            <Field label="التاريخ" required>
              <input type="date" className="fn-input" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} />
            </Field>
            {err && <div className="fn-err">{err}</div>}
          </div>
          <div className="fn-modal-foot">
            <button className="fn-btn" onClick={() => setShowForm(false)}>إلغاء</button>
            <button className="fn-btn fn-btn--primary" disabled={saving} onClick={submit}>{saving ? 'جارٍ الحفظ…' : 'حفظ'}</button>
          </div>
        </Modal>
      )}

      {confirmDel && (
        <Modal title="تأكيد الحذف" onClose={() => setConfirmDel(null)}>
          <div className="fn-modal-body">هل تريد حذف مصروف بمبلغ {fmtMoney(confirmDel.amount)}؟</div>
          <div className="fn-modal-foot">
            <button className="fn-btn" onClick={() => setConfirmDel(null)}>إلغاء</button>
            <button className="fn-btn fn-btn--danger" onClick={confirmDelete}>حذف</button>
          </div>
        </Modal>
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORTS TAB
// ─────────────────────────────────────────────────────────────────────────────
function ReportsTab({ categories, notify }) {
  const currentYear = new Date().getFullYear()
  const yearOptions = useMemo(() => {
    const arr = []
    for (let y = currentYear; y >= currentYear - 6; y--) arr.push({ value: y, label: String(y) })
    return arr
  }, [currentYear])

  const monthOptions = useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: String(i + 1) })),
    []
  )

  const categoryOptions = useMemo(
    () => categories.map(c => ({ value: c.id, label: c.name })),
    [categories]
  )

  const [selectedYears, setSelectedYears] = useState(['all'])
  const [selectedMonths, setSelectedMonths] = useState(['all'])
  const [selectedCategories, setSelectedCategories] = useState(['all'])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  async function loadReport() {
    setLoading(true)
    try {
      const years  = selectedYears.includes('all')  ? [null] : selectedYears
      const months = selectedMonths.includes('all') ? [null] : selectedMonths
      const categoryParam = selectedCategories.includes('all') ? null : selectedCategories.join(',')

      const requests = []
      for (const y of years) {
        for (const m of months) {
          const params = new URLSearchParams()
          if (y) params.append('year', y)
          if (m) params.append('month', m)
          if (categoryParam) params.append('category', categoryParam)
          requests.push(client.get(`/finance/reports/?${params.toString()}`))
        }
      }

      const results = await Promise.all(requests)
      const merged = results.reduce((acc, res) => {
        const d = res.data
        acc.total_donations += Number(d.total_donations || 0)
        acc.total_expenses  += Number(d.total_expenses  || 0)
        acc.net             += Number(d.net             || 0)
        acc.donations = acc.donations.concat(d.donations || [])
        acc.expenses  = acc.expenses.concat(d.expenses  || [])
        return acc
      }, { total_donations: 0, total_expenses: 0, net: 0, donations: [], expenses: [] })

      setData(merged)
    } catch {
      notify('فشل تحميل التقرير.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadReport() }, []) // eslint-disable-line

  async function exportFile(fmt) {
    try {
      const y = selectedYears.includes('all')  ? '' : selectedYears[0]
      const m = selectedMonths.includes('all') ? '' : selectedMonths[0]
      const categoryParam = selectedCategories.includes('all') ? '' : selectedCategories.join(',')
      const params = new URLSearchParams()
      if (y) params.append('year', y)
      if (m) params.append('month', m)
      if (categoryParam) params.append('category', categoryParam)
      params.append('export_format', fmt)
      const res = await client.get(`/finance/reports/?${params.toString()}`, { responseType: 'blob' })
      const mime = fmt === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf'
      const url = URL.createObjectURL(new Blob([res.data], { type: mime }))
      const a = document.createElement('a')
      a.href = url
      a.download = `financial_report.${fmt === 'excel' ? 'xlsx' : 'pdf'}`
      a.click()
      notify('تم تصدير التقرير.', 'success')
      if ((!selectedYears.includes('all') && selectedYears.length > 1) ||
          (!selectedMonths.includes('all') && selectedMonths.length > 1)) {
        notify('ملاحظة: التصدير يشمل أول سنة/شهر محدد فقط.', 'error')
      }
    } catch {
      notify('فشل التصدير.', 'error')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="fn-filter-card">
        <div className="fn-card-head"><span className="fn-card-title">فلاتر التقرير</span></div>
        <div style={{ padding: 18, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <MultiSelectDropdown
            label="السنوات"
            options={yearOptions}
            selected={selectedYears}
            onChange={setSelectedYears}
            width={140}
          />
          <MultiSelectDropdown
            label="الأشهر"
            options={monthOptions}
            selected={selectedMonths}
            onChange={setSelectedMonths}
            width={140}
          />

          <MultiSelectDropdown
            label="الفئة"
            options={categoryOptions}
            selected={selectedCategories}
            onChange={setSelectedCategories}
            width={180}
          />

          <button className="fn-btn fn-btn--primary" onClick={loadReport}>تطبيق</button>
          <button className="fn-btn" onClick={() => exportFile('excel')}>📊 تصدير Excel</button>
          <button className="fn-btn" onClick={() => exportFile('pdf')}>📄 تصدير PDF</button>
        </div>
      </div>

      {loading ? <div className="fn-loading">جارٍ التحميل…</div> : data && (
        <>
          <div className="fn-stats">
            <StatCard label="إجمالي التبرعات"  value={fmtMoney(data.total_donations)} icon="📥" accent={T.emerald} />
            <StatCard label="إجمالي المصروفات" value={fmtMoney(data.total_expenses)}  icon="📤" accent={T.red} />
            <StatCard label="الصافي"           value={fmtMoney(data.net)}             icon="💰" accent={T.teal} />
          </div>

          <TableWrap title="التبرعات" empty={data.donations.length === 0 && 'لا توجد بيانات.'}>
            <Table
              head={['#', 'المتبرع', 'المبلغ', 'الفئة', 'التاريخ']}
              rows={data.donations.map((d, idx) => [idx + 1, d.donor_name, fmtMoney(d.amount), d.category_name, fmtDate(d.date)])}
            />
          </TableWrap>

          <TableWrap title="المصروفات" empty={data.expenses.length === 0 && 'لا توجد بيانات.'}>
            <Table
              head={['#', 'المبلغ', 'الفئة', 'الوصف', 'التاريخ']}
              rows={data.expenses.map((e, idx) => [idx + 1, fmtMoney(e.amount), e.category_name, e.description, fmtDate(e.date)])}
            />
          </TableWrap>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOG TAB
// ─────────────────────────────────────────────────────────────────────────────
function AuditLogTab() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    client.get('/finance/audit-log/').then(res => setLogs(unwrap(res))).catch(() => setLogs([])).finally(() => setLoading(false))
  }, [])

  const ACTION_LABELS = { create: 'إنشاء', update: 'تعديل', delete: 'حذف' }

  return (
    <TableWrap title="سجل التدقيق" loading={loading} empty={!loading && logs.length === 0 && 'لا توجد سجلات.'}>
      <Table
        head={['المستخدم', 'الإجراء', 'النوع', 'التفاصيل', 'الوقت']}
        rows={logs.map(l => [
          l.username || '—',
          ACTION_LABELS[l.action] || l.action,
          l.model_name,
          l.details || '—',
          new Date(l.timestamp).toLocaleString('ar-DZ'),
        ])}
      />
    </TableWrap>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'dashboard',  label: 'لوحة التحكم' },
  { id: 'donations',  label: 'التبرعات' },
  { id: 'expenses',   label: 'المصروفات' },
  { id: 'categories', label: 'الفئات' },
  { id: 'reports',    label: 'التقارير' },
  { id: 'audit',      label: 'سجل التدقيق' },
]

export default function FinanceDashboard() {
  const [tab, setTab] = useState('dashboard')
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState([])
  const [donations, setDonations] = useState([])
  const [expenses, setExpenses] = useState([])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [cat, don, exp] = await Promise.all([
        client.get('/finance/categories/'),
        client.get('/finance/donations/'),
        client.get('/finance/expenses/'),
      ])
      setCategories(unwrap(cat)); setDonations(unwrap(don)); setExpenses(unwrap(exp))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  function notify(msg, type) { setToast({ msg, type }); fetchAll() }

  return (
    <div className="fn-root" dir="rtl">
      <GlobalStyles />
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <header className="fn-header">
        <div className="fn-header-inner">
          <div className="fn-brand">
            <div className="fn-brand-mark">💰</div>
            <div>
              <h1 className="fn-title">إدارة المالية</h1>
              <p className="fn-subtitle">التبرعات، المصروفات، والميزانية العامة</p>
            </div>
          </div>
        </div>
      </header>

      <nav className="fn-tabs">
        {NAV.map(n => (
          <button key={n.id} className={`fn-tab${tab === n.id ? ' fn-tab--active' : ''}`} onClick={() => setTab(n.id)}>
            {n.label}
          </button>
        ))}
      </nav>

      <main className="fn-content">
        {tab === 'dashboard' && <FinDashboardTab />}
        {tab === 'donations' && <DonationsTab donations={donations} categories={categories} onRefresh={fetchAll} notify={notify} />}
        {tab === 'expenses' && <ExpensesTab expenses={expenses} categories={categories} onRefresh={fetchAll} notify={notify} />}
        {tab === 'categories' && <CategoriesTab categories={categories} onRefresh={fetchAll} notify={notify} />}
        {tab === 'reports' && <ReportsTab categories={categories} notify={notify} />}
        {tab === 'audit' && <AuditLogTab />}
      </main>
    </div>
  )
}
// ─────────────────────────────────────────────────────────────────────────────
// MULTI-SELECT DROPDOWN (checkbox style)
// ─────────────────────────────────────────────────────────────────────────────
function MultiSelectDropdown({ label, options, selected, onChange, width = 200 }) {
  const [open, setOpen] = useState(false)
  const rootRef = useCallbackRefEscape(() => setOpen(false))

  const allSelected = selected.includes('all') || selected.length === 0
  const count = allSelected ? options.length : selected.length

  function toggleAll() {
    onChange(['all'])
  }

  function toggleOne(value) {
    let next
    if (allSelected) {
      // coming from "all" -> start a fresh selection with just this one
      next = [value]
    } else if (selected.includes(value)) {
      next = selected.filter(v => v !== value)
    } else {
      next = [...selected, value]
    }
    if (next.length === 0 || next.length === options.length) next = ['all']
    onChange(next)
  }

  const summary = allSelected
    ? `الكل (${options.length})`
    : selected.length === 1
      ? options.find(o => String(o.value) === String(selected[0]))?.label
      : `${selected.length} محدد`

  return (
    <div className="fn-field" style={{ position: 'relative' }} ref={rootRef}>
      <label>{label}</label>
      <button
        type="button"
        className="fn-input fn-msd-trigger"
        style={{ width, textAlign: 'right', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        onClick={() => setOpen(v => !v)}
      >
        <span>{summary}</span>
        <span style={{ color: T.textMute, fontSize: 11 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="fn-msd-panel" style={{ width }}>
          <label className="fn-msd-option fn-msd-option--all">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} />
            <span>الكل</span>
          </label>
          <div className="fn-msd-divider" />
          <div className="fn-msd-list">
            {options.map(o => (
              <label className="fn-msd-option" key={o.value}>
                <input
                  type="checkbox"
                  checked={!allSelected && selected.includes(String(o.value))}
                  onChange={() => toggleOne(String(o.value))}
                />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// tiny helper hook: close dropdown when clicking outside
function useCallbackRefEscape(onOutside) {
  const ref = useMemo(() => ({ current: null }), [])
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onOutside()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ref, onOutside])
  return ref
}