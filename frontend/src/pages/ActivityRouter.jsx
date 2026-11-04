import PharmacyDashboard from './PharmacyDashboard'
import BloodDonationDashboard from './BloodDonationDashboard'
import MachineDashboard from './MachineDashboard'
import { useCurrentActivity } from '../hooks/useCurrentActivity'
import WarmWinterDashboard from './WarmWinterDashboard'
import MedicalDaysPage from './Medicaldaydashboard'
function GenericDashboard({ activity }) {
  return (
    <div className="empty-state" style={{ padding: '40px 16px' }}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: 16 }}>
        <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
      </svg>
      <h3 style={{ marginBottom: 8, color: '#374151' }}>{activity.name}</h3>
      <p>لوحة تحكم هذا النشاط قيد التطوير.</p>
    </div>
  )
}

function isPharmacy(name = '') {
  return ['pharma', 'صيدل', 'drug', 'دواء', 'medicine'].some(k => name.toLowerCase().includes(k))
}

function isBlood(name = '') {
  return ['قطرة حياة', 'قطرة', 'دم', 'blood'].some(k => name.toLowerCase().includes(k))
}

function isMachine(name = '') {
  return ['machine', 'جهاز', 'معدات', 'equipment', 'medical device'].some(k => name.toLowerCase().includes(k))
}
function isWarmWinter(name = '') {
  return ['شتاء', 'دافئ', 'winter'].some(k => name.toLowerCase().includes(k))
}
function isMedicalDay(name = '') {
  return ['medical day', 'medical', 'اليوم الطبي'].some(k => name.toLowerCase().includes(k))
}

export default function ActivityRouter() {
  const { activity, loading } = useCurrentActivity()

  if (loading) return <div className="page-loading"><div className="spinner" /></div>
  if (!activity) return <div className="empty-state">النشاط غير موجود.</div>

  if (isPharmacy(activity.name)) return <PharmacyDashboard />
  if (isBlood(activity.name)) return <BloodDonationDashboard />
  if (isMachine(activity.name)) return <MachineDashboard />
  if (isWarmWinter(activity.name)) return <WarmWinterDashboard />
  if (isMedicalDay(activity.name)) return <MedicalDaysPage />
  return <GenericDashboard activity={activity} />
}
