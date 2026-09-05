// Centralized API & Socket Connection URL resolver for both local and production Vercel environments
export const API_BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? '' : 'http://localhost:5000')
export const SOCKET_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? window.location.origin : 'http://localhost:5000')

// ── Centralized Axios-like fetch helper with JWT auto-injection ──
// Usage: apiCall('/api/v1/requests', { method: 'POST', body: JSON.stringify(data) })
export async function apiCall(path, options = {}) {
  const token = localStorage.getItem('bc_token')
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
    const data = await res.json()
    return { ok: res.ok, status: res.status, data }
  } catch (err) {
    // Network error — return demo fallback shape
    console.warn(`[API] Network error for ${path}:`, err.message)
    return { ok: false, status: 0, error: err.message, networkError: true }
  }
}

// ── Save / load JWT token alongside user data ──
export function saveAuthToken(token) {
  if (token) localStorage.setItem('bc_token', token)
}

export function clearAuthToken() {
  localStorage.removeItem('bc_token')
}
