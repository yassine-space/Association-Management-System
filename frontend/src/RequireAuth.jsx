// guards/RequireAuth.jsx
import { Navigate, useLocation } from 'react-router-dom'

export function RequireAuth({ user, children }) {
  const location = useLocation()
  if (!user) {
    // remember where they tried to go, so login can send them back
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return children
}

export function RequireSuperuser({ user, children }) {
  if (!user) return <Navigate to="/login" replace />
  if (!user.is_superuser) return <Navigate to="/home" replace />
  return children
}