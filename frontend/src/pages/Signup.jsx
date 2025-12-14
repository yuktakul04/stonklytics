import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { auth } from '../firebase'
import { api } from '../api'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!email || !password) {
      setError('Email and password are required')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      if (displayName) {
        await updateProfile(user, { displayName })
      }
      const token = await user.getIdToken()
      await api.post('/signup', {
        email: email,
        display_name: displayName || user.displayName || ''
      })

      setMessage('Account created successfully! Redirecting to dashboard...')
      setTimeout(() => navigate('/dashboard'), 1000)

    } catch (err) {
      console.error('Signup error:', err)

      if (err.response?.data?.error) {
        setError(err.response.data.error)
      } else if (err?.message) {
        setError(err.message)
      } else {
        setError('Signup failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 animate-fade-in">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-white mb-2 tracking-tight">Stonklytics</h1>
          <p className="text-sm text-zinc-500">Create your account</p>
        </div>

        <div className="bg-[#0f0f12] border border-[#27272a] rounded-xl py-8 px-8">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">Sign Up</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-zinc-400 mb-2">
                Display Name <span className="text-zinc-600">(Optional)</span>
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-3 py-2.5 bg-[#18181b] border border-[#27272a] rounded-lg text-white text-sm placeholder:text-zinc-600 focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]/20 transition-all"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-400 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2.5 bg-[#18181b] border border-[#27272a] rounded-lg text-white text-sm placeholder:text-zinc-600 focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]/20 transition-all"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-400 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 bg-[#18181b] border border-[#27272a] rounded-lg text-white text-sm placeholder:text-zinc-600 focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]/20 transition-all"
                required
              />
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-zinc-400 mb-2">
                Confirm Password
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 bg-[#18181b] border border-[#27272a] rounded-lg text-white text-sm placeholder:text-zinc-600 focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]/20 transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 bg-[#3b82f6] hover:bg-[#1d4ed8] text-white font-medium rounded-lg transition-colors ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Creating account...
                </div>
              ) : (
                'Create Account'
              )}
            </button>

            <div className="text-center pt-2">
              <p className="text-zinc-500 text-sm">
                Already have an account?{' '}
                <Link to="/login" className="text-white hover:text-zinc-300 font-medium transition-colors">
                  Login
                </Link>
              </p>
            </div>
          </form>

          {/* Error Message */}
          {error && (
            <div className="mt-5 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-400 animate-fade-in">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Success Message */}
          {message && (
            <div className="mt-5 rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3 text-green-400 animate-fade-in">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">{message}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
