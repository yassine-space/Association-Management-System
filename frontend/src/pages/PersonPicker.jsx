import { useState, useMemo, useRef, useEffect } from 'react'

/**
 * Shared searchable person picker used across dashboards (Admin, Pharmacy,
 * Warm Winter, Machine, Blood Donation, ...).
 *
 * Fully self-contained inline styling (no dependency on any page's local
 * CSS classes like .ww-input / .ph-input / .eq-input) so it looks the same
 * — dark surface, teal focus ring, hover-highlighted dropdown rows — no
 * matter which page imports it.
 */

const T = {
  bg: '#0b1014', surface: '#121821', surfaceAlt: '#161d27', border: '#1f2a36',
  teal: '#14b8a6', tealSoft: '#5eead4', cyan: '#38bdf8', amber: '#f59e0b',
  red: '#ef4444', emerald: '#10b981', text: '#eef2f6', textMute: '#8b98a8', textFaint: '#57667a',
}

const baseInputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  background: T.bg,
  border: `1px solid ${T.border}`,
  borderRadius: 10,
  color: T.text,
  padding: '9px 13px',
  fontSize: 13.5,
  outline: 'none',
  textAlign: 'right',
  fontFamily: 'inherit',
  transition: 'border-color .15s, box-shadow .15s',
}

function personLabel(p) {
  const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()
  return p.phone ? `${name} (${p.phone})` : name
}

export function PersonSearchSelect({ persons, value, onChange, placeholder = 'ابحث بالاسم أو الهاتف أو رقم التعريف…' }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = useMemo(
    () => persons.find(p => String(p.id) === String(value)) || null,
    [persons, value]
  )

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    const pool = q
      ? persons.filter(p => {
          const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.toLowerCase()
          const phone = (p.phone ?? '').toLowerCase()
          const nin = (p.nin ?? '').toLowerCase()
          return name.includes(q) || phone.includes(q) || nin.includes(q)
        })
      : persons
    return pool.slice(0, 30)
  }, [persons, query])

  function pick(p) {
    onChange(String(p.id))
    setQuery('')
    setOpen(false)
  }

  function clear(e) {
    e.stopPropagation()
    onChange('')
    setQuery('')
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative' }} ref={rootRef}>
      {selected && !open ? (
        <div
          onClick={() => setOpen(true)}
          style={{
            ...baseInputStyle,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer', gap: 8,
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {personLabel(selected)}
          </span>
          <span
            onClick={clear}
            title="إزالة الاختيار"
            style={{ color: T.textMute, cursor: 'pointer', fontSize: 17, lineHeight: 1, flexShrink: 0 }}
          >×</span>
        </div>
      ) : (
        <input
          autoFocus={open}
          style={{
            ...baseInputStyle,
            borderColor: focused ? T.teal : T.border,
            boxShadow: focused ? `0 0 0 3px ${T.teal}22` : 'none',
          }}
          placeholder={placeholder}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => { setOpen(true); setFocused(true) }}
          onBlur={() => setFocused(false)}
        />
      )}

      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', right: 0, left: 0, zIndex: 50,
            background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 10,
            maxHeight: 230, overflowY: 'auto', boxShadow: '0 12px 30px rgba(0,0,0,.5)',
          }}
        >
          {persons.length === 0 ? (
            <div style={{ padding: '12px 14px', fontSize: 12.5, color: T.textMute }}>لا يوجد أشخاص.</div>
          ) : matches.length === 0 ? (
            <div style={{ padding: '12px 14px', fontSize: 12.5, color: T.textMute }}>
              لا توجد نتائج{query ? ` لـ "${query}"` : ''}
            </div>
          ) : (
            matches.map(p => (
              <div
                key={p.id}
                onMouseDown={() => pick(p)}
                style={{
                  padding: '10px 14px', cursor: 'pointer', fontSize: 13.5,
                  color: T.text, borderBottom: `1px solid ${T.border}`,
                  transition: 'background .12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = T.surface)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div>{p.first_name} {p.last_name}</div>
                {(p.phone || p.nin) && (
                  <div style={{ fontSize: 11.5, color: T.textMute, marginTop: 2 }}>
                    {[p.phone, p.nin].filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// Default export kept for pages that do `import PersonPicker from './PersonPicker'`
export default PersonSearchSelect