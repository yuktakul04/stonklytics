import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { api } from '../api'
import Watchlist from './Watchlist'

export default function Dashboard() {
    const [ticker, setTicker] = useState('')
    const [stockData, setStockData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [watchlist, setWatchlist] = useState([])
    const navigate = useNavigate()

    const handleSearch = async (e) => {
        e.preventDefault()
        if (!ticker.trim()) {
            setError('Please enter a ticker symbol')
            return
        }

        setLoading(true)
        setError('')
        setStockData(null)

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

    const handleLogout = async () => {
        try {
            await signOut(auth)
            navigate('/login')
        } catch (err) {
            console.error('Logout failed:', err)
        }
    }

    const addToWatchlist = () => {
        if (!stockData) return
        
        const stockToAdd = {
            ticker: stockData.ticker,
            name: stockData.name,
            current_price: stockData.current_price,
            added_at: new Date().toISOString()
        }
        
        // Check if stock is already in watchlist
        const isAlreadyInWatchlist = watchlist.some(stock => stock.ticker === stockData.ticker)
        
        if (!isAlreadyInWatchlist) {
            setWatchlist(prev => [...prev, stockToAdd])
        }
    }

    const isInWatchlist = (ticker) => {
        return watchlist.some(stock => stock.ticker === ticker)
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
        <div className="min-h-screen bg-[#FAF9F6] flex">
            {/* Watchlist Sidebar */}
            <Watchlist watchlist={watchlist} setWatchlist={setWatchlist} />

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Stonklytics</h1>
                        <p className="text-gray-600">Real-time stock market analytics</p>
                    </div>
                    <button 
                        onClick={handleLogout}
                        className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
                    >
                        Logout
                    </button>
                </div>

                {/* Search Form */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Search Stock</h2>
                    <form onSubmit={handleSearch} className="flex gap-4">
                        <div className="flex-1">
                            <input
                                type="text"
                                value={ticker}
                                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                                placeholder="Enter ticker symbol (e.g., AAPL, MSFT, GOOGL)"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className={`px-8 py-3 rounded-lg font-medium transition-all duration-200 ${
                                loading 
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
                            
                            {/* Add to Watchlist Button */}
                            <div className="mt-4">
                                {isInWatchlist(stockData.ticker) ? (
                                    <button
                                        onClick={() => setWatchlist(prev => prev.filter(stock => stock.ticker !== stockData.ticker))}
                                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        Remove from Watchlist
                                    </button>
                                ) : (
                                    <button
                                        onClick={addToWatchlist}
                                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Add to Watchlist
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Stock Stats Grid */}
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                                <div className="bg-gray-50 rounded-lg p-4 text-center">
                                    <div className="text-sm text-gray-600 mb-1">52-Week High</div>
                                    <div className="text-xl font-semibold text-green-600">
                                        {formatCurrency(stockData.high_52_week)}
                                    </div>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4 text-center">
                                    <div className="text-sm text-gray-600 mb-1">52-Week Low</div>
                                    <div className="text-xl font-semibold text-red-600">
                                        {formatCurrency(stockData.low_52_week)}
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
            </div>
        </div>
    )
}