// hooks/useCurrentDept.js
import { useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export function useCurrentDept() {
  const { deptId } = useParams()
  const { departments } = useApp()
  return departments.find(d => String(d.id) === deptId) || null
}