/**
 * BloodDonationDashboard.jsx
 * نشاط "قطرة حياة" — إدارة التبرع بالدم
 *
 * Design identity ("النبض" — The Pulse):
 *   - Deep ink background with a refined crimson/rose accent (not a generic
 *     dark-admin clone of the Pharmacy dashboard).
 *   - Fraunces (serif, warm) for numbers & headings, Inter for UI/body text.
 *   - A signature droplet-shaped badge represents blood type everywhere,
 *     color-coded by ABO group (rose=A, amber=B, violet=AB, emerald=O).
 *   - A thin animated ECG/heartbeat line runs through the header and the
 *     "total donations" panel — the page's one recurring motif.
 *   - Top pill-tab navigation (not a sidebar) — compact, mobile-friendly,
 *     and visually distinct from the Pharmacy activity's layout.
 *
 * Certificates are generated server-side (PDF, reportlab) and downloaded via
 * GET /certificate/{patient_id}/{donor_id}/ — triggered right after a
 * donation is registered, and on-demand from any row in the history list.
 *
 * API contract:
 *   GET    /donors/                          GET    /patients/
 *   POST   /donors/                          POST   /patients/
 *   PUT    /donors/{id}/                     PUT    /patients/{id}/
 *   DELETE /donors/{id}/                     DELETE /patients/{id}/
 *   GET    /persons/
 *   GET    /patients/with-compatible-donors
 *   POST   /donate/{patientId}/{donorId}/
 *   GET    /certificate/{patientId}/{donorId}/   (binary PDF response)
 *   GET    /dashboard/stats/
 *   GET    /donation-history/
 */

import { useEffect, useState, useMemo, useCallback } from 'react'
import client from '../api/client'

// ─────────────────────────────────────────────────────────────────────────────
// TOKENS & HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  bg:         '#0a0e16',
  surface:    '#12161f',
  surfaceAlt: '#171c27',
  border:     '#232a38',
  rose:       '#e11d48',
  roseSoft:   '#fb7185',
  amber:      '#f5b942',
  emerald:    '#10b981',
  violet:     '#8b5cf6',
  text:       '#f1f5f9',
  textMute:   '#8a93a6',
  textFaint:  '#5b6577',
}

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

// Color encodes the ABO group (rose / amber / violet / emerald); shade encodes Rh.
const BLOOD_COLORS = {
  'A+': '#fb7185', 'A-': '#f43f5e',
  'B+': '#f59e0b', 'B-': '#d97706',
  'AB+': '#a78bfa', 'AB-': '#8b5cf6',
  'O+': '#34d399', 'O-': '#10b981',
}

function unwrap(res) {
  const d = res.data
  return Array.isArray(d) ? d : (d?.results ?? [])
}

function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('ar-DZ', { day: '2-digit', month: 'short', year: 'numeric' })
}

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(s => s[0]).join('').toUpperCase()
}

// Certificates must go through the authenticated axios client (the endpoint
// requires the JWT bearer header), so a plain <a href> won't work — fetch the
// PDF as a blob, then trigger a normal browser download from memory.
async function downloadCertificate(patientId, donorId) {
  const res = await client.get(`/certificate/${patientId}/${donorId}/`, { responseType: 'blob' })
  const blob = new Blob([res.data], { type: 'application/pdf' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `certificate_${patientId}_${donorId}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL STYLES (scoped via .bd-root)
// ─────────────────────────────────────────────────────────────────────────────
function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700;800&display=swap');

      .bd-root{ min-height:100%; background:${T.bg}; color:${T.text}; font-family:'Inter',system-ui,-apple-system,sans-serif; padding-bottom:48px; }
      .bd-root *{ box-sizing:border-box; }
      .bd-root :focus-visible{ outline:2px solid ${T.roseSoft}; outline-offset:2px; }

      /* Header */
      .bd-header{ position:relative; overflow:hidden; background:linear-gradient(180deg, ${T.surfaceAlt} 0%, ${T.bg} 100%); border-bottom:1px solid ${T.border}; }
      .bd-header-inner{ display:flex; align-items:center; justify-content:space-between; gap:20px; padding:22px 26px 26px; flex-wrap:wrap; }
      .bd-brand{ display:flex; align-items:center; gap:14px; }
      .bd-brand-mark{ width:52px; height:52px; border-radius:16px; background:linear-gradient(135deg, ${T.rose}, ${T.roseSoft}); display:flex; align-items:center; justify-content:center; box-shadow:0 10px 24px rgba(225,29,72,.35); flex-shrink:0; }
      .bd-title{ font-family:'Fraunces',Georgia,serif; font-size:23px; font-weight:600; margin:0; color:${T.text}; letter-spacing:.2px; }
      .bd-subtitle{ margin:3px 0 0; font-size:12.5px; color:${T.textMute}; }
      .bd-vitals{ display:flex; align-items:center; gap:10px; }
      .bd-vitals-chips{ display:flex; align-items:center; gap:10px; }
      .bd-vital-chip{ display:flex; align-items:center; gap:8px; background:${T.surface}; border:1px solid ${T.border}; border-radius:12px; padding:8px 14px; }
      .bd-vital-value{ font-family:'Fraunces',Georgia,serif; font-weight:700; font-size:16px; color:${T.text}; line-height:1; }
      .bd-vital-label{ font-size:10.5px; color:${T.textFaint}; margin-top:2px; }
      .bd-ecg{ display:block; width:100%; height:30px; }
      .bd-ecg path{ fill:none; stroke:${T.roseSoft}; stroke-width:2; opacity:.45; stroke-dasharray:10 7; animation:bd-pulse-move 2.2s linear infinite; }
      @keyframes bd-pulse-move{ to{ stroke-dashoffset:-340; } }
      .bd-ecg--inline{ position:absolute; bottom:8px; right:0; left:0; opacity:.55; height:22px; }

      /* Tabs */
      .bd-tabs{ display:flex; gap:6px; padding:10px 20px; overflow-x:auto; scrollbar-width:none; border-bottom:1px solid ${T.border}; background:${T.bg}; }
      .bd-tabs::-webkit-scrollbar{ display:none; }
      .bd-tab{ display:flex; align-items:center; gap:7px; padding:9px 16px; border-radius:11px; border:1px solid transparent; background:transparent; color:${T.textMute}; font-size:13.5px; font-weight:600; cursor:pointer; white-space:nowrap; position:relative; transition:all .15s; font-family:inherit; }
      .bd-tab:hover{ background:${T.surface}; color:${T.text}; }
      .bd-tab--active{ background:${T.surface}; color:${T.text}; border-color:${T.border}; box-shadow:inset 0 -2px 0 ${T.rose}; }
      .bd-tab-dot{ width:7px; height:7px; border-radius:50%; background:${T.emerald}; animation:bd-ping 1.8s ease-out infinite; }
      @keyframes bd-ping{ 0%{ box-shadow:0 0 0 0 rgba(16,185,129,.5); } 70%{ box-shadow:0 0 0 6px rgba(16,185,129,0); } 100%{ box-shadow:0 0 0 0 rgba(16,185,129,0); } }

      /* Content layout */
      .bd-content{ padding:22px 26px 0; }
      .bd-stack{ display:flex; flex-direction:column; gap:20px; }
      .bd-stat-row{ display:flex; gap:14px; flex-wrap:wrap; }
      .bd-stat{ position:relative; display:flex; gap:14px; align-items:center; background:${T.surface}; border:1px solid ${T.border}; border-inline-start:3px solid transparent; border-radius:14px; padding:16px 18px; flex:1; min-width:160px; transition:transform .15s; }
      .bd-stat:hover{ transform:translateY(-2px); }
      .bd-stat-icon{ width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
      .bd-stat-value{ font-family:'Fraunces',Georgia,serif; font-size:26px; font-weight:700; color:${T.text}; line-height:1; }
      .bd-stat-label{ font-size:11.5px; color:${T.textMute}; margin-top:4px; }

      .bd-highlight{ position:relative; overflow:hidden; background:linear-gradient(135deg, ${T.surface}, ${T.surfaceAlt}); border:1px solid ${T.border}; border-radius:16px; padding:36px 24px 44px; text-align:center; }
      .bd-highlight-value{ font-family:'Fraunces',Georgia,serif; font-weight:700; font-size:56px; line-height:1; background:linear-gradient(135deg, ${T.rose}, ${T.amber}); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
      .bd-highlight-label{ color:${T.textMute}; font-size:13.5px; margin-top:10px; }

      .bd-alert{ display:flex; align-items:flex-start; gap:14px; border-radius:14px; padding:16px 18px; border:1px solid; }
      .bd-alert--success{ background:rgba(16,185,129,.07); border-color:rgba(16,185,129,.3); }
      .bd-alert-title{ font-weight:700; color:${T.text}; font-size:14px; }
      .bd-alert-sub{ color:${T.textMute}; font-size:12.5px; margin-top:3px; }

      /* Card / table */
      .bd-card{ background:${T.surface}; border:1px solid ${T.border}; border-radius:16px; overflow:hidden; }
      .bd-card-head{ display:flex; align-items:center; justify-content:space-between; gap:12px; padding:16px 20px; border-bottom:1px solid ${T.border}; flex-wrap:wrap; }
      .bd-card-title{ font-weight:700; font-size:14.5px; color:${T.text}; }
      .bd-toolbar{ display:flex; align-items:center; gap:9px; flex-wrap:wrap; }
      .bd-table-scroll{ overflow-x:auto; }
      .bd-table{ width:100%; border-collapse:collapse; font-size:13px; }
      .bd-table thead tr{ background:${T.surfaceAlt}; }
      .bd-table th{ padding:11px 16px; text-align:right; font-weight:600; font-size:10.5px; text-transform:uppercase; letter-spacing:.5px; color:${T.textFaint}; white-space:nowrap; }
      .bd-table td{ padding:13px 16px; color:#cbd5e1; vertical-align:middle; text-align:right; }
      .bd-table tbody tr{ border-top:1px solid ${T.border}; transition:background .15s; }
      .bd-table tbody tr:hover{ background:${T.surfaceAlt}; }

      .bd-row-name{ display:flex; align-items:center; gap:10px; }
      .bd-row-sub{ color:${T.textFaint}; font-size:11px; margin-top:1px; }
      .bd-row-actions{ display:flex; gap:6px; justify-content:flex-end; }
      .bd-muted{ color:${T.textMute}; }
      .bd-muted-sm{ color:${T.textFaint}; font-size:11.5px; }

      .bd-avatar{ width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:800; border:1px solid; flex-shrink:0; }

      /* Loading / empty */
      .bd-loading{ display:flex; align-items:center; justify-content:center; gap:8px; padding:54px 0; color:${T.textMute}; font-size:13px; }
      .bd-loading-dot{ width:7px; height:7px; border-radius:50%; background:${T.rose}; animation:bd-blink 1.1s ease-in-out infinite; }
      .bd-loading-dot:nth-child(2){ animation-delay:.15s; }
      .bd-loading-dot:nth-child(3){ animation-delay:.3s; }
      @keyframes bd-blink{ 0%,80%,100%{ opacity:.25; transform:scale(.85); } 40%{ opacity:1; transform:scale(1); } }
      .bd-empty{ display:flex; flex-direction:column; align-items:center; gap:10px; padding:54px 0; }
      .bd-empty-title{ color:${T.textMute}; font-size:13.5px; }
      .bd-empty-hint{ color:${T.textFaint}; font-size:12px; }

      /* Badges */
      .bd-badge{ display:inline-flex; align-items:center; gap:4px; padding:3px 11px; border-radius:999px; font-size:11.5px; font-weight:700; border:1px solid transparent; white-space:nowrap; }
      .bd-droplet-badge{ display:inline-flex; align-items:center; gap:6px; }
      .bd-droplet-badge b{ font-size:12.5px; font-weight:800; color:${T.text}; letter-spacing:.3px; }

      /* Forms */
      .bd-form{ display:flex; flex-direction:column; gap:16px; }
      .bd-form-grid{ display:grid; grid-template-columns:1fr 1fr; gap:14px; }
      .bd-field{ display:flex; flex-direction:column; gap:6px; }
      .bd-field label{ font-size:12px; font-weight:600; color:${T.textMute}; letter-spacing:.3px; }
      .bd-req{ color:${T.rose}; margin-right:3px; }
      .bd-hint{ font-size:11px; color:${T.textFaint}; }
      .bd-input,.bd-select,.bd-textarea{ background:${T.bg}; border:1px solid ${T.border}; border-radius:10px; color:${T.text}; padding:10px 13px; font-size:14px; width:100%; box-sizing:border-box; text-align:right; outline:none; font-family:inherit; transition:border-color .15s, box-shadow .15s; }
      .bd-textarea{ resize:vertical; }
      .bd-input:focus,.bd-select:focus,.bd-textarea:focus{ border-color:${T.rose}; box-shadow:0 0 0 3px rgba(225,29,72,.15); }
      .bd-checkbox-row{ display:flex; align-items:center; gap:9px; color:${T.textMute}; font-size:13px; cursor:pointer; }
      .bd-error{ color:#fca5a5; font-size:13px; background:rgba(225,29,72,.1); padding:9px 13px; border-radius:9px; border:1px solid rgba(225,29,72,.25); }
      .bd-form-actions{ display:flex; gap:10px; justify-content:flex-start; margin-top:2px; }

      .bd-search{ position:relative; display:flex; align-items:center; min-width:200px; }
      .bd-search svg{ position:absolute; right:11px; pointer-events:none; }
      .bd-search input{ background:${T.bg}; border:1px solid ${T.border}; border-radius:10px; color:${T.text}; padding:9px 34px 9px 13px; font-size:13.5px; width:100%; outline:none; text-align:right; font-family:inherit; transition:border-color .15s; }
      .bd-search input:focus{ border-color:${T.rose}; }

      /* Buttons */
      .bd-btn{ display:inline-flex; align-items:center; gap:6px; border:none; border-radius:10px; padding:10px 18px; font-size:13.5px; font-weight:700; cursor:pointer; font-family:inherit; transition:transform .12s, opacity .15s, box-shadow .15s; }
      .bd-btn:disabled{ opacity:.55; cursor:not-allowed; }
      .bd-btn:not(:disabled):hover{ transform:translateY(-1px); }
      .bd-btn--sm{ padding:7px 13px; font-size:12.5px; border-radius:8px; }
      .bd-btn--primary{ background:linear-gradient(135deg, ${T.rose}, #be123c); color:#fff; box-shadow:0 6px 16px rgba(225,29,72,.3); }
      .bd-btn--accent{ background:linear-gradient(135deg, ${T.violet}, #7c3aed); color:#fff; box-shadow:0 6px 16px rgba(139,92,246,.25); }
      .bd-btn--ghost{ background:${T.surfaceAlt}; color:${T.textMute}; }
      .bd-btn--danger{ background:rgba(225,29,72,.15); color:#fca5a5; border:1px solid rgba(225,29,72,.3); }

      .bd-icon-btn{ width:32px; height:32px; display:inline-flex; align-items:center; justify-content:center; border-radius:9px; border:1px solid ${T.border}; background:${T.surfaceAlt}; color:${T.textMute}; cursor:pointer; transition:all .15s; flex-shrink:0; }
      .bd-icon-btn:hover{ color:${T.text}; border-color:${T.textMute}; }
      .bd-icon-btn--danger:hover{ color:#fca5a5; border-color:rgba(225,29,72,.4); background:rgba(225,29,72,.1); }
      .bd-icon-btn--ghost-light{ background:transparent; }

      /* Modal */
      .bd-modal-backdrop{ position:fixed; inset:0; background:rgba(5,7,12,.7); backdrop-filter:blur(2px); display:flex; align-items:center; justify-content:center; z-index:1000; padding:16px; animation:bd-fade .15s ease; }
      .bd-modal{ position:relative; background:${T.surface}; border:1px solid ${T.border}; border-radius:18px; width:100%; max-width:480px; max-height:90vh; overflow:hidden; display:flex; flex-direction:column; animation:bd-modal-in .18s ease; }
      .bd-modal--wide{ max-width:720px; }
      .bd-modal-accent{ height:3px; background:linear-gradient(90deg, ${T.rose}, ${T.amber}); flex-shrink:0; }
      .bd-modal-header{ display:flex; align-items:center; justify-content:space-between; padding:16px 22px; border-bottom:1px solid ${T.border}; flex-shrink:0; }
      .bd-modal-title{ font-weight:700; font-size:15.5px; color:${T.text}; }
      .bd-modal-close{ background:none; border:none; color:${T.textMute}; cursor:pointer; display:flex; }
      .bd-modal-body{ padding:20px 22px; overflow-y:auto; }
      .bd-confirm-msg{ color:${T.textMute}; font-size:13.5px; line-height:1.6; margin:0 0 18px; }
      @keyframes bd-fade{ from{ opacity:0; } }
      @keyframes bd-modal-in{ from{ opacity:0; transform:translateY(8px) scale(.98); } }

      /* Toast */
      .bd-toast{ position:fixed; top:20px; left:50%; transform:translateX(-50%); display:flex; align-items:center; gap:9px; background:${T.surface}; border:1px solid ${T.border}; color:${T.text}; border-radius:12px; padding:11px 18px; font-weight:600; font-size:13.5px; z-index:9999; box-shadow:0 14px 34px rgba(0,0,0,.5); animation:bd-toast-in .2s ease; }
      .bd-toast--success .bd-toast-icon{ color:${T.emerald}; }
      .bd-toast--error .bd-toast-icon{ color:${T.rose}; }
      .bd-toast-icon{ display:flex; }
      @keyframes bd-toast-in{ from{ opacity:0; transform:translate(-50%,-10px); } }

      /* Matching */
      .bd-match-card{ background:${T.surface}; border:1px solid ${T.border}; border-radius:16px; overflow:hidden; }
      .bd-match-head{ display:flex; align-items:center; gap:14px; padding:16px 20px; background:${T.surfaceAlt}; border-bottom:1px solid ${T.border}; flex-wrap:wrap; }
      .bd-match-info{ flex:1; min-width:0; }
      .bd-match-name{ font-weight:700; color:${T.text}; font-size:14.5px; }
      .bd-match-sub{ color:${T.textFaint}; font-size:11.5px; margin-top:2px; }
      .bd-match-body{ padding:14px 20px 18px; }
      .bd-match-caption{ font-size:11px; font-weight:600; color:${T.textFaint}; text-transform:uppercase; letter-spacing:.5px; margin-bottom:10px; }
      .bd-match-list{ display:flex; flex-direction:column; gap:8px; }
      .bd-match-row{ display:flex; align-items:center; gap:12px; background:${T.surfaceAlt}; border:1px solid ${T.border}; border-radius:10px; padding:10px 14px; flex-wrap:wrap; }
      .bd-match-donor-info{ flex:1; min-width:0; display:flex; flex-direction:column; }
      .bd-match-donor-name{ color:${T.text}; font-weight:600; font-size:13px; }
      .bd-match-donor-meta{ color:${T.textFaint}; font-size:11px; }

      .bd-donate-confirm{ display:flex; align-items:center; justify-content:center; gap:22px; padding:6px 0 18px; flex-wrap:wrap; }
      .bd-donate-side{ display:flex; flex-direction:column; align-items:center; gap:8px; }
      .bd-donate-label{ font-size:11px; color:${T.textFaint}; text-transform:uppercase; letter-spacing:.5px; }
      .bd-donate-name{ font-weight:700; color:${T.text}; font-size:13.5px; }

      @media (max-width: 720px){
        .bd-header-inner{ padding:18px 18px 22px; }
        .bd-content{ padding:18px 16px 0; }
        .bd-vitals-chips{ display:none; }
        .bd-form-grid{ grid-template-columns:1fr; }
        .bd-highlight-value{ font-size:40px; }
      }

      @media (prefers-reduced-motion: reduce){
        .bd-ecg path, .bd-loading-dot, .bd-tab-dot{ animation:none !important; }
      }
    `}</style>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ICONS
// ─────────────────────────────────────────────────────────────────────────────
function Icon({ name, size = 18, color = 'currentColor', strokeWidth = 2 }) {
  const c = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (name) {
    case 'pulse':
      return <svg {...c}><polyline points="2,12 7,12 10,4 14,20 17,12 22,12" /></svg>
    case 'heart':
      return <svg {...c}><path d="M12 21s-7.5-4.6-10-9.3C.5 8 2 4 6 4c2 0 3.5 1.2 4 2.4C10.5 5.2 12 4 14 4c4 0 5.5 4 4 7.7C19.5 16.4 12 21 12 21z" /></svg>
    case 'hospital':
      return <svg {...c}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M12 8v6M9 11h6" /><path d="M9 21v-3a1 1 0 011-1h4a1 1 0 011 1v3" /></svg>
    case 'link':
      return <svg {...c}><path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1" /><path d="M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" /></svg>
    case 'history':
      return <svg {...c}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l4 2" /></svg>
    case 'search':
      return <svg {...c}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
    case 'plus':
      return <svg {...c}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
    case 'close':
      return <svg {...c}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
    case 'check':
      return <svg {...c}><polyline points="20,6 9,17 4,12" /></svg>
    case 'alert':
      return <svg {...c}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
    case 'refresh':
      return <svg {...c}><path d="M21 12a9 9 0 10-3 6.7" /><polyline points="21,4 21,12 13,12" /></svg>
    case 'edit':
      return <svg {...c}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>
    case 'trash':
      return <svg {...c}><polyline points="3,6 5,6 21,6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" /></svg>
    case 'download':
      return <svg {...c}><path d="M12 3v12" /><polyline points="7,10 12,15 17,10" /><path d="M5 21h14" /></svg>
    default:
      return null
  }
}

function Drop({ color = T.rose, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M12 2C9.6 6 5 11.7 5 15.6A7 7 0 0019 15.6C19 11.7 14.4 6 12 2Z" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SMALL UI ATOMS
// ─────────────────────────────────────────────────────────────────────────────
function Avatar({ name, color }) {
  const c = color || T.textMute
  return (
    <span className="bd-avatar" style={{ background: `${c}22`, color: c, borderColor: `${c}44` }}>
      {initials(name) || '؟'}
    </span>
  )
}

function DropletBadge({ type, size = 26 }) {
  if (!type) return <span className="bd-muted-sm">—</span>
  const color = BLOOD_COLORS[type] || T.textMute
  return (
    <span className="bd-droplet-badge">
      <Drop color={color} size={size} />
      <b>{type}</b>
    </span>
  )
}

function Badge({ children, color = T.textMute, bg }) {
  return (
    <span className="bd-badge" style={{ color, background: bg || `${color}1f`, borderColor: `${color}40` }}>
      {children}
    </span>
  )
}

function StatusPill({ eligible }) {
  return eligible
    ? <Badge color={T.emerald}><Icon name="check" size={11} /> مؤهل</Badge>
    : <Badge color={T.amber}><Icon name="alert" size={11} /> يحتاج راحة</Badge>
}

function ApprovedPill({ approved }) {
  return approved
    ? <Badge color={T.emerald}>معتمد</Badge>
    : <Badge color={T.rose}>بانتظار الاعتماد</Badge>
}

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3800); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`bd-toast bd-toast--${type}`} role="status">
      <span className="bd-toast-icon"><Icon name={type === 'success' ? 'check' : 'alert'} size={16} /></span>
      <span>{msg}</span>
    </div>
  )
}

function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const h = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="bd-modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`bd-modal ${wide ? 'bd-modal--wide' : ''}`} role="dialog" aria-modal="true">
        <div className="bd-modal-accent" />
        <div className="bd-modal-header">
          <span className="bd-modal-title">{title}</span>
          <button type="button" className="bd-modal-close" onClick={onClose} aria-label="إغلاق">
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="bd-modal-body">{children}</div>
      </div>
    </div>
  )
}

function ConfirmDialog({ title, message, confirmLabel = 'حذف', danger, onConfirm, onCancel, loading }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="bd-confirm-msg">{message}</p>
      <div className="bd-form-actions">
        <button className="bd-btn bd-btn--ghost" onClick={onCancel} disabled={loading}>إلغاء</button>
        <button className={`bd-btn ${danger ? 'bd-btn--danger' : 'bd-btn--primary'}`} onClick={onConfirm} disabled={loading}>
          {loading ? 'جارٍ التنفيذ…' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

function Field({ label, required, hint, children }) {
  return (
    <div className="bd-field">
      <label>{label}{required && <span className="bd-req">*</span>}</label>
      {children}
      {hint && <span className="bd-hint">{hint}</span>}
    </div>
  )
}

function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="bd-search">
      <Icon name="search" size={14} color={T.textFaint} />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || 'بحث…'} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PERSON SEARCH SELECT
// ─────────────────────────────────────────────────────────────────────────────
function PersonSearchSelect({ persons, value, onChange, excludeIds = [] }) {
  const [query, setQuery] = useState('')
  const [open, setOpen]   = useState(false)

  const pool = useMemo(
    () => excludeIds.length ? persons.filter(p => !excludeIds.includes(p.id)) : persons,
    [persons, excludeIds]
  )

  const selected = useMemo(() => pool.find(p => String(p.id) === String(value)), [pool, value])

  const label = p => {
    const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()
    return p.phone ? `${name} (${p.phone})` : name
  }

  const results = useMemo(() => {
    if (query.length < 1) return pool.slice(0, 30)
    const q = query.toLowerCase()
    return pool.filter(p => {
      const fullName = `${p.first_name ?? ''} ${p.last_name ?? ''}`.toLowerCase()
      const phone = (p.phone ?? '').toLowerCase()
      const nin = (p.nin ?? '').toLowerCase()
      return fullName.includes(q) || phone.includes(q) || nin.includes(q)
    }).slice(0, 30)
  }, [pool, query])

  function pick(p)  { onChange(String(p.id)); setQuery(''); setOpen(false) }
  function clear(e) { e.stopPropagation(); onChange(''); setQuery(''); setOpen(false) }

  return (
    <div style={{ position: 'relative' }}>
      {selected && !open ? (
        <div
          onClick={() => setOpen(true)}
          className="bd-input"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        >
          <span>{label(selected)}</span>
          <span onClick={clear} style={{ color: T.textMute, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</span>
        </div>
      ) : (
        <input
          autoFocus={open}
          className="bd-input"
          placeholder="ابحث بالاسم أو الهاتف أو رقم التعريف…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
        />
      )}
      {open && (
        <div
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 40, marginTop: 4,
            background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10,
            maxHeight: 220, overflowY: 'auto', boxShadow: '0 12px 30px rgba(0,0,0,.45)',
          }}
        >
          {results.length === 0
            ? <div style={{ padding: '12px 15px', color: T.textMute, fontSize: 12.5 }}>لا توجد نتائج{query ? ` لـ "${query}"` : ''}</div>
            : results.map(p => (
              <div
                key={p.id}
                onMouseDown={() => pick(p)}
                style={{ padding: '10px 15px', cursor: 'pointer', fontSize: 13, borderBottom: `1px solid ${T.border}` }}
                onMouseEnter={e => (e.currentTarget.style.background = T.surfaceAlt)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {label(p)}
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}

function PulseLoader({ label = 'جارٍ التحميل…' }) {
  return (
    <div className="bd-loading">
      <span className="bd-loading-dot" />
      <span className="bd-loading-dot" />
      <span className="bd-loading-dot" />
      <span>{label}</span>
    </div>
  )
}

function EmptyState({ title, hint }) {
  return (
    <div className="bd-empty">
      <Drop color={T.border} size={42} />
      <div className="bd-empty-title">{title}</div>
      {hint && <div className="bd-empty-hint">{hint}</div>}
    </div>
  )
}

function TableWrap({ children, title, toolbar, empty, loading }) {
  return (
    <div className="bd-card">
      {(title || toolbar) && (
        <div className="bd-card-head">
          {title && <span className="bd-card-title">{title}</span>}
          {toolbar}
        </div>
      )}
      {loading ? (
        <PulseLoader />
      ) : empty ? (
        <EmptyState title={empty} />
      ) : (
        <div className="bd-table-scroll">{children}</div>
      )}
    </div>
  )
}

function Table({ head, rows }) {
  return (
    <table className="bd-table">
      <thead>
        <tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
        ))}
      </tbody>
    </table>
  )
}

function StatPulse({ label, value, icon, accent }) {
  return (
    <div className="bd-stat" style={{ borderInlineStartColor: accent }}>
      <div className="bd-stat-icon" style={{ background: `${accent}22` }}>
        <Icon name={icon} size={20} color={accent} />
      </div>
      <div>
        <div className="bd-stat-value">{value ?? '—'}</div>
        <div className="bd-stat-label">{label}</div>
      </div>
    </div>
  )
}

function VitalChip({ label, value, icon }) {
  return (
    <div className="bd-vital-chip">
      <Icon name={icon} size={15} color={T.roseSoft} />
      <div>
        <div className="bd-vital-value">{value ?? '—'}</div>
        <div className="bd-vital-label">{label}</div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
function DashboardTab({ stats, loading }) {
  if (loading) return <div className="bd-card"><PulseLoader /></div>
  if (!stats) return null

  return (
    <div className="bd-stack">
      <div className="bd-stat-row">
        <StatPulse label="إجمالي المتبرعين"     value={stats.donors_total}           icon="heart"    accent={T.rose} />
        <StatPulse label="متبرعون معتمدون"        value={stats.donors_approved}        icon="check"    accent={T.emerald} />
        <StatPulse label="مؤهلون للتبرع الآن"     value={stats.donors_eligible_now}    icon="pulse"    accent={T.roseSoft} />
        <StatPulse label="إجمالي المرضى"          value={stats.patients_total}         icon="hospital" accent={T.violet} />
        <StatPulse label="مرضى نشطون"             value={stats.patients_active}        icon="hospital" accent={T.amber} />
        <StatPulse label="تبرعات هذا الشهر"       value={stats.donations_last_30_days} icon="history"  accent={T.emerald} />
      </div>

      <div className="bd-highlight">
        <div className="bd-highlight-value">{stats.donations_total}</div>
        <div className="bd-highlight-label">عملية تبرع بالدم منذ بداية النشاط</div>
        <svg className="bd-ecg bd-ecg--inline" viewBox="0 0 600 30" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 15 H180 L194 15 L206 2 L220 28 L233 8 L246 24 L260 15 H600" />
        </svg>
      </div>

      {stats.donors_eligible_now > 0 && (
        <div className="bd-alert bd-alert--success">
          <Icon name="heart" size={22} color={T.emerald} />
          <div>
            <div className="bd-alert-title">{stats.donors_eligible_now} متبرع مؤهل للتبرع الآن</div>
            <div className="bd-alert-sub">انتقل إلى تبويب المطابقة لربط المتبرعين بالمرضى المحتاجين.</div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: DONORS
// ══════════════════════════════════════════════════════════════════════════════
function DonorsTab({ notify }) {
  const [donors, setDonors] = useState([])
  const [persons, setPersons] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterBlood, setFilterBlood] = useState('')
  const [filterApproved, setFilterApproved] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const emptyForm = { person: '', blood_type: '', date_last_donation: '', is_approved: false, description: '' }
  const [form, setForm] = useState(emptyForm)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [d, p] = await Promise.all([
      client.get('/donors/').catch(e => { console.error('/donors/', e); return null }),
      client.get('/persons/').catch(e => { console.error('/persons/', e); return null }),
    ])
    if (d) setDonors(unwrap(d))
    if (p) setPersons(unwrap(p))
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  function openAdd() { setEditing(null); setForm(emptyForm); setErr(''); setModal(true) }
  function openEdit(d) {
    setEditing(d)
    setForm({
      person: String(d.person),
      blood_type: d.blood_type || '',
      date_last_donation: d.date_last_donation || '',
      is_approved: d.is_approved,
      description: d.description || '',
    })
    setErr(''); setModal(true)
  }

  async function save() {
    if (!form.person) { setErr('يجب اختيار الشخص'); return }
    setSaving(true); setErr('')
    const payload = {
      person: +form.person,
      blood_type: form.blood_type || null,
      date_last_donation: form.date_last_donation || null,
      is_approved: form.is_approved,
      description: form.description || '',
    }
    try {
      if (editing) await client.put(`/donors/${editing.id}/`, payload)
      else await client.post('/donors/', payload)
      setModal(false); fetchAll()
      notify(editing ? 'تم تحديث المتبرع.' : 'تمت إضافة المتبرع.', 'success')
    } catch (e) { setErr(JSON.stringify(e.response?.data || 'خطأ')) }
    finally { setSaving(false) }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await client.delete(`/donors/${deleteTarget.id}/`)
      setDeleteTarget(null); fetchAll()
      notify('تم حذف المتبرع.', 'success')
    } catch { notify('لا يمكن الحذف: توجد سجلات تبرع مرتبطة.', 'error') }
    finally { setDeleting(false) }
  }

  const filtered = useMemo(() => donors.filter(d => {
    const q = search.toLowerCase()
    const nameMatch = !q || d.person_name?.toLowerCase().includes(q) || d.person_nin?.includes(q)
    const bloodMatch = !filterBlood || d.blood_type === filterBlood
    const approvedMatch = filterApproved === '' || String(d.is_approved) === filterApproved
    return nameMatch && bloodMatch && approvedMatch
  }), [donors, search, filterBlood, filterApproved])

  return (
    <div className="bd-stack">
      <TableWrap
        title={`المتبرعون (${donors.length})`}
        toolbar={
          <div className="bd-toolbar">
            <SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم أو رقم التعريف…" />
            <select className="bd-select" value={filterBlood} onChange={e => setFilterBlood(e.target.value)}>
              <option value="">كل الزمر</option>
              {BLOOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className="bd-select" value={filterApproved} onChange={e => setFilterApproved(e.target.value)}>
              <option value="">الكل</option>
              <option value="true">معتمدون</option>
              <option value="false">غير معتمدين</option>
            </select>
            <button className="bd-btn bd-btn--primary bd-btn--sm" onClick={openAdd}>
              <Icon name="plus" size={14} /> إضافة متبرع
            </button>
          </div>
        }
        loading={loading}
        empty={filtered.length === 0 ? 'لا يوجد متبرعون بهذا الفلتر.' : null}
      >
        <Table
          head={['المتبرع', 'الزمرة', 'آخر تبرع', 'الحالة', 'الاعتماد', '']}
          rows={filtered.map(d => [
            <div className="bd-row-name">
              <Avatar name={d.person_name} color={BLOOD_COLORS[d.blood_type] || T.textMute} />
              <div>
                <strong>{d.person_name}</strong>
                <div className="bd-row-sub">{d.person_nin || '—'}</div>
              </div>
            </div>,
            <DropletBadge type={d.blood_type} />,
            <span className="bd-muted">{fmt(d.date_last_donation)}</span>,
            <StatusPill eligible={d.can_donate} />,
            <ApprovedPill approved={d.is_approved} />,
            <div className="bd-row-actions">
              <button className="bd-icon-btn" title="تعديل" aria-label="تعديل" onClick={() => openEdit(d)}><Icon name="edit" size={14} /></button>
              <button className="bd-icon-btn bd-icon-btn--danger" title="حذف" aria-label="حذف" onClick={() => setDeleteTarget(d)}><Icon name="trash" size={14} /></button>
            </div>,
          ])}
        />
      </TableWrap>

      {modal && (
        <Modal title={editing ? 'تعديل متبرع' : 'إضافة متبرع جديد'} onClose={() => setModal(false)}>
          <div className="bd-form">
            <Field label="الشخص" required>
              <PersonSearchSelect
                persons={persons}
                value={form.person}
                onChange={v => setForm({ ...form, person: v })}
              />
            </Field>
            <div className="bd-form-grid">
              <Field label="فصيلة الدم">
                <select className="bd-select" value={form.blood_type} onChange={e => setForm({ ...form, blood_type: e.target.value })}>
                  <option value="">— غير محدد —</option>
                  {BLOOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="تاريخ آخر تبرع">
                <input type="date" className="bd-input" value={form.date_last_donation} onChange={e => setForm({ ...form, date_last_donation: e.target.value })} />
              </Field>
            </div>
            <Field label="ملاحظات">
              <textarea className="bd-textarea" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="حالة صحية، موانع، ملاحظات…" />
            </Field>
            <label className="bd-checkbox-row">
              <input type="checkbox" checked={form.is_approved} onChange={e => setForm({ ...form, is_approved: e.target.checked })} />
              متبرع معتمد (قابل للمشاركة في التبرع)
            </label>
            {err && <div className="bd-error">{err}</div>}
            <div className="bd-form-actions">
              <button className="bd-btn bd-btn--ghost" onClick={() => setModal(false)}>إلغاء</button>
              <button className="bd-btn bd-btn--primary" onClick={save} disabled={saving}>
                {saving ? 'جارٍ الحفظ…' : editing ? 'تحديث المتبرع' : 'إضافة المتبرع'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="تأكيد الحذف"
          message={`حذف المتبرع "${deleteTarget.person_name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
          danger
          loading={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: PATIENTS
// ══════════════════════════════════════════════════════════════════════════════
function PatientsTab({ notify }) {
  const [patients, setPatients] = useState([])
  const [persons, setPersons] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterBlood, setFilterBlood] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const emptyForm = { person: '', blood_type: '', hospital_name: '', description: '', is_active: true }
  const [form, setForm] = useState(emptyForm)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [pt, p] = await Promise.all([
      client.get('/patients/').catch(e => { console.error('/patients/', e); return null }),
      client.get('/persons/').catch(e => { console.error('/persons/', e); return null }),
    ])
    if (pt) setPatients(unwrap(pt))
    if (p) setPersons(unwrap(p))
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  function openAdd() { setEditing(null); setForm(emptyForm); setErr(''); setModal(true) }
  function openEdit(p) {
    setEditing(p)
    setForm({
      person: String(p.person),
      blood_type: p.blood_type || '',
      hospital_name: p.hospital_name || '',
      description: p.description || '',
      is_active: p.is_active,
    })
    setErr(''); setModal(true)
  }

  async function save() {
    if (!form.person) { setErr('يجب اختيار الشخص'); return }
    setSaving(true); setErr('')
    const payload = {
      person: +form.person,
      blood_type: form.blood_type || null,
      hospital_name: form.hospital_name || '',
      description: form.description || '',
      is_active: form.is_active,
    }
    try {
      if (editing) await client.put(`/patients/${editing.id}/`, payload)
      else await client.post('/patients/', payload)
      setModal(false); fetchAll()
      notify(editing ? 'تم تحديث المريض.' : 'تمت إضافة المريض.', 'success')
    } catch (e) { setErr(JSON.stringify(e.response?.data || 'خطأ')) }
    finally { setSaving(false) }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await client.delete(`/patients/${deleteTarget.id}/`)
      setDeleteTarget(null); fetchAll()
      notify('تم حذف المريض.', 'success')
    } catch { notify('لا يمكن الحذف: توجد سجلات تبرع مرتبطة.', 'error') }
    finally { setDeleting(false) }
  }

  const filtered = useMemo(() => patients.filter(p => {
    const q = search.toLowerCase()
    const nameMatch = !q || p.person_name?.toLowerCase().includes(q) || p.person_nin?.includes(q)
    const bloodMatch = !filterBlood || p.blood_type === filterBlood
    return nameMatch && bloodMatch
  }), [patients, search, filterBlood])

  return (
    <div className="bd-stack">
      <TableWrap
        title={`المرضى (${patients.length})`}
        toolbar={
          <div className="bd-toolbar">
            <SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم أو رقم التعريف…" />
            <select className="bd-select" value={filterBlood} onChange={e => setFilterBlood(e.target.value)}>
              <option value="">كل الزمر</option>
              {BLOOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button className="bd-btn bd-btn--accent bd-btn--sm" onClick={openAdd}>
              <Icon name="plus" size={14} /> إضافة مريض
            </button>
          </div>
        }
        loading={loading}
        empty={filtered.length === 0 ? 'لا يوجد مرضى مسجلون.' : null}
      >
        <Table
          head={['المريض', 'الزمرة', 'المستشفى', 'الحالة', '']}
          rows={filtered.map(p => [
            <div className="bd-row-name">
              <Avatar name={p.person_name} color={BLOOD_COLORS[p.blood_type] || T.textMute} />
              <div>
                <strong>{p.person_name}</strong>
                <div className="bd-row-sub">{p.person_nin || '—'}</div>
              </div>
            </div>,
            <DropletBadge type={p.blood_type} />,
            <span className="bd-muted">{p.hospital_name || '—'}</span>,
            p.is_active
              ? <Badge color={T.emerald}>نشط</Badge>
              : <Badge color={T.textMute}>غير نشط</Badge>,
            <div className="bd-row-actions">
              <button className="bd-icon-btn" title="تعديل" aria-label="تعديل" onClick={() => openEdit(p)}><Icon name="edit" size={14} /></button>
              <button className="bd-icon-btn bd-icon-btn--danger" title="حذف" aria-label="حذف" onClick={() => setDeleteTarget(p)}><Icon name="trash" size={14} /></button>
            </div>,
          ])}
        />
      </TableWrap>

      {modal && (
        <Modal title={editing ? 'تعديل مريض' : 'إضافة مريض جديد'} onClose={() => setModal(false)}>
          <div className="bd-form">
            <Field label="الشخص" required>
              <PersonSearchSelect
                persons={persons}
                value={form.person}
                onChange={v => setForm({ ...form, person: v })}/>
            </Field>
            <div className="bd-form-grid">
              <Field label="فصيلة الدم">
                <select className="bd-select" value={form.blood_type} onChange={e => setForm({ ...form, blood_type: e.target.value })}>
                  <option value="">— غير محدد —</option>
                  {BLOOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="اسم المستشفى">
                <input className="bd-input" value={form.hospital_name} onChange={e => setForm({ ...form, hospital_name: e.target.value })} placeholder="مستشفى…" />
              </Field>
            </div>
            <Field label="ملاحظات">
              <textarea className="bd-textarea" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="حالة المريض، تفاصيل…" />
            </Field>
            <label className="bd-checkbox-row">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
              مريض نشط (يظهر في قائمة المطابقة)
            </label>
            {err && <div className="bd-error">{err}</div>}
            <div className="bd-form-actions">
              <button className="bd-btn bd-btn--ghost" onClick={() => setModal(false)}>إلغاء</button>
              <button className="bd-btn bd-btn--accent" onClick={save} disabled={saving}>
                {saving ? 'جارٍ الحفظ…' : editing ? 'تحديث المريض' : 'إضافة المريض'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="تأكيد الحذف"
          message={`حذف المريض "${deleteTarget.person_name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
          danger
          loading={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: MATCHING
// ══════════════════════════════════════════════════════════════════════════════
function MatchingTab({ notify }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [donating, setDonating] = useState(null)
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [completed, setCompleted] = useState(null)
  const [downloadingCert, setDownloadingCert] = useState(false)
  const [search, setSearch] = useState('')
  const [filterBlood, setFilterBlood] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await client.get('/patients/with-compatible-donors')
      setData(Array.isArray(res.data) ? res.data : [])
    } catch (e) {
      console.error(e)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function donate(patient, donor) {
    setDonating({ patientId: patient.id, donorId: donor.id })
    try {
      await client.post(`/donate/${patient.id}/${donor.id}/`)
      notify('تم تسجيل التبرع بنجاح.', 'success')
      setConfirmTarget(null)
      setCompleted({ patient, donor })
      fetchData()
    } catch (e) {
      const msg = e.response?.data?.error || 'حدث خطأ أثناء تسجيل التبرع.'
      notify(msg, 'error')
      setConfirmTarget(null)
    } finally { setDonating(null) }
  }

  async function handleDownload(patientId, donorId) {
    setDownloadingCert(true)
    try {
      await downloadCertificate(patientId, donorId)
    } catch (e) {
      notify('تعذر توليد الشهادة. تحقّق من صلاحياتك وحاول مرة أخرى.', 'error')
    } finally { setDownloadingCert(false) }
  }

  const filtered = useMemo(() => data.filter(item => {
    const q = search.toLowerCase()
    const nameMatch = !q || item.patient?.person_name?.toLowerCase().includes(q)
    const bloodMatch = !filterBlood || item.patient?.blood_type === filterBlood
    return nameMatch && bloodMatch
  }), [data, search, filterBlood])

  return (
    <div className="bd-stack">
      <div className="bd-toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="بحث باسم المريض…" />
        <select className="bd-select" value={filterBlood} onChange={e => setFilterBlood(e.target.value)}>
          <option value="">كل الزمر</option>
          {BLOOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button className="bd-icon-btn" title="تحديث" aria-label="تحديث" onClick={fetchData}><Icon name="refresh" size={15} /></button>
        <span className="bd-muted-sm">{filtered.length} مريض</span>
      </div>

      {loading ? (
        <div className="bd-card"><PulseLoader /></div>
      ) : filtered.length === 0 ? (
        <div className="bd-card"><EmptyState title="لا توجد نتائج." /></div>
      ) : filtered.map(({ patient, donors }) => (
        <div className="bd-match-card" key={patient.id}>
          <div className="bd-match-head">
            <Avatar name={patient.person_name} color={BLOOD_COLORS[patient.blood_type] || T.textMute} />
            <div className="bd-match-info">
              <div className="bd-match-name">{patient.person_name}</div>
              <div className="bd-match-sub">
                {patient.hospital_name ? `${patient.hospital_name} · ` : ''}{patient.person_nin || ''}
              </div>
            </div>
            <DropletBadge type={patient.blood_type} />
            {patient.is_active
              ? <Badge color={T.emerald}>نشط</Badge>
              : <Badge color={T.textMute}>غير نشط</Badge>}
          </div>

          <div className="bd-match-body">
            <div className="bd-match-caption">
              {donors.length > 0 ? `${donors.length} متبرع متوافق` : 'لا يوجد متبرع متوافق حالياً'}
            </div>
            {donors.length > 0 ? (
              <div className="bd-match-list">
                {donors.map(donor => (
                  <div className="bd-match-row" key={donor.id}>
                    <DropletBadge type={donor.blood_type} size={22} />
                    <div className="bd-match-donor-info">
                      <span className="bd-match-donor-name">{donor.person_name}</span>
                      <span className="bd-match-donor-meta">
                        {donor.person_nin}{donor.date_last_donation ? ` · آخر تبرع ${fmt(donor.date_last_donation)}` : ''}
                      </span>
                    </div>
                    <StatusPill eligible={donor.can_donate} />
                    {donor.can_donate ? (
                      <button
                        className="bd-btn bd-btn--primary bd-btn--sm"
                        onClick={() => setConfirmTarget({ patient, donor })}
                        disabled={!!donating}
                      >
                        <Icon name="heart" size={13} /> تسجيل تبرع
                      </button>
                    ) : (
                      <span className="bd-muted-sm">يحتاج 90 يوماً</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bd-muted">لا يوجد متبرع بالزمرة {patient.blood_type} مؤهل في الوقت الحالي.</div>
            )}
          </div>
        </div>
      ))}

      {confirmTarget && (
        <Modal title="تأكيد تسجيل التبرع" onClose={() => !donating && setConfirmTarget(null)}>
          <div className="bd-donate-confirm">
            <div className="bd-donate-side">
              <div className="bd-donate-label">المتبرع</div>
              <Avatar name={confirmTarget.donor.person_name} color={BLOOD_COLORS[confirmTarget.donor.blood_type] || T.textMute} />
              <div className="bd-donate-name">{confirmTarget.donor.person_name}</div>
              <DropletBadge type={confirmTarget.donor.blood_type} />
            </div>
            <Icon name="heart" size={22} color={T.rose} />
            <div className="bd-donate-side">
              <div className="bd-donate-label">المريض</div>
              <Avatar name={confirmTarget.patient.person_name} color={BLOOD_COLORS[confirmTarget.patient.blood_type] || T.textMute} />
              <div className="bd-donate-name">{confirmTarget.patient.person_name}</div>
              <DropletBadge type={confirmTarget.patient.blood_type} />
            </div>
          </div>
          <p className="bd-confirm-msg">سيتم تسجيل هذا التبرع وتحديث تاريخ آخر تبرع للمتبرع تلقائياً.</p>
          <div className="bd-form-actions">
            <button className="bd-btn bd-btn--ghost" onClick={() => setConfirmTarget(null)} disabled={!!donating}>إلغاء</button>
            <button
              className="bd-btn bd-btn--primary"
              onClick={() => donate(confirmTarget.patient, confirmTarget.donor)}
              disabled={!!donating}
            >
              {donating ? 'جارٍ التسجيل…' : 'تأكيد التبرع'}
            </button>
          </div>
        </Modal>
      )}

      {completed && (
        <Modal title="تم تسجيل التبرع بنجاح" onClose={() => setCompleted(null)}>
          <div className="bd-donate-confirm">
            <div className="bd-donate-side">
              <div className="bd-donate-label">المتبرع</div>
              <Avatar name={completed.donor.person_name} color={BLOOD_COLORS[completed.donor.blood_type] || T.textMute} />
              <div className="bd-donate-name">{completed.donor.person_name}</div>
              <DropletBadge type={completed.donor.blood_type} />
            </div>
            <Icon name="check" size={22} color={T.emerald} />
            <div className="bd-donate-side">
              <div className="bd-donate-label">المريض</div>
              <Avatar name={completed.patient.person_name} color={BLOOD_COLORS[completed.patient.blood_type] || T.textMute} />
              <div className="bd-donate-name">{completed.patient.person_name}</div>
              <DropletBadge type={completed.patient.blood_type} />
            </div>
          </div>
          <p className="bd-confirm-msg">يمكنك تنزيل شهادة التبرع الآن، أو لاحقاً من تبويب السجل.</p>
          <div className="bd-form-actions">
            <button className="bd-btn bd-btn--ghost" onClick={() => setCompleted(null)}>إغلاق</button>
            <button
              className="bd-btn bd-btn--primary"
              onClick={() => handleDownload(completed.patient.id, completed.donor.id)}
              disabled={downloadingCert}
            >
              <Icon name="download" size={14} /> {downloadingCert ? 'جارٍ التحضير…' : 'تنزيل شهادة التبرع'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: HISTORY
// ══════════════════════════════════════════════════════════════════════════════
function HistoryTab({ notify }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [downloadingKey, setDownloadingKey] = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const res = await client.get('/donation-history/')
      setHistory(unwrap(res))
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function handleDownload(h) {
    const key = `${h.donor}-${h.patient}`
    setDownloadingKey(key)
    try {
      await downloadCertificate(h.patient, h.donor)
    } catch (e) {
      notify('تعذر توليد الشهادة لهذا السجل.', 'error')
    } finally { setDownloadingKey(null) }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return history.filter(h =>
      !q ||
      `${h.donor_name} ${h.donor_last_name}`.toLowerCase().includes(q) ||
      `${h.patient_name} ${h.patient_last_name}`.toLowerCase().includes(q)
    )
  }, [history, search])

  return (
    <div className="bd-stack">
      <TableWrap
        title={`سجل التبرعات (${history.length})`}
        toolbar={
          <div className="bd-toolbar">
            <SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم…" />
            <button className="bd-icon-btn" title="تحديث" aria-label="تحديث" onClick={fetchAll}><Icon name="refresh" size={15} /></button>
          </div>
        }
        loading={loading}
        empty={filtered.length === 0 ? 'لا توجد سجلات تبرع بعد.' : null}
      >
        <Table
          head={['التاريخ', 'المتبرع', 'المريض', 'الزمرة', 'المستشفى', '']}
          rows={filtered.map(h => {
            const key = `${h.donor}-${h.patient}`
            return [
              <span className="bd-muted">{fmt(h.donation_date)}</span>,
              <strong>{h.donor_name} {h.donor_last_name}</strong>,
              <strong>{h.patient_name} {h.patient_last_name}</strong>,
              <DropletBadge type={h.blood_type} />,
              <span className="bd-muted">{h.hospital || '—'}</span>,
              <div className="bd-row-actions">
                <button
                  className="bd-icon-btn"
                  title="تنزيل شهادة التبرع"
                  aria-label="تنزيل شهادة التبرع"
                  onClick={() => handleDownload(h)}
                  disabled={downloadingKey === key}
                >
                  <Icon name="download" size={14} />
                </button>
              </div>,
            ]
          })}
        />
      </TableWrap>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// NAV
// ══════════════════════════════════════════════════════════════════════════════
const NAV = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: 'pulse' },
  { id: 'donors',    label: 'المتبرعون',   icon: 'heart' },
  { id: 'patients',  label: 'المرضى',       icon: 'hospital' },
  { id: 'matching',  label: 'المطابقة',     icon: 'link' },
  { id: 'history',   label: 'السجل',        icon: 'history' },
]

// ══════════════════════════════════════════════════════════════════════════════
// ROOT COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function BloodDonationDashboard() {
  const [tab, setTab] = useState('dashboard')
  const [toast, setToast] = useState(null)
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const res = await client.get('/dashboard/stats/')
      setStats(res.data)
    } catch (e) {
      console.error(e)
    } finally { setStatsLoading(false) }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  function notify(msg, type) {
    setToast({ msg, type })
    fetchStats()
  }

  return (
    <div className="bd-root" dir="rtl">
      <GlobalStyles />
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <header className="bd-header">
        <div className="bd-header-inner">
          <div className="bd-brand">
            <span className="bd-brand-mark"><Drop color="#fff" size={26} /></span>
            <div>
              <h1 className="bd-title">قطرة حياة</h1>
              <p className="bd-subtitle">نظام إدارة التبرع بالدم</p>
            </div>
          </div>

          <div className="bd-vitals">
            <div className="bd-vitals-chips">
              <VitalChip label="مؤهلون الآن" value={stats?.donors_eligible_now} icon="heart" />
              <VitalChip label="مرضى نشطون" value={stats?.patients_active} icon="hospital" />
            </div>
            <button className="bd-icon-btn bd-icon-btn--ghost-light" title="تحديث الإحصائيات" aria-label="تحديث" onClick={fetchStats}>
              <Icon name="refresh" size={15} />
            </button>
          </div>
        </div>

        <svg className="bd-ecg" viewBox="0 0 600 30" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 15 H180 L194 15 L206 2 L220 28 L233 8 L246 24 L260 15 H600" />
        </svg>
      </header>

      <nav className="bd-tabs" aria-label="أقسام لوحة قطرة حياة">
        {NAV.map(n => (
          <button
            key={n.id}
            className={`bd-tab ${tab === n.id ? 'bd-tab--active' : ''}`}
            onClick={() => setTab(n.id)}
          >
            <Icon name={n.icon} size={16} />
            <span>{n.label}</span>
            {n.id === 'matching' && (stats?.donors_eligible_now ?? 0) > 0 && <span className="bd-tab-dot" />}
          </button>
        ))}
      </nav>

      <main className="bd-content">
        {tab === 'dashboard' && <DashboardTab stats={stats} loading={statsLoading} />}
        {tab === 'donors'    && <DonorsTab notify={notify} />}
        {tab === 'patients'  && <PatientsTab notify={notify} />}
        {tab === 'matching'  && <MatchingTab notify={notify} />}
        {tab === 'history'   && <HistoryTab notify={notify} />}
      </main>
    </div>
  )
}