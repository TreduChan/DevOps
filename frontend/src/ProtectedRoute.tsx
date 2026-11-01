import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function ProtectedRoute({ children, role }: { children: ReactNode; role?: 'admin' }) {
    const { user } = useAuth()
    if (!user) return <Navigate to="/login" replace />
    if (role && user.role !== role) return <Navigate to="/user" replace />
    return <>{children}</>
}