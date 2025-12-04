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
import HistoricalChart from '../components/HistoricalChart'
import PriceStatsSummary from '../components/PriceStatsSummary'
import SectorComparisonChart from '../components/SectorComparisonChart'

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
    const [watchlistRefreshKey, setWatchlistRefreshKey] = useState(0)
    const [fundamentalsOpen, setFundamentalsOpen] = useState(false)
    const [newsOpen, setNewsOpen] = useState(false)
    const [chatOpen, setChatOpen] = useState(false)
    const navigate = useNavigate()
    const searchRef = useRef(null)
    const searchTimeoutRef = useRef(null)
    const watchlistDropdownRef = useRef(null)
    const { addToWatchlist, user } = useWatchlist()

    // Handle ticker from URL query params
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search)
        const tickerParam = urlParams.get('ticker')
        if (tickerParam) {
            setTicker(tickerParam)
            // Use a small delay to ensure handleSearch is defined
            setTimeout(() => {
                handleSearch({ preventDefault: () => {} }, tickerParam)
            }, 100)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

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

    const handleSearch = async (e, tickerValue = null) => {
        if (e && e.preventDefault) {
            e.preventDefault()
        }
        const searchTicker = tickerValue || ticker
        if (!searchTicker.trim()) {
            setError('Please enter a ticker symbol or company name')
            return
        }

        setLoading(true)
        setError('')
        setStockData(null)
        setShowSearchResults(false)

        try {
            console.log('Making API request to:', `/stock/data/?ticker=${searchTicker.toUpperCase()}`)
            const response = await api.get(`/stock/data/?ticker=${searchTicker.toUpperCase()}`)
            console.log('API response:', response.data)
            setStockData(response.data)
            // Update URL without reload
            window.history.replaceState({}, '', `/dashboard?ticker=${searchTicker.toUpperCase()}`)
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
            // Refresh watchlists in Dashboard
            try {
                const response = await api.get('/watchlist')
                setWatchlists(response.data)
            } catch (err) {
                console.error('Error refreshing watchlists:', err)
            }
            
            // Trigger refresh in Watchlist component
            setWatchlistRefreshKey(prev => prev + 1)
            
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
        <div className="min-h-screen bg-dark-bg">
            {/* Top Navigation Bar */}
            <nav className="border-b border-dark-border bg-dark-surface/50 backdrop-blur-sm sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-8">
                            <h1 className="text-2xl font-bold text-white tracking-tight cursor-pointer" onClick={() => navigate('/dashboard')}>Stonklytics</h1>
                            <div className="hidden md:flex items-center space-x-1 text-sm text-gray-400">
                                <span 
                                    className="px-3 py-1.5 rounded-md hover:bg-dark-hover transition-colors cursor-pointer"
                                    onClick={() => navigate('/watchlists')}
                                >
                                    Watchlists
                                </span>
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
                            <button
                                onClick={() => setWatchlistOpen(true)}
                                className="p-2 rounded-lg border border-dark-border bg-dark-card hover:bg-dark-hover text-gray-300 hover:text-white transition-all duration-200"
                                title="Watchlist"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Search Section */}
                <div className="mb-8">
                    <div className="bg-dark-card border border-dark-border rounded-xl p-6 shadow-large">
                        <form onSubmit={handleSearch} className="flex gap-4">
                            <div className="flex-1 relative" ref={searchRef}>
                                <div className="relative">
                                    <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                        type="text"
                                        value={ticker}
                                        onChange={(e) => {
                                            const value = e.target.value
                                            setTicker(value)
                                            handleCompanySearch(value)
                                        }}
                                        placeholder="Search ticker symbol or company name..."
                                        className="w-full pl-12 pr-4 py-3.5 bg-dark-surface border border-dark-border rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-gray-600 focus:border-dark-border outline-none transition-all duration-200"
                                    />
                                </div>

                                {/* Search Results Dropdown */}
                                {showSearchResults && (searchResults.length > 0 || searchLoading) && (
                                    <div className="absolute z-20 w-full mt-2 bg-dark-card border border-dark-border rounded-lg shadow-large max-h-64 overflow-y-auto">
                                        {searchLoading ? (
                                            <div className="p-4 text-center text-gray-400">
                                                <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                                <span className="text-sm">Searching...</span>
                                            </div>
                                        ) : (
                                            searchResults.map((result, index) => (
                                                <button
                                                    key={index}
                                                    type="button"
                                                    onClick={() => handleTickerSelect(result.ticker)}
                                                    className="w-full px-4 py-3 text-left hover:bg-dark-hover border-b border-dark-border last:border-b-0 transition-colors duration-150"
                                                >
                                                    <div className="font-semibold text-white text-sm">{result.ticker}</div>
                                                    <div className="text-xs text-gray-400 mt-0.5">{result.name}</div>
                                                    <div className="text-xs text-gray-500 mt-0.5">{result.primary_exchange}</div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`px-8 py-3.5 rounded-lg font-medium transition-all duration-200 ${
                                    loading
                                        ? 'bg-gray-800 cursor-not-allowed text-gray-500'
                                        : 'bg-white text-dark-bg hover:bg-gray-200 hover:shadow-medium'
                                }`}
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-dark-bg border-t-transparent rounded-full animate-spin"></div>
                                        <span>Searching...</span>
                                    </div>
                                ) : (
                                    'Search'
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 bg-dark-card border border-red-900/50 text-red-400 px-4 py-3 rounded-lg flex items-center animate-fade-in">
                        <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm">{error}</span>
                    </div>
                )}

                {/* Watchlist Message */}
                {watchlistMessage && (
                    <div className="mb-6 bg-dark-card border border-green-900/50 text-green-400 px-4 py-3 rounded-lg flex items-center animate-fade-in">
                        <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm">{watchlistMessage}</span>
                    </div>
                )}

                {/* Stock Data Card */}
                {stockData && (
                    <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden shadow-large animate-slide-up">
                        {/* Stock Header */}
                        <div className="bg-gradient-to-br from-dark-surface to-dark-card border-b border-dark-border p-8">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-4xl font-bold text-white mb-2 tracking-tight">{stockData.ticker}</h3>
                                    <p className="text-gray-400 text-lg">{stockData.name}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-5xl font-bold text-white mb-1 tracking-tight">
                                        {formatCurrency(stockData.current_price)}
                                    </div>
                                    <div className="text-gray-400 text-sm">Current Price</div>
                                </div>
                            </div>
                            
                            {/* Price Stats Summary */}
                            <PriceStatsSummary 
                                data={{
                                    open_price: stockData.open_price,
                                    close_price: stockData.close_price,
                                    high_price: stockData.high_price,
                                    low_price: stockData.low_price
                                }}
                            />
                            
                            <div className="flex justify-end space-x-3 mt-6" ref={watchlistDropdownRef}>
                                <button
                                    onClick={() => setNewsOpen(true)}
                                    className="px-4 py-2 rounded-lg border border-dark-border bg-dark-surface hover:bg-dark-hover text-gray-300 hover:text-white transition-all duration-200 flex items-center space-x-2 text-sm font-medium"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                                    </svg>
                                    <span>News</span>
                                </button>
                                <button
                                    onClick={() => setFundamentalsOpen(true)}
                                    className="px-4 py-2 rounded-lg border border-dark-border bg-dark-surface hover:bg-dark-hover text-gray-300 hover:text-white transition-all duration-200 flex items-center space-x-2 text-sm font-medium"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    <span>Fundamentals</span>
                                </button>

                                {showWatchlistDropdown ? (
                                    <div className="absolute mt-2 bg-dark-card rounded-lg shadow-large border border-dark-border min-w-[200px] z-10">
                                        <div className="p-2">
                                            <div className="text-xs font-semibold text-gray-500 uppercase px-2 py-1 mb-1">
                                                Select Watchlist
                                            </div>
                                            {watchlists.map((watchlist) => (
                                                <button
                                                    key={watchlist.id}
                                                    onClick={() => handleWatchlistSelect(watchlist.id, stockData.ticker, stockData.name)}
                                                    className="w-full text-left px-3 py-2 rounded-md hover:bg-dark-hover transition-colors duration-150 flex items-center justify-between group"
                                                >
                                                    <span className="text-gray-300 font-medium group-hover:text-white">{watchlist.name}</span>
                                                    <span className="text-xs text-gray-500">
                                                        {watchlist.items?.length || 0} stocks
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleAddToWatchlistClick}
                                        className="px-4 py-2 rounded-lg border border-dark-border bg-dark-surface hover:bg-dark-hover text-gray-300 hover:text-white transition-all duration-200 flex items-center space-x-2 text-sm font-medium"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        <span>Add to Watchlist</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Stock Stats Grid */}
                        <div className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="bg-dark-surface border border-dark-border rounded-lg p-6">
                                    <div className="text-sm text-gray-400 mb-2 uppercase tracking-wide">Market Cap</div>
                                    <div className="text-2xl font-semibold text-white">
                                        {stockData.market_cap ? `$${formatNumber(stockData.market_cap)}` : 'N/A'}
                                    </div>
                                </div>
                                <div className="bg-dark-surface border border-dark-border rounded-lg p-6">
                                    <div className="text-sm text-gray-400 mb-2 uppercase tracking-wide">Volume</div>
                                    <div className="text-2xl font-semibold text-white">
                                        {formatNumber(stockData.volume)}
                                    </div>
                                </div>
                            </div>

                            {/* Data Source Info */}
                            <div className="pt-6 border-t border-dark-border">
                                <div className="flex items-center justify-between text-sm text-gray-500">
                                    <div className="flex items-center gap-4">
                                        <span><strong className="text-gray-400">Data Source:</strong> {stockData.source}</span>
                                        <span className="text-gray-700">•</span>
                                        <span><strong className="text-gray-400">Last Updated:</strong> {new Date(stockData.last_updated).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Historical Chart */}
                            <HistoricalChart ticker={stockData.ticker} />

                            {/* Sector Comparison Chart */}
                            <SectorComparisonChart 
                                data={stockData.sector_performance}
                                currentSector={stockData.sector_name}
                            />
                        </div>
                    </div>
                )}

                {/* Welcome Message when no search */}
                {!stockData && !loading && !error && (
                    <div className="text-center py-20">
                        <div className="max-w-md mx-auto">
                            <div className="w-20 h-20 bg-dark-surface border border-dark-border rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-semibold text-white mb-3">Welcome to Stonklytics</h3>
                            <p className="text-gray-400 leading-relaxed">Search for any stock ticker to get real-time market data and analytics.</p>
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
                key={watchlistRefreshKey}
                isOpen={watchlistOpen}
                onClose={() => setWatchlistOpen(false)}
                onStockSelect={(ticker) => {
                    handleStockSelectFromWatchlist(ticker)
                    setWatchlistOpen(false)
                }}
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
        </div>
    )
}
