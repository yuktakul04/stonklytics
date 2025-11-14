import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "../firebase"

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
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
        setLoading(true)
        try {
            await signInWithEmailAndPassword(auth, email, password)
            setMessage('Logged in successfully')
            setTimeout(() => navigate('/dashboard'), 100)
        } catch (err) {
            setError(err.message || 'Login failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-dark-bg flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 animate-fade-in">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Stonklytics</h1>
                    <p className="text-gray-400">Sign in to your account</p>
                </div>
                
                <div className="bg-dark-card border border-dark-border py-10 px-8 shadow-large rounded-xl">
                    <h2 className="text-2xl font-semibold text-white mb-8 text-center">Sign In</h2>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full px-4 py-3 bg-dark-surface border border-dark-border rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-gray-600 focus:border-dark-border outline-none transition-all duration-200"
                                required
                            />
                        </div>
                        
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 bg-dark-surface border border-dark-border rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-gray-600 focus:border-dark-border outline-none transition-all duration-200"
                                required
                            />
                        </div>
                        
                        <button 
                            type="submit" 
                            disabled={loading}
                            className={`w-full py-3.5 px-4 rounded-lg font-medium transition-all duration-200 ${
                                loading 
                                    ? 'bg-gray-800 cursor-not-allowed text-gray-500' 
                                    : 'bg-white text-dark-bg hover:bg-gray-200 hover:shadow-medium'
                            }`}
                        >
                            {loading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-dark-bg border-t-transparent rounded-full animate-spin"></div>
                                    Signing in...
                                </div>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                        
                        <div className="text-center">
                            <p className="text-gray-400 text-sm">
                                Don't have an account?{' '}
                                <Link to="/signup" className="text-white hover:text-gray-300 font-medium transition-colors">
                                    Sign up
                                </Link>
                            </p>
                        </div>
                    </form>
                    
                    {/* Error Message */}
                    {error && (
                        <div className="mt-6 bg-dark-surface border border-red-900/50 text-red-400 px-4 py-3 rounded-lg animate-fade-in">
                            <div className="flex items-center">
                                <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <span className="text-sm">{error}</span>
                            </div>
                        </div>
                    )}
                    
                    {/* Success Message */}
                    {message && (
                        <div className="mt-6 bg-dark-surface border border-green-900/50 text-green-400 px-4 py-3 rounded-lg animate-fade-in">
                            <div className="flex items-center">
                                <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
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
