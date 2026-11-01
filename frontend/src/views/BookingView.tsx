import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../AuthContext'
import { api, type Room } from '../api'
import BookingDialog from '../components/BookingDialog'

type Reservation = {
    id: number
    check_in: string
    check_out: string
    status: string
    guests: number
    special_request: string | null
    total_price: string | number
    paid: number | boolean
    room_number: string
    type: string
}

type Search = { check_in: string; check_out: string; guests: string; type: string }

const input = 'rounded border p-2'

export default function BookingView() {
    const { user } = useAuth()
    const token = user?.token ?? ''
    const [search, setSearch] = useState<Search>({ check_in: '', check_out: '', guests: '', type: '' })
    const [rooms, setRooms] = useState<Room[]>([])
    const [reservations, setReservations] = useState<Reservation[]>([])
    const [bookingRoom, setBookingRoom] = useState<Room | null>(null)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')

    const loadRooms = useCallback(
        async (s: Search) => {
            const params = new URLSearchParams()
            Object.entries(s).forEach(([key, value]) => {
                if (value) params.set(key, value)
            })
            setRooms(await api<Room[]>(`/api/rooms?${params}`, token))
        },
        [token]
    )

    const loadReservations = useCallback(async () => {
        setReservations(await api<Reservation[]>('/api/bookings/mine', token))
    }, [token])

    useEffect(() => {
        Promise.all([
            api<Room[]>('/api/rooms', token).then(setRooms),
            loadReservations(),
        ]).catch((err: Error) => setError(err.message))
    }, [token, loadReservations])

    const runSearch = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError('')
        setMessage('')
        try {
            await loadRooms(search)
        } catch (err) {
            setError((err as Error).message)
        }
    }

    const cancel = async (r: Reservation) => {
        if (!window.confirm(`Cancel your reservation for room ${r.room_number}?`)) return
        setError('')
        setMessage('')
        try {
            await api(`/api/bookings/${r.id}/cancel`, token, { method: 'PATCH' })
            setMessage('Reservation cancelled')
            await Promise.all([loadReservations(), loadRooms(search)])
        } catch (err) {
            setError((err as Error).message)
        }
    }

    const today = new Date().toISOString().slice(0, 10)

    return (
        <div className="mx-auto max-w-4xl space-y-8">
            <h1 className="text-2xl font-bold">Book a room</h1>
            {error && <p className="text-red-600">{error}</p>}
            {message && <p className="text-green-600">{message}</p>}

            <section className="rounded-lg bg-white p-6 shadow">
                <form onSubmit={runSearch} className="grid gap-3 sm:grid-cols-5">
                    <label className="text-sm">Check-in
                        <input className={`${input} w-full`} type="date" min={today} value={search.check_in}
                               onChange={(e) => setSearch({ ...search, check_in: e.target.value })} />
                    </label>
                    <label className="text-sm">Check-out
                        <input className={`${input} w-full`} type="date" min={search.check_in || today} value={search.check_out}
                               onChange={(e) => setSearch({ ...search, check_out: e.target.value })} />
                    </label>
                    <label className="text-sm">Guests
                        <input className={`${input} w-full`} type="number" min="1" value={search.guests}
                               onChange={(e) => setSearch({ ...search, guests: e.target.value })} />
                    </label>
                    <label className="text-sm">Type
                        <select className={`${input} w-full`} value={search.type}
                                onChange={(e) => setSearch({ ...search, type: e.target.value })}>
                            <option value="">Any</option>
                            <option value="single">Single</option>
                            <option value="double">Double</option>
                            <option value="suite">Suite</option>
                        </select>
                    </label>
                    <button className="self-end rounded bg-blue-600 p-2 text-white" type="submit">Search</button>
                </form>
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-semibold">
                    {search.check_in && search.check_out ? 'Available rooms' : 'All rooms'}
                </h2>
                {rooms.length === 0 && <p className="text-gray-500">No rooms found.</p>}
                {rooms.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-lg bg-white p-4 shadow">
                        <div>
                            <p className="font-semibold">Room {r.room_number} ({r.type})</p>
                            <p className="text-sm text-gray-500">
                                {r.capacity} guests, {Number(r.price_per_night).toFixed(2)} per night
                                {r.description ? `, ${r.description}` : ''}
                            </p>
                        </div>
                        <button
                            className="rounded bg-blue-600 px-4 py-2 text-white"
                            onClick={() => {
                                setError('')
                                setMessage('')
                                setBookingRoom(r)
                            }}
                        >
                            Book
                        </button>
                    </div>
                ))}
            </section>

            <section className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-semibold">My reservations</h2>
                {reservations.length === 0 ? (
                    <p className="text-gray-500">You have no reservations.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                            <tr className="border-b">
                                <th className="p-2">Room</th><th className="p-2">Check-in</th><th className="p-2">Check-out</th>
                                <th className="p-2">Guests</th><th className="p-2">Total</th><th className="p-2">Payment</th>
                                <th className="p-2">Request</th><th className="p-2"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {reservations.map((r) => (
                                <tr key={r.id} className="border-b">
                                    <td className="p-2">{r.room_number} ({r.type})</td>
                                    <td className="p-2">{r.check_in}</td>
                                    <td className="p-2">{r.check_out}</td>
                                    <td className="p-2">{r.guests}</td>
                                    <td className="p-2">{Number(r.total_price).toFixed(2)}</td>
                                    <td className="p-2">{r.paid ? 'Paid' : 'Pay at hotel'}</td>
                                    <td className="p-2">{r.special_request}</td>
                                    <td className="p-2 text-right">
                                        <button className="text-red-600 underline" onClick={() => cancel(r)}>Cancel</button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {bookingRoom && (
                <BookingDialog
                    room={bookingRoom}
                    token={token}
                    initial={{ check_in: search.check_in, check_out: search.check_out, guests: search.guests }}
                    onClose={() => setBookingRoom(null)}
                    onBooked={async (msg) => {
                        setBookingRoom(null)
                        setMessage(msg)
                        try {
                            await Promise.all([loadReservations(), loadRooms(search)])
                        } catch (err) {
                            setError((err as Error).message)
                        }
                    }}
                />
            )}
        </div>
    )
}