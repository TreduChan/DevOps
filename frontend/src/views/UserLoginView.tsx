import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth, type User } from '../AuthContext'

type FormData = {
  name: string
  email: string
  password: string
}

function UserLoginView() {
  const { user, login } = useAuth()
  const [registering, setRegistering] = useState(false)
  const [form, setForm] = useState<FormData>({ name: '', email: '', password: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Already logged in: admins go to the admin page, everyone else to the user page
  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/user'} replace />

  const updateForm = (event: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage('')
    setError('')
    setLoading(true)

    try {
      const response = await fetch(registering ? '/api/register' : '/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
            registering ? form : { email: form.email, password: form.password }
        ),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setError(result.error || `Request failed (${response.status})`)
        return
      }

      if (registering) {
        setRegistering(false)
        setForm({ name: '', email: form.email, password: '' })
        setMessage('Registered, please log in')
      } else {
        login(result as User) // saves the user and token, then the redirect above runs
      }
    } catch {
      setError('Unable to connect to the server')
    } finally {
      setLoading(false)
    }
  }

  return (
      <section className="flex min-h-[70vh] items-center justify-center">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow">
          <h1 className="mb-6 text-2xl font-bold">{registering ? 'Register' : 'Login'}</h1>
          <form className="space-y-4" onSubmit={submit}>
            {registering && (
                <input
                    className="w-full rounded border p-2"
                    name="name"
                    placeholder="Name"
                    value={form.name}
                    onChange={updateForm}
                    required
                />
            )}
            <input
                className="w-full rounded border p-2"
                name="email"
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={updateForm}
                required
            />
            <input
                className="w-full rounded border p-2"
                name="password"
                type="password"
                placeholder={registering ? 'Password (8+ characters)' : 'Password'}
                value={form.password}
                onChange={updateForm}
                minLength={registering ? 8 : undefined}
                required
            />
            <button
                className="w-full rounded bg-blue-600 p-2 text-white disabled:opacity-50"
                type="submit"
                disabled={loading}
            >
              {loading ? 'Please wait...' : registering ? 'Register' : 'Login'}
            </button>
          </form>
          {message && <p className="mt-4 text-green-600">{message}</p>}
          {error && <p className="mt-4 text-red-600">{error}</p>}
          <button
              className="mt-4 text-blue-600 underline"
              type="button"
              onClick={() => {
                setRegistering(!registering)
                setMessage('')
                setError('')
              }}
          >
            {registering ? 'Already registered? Login' : 'Need an account? Register'}
          </button>
        </div>
      </section>
  )
}

export default UserLoginView