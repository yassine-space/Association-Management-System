import { useEffect, useState, useMemo, useCallback } from 'react'
import client from '../api/client'

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  bg:         '#080d1a',
  surface:    '#0f1629',
  surfaceAlt: '#141d30',
  border:     '#1e2a42',
  borderHover:'#2a3a58',
  cyan:       '#06b6d4',
  cyan2:      '#0891b2',
  cyanDim:    'rgba(6,182,212,0.12)',
  amber:      '#f59e0b',
  emerald:    '#10b981',
  violet:     '#a855f7',
  rose:       '#f43f5e',
  text:       '#f1f5f9',
  textMute:   '#64748b',
  textFaint:  '#374151',
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const FORM_LABELS      = { tablet: 'أقراص', syrup: 'شراب', injection: 'حقن', cream: 'كريم', other: 'أخرى' }
const DONATION_LABELS  = { donation: 'تبرع', invoice: 'فاتورة', supply: 'توريد', other: 'أخرى' }
const FORM_COLORS      = { tablet: '#06b6d4', syrup: '#8b5cf6', injection: '#f59e0b', cream: '#10b981', other: '#64748b' }

const NAV = [
  { id: 'dashboard',     label: 'لوحة التحكم', icon: '⊞' },
  { id: 'drugs',         label: 'الأدوية',      icon: '⬡' },
  { id: 'stock',         label: 'المخزون',      icon: '▣' },
  { id: 'donations',     label: 'التبرعات',     icon: '↓' },
  { id: 'distributions', label: 'الصرف',        icon: '↗' },
]

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

function daysUntil(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000)
}

// Downloads the DrugDistribution report (Excel or PDF) for the given years/months
// through the authenticated API client (so the JWT header is sent — a plain
// window.open(url) would hit the API with no auth header and 401).
async function downloadReport({ years, months }, fmt, notify) {
  try {
    const p = new URLSearchParams()
    if (years?.length)  p.append('year', years.join(','))
    if (months?.length) p.append('month', months.join(','))
    p.append('export_format', fmt)
    const res = await client.get(`/distributions/report/?${p.toString()}`, { responseType: 'blob' })
    const mime = fmt === 'excel'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/pdf'
    const url = URL.createObjectURL(new Blob([res.data], { type: mime }))
    const a = document.createElement('a')
    a.href = url
    a.download = `distributions_report.${fmt === 'excel' ? 'xlsx' : 'pdf'}`
    a.click()
    notify?.('تم تصدير التقرير.', 'success')
  } catch {
    notify?.('فشل تصدير التقرير.', 'error')
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL STYLES  (scoped via .ph-root)
// ─────────────────────────────────────────────────────────────────────────────
function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500;600;700;800&display=swap');

      .ph-root {
        min-height: 100%;
        background: ${T.bg};
        color: ${T.text};
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        padding-bottom: 48px;
      }
      .ph-root * { box-sizing: border-box; }
      .ph-root :focus-visible { outline: 2px solid ${T.cyan}; outline-offset: 2px; }

      /* ── HEADER ── */
      .ph-header {
        position: relative;
        background: ${T.surface};
        border-bottom: 1px solid ${T.border};
      }
      .ph-header-inner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 20px 24px 14px;
        flex-wrap: wrap;
      }
      .ph-brand { display: flex; align-items: center; gap: 14px; }
      .ph-brand-mark {
        width: 50px;
        height: 50px;
        border-radius: 14px;
        background: ${T.surfaceAlt};
        border: 1px solid ${T.border};
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        position: relative;
        overflow: hidden;
      }
      .ph-brand-mark::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, ${T.cyanDim}, transparent);
      }
      .ph-title {
        font-family: 'DM Serif Display', Georgia, serif;
        font-size: 22px;
        font-weight: 400;
        color: ${T.text};
        margin: 0;
        letter-spacing: 0.3px;
      }
      .ph-subtitle { font-size: 12px; color: ${T.textMute}; margin-top: 3px; }
      .ph-header-stats { display: flex; gap: 10px; flex-wrap: wrap; }
      .ph-hstat {
        display: flex;
        align-items: center;
        gap: 10px;
        background: ${T.surfaceAlt};
        border: 1px solid ${T.border};
        border-radius: 11px;
        padding: 9px 14px;
      }
      .ph-hstat-val {
        font-family: 'DM Serif Display', Georgia, serif;
        font-size: 17px;
        color: ${T.text};
        line-height: 1;
      }
      .ph-hstat-lbl { font-size: 10px; color: ${T.textMute}; margin-top: 2px; }

      /* ── ANIMATED MOLECULE STRIP ── */
      .ph-mol-strip {
        height: 32px;
        width: 100%;
        overflow: hidden;
        background: ${T.bg};
        border-bottom: 1px solid ${T.border};
      }
      .ph-mol-svg { width: 100%; height: 32px; display: block; }
      .mol-chain { animation: mol-scroll 10s linear infinite; }
      @keyframes mol-scroll {
        from { transform: translateX(0); }
        to   { transform: translateX(-50%); }
      }
      @media (prefers-reduced-motion: reduce) {
        .mol-chain { animation: none; }
      }

      /* ── TABS ── */
      .ph-tabs {
        display: flex;
        gap: 5px;
        padding: 10px 20px;
        overflow-x: auto;
        scrollbar-width: none;
        background: ${T.surface};
        border-bottom: 1px solid ${T.border};
      }
      .ph-tabs::-webkit-scrollbar { display: none; }
      .ph-tab {
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 9px 16px;
        border-radius: 10px;
        border: 1px solid transparent;
        background: transparent;
        color: ${T.textMute};
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.18s;
        font-family: inherit;
        position: relative;
      }
      .ph-tab:hover { background: ${T.surfaceAlt}; color: ${T.text}; }
      .ph-tab--active {
        background: ${T.surfaceAlt};
        color: ${T.cyan};
        border-color: ${T.border};
        box-shadow: inset 0 -2px 0 ${T.cyan};
      }
      .ph-tab-badge {
        background: ${T.rose};
        color: #fff;
        border-radius: 20px;
        font-size: 10px;
        font-weight: 700;
        padding: 1px 6px;
        min-width: 18px;
        text-align: center;
      }

      /* ── CONTENT ── */
      .ph-content { padding: 20px 22px; display: flex; flex-direction: column; gap: 18px; }

      /* ── STAT CARDS ── */
      .ph-stats { display: flex; gap: 12px; flex-wrap: wrap; }
      .ph-stat {
        flex: 1;
        min-width: 140px;
        background: ${T.surface};
        border: 1px solid ${T.border};
        border-radius: 14px;
        padding: 16px 18px;
        position: relative;
        overflow: hidden;
        transition: border-color 0.2s, transform 0.15s;
        cursor: default;
      }
      .ph-stat:hover { border-color: ${T.cyan2}; transform: translateY(-2px); }
      .ph-stat-accent {
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 2px;
        border-radius: 14px 14px 0 0;
      }
      .ph-stat-icon {
        width: 38px;
        height: 38px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 12px;
        font-size: 18px;
      }
      .ph-stat-val {
        font-family: 'DM Serif Display', Georgia, serif;
        font-size: 28px;
        font-weight: 400;
        color: ${T.text};
        line-height: 1;
      }
      .ph-stat-lbl { font-size: 11.5px; color: ${T.textMute}; margin-top: 5px; }

      /* ── HIGHLIGHT / ALERT BOXES ── */
      .ph-highlight-row { display: flex; gap: 12px; flex-wrap: wrap; }
      .ph-highlight {
        flex: 1;
        min-width: 200px;
        background: ${T.surface};
        border: 1px solid ${T.border};
        border-radius: 16px;
        padding: 28px 22px;
        text-align: center;
      }
      .ph-highlight-val {
        font-family: 'DM Serif Display', Georgia, serif;
        font-size: 52px;
        color: ${T.cyan};
        line-height: 1;
      }
      .ph-highlight-lbl { font-size: 13px; color: ${T.textMute}; margin-top: 8px; }
      .ph-alert {
        flex: 2;
        min-width: 240px;
        border-radius: 16px;
        padding: 18px 20px;
        border: 1px solid;
      }
      .ph-alert--amber {
        background: rgba(245,158,11,0.06);
        border-color: rgba(245,158,11,0.25);
      }
      .ph-alert--rose {
        background: rgba(244,63,94,0.06);
        border-color: rgba(244,63,94,0.22);
      }
      .ph-alert--violet {
        background: rgba(168,85,247,0.06);
        border-color: rgba(168,85,247,0.25);
      }
      .ph-alert-title {
        font-size: 14px;
        font-weight: 700;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .ph-chip {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        border-radius: 20px;
        padding: 3px 10px;
        font-size: 11.5px;
        margin: 3px;
      }
      .ph-chip--amber {
        background: rgba(245,158,11,0.12);
        border: 1px solid rgba(245,158,11,0.2);
        color: #fcd34d;
      }
      .ph-chip--rose {
        background: rgba(244,63,94,0.1);
        border: 1px solid rgba(244,63,94,0.2);
        color: #fb7185;
      }

      /* ── CARD / TABLE ── */
      .ph-card {
        background: ${T.surface};
        border: 1px solid ${T.border};
        border-radius: 16px;
        overflow: hidden;
      }
      .ph-card-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 14px 18px;
        border-bottom: 1px solid ${T.border};
        flex-wrap: wrap;
      }
      .ph-card-title { font-size: 14px; font-weight: 700; color: ${T.text}; }
      .ph-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .ph-table-scroll { overflow-x: auto; }
      .ph-table { width: 100%; border-collapse: collapse; font-size: 13px; }
      .ph-table thead tr { background: ${T.surfaceAlt}; }
      .ph-table th {
        padding: 10px 15px;
        text-align: right;
        font-weight: 600;
        font-size: 10.5px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: ${T.textMute};
        white-space: nowrap;
      }
      .ph-table td {
        padding: 12px 15px;
        color: #cbd5e1;
        vertical-align: middle;
        text-align: right;
      }
      .ph-table tbody tr { border-top: 1px solid ${T.border}; transition: background 0.12s; }
      .ph-table tbody tr:hover { background: ${T.surfaceAlt}; }

      /* ── INPUTS ── */
      .ph-input {
        background: ${T.surfaceAlt};
        border: 1px solid ${T.border};
        border-radius: 8px;
        color: ${T.text};
        padding: 9px 12px;
        font-size: 13.5px;
        outline: none;
        width: 100%;
        font-family: inherit;
        transition: border-color 0.15s;
        text-align: right;
      }
      .ph-input:focus { border-color: ${T.cyan}; }
      .ph-input::placeholder { color: ${T.textFaint}; }
      .ph-search-wrap { position: relative; }
      .ph-search-icon {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        color: ${T.textMute};
        pointer-events: none;
        font-size: 13px;
      }
      .ph-search { padding-right: 32px !important; }

      /* ── BUTTONS ── */
      .ph-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 15px;
        border: none;
        border-radius: 9px;
        font-size: 12.5px;
        font-weight: 700;
        cursor: pointer;
        font-family: inherit;
        transition: opacity 0.15s, transform 0.1s;
        white-space: nowrap;
        text-decoration: none;
      }
      .ph-btn:active { transform: scale(0.97); }
      .ph-btn:disabled { opacity: 0.55; cursor: not-allowed; }
      .ph-btn--cyan    { background: ${T.cyan};    color: #fff; }
      .ph-btn--emerald { background: ${T.emerald}; color: #fff; }
      .ph-btn--violet  { background: ${T.violet};  color: #fff; }
      .ph-btn--rose    { background: ${T.rose};    color: #fff; }
      .ph-btn--ghost   {
        background: ${T.surfaceAlt};
        color: ${T.text};
        border: 1px solid ${T.border};
      }
      .ph-btn--ghost-sm {
        background: ${T.surfaceAlt};
        border: 1px solid ${T.border};
        border-radius: 6px;
        padding: 4px 9px;
        color: ${T.textMute};
        cursor: pointer;
        font-size: 12px;
        font-family: inherit;
      }
      .ph-btn--validate {
        background: rgba(16,185,129,0.12);
        border: 1px solid rgba(16,185,129,0.25);
        border-radius: 6px;
        padding: 4px 10px;
        color: ${T.emerald};
        cursor: pointer;
        font-size: 12px;
        font-weight: 700;
        font-family: inherit;
      }
      .ph-btn--delete-sm {
        background: rgba(244,63,94,0.1);
        border: 1px solid rgba(244,63,94,0.2);
        border-radius: 6px;
        padding: 4px 9px;
        color: ${T.rose};
        cursor: pointer;
        font-size: 12px;
        font-family: inherit;
      }

      /* ── FILTER PILLS ── */
      .ph-filter-row { display: flex; gap: 6px; flex-wrap: wrap; }
      .ph-filter-btn {
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
      .ph-filter-btn:hover,
      .ph-filter-btn--active { background: ${T.cyan}; color: #fff; border-color: ${T.cyan}; }

      /* ── MULTI-SELECT DROPDOWN (year/month report filters) ── */
      .ph-msd-trigger{display:flex}
      .ph-msd-panel{
        position:absolute;top:calc(100% + 6px);right:0;z-index:40;
        min-width:200px;
        background:${T.surfaceAlt};border:1px solid ${T.border};border-radius:10px;
        box-shadow:0 10px 30px rgba(0,0,0,.45);padding:10px;
      }
      .ph-msd-option{
        display:flex;align-items:center;justify-content:space-between;
        padding:9px 10px;border-radius:7px;
        font-size:14px;cursor:pointer;color:${T.text};
      }
      .ph-msd-option:hover{background:${T.surface}}
      .ph-msd-option input{accent-color:${T.cyan};width:18px;height:18px;cursor:pointer;flex-shrink:0}
      .ph-msd-option--all{font-weight:700;color:${T.cyan}}
      .ph-msd-divider{height:1px;background:${T.border};margin:6px 2px}
      .ph-msd-list{max-height:240px;overflow-y:auto}
      .ph-report-bar {
         overflow: visible !important;
       }

      /* ── BADGES ── */
      .ph-badge {
        display: inline-block;
        padding: 2px 9px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
      }
      .ph-badge--cyan    { background: rgba(6,182,212,0.12);  color: #67e8f9; }
      .ph-badge--green   { background: rgba(16,185,129,0.12); color: #6ee7b7; }
      .ph-badge--amber   { background: rgba(245,158,11,0.12); color: #fcd34d; }
      .ph-badge--rose    { background: rgba(244,63,94,0.12);  color: #fb7185; }
      .ph-badge--violet  { background: rgba(168,85,247,0.12); color: #c084fc; }
      .ph-badge--gray    { background: rgba(100,116,139,0.15); color: #94a3b8; }

      /* ── EXPIRY PULSE ── */
      .expiry-urgent { animation: expiry-pulse 1.5s ease-in-out infinite; }
      @keyframes expiry-pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
      @media (prefers-reduced-motion: reduce) { .expiry-urgent { animation: none; } }

      /* ── MODAL ── */
      .ph-modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.72);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999;
        padding: 16px;
      }
      .ph-modal {
        background: ${T.surface};
        border: 1px solid ${T.border};
        border-radius: 18px;
        width: 100%;
        max-width: 520px;
        max-height: 92vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      .ph-modal--wide { max-width: 680px; }
      .ph-modal-head {
        padding: 18px 22px;
        border-bottom: 1px solid ${T.border};
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
      }
      .ph-modal-title {
        font-family: 'DM Serif Display', Georgia, serif;
        font-size: 18px;
        color: ${T.text};
      }
      .ph-modal-close {
        background: none;
        border: none;
        color: ${T.textMute};
        font-size: 24px;
        cursor: pointer;
        line-height: 1;
        padding: 0;
      }
      .ph-modal-body {
        padding: 20px 22px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      /* ── FORM ── */
      .ph-field { display: flex; flex-direction: column; gap: 5px; position: relative; }
      .ph-field label {
        font-size: 11.5px;
        font-weight: 600;
        color: ${T.textMute};
        letter-spacing: 0.4px;
      }
      .ph-field .req { color: #ef4444; }
      .ph-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .ph-form-hint {
        background: ${T.surfaceAlt};
        border-radius: 8px;
        padding: 10px 13px;
        font-size: 12.5px;
        color: ${T.textMute};
      }
      .ph-form-actions { display: flex; gap: 10px; margin-top: 4px; }
      .ph-items-grid { display: grid; grid-template-columns: 1fr auto auto auto; gap: 8px; align-items: end; margin-bottom: 6px; }
      .ph-dist-grid  { display: grid; grid-template-columns: 1fr auto auto; gap: 8px; align-items: end; margin-bottom: 6px; }
      .ph-add-item-btn {
        background: rgba(30,42,66,0.5);
        border: 1px dashed ${T.border};
        border-radius: 8px;
        padding: 7px 14px;
        color: ${T.textMute};
        cursor: pointer;
        font-size: 13px;
        width: 100%;
        margin-bottom: 4px;
        font-family: inherit;
      }
      .ph-err { color: ${T.rose}; font-size: 13px; }

      /* ── TOAST ── */
      .ph-toast {
        position: fixed;
        top: 18px;
        left: 50%;
        transform: translateX(-50%);
        padding: 10px 20px;
        border-radius: 10px;
        font-weight: 600;
        font-size: 14px;
        z-index: 9999;
        animation: toast-in 0.25s ease;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        white-space: nowrap;
      }
      .ph-toast--success { background: ${T.emerald}; color: #fff; }
      .ph-toast--error   { background: ${T.rose};    color: #fff; }
      @keyframes toast-in {
        from { opacity:0; transform: translateX(-50%) translateY(-8px); }
        to   { opacity:1; transform: translateX(-50%) translateY(0);    }
      }

      /* ── DRUG SEARCH DROPDOWN ── */
      .ph-drug-dropdown {
        position: absolute;
        top: 100%;
        right: 0; left: 0;
        z-index: 9999;
        background: ${T.surface};
        border: 1px solid ${T.border};
        border-radius: 8px;
        max-height: 220px;
        overflow-y: auto;
        box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        margin-top: 4px;
      }
      .ph-drug-item {
        padding: 10px 15px;
        cursor: pointer;
        border-bottom: 1px solid ${T.border};
        font-size: 13px;
        transition: background 0.12s;
      }
      .ph-drug-item:hover { background: ${T.surfaceAlt}; }
      .ph-drug-hint { padding: 12px 15px; color: ${T.textMute}; font-size: 12px; }

      /* ── EMPTY / LOADING ── */
      .ph-empty   { padding: 48px; text-align: center; color: ${T.textMute}; font-size: 14px; }
      .ph-loading { padding: 48px; text-align: center; color: ${T.textMute}; }

      /* ── CANCEL INFO BANNER ── */
      .ph-cancel-banner {
        background: rgba(244,63,94,0.07);
        border: 1px solid rgba(244,63,94,0.3);
        border-radius: 10px;
        padding: 10px 14px;
        font-size: 12.5px;
        color: #fca5a5;
      }
    `}</style>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3800)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div className={`ph-toast ph-toast--${type}`}>
      {type === 'success' ? '✓' : '✗'} {msg}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const h = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="ph-modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`ph-modal${wide ? ' ph-modal--wide' : ''}`} role="dialog" aria-modal="true">
        <div className="ph-modal-head">
          <span className="ph-modal-title">{title}</span>
          <button type="button" className="ph-modal-close" onClick={onClose} aria-label="إغلاق">×</button>
        </div>
        <div className="ph-modal-body">{children}</div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FIELD
// ─────────────────────────────────────────────────────────────────────────────
function Field({ label, required, children }) {
  return (
    <div className="ph-field">
      <label>{label}{required && <span className="req"> *</span>}</label>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH INPUT
// ─────────────────────────────────────────────────────────────────────────────
function SearchInput({ value, onChange, placeholder, style }) {
  return (
    <div className="ph-search-wrap" style={style}>
      <span className="ph-search-icon">🔍</span>
      <input
        className="ph-input ph-search"
        placeholder={placeholder || 'بحث…'}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// tiny helper hook: close a dropdown when clicking outside of it
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// MULTI-SELECT DROPDOWN  (used for the distributions report's year/month filters)
// options: [{ value, label }]   selected: array of string values, or ['all']
// ─────────────────────────────────────────────────────────────────────────────
function MultiSelectDropdown({ label, options, selected, onChange, width = 200 }) {
  const [open, setOpen] = useState(false)
  const rootRef = useCallbackRefEscape(() => setOpen(false))

  const allSelected = selected.includes('all') || selected.length === 0

  function toggleAll() { onChange(['all']) }

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
    <div className="ph-field" style={{ position: 'relative' }} ref={rootRef}>
      <label>{label}</label>
      <button
        type="button"
        className="ph-input ph-msd-trigger"
        style={{ width, textAlign: 'right', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        onClick={() => setOpen(v => !v)}
      >
        <span>{summary}</span>
        <span style={{ color: T.textMute, fontSize: 11 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="ph-msd-panel" style={{ width }}>
          <label className="ph-msd-option ph-msd-option--all">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} />
            <span>الكل</span>
          </label>
          <div className="ph-msd-divider" />
          <div className="ph-msd-list">
            {options.map(o => (
              <label className="ph-msd-option" key={o.value}>
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

// ─────────────────────────────────────────────────────────────────────────────
// DRUG SEARCH SELECT  (handles 2000+ entries without freezing)
// ─────────────────────────────────────────────────────────────────────────────
function DrugSearchSelect({ drugs, value, onChange }) {
  const [query, setQuery] = useState('')
  const [open, setOpen]   = useState(false)

  const selected = useMemo(() => drugs.find(d => String(d.id) === String(value)), [drugs, value])

  const results = useMemo(() => {
    if (query.length < 2) return []
    const q = query.toLowerCase()
    return drugs.filter(d =>
      d.dci_name?.toLowerCase().includes(q) || d.code?.toLowerCase().includes(q)
    ).slice(0, 30)
  }, [drugs, query])

  function pick(drug) { onChange(drug.id); setQuery(''); setOpen(false) }
  function clear(e)   { e.stopPropagation(); onChange(''); setQuery(''); setOpen(false) }

  return (
    <div style={{ position: 'relative' }}>
      {selected && !open ? (
        <div
          onClick={() => setOpen(true)}
          className="ph-input"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        >
          <span>{selected.dci_name} {selected.dosage}</span>
          <span onClick={clear} style={{ color: T.textMute, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</span>
        </div>
      ) : (
        <input
          autoFocus={open}
          className="ph-input"
          placeholder="اكتب حرفين للبحث عن دواء…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
        />
      )}
      {open && (
        <div className="ph-drug-dropdown">
          {query.length < 2
            ? <div className="ph-drug-hint">اكتب حرفين على الأقل…</div>
            : results.length === 0
              ? <div className="ph-drug-hint">لا توجد نتائج لـ "{query}"</div>
              : results.map(d => (
                <div key={d.id} className="ph-drug-item" onMouseDown={() => pick(d)}>
                  <span style={{ color: T.text }}>{d.dci_name} </span>
                  <span style={{ color: T.textMute }}>{d.dosage}</span>
                  <span style={{ float: 'left', color: T.cyan, fontSize: 11, fontFamily: 'monospace' }}>{d.code}</span>
                </div>
              ))
          }
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STOCK SEARCH SELECT
// ─────────────────────────────────────────────────────────────────────────────
function StockSearchSelect({ stocks, value, onChange }) {
  const [query, setQuery] = useState('')
  const [open, setOpen]   = useState(false)

  const selected = useMemo(() => stocks.find(s => String(s.id) === String(value)), [stocks, value])

  const results = useMemo(() => {
    if (query.length < 2) return []
    const q = query.toLowerCase()
    return stocks.filter(s => s.drug_name?.toLowerCase().includes(q)).slice(0, 30)
  }, [stocks, query])

  function pick(s)  { onChange(s.id); setQuery(''); setOpen(false) }
  function clear(e) { e.stopPropagation(); onChange(''); setQuery(''); setOpen(false) }

  return (
    <div style={{ position: 'relative' }}>
      {selected && !open ? (
        <div
          onClick={() => setOpen(true)}
          className="ph-input"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontSize: 13 }}
        >
          <span>{selected.drug_name} — {selected.expiration_date} — متاح: {selected.quantity_available}</span>
          <span onClick={clear} style={{ color: T.textMute, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</span>
        </div>
      ) : (
        <input
          autoFocus={open}
          className="ph-input"
          placeholder="اكتب اسم الدواء للبحث في المخزون…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
        />
      )}
      {open && (
        <div className="ph-drug-dropdown">
          {query.length < 2
            ? <div className="ph-drug-hint">اكتب حرفين على الأقل…</div>
            : results.length === 0
              ? <div className="ph-drug-hint">لا توجد دفعات لـ "{query}"</div>
              : results.map(s => (
                <div key={s.id} className="ph-drug-item" onMouseDown={() => pick(s)}>
                  <span style={{ color: T.text }}>{s.drug_name} </span>
                  <span style={{ color: T.textMute, fontSize: 12 }}>— ينتهي: {s.expiration_date}</span>
                  <span style={{ float: 'left', color: T.emerald, fontSize: 12, fontWeight: 700 }}>متاح: {s.quantity_available}</span>
                </div>
              ))
          }
        </div>
      )}
    </div>
  )
}
// ─────────────────────────────────────────────────────────────────────────────
// QUICK ADD PERSON — inline mini-form used inside the distribution modal so
// the user never has to leave this page to create a missing beneficiary.
// ─────────────────────────────────────────────────────────────────────────────
const PH_GENDER_LABELS = { male: 'ذكر', female: 'أنثى' }

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
        <button type="button" className="ph-btn ph-btn--ghost" style={{ padding: '4px 9px', fontSize: 13 }} onClick={onCancel}>✕</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="الاسم" required>
          <input className="ph-input" value={f.first_name} onChange={e => setF({ ...f, first_name: e.target.value })} />
        </Field>
        <Field label="اللقب" required>
          <input className="ph-input" value={f.last_name} onChange={e => setF({ ...f, last_name: e.target.value })} />
        </Field>
        <Field label="الهاتف">
          <input className="ph-input" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} />
        </Field>
        <Field label="رقم التعريف الوطني">
          <input className="ph-input" value={f.nin} onChange={e => setF({ ...f, nin: e.target.value })} />
        </Field>
        <Field label="تاريخ الميلاد" required>
          <input type="date" className="ph-input" value={f.date_of_birth} onChange={e => setF({ ...f, date_of_birth: e.target.value })} />
        </Field>
        <Field label="الجنس" required>
          <select className="ph-input" value={f.gender} onChange={e => setF({ ...f, gender: e.target.value })}>
            <option value="">اختر…</option>
            {Object.entries(PH_GENDER_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ marginTop: 10 }}>
        <Field label="العنوان" required>
          <input className="ph-input" value={f.address} onChange={e => setF({ ...f, address: e.target.value })} />
        </Field>
      </div>
      {err && <p className="ph-err">{err}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
        <button type="button" className="ph-btn ph-btn--ghost" onClick={onCancel} disabled={saving}>إلغاء</button>
        <button type="button" className="ph-btn ph-btn--violet" onClick={submit} disabled={saving}>
          {saving ? 'جارٍ الحفظ…' : 'حفظ الشخص واختياره'}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PERSON SEARCH SELECT
// ─────────────────────────────────────────────────────────────────────────────
function PersonSearchSelect({ persons, value, onChange }) {
  const [query, setQuery] = useState('')
  const [open, setOpen]   = useState(false)

  const selected = useMemo(() => persons.find(p => String(p.id) === String(value)), [persons, value])

  const label = p => {
    const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()
    return p.phone ? `${name} (${p.phone})` : name
  }

  const results = useMemo(() => {
    if (query.length < 1) return persons.slice(0, 30)
    const q = query.toLowerCase()
    return persons.filter(p => {
      const fullName = `${p.first_name ?? ''} ${p.last_name ?? ''}`.toLowerCase()
      const phone = (p.phone ?? '').toLowerCase()
      return fullName.includes(q) || phone.includes(q)
    }).slice(0, 30)
  }, [persons, query])

  function pick(p)  { onChange(String(p.id)); setQuery(''); setOpen(false) }
  function clear(e) { e.stopPropagation(); onChange(''); setQuery(''); setOpen(false) }

  return (
    <div style={{ position: 'relative' }}>
      {selected && !open ? (
        <div
          onClick={() => setOpen(true)}
          className="ph-input"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        >
          <span>{label(selected)}</span>
          <span onClick={clear} style={{ color: T.textMute, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</span>
        </div>
      ) : (
        <input
          autoFocus={open}
          className="ph-input"
          placeholder="ابحث بالاسم أو رقم الهاتف…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
        />
      )}
      {open && (
        <div className="ph-drug-dropdown">
          {results.length === 0
            ? <div className="ph-drug-hint">لا توجد نتائج{query ? ` لـ "${query}"` : ''}</div>
            : results.map(p => (
              <div key={p.id} className="ph-drug-item" onMouseDown={() => pick(p)}>
                <span style={{ color: T.text }}>{label(p)}</span>
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}
// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, accent }) {
  return (
    <div className="ph-stat">
      <div className="ph-stat-accent" style={{ background: accent }} />
      <div className="ph-stat-icon" style={{ background: `${accent}18` }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
      </div>
      <div className="ph-stat-val">{value ?? '—'}</div>
      <div className="ph-stat-lbl">{label}</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TABLE HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function TableWrap({ children, title, toolbar, empty, loading }) {
  return (
    <div className="ph-card">
      {(title || toolbar) && (
        <div className="ph-card-head">
          {title && <span className="ph-card-title">{title}</span>}
          {toolbar}
        </div>
      )}
      {loading
        ? <div className="ph-loading">جارٍ التحميل…</div>
        : empty
          ? <div className="ph-empty">{empty}</div>
          : <div className="ph-table-scroll">{children}</div>
      }
    </div>
  )
}

function Table({ head, rows }) {
  return (
    <table className="ph-table">
      <thead>
        <tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => <td key={j}>{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPIRY BADGE
// ─────────────────────────────────────────────────────────────────────────────
function ExpiryBadge({ dateStr }) {
  const d = daysUntil(dateStr)
  if (d === null) return <span className="ph-badge ph-badge--gray">—</span>
  if (d < 0)      return <span className="ph-badge ph-badge--rose expiry-urgent">منتهي</span>
  if (d <= 7)     return <span className="ph-badge ph-badge--rose">{d} أيام</span>
  if (d <= 30)    return <span className="ph-badge ph-badge--amber">{d} يوم</span>
  return <span className="ph-badge ph-badge--green">{d} يوم</span>
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function DashboardPage({ drugs, donations, distributions, stocks, expiringStocks }) {
  const pendingDists = distributions.filter(d => !d.is_validated).length
  const lowStock     = stocks.filter(s => s.quantity_available > 0 && s.quantity_available < 10).length
  const totalUnits   = stocks.reduce((a, s) => a + s.quantity_available, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="ph-stats">
        <StatCard label="دواء في القائمة"       value={drugs.length}         icon="💊" accent={T.cyan}    />
        <StatCard label="إجمالي التبرعات"        value={donations.length}     icon="📥" accent={T.emerald} />
        <StatCard label="عمليات الصرف"           value={distributions.length} icon="📤" accent={T.violet}  />
        <StatCard label="في انتظار الاعتماد"     value={pendingDists}         icon="⏳" accent={T.amber}   />
        <StatCard label="تنتهي خلال 30 يوم"      value={expiringStocks.length}icon="⚠️" accent={T.rose}    />
        <StatCard label="دفعات منخفضة (< 10)"   value={lowStock}             icon="📉" accent={T.rose}    />
      </div>

      <div className="ph-highlight-row">
        <div className="ph-highlight" style={{ maxWidth: 220 }}>
          <div className="ph-highlight-val">{totalUnits.toLocaleString()}</div>
          <div className="ph-highlight-lbl">وحدة متاحة في المخزون الآن</div>
        </div>

        {expiringStocks.length > 0 && (
          <div className="ph-alert ph-alert--amber" style={{ flex: 2 }}>
            <div className="ph-alert-title" style={{ color: T.amber }}>
              ⚠ دفعات تنتهي خلال 30 يوماً
            </div>
            <div>
              {expiringStocks.slice(0, 8).map((s, i) => (
                <span key={i} className="ph-chip ph-chip--amber">
                  {s.drug_name} — {daysUntil(s.expiration_date)} يوم
                </span>
              ))}
              {expiringStocks.length > 8 && (
                <span style={{ color: T.textMute, fontSize: 12, marginRight: 6 }}>
                  +{expiringStocks.length - 8} أخرى
                </span>
              )}
            </div>
          </div>
        )}

        {lowStock > 0 && (
          <div className="ph-alert ph-alert--rose" style={{ flex: 1, minWidth: 200 }}>
            <div className="ph-alert-title" style={{ color: T.rose }}>
              📉 مخزون منخفض
            </div>
            {stocks.filter(s => s.quantity_available > 0 && s.quantity_available < 10).map((s, i) => (
              <span key={i} className="ph-chip ph-chip--rose">
                {s.drug_name}: {s.quantity_available} وحدة
              </span>
            ))}
          </div>
        )}
      </div>

      {pendingDists > 0 && (
        <div className="ph-alert ph-alert--violet" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 700, color: '#e9d5ff', fontSize: 14 }}>
              ⏳ {pendingDists} عملية صرف في انتظار الاعتماد
            </div>
            <div style={{ color: T.textMute, fontSize: 12.5, marginTop: 3 }}>
              لم يتم خصم الكميات من المخزون بعد
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: DRUGS
// ─────────────────────────────────────────────────────────────────────────────
function DrugsPage({ drugs, loading, onRefresh, notify }) {
  const [search,  setSearch]  = useState('')
  const [modal,   setModal]   = useState(null)
  const [editing, setEditing] = useState(null)
  const [f, setF] = useState({ code: '', dci_name: '', form: '', dosage: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return drugs.filter(d => !q || d.dci_name?.toLowerCase().includes(q) || d.code?.toLowerCase().includes(q))
  }, [drugs, search])

  function openAdd()  { setEditing(null); setF({ code:'', dci_name:'', form:'', dosage:'' }); setErr(''); setModal('form') }
  function openEdit(d){ setEditing(d); setF({ code:d.code, dci_name:d.dci_name, form:d.form, dosage:d.dosage }); setErr(''); setModal('form') }

  async function save() {
    if (!f.code || !f.dci_name || !f.form || !f.dosage) { setErr('جميع الحقول مطلوبة.'); return }
    setSaving(true); setErr('')
    try {
      if (editing) await client.put(`/drugs/${editing.id}/`, f)
      else         await client.post('/drugs/', f)
      setModal(null); onRefresh()
      notify(editing ? 'تم تحديث الدواء.' : 'تمت إضافة الدواء.', 'success')
    } catch (e) { setErr(JSON.stringify(e.response?.data || 'خطأ')) }
    finally { setSaving(false) }
  }

  async function del(d) {
    if (!window.confirm(`حذف "${d.dci_name} ${d.dosage}"؟`)) return
    try {
      await client.delete(`/drugs/${d.id}/`)
      onRefresh(); notify('تم حذف الدواء.', 'success')
    } catch { notify('لا يمكن الحذف: يوجد سجلات مرتبطة بهذا الدواء.', 'error') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <TableWrap
        title={`قائمة الأدوية (${drugs.length})`}
        toolbar={
          <div className="ph-toolbar">
            <SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم أو الرمز…" style={{ width: 200 }} />
            <button className="ph-btn ph-btn--cyan" onClick={openAdd}>+ إضافة دواء</button>
          </div>
        }
        loading={loading}
        empty={filtered.length === 0 ? 'لا توجد أدوية مطابقة.' : null}
      >
        <Table
          head={['الرمز', 'الاسم العلمي (DCI)', 'الشكل', 'الجرعة', '']}
          rows={filtered.map(d => [
            <span style={{ fontFamily: 'monospace', color: '#67e8f9', fontSize: 12 }}>{d.code}</span>,
            <strong style={{ color: T.text }}>{d.dci_name}</strong>,
            <span className="ph-badge" style={{ background: `${FORM_COLORS[d.form] || '#64748b'}18`, color: FORM_COLORS[d.form] || '#94a3b8' }}>
              {FORM_LABELS[d.form] || d.form}
            </span>,
            <span style={{ color: T.textMute }}>{d.dosage}</span>,
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              <button className="ph-btn--ghost-sm" onClick={() => openEdit(d)}>تعديل</button>
              <button className="ph-btn--delete-sm" onClick={() => del(d)}>حذف</button>
            </div>,
          ])}
        />
      </TableWrap>

      {modal === 'form' && (
        <Modal title={editing ? 'تعديل دواء' : 'إضافة دواء'} onClose={() => setModal(null)}>
          <div className="ph-form-grid">
            <Field label="الرمز" required>
              <input className="ph-input" value={f.code} onChange={e => setF({ ...f, code: e.target.value })} placeholder="مثال: AMOX500" />
            </Field>
            <Field label="الاسم العلمي (DCI)" required>
              <input className="ph-input" value={f.dci_name} onChange={e => setF({ ...f, dci_name: e.target.value })} placeholder="مثال: Amoxicillin" />
            </Field>
            <Field label="الشكل الصيدلاني" required>
              <select className="ph-input" value={f.form} onChange={e => setF({ ...f, form: e.target.value })}>
                <option value="">اختر الشكل…</option>
                {Object.entries(FORM_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="الجرعة" required>
              <input className="ph-input" value={f.dosage} onChange={e => setF({ ...f, dosage: e.target.value })} placeholder="مثال: 500mg" />
            </Field>
          </div>
          {err && <p className="ph-err">{err}</p>}
          <div className="ph-form-actions">
            <button className="ph-btn ph-btn--ghost" onClick={() => setModal(null)}>إلغاء</button>
            <button className="ph-btn ph-btn--cyan" onClick={save} disabled={saving}>
              {saving ? 'جارٍ الحفظ…' : 'حفظ الدواء'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: STOCK
// ─────────────────────────────────────────────────────────────────────────────
function StockPage({ stocks, loading }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const expiringCount = stocks.filter(s => s.quantity_available > 0 && daysUntil(s.expiration_date) <= 30).length
  const lowCount      = stocks.filter(s => s.quantity_available > 0 && s.quantity_available < 10).length

  const filtered = useMemo(() => {
    let list = stocks.filter(s => s.quantity_available > 0)
    if (search) { const q = search.toLowerCase(); list = list.filter(s => s.drug_name?.toLowerCase().includes(q)) }
    if (filter === 'expiring') list = list.filter(s => daysUntil(s.expiration_date) <= 30)
    if (filter === 'low')      list = list.filter(s => s.quantity_available < 10)
    return list.sort((a, b) => new Date(a.expiration_date) - new Date(b.expiration_date))
  }, [stocks, search, filter])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="ph-stats">
        <StatCard label="إجمالي دفعات المخزون" value={stocks.filter(s => s.quantity_available > 0).length} icon="📦" accent={T.cyan}    />
        <StatCard label="تنتهي خلال 30 يوم"    value={expiringCount}                                       icon="⚠️" accent={T.amber}   />
        <StatCard label="مخزون منخفض (< 10)"   value={lowCount}                                            icon="📉" accent={T.rose}    />
      </div>

      <TableWrap
        title="المخزون الحالي"
        toolbar={
          <div className="ph-toolbar">
            <SearchInput value={search} onChange={setSearch} placeholder="بحث عن دواء…" style={{ width: 190 }} />
            <div className="ph-filter-row">
              {[['all','الكل'],['expiring',`تنتهي (${expiringCount})`],['low',`منخفض (${lowCount})`]].map(([v,l]) => (
                <button key={v} className={`ph-filter-btn${filter===v?' ph-filter-btn--active':''}`} onClick={() => setFilter(v)}>{l}</button>
              ))}
            </div>
          </div>
        }
        loading={loading}
        empty={filtered.length === 0 ? 'لا توجد نتائج لهذا الفلتر.' : null}
      >
        <Table
          head={['الدواء', 'الشكل', 'الجرعة', 'الكمية', 'تاريخ الانتهاء', 'الحالة']}
          rows={filtered.map(s => [
            <strong style={{ color: T.text }}>{s.drug_name || s.drug}</strong>,
            <span className="ph-badge" style={{ background: `${FORM_COLORS[s.drug_form]||'#64748b'}18`, color: FORM_COLORS[s.drug_form]||'#94a3b8' }}>
              {FORM_LABELS[s.drug_form] || '—'}
            </span>,
            <span style={{ color: T.textMute }}>{s.drug_dosage || '—'}</span>,
            <span style={{ fontWeight: 700, fontSize: 16, color: s.quantity_available < 10 ? T.rose : s.quantity_available < 20 ? T.amber : T.emerald }}>
              {s.quantity_available}
            </span>,
            <span style={{ color: T.textMute, fontVariantNumeric: 'tabular-nums' }}>{fmt(s.expiration_date)}</span>,
            <ExpiryBadge dateStr={s.expiration_date} />,
          ])}
        />
      </TableWrap>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: DONATIONS
// ─────────────────────────────────────────────────────────────────────────────
function DonationsPage({ donations, drugs, loading, onRefresh, notify }) {
  const [search,      setSearch]      = useState('')
  const [viewing,     setViewing]     = useState(null)
  const [showForm,    setShowForm]    = useState(false)
  const [cancelTarget,setCancelTarget]= useState(null)
  const [cancelReason,setCancelReason]= useState('')
  const [cancelling,  setCancelling]  = useState(false)
  const [cancelErr,   setCancelErr]   = useState('')

  const emptyItem = () => ({ drug: '', quantity: 1, expiration_date: '' })
  const initForm  = { donor: '', donation_type: 'donation', invoice_number: '', donation_date: '', total_price: '0', remarks: '', items: [emptyItem()] }
  const [f, setF] = useState(initForm)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return donations.filter(d => !q || d.donor?.toLowerCase().includes(q) || d.invoice_number?.toLowerCase().includes(q))
  }, [donations, search])
  
  function fmtDateTime(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('ar-DZ', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  }

  function updItem(i, k, v) {
    const items = [...f.items]; items[i] = { ...items[i], [k]: v }; setF({ ...f, items })
  }

  async function submit() {
    if (!f.donor || !f.donation_date || f.items.some(it => !it.drug || !it.expiration_date || !it.quantity)) {
      setErr('يرجى ملء جميع الحقول وإضافة دواء واحد على الأقل.'); return
    }
    setSaving(true); setErr('')
    try {
      await client.post('/donations/', {
        donor: f.donor, donation_type: f.donation_type, donation_date: f.donation_date,
        total_price: f.total_price, remarks: f.remarks,
        invoice_number: f.donation_type === 'invoice' ? f.invoice_number : '',
        items: f.items.map(it => ({ drug: +it.drug, quantity: +it.quantity, expiration_date: it.expiration_date })),
      })
      setShowForm(false); setF(initForm); onRefresh()
      notify('تم تسجيل التبرع وتحديث المخزون.', 'success')
    } catch (e) { setErr(JSON.stringify(e.response?.data || 'خطأ')) }
    finally { setSaving(false) }
  }

  async function confirmCancel() {
    if (!cancelTarget) return
    setCancelling(true); setCancelErr('')
    try {
      await client.post(`/donations/${cancelTarget.id}/cancel/`, { reason: cancelReason })
      if (viewing?.id === cancelTarget.id) setViewing(null)
      setCancelTarget(null); onRefresh()
      notify('تم إلغاء التبرع وخصم الكميات من المخزون.', 'success')
    } catch (e) {
      setCancelErr(e.response?.data?.detail || JSON.stringify(e.response?.data || 'فشل الإلغاء.'))
    } finally { setCancelling(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <TableWrap
        title={`سجل التبرعات (${donations.length})`}
        toolbar={
          <div className="ph-toolbar">
            <SearchInput value={search} onChange={setSearch} placeholder="بحث بالمتبرع أو رقم الفاتورة…" style={{ width: 230 }} />
            <button className="ph-btn ph-btn--emerald" onClick={() => setShowForm(true)}>+ تسجيل تبرع</button>
          </div>
        }
        loading={loading}
        empty={filtered.length === 0 ? 'لا توجد سجلات تبرع.' : null}
      >
        <Table
          head={['التاريخ', 'المتبرع / المورد', 'النوع', 'رقم الفاتورة', 'السعر', 'الأصناف', 'الحالة', '']}
          rows={filtered.map(d => [
            <span style={{ color: T.textMute, whiteSpace: 'nowrap' }}>{fmt(d.donation_date)}</span>,
            <strong style={{ color: d.is_cancelled ? T.textMute : T.text, textDecoration: d.is_cancelled ? 'line-through' : 'none' }}>{d.donor}</strong>,
            <span className="ph-badge ph-badge--gray">{DONATION_LABELS[d.donation_type] || d.donation_type}</span>,
            <span style={{ color: T.textMute, fontSize: 12 }}>{d.invoice_number || '—'}</span>,
            <span style={{ color: '#a5b4fc' }}>{d.total_price ? `${Number(d.total_price).toFixed(2)} دج` : '—'}</span>,
            <span className="ph-badge ph-badge--cyan">{d.items?.length ?? 0} أصناف</span>,
            d.is_cancelled
              ? <span className="ph-badge ph-badge--rose">ملغى</span>
              : <span className="ph-badge ph-badge--green">نشط</span>,
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
             <button className="ph-btn--ghost-sm" onClick={() => setViewing(d)}>عرض</button>
             {!d.is_cancelled && d.can_be_cancelled && (
               <button className="ph-btn--delete-sm" onClick={() => { setCancelTarget(d); setCancelReason(''); setCancelErr('') }}>إلغاء</button>
             )}
           </div>,
          ])}
        />
      </TableWrap>

      {/* View Donation Modal */}
      {viewing && (
        <Modal title={`تبرع — ${viewing.donor} (${fmt(viewing.donation_date)})`} onClose={() => setViewing(null)} wide>
          <div className="ph-form-grid" style={{ marginBottom: 16 }}>
            {[['المتبرع / المورد', viewing.donor], ['النوع', DONATION_LABELS[viewing.donation_type] || viewing.donation_type],
              ['التاريخ', fmt(viewing.donation_date)], ['رقم الفاتورة', viewing.invoice_number || '—'],
              ['السعر الإجمالي', viewing.total_price ? `${Number(viewing.total_price).toFixed(2)} دج` : '—'],
              ['الحالة', viewing.is_cancelled ? '✗ ملغى' : '✓ نشط'],
              ['ملاحظات', viewing.remarks || '—'],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.textMute, marginBottom: 4 }}>{k}</div>
                <div style={{ color: T.text, fontSize: 14 }}>{v}</div>
              </div>
            ))}
          </div>

          {viewing.is_cancelled && (
  <div className="ph-cancel-banner" style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
    <div>✗ هذا التبرع مُلغى — تم خصم الكميات من المخزون</div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <div>
        <div style={{ fontSize: 11, color: T.textMute, marginBottom: 2 }}>أُلغي بواسطة</div>
        <div style={{ color: '#fca5a5', fontWeight: 600 }}>{viewing.cancelled_by_username || '—'}</div>
      </div>
      <div>
        <div style={{ fontSize: 11, color: T.textMute, marginBottom: 2 }}>تاريخ الإلغاء</div>
        <div style={{ color: '#fca5a5', fontWeight: 600 }}>{fmtDateTime(viewing.cancelled_at)}</div>
      </div>
    </div>
    {viewing.cancellation_reason && (
          <div>
            <div style={{ fontSize: 11, color: T.textMute, marginBottom: 2 }}>السبب</div>
            <div>{viewing.cancellation_reason}</div>
          </div>
        )}
      </div>
    )}
    
    {!viewing.is_cancelled && viewing.can_be_cancelled && (
      <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ color: T.textMute, fontSize: 13 }}>إلغاء هذا التبرع سيخصم الكميات المُستلمة من المخزون فوراً.</span>
        <button className="ph-btn ph-btn--rose" onClick={() => { setCancelTarget(viewing); setCancelReason(''); setCancelErr('') }}>
          إلغاء التبرع
        </button>
      </div>
    )}
    
    {!viewing.is_cancelled && !viewing.can_be_cancelled && (
      <div style={{ background: 'rgba(100,116,139,0.08)', border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 16px', marginBottom: 14, color: T.textMute, fontSize: 13 }}>
        ⏳ انتهت فترة الإلغاء (5 أيام من تاريخ التبرع) — لا يمكن إلغاء هذا التبرع بعد الآن.
      </div>
    )}

          <div style={{ fontWeight: 700, color: T.textMute, fontSize: 12, marginBottom: 10 }}>الأدوية المتبرع بها</div>
          {viewing.items?.length > 0
            ? <Table
                head={['الدواء', 'الكمية', 'تاريخ الانتهاء']}
                rows={viewing.items.map(it => [
                  <strong style={{ color: T.text }}>{it.drug_name || it.drug}</strong>,
                  <span style={{ color: T.emerald, fontWeight: 700 }}>{it.quantity}</span>,
                  <span style={{ color: T.textMute }}>{fmt(it.expiration_date)}</span>,
                ])}
              />
            : <p className="ph-empty" style={{ padding: 12 }}>لا توجد أصناف.</p>
          }
        </Modal>
      )}

      {/* Add Donation Modal */}
      {showForm && (
        <Modal title="تسجيل تبرع / استلام" onClose={() => setShowForm(false)} wide>
          <div className="ph-form-grid">
            <Field label="المتبرع / المورد" required>
              <input className="ph-input" value={f.donor} onChange={e => setF({ ...f, donor: e.target.value })} placeholder="مثال: الهلال الأحمر" />
            </Field>
            <Field label="النوع" required>
              <select className="ph-input" value={f.donation_type} onChange={e => setF({ ...f, donation_type: e.target.value })}>
                {Object.entries(DONATION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            {f.donation_type === 'invoice' && (
              <Field label="رقم الفاتورة">
                <input className="ph-input" value={f.invoice_number} onChange={e => setF({ ...f, invoice_number: e.target.value })} />
              </Field>
            )}
            <Field label="التاريخ" required>
              <input type="date" className="ph-input" value={f.donation_date} onChange={e => setF({ ...f, donation_date: e.target.value })} />
            </Field>
            <Field label="السعر الإجمالي (دج)">
              <input type="number" step="0.01" className="ph-input" value={f.total_price} onChange={e => setF({ ...f, total_price: e.target.value })} />
            </Field>
            <Field label="ملاحظات">
              <input className="ph-input" value={f.remarks} onChange={e => setF({ ...f, remarks: e.target.value })} placeholder="اختياري" />
            </Field>
          </div>

          <div style={{ marginTop: 18, marginBottom: 8, fontWeight: 700, color: T.textMute, fontSize: 12 }}>الأدوية المستلمة</div>
          {f.items.map((item, i) => (
            <div key={i} className="ph-items-grid">
              <Field label={i === 0 ? 'الدواء' : ''} required={i === 0}>
                <DrugSearchSelect drugs={drugs} value={item.drug} onChange={v => updItem(i, 'drug', v)} />
              </Field>
              <Field label={i === 0 ? 'الكمية' : ''} required={i === 0}>
                <input type="number" min="1" className="ph-input" style={{ width: 90 }} value={item.quantity} onChange={e => updItem(i, 'quantity', e.target.value)} />
              </Field>
              <Field label={i === 0 ? 'تاريخ الانتهاء' : ''} required={i === 0}>
                <input type="date" className="ph-input" style={{ width: 150 }} value={item.expiration_date} onChange={e => updItem(i, 'expiration_date', e.target.value)} />
              </Field>
              <button
                onClick={() => f.items.length > 1 && setF({ ...f, items: f.items.filter((_, j) => j !== i) })}
                style={{ background: 'rgba(244,63,94,0.12)', border: 'none', borderRadius: 6, color: T.rose, cursor: 'pointer', height: 38, fontSize: 16, marginTop: i === 0 ? 18 : 0 }}
              >×</button>
            </div>
          ))}
          <button className="ph-add-item-btn" onClick={() => setF({ ...f, items: [...f.items, emptyItem()] })}>
            + إضافة دواء آخر
          </button>

          {err && <p className="ph-err">{err}</p>}
          <div className="ph-form-hint">
            💡 سيتم تحديث المخزون تلقائياً فور حفظ التبرع.
          </div>
          <div className="ph-form-actions">
            <button className="ph-btn ph-btn--ghost" onClick={() => setShowForm(false)}>إلغاء</button>
            <button className="ph-btn ph-btn--emerald" onClick={submit} disabled={saving}>
              {saving ? 'جارٍ الحفظ…' : 'تسجيل الاستلام'}
            </button>
          </div>
        </Modal>
      )}

      {/* Cancel Donation Modal */}
      {cancelTarget && (
        <Modal title={`إلغاء التبرع — ${cancelTarget.donor}`} onClose={() => !cancelling && setCancelTarget(null)}>
          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '12px 16px', color: '#fbbf24', fontSize: 13 }}>
            ⚠ سيتم خصم الكميات من المخزون. إذا وُزِّع جزء منها، سيفشل الإلغاء.
          </div>
          <Field label="سبب الإلغاء">
            <textarea
              rows={3}
              className="ph-input"
              style={{ resize: 'vertical' }}
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="مثال: تسجيل مكرر، خطأ في الكمية…"
            />
          </Field>
          {cancelErr && <p className="ph-err">{cancelErr}</p>}
          <div className="ph-form-actions">
            <button className="ph-btn ph-btn--ghost" onClick={() => setCancelTarget(null)} disabled={cancelling}>تراجع</button>
            <button className="ph-btn ph-btn--rose" onClick={confirmCancel} disabled={cancelling}>
              {cancelling ? 'جارٍ الإلغاء…' : 'تأكيد الإلغاء وخصم المخزون'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE: DISTRIBUTIONS
// ─────────────────────────────────────────────────────────────────────────────
function DistributionsPage({ distributions, drugs, stocks, loading, onRefresh, notify }) {
  const [search,    setSearch]    = useState('')
  const [viewing,   setViewing]   = useState(null)
  const [showForm,  setShowForm]  = useState(false)
  const [validating,setValidating]= useState(null)
  const [persons,   setPersons]   = useState([])
  const [personsLoaded, setPersonsLoaded] = useState(false)
  const [editingDist,setEditingDist]=useState(null)
  const [addingPerson, setAddingPerson] = useState(false)

  const emptyItem = () => ({ stock: '', quantity: 1 })
  const initForm  = { beneficiary: '', distribution_date: '', prescription_number: '', doctor_name: '', remarks: '', items: [emptyItem()] }
  const [f, setF] = useState(initForm)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  // ── Monthly report (Excel / PDF export) ──────────────────────────────────
  const currentYear = new Date().getFullYear()
  const yearOptions = useMemo(() => {
    const arr = []
    for (let y = currentYear; y >= currentYear - 6; y--) arr.push({ value: y, label: String(y) })
    return arr
  }, [currentYear])

  const monthOptions = useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({
      value: i + 1,
      label: new Date(2000, i, 1).toLocaleDateString('ar-DZ', { month: 'long' }),
    })),
    []
  )

  const [selectedYears,  setSelectedYears]  = useState(['all'])
  const [selectedMonths, setSelectedMonths] = useState(['all'])
  const [showReportBar,  setShowReportBar]  = useState(false)

  function handleExport(fmt) {
    const years  = selectedYears.includes('all')  ? [] : selectedYears
    const months = selectedMonths.includes('all') ? [] : selectedMonths
    downloadReport({ years, months }, fmt, notify)
  }

  // Persons are only needed when the "Add/Edit distribution" form is open
  // (for the beneficiary search-select) — so fetch them lazily on first
  // open instead of on every mount of this tab.
  function ensurePersonsLoaded() {
    if (personsLoaded) return
    client.get('/persons/').then(r => {
      const d = r.data
      setPersons(Array.isArray(d) ? d : (d?.results ?? []))
      setPersonsLoaded(true)
    }).catch(() => {})
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return distributions.filter(d =>
      !q || d.beneficiary_name?.toLowerCase().includes(q) ||
      d.doctor_name?.toLowerCase().includes(q) ||
      d.prescription_number?.toLowerCase().includes(q)
    )
  }, [distributions, search])

  const availableStocks = useMemo(() => stocks.filter(s => s.quantity_available > 0), [stocks])

  function updItem(i, k, v) {
    const items = [...f.items]; items[i] = { ...items[i], [k]: v }; setF({ ...f, items })
  }

  // Called once the inline "add person" form saves successfully — adds the
  // new person to the shared list, selects them as beneficiary, and closes
  // the mini-form without leaving the distribution modal.
  function handlePersonCreated(person) {
    setPersons(prev => (prev.some(p => p.id === person.id) ? prev : [...prev, person]))
    setF(f => ({ ...f, beneficiary: String(person.id) }))
    setAddingPerson(false)
  }

  function openAdd() { ensurePersonsLoaded(); setEditingDist(null); setF(initForm); setErr(''); setAddingPerson(false); setShowForm(true) }
  function openEdit(d) {
    ensurePersonsLoaded()
    setEditingDist(d)
    setAddingPerson(false)
    setF({
      beneficiary: String(d.beneficiary), distribution_date: d.distribution_date,
      prescription_number: d.prescription_number || '', doctor_name: d.doctor_name || '',
      remarks: d.remarks || '',
      items: (d.items || []).map(it => ({ stock: String(it.stock), quantity: it.quantity })),
    })
    setErr(''); setShowForm(true)
  }

  async function submit() {
    if (!f.beneficiary || !f.distribution_date || !f.doctor_name || f.items.some(it => !it.stock || !it.quantity)) {
      setErr('يرجى ملء جميع الحقول وإضافة دواء واحد على الأقل.'); return
    }
    setSaving(true); setErr('')
    const payload = {
      beneficiary: +f.beneficiary, distribution_date: f.distribution_date,
      prescription_number: f.prescription_number, doctor_name: f.doctor_name,
      remarks: f.remarks, items: f.items.map(it => ({ stock: +it.stock, quantity: +it.quantity })),
    }
    try {
      if (editingDist) { await client.put(`/distributions/${editingDist.id}/`, payload); notify('تم تحديث عملية الصرف.', 'success') }
      else             { await client.post('/distributions/', payload); notify('تم إنشاء عملية الصرف. قم بالاعتماد لخصم المخزون.', 'success') }
      setShowForm(false); setEditingDist(null); onRefresh()
    } catch (e) { setErr(JSON.stringify(e.response?.data || 'خطأ')) }
    finally { setSaving(false) }
  }

  async function validate(id) {
    if (!window.confirm('تأكيد عملية الصرف؟ سيتم خصم الكميات من المخزون فوراً.')) return
    setValidating(id)
    try {
      await client.post(`/distributions/${id}/validate/`)
      onRefresh(); notify('تم التحقق من الصرف وخصم الكميات من المخزون.', 'success')
      if (viewing?.id === id) setViewing(prev => ({ ...prev, is_validated: true }))
    } catch (e) { notify(JSON.stringify(e.response?.data || 'فشل التحقق.'), 'error') }
    finally { setValidating(null) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {showReportBar && (
        <div className="ph-card ph-report-bar" style={{ padding: 14, display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
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
            width={160}
          />
          <button className="ph-btn ph-btn--cyan" onClick={() => handleExport('excel')}>📊 تصدير Excel</button>
          <button className="ph-btn ph-btn--cyan" onClick={() => handleExport('pdf')}>📄 تصدير PDF</button>
        </div>
      )}
      <TableWrap
        title={`سجل الصرف (${distributions.length})`}
        toolbar={
          <div className="ph-toolbar">
            <SearchInput value={search} onChange={setSearch} placeholder="بحث بالمستفيد، الطبيب…" style={{ width: 220 }} />
            <button className="ph-btn ph-btn--violet" onClick={openAdd}>+ عملية صرف جديدة</button>
            <button className="ph-btn ph-btn--ghost" onClick={() => setShowReportBar(v => !v)}>🖨 تقرير شهري</button>
          </div>
        }
        loading={loading}
        empty={filtered.length === 0 ? 'لا توجد سجلات صرف.' : null}
      >
        <Table
          head={['التاريخ', 'المستفيد', 'الطبيب', 'رقم الوصفة', 'الأصناف', 'الحالة', '']}
          rows={filtered.map(d => [
            <span style={{ color: T.textMute, whiteSpace: 'nowrap' }}>{fmt(d.distribution_date)}</span>,
            <strong style={{ color: T.text }}>{d.beneficiary_name || d.beneficiary}</strong>,
            <span style={{ color: T.textMute }}>{d.doctor_name}</span>,
            <span style={{ color: T.textMute, fontSize: 12 }}>{d.prescription_number || '—'}</span>,
            <span className="ph-badge ph-badge--violet">{d.items?.length ?? 0} أصناف</span>,
            d.is_validated
              ? <span className="ph-badge ph-badge--green">مُعتمد</span>
              : <span className="ph-badge ph-badge--amber">في الانتظار</span>,
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              <button className="ph-btn--ghost-sm" onClick={() => setViewing(d)}>عرض</button>
              {!d.is_validated && (
                <>
                  <button className="ph-btn--ghost-sm" onClick={() => openEdit(d)}>تعديل</button>
                  <button className="ph-btn--validate" onClick={() => validate(d.id)} disabled={validating === d.id}>
                    {validating === d.id ? '…' : 'اعتماد'}
                  </button>
                </>
              )}
            </div>,
          ])}
        />
      </TableWrap>

      {/* View Distribution Modal */}
      {viewing && (
        <Modal title={`عملية صرف #${viewing.id}`} onClose={() => setViewing(null)} wide>
          <div className="ph-form-grid" style={{ marginBottom: 16 }}>
            {[['المستفيد', viewing.beneficiary_name || viewing.beneficiary], ['الطبيب', viewing.doctor_name],
              ['التاريخ', fmt(viewing.distribution_date)], ['رقم الوصفة', viewing.prescription_number || '—'],
              ['الحالة', viewing.is_validated ? '✓ معتمد' : '⏳ في انتظار الاعتماد'], ['ملاحظات', viewing.remarks || '—'],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.textMute, marginBottom: 4 }}>{k}</div>
                <div style={{ color: T.text, fontSize: 14 }}>{v}</div>
              </div>
            ))}
          </div>
          {!viewing.is_validated && (
            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ color: T.amber, fontSize: 13 }}>⚠ لم يتم خصم الكميات من المخزون بعد.</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="ph-btn--ghost-sm" onClick={() => { setViewing(null); openEdit(viewing) }}>تعديل</button>
                <button className="ph-btn ph-btn--emerald" onClick={() => validate(viewing.id)} disabled={validating === viewing.id}>
                  {validating === viewing.id ? 'جارٍ الاعتماد…' : 'اعتماد وخصم المخزون'}
                </button>
              </div>
            </div>
          )}
          <div style={{ fontWeight: 700, color: T.textMute, fontSize: 12, marginBottom: 10 }}>الأدوية المصروفة</div>
          {viewing.items?.length > 0
            ? <Table
                head={['الدواء', 'تاريخ انتهاء الدفعة', 'الكمية']}
                rows={viewing.items.map(it => [
                  <strong style={{ color: T.text }}>{it.drug_name || it.stock}</strong>,
                  <span style={{ color: T.textMute }}>{fmt(it.expiration_date)}</span>,
                  <span style={{ color: '#c084fc', fontWeight: 700 }}>{it.quantity}</span>,
                ])}
              />
            : <p className="ph-empty" style={{ padding: 12 }}>لا توجد أصناف.</p>
          }
        </Modal>
      )}

      {/* Add / Edit Distribution Modal */}
      {showForm && (
        <Modal title={editingDist ? `تعديل عملية الصرف #${editingDist.id}` : 'عملية صرف جديدة'} onClose={() => { setShowForm(false); setEditingDist(null) }} wide>
          <div className="ph-form-grid">
            <Field label="المستفيد" required>
              <PersonSearchSelect 
                persons={persons} 
                value={f.beneficiary} 
                onChange={v => setF({ ...f, beneficiary: v })} />

              {!addingPerson ? (
                <button
                  type="button"
                  className="ph-btn ph-btn--ghost"
                  style={{ marginTop: 8, fontSize: 12, padding: '5px 10px' }}
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
            </Field>
            <Field label="التاريخ" required>
              <input type="date" className="ph-input" value={f.distribution_date} onChange={e => setF({ ...f, distribution_date: e.target.value })} />
            </Field>
            <Field label="الطبيب" required>
              <input className="ph-input" value={f.doctor_name} onChange={e => setF({ ...f, doctor_name: e.target.value })} placeholder="د. الاسم" />
            </Field>
            <Field label="رقم الوصفة">
              <input className="ph-input" value={f.prescription_number} onChange={e => setF({ ...f, prescription_number: e.target.value })} placeholder="RX-001" />
            </Field>
            <Field label="ملاحظات">
              <input className="ph-input" value={f.remarks} onChange={e => setF({ ...f, remarks: e.target.value })} placeholder="اختياري" />
            </Field>
          </div>

          <div style={{ marginTop: 18, marginBottom: 8, fontWeight: 700, color: T.textMute, fontSize: 12 }}>
            الأدوية المصروفة <span style={{ color: T.textFaint, fontWeight: 400, fontSize: 11 }}>(اختر دفعة المخزون لكل دواء)</span>
          </div>
          {f.items.map((item, i) => (
            <div key={i} className="ph-dist-grid">
              <Field label={i === 0 ? 'دفعة المخزون (الدواء — الانتهاء — المتاح)' : ''} required={i === 0}>
                <StockSearchSelect stocks={availableStocks} value={item.stock} onChange={v => updItem(i, 'stock', v)} />
              </Field>
              <Field label={i === 0 ? 'الكمية' : ''} required={i === 0}>
                <input type="number" min="1" className="ph-input" style={{ width: 90 }} value={item.quantity} onChange={e => updItem(i, 'quantity', e.target.value)} />
              </Field>
              <button
                onClick={() => f.items.length > 1 && setF({ ...f, items: f.items.filter((_, j) => j !== i) })}
                style={{ background: 'rgba(244,63,94,0.12)', border: 'none', borderRadius: 6, color: T.rose, cursor: 'pointer', height: 38, fontSize: 16, marginTop: i === 0 ? 18 : 0 }}
              >×</button>
            </div>
          ))}
          <button className="ph-add-item-btn" onClick={() => setF({ ...f, items: [...f.items, emptyItem()] })}>
            + إضافة دواء آخر
          </button>

          {err && <p className="ph-err">{err}</p>}
          <div className="ph-form-hint">
            💡 لن يتم خصم الكميات من المخزون إلا بعد <strong style={{ color: T.amber }}>الاعتماد</strong>.
          </div>
          <div className="ph-form-actions">
            <button className="ph-btn ph-btn--ghost" onClick={() => { setShowForm(false); setEditingDist(null) }}>إلغاء</button>
            <button className="ph-btn ph-btn--violet" onClick={submit} disabled={saving}>
              {saving ? 'جارٍ الحفظ…' : editingDist ? 'تحديث عملية الصرف' : 'إنشاء عملية الصرف'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATED MOLECULE HEADER STRIP
// ─────────────────────────────────────────────────────────────────────────────
function MoleculeStrip() {
  // Two identical halves so the CSS translateX(-50%) loop is seamless
  const half = (
    <>
      <circle cx="20"  cy="16" r="6"  fill="rgba(6,182,212,0.12)" stroke={T.cyan}/>
      <line x1="26"  y1="16" x2="50"  y2="16" stroke={T.cyan} strokeWidth="1"/>
      <circle cx="56"  cy="16" r="4"  fill="none" stroke={T.cyan}/>
      <line x1="60"  y1="16" x2="80"  y2="8"  stroke={T.cyan} strokeWidth="1"/>
      <circle cx="86"  cy="8"  r="5"  fill="rgba(6,182,212,0.12)" stroke={T.cyan}/>
      <line x1="86"  y1="13" x2="86"  y2="23" stroke={T.cyan} strokeWidth="1"/>
      <circle cx="86"  cy="26" r="3"  fill="none" stroke={T.cyan}/>
      <line x1="91"  y1="8"  x2="115" y2="8"  stroke={T.cyan} strokeWidth="1"/>
      <circle cx="120" cy="8"  r="4"  fill="rgba(6,182,212,0.12)" stroke={T.cyan}/>
      <line x1="120" y1="12" x2="120" y2="24" stroke={T.cyan} strokeWidth="1"/>
      <circle cx="120" cy="27" r="3"  fill="none" stroke={T.cyan}/>
      <line x1="124" y1="8"  x2="148" y2="16" stroke={T.cyan} strokeWidth="1"/>
      <circle cx="154" cy="16" r="6"  fill="rgba(6,182,212,0.12)" stroke={T.cyan}/>
      <line x1="160" y1="16" x2="188" y2="16" stroke={T.cyan} strokeWidth="1"/>
      <circle cx="194" cy="16" r="4"  fill="none" stroke={T.cyan}/>
      <line x1="198" y1="16" x2="218" y2="8"  stroke={T.cyan} strokeWidth="1"/>
      <circle cx="224" cy="8"  r="5"  fill="rgba(6,182,212,0.12)" stroke={T.cyan}/>
      <line x1="224" y1="13" x2="224" y2="23" stroke={T.cyan} strokeWidth="1"/>
      <circle cx="224" cy="26" r="3"  fill="none" stroke={T.cyan}/>
      <line x1="229" y1="8"  x2="253" y2="8"  stroke={T.cyan} strokeWidth="1"/>
      <circle cx="258" cy="8"  r="4"  fill="rgba(6,182,212,0.12)" stroke={T.cyan}/>
      <line x1="258" y1="12" x2="258" y2="24" stroke={T.cyan} strokeWidth="1"/>
      <circle cx="258" cy="27" r="3"  fill="none" stroke={T.cyan}/>
      <line x1="262" y1="8"  x2="286" y2="16" stroke={T.cyan} strokeWidth="1"/>
      <circle cx="292" cy="16" r="6"  fill="rgba(6,182,212,0.12)" stroke={T.cyan}/>
      <line x1="298" y1="16" x2="326" y2="16" stroke={T.cyan} strokeWidth="1"/>
      <circle cx="332" cy="16" r="4"  fill="none" stroke={T.cyan}/>
      <line x1="336" y1="16" x2="356" y2="8"  stroke={T.cyan} strokeWidth="1"/>
      <circle cx="362" cy="8"  r="5"  fill="rgba(6,182,212,0.12)" stroke={T.cyan}/>
      <line x1="362" y1="13" x2="362" y2="23" stroke={T.cyan} strokeWidth="1"/>
      <circle cx="362" cy="26" r="3"  fill="none" stroke={T.cyan}/>
      <line x1="367" y1="8"  x2="391" y2="8"  stroke={T.cyan} strokeWidth="1"/>
      <circle cx="396" cy="8"  r="4"  fill="rgba(6,182,212,0.12)" stroke={T.cyan}/>
    </>
  )
  return (
    <div className="ph-mol-strip" aria-hidden="true">
      <svg className="ph-mol-svg" viewBox="0 0 800 32" preserveAspectRatio="xMidYMid meet">
        <g className="mol-chain" opacity="0.35">
          {half}
          <g transform="translate(400,0)">{half}</g>
        </g>
      </svg>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT COMPONENT
// Lazy per-tab data loading:
//   • Each tab declares which API resources it needs (TAB_DEPS).
//   • A resource is fetched only the first time a tab that needs it is opened.
//   • Already-loaded resources are cached in `loaded` and never refetched
//     just from switching tabs back and forth.
//   • `inFlight` prevents firing the same request twice if it's still pending.
//   • After a create/edit/delete/cancel/validate action, only the resources
//     the CURRENT tab depends on are force-refreshed — not everything.
// ─────────────────────────────────────────────────────────────────────────────

const TAB_DEPS = {
  dashboard:     ['drugs', 'stocks', 'donations', 'distributions'],
  drugs:         ['drugs'],
  stock:         ['stocks'],
  donations:     ['donations', 'drugs'],
  distributions: ['distributions', 'stocks', 'drugs'],
}

const FETCHERS = {
  drugs:         () => client.get('/drugs/'),
  stocks:        () => client.get('/stocks/'),
  donations:     () => client.get('/donations/?ordering=-donation_date'),
  distributions: () => client.get('/distributions/?ordering=-distribution_date'),
}

export default function PharmacyDashboard() {
  const [tab,           setTab]           = useState('dashboard')
  const [loading,       setLoading]       = useState(true)
  const [toast,         setToast]         = useState(null)
  const [drugs,         setDrugs]         = useState([])
  const [stocks,        setStocks]        = useState([])
  const [donations,     setDonations]     = useState([])
  const [distributions, setDistributions] = useState([])

  // Which resources have been fetched at least once (cache)
  const [loaded, setLoaded] = useState({})
  // Resources currently being fetched, to avoid duplicate concurrent requests
  const inFlight = useMemo(() => new Set(), [])

  const SETTERS = useMemo(() => ({
    drugs:         d => setDrugs(unwrap(d)),
    stocks:        d => setStocks(unwrap(d)),
    donations:     d => setDonations(unwrap(d)),
    distributions: d => setDistributions(unwrap(d)),
  }), [])

  const expiringStocks = useMemo(
    () => stocks.filter(s => s.quantity_available > 0 && daysUntil(s.expiration_date) <= 30),
    [stocks]
  )

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
  }, [loaded, inFlight, SETTERS])

  // Fetch data for the active tab whenever it changes (no-op if already cached)
  useEffect(() => { loadTab(tab) }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  // Manual refresh button — force-refetches only what the current tab needs
  function refreshCurrentTab() { loadTab(tab, true) }

  // Called after add/edit/delete/cancel/validate actions — refreshes only
  // the resources the CURRENTLY OPEN tab depends on, not all four.
  function notify(msg, type) {
    setToast({ msg, type })
    loadTab(tab, true)
  }

  const pendingCount = distributions.filter(d => !d.is_validated).length

  return (
    <div className="ph-root" dir="rtl">
      <GlobalStyles />
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── HEADER ── */}
      <header className="ph-header">
        <div className="ph-header-inner">
          <div className="ph-brand">
            <div className="ph-brand-mark" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={T.cyan} strokeWidth="1.8" strokeLinecap="round">
                <rect x="4.5" y="2" width="15" height="6" rx="3"/>
                <path d="M9 8v12M15 8v12"/>
                <path d="M6 14h12"/>
              </svg>
            </div>
            <div>
              <h1 className="ph-title">الصيدلية</h1>
              <p className="ph-subtitle">نظام إدارة الأدوية والمخزون</p>
            </div>
          </div>

          <div className="ph-header-stats">
            <div className="ph-hstat">
              <div>
                <div className="ph-hstat-val">{loaded.drugs ? drugs.length : '—'}</div>
                <div className="ph-hstat-lbl">دواء مسجّل</div>
              </div>
            </div>
            <div className="ph-hstat">
              <div>
                <div className="ph-hstat-val">
                  {loaded.stocks ? stocks.filter(s => s.quantity_available > 0).length : '—'}
                </div>
                <div className="ph-hstat-lbl">دفعة في المخزون</div>
              </div>
            </div>
            <div className="ph-hstat">
              <div>
                <div className="ph-hstat-val" style={{ color: pendingCount > 0 ? T.amber : T.text }}>
                  {loaded.distributions ? pendingCount : '—'}
                </div>
                <div className="ph-hstat-lbl">صرف معلّق</div>
              </div>
            </div>
            {loading && (
              <div className="ph-hstat">
                <div style={{ color: T.textMute, fontSize: 12 }}>جارٍ التحديث…</div>
              </div>
            )}
            <button
              type="button"
              onClick={refreshCurrentTab}
              style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 10, padding: '9px 14px', color: T.textMute, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
              title="تحديث"
              aria-label="تحديث البيانات"
            >↻</button>
          </div>
        </div>

        <MoleculeStrip />
      </header>

      {/* ── TABS ── */}
      <nav className="ph-tabs" aria-label="أقسام الصيدلية">
        {NAV.map(n => (
          <button
            key={n.id}
            type="button"
            className={`ph-tab${tab === n.id ? ' ph-tab--active' : ''}`}
            onClick={() => setTab(n.id)}
          >
            <span style={{ fontSize: 14 }}>{n.icon}</span>
            {n.label}
            {n.id === 'distributions' && pendingCount > 0 && (
              <span className="ph-tab-badge">{pendingCount}</span>
            )}
          </button>
        ))}
      </nav>

      {/* ── CONTENT ── */}
      <main className="ph-content">
        {tab === 'dashboard' && (
          <DashboardPage
            drugs={drugs} donations={donations}
            distributions={distributions} stocks={stocks}
            expiringStocks={expiringStocks}
          />
        )}
        {tab === 'drugs' && (
          <DrugsPage
            drugs={drugs}
            loading={loading && !loaded.drugs}
            onRefresh={() => loadTab('drugs', true)}
            notify={notify}
          />
        )}
        {tab === 'stock' && (
          <StockPage stocks={stocks} loading={loading && !loaded.stocks} />
        )}
        {tab === 'donations' && (
          <DonationsPage
            donations={donations} drugs={drugs}
            loading={loading && !loaded.donations}
            onRefresh={() => loadTab('donations', true)}
            notify={notify}
          />
        )}
        {tab === 'distributions' && (
          <DistributionsPage
            distributions={distributions} drugs={drugs} stocks={stocks}
            loading={loading && !loaded.distributions}
            onRefresh={() => loadTab('distributions', true)}
            notify={notify}
          />
        )}
      </main>
    </div>
  )
}