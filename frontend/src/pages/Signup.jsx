import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

export default function Signup() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')

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
            await api.post('/auth/signup', { email, password })
            setMessage('Account created. You can login now.')
        } catch (err) {
            setError(err?.response?.data?.detail || 'Signup failed')
        } finally {
            setLoading(false)
        }
    }

    const rowStyle = { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }
    const labelStyle = { minWidth: 140 }
    const inputStyle = { flex: 1, padding: 8 }

    return (
        <div style={{ maxWidth: 500, margin: '40px auto', padding: 24 }}>
            <h2>Sign up</h2>
            <form onSubmit={handleSubmit}>
                <div style={rowStyle}>
                    <label style={labelStyle}>Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        style={inputStyle}
                    />
                </div>
                <div style={rowStyle}>
                    <label style={labelStyle}>Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        style={inputStyle}
                    />
                </div>
                <div style={rowStyle}>
                    <label style={labelStyle}>Confirm password</label>
                    <input
                        type="password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder="••••••••"
                        style={inputStyle}
                    />
                </div>
                <button disabled={loading} type="submit" style={{ padding: '8px 12px' }}>
                    {loading ? 'Creating…' : 'Create account'}
                </button>
                <p>Already have an account? <Link to="/login">Login</Link></p>
            </form>
            {error && <p style={{ color: 'crimson', marginTop: 12 }}>{error}</p>}
            {message && <p style={{ color: 'seagreen', marginTop: 12 }}>{message}</p>}
        </div>
    )
}
