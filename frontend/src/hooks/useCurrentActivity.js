import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import client from '../api/client'

export function useCurrentActivity() {
  const { activityId } = useParams()
  const [activity, setActivity] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(activityId))

  useEffect(() => {
    if (!activityId) return

    let cancelled = false
    setLoading(true)

    client.get('/activities/').then(r => {
      if (cancelled) return
      const all = Array.isArray(r.data) ? r.data : (r.data.results ?? [])
      setActivity(all.find(a => String(a.id) === String(activityId)) || null)
    }).catch(() => {
      if (!cancelled) setActivity(null)
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [activityId])

  if (!activityId) return { activity: null, loading: false }

  return { activity, loading }
}
