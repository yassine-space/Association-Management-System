import { useNavigate } from 'react-router-dom'
import logo from '../assets/photo_2026-06-13_11-54-41.jpg'

/* ─── tiny feature cards ─────────────────────────────────────── */
const FEATURES = [
  {
    icon: '💊',
    title: 'إدارة الصيدلية',
    desc: 'تتبع الأدوية والمخزون والتبرعات وعمليات الصرف بدقة.',
  },
  {
    icon: '🩸',
    title: 'قطرة حياة',
    desc: 'ربط المتبرعين بالدم بالمرضى بسرعة وفق فصيلة الدم.',
  },
  {
    icon: '👥',
    title: 'إدارة الأعضاء',
    desc: 'تنظيم أعضاء الجمعية عبر الأقسام والأنشطة المختلفة.',
  },
  {
    icon: '🔐',
    title: 'صلاحيات مرنة',
    desc: 'قارئ، محرر، مدير — تحكم دقيق في وصول كل مستخدم.',
  },
]

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div style={styles.root} dir="rtl">
      {/* ── background glow blobs ── */}
      <div style={styles.blob1} />
      <div style={styles.blob2} />

      {/* ── nav ── */}
      <nav style={styles.nav}>
        <div style={styles.navBrand}>
          <img src={logo} alt="شعار" style={styles.navLogo} />
          <span style={styles.navTitle}>جمعية الغد الأفضل</span>
        </div>
        <button style={styles.navBtn} onClick={() => navigate('/login')}>
          تسجيل الدخول
        </button>
      </nav>

      {/* ── hero ── */}
      <section className="landing-hero" style={styles.hero}>
        <div style={styles.heroInner}>
          <div style={styles.badge}>نظام إدارة متكامل</div>

          <h1 style={styles.h1}>
            أدِر جمعيتك
            <br />
            <span style={styles.h1Accent}>بكفاءة وشفافية</span>
          </h1>

          <p style={styles.sub}>
            منصة واحدة لإدارة الأعضاء، الصيدلية، التبرعات بالدم،
            وكل أنشطة جمعيتك — بصلاحيات دقيقة لكل مستخدم.
          </p>

          <div style={styles.heroActions}>
            <button
              style={styles.primaryBtn}
              onClick={() => navigate('/login')}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              ابدأ الآن ←
            </button>
          </div>
        </div>

        {/* decorative card */}
        <div className="landing-hero-card" style={styles.heroCard} aria-hidden>
          <div style={styles.heroCardRow}>
            <span style={styles.dot('#10b981')} />
            <span style={{ color: '#10b981', fontSize: 13, fontWeight: 600 }}>
              مخزون محدَّث
            </span>
          </div>
          <div style={styles.heroStat}>
            <span style={{ fontSize: 32, fontWeight: 800, color: '#f1f5f9' }}>
              ١٢٤٨
            </span>
            <span style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              وحدة دواء متاحة
            </span>
          </div>
          <div style={styles.heroBarWrap}>
            {[70, 45, 85, 60, 90].map((h, i) => (
              <div
                key={i}
                style={{
                  width: 18,
                  height: h * 0.7,
                  borderRadius: 4,
                  background: i === 4 ? '#10b981' : '#1e2d3d',
                  transition: 'background .2s',
                }}
              />
            ))}
          </div>
          <div style={styles.heroCardRow}>
            <span style={styles.dot('#f59e0b')} />
            <span style={{ color: '#f59e0b', fontSize: 12 }}>
              ٣ دفعات تنتهي قريباً
            </span>
          </div>
        </div>
      </section>

      {/* ── features ── */}
      <section style={styles.features}>
        <p style={styles.sectionLabel}>ما يقدمه النظام</p>
        <div className="landing-grid" style={styles.grid}>
          {FEATURES.map(f => (
            <div key={f.title} style={styles.card}>
              <div style={styles.cardIcon}>{f.icon}</div>
              <h3 style={styles.cardTitle}>{f.title}</h3>
              <p style={styles.cardDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── cta strip ── */}
      <section style={styles.cta}>
        <h2 style={styles.ctaH2}>مستعد للبدء؟</h2>
        <p style={styles.ctaSub}>
          سجّل دخولك وابدأ بإدارة أنشطة جمعيتك الآن.
        </p>
        <button
          style={{ ...styles.primaryBtn, padding: '13px 36px', fontSize: 15 }}
          onClick={() => navigate('/login')}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          تسجيل الدخول
        </button>
      </section>

      {/* ── footer ── */}
      <footer style={styles.footer}>
        جمعية الغد الأفضل — جميع الحقوق محفوظة {new Date().getFullYear()}
      </footer>

      <style>{`
        @media (max-width: 700px) {
          .landing-hero { flex-direction: column !important; gap: 32px !important; }
          .landing-hero-card { display: none !important; }
          .landing-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

/* ─── styles ─────────────────────────────────────────────────── */
const styles = {
  root: {
    minHeight: '100vh',
    background: '#0b1120',
    fontFamily: 'system-ui, -apple-system, Tahoma, Arial, sans-serif',
    color: '#f1f5f9',
    position: 'relative',
    overflowX: 'hidden',
  },
  blob1: {
    position: 'fixed',
    top: -120,
    right: -80,
    width: 480,
    height: 480,
    borderRadius: '50%',
    background: 'radial-gradient(circle, #10b98118 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  blob2: {
    position: 'fixed',
    bottom: -100,
    left: -60,
    width: 380,
    height: 380,
    borderRadius: '50%',
    background: 'radial-gradient(circle, #6366f114 0%, transparent 70%)',
    pointerEvents: 'none',
  },

  /* nav */
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 40px',
    borderBottom: '1px solid #1e2d3d',
    position: 'sticky',
    top: 0,
    background: '#0b112099',
    backdropFilter: 'blur(12px)',
    zIndex: 100,
  },
  navBrand: { display: 'flex', alignItems: 'center', gap: 12 },
  navLogo: { width: 36, height: 36, borderRadius: 8, objectFit: 'cover' },
  navTitle: { fontSize: 16, fontWeight: 700, color: '#f1f5f9' },
  navBtn: {
    background: 'transparent',
    border: '1px solid #10b981',
    borderRadius: 8,
    padding: '7px 18px',
    color: '#10b981',
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
  },

  /* hero */
  hero: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 48,
    maxWidth: 1100,
    margin: '0 auto',
    padding: '80px 40px 64px',
  },
  heroInner: { flex: 1, maxWidth: 560 },
  badge: {
    display: 'inline-block',
    background: '#10b98120',
    border: '1px solid #10b98140',
    color: '#10b981',
    borderRadius: 20,
    padding: '4px 14px',
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 20,
    letterSpacing: '.4px',
  },
  h1: {
    fontSize: 'clamp(32px, 5vw, 52px)',
    fontWeight: 800,
    lineHeight: 1.15,
    marginBottom: 20,
    letterSpacing: '-0.5px',
  },
  h1Accent: {
    background: 'linear-gradient(90deg, #10b981, #6366f1)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  sub: {
    fontSize: 16,
    color: '#94a3b8',
    lineHeight: 1.7,
    marginBottom: 36,
  },
  heroActions: { display: 'flex', gap: 14 },
  primaryBtn: {
    background: 'linear-gradient(135deg, #10b981, #059669)',
    border: 'none',
    borderRadius: 10,
    padding: '12px 28px',
    color: '#fff',
    fontWeight: 700,
    fontSize: 15,
    cursor: 'pointer',
    transition: 'opacity .15s',
    boxShadow: '0 4px 16px #10b98144',
  },

  /* decorative card */
  heroCard: {
    background: '#111827',
    border: '1px solid #1e2d3d',
    borderRadius: 16,
    padding: '24px',
    width: 220,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  heroCardRow: { display: 'flex', alignItems: 'center', gap: 8 },
  dot: color => ({
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: color,
    flexShrink: 0,
  }),
  heroStat: { display: 'flex', flexDirection: 'column' },
  heroBarWrap: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 6,
    height: 60,
  },

  /* features */
  features: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '48px 40px 64px',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '.8px',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 28,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
    gap: 18,
  },
  card: {
    background: '#111827',
    border: '1px solid #1e2d3d',
    borderRadius: 14,
    padding: '24px 20px',
  },
  cardIcon: { fontSize: 28, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: 700, marginBottom: 8, color: '#f1f5f9' },
  cardDesc: { fontSize: 13, color: '#64748b', lineHeight: 1.6 },

  /* cta */
  cta: {
    textAlign: 'center',
    padding: '56px 40px',
    borderTop: '1px solid #1e2d3d',
  },
  ctaH2: { fontSize: 28, fontWeight: 800, marginBottom: 10 },
  ctaSub: { fontSize: 15, color: '#64748b', marginBottom: 28 },

  /* footer */
  footer: {
    textAlign: 'center',
    padding: '20px',
    fontSize: 12,
    color: '#334155',
    borderTop: '1px solid #1e2d3d',
  },
}