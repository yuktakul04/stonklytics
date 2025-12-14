import { useState, useEffect, useCallback } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'
import { api } from '../api'

export default function Watchlist({ isOpen, onClose, onStockSelect }) {
    const [user, setUser] = useState(null)
    const [watchlists, setWatchlists] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [newWatchlistName, setNewWatchlistName] = useState('')
    const [creating, setCreating] = useState(false)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser)
            if (firebaseUser) {
                fetchWatchlist()
            } else {
                setWatchlists([])
                setLoading(false)
            }
        })

        return () => unsubscribe()
    }, [])

    const fetchWatchlist = useCallback(async () => {
        try {
            setLoading(true)
            const response = await api.get('/watchlist')
            setWatchlists(response.data)
        } catch (err) {
            console.error('Error fetching watchlist:', err)
            setError('Failed to load watchlist')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (isOpen && user) {
            fetchWatchlist()
        }
    }, [isOpen, user, fetchWatchlist])

    const removeFromWatchlist = async (ticker) => {
        try {
            await api.delete(`/watchlist/remove/${ticker}`)
            await fetchWatchlist()
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
            await fetchWatchlist()
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

            await fetchWatchlist()
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
                        <p>Please log in to view your watchlist</p>
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
                    <div className="p-6 border-b border-[#27272a] bg-[#18181b]">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-white">Watchlists</h2>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#27272a] transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 ui-scrollbar">
                        {/* Error Message */}
                        {error && (
                            <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2.5 rounded-lg animate-fade-in">
                                <div className="flex items-center">
                                    <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-sm">{error}</span>
                                </div>
                            </div>
                        )}

                        {/* All Watchlists */}
                        {watchlists.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="w-14 h-14 bg-[#18181b] border border-[#27272a] rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-7 h-7 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                </div>
                                <h3 className="text-base font-medium text-white mb-1">No watchlists yet</h3>
                                <p className="text-sm text-zinc-500 mb-4">Create your first watchlist</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {watchlists.map((watchlist) => (
                                    <div key={watchlist.id} className="bg-[#18181b] border border-[#27272a] rounded-lg p-4 hover:border-[#3f3f46] transition-colors duration-200">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-medium text-white">{watchlist.name}</h3>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-xs text-zinc-500">
                                                    {watchlist.items?.length || 0} {watchlist.items?.length === 1 ? 'stock' : 'stocks'}
                                                </span>
                                                <button
                                                    onClick={() => deleteWatchlist(watchlist.id)}
                                                    className="text-zinc-600 hover:text-red-400 transition-colors p-1"
                                                    title="Delete watchlist"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                        {watchlist.items && watchlist.items.length > 0 && (
                                            <div className="space-y-1.5 mt-3">
                                                {watchlist.items.map((item, idx) => {
                                                    const ticker = item.symbol || item.ticker || '';
                                                    return (
                                                        <div key={idx} className="flex items-center justify-between p-2.5 bg-[#0f0f12] rounded-lg border border-[#27272a] hover:border-[#3f3f46] hover:bg-[#1f1f23] transition-all duration-200">
                                                            <button
                                                                onClick={() => onStockSelect(ticker)}
                                                                className="flex-1 text-left transition-colors"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium text-white text-sm">{ticker}</span>
                                                                    {item.name && (
                                                                        <span className="text-zinc-500 text-xs truncate">{item.name}</span>
                                                                    )}
                                                                </div>
                                                            </button>
                                                            <button
                                                                onClick={() => removeFromWatchlist(ticker)}
                                                                className="text-zinc-600 hover:text-red-400 transition-colors p-1 ml-2 rounded"
                                                                title="Remove stock"
                                                            >
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-[#27272a] bg-[#18181b]">
                        {!showCreateForm ? (
                            <button
                                onClick={() => setShowCreateForm(true)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#3b82f6] hover:bg-[#1d4ed8] text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                <span>New Watchlist</span>
                            </button>
                        ) : (
                            <form onSubmit={handleCreateSubmit} className="space-y-2">
                                <input
                                    type="text"
                                    value={newWatchlistName}
                                    onChange={(e) => setNewWatchlistName(e.target.value)}
                                    placeholder="Watchlist name"
                                    className="w-full px-3 py-2 bg-[#18181b] border border-[#27272a] rounded-lg text-white text-sm placeholder:text-zinc-600 focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]/20 transition-all"
                                    autoFocus
                                />
                                <div className="flex space-x-2">
                                    <button
                                        type="submit"
                                        disabled={creating}
                                        className={`flex-1 px-4 py-2 bg-[#3b82f6] hover:bg-[#1d4ed8] text-white text-sm font-medium rounded-lg transition-colors ${creating ? 'opacity-60 cursor-not-allowed' : ''}`}
                                    >
                                        {creating ? 'Creating...' : 'Create'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowCreateForm(false)
                                            setNewWatchlistName('')
                                        }}
                                        className="px-4 py-2 bg-[#18181b] border border-[#27272a] text-zinc-400 hover:text-white hover:border-[#3f3f46] text-sm font-medium rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}

export const useWatchlist = () => {
    const [user, setUser] = useState(null)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser)
        })
        return () => unsubscribe()
    }, [])

    const addToWatchlist = async (ticker, name, watchlistId = null) => {
        if (!user) return { success: false, error: 'Not logged in' }

        try {
            const payload = {
                ticker: ticker,
                name: name
            }

            if (watchlistId) {
                payload.watchlist_id = watchlistId
            }

            const response = await api.post('/watchlist/add', payload)
            return { success: true, data: response.data }
        } catch (err) {
            return {
                success: false,
                error: err.response?.data?.detail || 'Failed to add to watchlist'
            }
        }
    }

    return { addToWatchlist, user }
}
