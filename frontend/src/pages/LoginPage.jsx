import { useState } from 'react'
import client from '../api/client'
import logo from '../assets/photo_2026-06-13_11-54-41.jpg'
export default function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!form.username.trim() || !form.password) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await client.post('/auth/login/', form)
      const { access, refresh, user } = res.data
      localStorage.setItem('access_token', access)
      localStorage.setItem('refresh_token', refresh)
      client.defaults.headers.common['Authorization'] = `Bearer ${access}`
      onLogin(user)
    } catch (e) {
      const data = e.response?.data

  if (data) {
    // Handle different error response shapes
    const detail = data.detail
      || data.non_field_errors?.[0]
      || data.username?.[0]
      || data.password?.[0]
      || data.message
      || JSON.stringify(data)

    setError(detail)
  } else if (e.request) {
    // Request was made but no response received (server down / network issue)
    setError('لا يمكن الاتصال بالخادم — تحقق من اتصالك بالإنترنت')
  } else {
    setError('حدث خطأ غير متوقع')
  }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f1420',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }} dir="rtl">

      {/* Background subtle grid */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle at 20% 50%, #6366f108 0%, transparent 60%), radial-gradient(circle at 80% 20%, #a855f708 0%, transparent 50%)',
      }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
        {/* Logo / Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{
            width: 80,
            height: 80,
            borderRadius: 16,
            overflow: 'hidden',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px #6366f130',
            background: '#1e2533',
            border: '1px solid #2d3748',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <img 
              src={logo} 
              alt="شعار الجمعية"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>
          <h1 style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 700, margin: '0 0 6px' }}>
            نظام إدارة الجمعية
          </h1>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            أدخل بيانات دخولك للمتابعة
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#1e2533',
          border: '1px solid #2d3748',
          borderRadius: 16,
          padding: '32px 28px',
        }}>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Username */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 8, letterSpacing: '.4px' }}>
                اسم المستخدم
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </span>
                <input
                  type="text"
                  autoComplete="username"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  placeholder="أدخل اسم المستخدم"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: '#151c28', border: '1px solid #2d3748',
                    borderRadius: 10, color: '#f1f5f9',
                    padding: '11px 40px 11px 14px', fontSize: 14,
                    outline: 'none', transition: 'border-color .15s',
                    textAlign: 'right',
                  }}
                  onFocus={e => e.target.style.borderColor = '#6366f1'}
                  onBlur={e => e.target.style.borderColor = '#2d3748'}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 8, letterSpacing: '.4px' }}>
                كلمة المرور
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="أدخل كلمة المرور"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: '#151c28', border: '1px solid #2d3748',
                    borderRadius: 10, color: '#f1f5f9',
                    padding: '11px 40px 11px 40px', fontSize: 14,
                    outline: 'none', transition: 'border-color .15s',
                    textAlign: 'right',
                  }}
                  onFocus={e => e.target.style.borderColor = '#6366f1'}
                  onBlur={e => e.target.style.borderColor = '#2d3748'}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', padding: 0,
                  }}
                >
                  {showPass ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: '#ef444415', border: '1px solid #ef444440',
                borderRadius: 8, padding: '10px 14px',
                color: '#ef4444', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px',
                background: loading ? '#4b5563' : 'linear-gradient(135deg, #6366f1, #a855f7)',
                border: 'none', borderRadius: 10,
                color: '#fff', fontWeight: 700, fontSize: 15,
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: 4, transition: 'opacity .15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {loading ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  جارٍ الدخول…
                </>
              ) : 'تسجيل الدخول'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', color: '#374151', fontSize: 12, marginTop: 24 }}>
          نظام إدارة الجمعية — جميع الحقوق محفوظة
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        input::placeholder { color: #374151; }
      `}</style>
    </div>
  )
}