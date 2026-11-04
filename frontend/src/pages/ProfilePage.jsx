import { useEffect, useState, useCallback } from 'react'
import client from '../api/client'

const inputStyle = {
  background: '#151c28',
  border: '1px solid #2d3748',
  borderRadius: 8,
  color: '#f1f5f9',
  padding: '10px 13px',
  fontSize: 14,
  width: '100%',
  boxSizing: 'border-box',
  textAlign: 'right',
  outline: 'none',
}

const readonlyStyle = {
  ...inputStyle,
  color: '#94a3b8',
  cursor: 'default',
  background: '#0f1420',
  border: '1px solid #1e2533',
}

function Field({ label, hint, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', letterSpacing: '.4px' }}>
        {label}
      </label>
      {children}
      {hint && <span style={{ fontSize: 11, color: '#4b5563' }}>{hint}</span>}
    </div>
  )
}

function SectionCard({ title, icon, children }) {
  return (
    <div style={{
      background: '#1e2533',
      border: '1px solid #2d3748',
      borderRadius: 14,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 22px',
        borderBottom: '1px solid #2d3748',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: '#151c28',
      }}>
        <span style={{ fontSize: 17 }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9' }}>{title}</span>
      </div>
      <div style={{ padding: '22px' }}>{children}</div>
    </div>
  )
}

function Badge({ label, color, bg }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 12px',
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
      color: color || '#fff',
      background: bg || '#334155',
    }}>{label}</span>
  )
}

const ACCESS_LABELS = { viewer: 'قارئ', editor: 'محرر', manager: 'مدير' }
const ACCESS_COLORS = { viewer: '#6366f1', editor: '#f59e0b', manager: '#10b981' }
const GENDER_LABELS = { M: 'ذكر', F: 'أنثى' }

export default function ProfilePage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const [pwForm, setPwForm]     = useState({ old_password: '', password: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError]   = useState('')
  const [pwSuccess, setPwSuccess] = useState('')
  const [showOld, setShowOld]   = useState(false)
  const [showNew, setShowNew]   = useState(false)

  const fetchProfile = useCallback(() => {
    setLoading(true)
    client.get('/auth/me/')
      .then(r => setProfile(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  async function changePassword() {
    setPwError(''); setPwSuccess('')
    if (!pwForm.old_password || !pwForm.password || !pwForm.confirm) {
      setPwError('يرجى ملء جميع الحقول.'); return
    }
    if (pwForm.password !== pwForm.confirm) {
      setPwError('كلمة المرور الجديدة وتأكيدها غير متطابقتين.'); return
    }
    if (pwForm.password.length < 6) {
      setPwError('يجب أن تكون كلمة المرور الجديدة 6 أحرف على الأقل.'); return
    }
    setPwSaving(true)
    try {
      await client.patch('/auth/me/', {
        old_password: pwForm.old_password,
        password: pwForm.password,
      })
      setPwSuccess('✓ تم تغيير كلمة المرور بنجاح.')
      setPwForm({ old_password: '', password: '', confirm: '' })
      setTimeout(() => setPwSuccess(''), 4000)
    } catch (err) {
      const data = err.response?.data
      if (data?.old_password)      setPwError(Array.isArray(data.old_password) ? data.old_password[0] : data.old_password)
      else if (data?.password)     setPwError(Array.isArray(data.password) ? data.password[0] : data.password)
      else if (data?.detail)       setPwError(data.detail)
      else if (data?.non_field_errors) setPwError(data.non_field_errors[0])
      else setPwError('حدث خطأ غير متوقع.')
    } finally { setPwSaving(false) }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
      <div style={{ textAlign: 'center', color: '#64748b' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
        <div>جارٍ تحميل الملف الشخصي…</div>
      </div>
    </div>
  )

  if (!profile) return (
    <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b' }}>
      تعذّر تحميل بيانات الملف الشخصي.
    </div>
  )

  const person  = profile.person_detail
  const accesses = profile.activity_accesses || []

  return (
    <div dir="rtl" style={{
      maxWidth: 720,
      margin: '0 auto',
      padding: '28px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>

      {/* ── Header card ── */}
      <div style={{
        background: 'linear-gradient(135deg, #6366f115, #a855f715)',
        border: '1px solid #6366f130',
        borderRadius: 14,
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
      }}>
        <div style={{
          width: 54, height: 54, borderRadius: 14, flexShrink: 0,
          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
        }}>👤</div>
        <div style={{ minWidth: 0 }}>
          {/* Username — styled properly */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6,
          }}>
            <span style={{
              background: '#151c28',
              border: '1px solid #2d3748',
              borderRadius: 8,
              padding: '4px 14px',
              color: '#a5b4fc',
              fontFamily: 'monospace',
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: 0.5,
            }}>@{profile.username}</span>
            <Badge
              label={profile.is_superuser ? 'مدير النظام' : 'مستخدم'}
              bg={profile.is_superuser ? '#6366f133' : '#33415566'}
              color={profile.is_superuser ? '#a5b4fc' : '#94a3b8'}
            />
          </div>
          {/* Real name from person if linked, else from user fields */}
          <div style={{ color: '#64748b', fontSize: 13 }}>
            {person
              ? `${person.first_name} ${person.last_name}`
              : (profile.first_name || profile.last_name)
                ? `${profile.first_name} ${profile.last_name}`.trim()
                : 'لم يتم تحديد الاسم'}
          </div>
        </div>
      </div>

      {/* ── Linked person ── */}
      <SectionCard title="البيانات الشخصية" icon="👥">
        {person ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            <Field label="الاسم الأول">
              <input style={readonlyStyle} value={person.first_name} readOnly />
            </Field>
            <Field label="الاسم الأخير">
              <input style={readonlyStyle} value={person.last_name} readOnly />
            </Field>
            <Field label="رقم التعريف الوطني">
              <input style={{ ...readonlyStyle, fontFamily: 'monospace', letterSpacing: 1 }} value={person.nin} readOnly />
            </Field>
            <Field label="رقم الهاتف">
              <input style={readonlyStyle} value={person.phone} readOnly />
            </Field>
            <Field label="تاريخ الميلاد">
              <input style={readonlyStyle} value={person.date_of_birth} readOnly />
            </Field>
            <Field label="الجنس">
              <input style={readonlyStyle} value={GENDER_LABELS[person.gender] || person.gender} readOnly />
            </Field>
            {person.age !== undefined && (
              <Field label="العمر">
                <input style={readonlyStyle} value={`${person.age} سنة`} readOnly />
              </Field>
            )}
            {person.address && (
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="العنوان">
                  <textarea style={{ ...readonlyStyle, resize: 'none', minHeight: 56 }} value={person.address} readOnly rows={2} />
                </Field>
              </div>
            )}
          </div>
        ) : (
          <div style={{
            textAlign: 'center', padding: '28px',
            background: '#151c28', borderRadius: 10,
          }}>
            <div style={{ fontSize: 30, marginBottom: 10 }}>⚠️</div>
            <div style={{ color: '#f59e0b', fontWeight: 600, marginBottom: 6 }}>لم يتم ربط حسابك بشخص بعد</div>
            <div style={{ color: '#64748b', fontSize: 13 }}>تواصل مع مدير النظام لربط حسابك بسجل شخصي.</div>
          </div>
        )}
      </SectionCard>

      {/* ── Permissions ── */}
      {accesses.length > 0 && (
        <SectionCard title="الصلاحيات الممنوحة" icon="🔐">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {accesses.map(acc => (
              <div key={acc.id} style={{
                background: '#151c28', borderRadius: 10, padding: '12px 16px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                border: `1px solid ${ACCESS_COLORS[acc.access_level] || '#2d3748'}33`,
                flexWrap: 'wrap', gap: 8,
              }}>
                <div>
                  <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14 }}>{acc.activity_name}</span>
                  <span style={{ color: '#64748b', fontSize: 12, marginRight: 8 }}>← {acc.department_name}</span>
                </div>
                <Badge
                  label={ACCESS_LABELS[acc.access_level] || acc.access_level}
                  bg={`${ACCESS_COLORS[acc.access_level] || '#94a3b8'}22`}
                  color={ACCESS_COLORS[acc.access_level] || '#94a3b8'}
                />
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── Change password ── */}
      <SectionCard title="تغيير كلمة المرور" icon="🔒">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 380 }}>

          <Field label="كلمة المرور الحالية">
            <div style={{ position: 'relative' }}>
              <input
                type={showOld ? 'text' : 'password'}
                style={{ ...inputStyle, paddingLeft: 38 }}
                value={pwForm.old_password}
                onChange={e => setPwForm({ ...pwForm, old_password: e.target.value })}
                placeholder="أدخل كلمة مرورك الحالية"
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowOld(v => !v)} style={{
                position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', padding: 0, fontSize: 14,
              }}>{showOld ? '🙈' : '👁'}</button>
            </div>
          </Field>

          <Field label="كلمة المرور الجديدة" hint="6 أحرف على الأقل">
            <div style={{ position: 'relative' }}>
              <input
                type={showNew ? 'text' : 'password'}
                style={{ ...inputStyle, paddingLeft: 38 }}
                value={pwForm.password}
                onChange={e => setPwForm({ ...pwForm, password: e.target.value })}
                placeholder="كلمة المرور الجديدة"
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowNew(v => !v)} style={{
                position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', padding: 0, fontSize: 14,
              }}>{showNew ? '🙈' : '👁'}</button>
            </div>
          </Field>

          <Field label="تأكيد كلمة المرور الجديدة">
            <input
              type="password"
              style={inputStyle}
              value={pwForm.confirm}
              onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })}
              placeholder="أعد كتابة كلمة المرور الجديدة"
              autoComplete="new-password"
              onKeyDown={e => e.key === 'Enter' && changePassword()}
            />
          </Field>

          {pwError && (
            <div style={{
              background: '#ef444415', border: '1px solid #ef444440',
              borderRadius: 8, padding: '10px 14px', color: '#ef4444', fontSize: 13,
            }}>✗ {pwError}</div>
          )}
          {pwSuccess && (
            <div style={{
              background: '#10b98115', border: '1px solid #10b98140',
              borderRadius: 8, padding: '10px 14px', color: '#10b981', fontSize: 13,
            }}>{pwSuccess}</div>
          )}

          <button
            onClick={changePassword}
            disabled={pwSaving}
            style={{
              background: pwSaving ? '#334155' : 'linear-gradient(135deg, #6366f1, #a855f7)',
              border: 'none', borderRadius: 9, padding: '11px 24px',
              color: '#fff', fontWeight: 700, fontSize: 14,
              cursor: pwSaving ? 'not-allowed' : 'pointer',
              opacity: pwSaving ? 0.7 : 1, alignSelf: 'flex-start',
            }}
          >{pwSaving ? 'جارٍ الحفظ…' : 'تغيير كلمة المرور'}</button>
        </div>
      </SectionCard>

    </div>
  )
}