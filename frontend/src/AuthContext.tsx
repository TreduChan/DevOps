import { createContext, useContext, useState, type ReactNode } from 'react'

export type User = {
    id: number
    name: string
    email: string
    role: 'user' | 'admin'
    token: string
}

type AuthValue = { user: User | null; login: (u: User) => void; logout: () => void }

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(() => {
        try {
            const saved = localStorage.getItem('user')
            return saved ? JSON.parse(saved) : null
        } catch {
            return null
        }
    })

    const login = (u: User) => {
        localStorage.setItem('user', JSON.stringify(u))
        setUser(u)
    }
    const logout = () => {
        localStorage.removeItem('user')
        setUser(null)
    }

    return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
    return ctx
}