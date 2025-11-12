import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { api } from '../api'
import UserPersonaSidebar from '../components/UserPersonaSidebar'
import Watchlist, { useWatchlist } from '../components/Watchlist'
import FundamentalsModal from '../components/FundamentalsModal'
import NewsModal from '../components/NewsModal'
import ChatInterface from '../components/ChatInterface'

export default function Dashboard() {
    const [ticker, setTicker] = useState('')
    const [stockData, setStockData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [showSearchResults, setShowSearchResults] = useState(false)
    const [searchLoading, setSearchLoading] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [watchlistOpen, setWatchlistOpen] = useState(false)
    const [watchlistMessage, setWatchlistMessage] = useState('')
    const [watchlists, setWatchlists] = useState([])
    const [selectedWatchlistId, setSelectedWatchlistId] = useState('')
    const [showWatchlistDropdown, setShowWatchlistDropdown] = useState(false)
    const [fundamentalsOpen, setFundamentalsOpen] = useState(false)
    const [newsOpen, setNewsOpen] = useState(false)
    const [chatOpen, setChatOpen] = useState(false)
    const navigate = useNavigate()
    const searchRef = useRef(null)
    const searchTimeoutRef = useRef(null)
    const watchlistDropdownRef = useRef(null)
    const { addToWatchlist, user } = useWatchlist()

    // Close search results when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSearchResults(false)
            }
            if (watchlistDropdownRef.current && !watchlistDropdownRef.current.contains(event.target)) {
                setShowWatchlistDropdown(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    // Fetch watchlists when user logs in
    useEffect(() => {
        const fetchWatchlists = async () => {
            if (user) {
                try {
                    const response = await api.get('/watchlist')
                    setWatchlists(response.data)
                    // Auto-select first watchlist if available
                    if (response.data.length > 0 && !selectedWatchlistId) {
                        setSelectedWatchlistId(response.data[0].id)
                    }
                } catch (err) {
                    console.error('Error fetching watchlists:', err)
                }
            }
        }
        fetchWatchlists()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user])

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current)
            }
        }
    }, [])

    const handleCompanySearch = async (query) => {
        // Clear previous timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current)
        }

        // If query is too short, clear results immediately
        if (query.length < 2) {
            setSearchResults([])
            setShowSearchResults(false)
            setSearchLoading(false)
            return
        }

        // Debounce the search - wait 500ms after user stops typing
        searchTimeoutRef.current = setTimeout(async () => {
            setSearchLoading(true)
            try {
                const response = await api.get(`/stock/search/?q=${encodeURIComponent(query)}`)
                setSearchResults(response.data.results || [])
                setShowSearchResults(true)
            } catch (err) {
                console.error('Search error:', err)
                setSearchResults([])
                setShowSearchResults(false)
            } finally {
                setSearchLoading(false)
            }
        }, 500)
    }

    const handleSearch = async (e) => {
        e.preventDefault()
        if (!ticker.trim()) {
            setError('Please enter a ticker symbol or company name')
            return
        }

        setLoading(true)
        setError('')
        setStockData(null)
        setShowSearchResults(false)

        try {
            console.log('Making API request to:', `/stock/data/?ticker=${ticker.toUpperCase()}`)
            const response = await api.get(`/stock/data/?ticker=${ticker.toUpperCase()}`)
            console.log('API response:', response.data)
            setStockData(response.data)
        } catch (err) {
            console.error('API error:', err)
            console.error('Error details:', err.response?.data)
            setError(err.response?.data?.error || err.message || 'Failed to fetch stock data')
        } finally {
            setLoading(false)
        }
    }

    const handleTickerSelect = (selectedTicker) => {
        setTicker(selectedTicker)
        setShowSearchResults(false)
        setSearchResults([])
    }

    const handleAddToWatchlistClick = () => {
        if (!user) {
            setWatchlistMessage('Please log in to add stocks to your watchlist')
            setTimeout(() => setWatchlistMessage(''), 3000)
            return
        }

        if (watchlists.length === 0) {
            setWatchlistMessage('Please create a watchlist first')
            setTimeout(() => setWatchlistMessage(''), 3000)
            return
        }

        // Show dropdown
        setShowWatchlistDropdown(true)
    }

    const handleWatchlistSelect = async (watchlistId, ticker, name) => {
        setSelectedWatchlistId(watchlistId)
        setShowWatchlistDropdown(false)

        const result = await addToWatchlist(ticker, name, watchlistId)
        if (result.success) {
            const selectedWatchlist = watchlists.find(w => w.id === watchlistId)
            setWatchlistMessage(`Added ${ticker} to ${selectedWatchlist?.name || 'watchlist'}!`)
            setTimeout(() => setWatchlistMessage(''), 3000)
        } else {
            setWatchlistMessage(result.error)
            setTimeout(() => setWatchlistMessage(''), 3000)
        }
    }

    const handleStockSelectFromWatchlist = (selectedTicker) => {
        setTicker(selectedTicker)
        setWatchlistOpen(false)
    }

    const handleLogout = async () => {
        try {
            await signOut(auth)
            navigate('/login')
        } catch (err) {
            console.error('Logout failed:', err)
        }
    }

    const formatNumber = (num) => {
        if (num === null || num === undefined) return 'N/A'
        return new Intl.NumberFormat('en-US').format(num)
    }

    const formatCurrency = (num) => {
        if (num === null || num === undefined) return 'N/A'
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(num)
    }

    return (
        <div className="min-h-screen bg-[#FAF9F6]">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Stonklytics</h1>
                        <p className="text-gray-600">Real-time stock market analytics</p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => setChatOpen(true)}
                            className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                            <span>AI Assistant</span>
                        </button>
                        <button
                            onClick={() => setWatchlistOpen(true)}
                            className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>Watchlist</span>
                        </button>
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span>Profile</span>
                        </button>
                        <button
                            onClick={handleLogout}
                            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
                        >
                            Logout
                        </button>
                    </div>
                </div>

                {/* Search Form */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Search Stock</h2>
                    <form onSubmit={handleSearch} className="flex gap-4">
                        <div className="flex-1 relative" ref={searchRef}>
                            <input
                                type="text"
                                value={ticker}
                                onChange={(e) => {
                                    const value = e.target.value
                                    setTicker(value)
                                    handleCompanySearch(value)
                                }}
                                placeholder="Enter ticker symbol or company name (e.g., AAPL, Apple, Microsoft)"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
                            />

                            {/* Search Results Dropdown */}
                            {showSearchResults && (searchResults.length > 0 || searchLoading) && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    {searchLoading ? (
                                        <div className="p-4 text-center text-gray-500">
                                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                            Searching...
                                        </div>
                                    ) : (
                                        searchResults.map((result, index) => (
                                            <button
                                                key={index}
                                                type="button"
                                                onClick={() => handleTickerSelect(result.ticker)}
                                                className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                                            >
                                                <div className="font-semibold text-gray-900">{result.ticker}</div>
                                                <div className="text-sm text-gray-600">{result.name}</div>
                                                <div className="text-xs text-gray-500">{result.primary_exchange}</div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`px-8 py-3 rounded-lg font-medium transition-all duration-200 ${loading
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
                                } text-white`}
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Searching...
                                </div>
                            ) : (
                                'Search Stock'
                            )}
                        </button>
                    </form>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                        <div className="flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    </div>
                )}

                {/* Watchlist Message */}
                {watchlistMessage && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
                        <div className="flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            {watchlistMessage}
                        </div>
                    </div>
                )}

                {/* Stock Data Card */}
                {stockData && (
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        {/* Stock Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-3xl font-bold">{stockData.ticker}</h3>
                                    <p className="text-blue-100 text-lg mt-1">{stockData.name}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-4xl font-bold">
                                        {formatCurrency(stockData.current_price)}
                                    </div>
                                    <div className="text-blue-100 text-sm mt-1">Current Price</div>
                                </div>
                            </div>
                            <div className="mt-4 flex justify-end space-x-3" ref={watchlistDropdownRef}>
                                <button
                                    onClick={() => setNewsOpen(true)}
                                    className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                                    </svg>
                                    <span>News</span>
                                </button>
                                <button
                                    onClick={() => setFundamentalsOpen(true)}
                                    className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    <span>Fundamentals</span>
                                </button>

                                {showWatchlistDropdown ? (
                                    /* Dropdown Menu */
                                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 min-w-[200px]">
                                        <div className="p-2">
                                            <div className="text-xs font-semibold text-gray-500 uppercase px-2 py-1 mb-1">
                                                Select Watchlist
                                            </div>
                                            {watchlists.map((watchlist) => (
                                                <button
                                                    key={watchlist.id}
                                                    onClick={() => handleWatchlistSelect(watchlist.id, stockData.ticker, stockData.name)}
                                                    className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 transition-colors duration-150 flex items-center justify-between group"
                                                >
                                                    <span className="text-gray-900 font-medium">{watchlist.name}</span>
                                                    <span className="text-xs text-gray-500">
                                                        {watchlist.items?.length || 0} stocks
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    /* Add to Watchlist Button */
                                    <button
                                        onClick={handleAddToWatchlistClick}
                                        className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        <span>Add to Watchlist</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Stock Stats Grid */}
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-gray-50 rounded-lg p-4 text-center">
                                    <div className="text-sm text-gray-600 mb-1">Market Cap</div>
                                    <div className="text-xl font-semibold text-gray-900">
                                        {stockData.market_cap ? `$${formatNumber(stockData.market_cap)}` : 'N/A'}
                                    </div>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4 text-center">
                                    <div className="text-sm text-gray-600 mb-1">Volume</div>
                                    <div className="text-xl font-semibold text-gray-900">
                                        {formatNumber(stockData.volume)}
                                    </div>
                                </div>
                            </div>

                            {/* Data Source Info */}
                            <div className="mt-6 pt-4 border-t border-gray-200">
                                <div className="flex items-center justify-between text-sm text-gray-500">
                                    <div className="flex items-center gap-4">
                                        <span><strong>Data Source:</strong> {stockData.source}</span>
                                        <span>•</span>
                                        <span><strong>Last Updated:</strong> {new Date(stockData.last_updated).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Welcome Message when no search */}
                {!stockData && !loading && !error && (
                    <div className="text-center py-12">
                        <div className="max-w-md mx-auto">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Welcome to Stonklytics</h3>
                            <p className="text-gray-600">Search for any stock ticker to get real-time market data and analytics.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* User Persona Sidebar */}
            <UserPersonaSidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            {/* Watchlist Sidebar */}
            <Watchlist
                isOpen={watchlistOpen}
                onClose={() => setWatchlistOpen(false)}
                onStockSelect={handleStockSelectFromWatchlist}
            />

            {/* Fundamentals Modal */}
            {
                stockData && (
                    <FundamentalsModal
                        isOpen={fundamentalsOpen}
                        onClose={() => setFundamentalsOpen(false)}
                        ticker={stockData.ticker}
                        companyName={stockData.name}
                    />
                )
            }

            {/* News Modal */}
            {
                stockData && (
                    <NewsModal
                        isOpen={newsOpen}
                        onClose={() => setNewsOpen(false)}
                        ticker={stockData.ticker}
                        companyName={stockData.name}
                    />
                )
            }

            {/* Chat Interface */}
            <ChatInterface
                isOpen={chatOpen}
                onClose={() => setChatOpen(false)}
            />
        </div >
    )
}