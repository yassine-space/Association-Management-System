import { useEffect, useState, useMemo, useCallback } from 'react'
import client from '../api/client'
import { PersonSearchSelect } from './PersonPicker'
import logo from '../assets/photo_2026-06-13_11-54-41.jpg'
// ─── Helpers ──────────────────────────────────────────────────────────────────
function unwrap(res) {
  const d = res.data
  return Array.isArray(d) ? d : (d?.results ?? [])
}

const ACCESS_LABELS = { viewer: 'قارئ', editor: 'محرر', manager: 'مدير' }
const ACCESS_COLORS = { viewer: '#6366f1', editor: '#f59e0b', manager: '#10b981' }

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3800); return () => clearTimeout(t) }, [onClose])
  return (
    <div style={{
      position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
      background: type === 'success' ? '#10b981' : '#ef4444',
      color: '#fff', borderRadius: 10, padding: '10px 20px',
      fontWeight: 600, fontSize: 14, zIndex: 9999,
      boxShadow: '0 8px 24px rgba(0,0,0,.4)',
    }}>
      {type === 'success' ? '✓' : '✗'} {msg}
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: '#1e2533', border: '1px solid #2d3748',
        borderRadius: 14, width: '100%', maxWidth: wide ? 780 : 500,
        maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid #2d3748',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
        }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#f1f5f9' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 22, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '20px 24px', overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  )
}

// ─── Field ────────────────────────────────────────────────────────────────────
const inputStyle = {
  background: '#151c28', border: '1px solid #2d3748', borderRadius: 8,
  color: '#f1f5f9', padding: '9px 12px', fontSize: 14,
  width: '100%', boxSizing: 'border-box', textAlign: 'right', outline: 'none',
}
function Field({ label, required, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', letterSpacing: '.4px' }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

// Using shared PersonPicker component for searchable person selection

// ─── Badge ────────────────────────────────────────────────────────────────────
function Badge({ label, color, bg }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 600, color: color || '#fff', background: bg || '#334155',
    }}>{label}</span>
  )
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, count, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <div>
        <h3 style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 16, margin: 0 }}>{title}</h3>
        {count !== undefined && <span style={{ color: '#64748b', fontSize: 12 }}>{count} سجل</span>}
      </div>
      {action}
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, accent }) {
  return (
    <div style={{
      background: '#1e2533', border: `1px solid ${accent}33`,
      borderRadius: 12, padding: '18px 20px', flex: 1, minWidth: 130,
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{ width: 42, height: 42, borderRadius: 10, background: `${accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9', lineHeight: 1 }}>{value ?? '—'}</div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>{label}</div>
      </div>
    </div>
  )
}

// ─── Table ────────────────────────────────────────────────────────────────────
function Table({ head, rows, empty }) {
  if (rows.length === 0) return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#4b5563', fontSize: 14 }}>{empty || 'لا توجد بيانات'}</div>
  )
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#151c28' }}>
            {head.map((h, i) => (
              <th key={i} style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px', color: '#64748b', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderTop: '1px solid #2d3748' }}
              onMouseEnter={e => e.currentTarget.style.background = '#232d3f'}
              onMouseLeave={e => e.currentTarget.style.background = ''}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '12px 16px', color: '#cbd5e1', verticalAlign: 'middle', textAlign: 'right' }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Card({ children, style }) {
  return (
    <div style={{ background: '#1e2533', border: '1px solid #2d3748', borderRadius: 12, overflow: 'hidden', ...style }}>
      {children}
    </div>
  )
}

// ─── Btn ──────────────────────────────────────────────────────────────────────
function Btn({ onClick, disabled, color = '#6366f1', children, small, outline }) {
  const bg = outline ? 'transparent' : color
  const border = outline ? `1px solid ${color}` : 'none'
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: bg, border, borderRadius: 7,
      padding: small ? '5px 10px' : '9px 18px',
      color: outline ? color : '#fff',
      fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: small ? 12 : 13, opacity: disabled ? .6 : 1,
      whiteSpace: 'nowrap',
    }}>{children}</button>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// USER DETAIL / MANAGE MODAL
// ══════════════════════════════════════════════════════════════════════════════
function UserManageModal({ user, activities, persons, onClose, onSaved, notify }) {
  const [tab, setTab] = useState('info')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [userData, setUserData] = useState(user)

  // Info form — only auth fields: username, password, is_active
  const [infoForm, setInfoForm] = useState({
    username: user.username,
    is_active: user.is_active,
    password: '',
  })

  // Person link
  const [personId, setPersonId] = useState(user.profile?.person || '')

  // Access form
  const [accessForm, setAccessForm] = useState({ activity: '', access_level: 'viewer' })
  const [removingId, setRemovingId] = useState(null)

  const accesses = userData.activity_accesses || []

  // Resolve linked person's full data from the persons list
  const linkedPerson = useMemo(() =>
    persons.find(p => String(p.id) === String(userData.profile?.person)),
    [persons, userData.profile?.person]
  )

  // Resolve memberships for the linked person
  const [memberships, setMemberships] = useState([])
  useEffect(() => {
    if (!linkedPerson) { setMemberships([]); return }
    client.get('/members/').then(r => {
      const all = Array.isArray(r.data) ? r.data : (r.data?.results ?? [])
      setMemberships(all.filter(m => m.person === linkedPerson.id))
    }).catch(() => setMemberships([]))
  }, [linkedPerson?.id])

  const [departments, setDepartments] = useState([])
  useEffect(() => {
    client.get('/departments/').then(r => {
      setDepartments(Array.isArray(r.data) ? r.data : (r.data?.results ?? []))
    }).catch(() => {})
  }, [])

  const deptMap = useMemo(() =>
    Object.fromEntries(departments.map(d => [d.id, d])),
    [departments]
  )

  async function saveInfo() {
    setSaving(true); setErr('')
    const payload = { username: infoForm.username, is_active: infoForm.is_active }
    if (infoForm.password) payload.password = infoForm.password
    try {
      await client.put(`/users/${userData.id}/`, payload)
      const full = await client.get(`/users/${userData.id}/`)
      setUserData(full.data)
      notify('تم تحديث معلومات المستخدم.', 'success')
      onSaved()
    } catch (e) { setErr(JSON.stringify(e.response?.data || 'خطأ')) }
    finally { setSaving(false) }
  }

  async function savePerson() {
    setSaving(true); setErr('')
    try {
      const res = await client.post(`/users/${userData.id}/set_person/`, { person_id: personId || null })
      setUserData(res.data)
      notify('تم تحديث الشخص المرتبط.', 'success')
      onSaved()
    } catch (e) { setErr(JSON.stringify(e.response?.data || 'خطأ')) }
    finally { setSaving(false) }
  }

  async function addAccess() {
    if (!accessForm.activity) { setErr('اختر نشاطاً'); return }
    setSaving(true); setErr('')
    try {
      const res = await client.post(`/users/${userData.id}/set_access/`, {
        activity_id: accessForm.activity,
        access_level: accessForm.access_level,
      })
      setUserData(res.data)
      setAccessForm({ activity: '', access_level: 'viewer' })
      notify('تمت إضافة الصلاحية.', 'success')
      onSaved()
    } catch (e) { setErr(JSON.stringify(e.response?.data || 'خطأ')) }
    finally { setSaving(false) }
  }

  async function removeAccess(accessId) {
    setRemovingId(accessId)
    try {
      const res = await client.delete(`/users/${userData.id}/remove_access/${accessId}/`)
      setUserData(res.data)
      notify('تمت إزالة الصلاحية.', 'success')
      onSaved()
    } catch (e) { notify('حدث خطأ أثناء الحذف.', 'error') }
    finally { setRemovingId(null) }
  }

  const tabs = [
    { id: 'info', label: 'الحساب' },
    { id: 'person', label: 'الشخص المرتبط' },
    { id: 'access', label: `الصلاحيات (${accesses.length})` },
  ]

  const activityGroups = useMemo(() => {
    const groups = {}
    activities.forEach(a => {
      const dept = a.department_name || 'غير محدد'
      if (!groups[dept]) groups[dept] = []
      groups[dept].push(a)
    })
    return groups
  }, [activities])

  return (
    <Modal title={`إدارة المستخدم: ${userData.username}`} onClose={onClose} wide>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #2d3748', marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setErr('') }} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '8px 16px', fontSize: 13, fontWeight: 600,
            color: tab === t.id ? '#a5b4fc' : '#64748b',
            borderBottom: tab === t.id ? '2px solid #6366f1' : '2px solid transparent',
          }}>{t.label}</button>
        ))}
      </div>

      {err && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 14, background: '#ef444415', padding: '8px 12px', borderRadius: 8 }}>{err}</div>}

      {/* Info tab — auth fields only */}
      {tab === 'info' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="اسم المستخدم" required>
            <input style={inputStyle} value={infoForm.username} onChange={e => setInfoForm({ ...infoForm, username: e.target.value })} />
          </Field>
          <Field label="كلمة مرور جديدة (اتركها فارغة للإبقاء على الحالية)">
            <input type="password" style={inputStyle} value={infoForm.password} onChange={e => setInfoForm({ ...infoForm, password: e.target.value })} placeholder="••••••••" />
          </Field>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={infoForm.is_active} onChange={e => setInfoForm({ ...infoForm, is_active: e.target.checked })} />
            الحساب مفعّل
          </label>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <Btn onClick={onClose} outline color="#64748b">إلغاء</Btn>
            <Btn onClick={saveInfo} disabled={saving} color="#6366f1">{saving ? 'جارٍ الحفظ…' : 'حفظ'}</Btn>
          </div>
        </div>
      )}

      {/* Person tab — link + display rich person info */}
      {tab === 'person' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Rich person info card */}
          {linkedPerson ? (
            <div style={{ background: '#151c28', borderRadius: 10, padding: '16px', border: '1px solid #10b98133' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 10 }}>الشخص المرتبط حالياً</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  ['الاسم الكامل', `${linkedPerson.first_name} ${linkedPerson.last_name}`],
                  ['رقم التعريف (NIN)', linkedPerson.nin],
                  ['الهاتف', linkedPerson.phone],
                  ['تاريخ الميلاد', linkedPerson.date_of_birth],
                  ['الجنس', linkedPerson.gender === 'M' ? 'ذكر' : 'أنثى'],
                  ['العنوان', linkedPerson.address],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>{k}</div>
                    <div style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 500 }}>{v || '—'}</div>
                  </div>
                ))}
              </div>
              {memberships.length > 0 && (
                <div style={{ marginTop: 12, borderTop: '1px solid #2d3748', paddingTop: 10 }}>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>الأقسام التي ينتمي إليها</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {memberships.map(m => (
                      <span key={m.id} style={{ background: '#6366f122', color: '#a5b4fc', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
                        {deptMap[m.department]?.name || `قسم #${m.department}`} — {m.role}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: '#151c28', borderRadius: 10, padding: '14px 16px', border: '1px solid #f59e0b33' }}>
              <div style={{ color: '#f59e0b', fontSize: 13 }}>⚠ لا يوجد شخص مرتبط بهذا الحساب</div>
            </div>
          )}

          <Field label="اختر شخصاً من القائمة">
             <PersonSearchSelect
               persons={persons}
               value={personId}
               onChange={setPersonId}
             />
          </Field>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn onClick={onClose} outline color="#64748b">إلغاء</Btn>
            <Btn onClick={savePerson} disabled={saving} color="#10b981">{saving ? 'جارٍ الحفظ…' : 'ربط الشخص'}</Btn>
          </div>
        </div>
      )}

      {/* Access tab */}
      {tab === 'access' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 10 }}>الصلاحيات الحالية</div>
            {accesses.length === 0 ? (
              <div style={{ color: '#4b5563', fontSize: 13, padding: '16px', textAlign: 'center', background: '#151c28', borderRadius: 8 }}>
                لا توجد صلاحيات مسندة بعد
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {accesses.map(acc => (
                  <div key={acc.id} style={{
                    background: '#151c28', borderRadius: 8, padding: '12px 16px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    border: `1px solid ${ACCESS_COLORS[acc.access_level]}33`
                  }}>
                    <div>
                      <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14 }}>{acc.activity_name}</span>
                      <span style={{ color: '#64748b', fontSize: 12, marginRight: 8 }}>← {acc.department_name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Badge
                        label={ACCESS_LABELS[acc.access_level] || acc.access_level}
                        bg={`${ACCESS_COLORS[acc.access_level]}22`}
                        color={ACCESS_COLORS[acc.access_level]}
                      />
                      <Btn onClick={() => removeAccess(acc.id)} disabled={removingId === acc.id} color="#ef4444" small>
                        {removingId === acc.id ? '…' : 'حذف'}
                      </Btn>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: '#151c2850', border: '1px dashed #2d3748', borderRadius: 10, padding: '16px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 12 }}>إضافة / تعديل صلاحية</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <Field label="النشاط" required>
                <select style={inputStyle} value={accessForm.activity} onChange={e => setAccessForm({ ...accessForm, activity: e.target.value })}>
                  <option value="">— اختر نشاطاً —</option>
                  {Object.entries(activityGroups).map(([dept, acts]) => (
                    <optgroup key={dept} label={dept}>
                      {acts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </optgroup>
                  ))}
                </select>
              </Field>
              <Field label="مستوى الصلاحية" required>
                <select style={inputStyle} value={accessForm.access_level} onChange={e => setAccessForm({ ...accessForm, access_level: e.target.value })}>
                  <option value="viewer">قارئ — عرض فقط</option>
                  <option value="editor">محرر — إضافة وتعديل</option>
                  <option value="manager">مدير — تحكم كامل</option>
                </select>
              </Field>
            </div>
            <Btn onClick={addAccess} disabled={saving} color="#6366f1">{saving ? 'جارٍ الحفظ…' : '+ إضافة الصلاحية'}</Btn>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: USERS — full management
// ══════════════════════════════════════════════════════════════════════════════
function UsersTab({ notify }) {
  const [users, setUsers]         = useState([])
  const [persons, setPersons]     = useState([])
  const [activities, setActivities] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [managing, setManaging]   = useState(null)   // user being managed
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [saving, setSaving]       = useState(false)
  const [err, setErr]             = useState('')

  const [createForm, setCreateForm] = useState({
    username: '', password: '', is_active: true,
  })

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [u, p, a] = await Promise.all([
        client.get('/users/'),
        client.get('/persons/'),
        client.get('/activities/'),
      ])
      setUsers(unwrap(u))
      setPersons(unwrap(p))
      setActivities(unwrap(a))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function createUser() {
    if (!createForm.username || !createForm.password) { setErr('اسم المستخدم وكلمة المرور مطلوبان'); return }
    setSaving(true); setErr('')
    try {
      await client.post('/users/', createForm)
      setShowCreate(false)
      setCreateForm({ username: '', password: '', is_active: true })
      fetchAll()
      notify('تم إنشاء المستخدم بنجاح.', 'success')
    } catch (e) { setErr(JSON.stringify(e.response?.data || 'خطأ')) }
    finally { setSaving(false) }
  }

  async function deleteUser(id) {
    try {
      await client.delete(`/users/${id}/`)
      fetchAll()
      notify('تم حذف المستخدم.', 'success')
    } catch { notify('حدث خطأ أثناء الحذف.', 'error') }
    setDeleteConfirm(null)
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return !q || u.username?.toLowerCase().includes(q) ||
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(q)
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader
        title="المستخدمون"
        count={users.length}
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            <input style={{ ...inputStyle, width: 200 }} placeholder="بحث…" value={search} onChange={e => setSearch(e.target.value)} />
            <Btn onClick={() => { setShowCreate(true); setErr('') }} color="#6366f1">+ مستخدم جديد</Btn>
          </div>
        }
      />

      <Card>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>جارٍ التحميل…</div>
        ) : (
          <Table
            head={['الحالة','المستخدم', 'الشخص المرتبط', 'الصلاحيات', 'الحالة', '']}
            empty="لا يوجد مستخدمون. أضف أول مستخدم."
            rows={filtered.map(u => [
              <strong style={{ color: '#f1f5f9' }}>{u.username}</strong>,
              u.is_online
                 ? <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981', fontSize: 12, fontWeight: 600 }}>
                     <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                     متصل
                   </span>
                 : <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 12 }}>
                     <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#475569', display: 'inline-block' }} />
                     غير متصل
                   </span>,
              u.profile?.person_name
                ? <span style={{ color: '#10b981', fontSize: 12 }}>✔ {u.profile.person_name}</span>
                : <span style={{ color: '#f59e0b', fontSize: 12 }}>⚠ غير مرتبط</span>,
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {(u.activity_accesses || []).length === 0
                  ? <span style={{ color: '#4b5563', fontSize: 11 }}>لا صلاحيات</span>
                  : (u.activity_accesses || []).map(acc => (
                    <Badge
                      key={acc.id}
                      label={`${acc.activity_name} (${ACCESS_LABELS[acc.access_level]})`}
                      bg={`${ACCESS_COLORS[acc.access_level]}22`}
                      color={ACCESS_COLORS[acc.access_level]}
                    />
                  ))
                }
              </div>,
              u.is_active
                ? <Badge label="مفعّل" bg="#10b98122" color="#10b981" />
                : <Badge label="معطّل" bg="#ef444422" color="#ef4444" />,
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <Btn onClick={() => setManaging(u)} color="#6366f1" small>إدارة</Btn>
                <Btn onClick={() => setDeleteConfirm(u)} color="#ef4444" small outline>حذف</Btn>
              </div>
            ])}
          />
        )}
      </Card>

      {showCreate && (
        <Modal title="إنشاء مستخدم جديد" onClose={() => setShowCreate(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="اسم المستخدم" required>
              <input style={inputStyle} value={createForm.username} onChange={e => setCreateForm({ ...createForm, username: e.target.value })} />
            </Field>
            <Field label="كلمة المرور" required>
              <input type="password" style={inputStyle} value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} />
            </Field>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={createForm.is_active} onChange={e => setCreateForm({ ...createForm, is_active: e.target.checked })} />
              الحساب مفعّل
            </label>
            {err && <div style={{ color: '#ef4444', fontSize: 13, background: '#ef444415', padding: '8px 12px', borderRadius: 8 }}>{err}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn onClick={() => setShowCreate(false)} outline color="#64748b">إلغاء</Btn>
              <Btn onClick={createUser} disabled={saving} color="#6366f1">{saving ? 'جارٍ الإنشاء…' : 'إنشاء المستخدم'}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Manage user modal */}
      {managing && (
        <UserManageModal
          user={managing}
          activities={activities}
          persons={persons}
          onClose={() => setManaging(null)}
          onSaved={fetchAll}
          notify={notify}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <Modal title="تأكيد الحذف" onClose={() => setDeleteConfirm(null)}>
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <p style={{ color: '#f1f5f9', fontSize: 15, marginBottom: 6 }}>
              هل تريد حذف المستخدم <strong>"{deleteConfirm.username}"</strong>؟
            </p>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>لا يمكن التراجع عن هذا الإجراء.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <Btn onClick={() => setDeleteConfirm(null)} outline color="#64748b">إلغاء</Btn>
              <Btn onClick={() => deleteUser(deleteConfirm.id)} color="#ef4444">حذف</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: DEPARTMENTS
// ══════════════════════════════════════════════════════════════════════════════
function DepartmentsTab({ notify }) {
  const [depts, setDepts] = useState([])
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [editingDept, setEditingDept] = useState(null)
  const [editingAct, setEditingAct] = useState(null)
  const [selectedDept, setSelectedDept] = useState(null)
  const [dForm, setDForm] = useState({ name: '', description: '' })
  const [aForm, setAForm] = useState({ name: '', description: '', department: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [search, setSearch] = useState('')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [d, a] = await Promise.all([client.get('/departments/'), client.get('/activities/')])
      setDepts(unwrap(d)); setActivities(unwrap(a))
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  function openAddDept() { setEditingDept(null); setDForm({ name: '', description: '' }); setErr(''); setModal('dept') }
  function openEditDept(d) { setEditingDept(d); setDForm({ name: d.name, description: d.description || '' }); setErr(''); setModal('dept') }
  async function saveDept() {
    if (!dForm.name.trim()) { setErr('اسم القسم مطلوب'); return }
    setSaving(true); setErr('')
    try {
      if (editingDept) await client.put(`/departments/${editingDept.id}/`, dForm)
      else await client.post('/departments/', dForm)
      setModal(null); fetchAll()
      notify(editingDept ? 'تم تحديث القسم.' : 'تم إضافة القسم.', 'success')
    } catch (e) { setErr(JSON.stringify(e.response?.data || 'خطأ')) }
    finally { setSaving(false) }
  }
  async function deleteDept(id) {
    try { await client.delete(`/departments/${id}/`); fetchAll(); notify('تم حذف القسم.', 'success') }
    catch { notify('لا يمكن الحذف: يوجد أنشطة أو أعضاء مرتبطون بهذا القسم.', 'error') }
    setDeleteConfirm(null)
  }

  function openAddAct(dept) { setEditingAct(null); setAForm({ name: '', description: '', department: dept.id }); setErr(''); setSelectedDept(dept); setModal('act') }
  function openEditAct(a) { setEditingAct(a); setAForm({ name: a.name, description: a.description || '', department: a.department }); setErr(''); setModal('act') }
  async function saveAct() {
    if (!aForm.name.trim()) { setErr('اسم النشاط مطلوب'); return }
    setSaving(true); setErr('')
    try {
      if (editingAct) await client.put(`/activities/${editingAct.id}/`, aForm)
      else await client.post('/activities/', aForm)
      setModal(null); fetchAll()
      notify(editingAct ? 'تم تحديث النشاط.' : 'تم إضافة النشاط.', 'success')
    } catch (e) { setErr(JSON.stringify(e.response?.data || 'خطأ')) }
    finally { setSaving(false) }
  }
  async function deleteAct(id) {
    try { await client.delete(`/activities/${id}/`); fetchAll(); notify('تم حذف النشاط.', 'success') }
    catch { notify('لا يمكن الحذف: يوجد صلاحيات مرتبطة بهذا النشاط.', 'error') }
    setDeleteConfirm(null)
  }

  const filteredDepts = depts.filter(d => !search || d.name?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader
        title="الأقسام والأنشطة"
        count={depts.length}
        action={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input style={{ ...inputStyle, width: 180 }} placeholder="بحث عن قسم…" value={search} onChange={e => setSearch(e.target.value)} />
            <Btn onClick={openAddDept} color="#6366f1">+ إضافة قسم</Btn>
          </div>
        }
      />

      {loading ? (
        <div style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>جارٍ التحميل…</div>
      ) : filteredDepts.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>لا توجد أقسام. أضف أول قسم.</div>
      ) : (
        filteredDepts.map(dept => {
          const deptActivities = activities.filter(a => a.department === dept.id)
          return (
            <Card key={dept.id}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #2d3748', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#151c28' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: '#6366f122', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round">
                      <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15 }}>{dept.name}</div>
                    {dept.description && <div style={{ color: '#64748b', fontSize: 12 }}>{dept.description}</div>}
                  </div>
                  <Badge label={`${deptActivities.length} نشاط`} bg="#6366f122" color="#a5b4fc" />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn onClick={() => openAddAct(dept)} color="#10b981" small>+ نشاط</Btn>
                  <Btn onClick={() => openEditDept(dept)} color="#334155" small outline>تعديل</Btn>
                  <Btn onClick={() => setDeleteConfirm({ type: 'dept', id: dept.id, name: dept.name })} color="#ef4444" small outline>حذف</Btn>
                </div>
              </div>
              {deptActivities.length === 0 ? (
                <div style={{ padding: '20px', color: '#4b5563', fontSize: 13, textAlign: 'center' }}>
                  لا توجد أنشطة —{' '}
                  <button onClick={() => openAddAct(dept)} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>أضف نشاطاً</button>
                </div>
              ) : (
                <Table
                  head={['اسم النشاط', 'الوصف', '']}
                  rows={deptActivities.map(a => [
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', flexShrink: 0 }} />
                      <strong style={{ color: '#e2e8f0' }}>{a.name}</strong>
                    </div>,
                    <span style={{ color: '#64748b', fontSize: 12 }}>{a.description || '—'}</span>,
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <Btn onClick={() => openEditAct(a)} color="#334155" small outline>تعديل</Btn>
                      <Btn onClick={() => setDeleteConfirm({ type: 'act', id: a.id, name: a.name })} color="#ef4444" small outline>حذف</Btn>
                    </div>
                  ])}
                />
              )}
            </Card>
          )
        })
      )}

      {modal === 'dept' && (
        <Modal title={editingDept ? 'تعديل القسم' : 'إضافة قسم جديد'} onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="اسم القسم" required>
              <input style={inputStyle} value={dForm.name} onChange={e => setDForm({ ...dForm, name: e.target.value })} />
            </Field>
            <Field label="الوصف">
              <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} value={dForm.description} onChange={e => setDForm({ ...dForm, description: e.target.value })} />
            </Field>
            {err && <div style={{ color: '#ef4444', fontSize: 13 }}>{err}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Btn onClick={() => setModal(null)} outline color="#64748b">إلغاء</Btn>
              <Btn onClick={saveDept} disabled={saving} color="#6366f1">{saving ? 'جارٍ الحفظ…' : editingDept ? 'تحديث' : 'إضافة'}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {modal === 'act' && (
        <Modal title={editingAct ? 'تعديل النشاط' : 'إضافة نشاط جديد'} onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="اسم النشاط" required>
              <input style={inputStyle} value={aForm.name} onChange={e => setAForm({ ...aForm, name: e.target.value })} />
            </Field>
            <Field label="الوصف">
              <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} value={aForm.description} onChange={e => setAForm({ ...aForm, description: e.target.value })} />
            </Field>
            {err && <div style={{ color: '#ef4444', fontSize: 13 }}>{err}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Btn onClick={() => setModal(null)} outline color="#64748b">إلغاء</Btn>
              <Btn onClick={saveAct} disabled={saving} color="#6366f1">{saving ? 'جارٍ الحفظ…' : editingAct ? 'تحديث' : 'إضافة'}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {deleteConfirm && (
        <Modal title="تأكيد الحذف" onClose={() => setDeleteConfirm(null)}>
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <p style={{ color: '#f1f5f9', fontSize: 15, marginBottom: 6 }}>هل تريد حذف <strong>"{deleteConfirm.name}"</strong>؟</p>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>لا يمكن التراجع عن هذا الإجراء.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <Btn onClick={() => setDeleteConfirm(null)} outline color="#64748b">إلغاء</Btn>
              <Btn onClick={() => deleteConfirm.type === 'dept' ? deleteDept(deleteConfirm.id) : deleteAct(deleteConfirm.id)} color="#ef4444">حذف</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: MEMBERS
// ══════════════════════════════════════════════════════════════════════════════
function MembersTab({ notify }) {
  const [members, setMembers]   = useState([])
  const [officeMembers, setOfficeMembers] = useState([])
  const [persons, setPersons]   = useState([])
  const [depts, setDepts]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [section, setSection]   = useState('department')
  const [search, setSearch]     = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [filterMandate, setFilterMandate] = useState('')
  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState({ person: '', department: '', role: '', join_date: '' })
  const [officeForm, setOfficeForm] = useState({ person: '', role: '', mandate: '' })
  const [saving, setSaving]     = useState(false)
  const [err, setErr]           = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const personMap = useMemo(() => Object.fromEntries(persons.map(p => [p.id, p])), [persons])
  const deptMap   = useMemo(() => Object.fromEntries(depts.map(d => [d.id, d])), [depts])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [m, om, p, d] = await Promise.all([
        client.get('/members/'),
        client.get('/office-members/'),
        client.get('/persons/'),
        client.get('/departments/'),
      ])
      setMembers(unwrap(m))
      setOfficeMembers(unwrap(om))
      setPersons(unwrap(p))
      setDepts(unwrap(d))
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  function openAddDepartment() {
    setEditing(null)
    setForm({ person: '', department: '', role: '', join_date: '' })
    setErr('')
    setModal(true)
  }

  function openEditDepartment(m) {
    setEditing(m)
    setForm({ person: String(m.person), department: String(m.department), role: m.role, join_date: m.join_date })
    setErr('')
    setModal(true)
  }

  function openAddOffice() {
    setEditing(null)
    setOfficeForm({ person: '', role: '', mandate: '' })
    setErr('')
    setModal(true)
  }

  function openEditOffice(m) {
    setEditing(m)
    setOfficeForm({ person: String(m.person), role: m.role || '', mandate: m.mandate || '' })
    setErr('')
    setModal(true)
  }

  async function saveDepartmentMember() {
    if (!form.person || !form.department || !form.role || !form.join_date) { setErr('جميع الحقول مطلوبة'); return }
    setSaving(true); setErr('')
    try {
      const payload = { person: +form.person, department: +form.department, role: form.role, join_date: form.join_date }
      if (editing) await client.put(`/members/${editing.id}/`, payload)
      else await client.post('/members/', payload)
      setModal(false)
      fetchAll()
      notify(editing ? 'تم تحديث العضو.' : 'تم إضافة العضو.', 'success')
    } catch (e) { setErr(JSON.stringify(e.response?.data || 'خطأ')) }
    finally { setSaving(false) }
  }

  async function saveOfficeMember() {
    if (!officeForm.person || !officeForm.role || !officeForm.mandate) { setErr('الشخص والدور والعهدة مطلوبة'); return }
    setSaving(true); setErr('')
    try {
      const payload = { person: +officeForm.person, role: officeForm.role, mandate: officeForm.mandate }
      if (editing) await client.put(`/office-members/${editing.id}/`, payload)
      else await client.post('/office-members/', payload)
      setModal(false)
      fetchAll()
      notify(editing ? 'تم تحديث عضو المكتب.' : 'تم إضافة عضو المكتب.', 'success')
    } catch (e) { setErr(JSON.stringify(e.response?.data || 'خطأ')) }
    finally { setSaving(false) }
  }

  async function deleteDepartmentMember(id) {
    try {
      await client.delete(`/members/${id}/`)
      fetchAll()
      notify('تم حذف العضو.', 'success')
    } catch {
      notify('حدث خطأ أثناء الحذف.', 'error')
    }
    setDeleteConfirm(null)
  }

  async function deleteOfficeMember(id) {
    try {
      await client.delete(`/office-members/${id}/`)
      fetchAll()
      notify('تم حذف عضو المكتب.', 'success')
    } catch {
      notify('حدث خطأ أثناء الحذف.', 'error')
    }
    setDeleteConfirm(null)
  }

  const filteredMembers = members.filter(m => {
    const p = personMap[m.person]
    const q = search.toLowerCase()
    const nameMatch = !q || (p && `${p.first_name} ${p.last_name}`.toLowerCase().includes(q)) || m.role?.toLowerCase().includes(q)
    const deptMatch = !filterDept || String(m.department) === filterDept
    return nameMatch && deptMatch
  })

  const filteredOfficeMembers = officeMembers.filter(m => {
    const p = personMap[m.person]
    const q = search.toLowerCase()
    const nameMatch = !q || (p && `${p.first_name} ${p.last_name}`.toLowerCase().includes(q)) || (m.role || '').toLowerCase().includes(q) || (m.mandate || '').toLowerCase().includes(q)
    const mandateMatch = !filterMandate || (m.mandate || '') === filterMandate
    return nameMatch && mandateMatch
  })

  const availableDepartmentPersons = persons.filter(p => !members.some(m => m.person === p.id && m.id !== editing?.id))
  const mandateOptions = useMemo(
    () => Array.from(new Set(officeMembers.map(m => m.mandate).filter(Boolean))),
    [officeMembers]
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #2d3748', paddingBottom: 10 }}>
        <button
          onClick={() => { setSection('department'); setSearch(''); setErr('') }}
          style={{
            background: section === 'department' ? '#6366f122' : 'transparent',
            color: section === 'department' ? '#a5b4fc' : '#94a3b8',
            border: '1px solid #2d3748', borderRadius: 8, padding: '7px 12px', cursor: 'pointer',
          }}
        >
          أعضاء الأقسام
        </button>
        <button
          onClick={() => { setSection('office'); setSearch(''); setErr('') }}
          style={{
            background: section === 'office' ? '#6366f122' : 'transparent',
            color: section === 'office' ? '#a5b4fc' : '#94a3b8',
            border: '1px solid #2d3748', borderRadius: 8, padding: '7px 12px', cursor: 'pointer',
          }}
        >
          أعضاء المكتب
        </button>
      </div>

      {section === 'department' && (
        <>
          <SectionHeader
            title="أعضاء الأقسام"
            count={members.length}
            action={
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <input style={{ ...inputStyle, width: 180 }} placeholder="بحث…" value={search} onChange={e => setSearch(e.target.value)} />
                <select style={{ ...inputStyle, width: 160 }} value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                  <option value="">كل الأقسام</option>
                  {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <Btn onClick={openAddDepartment} color="#6366f1">+ إضافة عضو</Btn>
              </div>
            }
          />

          <Card>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>جارٍ التحميل…</div>
            ) : (
              <Table
                head={['الاسم', 'القسم', 'الدور', 'تاريخ الانضمام', 'الهاتف', '']}
                empty="لا يوجد أعضاء."
                rows={filteredMembers.map(m => {
                  const p = personMap[m.person]; const d = deptMap[m.department]
                  return [
                    <div>
                      <strong style={{ color: '#f1f5f9' }}>{p ? `${p.first_name} ${p.last_name}` : `#${m.person}`}</strong>
                      {p?.nin && <div style={{ color: '#4b5563', fontSize: 11 }}>{p.nin}</div>}
                    </div>,
                    <Badge label={d?.name || '—'} bg="#6366f122" color="#a5b4fc" />,
                    <span style={{ color: '#94a3b8' }}>{m.role}</span>,
                    <span style={{ color: '#64748b', fontSize: 12 }}>{m.join_date}</span>,
                    <span style={{ color: '#64748b', fontSize: 12 }}>{p?.phone || '—'}</span>,
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <Btn onClick={() => openEditDepartment(m)} color="#6366f1" small outline>تعديل</Btn>
                      <Btn onClick={() => setDeleteConfirm({ ...m, kind: 'department' })} color="#ef4444" small outline>حذف</Btn>
                    </div>
                  ]
                })}
              />
            )}
          </Card>
        </>
      )}

      {section === 'office' && (
        <>
          <SectionHeader
            title="أعضاء المكتب"
            count={officeMembers.length}
            action={
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <input style={{ ...inputStyle, width: 180 }} placeholder="بحث…" value={search} onChange={e => setSearch(e.target.value)} />
                <select style={{ ...inputStyle, width: 170 }} value={filterMandate} onChange={e => setFilterMandate(e.target.value)}>
                  <option value="">كل العهدات</option>
                  {mandateOptions.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <Btn onClick={openAddOffice} color="#0ea5e9">+ إضافة عضو مكتب</Btn>
              </div>
            }
          />

          <Card>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>جارٍ التحميل…</div>
            ) : (
              <Table
                head={['الاسم', 'الدور', 'العهدة', 'الهاتف', '']}
                empty="لا يوجد أعضاء مكتب."
                rows={filteredOfficeMembers.map(m => {
                  const p = personMap[m.person]
                  return [
                    <div>
                      <strong style={{ color: '#f1f5f9' }}>{p ? `${p.first_name} ${p.last_name}` : `#${m.person}`}</strong>
                      {p?.nin && <div style={{ color: '#4b5563', fontSize: 11 }}>{p.nin}</div>}
                    </div>,
                    <span style={{ color: '#94a3b8' }}>{m.role || '—'}</span>,
                    <Badge label={m.mandate || '—'} bg="#0ea5e922" color="#67e8f9" />,
                    <span style={{ color: '#64748b', fontSize: 12 }}>{p?.phone || '—'}</span>,
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <Btn onClick={() => openEditOffice(m)} color="#0ea5e9" small outline>تعديل</Btn>
                      <Btn onClick={() => setDeleteConfirm({ ...m, kind: 'office' })} color="#ef4444" small outline>حذف</Btn>
                    </div>
                  ]
                })}
              />
            )}
          </Card>
        </>
      )}

      {modal && section === 'department' && (
        <Modal title={editing ? 'تعديل عضو' : 'إضافة عضو جديد'} onClose={() => setModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="الشخص" required>
              {editing ? (
                <div style={{ ...inputStyle, background: 'linear-gradient(180deg, rgba(15,20,32,0.98) 0%, rgba(21,28,40,0.98) 100%)', color: '#f1f5f9', cursor: 'not-allowed', borderColor: '#334155', padding: '11px 12px' }}>
                  {(() => {
                    const p = personMap[form.person]
                    return p ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, textAlign: 'right' }}>
                        <span style={{ fontWeight: 700, color: '#f8fafc' }}>{`${p.first_name} ${p.last_name}`}</span>
                        <span style={{ color: '#94a3b8', fontSize: 12 }}>{p.nin ? `NIN: ${p.nin}` : p.phone || 'تم اختيار الشخص'}</span>
                      </div>
                    ) : '—'
                  })()}
                </div>
              ) : (
                <PersonSearchSelect
                  persons={availableDepartmentPersons}
                  value={form.person}
                  onChange={v => setForm({ ...form, person: v })}
                />
              )}
            </Field>
            <Field label="القسم" required>
              <select style={inputStyle} value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
                <option value="">— اختر قسماً —</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="الدور" required>
              <input style={inputStyle} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} placeholder="مثال: صيدلي، منسق" />
            </Field>
            <Field label="تاريخ الانضمام" required>
              <input type="date" style={inputStyle} value={form.join_date} onChange={e => setForm({ ...form, join_date: e.target.value })} />
            </Field>
            {err && <div style={{ color: '#ef4444', fontSize: 13 }}>{err}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Btn onClick={() => setModal(false)} outline color="#64748b">إلغاء</Btn>
              <Btn onClick={saveDepartmentMember} disabled={saving} color="#6366f1">{saving ? 'جارٍ الحفظ…' : editing ? 'تحديث' : 'إضافة'}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {modal && section === 'office' && (
        <Modal title={editing ? 'تعديل عضو مكتب' : 'إضافة عضو مكتب'} onClose={() => setModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="الشخص" required>
              {editing ? (
                <div style={{ ...inputStyle, background: 'linear-gradient(180deg, rgba(15,20,32,0.98) 0%, rgba(21,28,40,0.98) 100%)', color: '#f1f5f9', cursor: 'not-allowed', borderColor: '#334155', padding: '11px 12px' }}>
                  {(() => {
                    const p = personMap[officeForm.person]
                    return p ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, textAlign: 'right' }}>
                        <span style={{ fontWeight: 700, color: '#f8fafc' }}>{`${p.first_name} ${p.last_name}`}</span>
                        <span style={{ color: '#94a3b8', fontSize: 12 }}>{p.nin ? `NIN: ${p.nin}` : p.phone || 'تم اختيار الشخص'}</span>
                      </div>
                    ) : '—'
                  })()}
                </div>
              ) : (
                <PersonSearchSelect
                  persons={persons}
                  value={officeForm.person}
                  onChange={v => setOfficeForm({ ...officeForm, person: v })}
                />
              )}
            </Field>
            <Field label="الدور" required>
              <input style={inputStyle} value={officeForm.role} onChange={e => setOfficeForm({ ...officeForm, role: e.target.value })} placeholder="مثال: رئيس، نائب رئيس" />
            </Field>
            <Field label="العهدة" required>
              <input style={inputStyle} value={officeForm.mandate} onChange={e => setOfficeForm({ ...officeForm, mandate: e.target.value })} placeholder="مثال: 2023-2025" />
            </Field>
            {err && <div style={{ color: '#ef4444', fontSize: 13 }}>{err}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Btn onClick={() => setModal(false)} outline color="#64748b">إلغاء</Btn>
              <Btn onClick={saveOfficeMember} disabled={saving} color="#0ea5e9">{saving ? 'جارٍ الحفظ…' : editing ? 'تحديث' : 'إضافة'}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {deleteConfirm && (
        <Modal title="تأكيد الحذف" onClose={() => setDeleteConfirm(null)}>
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <p style={{ color: '#f1f5f9', marginBottom: 24 }}>
              حذف العضو <strong>{personMap[deleteConfirm.person] ? `${personMap[deleteConfirm.person].first_name} ${personMap[deleteConfirm.person].last_name}` : `#${deleteConfirm.person}`}</strong>؟
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <Btn onClick={() => setDeleteConfirm(null)} outline color="#64748b">إلغاء</Btn>
              <Btn
                onClick={() => deleteConfirm.kind === 'office' ? deleteOfficeMember(deleteConfirm.id) : deleteDepartmentMember(deleteConfirm.id)}
                color="#ef4444"
              >
                حذف
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: OVERVIEW
// ══════════════════════════════════════════════════════════════════════════════
function OverviewTab() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '40vh', gap: 16,
    }}>
      <div style={{ fontSize: 40 }}>🚧</div>
      <p style={{ color: '#64748b', fontSize: 15 }}>لوحة التحكم قيد التطوير</p>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: PERSONS
// ══════════════════════════════════════════════════════════════════════════════
function PersonsTab({ notify }) {
  const [persons, setPersons]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [saving, setSaving]     = useState(false)
  const [err, setErr]           = useState('')
  const emptyForm = { first_name: '', last_name: '', nin: '', phone: '', address: '', date_of_birth: '', gender: 'M' }
  const [form, setForm]         = useState(emptyForm)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try { const r = await client.get('/persons/'); setPersons(unwrap(r)) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  function openAdd()   { setEditing(null); setForm(emptyForm); setErr(''); setModal(true) }
  function openEdit(p) { setEditing(p); setForm({ first_name: p.first_name, last_name: p.last_name, nin: p.nin, phone: p.phone, address: p.address, date_of_birth: p.date_of_birth, gender: p.gender }); setErr(''); setModal(true) }

  async function save() {
    if (!form.first_name || !form.last_name  || !form.date_of_birth || !form.address) { setErr('الاسم الأول، تاريخ الميلاد، الاسم الأخير، والعنوان مطلوبة'); return }
    setSaving(true); setErr('')
    const payload = {
    ...form,
    nin: form.nin.trim() || null,
    phone: form.phone.trim() || null,
    date_of_birth: form.date_of_birth || null,
  }
    try {
      if (editing) await client.put(`/persons/${editing.id}/`, payload)
      else await client.post('/persons/', payload)
      setModal(false); fetchAll()
      notify(editing ? 'تم تحديث الشخص.' : 'تمت إضافة الشخص.', 'success')
    } catch (e) { setErr(JSON.stringify(e.response?.data || 'خطأ')) }
    finally { setSaving(false) }
  }

  async function deletePerson(id) {
    try { await client.delete(`/persons/${id}/`); fetchAll(); notify('تم حذف الشخص.', 'success') }
    catch { notify('لا يمكن الحذف: يوجد بيانات مرتبطة بهذا الشخص.', 'error') }
    setDeleteConfirm(null)
  }

  const filtered = persons.filter(p => {
    const q = search.toLowerCase()
    return !q || `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) || p.nin?.includes(q) || p.phone?.includes(q)
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader
        title="الأشخاص"
        count={persons.length}
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            <input style={{ ...inputStyle, width: 200 }} placeholder="بحث بالاسم أو رقم التعريف…" value={search} onChange={e => setSearch(e.target.value)} />
            <Btn onClick={openAdd} color="#6366f1">+ إضافة شخص</Btn>
          </div>
        }
      />
      <Card>
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>جارٍ التحميل…</div> : (
          <Table
            head={['الاسم', 'رقم التعريف', 'الهاتف', 'تاريخ الميلاد', 'الجنس', '']}
            empty="لا يوجد أشخاص مسجلون."
            rows={filtered.map(p => [
              <strong style={{ color: '#f1f5f9' }}>{p.first_name} {p.last_name}</strong>,
              <span style={{ fontFamily: 'monospace', color: '#a5b4fc', fontSize: 12 }}>{p.nin}</span>,
              <span style={{ color: '#94a3b8' }}>{p.phone}</span>,
              <span style={{ color: '#64748b', fontSize: 12 }}>{p.date_of_birth}</span>,
              <Badge label={p.gender === 'M' ? 'ذكر' : 'أنثى'} bg="#33415566" color="#94a3b8" />,
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <Btn onClick={() => openEdit(p)} color="#6366f1" small outline>تعديل</Btn>
                <Btn onClick={() => setDeleteConfirm(p)} color="#ef4444" small outline>حذف</Btn>
              </div>
            ])}
          />
        )}
      </Card>

      {modal && (
        <Modal title={editing ? 'تعديل شخص' : 'إضافة شخص جديد'} onClose={() => setModal(false)} wide>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="الاسم الأول" required><input style={inputStyle} value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} /></Field>
            <Field label="الاسم الأخير" required><input style={inputStyle} value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} /></Field>
            <Field label="رقم التعريف (NIN)" ><input style={inputStyle} value={form.nin} onChange={e => setForm({ ...form, nin: e.target.value })}  /></Field>
            <Field label="رقم الهاتف" required><input style={inputStyle} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="تاريخ الميلاد" required><input type="date" style={inputStyle} value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} /></Field>
            <Field label="الجنس"><select style={inputStyle} value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}><option value="M">ذكر</option><option value="F">أنثى</option></select></Field>
            <div style={{ gridColumn: '1/-1' }}>
              <Field label="العنوان"><textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></Field>
            </div>
          </div>
          {err && <div style={{ color: '#ef4444', fontSize: 13, marginTop: 12 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
            <Btn onClick={() => setModal(false)} outline color="#64748b">إلغاء</Btn>
            <Btn onClick={save} disabled={saving} color="#6366f1">{saving ? 'جارٍ الحفظ…' : editing ? 'تحديث' : 'إضافة'}</Btn>
          </div>
        </Modal>
      )}

      {deleteConfirm && (
        <Modal title="تأكيد الحذف" onClose={() => setDeleteConfirm(null)}>
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <p style={{ color: '#f1f5f9', fontSize: 15, marginBottom: 24 }}>حذف <strong>{deleteConfirm.first_name} {deleteConfirm.last_name}</strong>؟</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <Btn onClick={() => setDeleteConfirm(null)} outline color="#64748b">إلغاء</Btn>
              <Btn onClick={() => deletePerson(deleteConfirm.id)} color="#ef4444">حذف</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT: AdminPage
// ══════════════════════════════════════════════════════════════════════════════
const TABS = [
  { id: 'overview',    label: 'نظرة عامة',  icon: '🏠' },
  { id: 'users',       label: 'المستخدمون', icon: '🔐' },
  { id: 'persons',     label: 'الأشخاص',    icon: '👥' },
  { id: 'departments', label: 'الأقسام',    icon: '🏢' },
  { id: 'members',     label: 'الأعضاء',    icon: '🤝' },
]

export default function AdminPage({ currentUser, onLogout }) {
  const [tab, setTab]     = useState('overview')
  const [toast, setToast] = useState(null)

  function notify(msg, type) { setToast({ msg, type }) }

  return (
    <div style={{ minHeight: '100vh', background: '#0f1420', fontFamily: 'system-ui, -apple-system, sans-serif' }} dir="rtl">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <header style={{
        background: '#1e2533', borderBottom: '1px solid #2d3748',
        padding: '0 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 60, position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={logo} alt="Logo" style={{ width: 32, height: 32, borderRadius: 6 }} />
          <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 16 }}>لوحة الإدارة</span>
          <Badge label="Superuser" bg="#6366f133" color="#a5b4fc" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#64748b', fontSize: 13 }}>{currentUser?.username}</span>
          <button onClick={onLogout} style={{ background: '#334155', border: 'none', borderRadius: 8, padding: '7px 14px', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>
            تسجيل الخروج
          </button>
        </div>
      </header>

      <div style={{ background: '#151c28', borderBottom: '1px solid #2d3748', padding: '0 24px', display: 'flex', gap: 4, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '14px 18px', fontSize: 14, fontWeight: 600,
            color: tab === t.id ? '#a5b4fc' : '#64748b',
            borderBottom: tab === t.id ? '2px solid #6366f1' : '2px solid transparent',
            display: 'flex', alignItems: 'center', gap: 8, transition: 'color .15s', whiteSpace: 'nowrap',
          }}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px' }}>
        {tab === 'overview'    && <OverviewTab />}
        {tab === 'users'       && <UsersTab notify={notify} />}
        {tab === 'persons'     && <PersonsTab notify={notify} />}
        {tab === 'departments' && <DepartmentsTab notify={notify} />}
        {tab === 'members'     && <MembersTab notify={notify} />}
      </div>
    </div>
  )
}