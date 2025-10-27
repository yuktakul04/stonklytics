import { useState, useEffect } from 'react'
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

    const fetchWatchlist = async () => {
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
    }


    const removeFromWatchlist = async (ticker) => {
        try {
            await api.delete(`/watchlist/remove/${ticker}`)
            // Refresh the watchlist data
            await fetchWatchlist()
        } catch (err) {
            console.error('Error removing from watchlist:', err)
            setError('Failed to remove from watchlist')
        }
    }

    const deleteWatchlist = async (watchlistId) => {
        if (!window.confirm('Are you sure you want to delete this watchlist? This will also delete all stocks in it.')) {
            return
        }

        try {
            await api.delete(`/watchlist/delete/${watchlistId}`)
            // Refresh the watchlist data
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

            // Refresh watchlists
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

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString()
    }

    if (loading) {
        return (
            <div className={`fixed inset-y-0 right-0 w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-6">
                    <div className="flex items-center justify-center h-64">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                </div>
            </div>
        )
    }

    if (!user) {
        return (
            <div className={`fixed inset-y-0 right-0 w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-6">
                    <div className="text-center text-gray-500">
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
                    className="fixed inset-0 bg-black bg-opacity-50 z-40"
                    onClick={onClose}
                />
            )}
            {/* Sidebar */}
            <div className={`fixed inset-y-0 right-0 w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-gray-900">My Watchlists</h2>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* Error Message */}
                        {error && (
                            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                <div className="flex items-center">
                                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    {error}
                                </div>
                            </div>
                        )}

                        {/* All Watchlists */}
                        {watchlists.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No watchlists yet</h3>
                                <p className="text-sm text-gray-600 mb-4">Create your first watchlist to get started</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {watchlists.map((watchlist) => (
                                    <div key={watchlist.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-semibold text-gray-900">{watchlist.name}</h3>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-sm text-gray-500">
                                                    {watchlist.items?.length || 0} {watchlist.items?.length === 1 ? 'stock' : 'stocks'}
                                                </span>
                                                <button
                                                    onClick={() => deleteWatchlist(watchlist.id)}
                                                    className="text-red-500 hover:text-red-700 transition-colors p-1"
                                                    title="Delete watchlist"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-200">
                        {!showCreateForm ? (
                            <button
                                onClick={() => setShowCreateForm(true)}
                                className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                <span>Create New Watchlist</span>
                            </button>
                        ) : (
                            <form onSubmit={handleCreateSubmit} className="space-y-2">
                                <input
                                    type="text"
                                    value={newWatchlistName}
                                    onChange={(e) => setNewWatchlistName(e.target.value)}
                                    placeholder="Enter watchlist name"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    autoFocus
                                />
                                <div className="flex space-x-2">
                                    <button
                                        type="submit"
                                        disabled={creating}
                                        className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors duration-200 disabled:bg-gray-400"
                                    >
                                        {creating ? 'Creating...' : 'Create'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowCreateForm(false)
                                            setNewWatchlistName('')
                                        }}
                                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors duration-200"
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

// Export the addToWatchlist function for use in other components
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

            // If a specific watchlist is provided, use it
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
