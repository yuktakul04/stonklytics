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
import SummaryModal from '../components/SummaryModal'
import { fetchSummary } from '../api'

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
    const [summaryOpen, setSummaryOpen] = useState(false)
    const [summaryText, setSummaryText] = useState('')
    const [summarySource, setSummarySource] = useState('')
    const [summaryLoading, setSummaryLoading] = useState(false)
    const [summaryError, setSummaryError] = useState(null)
    
    // Watchlist stocks data
    const [watchlistStocksData, setWatchlistStocksData] = useState({})
    const [watchlistLoading, setWatchlistLoading] = useState(false)
    
    // AI Market News
    const [marketNews, setMarketNews] = useState([])
    const [newsLoading, setNewsLoading] = useState(false)
    const [newsError, setNewsError] = useState(null)
    
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
            setTimeout(() => {
                handleSearch({ preventDefault: () => {} }, tickerParam)
            }, 100)
        }
    }, [])

    // Close dropdowns when clicking outside
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
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Fetch watchlists and their stock prices
    useEffect(() => {
        const fetchWatchlists = async () => {
            if (user) {
                try {
                    setWatchlistLoading(true)
                    const response = await api.get('/watchlist')
                    setWatchlists(response.data)
                    if (response.data.length > 0 && !selectedWatchlistId) {
                        setSelectedWatchlistId(response.data[0].id)
                    }
                    
                    // Fetch prices for watchlist items (limit to first 10 to reduce API calls)
                    const allItems = response.data.flatMap(w => w.items || [])
                    const uniqueTickers = [...new Set(allItems.map(i => i.symbol || i.ticker).filter(Boolean))]
                    
                    const watchlistData = {}
                    await Promise.all(
                        uniqueTickers.slice(0, 10).map(async (symbol) => {
                            try {
                                const res = await api.get(`/stock/data/?ticker=${symbol}`)
                                watchlistData[symbol] = res.data
                            } catch (err) {
                                console.error(`Failed to fetch ${symbol}:`, err)
                            }
                        })
                    )
                    setWatchlistStocksData(watchlistData)
                } catch (err) {
                    console.error('Error fetching watchlists:', err)
                } finally {
                    setWatchlistLoading(false)
                }
            }
        }
        fetchWatchlists()
    }, [user])

    // Fetch AI Market News
    useEffect(() => {
        const fetchMarketNews = async () => {
            if (user) {
                try {
                    setNewsLoading(true)
                    setNewsError(null)
                    const response = await api.get('/market-news')
                    setMarketNews(response.data.news || [])
                } catch (err) {
                    console.error('Error fetching market news:', err)
                    setNewsError('Unable to load market news')
                } finally {
                    setNewsLoading(false)
                }
            }
        }
        fetchMarketNews()
    }, [user])

    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current)
            }
        }
    }, [])

    const handleCompanySearch = async (query) => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
        if (query.length < 2) {
            setSearchResults([])
            setShowSearchResults(false)
            return
        }
        searchTimeoutRef.current = setTimeout(async () => {
            setSearchLoading(true)
            try {
                const response = await api.get(`/stock/search/?q=${encodeURIComponent(query)}`)
                setSearchResults(response.data.results || [])
                setShowSearchResults(true)
            } catch (err) {
                setSearchResults([])
            } finally {
                setSearchLoading(false)
            }
        }, 400)
    }

    const handleSearch = async (e, tickerValue = null) => {
        if (e?.preventDefault) e.preventDefault()
        const searchTicker = tickerValue || ticker
        if (!searchTicker.trim()) {
            setError('Please enter a ticker symbol')
            return
        }
        setLoading(true)
        setError('')
        setStockData(null)
        setShowSearchResults(false)
        try {
            const response = await api.get(`/stock/data/?ticker=${searchTicker.toUpperCase()}`)
            setStockData(response.data)
            window.history.replaceState({}, '', `/dashboard?ticker=${searchTicker.toUpperCase()}`)
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to fetch stock data')
        } finally {
            setLoading(false)
        }
    }

    const handleTickerSelect = (selectedTicker) => {
        setTicker(selectedTicker)
        setShowSearchResults(false)
        setSearchResults([])
        handleSearch({ preventDefault: () => {} }, selectedTicker)
    }

    const handleAddToWatchlistClick = () => {
        if (!user) {
            setWatchlistMessage('Please log in to add to watchlist')
            setTimeout(() => setWatchlistMessage(''), 3000)
            return
        }
        if (watchlists.length === 0) {
            setWatchlistMessage('Create a watchlist first')
            setTimeout(() => setWatchlistMessage(''), 3000)
            return
        }
        setShowWatchlistDropdown(true)
    }

    const handleWatchlistSelect = async (watchlistId, ticker, name) => {
        setSelectedWatchlistId(watchlistId)
        setShowWatchlistDropdown(false)
        const result = await addToWatchlist(ticker, name, watchlistId)
        if (result.success) {
            const response = await api.get('/watchlist')
            setWatchlists(response.data)
            setWatchlistRefreshKey(prev => prev + 1)
            setWatchlistMessage(`Added ${ticker} to watchlist`)
        } else {
            setWatchlistMessage(result.error)
        }
        setTimeout(() => setWatchlistMessage(''), 3000)
    }

    const handleLogout = async () => {
        await signOut(auth)
        navigate('/login')
    }

    const formatPrice = (num) => {
        if (!num) return '—'
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num)
    }

    const formatCompact = (num) => {
        if (!num) return '—'
        if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`
        if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
        if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
        return formatPrice(num)
    }

    const formatNumber = (num) => {
        if (!num) return '—'
        return new Intl.NumberFormat('en-US').format(num)
    }

    const openSummary = async () => {
        if (!stockData?.ticker) return
        setSummaryOpen(true)
        setSummaryLoading(true)
        setSummaryError(null)
        try {
            const data = await fetchSummary(stockData.ticker)
            setSummaryText(data?.summary ?? 'No summary available.')
            setSummarySource(data?.source ?? '')
        } catch (err) {
            setSummaryError(err?.message || 'Failed to load summary.')
        } finally {
            setSummaryLoading(false)
        }
    }

    const refreshMarketNews = async () => {
        setNewsLoading(true)
        setNewsError(null)
        try {
            const response = await api.get('/market-news')
            setMarketNews(response.data.news || [])
        } catch (err) {
            setNewsError('Unable to refresh news')
        } finally {
            setNewsLoading(false)
        }
    }

    // Get all watchlist items combined
    const allWatchlistItems = watchlists.flatMap(w => w.items || []).slice(0, 10)

    // Sentiment color helper
    const getSentimentColor = (sentiment) => {
        switch (sentiment) {
            case 'positive': return 'text-green-500'
            case 'negative': return 'text-red-500'
            default: return 'text-zinc-400'
        }
    }

    const getSentimentBg = (sentiment) => {
        switch (sentiment) {
            case 'positive': return 'bg-green-500/10'
            case 'negative': return 'bg-red-500/10'
            default: return 'bg-zinc-500/10'
        }
    }

    return (
        <div className="min-h-screen" style={{ background: '#09090b' }}>
            {/* ════════════════════════════════════════════════════════════════
                HEADER
            ════════════════════════════════════════════════════════════════ */}
            <header className="sticky top-0 z-50 border-b" style={{ background: '#09090b', borderColor: '#27272a' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="flex items-center justify-between h-14">
                        {/* Logo */}
                        <div className="flex items-center gap-8">
                            <button onClick={() => { setStockData(null); setTicker(''); window.history.replaceState({}, '', '/dashboard') }} className="text-lg font-semibold text-white">
                                Stonklytics
                            </button>
                            <nav className="hidden md:flex items-center gap-1">
                                <button onClick={() => navigate('/dashboard')} className="px-3 py-1.5 text-sm font-medium text-white rounded-md" style={{ background: '#18181b' }}>
                                    Dashboard
                                </button>
                                <button onClick={() => navigate('/watchlists')} className="px-3 py-1.5 text-sm font-medium text-zinc-400 hover:text-white rounded-md hover:bg-zinc-800/50 transition-colors">
                                    Watchlists
                                </button>
                            </nav>
                        </div>

                        {/* Search */}
                        <div className="flex-1 max-w-md mx-8 hidden md:block" ref={searchRef}>
                            <form onSubmit={handleSearch} className="relative">
                                <input
                                    type="text"
                                    value={ticker}
                                    onChange={(e) => { setTicker(e.target.value); handleCompanySearch(e.target.value) }}
                                    placeholder="Search stocks..."
                                    className="w-full h-9 pl-9 pr-4 text-sm rounded-lg outline-none transition-all"
                                    style={{ background: '#18181b', border: '1px solid #27272a', color: '#fafafa' }}
                                />
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                
                                {/* Search Results */}
                                {showSearchResults && searchResults.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden shadow-xl z-50" style={{ background: '#18181b', border: '1px solid #27272a' }}>
                                        {searchResults.map((result, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => handleTickerSelect(result.ticker)}
                                                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-800/50 transition-colors text-left border-b last:border-b-0"
                                                style={{ borderColor: '#27272a' }}
                                            >
                                                <div className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-semibold" style={{ background: '#27272a', color: '#a1a1aa' }}>
                                                    {result.ticker.slice(0, 2)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-white">{result.ticker}</div>
                                                    <div className="text-xs text-zinc-500 truncate">{result.name}</div>
                                                </div>
                                                <div className="text-xs text-zinc-600">{result.primary_exchange}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </form>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <button onClick={() => setChatOpen(true)} className="h-9 px-3 flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/50 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                                <span className="hidden sm:inline">AI</span>
                            </button>
                            <button onClick={() => setWatchlistOpen(true)} className="h-9 w-9 flex items-center justify-center text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/50 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                            <button onClick={() => setSidebarOpen(true)} className="h-9 w-9 flex items-center justify-center text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/50 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* ════════════════════════════════════════════════════════════════
                MAIN CONTENT
            ════════════════════════════════════════════════════════════════ */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {/* Mobile Search */}
                <div className="md:hidden mb-6" ref={searchRef}>
                    <form onSubmit={handleSearch} className="relative">
                        <input
                            type="text"
                            value={ticker}
                            onChange={(e) => { setTicker(e.target.value); handleCompanySearch(e.target.value) }}
                            placeholder="Search stocks..."
                            className="w-full h-11 pl-10 pr-4 text-sm rounded-lg outline-none"
                            style={{ background: '#18181b', border: '1px solid #27272a', color: '#fafafa' }}
                        />
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </form>
                </div>

                {/* Messages */}
                {error && (
                    <div className="mb-4 px-4 py-3 rounded-lg text-sm flex items-center gap-2" style={{ background: '#1c1917', border: '1px solid #451a03', color: '#fbbf24' }}>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {error}
                    </div>
                )}
                
                {watchlistMessage && (
                    <div className="mb-4 px-4 py-3 rounded-lg text-sm flex items-center gap-2" style={{ background: '#052e16', border: '1px solid #166534', color: '#4ade80' }}>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {watchlistMessage}
                    </div>
                )}

                {/* ════════════════════════════════════════════════════════════════
                    STOCK DETAIL VIEW
                ════════════════════════════════════════════════════════════════ */}
                {stockData && (
                    <div className="animate-in">
                        {/* Stock Header */}
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold" style={{ background: '#27272a', color: '#fafafa' }}>
                                    {stockData.ticker.slice(0, 2)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h1 className="text-2xl font-bold text-white">{stockData.ticker}</h1>
                                        <span className="px-2 py-0.5 text-xs font-medium rounded" style={{ background: '#27272a', color: '#a1a1aa' }}>
                                            {stockData.source}
                                        </span>
                                    </div>
                                    <p className="text-sm text-zinc-500">{stockData.name}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <div className="text-3xl font-bold font-mono text-white">{formatPrice(stockData.current_price)}</div>
                                    <div className="text-xs text-zinc-500">Current Price</div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-2 mb-6" ref={watchlistDropdownRef}>
                            <button onClick={() => setNewsOpen(true)} className="h-9 px-4 flex items-center gap-2 text-sm font-medium rounded-lg transition-colors" style={{ background: '#18181b', border: '1px solid #27272a', color: '#a1a1aa' }}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                                </svg>
                                News
                            </button>
                            <button onClick={() => setFundamentalsOpen(true)} className="h-9 px-4 flex items-center gap-2 text-sm font-medium rounded-lg transition-colors" style={{ background: '#18181b', border: '1px solid #27272a', color: '#a1a1aa' }}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                Fundamentals
                            </button>
                            <button onClick={openSummary} className="h-9 px-4 flex items-center gap-2 text-sm font-medium rounded-lg transition-colors" style={{ background: '#3b82f6', color: 'white' }}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                AI Summary
                            </button>
                            <div className="relative">
                                <button onClick={handleAddToWatchlistClick} className="h-9 px-4 flex items-center gap-2 text-sm font-medium rounded-lg transition-colors" style={{ background: '#18181b', border: '1px solid #27272a', color: '#a1a1aa' }}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    Add to Watchlist
                                </button>
                                {showWatchlistDropdown && (
                                    <div className="absolute top-full left-0 mt-1 min-w-[200px] rounded-lg overflow-hidden shadow-xl z-50" style={{ background: '#18181b', border: '1px solid #27272a' }}>
                                        <div className="p-2">
                                            <div className="text-xs font-medium text-zinc-500 uppercase px-2 py-1 mb-1">Select Watchlist</div>
                                            {watchlists.map((w) => (
                                                <button key={w.id} onClick={() => handleWatchlistSelect(w.id, stockData.ticker, stockData.name)} className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors">
                                                    {w.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                            <div className="p-4 rounded-lg" style={{ background: '#0f0f12', border: '1px solid #27272a' }}>
                                <div className="text-xs text-zinc-500 mb-1">Open</div>
                                <div className="text-lg font-semibold font-mono text-white">{formatPrice(stockData.open_price)}</div>
                            </div>
                            <div className="p-4 rounded-lg" style={{ background: '#0f0f12', border: '1px solid #27272a' }}>
                                <div className="text-xs text-green-500 mb-1">High</div>
                                <div className="text-lg font-semibold font-mono text-green-500">{formatPrice(stockData.high_price)}</div>
                            </div>
                            <div className="p-4 rounded-lg" style={{ background: '#0f0f12', border: '1px solid #27272a' }}>
                                <div className="text-xs text-red-500 mb-1">Low</div>
                                <div className="text-lg font-semibold font-mono text-red-500">{formatPrice(stockData.low_price)}</div>
                            </div>
                            <div className="p-4 rounded-lg" style={{ background: '#0f0f12', border: '1px solid #27272a' }}>
                                <div className="text-xs text-zinc-500 mb-1">Close</div>
                                <div className="text-lg font-semibold font-mono text-white">{formatPrice(stockData.close_price)}</div>
                            </div>
                        </div>

                        {/* Market Stats */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="p-4 rounded-lg" style={{ background: '#0f0f12', border: '1px solid #27272a' }}>
                                <div className="text-xs text-zinc-500 mb-1">Market Cap</div>
                                <div className="text-xl font-semibold text-white">{formatCompact(stockData.market_cap)}</div>
                            </div>
                            <div className="p-4 rounded-lg" style={{ background: '#0f0f12', border: '1px solid #27272a' }}>
                                <div className="text-xs text-zinc-500 mb-1">Volume</div>
                                <div className="text-xl font-semibold text-white">{formatNumber(stockData.volume)}</div>
                            </div>
                        </div>

                        {/* Chart */}
                        <div className="rounded-lg p-4" style={{ background: '#0f0f12', border: '1px solid #27272a' }}>
                            <HistoricalChart ticker={stockData.ticker} />
                        </div>
                    </div>
                )}

                {/* ════════════════════════════════════════════════════════════════
                    HOME VIEW (No Stock Selected)
                ════════════════════════════════════════════════════════════════ */}
                {!stockData && !loading && !error && (
                    <div className="animate-in">
                        {/* Welcome */}
                        <div className="mb-8">
                            <h1 className="text-2xl font-bold text-white mb-2">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}</h1>
                            <p className="text-zinc-500">Search for a stock to view detailed analytics and insights.</p>
                        </div>

                        {/* Your Watchlist */}
                        {user && (
                            <div className="mb-8">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-white">Your Watchlist</h2>
                                    <button onClick={() => navigate('/watchlists')} className="text-sm text-blue-500 hover:text-blue-400 transition-colors">
                                        Manage →
                                    </button>
                                </div>
                                
                                {watchlistLoading ? (
                                    <div className="rounded-lg p-8 text-center" style={{ background: '#0f0f12', border: '1px solid #27272a' }}>
                                        <div className="w-6 h-6 mx-auto border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin"></div>
                                        <p className="text-sm text-zinc-500 mt-3">Loading watchlist...</p>
                                    </div>
                                ) : allWatchlistItems.length === 0 ? (
                                    <div className="rounded-lg p-8 text-center" style={{ background: '#0f0f12', border: '1px solid #27272a' }}>
                                        <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: '#18181b' }}>
                                            <svg className="w-6 h-6 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        </div>
                                        <p className="text-zinc-500 mb-3">Your watchlist is empty</p>
                                        <button onClick={() => navigate('/watchlists')} className="text-sm text-blue-500 hover:text-blue-400 transition-colors">
                                            Create a watchlist →
                                        </button>
                                    </div>
                                ) : (
                                    <div className="rounded-lg overflow-hidden" style={{ background: '#0f0f12', border: '1px solid #27272a' }}>
                                        <table className="w-full">
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid #27272a' }}>
                                                    <th className="text-left text-xs font-medium text-zinc-500 uppercase px-4 py-3">Symbol</th>
                                                    <th className="text-left text-xs font-medium text-zinc-500 uppercase px-4 py-3 hidden sm:table-cell">Name</th>
                                                    <th className="text-right text-xs font-medium text-zinc-500 uppercase px-4 py-3">Price</th>
                                                    <th className="text-right text-xs font-medium text-zinc-500 uppercase px-4 py-3 hidden md:table-cell">Volume</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {allWatchlistItems.map((item, i) => {
                                                    const symbol = item.symbol || item.ticker
                                                    const data = watchlistStocksData[symbol]
                                                    return (
                                                        <tr 
                                                            key={i} 
                                                            className="cursor-pointer hover:bg-zinc-800/30 transition-colors"
                                                            style={{ borderBottom: i < allWatchlistItems.length - 1 ? '1px solid #27272a' : 'none' }}
                                                            onClick={() => handleTickerSelect(symbol)}
                                                        >
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded flex items-center justify-center text-xs font-semibold" style={{ background: '#27272a', color: '#fafafa' }}>
                                                                        {symbol.slice(0, 2)}
                                                                    </div>
                                                                    <span className="font-semibold text-white">{symbol}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-zinc-400 hidden sm:table-cell">{data?.name || item.name || '—'}</td>
                                                            <td className="px-4 py-3 text-right">
                                                                <span className="font-mono font-medium text-white">{data ? formatPrice(data.current_price) : '—'}</span>
                                                            </td>
                                                            <td className="px-4 py-3 text-right text-sm text-zinc-400 font-mono hidden md:table-cell">{data ? formatNumber(data.volume) : '—'}</td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* AI Market News */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-semibold text-white">Market News</h2>
                                    <span className="px-2 py-0.5 text-[10px] font-medium rounded" style={{ background: '#3b82f6', color: 'white' }}>AI</span>
                                </div>
                                <button 
                                    onClick={refreshMarketNews} 
                                    disabled={newsLoading}
                                    className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
                                >
                                    <svg className={`w-4 h-4 ${newsLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Refresh
                                </button>
                            </div>
                            
                            {newsLoading ? (
                                <div className="rounded-lg p-8 text-center" style={{ background: '#0f0f12', border: '1px solid #27272a' }}>
                                    <div className="w-6 h-6 mx-auto border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin"></div>
                                    <p className="text-sm text-zinc-500 mt-3">Generating market insights...</p>
                                </div>
                            ) : newsError ? (
                                <div className="rounded-lg p-6 text-center" style={{ background: '#0f0f12', border: '1px solid #27272a' }}>
                                    <p className="text-zinc-500">{newsError}</p>
                                    <button onClick={refreshMarketNews} className="text-sm text-blue-500 hover:text-blue-400 mt-2">
                                        Try again
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {marketNews.map((news, i) => (
                                        <div 
                                            key={news.id || i} 
                                            className="rounded-lg p-4 transition-colors hover:border-zinc-600"
                                            style={{ background: '#0f0f12', border: '1px solid #27272a' }}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="px-2 py-0.5 text-[10px] font-medium rounded" style={{ background: '#27272a', color: '#a1a1aa' }}>
                                                            {news.category}
                                                        </span>
                                                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${getSentimentBg(news.sentiment)} ${getSentimentColor(news.sentiment)}`}>
                                                            {news.sentiment}
                                                        </span>
                                                        {news.time && (
                                                            <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                                {news.time}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h3 className="text-white font-medium mb-1">{news.headline}</h3>
                                                    <p className="text-sm text-zinc-500 leading-relaxed">{news.summary}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            <p className="text-[10px] text-zinc-600 mt-3 text-center">
                                AI-generated market insights • Not financial advice • Powered by Gemini
                            </p>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex flex-wrap gap-3">
                            <button onClick={() => setChatOpen(true)} className="h-10 px-5 flex items-center gap-2 text-sm font-medium rounded-lg transition-colors" style={{ background: '#18181b', border: '1px solid #27272a', color: '#a1a1aa' }}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                                Ask AI Assistant
                            </button>
                            <button onClick={() => navigate('/watchlists')} className="h-10 px-5 flex items-center gap-2 text-sm font-medium rounded-lg transition-colors" style={{ background: '#18181b', border: '1px solid #27272a', color: '#a1a1aa' }}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Manage Watchlists
                            </button>
                            <button onClick={handleLogout} className="h-10 px-5 flex items-center gap-2 text-sm font-medium rounded-lg transition-colors text-zinc-500 hover:text-zinc-300">
                                Sign Out
                            </button>
                        </div>
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                            <div className="w-8 h-8 mx-auto border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin"></div>
                            <p className="text-sm text-zinc-500 mt-4">Loading stock data...</p>
                        </div>
                    </div>
                )}
            </main>

            {/* Modals & Sidebars */}
            <UserPersonaSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <Watchlist key={watchlistRefreshKey} isOpen={watchlistOpen} onClose={() => setWatchlistOpen(false)} onStockSelect={(t) => { handleTickerSelect(t); setWatchlistOpen(false) }} />
            {stockData && (
                <>
                    <FundamentalsModal isOpen={fundamentalsOpen} onClose={() => setFundamentalsOpen(false)} ticker={stockData.ticker} companyName={stockData.name} />
                    <NewsModal isOpen={newsOpen} onClose={() => setNewsOpen(false)} ticker={stockData.ticker} companyName={stockData.name} />
                    <SummaryModal open={summaryOpen} onClose={() => setSummaryOpen(false)} symbol={stockData.ticker} summary={summaryText} source={summarySource} loading={summaryLoading} error={summaryError} />
                </>
            )}
            <ChatInterface isOpen={chatOpen} onClose={() => setChatOpen(false)} />
        </div>
    )
}
