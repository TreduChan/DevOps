import { useEffect, useState, type FormEvent } from 'react'
import { api, type Room } from '../api'

type Props = {
  room: Room
  token: string
  initial: { check_in: string; check_out: string; guests: string }
  onClose: () => void
  onBooked: (message: string) => void
}

type Availability = {
  available_from: string | null
  available_until: string | null
  booked: { check_in: string; check_out: string }[]
}

const input = 'w-full rounded border p-2'

function nightsBetween(from: string, to: string) {
  if (!from || !to) return 0
  const n = Math.round((Date.parse(to) - Date.parse(from)) / 86400000)
  return n > 0 ? n : 0
}

// Returns a message if the chosen dates do not fit, otherwise an empty string
function findProblem(a: Availability | null, checkIn: string, checkOut: string) {
  if (!a || !checkIn || !checkOut || checkOut <= checkIn) return ''
  if (a.available_from && checkIn < a.available_from) {
    return `This room is only available from ${a.available_from}`
  }
  if (a.available_until && checkOut > a.available_until) {
    return `This room is only available until ${a.available_until}`
  }
  const clash = a.booked.find((b) => b.check_in < checkOut && b.check_out > checkIn)
  if (clash) return `Already booked ${clash.check_in} to ${clash.check_out}`
  return ''
}

export default function BookingDialog({ room, token, initial, onClose, onBooked }: Props) {
  const [checkIn, setCheckIn] = useState(initial.check_in)
  const [checkOut, setCheckOut] = useState(initial.check_out)
  const [guests, setGuests] = useState(initial.guests || '1')
  const [request, setRequest] = useState('')
  const [payNow, setPayNow] = useState(true)
  const [availability, setAvailability] = useState<Availability | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api<Availability>(`/api/rooms/${room.id}/availability`, token)
        .then(setAvailability)
        .catch(() => setAvailability(null))
  }, [room.id, token])

  const today = new Date().toISOString().slice(0, 10)
  const nights = nightsBetween(checkIn, checkOut)
  const total = nights * Number(room.price_per_night)
  const problem = findProblem(availability, checkIn, checkOut)

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    if (nights < 1) {
      setError('Choose check-in and check-out dates (check-out after check-in)')
      return
    }
    setLoading(true)
    try {
      await api('/api/bookings', token, {
        method: 'POST',
        body: {
          room_id: room.id,
          check_in: checkIn,
          check_out: checkOut,
          guests: Number(guests),
          special_request: request,
          pay_now: payNow,
        },
      })
      onBooked(`Room ${room.room_number} booked${payNow ? ' and paid' : ''}`)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
      <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
        <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full w-full max-w-md space-y-4 overflow-y-auto rounded-lg bg-white p-6 shadow-lg"
        >
          <h2 className="text-xl font-bold">Book room {room.room_number} ({room.type})</h2>

          <div className="rounded bg-blue-50 p-3 text-sm">
            <p className="font-semibold">Availability</p>
            {availability === null ? (
                <p className="text-gray-500">Loading...</p>
            ) : (
                <>
                  <p>
                    {availability.available_from || availability.available_until
                        ? `Open ${availability.available_from ? `from ${availability.available_from}` : ''}${
                            availability.available_from && availability.available_until ? ' ' : ''
                        }${availability.available_until ? `until ${availability.available_until}` : ''}`
                        : 'Open for any dates'}
                  </p>
                  {availability.booked.length > 0 ? (
                      <div className="mt-1">
                        <p>Already booked:</p>
                        <ul className="list-disc pl-5">
                          {availability.booked.map((b, i) => (
                              <li key={i}>{b.check_in} to {b.check_out}</li>
                          ))}
                        </ul>
                      </div>
                  ) : (
                      <p>No bookings yet.</p>
                  )}
                </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">Check-in
              <input className={input} type="date" min={today} value={checkIn}
                     onChange={(e) => setCheckIn(e.target.value)} required />
            </label>
            <label className="text-sm">Check-out
              <input className={input} type="date" min={checkIn || today} value={checkOut}
                     onChange={(e) => setCheckOut(e.target.value)} required />
            </label>
          </div>

          {problem && <p className="text-sm text-red-600">{problem}</p>}

          <label className="block text-sm">Number of guests (max {room.capacity})
            <input className={input} type="number" min="1" max={room.capacity} value={guests}
                   onChange={(e) => setGuests(e.target.value)} required />
          </label>

          <label className="block text-sm">Special requests (optional)
            <textarea className={input} rows={3} maxLength={200} value={request}
                      onChange={(e) => setRequest(e.target.value)} />
            <span className="text-xs text-gray-500">{request.length}/200</span>
          </label>

          <div className="rounded bg-gray-50 p-3 text-sm">
            <p>{Number(room.price_per_night).toFixed(2)} € per night</p>
            {nights > 0 ? (
                <>
                  <p>
                    {nights} night{nights > 1 ? 's' : ''} × {Number(room.price_per_night).toFixed(2)} €
                  </p>
                  <p className="mt-1 text-base font-bold">Total: {total.toFixed(2)} €</p>
                </>
            ) : (
                <p className="text-gray-500">Choose your dates to see the total</p>
            )}
          </div>

          <fieldset className="space-y-1 text-sm">
            <legend className="mb-1 font-semibold">Payment</legend>
            <label className="flex items-center gap-2">
              <input type="radio" checked={payNow} onChange={() => setPayNow(true)} />
              Pay now{nights > 0 ? `: ${total.toFixed(2)} €` : ''} (demo payment, no card details needed)
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={!payNow} onChange={() => setPayNow(false)} />
              Pay at the hotel{nights > 0 ? `: ${total.toFixed(2)} €` : ''}
            </label>
          </fieldset>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded bg-gray-200 px-4 py-2">Close</button>
            <button
                type="submit"
                disabled={loading || nights < 1 || problem !== ''}
                className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {loading ? 'Please wait...' : payNow ? `Pay ${total.toFixed(2)} € and book` : 'Book'}
            </button>
          </div>
        </form>
      </div>
  )
}