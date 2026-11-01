import { useAuth } from '../AuthContext'

export default function UserView() {
    const { user, logout } = useAuth()
    return (
        <div className="mx-auto mt-16 max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h1 className="text-xl font-bold">Hello, {user?.name}</h1>
            <p className="text-gray-500">{user?.email} ({user?.role})</p>
            <button onClick={logout} className="mt-4 rounded bg-gray-200 px-4 py-2 hover:bg-gray-300">
                Log out
            </button>
        </div>
    )
}