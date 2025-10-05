import { useState, useEffect } from 'react'
import { api } from '../api'

export default function Watchlist({ watchlist, setWatchlist }) {
    const [sidebarSearch, setSidebarSearch] = useState('')
    const [searchSuggestions, setSearchSuggestions] = useState([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [sidebarLoading, setSidebarLoading] = useState(false)

    // Load watchlist from localStorage on component mount
    useEffect(() => {
        const savedWatchlist = localStorage.getItem('stonklytics-watchlist')
        if (savedWatchlist) {
            try {
                setWatchlist(JSON.parse(savedWatchlist))
            } catch (error) {
                console.error('Error loading watchlist from localStorage:', error)
            }
        }
    }, [setWatchlist])

    // Save watchlist to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('stonklytics-watchlist', JSON.stringify(watchlist))
    }, [watchlist])

    const formatCurrency = (num) => {
        if (num === null || num === undefined) return 'N/A'
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(num)
    }

    const removeFromWatchlist = (tickerToRemove) => {
        setWatchlist(prev => prev.filter(stock => stock.ticker !== tickerToRemove))
    }

    const isInWatchlist = (ticker) => {
        return watchlist.some(stock => stock.ticker === ticker)
    }

    // Simple search that only works with exact ticker symbols
    const handleSidebarSearch = async (searchTerm) => {
        if (!searchTerm.trim()) {
            setSearchSuggestions([])
            setShowSuggestions(false)
            return
        }

        setSidebarLoading(true)
        try {
            const response = await api.get(`/stock/data/?ticker=${searchTerm.toUpperCase()}`)
            const stockData = response.data
            
            const suggestion = {
                ticker: stockData.ticker,
                name: stockData.name,
                current_price: stockData.current_price,
                searchType: 'exact'
            }
            
            setSearchSuggestions([suggestion])
            setShowSuggestions(true)
        } catch (err) {
            console.error('Search error:', err)
            setSearchSuggestions([])
            setShowSuggestions(false)
        } finally {
            setSidebarLoading(false)
        }
    }

    // Debounced search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (sidebarSearch.trim()) {
                handleSidebarSearch(sidebarSearch)
            } else {
                setSearchSuggestions([])
                setShowSuggestions(false)
            }
        }, 300) // 300ms delay

        return () => clearTimeout(timeoutId)
    }, [sidebarSearch])

    const handleSuggestionClick = (suggestion) => {
        // Add to watchlist if not already there
        if (!isInWatchlist(suggestion.ticker)) {
            const stockToAdd = {
                ticker: suggestion.ticker,
                name: suggestion.name,
                current_price: suggestion.current_price,
                added_at: new Date().toISOString()
            }
            setWatchlist(prev => [...prev, stockToAdd])
        }
        
        // Clear search
        setSidebarSearch('')
        setSearchSuggestions([])
        setShowSuggestions(false)
    }

    return (
        <div className="w-80 bg-gradient-to-b from-slate-50 to-white shadow-xl border-r border-slate-200 flex-col hidden lg:flex">
            {/* Sidebar Header */}
            <div className="p-6 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Watchlist</h2>
                        <p className="text-sm text-slate-500">{watchlist.length} stocks</p>
                    </div>
                </div>
                
                {/* Search in Sidebar */}
                <div className="relative">
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            value={sidebarSearch}
                            onChange={(e) => setSidebarSearch(e.target.value)}
                            placeholder="Search ticker (AAPL, MSFT...)"
                            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 bg-white/70 backdrop-blur-sm text-slate-700 placeholder-slate-400"
                        />
                        {sidebarLoading && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                    </div>
                    
                    {/* Search Suggestions */}
                    {showSuggestions && searchSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                            {searchSuggestions.map((suggestion, index) => (
                                <div
                                    key={index}
                                    onClick={() => handleSuggestionClick(suggestion)}
                                    className="p-4 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors duration-150"
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="flex-1">
                                            <div className="font-bold text-slate-900 text-lg">{suggestion.ticker}</div>
                                            <div className="text-sm text-slate-600 truncate">{suggestion.name}</div>
                                        </div>
                                        <div className="text-sm font-semibold text-green-600 ml-2">
                                            {formatCurrency(suggestion.current_price)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Watchlist Items */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {watchlist.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <h3 className="text-slate-600 font-medium mb-2">No stocks yet</h3>
                        <p className="text-slate-400 text-sm">Search above to add your first stock</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {watchlist.map((stock, index) => (
                            <div key={index} className="group bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-slate-200/60 hover:shadow-lg hover:bg-white/80 transition-all duration-200 hover:border-slate-300/60">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-slate-900 text-lg">{stock.ticker}</h3>
                                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                        </div>
                                        <p className="text-sm text-slate-600 truncate leading-tight">{stock.name}</p>
                                    </div>
                                    <button
                                        onClick={() => removeFromWatchlist(stock.ticker)}
                                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all duration-200 ml-2 p-1 rounded-lg hover:bg-red-50"
                                        title="Remove from watchlist"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                
                                <div className="flex justify-between items-end">
                                    <div>
                                        <div className="text-xs text-slate-500 mb-1">
                                            Added {new Date(stock.added_at).toLocaleDateString()}
                                        </div>
                                        {stock.current_price && (
                                            <div className="text-lg font-bold text-green-600">
                                                {formatCurrency(stock.current_price)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-slate-400">Live</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}