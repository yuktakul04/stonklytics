import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'
import { api } from '../api'

export default function Watchlist({ isOpen, onClose, onStockSelect }) {
    const [user, setUser] = useState(null)
    const [watchlist, setWatchlist] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser)
            if (firebaseUser) {
                fetchWatchlist()
            } else {
                setWatchlist([])
                setLoading(false)
            }
        })

        return () => unsubscribe()
    }, [])

    const fetchWatchlist = async () => {
        try {
            setLoading(true)
            const response = await api.get('/watchlist')
            setWatchlist(response.data)
        } catch (err) {
            console.error('Error fetching watchlist:', err)
            setError('Failed to load watchlist')
        } finally {
            setLoading(false)
        }
    }

    const addToWatchlist = async (ticker, name) => {
        try {
            const response = await api.post('/watchlist', {
                ticker: ticker,
                name: name
            })
            setWatchlist(prev => [response.data, ...prev])
        } catch (err) {
            console.error('Error adding to watchlist:', err)
            setError(err.response?.data?.detail || 'Failed to add to watchlist')
        }
    }

    const removeFromWatchlist = async (ticker) => {
        try {
            await api.delete(`/watchlist/${ticker}`)
            setWatchlist(prev => prev.filter(item => item.ticker !== ticker))
        } catch (err) {
            console.error('Error removing from watchlist:', err)
            setError('Failed to remove from watchlist')
        }
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
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-900">My Watchlist</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
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

                        {/* Watchlist Items */}
                        {watchlist.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No stocks in watchlist</h3>
                                <p className="text-sm text-gray-600">Add stocks to your watchlist to track them easily</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {watchlist.map((item) => (
                                    <div key={item.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-3">
                                                    <button
                                                        onClick={() => onStockSelect && onStockSelect(item.ticker)}
                                                        className="text-left flex-1"
                                                    >
                                                        <h4 className="font-semibold text-gray-900">{item.ticker}</h4>
                                                        {item.name && (
                                                            <p className="text-sm text-gray-600">{item.name}</p>
                                                        )}
                                                        <p className="text-xs text-gray-500">Added {formatDate(item.added_at)}</p>
                                                    </button>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removeFromWatchlist(item.ticker)}
                                                className="text-red-500 hover:text-red-700 transition-colors p-1"
                                                title="Remove from watchlist"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-200">
                        <div className="text-center text-sm text-gray-500">
                            <p>{watchlist.length} stock{watchlist.length !== 1 ? 's' : ''} in watchlist</p>
                        </div>
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

    const addToWatchlist = async (ticker, name) => {
        if (!user) return { success: false, error: 'Not logged in' }
        
        try {
            const response = await api.post('/watchlist', {
                ticker: ticker,
                name: name
            })
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
