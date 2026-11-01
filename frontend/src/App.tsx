import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import ProtectedRoute from './ProtectedRoute'
import UserLoginView from './views/UserLoginView'
import AdminView from './views/AdminView'
import BookingView from './views/BookingView'
import HomeView from './views/HomeView'
import UserView from './views/UserView'

const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'font-semibold text-blue-600' : 'text-gray-700 hover:text-blue-600'

function Nav() {
    const { user, logout } = useAuth()

    return (
        <nav className="flex gap-4 bg-white p-4 shadow">
            <NavLink to="/" end className={linkClass}>Home</NavLink>
            <NavLink to="/booking" className={linkClass}>Book a room</NavLink>
            {user && <NavLink to="/user" className={linkClass}>User</NavLink>}
            {user?.role === 'admin' && <NavLink to="/admin" className={linkClass}>Admin</NavLink>}

            <div className="ml-auto">
                {user ? (
                    <button onClick={logout} className="text-gray-700 hover:text-blue-600">
                        Log out ({user.name})
                    </button>
                ) : (
                    <NavLink to="/login" className={linkClass}>Login / Register</NavLink>
                )}
            </div>
        </nav>
    )
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <div className="min-h-screen bg-gray-50">
                    <Nav />
                    <main className="p-6">
                        <Routes>
                            <Route path="/" element={<HomeView />} />
                            <Route path="/login" element={<UserLoginView />} />
                            <Route path="/booking" element={<ProtectedRoute><BookingView /></ProtectedRoute>} />
                            <Route path="/user" element={<ProtectedRoute><UserView /></ProtectedRoute>} />
                            <Route path="/admin" element={<ProtectedRoute role="admin"><AdminView /></ProtectedRoute>} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </main>
                </div>
            </BrowserRouter>
        </AuthProvider>
    )
}