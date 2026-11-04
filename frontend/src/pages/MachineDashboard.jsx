/**
 * MachineDashboard.jsx
 * نشاط "إدارة المعدات" — إدارة الأجهزة الطبية وإسنادها
 *
 * API contract (already implemented in the backend, no changes required):
 *   GET/POST       /machines/
 *   PUT/DELETE     /machines/{id}/
 *   PATCH          /machines/{id}/set-status/        { status }
 *   GET            /machines/{id}/barcode-image/      (PNG, auth required → fetched as blob)
 *   GET            /machines/{id}/history/            → assignments for one machine
 *   GET/POST       /machine-assignments/?active=true&machine=&person=
 *   DELETE         /machine-assignments/{id}/
 *   POST           /machine-assignments/{id}/return/
 *   GET            /persons/
 */

import { useEffect, useState, useMemo, useCallback } from 'react'
import client from '../api/client'
import { PersonSearchSelect as PersonPicker } from './PersonPicker'   // adjust path to wherever you save it
// ─────────────────────────────────────────────────────────────────────────────
// TOKENS & HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  bg: '#0b1014', surface: '#121821', surfaceAlt: '#161d27', border: '#1f2a36',
  teal: '#14b8a6', tealSoft: '#5eead4', cyan: '#38bdf8', amber: '#f59e0b',
  red: '#ef4444', emerald: '#10b981', text: '#eef2f6', textMute: '#8b98a8', textFaint: '#57667a',
}

const GENDER_LABELS = { M: 'ذكر', F: 'أنثى' }

const STATUS_META = {
  available:   { label: 'متاح',        color: T.emerald },
  assigned:    { label: 'مُسند',        color: T.cyan },
  maintenance: { label: 'قيد الصيانة',  color: T.amber },
  destroyed:   { label: 'خارج الخدمة',  color: T.red },
}

function unwrap(res) {
  const d = res.data
  return Array.isArray(d) ? d : (d?.results ?? [])
}
function fmtDate(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('ar-DZ', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtDateTime(s) {
  if (!s) return '—'
  return new Date(s).toLocaleString('ar-DZ', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function toLocalDatetimeValue(input) {
  if (!input) return ''
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return ''
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function normalizePhoneForTel(phone) {
  return String(phone).replace(/[^\d+]/g, '')
}
async function viewAuthedImage(url) {
  const res = await client.get(url, { responseType: 'blob' })
  return URL.createObjectURL(res.data)
}
// The backend can return an absolute photo URL built from its own request host,
// which often doesn't match the host the browser can actually reach (reverse
// proxy / different dev ports / docker service names). To make images load
// reliably we always resolve against the API client's configured base origin
// instead of trusting whatever host the server embedded in the URL.

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
function GlobalStyles() {
  return (
    <style>{`
      .eq-root{background:${T.bg};color:${T.text};min-height:100%;font-family:Inter,system-ui,sans-serif}
      .eq-header{background:${T.surface};border-bottom:1px solid ${T.border};padding:18px 22px}
      .eq-header-inner{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px}
      .eq-brand{display:flex;align-items:center;gap:12px}
      .eq-brand-mark{width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,${T.teal},${T.cyan});display:flex;align-items:center;justify-content:center;font-size:20px}
      .eq-title{margin:0;font-size:18px;font-weight:700}
      .eq-subtitle{margin:2px 0 0;font-size:12.5px;color:${T.textMute}}
      .eq-header-stats{display:flex;align-items:center;gap:18px}
      .eq-hstat-val{font-size:18px;font-weight:700}
      .eq-hstat-lbl{font-size:11.5px;color:${T.textMute}}
      .eq-icon-btn{background:${T.surfaceAlt};border:1px solid ${T.border};border-radius:10px;padding:9px 13px;color:${T.textMute};cursor:pointer;font-size:16px;line-height:1}
      .eq-icon-btn:hover{color:${T.text}}
      .eq-tabs{display:flex;gap:6px;padding:10px 22px;background:${T.surface};border-bottom:1px solid ${T.border};overflow-x:auto}
      .eq-tab{display:flex;align-items:center;gap:6px;border:none;background:transparent;color:${T.textMute};padding:9px 16px;border-radius:9px;cursor:pointer;font-size:13.5px;font-weight:600;white-space:nowrap}
      .eq-tab--active{background:${T.surfaceAlt};color:${T.tealSoft}}
      .eq-tab-badge{background:${T.amber};color:#1a1304;border-radius:99px;padding:1px 7px;font-size:11px;font-weight:700}
      .eq-content{padding:22px;max-width:1180px;margin:0 auto}
      .eq-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:20px}
      .eq-stat{background:${T.surface};border:1px solid ${T.border};border-radius:14px;padding:16px;display:flex;align-items:center;gap:12px}
      .eq-stat-icon{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
      .eq-stat-val{font-size:21px;font-weight:700}
      .eq-stat-lbl{font-size:12px;color:${T.textMute}}
      .eq-card{background:${T.surface};border:1px solid ${T.border};border-radius:14px;overflow:hidden}
      .eq-card-head{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;padding:14px 18px;border-bottom:1px solid ${T.border}}
      .eq-card-title{font-size:14px;font-weight:700}
      .eq-table-scroll{overflow-x:auto}
      .eq-table{width:100%;border-collapse:collapse;font-size:13px}
      .eq-table th{text-align:right;padding:10px 14px;color:${T.textFaint};font-weight:600;font-size:12px;border-bottom:1px solid ${T.border}}
      .eq-table td{padding:11px 14px;border-bottom:1px solid ${T.border};vertical-align:middle}
      .eq-table tr:last-child td{border-bottom:none}
      .eq-loading,.eq-empty{padding:40px;text-align:center;color:${T.textMute};font-size:13px}
      .eq-badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:99px;font-size:11.5px;font-weight:700}
      .eq-btn{display:inline-flex;align-items:center;gap:6px;border:1px solid ${T.border};background:${T.surfaceAlt};color:${T.text};border-radius:9px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer}
      .eq-btn--primary{background:${T.teal};border-color:${T.teal};color:#06201c}
      .eq-btn--danger{color:${T.red};border-color:#3a1f1f}
      .eq-btn--sm{padding:5px 10px;font-size:12px}
      .eq-btn:disabled{opacity:.4;cursor:not-allowed}
      .eq-input,.eq-select,select.eq-input{width:100%;background:${T.bg};border:1px solid ${T.border};border-radius:9px;padding:9px 12px;color:${T.text};font-size:13.5px}
      .eq-field{display:flex;flex-direction:column;gap:5px;margin-bottom:13px}
      .eq-field label{font-size:12.5px;color:${T.textMute}}
      .eq-search{position:relative}
      .eq-search input{padding-left:32px}
      .eq-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:60;padding:20px}
      .eq-modal{background:${T.surface};border:1px solid ${T.border};border-radius:16px;width:100%;max-width:480px;max-height:88vh;overflow:auto}
      .eq-modal--wide{max-width:640px}
      .eq-modal-head{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid ${T.border}}
      .eq-modal-body{padding:18px 20px}
      .eq-modal-foot{display:flex;justify-content:flex-end;gap:10px;padding:14px 20px;border-top:1px solid ${T.border}}
      .eq-toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:${T.surfaceAlt};border:1px solid ${T.border};border-radius:10px;padding:12px 20px;font-size:13.5px;z-index:80;box-shadow:0 8px 24px rgba(0,0,0,.4)}
      .eq-toast--success{border-color:${T.emerald};color:${T.emerald}}
      .eq-toast--error{border-color:${T.red};color:${T.red}}
      .eq-err{color:${T.red};font-size:12.5px;margin-top:6px}
      .eq-thumb{width:34px;height:34px;border-radius:8px;object-fit:cover;background:${T.bg};border:1px solid ${T.border}}
    `}</style>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SMALL ATOMS
// ─────────────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3200); return () => clearTimeout(t) }, [onClose])
  return <div className={`eq-toast eq-toast--${type === 'error' ? 'error' : 'success'}`}>{msg}</div>
}

function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="eq-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={`eq-modal${wide ? ' eq-modal--wide' : ''}`}>
        <div className="eq-modal-head">
          <strong>{title}</strong>
          <button className="eq-icon-btn" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, required, children }) {
  return <div className="eq-field"><label>{label}{required && ' *'}</label>{children}</div>
}

// ─────────────────────────────────────────────────────────────────────────────
// QUICK ADD PERSON — inline mini-form used inside the assign modal so the
// user never has to leave this page to create a missing person.
// ─────────────────────────────────────────────────────────────────────────────
function QuickAddPersonForm({ onCreated, onCancel, notify }) {
  const [f, setF] = useState({
    first_name: '', last_name: '', phone: '', address: '',
    date_of_birth: '', gender: '', nin: '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function submit() {
    if (!f.first_name || !f.last_name || !f.address || !f.date_of_birth || !f.gender) {
      setErr('يرجى ملء جميع الحقول المطلوبة (الاسم، اللقب، العنوان، تاريخ الميلاد، الجنس).')
      return
    }
    setSaving(true); setErr('')
    try {
      const res = await client.post('/persons/', {
        first_name: f.first_name,
        last_name: f.last_name,
        phone: f.phone || null,
        address: f.address,
        date_of_birth: f.date_of_birth,
        gender: f.gender,
        nin: f.nin || null,
      })
      onCreated(res.data)
      notify?.('تمت إضافة الشخص بنجاح.', 'success')
    } catch (e) {
      setErr(e.response?.data ? JSON.stringify(e.response.data) : 'تعذر إضافة الشخص.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: 14, marginTop: 8, background: T.bg }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <strong style={{ fontSize: 13 }}>إضافة شخص جديد</strong>
        <button type="button" className="eq-icon-btn" style={{ padding: '4px 9px', fontSize: 13 }} onClick={onCancel}>✕</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="الاسم" required>
          <input className="eq-input" value={f.first_name} onChange={e => setF({ ...f, first_name: e.target.value })} />
        </Field>
        <Field label="اللقب" required>
          <input className="eq-input" value={f.last_name} onChange={e => setF({ ...f, last_name: e.target.value })} />
        </Field>
        <Field label="الهاتف">
          <input className="eq-input" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} />
        </Field>
        <Field label="رقم التعريف الوطني">
          <input className="eq-input" value={f.nin} onChange={e => setF({ ...f, nin: e.target.value })} />
        </Field>
        <Field label="تاريخ الميلاد" required>
          <input type="date" className="eq-input" value={f.date_of_birth} onChange={e => setF({ ...f, date_of_birth: e.target.value })} />
        </Field>
        <Field label="الجنس" required>
          <select className="eq-input" value={f.gender} onChange={e => setF({ ...f, gender: e.target.value })}>
            <option value="">اختر…</option>
            {Object.entries(GENDER_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ marginTop: 10 }}>
        <Field label="العنوان" required>
          <input className="eq-input" value={f.address} onChange={e => setF({ ...f, address: e.target.value })} />
        </Field>
      </div>
      {err && <div className="eq-err">{err}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
        <button type="button" className="eq-btn eq-btn--sm" onClick={onCancel} disabled={saving}>إلغاء</button>
        <button type="button" className="eq-btn eq-btn--primary eq-btn--sm" onClick={submit} disabled={saving}>
          {saving ? 'جارٍ الحفظ…' : 'حفظ الشخص واختياره'}
        </button>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] || { label: status, color: T.textMute }
  return <span className="eq-badge" style={{ color: m.color, background: m.color + '1f' }}>{m.label}</span>
}

function StatCard({ label, value, icon, accent }) {
  return (
    <div className="eq-stat">
      <div className="eq-stat-icon" style={{ background: accent + '22', color: accent }}>{icon}</div>
      <div><div className="eq-stat-val">{value ?? '—'}</div><div className="eq-stat-lbl">{label}</div></div>
    </div>
  )
}

function TableWrap({ children, title, toolbar, empty, loading }) {
  return (
    <div className="eq-card">
      {(title || toolbar) && (
        <div className="eq-card-head">
          {title && <span className="eq-card-title">{title}</span>}
          {toolbar}
        </div>
      )}
      {loading ? <div className="eq-loading">جارٍ التحميل…</div>
        : empty ? <div className="eq-empty">{empty}</div>
        : <div className="eq-table-scroll">{children}</div>}
    </div>
  )
}

function Table({ head, rows }) {
  return (
    <table className="eq-table">
      <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((row, i) => <tr key={i}>{row.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
    </table>
  )
}

function CameraScannerModal({ title, onClose, onDetected, notify }) {
  const [supported, setSupported] = useState(true)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(true)
  const [torchOn, setTorchOn] = useState(false)
  const [videoEl, setVideoEl] = useState(null)
  const [manualCode, setManualCode] = useState('')

  useEffect(() => {
    let stream
    let detector
    let rafId
    let stopped = false

    async function start() {
      const BarcodeDetectorCtor = window.BarcodeDetector
      if (!BarcodeDetectorCtor) {
        setSupported(false)
        setStarting(false)
        return
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })

        if (stopped) return
        if (!videoEl) return

        videoEl.srcObject = stream
        await videoEl.play()

        detector = new BarcodeDetectorCtor({ formats: ['code_128', 'ean_13', 'ean_8', 'qr_code'] })
        setStarting(false)

        const scan = async () => {
          if (stopped || !videoEl) return
          try {
            const barcodes = await detector.detect(videoEl)
            if (barcodes?.length) {
              const rawValue = (barcodes[0].rawValue || '').trim()
              if (rawValue) {
                onDetected(rawValue)
                return
              }
            }
          } catch {
            // Keep scanning; transient detector errors are expected on some devices.
          }
          rafId = requestAnimationFrame(scan)
        }

        rafId = requestAnimationFrame(scan)
      } catch {
        setError('تعذر تشغيل الكاميرا. تأكد من السماح بالوصول للكاميرا.')
        setStarting(false)
      }
    }

    if (videoEl) start()

    return () => {
      stopped = true
      if (rafId) cancelAnimationFrame(rafId)
      if (stream) stream.getTracks().forEach(t => t.stop())
    }
  }, [videoEl, onDetected])

  async function toggleTorch() {
    try {
      const track = videoEl?.srcObject?.getVideoTracks?.()[0]
      if (!track) return
      const capabilities = track.getCapabilities?.() || {}
      if (!capabilities.torch) {
        notify('الفلاش غير مدعوم في هذا الجهاز.', 'error')
        return
      }
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] })
      setTorchOn(v => !v)
    } catch {
      notify('تعذر تغيير الفلاش.', 'error')
    }
  }

  function submitManual() {
    const code = manualCode.trim()
    if (!code) {
      notify('اكتب الباركود أولاً.', 'error')
      return
    }
    onDetected(code)
  }

  return (
    <Modal title={title} onClose={onClose}>
      <div className="eq-modal-body">
        {!supported && (
          <div className="eq-err">
            متصفحك لا يدعم المسح التلقائي للباركود (BarcodeDetector). هذه الميزة مدعومة فقط في
            متصفحات كروم الحديثة على أندرويد أو سطح المكتب. استخدم إدخال الباركود يدوياً أدناه.
          </div>
        )}
        {error && <div className="eq-err">{error}</div>}
        {supported && !error && (
          <>
            <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden', background: '#000' }}>
              <video
                ref={setVideoEl}
                autoPlay
                muted
                playsInline
                style={{ width: '100%', display: 'block', maxHeight: 360, objectFit: 'cover' }}
              />
            </div>
            <div style={{ marginTop: 10, color: T.textMute, fontSize: 12 }}>
              وجه الكاميرا نحو الباركود. سيتم التقاطه تلقائيا.
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <button className="eq-btn" type="button" onClick={toggleTorch}>💡 {torchOn ? 'إطفاء الفلاش' : 'تشغيل الفلاش'}</button>
            </div>
            {starting && <div style={{ marginTop: 8, color: T.textMute, fontSize: 12 }}>جار تشغيل الكاميرا...</div>}
          </>
        )}

        <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${T.border}` }}>
          <Field label="أو أدخل الباركود يدويا">
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="eq-input"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitManual() }}
                placeholder="مثال: M-CT5"
                autoFocus={!supported}
              />
              <button className="eq-btn eq-btn--primary" type="button" onClick={submitManual}>استخدام</button>
            </div>
          </Field>
        </div>
      </div>
      <div className="eq-modal-foot">
        <button className="eq-btn" type="button" onClick={onClose}>إغلاق</button>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD TAB
// ─────────────────────────────────────────────────────────────────────────────
function DashboardTab({ machines, assignments, loading, persons, onRefresh, notify, onPersonCreated }) {
  const stats = useMemo(() => {
    const byStatus = { available: 0, assigned: 0, maintenance: 0, destroyed: 0 }
    machines.forEach(m => { byStatus[m.status] = (byStatus[m.status] || 0) + 1 })
    const active = assignments.filter(a => !a.returned_at).length
    const cutoff = Date.now() - 30 * 86400000
    const recent = assignments.filter(a => new Date(a.assigned_at).getTime() >= cutoff).length
    return { byStatus, active, recent, total: machines.length, totalAssignments: assignments.length }
  }, [machines, assignments])

  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannedMachine, setScannedMachine] = useState(null)
  const [scanLookupBusy, setScanLookupBusy] = useState(false)
  const [scanErr, setScanErr] = useState('')
  const [assignForm, setAssignForm] = useState({ assigned_to: '', description: '' })
  const [returnForm, setReturnForm] = useState({ returned_at: '', description: '' })
  const [scanSubmitting, setScanSubmitting] = useState(false)
  const [addingPerson, setAddingPerson] = useState(false)

  async function handleScanDetected(code) {
    setScannerOpen(false)
    setScanErr('')
    setScanLookupBusy(true)
    try {
      const res = await client.get(`/machines/by-barcode/${encodeURIComponent(code)}/`)
      const machine = res.data
      if (machine.status === 'available') {
        setAssignForm({ assigned_to: '', description: '' })
        setScannedMachine(machine)
      } else if (machine.status === 'assigned') {
        setReturnForm({ returned_at: toLocalDatetimeValue(new Date()), description: '' })
        setScannedMachine(machine)
      } else {
        notify(`الجهاز "${machine.name}" حالته حالياً "${STATUS_META[machine.status]?.label || machine.status}"، لا يمكن إسناده أو إرجاعه.`, 'error')
      }
    } catch {
      notify('لم يتم العثور على جهاز بهذا الباركود.', 'error')
    } finally {
      setScanLookupBusy(false)
    }
  }

  function closeScanFlow() {
    setScannedMachine(null)
    setScanErr('')
    setAddingPerson(false)
  }

  // Called once the inline "add person" form saves successfully — adds the
  // new person to the shared list, selects them, and closes the mini-form
  // without leaving the assign modal or navigating to the Persons page.
  function handlePersonCreated(person) {
    onPersonCreated?.(person)
    setAssignForm(f => ({ ...f, assigned_to: String(person.id) }))
    setAddingPerson(false)
  }

  async function submitScanAssign() {
    if (!assignForm.assigned_to) { setScanErr('اختر الشخص الذي سيُسند إليه الجهاز.'); return }
    setScanSubmitting(true); setScanErr('')
    try {
      await client.post('/machine-assignments/assign-by-barcode/', {
        bar_code: scannedMachine.bar_code,
        assigned_to: +assignForm.assigned_to,
        description: assignForm.description,
      })
      closeScanFlow()
      onRefresh()
      notify('تم إسناد الجهاز بنجاح.', 'success')
    } catch (e) {
      setScanErr(e.response?.data?.detail || JSON.stringify(e.response?.data || 'حدث خطأ.'))
    } finally {
      setScanSubmitting(false)
    }
  }

  async function submitScanReturn() {
    setScanSubmitting(true); setScanErr('')
    try {
      await client.post('/machine-assignments/return-by-barcode/', {
        bar_code: scannedMachine.bar_code,
        returned_at: returnForm.returned_at ? new Date(returnForm.returned_at).toISOString() : null,
        description: returnForm.description || '',
      })
      closeScanFlow()
      onRefresh()
      notify('تم إرجاع الجهاز بنجاح.', 'success')
    } catch (e) {
      setScanErr(e.response?.data?.detail || JSON.stringify(e.response?.data || 'حدث خطأ.'))
    } finally {
      setScanSubmitting(false)
    }
  }

  if (loading) return <div className="eq-loading">جارٍ التحميل…</div>

  const recentAssignments = [...assignments].sort((a, b) => new Date(b.assigned_at) - new Date(a.assigned_at)).slice(0, 6)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="eq-btn eq-btn--primary" disabled={scanLookupBusy} onClick={() => setScannerOpen(true)}>
          📷 {scanLookupBusy ? 'جارٍ البحث عن الجهاز…' : 'مسح جهاز'}
        </button>
      </div>

      <div className="eq-stats">
        <StatCard label="إجمالي الأجهزة"   value={stats.total}              icon="🧰" accent={T.cyan} />
        <StatCard label="متاحة"            value={stats.byStatus.available} icon="✅" accent={T.emerald} />
        <StatCard label="مُسندة حالياً"     value={stats.byStatus.assigned}  icon="🔗" accent={T.cyan} />
        <StatCard label="قيد الصيانة"       value={stats.byStatus.maintenance} icon="🛠️" accent={T.amber} />
        <StatCard label="خارج الخدمة"       value={stats.byStatus.destroyed} icon="⛔" accent={T.red} />
        <StatCard label="إسنادات آخر 30 يوم" value={stats.recent}           icon="📅" accent={T.teal} />
      </div>

      <TableWrap title="آخر عمليات الإسناد" empty={recentAssignments.length === 0 && 'لا توجد إسنادات بعد.'}>
        <Table
          head={['الجهاز', 'الشخص', 'تاريخ الإسناد', 'الحالة']}
          rows={recentAssignments.map(a => [
            `${a.machine_name} (${a.bar_code})`,
            a.person_name,
            fmtDateTime(a.assigned_at),
            a.returned_at ? <span className="eq-badge" style={{ color: T.textMute, background: T.border }}>أُرجع</span>
                          : <span className="eq-badge" style={{ color: T.cyan, background: T.cyan + '1f' }}>نشط</span>,
          ])}
        />
      </TableWrap>

      {scannerOpen && (
        <CameraScannerModal
          title="مسح باركود الجهاز"
          onClose={() => setScannerOpen(false)}
          onDetected={handleScanDetected}
          notify={notify}
        />
      )}

      {scannedMachine && scannedMachine.status === 'available' && (
        <Modal title={`إسناد: ${scannedMachine.name} (${scannedMachine.bar_code})`} onClose={closeScanFlow}>
          <div className="eq-modal-body">
            <Field label="الشخص" required>
              <PersonPicker
                persons={persons}
                value={assignForm.assigned_to}
                onChange={v => setAssignForm({ ...assignForm, assigned_to: v })}
              />
            </Field>

            {!addingPerson ? (
              <button
                type="button"
                className="eq-btn eq-btn--sm"
                style={{ marginBottom: 13 }}
                onClick={() => setAddingPerson(true)}
              >
                + الشخص غير موجود؟ إضافته الآن
              </button>
            ) : (
              <QuickAddPersonForm
                onCreated={handlePersonCreated}
                onCancel={() => setAddingPerson(false)}
                notify={notify}
              />
            )}

            <Field label="ملاحظات">
              <textarea className="eq-input" rows={2} value={assignForm.description} onChange={e => setAssignForm({ ...assignForm, description: e.target.value })} />
            </Field>
            {scanErr && <div className="eq-err">{scanErr}</div>}
          </div>
          <div className="eq-modal-foot">
            <button className="eq-btn" onClick={closeScanFlow}>إلغاء</button>
            <button className="eq-btn eq-btn--primary" disabled={scanSubmitting} onClick={submitScanAssign}>
              {scanSubmitting ? 'جارٍ الإسناد…' : 'إسناد'}
            </button>
          </div>
        </Modal>
      )}

      {scannedMachine && scannedMachine.status === 'assigned' && (
        <Modal title={`إرجاع: ${scannedMachine.name} (${scannedMachine.bar_code})`} onClose={closeScanFlow}>
          <div className="eq-modal-body">
            <Field label="تاريخ ووقت الإرجاع" required>
              <input type="datetime-local" className="eq-input" value={returnForm.returned_at} onChange={e => setReturnForm({ ...returnForm, returned_at: e.target.value })} />
            </Field>
            <Field label="ملاحظات (اختياري)">
              <textarea className="eq-input" rows={2} value={returnForm.description} onChange={e => setReturnForm({ ...returnForm, description: e.target.value })} />
            </Field>
            {scanErr && <div className="eq-err">{scanErr}</div>}
          </div>
          <div className="eq-modal-foot">
            <button className="eq-btn" onClick={closeScanFlow}>إلغاء</button>
            <button className="eq-btn eq-btn--primary" disabled={scanSubmitting} onClick={submitScanReturn}>
              {scanSubmitting ? 'جارٍ الإرجاع…' : 'تأكيد الإرجاع'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MACHINES TAB
// ─────────────────────────────────────────────────────────────────────────────
function MachinesTab({ machines, loading, onRefresh, notify }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [f, setF] = useState({ name: '', description: '', photo: null, acquisition_date: '' })
  const [saving, setSaving] = useState(false)  
  const [err, setErr] = useState('')
  const [historyFor, setHistoryFor] = useState(null)
  const [historyRows, setHistoryRows] = useState([])
  const [busyId, setBusyId] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [printing, setPrinting] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return machines.filter(m =>
      (!q || m.name.toLowerCase().includes(q) || m.bar_code.toLowerCase().includes(q)) &&
      (!statusFilter || m.status === statusFilter)
    )
  }, [machines, search, statusFilter])

  function toggleSelected(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  function toggleSelectAllFiltered() {
    const filteredIds = filtered.map(m => m.id)
    const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.includes(id))
    setSelectedIds(allSelected ? [] : filteredIds)
  }

  async function printSelectedBarcodes() {
    if (selectedIds.length === 0) { notify('اختر جهازاً واحداً على الأقل لطباعة الباركود.', 'error'); return }
    setPrinting(true)
    try {
      const res = await client.post('/machines/print-barcodes/', { ids: selectedIds }, { responseType: 'blob' })
      const missing = res.headers?.['x-missing-ids']
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      window.open(url, '_blank')
      if (missing) notify(`تم الطبع، مع تجاهل معرفات غير موجودة: ${missing}`, 'error')
      else notify('تم إنشاء ملف الباركود.', 'success')
    } catch (e) {
      notify(e.response?.data?.detail || 'فشل طباعة الباركود.', 'error')
    } finally {
      setPrinting(false)
    }
  }

  function openAdd() {
    setEditing(null)
    setF({ name: '', description: '', photo: null, acquisition_date: '' })
    setErr(''); setShowForm(true)
  }
  function openEdit(m) {
    setEditing(m)
    setF({ name: m.name, description: m.description || '', photo: null, acquisition_date: m.acquisition_date || '' })
    setErr(''); setShowForm(true)
  }
  async function submit() {
    if (!f.name.trim()) { setErr('اسم الجهاز مطلوب.'); return }
    if (!f.acquisition_date) { setErr('تاريخ الإضافة مطلوب.'); return }
    setSaving(true); setErr('')
    const fd = new FormData()
    fd.append('name', f.name)
    fd.append('description', f.description || '')
    fd.append('acquisition_date', f.acquisition_date)
    if (f.photo) fd.append('photo', f.photo)
    try {
      if (editing) await client.put(`/machines/${editing.id}/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      else         await client.post('/machines/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setShowForm(false); onRefresh(); notify(editing ? 'تم تحديث الجهاز.' : 'تمت إضافة الجهاز.', 'success')
    } catch (e) { setErr(JSON.stringify(e.response?.data || 'خطأ')) }
    finally { setSaving(false) }
  }


  async function setStatus(m, status) {
    setBusyId(m.id)
    try { await client.patch(`/machines/${m.id}/set-status/`, { status }); onRefresh(); notify('تم تحديث حالة الجهاز.', 'success') }
    catch (e) { notify(e.response?.data?.detail || 'فشل تحديث الحالة.', 'error') }
    finally { setBusyId(null) }
  }

  async function openHistory(m) {
    setHistoryFor(m)
    try { const res = await client.get(`/machines/${m.id}/history/`); setHistoryRows(res.data) }
    catch { setHistoryRows([]) }
  }
  async function confirmDelete() {
  try {
    await client.delete(`/machines/${confirmDel.id}/`)
    setConfirmDel(null)
    onRefresh()
    notify('تم حذف الجهاز.', 'success')
  } catch {
    notify('فشل الحذف.', 'error')
  }
}


  return (
    <>
      <TableWrap
        title={`الأجهزة (${filtered.length})`}
        loading={loading}
        empty={filtered.length === 0 && 'لا توجد أجهزة.'}
        toolbar={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input className="eq-input" style={{ width: 180 }} placeholder="بحث بالاسم أو الباركود…" value={search} onChange={e => setSearch(e.target.value)} />
            <select className="eq-input" style={{ width: 140 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">كل الحالات</option>
              {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <button
              className="eq-btn"
              disabled={printing}
              onClick={printSelectedBarcodes}
              title="طباعة باركود الأجهزة المحددة"
            >
              🖨️ طباعة الباركود {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
            </button>
            <button className="eq-btn eq-btn--primary" onClick={openAdd}>+ إضافة جهاز</button>
          </div>
        }
      >
        <Table
          head={[
            <input
              type="checkbox"
              checked={filtered.length > 0 && filtered.every(m => selectedIds.includes(m.id))}
              onChange={toggleSelectAllFiltered}
            />,
            'الصورة', 'الباركود', 'الاسم', 'تاريخ الإضافة', 'الحالة', 'المستخدم الحالي', 'إجراءات',
          ]}
          rows={filtered.map(m => [
            <input type="checkbox" checked={selectedIds.includes(m.id)} onChange={() => toggleSelected(m.id)} />,
            m.photo_url
              ? <img
                  src={m.photo_url}
                  className="eq-thumb"
                  alt=""
                  style={{ cursor: 'zoom-in' }}
                  onClick={() => setLightboxUrl(m.photo_url)}
                />
              : <div className="eq-thumb" />,
            m.bar_code,
            m.name,
            fmtDate(m.acquisition_date),
            <StatusBadge status={m.status} />,
            m.active_assignment ? m.active_assignment.person_name : '—',
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="eq-btn eq-btn--sm" onClick={() => openEdit(m)}>تعديل</button>
              <button className="eq-btn eq-btn--sm" onClick={() => openHistory(m)}>السجل</button>
              <select
                className="eq-input eq-btn--sm" style={{ width: 110, padding: '4px 8px' }}
                disabled={m.status === 'assigned' || busyId === m.id}
                value={m.status === 'assigned' ? '' : m.status}
                onChange={e => setStatus(m, e.target.value)}
              >
                {m.status === 'assigned' && <option value="">مُسند</option>}
                <option value="available">متاح</option>
                <option value="maintenance">قيد الصيانة</option>
                <option value="destroyed">خارج الخدمة</option>
              </select>
              <button className="eq-btn eq-btn--sm eq-btn--danger" onClick={() => setConfirmDel(m)}>حذف</button>
            </div>,
          ])}
        />
      </TableWrap>

      {showForm && (
        <Modal title={editing ? 'تعديل جهاز' : 'إضافة جهاز'} onClose={() => setShowForm(false)}>
          <div className="eq-modal-body">
            <Field label="الاسم" required>
              <input className="eq-input" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
            </Field>
            <Field label="تاريخ الإضافة" required>
              <input
                type="date"
                className="eq-input"
                value={f.acquisition_date}
                onChange={e => setF({ ...f, acquisition_date: e.target.value })}
              />
            </Field>
            <Field label="الوصف">
              <textarea className="eq-input" rows={3} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} />
            </Field>
            <Field label="الصورة">
              <input type="file" accept="image/*" className="eq-input" onChange={e => setF({ ...f, photo: e.target.files?.[0] || null })} />
            </Field>
            {err && <div className="eq-err">{err}</div>}
          </div>
          <div className="eq-modal-foot">
            <button className="eq-btn" onClick={() => setShowForm(false)}>إلغاء</button>
            <button className="eq-btn eq-btn--primary" disabled={saving} onClick={submit}>{saving ? 'جارٍ الحفظ…' : 'حفظ'}</button>
          </div>
        </Modal>
      )}
      {lightboxUrl && (
         <div
           className="eq-overlay"
           onMouseDown={e => e.target === e.currentTarget && setLightboxUrl(null)}
           style={{ zIndex: 100 }}
         >
           <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
             <button
               className="eq-icon-btn"
               onClick={() => setLightboxUrl(null)}
               style={{ position: 'absolute', top: -44, right: 0 }}
             >
               ✕
             </button>
             <img
               src={lightboxUrl}
               alt=""
               style={{
                 maxWidth: '90vw',
                 maxHeight: '90vh',
                 borderRadius: 12,
                 display: 'block',
                 boxShadow: '0 20px 60px rgba(0,0,0,.6)',
               }}
             />
           </div>
         </div>
       )}
       {confirmDel && (
          <Modal title="تأكيد الحذف" onClose={() => setConfirmDel(null)}>
            <div className="eq-modal-body">هل تريد حذف الجهاز «{confirmDel.name}»؟ هذا الإجراء لا يمكن التراجع عنه.</div>
            <div className="eq-modal-foot">
              <button className="eq-btn" onClick={() => setConfirmDel(null)}>إلغاء</button>
              <button className="eq-btn eq-btn--danger" onClick={confirmDelete}>حذف</button>
            </div>
          </Modal>
        )}

      {historyFor && (
        <Modal title={`سجل: ${historyFor.name}`} onClose={() => setHistoryFor(null)} wide>
          <div className="eq-modal-body">
            {historyRows.length === 0 ? <div className="eq-empty">لا يوجد سجل لهذا الجهاز.</div> : (
              <Table
                head={['الشخص', 'تاريخ الإسناد','تاريخ الإرجاع', 'ملاحظات']}
                rows={historyRows.map(r => [r.person_name, fmtDateTime(r.assigned_at), r.returned_at ? fmtDateTime(r.returned_at) : 'نشط', r.description || '—'])}
              />
            )}
          </div>
        </Modal>
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGNMENTS TAB
// ─────────────────────────────────────────────────────────────────────────────
function AssignmentsTab({ assignments, machines, persons, loading, onRefresh, notify }) {
  const [onlyActive, setOnlyActive] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [f, setF] = useState({ machine: '', bar_code: '', assigned_to: '', description: '', assigned_at: toLocalDatetimeValue(new Date()) })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [confirmDel, setConfirmDel] = useState(null)
  const [returning, setReturning] = useState(null)
  const [returnOpen, setReturnOpen] = useState(false)
  const [returnTarget, setReturnTarget] = useState(null)
  const [returnForm, setReturnForm] = useState({ bar_code: '', returned_at: '', description: '' })
  const [returnErr, setReturnErr] = useState('')
  const [returnSaving, setReturnSaving] = useState(false)
  const [scannerTarget, setScannerTarget] = useState('')

  const availableMachines = useMemo(() => machines.filter(m => m.status === 'available'), [machines])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return assignments
      .filter(a => !onlyActive || !a.returned_at)
      .filter(a => !q || a.machine_name?.toLowerCase().includes(q) || a.person_name?.toLowerCase().includes(q) || a.bar_code?.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.assigned_at) - new Date(a.assigned_at))
  }, [assignments, onlyActive, search])

  function openAdd() {
    setF({ machine: '', bar_code: '', assigned_to: '', description: '', assigned_at: toLocalDatetimeValue(new Date()) })
    setErr(''); setShowForm(true)
  }
  async function submit() {
    if (!f.assigned_to) { setErr('اختر الشخص.'); return }
    setSaving(true); setErr('')
    const payload = {
      assigned_to: +f.assigned_to,
      description: f.description,
      assigned_at: f.assigned_at ? new Date(f.assigned_at).toISOString() : undefined,
    }
    try {
      if (f.bar_code.trim()) {
        await client.post('/machine-assignments/assign-by-barcode/', {
          bar_code: f.bar_code.trim(),
          ...payload,
        })
      } else {
        if (!f.machine) { setErr('اختر الجهاز أو امسح الباركود.'); return }
        await client.post('/machine-assignments/', {
          machine: +f.machine,
          ...payload,
        })
      }
      setShowForm(false); onRefresh(); notify('تم إسناد الجهاز.', 'success')
    } catch (e) { setErr(JSON.stringify(e.response?.data || 'خطأ')) }
    finally { setSaving(false) }
  }

  function openReturnByRow(a) {
    setReturnErr('')
    setReturnTarget(a)
    setReturnOpen(true)
    setReturnForm({
      bar_code: a.bar_code || '',
      returned_at: toLocalDatetimeValue(new Date()),
      description: '',
    })
  }

  function openReturnByScan() {
    setReturnErr('')
    setReturnTarget(null)
    setReturnOpen(true)
    setReturnForm({
      bar_code: '',
      returned_at: toLocalDatetimeValue(new Date()),
      description: '',
    })
  }

  async function submitReturn() {
    if (!returnForm.bar_code.trim()) { setReturnErr('امسح أو اكتب الباركود أولاً.'); return }
    setReturnSaving(true)
    setReturnErr('')
    try {
      await client.post('/machine-assignments/return-by-barcode/', {
        bar_code: returnForm.bar_code.trim(),
        returned_at: returnForm.returned_at ? new Date(returnForm.returned_at).toISOString() : null,
        description: returnForm.description || '',
      })
      setReturnOpen(false)
      setReturnTarget(null)
      onRefresh()
      notify('تم إرجاع الجهاز.', 'success')
    } catch (e) {
      setReturnErr(e.response?.data?.detail || JSON.stringify(e.response?.data || 'خطأ'))
    } finally {
      setReturnSaving(false)
    }
  }

  async function confirmDelete() {
    try { await client.delete(`/machine-assignments/${confirmDel.id}/`); setConfirmDel(null); onRefresh(); notify('تم حذف السجل.', 'success') }
    catch { notify('فشل الحذف.', 'error') }
  }

  const activeCount = assignments.filter(a => !a.returned_at).length

  function onDetectedAssignBarcode(code) {
    setF(prev => ({ ...prev, bar_code: code }))
    setScannerTarget('')
    notify(`تم التقاط الباركود: ${code}`, 'success')
  }

  function onDetectedReturnBarcode(code) {
    setReturnForm(prev => ({ ...prev, bar_code: code }))
    setScannerTarget('')
    notify(`تم التقاط الباركود: ${code}`, 'success')
  }

  return (
    <>
      <TableWrap
        title={`الإسنادات (${filtered.length})`}
        loading={loading}
        empty={filtered.length === 0 && 'لا توجد إسنادات.'}
        toolbar={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input className="eq-input" style={{ width: 180 }} placeholder="بحث…" value={search} onChange={e => setSearch(e.target.value)} />
            <button className="eq-btn" onClick={() => setOnlyActive(v => !v)}>
              {onlyActive ? ` عرض الكل(${activeCount})` : 'النشطة فقط'}
            </button>
            <button className="eq-btn" onClick={openReturnByScan}>↩ إرجاع بالباركود</button>
            <button className="eq-btn eq-btn--primary" onClick={openAdd}>+ إسناد جهاز</button>
          </div>
        }
      >
        <Table
           head={['الجهاز', 'الشخص', 'الهاتف', 'تاريخ الإسناد', 'تاريخ الإرجاع', 'إجراءات']}
           rows={filtered.map(a => [
             `${a.machine_name} (${a.bar_code})`,
             a.person_name,
             a.person_phone
                ? (
                  <a
                    href={`tel:${normalizePhoneForTel(a.person_phone)}`}
                    style={{ color: T.cyan, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    📞 {a.person_phone}
                  </a>
                )
                : '—',
             fmtDateTime(a.assigned_at),
             a.returned_at ? fmtDateTime(a.returned_at) : <span className="eq-badge" style={{ color: T.cyan, background: T.cyan + '1f' }}>نشط</span>,
             <div style={{ display: 'flex', gap: 6 }}>
               {!a.returned_at && (
                 <button className="eq-btn eq-btn--sm" disabled={returning === a.id} onClick={() => openReturnByRow(a)}>
                   {returning === a.id ? '…' : 'إرجاع'}
                 </button>
               )}
               <button className="eq-btn eq-btn--sm eq-btn--danger" onClick={() => setConfirmDel(a)}>حذف</button>
             </div>,
           ])}
         />
      </TableWrap>

      {showForm && (
        <Modal title="إسناد جهاز" onClose={() => setShowForm(false)}>
          <div className="eq-modal-body">
            <Field label="الباركود (Scan)">
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="eq-input"
                  value={f.bar_code}
                  onChange={e => setF({ ...f, bar_code: e.target.value })}
                  placeholder="مثال: GA01"
                />
                <button className="eq-btn" type="button" onClick={() => setScannerTarget('assign')}>📷 مسح</button>
              </div>
            </Field>
            <Field label="الجهاز" required>
              <select className="eq-input" value={f.machine} disabled={!!f.bar_code.trim()} onChange={e => setF({ ...f, machine: e.target.value })}>
                <option value="">اختر جهازاً متاحاً…</option>
                {availableMachines.map(m => <option key={m.id} value={m.id}>{m.name} ({m.bar_code})</option>)}
              </select>
            </Field>
            <Field label="الشخص" required>
              <PersonPicker
                persons={persons}
                value={f.assigned_to}
                onChange={v => setF({ ...f, assigned_to: v })}
              />
            </Field>
            <Field label="تاريخ ووقت الإسناد" required>
               <input
                 type="datetime-local"
                 className="eq-input"
                 value={f.assigned_at}
                 onChange={e => setF({ ...f, assigned_at: e.target.value })}
               />
             </Field>
            <Field label="ملاحظات">
              <textarea className="eq-input" rows={2} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} />
            </Field>
            {err && <div className="eq-err">{err}</div>}
          </div>
          <div className="eq-modal-foot">
            <button className="eq-btn" onClick={() => setShowForm(false)}>إلغاء</button>
            <button className="eq-btn eq-btn--primary" disabled={saving} onClick={submit}>{saving ? 'جارٍ الحفظ…' : 'إسناد'}</button>
          </div>
        </Modal>
      )}

      {returnOpen && returnTarget && (
        <Modal title={`إرجاع: ${returnTarget.machine_name}`} onClose={() => { setReturnOpen(false); setReturnTarget(null) }}>
          <div className="eq-modal-body">
            <Field label="الباركود" required>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="eq-input" value={returnForm.bar_code} onChange={e => setReturnForm({ ...returnForm, bar_code: e.target.value })} />
                <button className="eq-btn" type="button" onClick={() => setScannerTarget('return')}>📷 مسح</button>
              </div>
            </Field>
            <Field label="تاريخ ووقت الإرجاع" required>
              <input type="datetime-local" className="eq-input" value={returnForm.returned_at} onChange={e => setReturnForm({ ...returnForm, returned_at: e.target.value })} />
            </Field>
            <Field label="ملاحظات (اختياري)">
              <textarea className="eq-input" rows={2} value={returnForm.description} onChange={e => setReturnForm({ ...returnForm, description: e.target.value })} />
            </Field>
            {returnErr && <div className="eq-err">{returnErr}</div>}
          </div>
          <div className="eq-modal-foot">
            <button className="eq-btn" onClick={() => { setReturnOpen(false); setReturnTarget(null) }}>إلغاء</button>
            <button className="eq-btn eq-btn--primary" disabled={returnSaving} onClick={submitReturn}>{returnSaving ? 'جارٍ الإرجاع…' : 'تأكيد الإرجاع'}</button>
          </div>
        </Modal>
      )}

      {returnOpen && !returnTarget && (
        <Modal title="إرجاع جهاز بالباركود" onClose={() => setReturnOpen(false)}>
          <div className="eq-modal-body">
            <Field label="الباركود" required>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="eq-input"
                  value={returnForm.bar_code}
                  onChange={e => setReturnForm({ ...returnForm, bar_code: e.target.value })}
                  placeholder="امسح الباركود هنا (مثال: GA01)"
                />
                <button className="eq-btn" type="button" onClick={() => setScannerTarget('return')}>📷 مسح</button>
              </div>
            </Field>
            <Field label="تاريخ ووقت الإرجاع" required>
              <input
                type="datetime-local"
                className="eq-input"
                value={returnForm.returned_at}
                onChange={e => setReturnForm({ ...returnForm, returned_at: e.target.value })}
              />
            </Field>
            <Field label="ملاحظات (اختياري)">
              <textarea
                className="eq-input"
                rows={2}
                value={returnForm.description}
                onChange={e => setReturnForm({ ...returnForm, description: e.target.value })}
              />
            </Field>
            {returnErr && <div className="eq-err">{returnErr}</div>}
          </div>
          <div className="eq-modal-foot">
            <button className="eq-btn" onClick={() => setReturnOpen(false)}>إلغاء</button>
            <button className="eq-btn eq-btn--primary" disabled={returnSaving} onClick={submitReturn}>{returnSaving ? 'جارٍ الإرجاع…' : 'تأكيد الإرجاع'}</button>
          </div>
        </Modal>
      )}

      {confirmDel && (
        <Modal title="تأكيد الحذف" onClose={() => setConfirmDel(null)}>
          <div className="eq-modal-body">هل تريد حذف سجل إسناد «{confirmDel.machine_name}» نهائياً؟</div>
          <div className="eq-modal-foot">
            <button className="eq-btn" onClick={() => setConfirmDel(null)}>إلغاء</button>
            <button className="eq-btn eq-btn--danger" onClick={confirmDelete}>حذف</button>
          </div>
        </Modal>
      )}

      {scannerTarget === 'assign' && (
        <CameraScannerModal
          title="مسح باركود الإسناد"
          onClose={() => setScannerTarget('')}
          onDetected={onDetectedAssignBarcode}
          notify={notify}
        />
      )}

      {scannerTarget === 'return' && (
        <CameraScannerModal
          title="مسح باركود الإرجاع"
          onClose={() => setScannerTarget('')}
          onDetected={onDetectedReturnBarcode}
          notify={notify}
        />
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// Lazy per-tab data loading (same pattern as PharmacyDashboard):
//   • Each tab declares which API resources it needs (TAB_DEPS).
//   • A resource is fetched only the first time a tab that needs it opens.
//   • Already-loaded resources are cached in `loaded` and are not refetched
//     just from switching tabs back and forth.
//   • `inFlight` prevents firing the same request twice while one is pending.
//   • After a create/edit/delete/return/assign action, only the resources
//     the CURRENTLY OPEN tab depends on are force-refreshed.
//
// Notes specific to this page:
//   - `persons` is needed by the assign forms in BOTH the dashboard tab
//     (scan → assign flow) and the assignments tab, so it's included as a
//     dependency of both. It's fetched once and reused.
//   - `machines` is needed everywhere (dashboard stats, machines tab,
//     assignments tab's "available machines" dropdown), so all three tabs
//     depend on it.
// ─────────────────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'dashboard',   label: 'لوحة التحكم' },
  { id: 'machines',    label: 'الأجهزة' },
  { id: 'assignments', label: 'الإسنادات' },
]

const TAB_DEPS = {
  dashboard:   ['machines', 'assignments', 'persons'],
  machines:    ['machines'],
  assignments: ['assignments', 'machines', 'persons'],
}

export default function MachineDashboard() {
  const [tab, setTab] = useState('dashboard')
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [machines, setMachines] = useState([])
  const [assignments, setAssignments] = useState([])
  const [persons, setPersons] = useState([])

  // Which resources have been fetched at least once (cache)
  const [loaded, setLoaded] = useState({})
  // Resources currently being fetched, to avoid duplicate concurrent requests
  const inFlight = useMemo(() => new Set(), [])

  const FETCHERS = useMemo(() => ({
    machines:    () => client.get('/machines/'),
    assignments: () => client.get('/machine-assignments/'),
    persons:     () => client.get('/persons/'),
  }), [])

  const SETTERS = useMemo(() => ({
    machines:    d => setMachines(unwrap(d)),
    assignments: d => setAssignments(unwrap(d)),
    persons:     d => setPersons(unwrap(d)),
  }), [])

  // Fetch only the resources a given tab needs, skipping ones already
  // cached (unless force=true, used for manual refresh / post-save updates).
  const loadTab = useCallback(async (tabId, force = false) => {
    const deps = TAB_DEPS[tabId] || []
    const toFetch = deps.filter(dep => (force || !loaded[dep]) && !inFlight.has(dep))
    if (toFetch.length === 0) return

    toFetch.forEach(dep => inFlight.add(dep))
    setLoading(true)
    try {
      const results = await Promise.all(toFetch.map(dep => FETCHERS[dep]()))
      results.forEach((res, i) => SETTERS[toFetch[i]](res))
      setLoaded(prev => {
        const next = { ...prev }
        toFetch.forEach(dep => { next[dep] = true })
        return next
      })
    } catch (e) {
      console.error(e)
    } finally {
      toFetch.forEach(dep => inFlight.delete(dep))
      setLoading(false)
    }
  }, [loaded, inFlight, FETCHERS, SETTERS])

  // Fetch data for the active tab whenever it changes (no-op if already cached)
  useEffect(() => { loadTab(tab) }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  // Manual refresh button — force-refetches only what the current tab needs
  function refreshCurrentTab() { loadTab(tab, true) }

  // Called after add/edit/delete/assign/return actions — refreshes only the
  // resources the CURRENTLY OPEN tab depends on, not everything.
  function notify(msg, type) {
    setToast({ msg, type })
    loadTab(tab, true)
  }

  // Lets child tabs add a person created inline (e.g. from the scan → assign
  // flow) straight into shared state, so the new person is instantly
  // selectable without waiting on a refetch or leaving the page.
  const addPersonLocally = useCallback(person => {
    setPersons(prev => (prev.some(p => p.id === person.id) ? prev : [...prev, person]))
    setLoaded(prev => ({ ...prev, persons: true }))
  }, [])

  const activeCount = assignments.filter(a => !a.returned_at).length
  const availableCount = machines.filter(m => m.status === 'available').length

  return (
    <div className="eq-root" dir="rtl">
      <GlobalStyles />
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <header className="eq-header">
        <div className="eq-header-inner">
          <div className="eq-brand">
            <div className="eq-brand-mark">🧰</div>
            <div>
              <h1 className="eq-title">إدارة المعدات</h1>
              <p className="eq-subtitle">نظام إدارة الأجهزة الطبية وإسنادها</p>
            </div>
          </div>
          <div className="eq-header-stats">
            <div><div className="eq-hstat-val">{loaded.machines ? availableCount : '—'}</div><div className="eq-hstat-lbl">جهاز متاح</div></div>
            <div><div className="eq-hstat-val" style={{ color: activeCount > 0 ? T.cyan : T.text }}>{loaded.assignments ? activeCount : '—'}</div><div className="eq-hstat-lbl">إسناد نشط</div></div>
            {loading && <div style={{ color: T.textMute, fontSize: 12 }}>جارٍ التحديث…</div>}
            <button className="eq-icon-btn" onClick={refreshCurrentTab} title="تحديث">↻</button>
          </div>
        </div>
      </header>

      <nav className="eq-tabs">
        {NAV.map(n => (
          <button key={n.id} className={`eq-tab${tab === n.id ? ' eq-tab--active' : ''}`} onClick={() => setTab(n.id)}>
            {n.label}
            {n.id === 'assignments' && activeCount > 0 && <span className="eq-tab-badge">{activeCount}</span>}
          </button>
        ))}
      </nav>

      <main className="eq-content">
        {tab === 'dashboard' && (
          <DashboardTab
            machines={machines}
            assignments={assignments}
            loading={loading && !(loaded.machines && loaded.assignments && loaded.persons)}
            persons={persons}
            onRefresh={() => loadTab('dashboard', true)}
            notify={notify}
            onPersonCreated={addPersonLocally}
          />
        )}
        {tab === 'machines' && (
          <MachinesTab
            machines={machines}
            loading={loading && !loaded.machines}
            onRefresh={() => loadTab('machines', true)}
            notify={notify}
          />
        )}
        {tab === 'assignments' && (
          <AssignmentsTab
            assignments={assignments}
            machines={machines}
            persons={persons}
            loading={loading && !(loaded.assignments && loaded.machines && loaded.persons)}
            onRefresh={() => loadTab('assignments', true)}
            notify={notify}
          />
        )}
      </main>
    </div>
  )
}