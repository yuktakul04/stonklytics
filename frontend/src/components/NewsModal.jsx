import { useState, useEffect } from 'react'
import { api } from '../api'

export default function NewsModal({ isOpen, onClose, ticker, companyName }) {
    const [newsData, setNewsData] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (isOpen && ticker) {
            fetchNewsData()
        }
    }, [isOpen, ticker])

    const fetchNewsData = async () => {
        setLoading(true)
        setError('')
        try {
            const response = await api.get(`/stock/news/?ticker=${ticker}&limit=5`)
            setNewsData(response.data.results || [])
        } catch (err) {
            console.error('News fetch error:', err)
            const errorMessage = err.response?.data?.error || 'Failed to fetch news data'
            setError(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A'
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const formatDescription = (description) => {
        if (!description) return 'No description available'
        // Truncate description if too long
        if (description.length > 200) {
            return description.substring(0, 200) + '...'
        }
        return description
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white p-6 flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold">Latest News</h2>
                        <p className="text-green-100 mt-1">{ticker} - {companyName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-all duration-200"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading && (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                            <span className="ml-3 text-gray-600">Loading latest news...</span>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                            <div className="flex items-start">
                                <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <div className="whitespace-pre-line">{error}</div>
                            </div>
                        </div>
                    )}

                    {!loading && !error && (
                        <div>
                            {newsData.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No News Available</h3>
                                    <p className="text-gray-600">No recent news articles found for {ticker}</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {newsData.map((article, index) => (
                                        <div key={index} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                                                        {article.title || 'No Title Available'}
                                                    </h3>
                                                    <div className="flex items-center text-sm text-gray-500 mb-3">
                                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <span>{formatDate(article.published_utc)}</span>
                                                        {article.publisher && (
                                                            <>
                                                                <span className="mx-2">•</span>
                                                                <span>{article.publisher.name}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                {article.image_url && (
                                                    <div className="ml-4 flex-shrink-0">
                                                        <img 
                                                            src={article.image_url} 
                                                            alt={article.title}
                                                            className="w-20 h-20 object-cover rounded-lg"
                                                            onError={(e) => {
                                                                e.target.style.display = 'none'
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {article.description && (
                                                <p className="text-gray-700 mb-4 leading-relaxed">
                                                    {formatDescription(article.description)}
                                                </p>
                                            )}
                                            
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center space-x-4 text-sm text-gray-500">
                                                    {article.tickers && article.tickers.length > 0 && (
                                                        <div className="flex items-center">
                                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                                            </svg>
                                                            <span>{article.tickers.join(', ')}</span>
                                                        </div>
                                                    )}
                                                    {article.type && (
                                                        <div className="flex items-center">
                                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                                            </svg>
                                                            <span className="capitalize">{article.type}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {article.article_url && (
                                                    <a
                                                        href={article.article_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                                                    >
                                                        <span>Read Full Article</span>
                                                        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                        </svg>
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                    <div className="flex justify-between items-center text-sm text-gray-600">
                        <div>Data source: Polygon.io</div>
                        <button
                            onClick={onClose}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
