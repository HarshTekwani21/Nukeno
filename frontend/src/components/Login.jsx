import React, { useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })
      const data = await res.json()
      if (res.ok) {
        localStorage.setItem('nukeno_token', data.token)
        localStorage.setItem('nukeno_user', data.username)
        onLogin(data.token, data.username)
      } else {
        setError(data.detail || 'Invalid credentials')
      }
    } catch {
      setError('Cannot connect to server. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="flex h-screen items-center justify-center"
      style={{ background: 'linear-gradient(160deg, #0b0d1a 0%, #111526 60%, #0b0d1a 100%)' }}
    >
      <div
        className="w-full max-w-sm mx-4 rounded-2xl p-8"
        style={{
          background: 'rgba(19,22,43,0.9)',
          border: '1px solid rgba(110,78,242,0.25)',
          boxShadow: '0 0 40px rgba(200,75,255,0.08), 0 20px 60px rgba(0,0,0,0.4)',
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
            style={{
              background: 'linear-gradient(135deg, rgba(200,75,255,0.1), rgba(0,212,255,0.1))',
              border: '1px solid rgba(200,75,255,0.2)',
              boxShadow: '0 0 20px rgba(200,75,255,0.15)',
            }}
          >
            <img src="/NukenoLogoi.png" alt="Nukeno" className="w-14 h-14 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome to Nukeno</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your workspace</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin or Nukeeta"
              autoFocus
              className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none transition-all placeholder-gray-600"
              style={{
                background: 'rgba(11,13,26,0.8)',
                border: `1px solid ${username ? 'rgba(110,78,242,0.5)' : 'rgba(30,36,71,0.8)'}`,
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-3 pr-11 rounded-xl text-white text-sm outline-none transition-all placeholder-gray-600"
                style={{
                  background: 'rgba(11,13,26,0.8)',
                  border: `1px solid ${password ? 'rgba(110,78,242,0.5)' : 'rgba(30,36,71,0.8)'}`,
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div
              className="px-3 py-2 rounded-lg text-xs"
              style={{
                background: 'rgba(248,113,113,0.08)',
                border: '1px solid rgba(248,113,113,0.2)',
                color: '#f87171',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password.trim()}
            className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none mt-2"
            style={{
              background: 'linear-gradient(135deg, #c84bff, #6e4ef2, #00d4ff)',
              boxShadow: '0 4px 20px rgba(200,75,255,0.25)',
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in...
              </span>
            ) : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-700 mt-6">
          Nukeno v2 · Powered by Gemini
        </p>
      </div>
    </div>
  )
}

export default Login
