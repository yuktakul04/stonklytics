import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'
import { api } from '../api'

export default function UserPersonaSidebar({ isOpen, onClose }) {
    const navigate = useNavigate()
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [watchlists, setWatchlists] = useState([])
    const [statsLoading, setStatsLoading] = useState(true)
    const [stats, setStats] = useState({
        totalWatchlists: 0,
        totalStocks: 0,
        accountAge: 0
    })

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser)
            setLoading(false)
        })

        return () => unsubscribe()
    }, [])

    useEffect(() => {
        const fetchStats = async () => {
            if (user && isOpen) {
                setStatsLoading(true)
                try {
                    const response = await api.get('/watchlist')
                    const watchlistsData = response.data || []
                    setWatchlists(watchlistsData)
                    
                    const totalWatchlists = watchlistsData.length
                    const totalStocks = watchlistsData.reduce((sum, wl) => sum + (wl.items?.length || 0), 0)
                    
                    const accountAge = user.metadata?.creationTime 
                        ? Math.floor((new Date() - new Date(user.metadata.creationTime)) / (1000 * 60 * 60 * 24))
                        : 0
                    
                    setStats({
                        totalWatchlists,
                        totalStocks,
                        accountAge
                    })
                } catch (err) {
                    console.error('Error fetching watchlist stats:', err)
                } finally {
                    setStatsLoading(false)
                }
            }
        }
        fetchStats()
    }, [user, isOpen])

    const formatDate = (timestamp) => {
        if (!timestamp) return 'Unknown'
        const date = new Date(timestamp)
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        })
    }

    const formatRelativeTime = (timestamp) => {
        if (!timestamp) return 'Unknown'
        const date = new Date(timestamp)
        const now = new Date()
        const diffMs = now - date
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)
        
        if (diffMins < 1) return 'Just now'
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
        return formatDate(timestamp)
    }

    const getTopStocks = () => {
        const stockCounts = {}
        watchlists.forEach(wl => {
            wl.items?.forEach(item => {
                const symbol = item.symbol || item.ticker
                if (symbol) {
                    stockCounts[symbol] = (stockCounts[symbol] || 0) + 1
                }
            })
        })
        return Object.entries(stockCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([symbol]) => symbol)
    }

    if (loading) {
        return (
            <div className={`fixed inset-y-0 right-0 w-80 bg-[#0f0f12] border-l border-[#27272a] shadow-large transform transition-transform duration-300 ease-in-out z-50 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-6">
                    <div className="flex items-center justify-center h-64">
                        <div className="w-8 h-8 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin"></div>
                    </div>
                </div>
            </div>
        )
    }

    if (!user) {
        return (
            <div className={`fixed inset-y-0 right-0 w-80 bg-[#0f0f12] border-l border-[#27272a] shadow-large transform transition-transform duration-300 ease-in-out z-50 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-6">
                    <div className="text-center text-zinc-500">
                        <p>Please log in to view your profile</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/70 z-40 transition-opacity duration-300"
                    onClick={onClose}
                />
            )}
            
            {/* Sidebar */}
            <div className={`fixed inset-y-0 right-0 w-80 bg-[#0f0f12] border-l border-[#27272a] shadow-large transform transition-transform duration-300 ease-in-out z-50 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-[#27272a] bg-[#18181b]">
                        <h2 className="text-lg font-semibold text-white">Profile</h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#27272a] transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 ui-scrollbar">
                        {/* User Info */}
                        <div className="mb-6">
                            <div className="flex items-center space-x-4 mb-6">
                                <div className="w-16 h-16 bg-[#18181b] border border-[#27272a] rounded-full flex items-center justify-center text-white text-xl font-semibold">
                                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-semibold text-white truncate">
                                        {user.displayName || 'User'}
                                    </h3>
                                    <p className="text-sm text-zinc-500 truncate">{user.email}</p>
                                    <div className="mt-2">
                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                            user.emailVerified 
                                                ? 'bg-green-500/10 text-green-500' 
                                                : 'bg-amber-500/10 text-amber-500'
                                        }`}>
                                            {user.emailVerified ? '✓ Verified' : '⚠ Unverified'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stats Cards */}
                        {statsLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin"></div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <div className="bg-[#18181b] rounded-lg p-4 border border-[#27272a]">
                                    <div className="text-zinc-500 text-xs font-medium mb-1">Watchlists</div>
                                    <div className="text-2xl font-semibold text-white font-mono">{stats.totalWatchlists}</div>
                                </div>
                                <div className="bg-[#18181b] rounded-lg p-4 border border-[#27272a]">
                                    <div className="text-zinc-500 text-xs font-medium mb-1">Stocks</div>
                                    <div className="text-2xl font-semibold text-white font-mono">{stats.totalStocks}</div>
                                </div>
                                <div className="bg-[#18181b] rounded-lg p-4 border border-[#27272a] col-span-2">
                                    <div className="text-zinc-500 text-xs font-medium mb-1">Account Age</div>
                                    <div className="text-lg font-medium text-white">
                                        {stats.accountAge > 0 ? `${stats.accountAge} day${stats.accountAge !== 1 ? 's' : ''}` : 'New Account'}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Top Tracked Stocks */}
                        {!statsLoading && getTopStocks().length > 0 && (
                            <div className="mb-6">
                                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">Top Stocks</h4>
                                <div className="flex flex-wrap gap-2">
                                    {getTopStocks().map((symbol, idx) => (
                                        <span 
                                            key={idx}
                                            className="px-3 py-1.5 bg-[#18181b] border border-[#27272a] rounded-lg text-sm font-medium text-white hover:bg-[#27272a] transition-colors cursor-default"
                                        >
                                            {symbol}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Account Details */}
                        <div className="space-y-4 mb-6">
                            <div className="pt-4 border-t border-[#27272a]">
                                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">Account Info</h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs text-zinc-600 mb-1">Member Since</label>
                                        <p className="text-sm text-zinc-300">{formatDate(user.metadata?.creationTime)}</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-zinc-600 mb-1">Last Sign In</label>
                                        <p className="text-sm text-zinc-300">{formatRelativeTime(user.metadata?.lastSignInTime)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Watchlists Preview */}
                        {!statsLoading && watchlists.length > 0 && (
                            <div className="pt-4 border-t border-[#27272a]">
                                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">Your Watchlists</h4>
                                <div className="space-y-2">
                                    {watchlists.slice(0, 3).map((watchlist) => (
                                        <button
                                            key={watchlist.id}
                                            onClick={() => {
                                                onClose()
                                                navigate(`/watchlists?watchlist=${watchlist.id}`)
                                            }}
                                            className="w-full bg-[#18181b] rounded-lg p-3 border border-[#27272a] hover:bg-[#27272a] hover:border-[#3f3f46] transition-all text-left cursor-pointer"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="text-sm font-medium text-white">{watchlist.name}</div>
                                                    <div className="text-xs text-zinc-500 mt-0.5">
                                                        {watchlist.items?.length || 0} stock{watchlist.items?.length !== 1 ? 's' : ''}
                                                    </div>
                                                </div>
                                                <svg className="w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </button>
                                    ))}
                                    {watchlists.length > 3 && (
                                        <button
                                            onClick={() => {
                                                onClose()
                                                navigate('/watchlists')
                                            }}
                                            className="w-full text-xs text-zinc-500 hover:text-zinc-400 text-center pt-1 transition-colors"
                                        >
                                            +{watchlists.length - 3} more watchlist{watchlists.length - 3 !== 1 ? 's' : ''}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-[#27272a] bg-[#18181b]">
                        <div className="text-center text-xs text-zinc-600">
                            Stonklytics Profile
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
