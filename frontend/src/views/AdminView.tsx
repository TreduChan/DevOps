import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useAuth } from '../AuthContext'
import { api, type Room } from '../api'

type Booking = {
    id: number
    check_in: string
    check_out: string
    status: string
    user_name: string
    user_email: string
    room_number: string
}

const emptyForm = { room_number: '', type: 'single', price_per_night: '', capacity: '', description: '', available_from: '', available_until: '' }
const input = 'w-full rounded border p-2'

export default function AdminView() {
    const { user } = useAuth()
    const token = user?.token ?? ''
    const [rooms, setRooms] = useState<Room[]>([])
    const [bookings, setBookings] = useState<Booking[]>([])
    const [form, setForm] = useState(emptyForm)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')

    const load = useCallback(async () => {
        try {
            setRooms(await api<Room[]>('/api/rooms', token))
            setBookings(await api<Booking[]>('/api/admin/bookings', token))
        } catch (err) {
            setError((err as Error).message)
        }
    }, [token])

    useEffect(() => {
        load()
    }, [load])

    const change = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm({ ...form, [e.target.name]: e.target.value })

    const reset = () => {
        setEditingId(null)
        setForm(emptyForm)
    }

    const startEdit = (r: Room) => {
        setEditingId(r.id)
        setForm({
            room_number: r.room_number,
            type: r.type,
            price_per_night: String(r.price_per_night),
            capacity: String(r.capacity),
            description: r.description ?? '',
            available_from: r.available_from ?? '',
            available_until: r.available_until ?? '',
        })
        setError('')
        setMessage('')
    }

    const save = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError('')
        setMessage('')
        try {
            await api(editingId ? `/api/admin/rooms/${editingId}` : '/api/admin/rooms', token, {
                method: editingId ? 'PUT' : 'POST',
                body: form,
            })
            setMessage(editingId ? 'Room updated' : 'Room added')
            reset()
            load()
        } catch (err) {
            setError((err as Error).message)
        }
    }

    const remove = async (r: Room) => {
        if (!window.confirm(`Delete room ${r.room_number}?`)) return
        setError('')
        setMessage('')
        try {
            await api(`/api/admin/rooms/${r.id}`, token, { method: 'DELETE' })
            setMessage('Room deleted')
            load()
        } catch (err) {
            setError((err as Error).message)
        }
    }

    const cancelBooking = async (b: Booking) => {
        if (!window.confirm(`Cancel booking #${b.id}?`)) return
        setError('')
        setMessage('')
        try {
            await api(`/api/bookings/${b.id}/cancel`, token, { method: 'PATCH' })
            setMessage('Booking cancelled')
            load()
        } catch (err) {
            setError((err as Error).message)
        }
    }

    return (
        <div className="mx-auto max-w-5xl space-y-8">
            <h1 className="text-2xl font-bold">Admin</h1>
            {error && <p className="text-red-600">{error}</p>}
            {message && <p className="text-green-600">{message}</p>}

            <section className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-semibold">{editingId ? 'Edit room' : 'Add a room'}</h2>
                <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
                    <input className={input} name="room_number" placeholder="Room number" value={form.room_number} onChange={change} required />
                    <select className={input} name="type" value={form.type} onChange={change}>
                        <option value="single">Single</option>
                        <option value="double">Double</option>
                        <option value="suite">Suite</option>
                    </select>
                    <input className={input} name="price_per_night" type="number" min="0.01" step="0.01" placeholder="Price per night" value={form.price_per_night} onChange={change} required />
                    <input className={input} name="capacity" type="number" min="1" step="1" placeholder="Capacity (guests)" value={form.capacity} onChange={change} required />
                    <input className={`${input} sm:col-span-2`} name="description" placeholder="Description (optional)" value={form.description} onChange={change} />
                    <label className="text-sm">Available from (first check-in)
                        <input className={input} name="available_from" type="date" value={form.available_from} onChange={change} />
                    </label>
                    <label className="text-sm">Available until (last check-out)
                        <input className={input} name="available_until" type="date" min={form.available_from || undefined} value={form.available_until} onChange={change} />
                    </label>
                    <div className="flex gap-2 sm:col-span-2">
                        <button className="rounded bg-blue-600 px-4 py-2 text-white" type="submit">
                            {editingId ? 'Save changes' : 'Add room'}
                        </button>
                        {editingId && (
                            <button type="button" onClick={reset} className="rounded bg-gray-200 px-4 py-2">
                                Cancel edit
                            </button>
                        )}
                    </div>
                </form>
            </section>

            <section className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-semibold">Rooms</h2>
                {rooms.length === 0 ? (
                    <p className="text-gray-500">No rooms yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                            <tr className="border-b">
                                <th className="p-2">Room</th><th className="p-2">Type</th><th className="p-2">Price/night</th>
                                <th className="p-2">Guests</th><th className="p-2">Description</th><th className="p-2">Available</th><th className="p-2"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {rooms.map((r) => (
                                <tr key={r.id} className="border-b">
                                    <td className="p-2">{r.room_number}</td>
                                    <td className="p-2">{r.type}</td>
                                    <td className="p-2">{Number(r.price_per_night).toFixed(2)}</td>
                                    <td className="p-2">{r.capacity}</td>
                                    <td className="p-2">{r.description}</td>
                                    <td className="p-2">
                                        {r.available_from || r.available_until
                                            ? `${r.available_from ?? 'any'} to ${r.available_until ?? 'any'}`
                                            : 'Always'}
                                    </td>
                                    <td className="space-x-3 p-2 text-right">
                                        <button className="text-blue-600 underline" onClick={() => startEdit(r)}>Edit</button>
                                        <button className="text-red-600 underline" onClick={() => remove(r)}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-semibold">All bookings</h2>
                {bookings.length === 0 ? (
                    <p className="text-gray-500">No bookings yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                            <tr className="border-b">
                                <th className="p-2">ID</th><th className="p-2">Guest</th><th className="p-2">Room</th>
                                <th className="p-2">Check-in</th><th className="p-2">Check-out</th><th className="p-2">Status</th><th className="p-2"></th>
                            </tr>
                            </thead>
                            <tbody>
                            {bookings.map((b) => (
                                <tr key={b.id} className="border-b">
                                    <td className="p-2">{b.id}</td>
                                    <td className="p-2">{b.user_name} ({b.user_email})</td>
                                    <td className="p-2">{b.room_number}</td>
                                    <td className="p-2">{b.check_in}</td>
                                    <td className="p-2">{b.check_out}</td>
                                    <td className="p-2">{b.status}</td>
                                    <td className="p-2 text-right">
                                        {b.status === 'confirmed' && (
                                            <button className="text-red-600 underline" onClick={() => cancelBooking(b)}>Cancel</button>
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