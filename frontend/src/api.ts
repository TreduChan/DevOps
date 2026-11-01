export type Room = {
  id: number
  room_number: string
  type: string
  price_per_night: string | number
  capacity: number
  description: string | null
  available_from: string | null
  available_until: string | null
}

export async function api<T = unknown>(
  path: string,
  token: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(path, {
    method: options.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data as T
}
