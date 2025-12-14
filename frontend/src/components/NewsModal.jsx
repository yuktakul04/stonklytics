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
        if (description.length > 200) {
            return description.substring(0, 200) + '...'
        }
        return description
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-[#0f0f12] border border-[#27272a] rounded-xl shadow-large max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-slide-up">
                {/* Header */}
                <div className="bg-[#18181b] border-b border-[#27272a] px-6 py-5 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-semibold text-white">Latest News</h2>
                        <p className="text-sm text-zinc-500 mt-0.5">{ticker} • {companyName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-zinc-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-[#27272a]"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-[#09090b] ui-scrollbar">
                    {loading && (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin"></div>
                            <span className="ml-3 text-sm text-zinc-500">Loading news...</span>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
                            <div className="flex items-start">
                                <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <div className="whitespace-pre-line text-sm">{error}</div>
                            </div>
                        </div>
                    )}

                    {!loading && !error && (
                        <div>
                            {newsData.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-14 h-14 bg-[#18181b] border border-[#27272a] rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-7 h-7 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-base font-medium text-white mb-1">No News Available</h3>
                                    <p className="text-sm text-zinc-500">No recent articles found for {ticker}</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {newsData.map((article, index) => (
                                        <div key={index} className="border border-[#27272a] rounded-lg p-5 bg-[#18181b] hover:border-[#3f3f46] transition-all duration-200">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex-1">
                                                    <h3 className="text-base font-medium text-white mb-2 line-clamp-2 leading-snug">
                                                        {article.title || 'No Title Available'}
                                                    </h3>
                                                    <div className="flex items-center text-xs text-zinc-500 mb-3">
                                                        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <span>{formatDate(article.published_utc)}</span>
                                                        {article.publisher && (
                                                            <>
                                                                <span className="mx-2 text-zinc-700">•</span>
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
                                                            className="w-16 h-16 object-cover rounded-lg border border-[#27272a]"
                                                            onError={(e) => {
                                                                e.target.style.display = 'none'
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {article.description && (
                                                <p className="text-sm text-zinc-400 mb-4 leading-relaxed">
                                                    {formatDescription(article.description)}
                                                </p>
                                            )}
                                            
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center space-x-4 text-xs text-zinc-600">
                                                    {article.tickers && article.tickers.length > 0 && (
                                                        <div className="flex items-center">
                                                            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                                            </svg>
                                                            <span>{article.tickers.join(', ')}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {article.article_url && (
                                                    <a
                                                        href={article.article_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center px-3 py-1.5 bg-[#27272a] hover:bg-[#3f3f46] text-white text-xs font-medium rounded-lg transition-colors"
                                                    >
                                                        <span>Read Article</span>
                                                        <svg className="w-3.5 h-3.5 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <div className="border-t border-[#27272a] bg-[#18181b] px-6 py-4">
                    <div className="flex justify-between items-center">
                        <div className="text-xs text-zinc-600">Data source: Polygon.io</div>
                        <button
                            onClick={onClose}
                            className="px-5 py-2 bg-[#27272a] hover:bg-[#3f3f46] text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
