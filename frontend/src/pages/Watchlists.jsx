import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'
import { api } from '../api'
import UserPersonaSidebar from '../components/UserPersonaSidebar'
import ChatInterface from '../components/ChatInterface'

export default function Watchlists() {
    const [user, setUser] = useState(null)
    const [watchlists, setWatchlists] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [newWatchlistName, setNewWatchlistName] = useState('')
    const [creating, setCreating] = useState(false)
    const [stockPrices, setStockPrices] = useState({}) // { ticker: { price, change, changePercent } }
    const [loadingPrices, setLoadingPrices] = useState({})
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [chatOpen, setChatOpen] = useState(false)
    const navigate = useNavigate()

    const fetchPricesForTickers = useCallback(async (tickers) => {
        setLoadingPrices(prev => {
            const newState = { ...prev }
            tickers.forEach(ticker => {
                newState[ticker] = true
            })
            return newState
        })

        // Fetch prices for all tickers in parallel
        const pricePromises = tickers.map(async (ticker) => {
            try {
                const response = await api.get(`/stock/data/?ticker=${ticker}`)
                return {
                    ticker,
                    data: response.data
                }
            } catch (err) {
                console.error(`Error fetching price for ${ticker}:`, err)
                return {
                    ticker,
                    data: null
                }
            }
        })

        const results = await Promise.all(pricePromises)
        
        const prices = {}
        results.forEach(({ ticker, data }) => {
            if (data) {
                prices[ticker] = {
                    price: data.current_price,
                    name: data.name
                }
            }
        })

        setStockPrices(prev => ({ ...prev, ...prices }))
        
        setLoadingPrices(prev => {
            const newState = { ...prev }
            tickers.forEach(ticker => {
                newState[ticker] = false
            })
            return newState
        })
    }, [])

    const fetchWatchlists = useCallback(async () => {
        try {
            setLoading(true)
            const response = await api.get('/watchlist')
            setWatchlists(response.data)
            
            // Fetch prices for all stocks
            const allTickers = new Set()
            response.data.forEach(watchlist => {
                watchlist.items?.forEach(item => {
                    const ticker = item.symbol || item.ticker
                    if (ticker) allTickers.add(ticker)
                })
            })
            
            if (allTickers.size > 0) {
                fetchPricesForTickers(Array.from(allTickers))
            }
        } catch (err) {
            console.error('Error fetching watchlists:', err)
            setError('Failed to load watchlists')
        } finally {
            setLoading(false)
        }
    }, [fetchPricesForTickers])

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser)
            if (firebaseUser) {
                fetchWatchlists()
            } else {
                setWatchlists([])
                setLoading(false)
                navigate('/login')
            }
        })

        return () => unsubscribe()
    }, [navigate, fetchWatchlists])

    const removeFromWatchlist = async (ticker) => {
        try {
            await api.delete(`/watchlist/remove/${ticker}`)
            await fetchWatchlists()
        } catch (err) {
            console.error('Error removing from watchlist:', err)
            setError(err.response?.data?.detail || 'Failed to remove from watchlist')
        }
    }

    const deleteWatchlist = async (watchlistId) => {
        if (!window.confirm('Are you sure you want to delete this watchlist? This will also delete all stocks in it.')) {
            return
        }

        try {
            await api.delete(`/watchlist/delete/${watchlistId}`)
            await fetchWatchlists()
        } catch (err) {
            console.error('Error deleting watchlist:', err)
            setError('Failed to delete watchlist')
        }
    }

    const createWatchlist = async (name) => {
        try {
            setCreating(true)
            setError('')
            const response = await api.post('/watchlist/create', { name })

            await fetchWatchlists()
            setShowCreateForm(false)
            setNewWatchlistName('')

            return { success: true, data: response.data }
        } catch (err) {
            console.error('Error creating watchlist:', err)
            const errorMsg = err.response?.data?.detail || 'Failed to create watchlist'
            setError(errorMsg)
            return { success: false, error: errorMsg }
        } finally {
            setCreating(false)
        }
    }

    const handleCreateSubmit = async (e) => {
        e.preventDefault()
        if (!newWatchlistName.trim()) {
            setError('Please enter a watchlist name')
            return
        }
        await createWatchlist(newWatchlistName.trim())
    }

    const handleStockClick = (ticker) => {
        navigate(`/dashboard?ticker=${ticker}`)
    }

    const handleLogout = async () => {
        try {
            await signOut(auth)
            navigate('/login')
        } catch (err) {
            console.error('Logout failed:', err)
        }
    }

    const formatCurrency = (num) => {
        if (num === null || num === undefined) return 'N/A'
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-dark-bg flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-gray-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading watchlists...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-dark-bg">
            {/* Top Navigation Bar */}
            <nav className="border-b border-dark-border bg-dark-surface/50 backdrop-blur-sm sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-8">
                            <h1 
                                className="text-2xl font-bold text-white tracking-tight cursor-pointer"
                                onClick={() => navigate('/dashboard')}
                            >
                                Stonklytics
                            </h1>
                            <div className="hidden md:flex items-center space-x-1 text-sm text-gray-400">
                                <span 
                                    className="px-3 py-1.5 rounded-md hover:bg-dark-hover transition-colors cursor-pointer"
                                    onClick={() => navigate('/dashboard')}
                                >
                                    Dashboard
                                </span>
                                <span className="px-3 py-1.5 rounded-md bg-dark-hover text-white font-medium">Watchlists</span>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={() => setChatOpen(true)}
                                className="px-4 py-2 rounded-lg border border-dark-border bg-dark-card hover:bg-dark-hover text-gray-300 hover:text-white transition-all duration-200 flex items-center space-x-2 text-sm font-medium"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                                <span className="hidden sm:inline">AI Assistant</span>
                            </button>
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="px-4 py-2 rounded-lg border border-dark-border bg-dark-card hover:bg-dark-hover text-gray-300 hover:text-white transition-all duration-200 flex items-center space-x-2 text-sm font-medium"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span className="hidden sm:inline">Profile</span>
                            </button>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 rounded-lg border border-dark-border bg-dark-card hover:bg-dark-hover text-gray-300 hover:text-white transition-all duration-200 text-sm font-medium"
                            >
                                <span className="hidden sm:inline">Logout</span>
                                <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2">My Watchlists</h2>
                        <p className="text-gray-400">Monitor your favorite stocks</p>
                    </div>
                    {!showCreateForm ? (
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="px-6 py-3 bg-white text-dark-bg hover:bg-gray-200 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            <span>Create Watchlist</span>
                        </button>
                    ) : (
                        <form onSubmit={handleCreateSubmit} className="flex items-center space-x-2">
                            <input
                                type="text"
                                value={newWatchlistName}
                                onChange={(e) => setNewWatchlistName(e.target.value)}
                                placeholder="Enter watchlist name"
                                className="px-4 py-2 bg-dark-surface border border-dark-border rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-gray-500 focus:border-gray-600 outline-none"
                                autoFocus
                            />
                            <button
                                type="submit"
                                disabled={creating}
                                className="px-4 py-2 bg-white text-dark-bg hover:bg-gray-200 rounded-lg font-medium transition-all duration-200 disabled:bg-gray-800 disabled:text-gray-500"
                            >
                                {creating ? 'Creating...' : 'Create'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowCreateForm(false)
                                    setNewWatchlistName('')
                                }}
                                className="px-4 py-2 bg-dark-card hover:bg-dark-hover border border-dark-border text-gray-300 rounded-lg font-medium transition-colors duration-200"
                            >
                                Cancel
                            </button>
                        </form>
                    )}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 bg-red-950/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg flex items-center animate-fade-in">
                        <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium">{error}</span>
                    </div>
                )}

                {/* Watchlists */}
                {watchlists.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 bg-dark-surface border border-dark-border rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-semibold text-white mb-3">No watchlists yet</h3>
                        <p className="text-gray-400 mb-6">Create your first watchlist to get started</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {watchlists.map((watchlist) => (
                            <div key={watchlist.id} className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
                                {/* Watchlist Header */}
                                <div className="bg-dark-surface border-b border-dark-border p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-xl font-semibold text-white mb-1">{watchlist.name}</h3>
                                            <p className="text-sm text-gray-400">
                                                {watchlist.items?.length || 0} {watchlist.items?.length === 1 ? 'stock' : 'stocks'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => deleteWatchlist(watchlist.id)}
                                            className="text-gray-400 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-950/20"
                                            title="Delete watchlist"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Stocks List */}
                                {watchlist.items && watchlist.items.length > 0 ? (
                                    <div className="divide-y divide-dark-border">
                                        {watchlist.items.map((item, idx) => {
                                            const ticker = item.symbol || item.ticker || ''
                                            const priceData = stockPrices[ticker]
                                            const isLoading = loadingPrices[ticker]

                                            return (
                                                <div
                                                    key={idx}
                                                    className="p-4 hover:bg-dark-hover transition-colors duration-200 cursor-pointer"
                                                    onClick={() => handleStockClick(ticker)}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-3 mb-1">
                                                                <span className="font-semibold text-white text-lg">{ticker}</span>
                                                                {priceData?.name && (
                                                                    <span className="text-gray-400 text-sm">{priceData.name}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-6">
                                                            <div className="text-right">
                                                                {isLoading ? (
                                                                    <div className="w-16 h-5 bg-dark-surface rounded animate-pulse"></div>
                                                                ) : priceData?.price ? (
                                                                    <div className="text-white font-semibold text-lg">
                                                                        {formatCurrency(priceData.price)}
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-gray-500 text-sm">N/A</div>
                                                                )}
                                                            </div>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    removeFromWatchlist(ticker)
                                                                }}
                                                                className="text-gray-400 hover:text-red-400 transition-colors p-2 rounded hover:bg-red-950/20"
                                                                title="Remove stock"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-gray-400">
                                        <p>No stocks in this watchlist</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* User Persona Sidebar */}
            <UserPersonaSidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            {/* Chat Interface */}
            <ChatInterface
                isOpen={chatOpen}
                onClose={() => setChatOpen(false)}
            />
        </div>
    )
}

