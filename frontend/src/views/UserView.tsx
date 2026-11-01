import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../AuthContext'
import { api } from '../api'

type Reservation = {
    id: number
    check_in: string
    check_out: string
    status: string
    room_number: string
    type: string
}

export default function UserView() {
    const { user, logout } = useAuth()
    const token = user?.token ?? ''
    const [reservations, setReservations] = useState<Reservation[]>([])
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')

    const loadReservations = useCallback(async () => {
        setReservations(await api<Reservation[]>('/api/bookings/mine', token))
    }, [token])

    useEffect(() => {
        loadReservations().catch((err: Error) => setError(err.message))
    }, [loadReservations])

    const cancel = async (reservation: Reservation) => {
        if (!window.confirm(`Cancel your reservation for room ${reservation.room_number}?`)) return
        setError('')
        setMessage('')
        try {
            await api(`/api/bookings/${reservation.id}/cancel`, token, { method: 'PATCH' })
            setMessage('Reservation cancelled')
            await loadReservations()
        } catch (err) {
            setError((err as Error).message)
        }
    }

    return (
        <div className="mx-auto mt-16 max-w-4xl space-y-8">
            <section className="max-w-md rounded-xl bg-white p-6 shadow-lg">
                <h1 className="text-xl font-bold">Hello, {user?.name}</h1>
                <p className="text-gray-500">{user?.email} ({user?.role})</p>
                <button onClick={logout} className="mt-4 rounded bg-gray-200 px-4 py-2 hover:bg-gray-300">
                    Log out
                </button>
            </section>

            <section className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-semibold">My reservations</h2>
                {error && <p className="mb-3 text-red-600">{error}</p>}
                {message && <p className="mb-3 text-green-600">{message}</p>}
                {reservations.length === 0 ? (
                    <p className="text-gray-500">You have no reservations.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                            <tr className="border-b">
                                <th className="p-2">Room</th><th className="p-2">Check-in</th>
                                <th className="p-2">Check-out</th><th className="p-2">Status</th><th className="p-2"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {reservations.map((reservation) => (
                                <tr key={reservation.id} className="border-b">
                                    <td className="p-2">{reservation.room_number} ({reservation.type})</td>
                                    <td className="p-2">{reservation.check_in}</td>
                                    <td className="p-2">{reservation.check_out}</td>
                                    <td className="p-2">{reservation.status}</td>
                                    <td className="p-2 text-right">
                                        {reservation.status === 'confirmed' && (
                                            <button className="text-red-600 underline" onClick={() => cancel(reservation)}>
                                                Cancel
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    )
}