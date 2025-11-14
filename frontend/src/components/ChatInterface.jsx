import { useState, useRef, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'
import { api } from '../api'

// Function to format AI responses with markdown-like formatting
const formatMessage = (text) => {
    if (!text) return ''
    
    // Split by lines to handle different formatting
    const lines = text.split('\n')
    const formattedLines = []
    
    lines.forEach((line, index) => {
        const trimmedLine = line.trim()
        
        // Handle markdown headers (###, ##, #)
        if (trimmedLine.startsWith('### ')) {
            const content = trimmedLine.substring(4)
            formattedLines.push(
                <div key={index} className="font-semibold text-white text-base mt-4 mb-2 first:mt-0">
                    {formatInlineText(content)}
                </div>
            )
        }
        else if (trimmedLine.startsWith('## ')) {
            const content = trimmedLine.substring(3)
            formattedLines.push(
                <div key={index} className="font-bold text-white text-lg mt-4 mb-2 first:mt-0">
                    {formatInlineText(content)}
                </div>
            )
        }
        else if (trimmedLine.startsWith('# ')) {
            const content = trimmedLine.substring(2)
            formattedLines.push(
                <div key={index} className="font-bold text-white text-xl mt-4 mb-2 first:mt-0">
                    {formatInlineText(content)}
                </div>
            )
        }
        // Handle bullet points
        else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
            const content = trimmedLine.substring(2)
            formattedLines.push(
                <div key={index} className="flex items-start gap-2 my-1.5">
                    <span className="text-gray-400 mt-1.5 flex-shrink-0">•</span>
                    <span className="flex-1">{formatInlineText(content)}</span>
                </div>
            )
        }
        // Handle numbered lists
        else if (/^\d+\.\s/.test(trimmedLine)) {
            const match = trimmedLine.match(/^(\d+)\.\s(.+)/)
            if (match) {
                formattedLines.push(
                    <div key={index} className="flex items-start gap-2 my-1.5">
                        <span className="text-gray-400 font-medium flex-shrink-0">{match[1]}.</span>
                        <span className="flex-1">{formatInlineText(match[2])}</span>
                    </div>
                )
            }
        }
        // Handle headers (lines that are all caps or end with :) - but not if they start with #
        else if (trimmedLine && !trimmedLine.startsWith('#') && (trimmedLine === trimmedLine.toUpperCase() || trimmedLine.endsWith(':'))) {
            formattedLines.push(
                <div key={index} className="font-semibold text-white mt-3 mb-1.5 first:mt-0">
                    {formatInlineText(trimmedLine)}
                </div>
            )
        }
        // Regular paragraph
        else if (trimmedLine) {
            formattedLines.push(
                <div key={index} className="my-1.5 leading-relaxed">
                    {formatInlineText(trimmedLine)}
                </div>
            )
        }
        // Empty line for spacing
        else {
            formattedLines.push(<div key={index} className="h-2" />)
        }
    })
    
    return formattedLines.length > 0 ? formattedLines : formatInlineText(text)
}

// Function to format inline text (bold, italic, etc.)
const formatInlineText = (text) => {
    if (!text) return ''
    
    const parts = []
    let currentIndex = 0
    
    // Match **bold** text
    const boldRegex = /\*\*(.+?)\*\*/g
    let match
    
    while ((match = boldRegex.exec(text)) !== null) {
        // Add text before the match
        if (match.index > currentIndex) {
            parts.push(text.substring(currentIndex, match.index))
        }
        
        // Add bold text
        parts.push(<strong key={match.index} className="font-semibold text-white">{match[1]}</strong>)
        
        currentIndex = match.index + match[0].length
    }
    
    // Add remaining text
    if (currentIndex < text.length) {
        parts.push(text.substring(currentIndex))
    }
    
    // If no bold formatting found, return original text
    if (parts.length === 0) {
        return text
    }
    
    return <>{parts}</>
}

export default function ChatInterface({ isOpen, onClose }) {
    const [messages, setMessages] = useState([
        {
            role: 'model',
            text: 'Hello! I\'m your AI finance assistant. Ask me anything about stocks, markets, or investing!'
        }
    ])
    const [inputMessage, setInputMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [watchlists, setWatchlists] = useState([])
    const [selectedWatchlist, setSelectedWatchlist] = useState(null)
    const [showWatchlistDropdown, setShowWatchlistDropdown] = useState(false)
    const [user, setUser] = useState(null)
    const messagesEndRef = useRef(null)
    const watchlistDropdownRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // Fetch watchlists when chat opens
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser)
            if (firebaseUser && isOpen) {
                fetchWatchlists()
            }
        })
        return () => unsubscribe()
    }, [isOpen])

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (watchlistDropdownRef.current && !watchlistDropdownRef.current.contains(event.target)) {
                setShowWatchlistDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const fetchWatchlists = async () => {
        try {
            const response = await api.get('/watchlist')
            setWatchlists(response.data || [])
        } catch (err) {
            console.error('Error fetching watchlists:', err)
        }
    }

    const handleSelectWatchlist = (watchlist) => {
        setSelectedWatchlist(watchlist)
        setShowWatchlistDropdown(false)
        
        // Add a system message showing the watchlist was imported
        const tickers = watchlist.items?.map(item => item.symbol || item.ticker).filter(Boolean).join(', ') || 'None'
        const importMessage = {
            role: 'system',
            text: `📋 Imported watchlist: "${watchlist.name}"\nStocks: ${tickers}`
        }
        setMessages(prev => [...prev, importMessage])
    }

    const handleRemoveWatchlist = () => {
        setSelectedWatchlist(null)
        const removeMessage = {
            role: 'system',
            text: '📋 Watchlist context removed'
        }
        setMessages(prev => [...prev, removeMessage])
    }

    // Prevent backdrop click from closing when clicking inside modal
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }

    const handleSendMessage = async (e) => {
        e.preventDefault()
        if (!inputMessage.trim() || loading) return

        const userMessage = inputMessage.trim()
        setInputMessage('')
        
        // Add user message to chat
        setMessages(prev => [...prev, { role: 'user', text: userMessage }])
        setLoading(true)

        try {
            // Prepare chat history for API (exclude system messages)
            const history = messages
                .filter(msg => msg.role !== 'system')
                .map(msg => ({
                    role: msg.role === 'model' ? 'model' : 'user',
                    parts: [{ text: msg.text }]
                }))

            // Prepare watchlist context if selected
            const watchlistContext = selectedWatchlist ? {
                name: selectedWatchlist.name,
                stocks: selectedWatchlist.items?.map(item => ({
                    ticker: item.symbol || item.ticker,
                    name: item.name || ''
                })).filter(item => item.ticker) || []
            } : null

            const response = await api.post('/chat', {
                message: userMessage,
                history: history,
                watchlist: watchlistContext
            }, {
                timeout: 60000 // 60 seconds timeout
            })

            // Add AI response to chat
            setMessages(prev => [...prev, {
                role: 'model',
                text: response.data.message
            }])
        } catch (err) {
            console.error('Chat error:', err)
            setMessages(prev => [...prev, {
                role: 'model',
                text: 'Sorry, I encountered an error. Please try again.'
            }])
        } finally {
            setLoading(false)
        }
    }

    const handleClearChat = () => {
        setMessages([
            {
                role: 'model',
                text: 'Hello! I\'m your AI finance assistant. Ask me anything about stocks, markets, or investing!'
            }
        ])
        setSelectedWatchlist(null)
    }

    if (!isOpen) return null

    return (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={handleBackdropClick}
        >
            {/* Chat Modal */}
            <div 
                className="bg-dark-card border border-dark-border rounded-2xl shadow-2xl w-full max-w-3xl h-[85vh] max-h-[800px] flex flex-col overflow-hidden animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-dark-border bg-dark-surface">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center border border-dark-border">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">AI Finance Assistant</h2>
                            <div className="flex items-center gap-2">
                                <p className="text-sm text-gray-400">Powered by Gemini 2.5 Flash</p>
                                {selectedWatchlist && (
                                    <>
                                        <span className="text-gray-600">•</span>
                                        <p className="text-sm text-green-400 font-medium">
                                            {selectedWatchlist.name} ({selectedWatchlist.items?.length || 0} stocks)
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        {/* Watchlist Selector */}
                        {user && watchlists.length > 0 && (
                            <div className="relative" ref={watchlistDropdownRef}>
                                <button
                                    onClick={() => setShowWatchlistDropdown(!showWatchlistDropdown)}
                                    className="text-gray-400 hover:text-gray-300 transition-colors p-2 rounded-lg hover:bg-dark-hover flex items-center space-x-1"
                                    title="Import watchlist"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                    {selectedWatchlist && (
                                        <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                    )}
                                </button>
                                
                                {showWatchlistDropdown && (
                                    <div className="absolute right-0 mt-2 w-64 bg-dark-card border border-dark-border rounded-lg shadow-large z-10 max-h-80 overflow-y-auto">
                                        <div className="p-2">
                                            <div className="text-xs font-semibold text-gray-500 uppercase px-2 py-1 mb-1">
                                                Select Watchlist
                                            </div>
                                            {selectedWatchlist && (
                                                <button
                                                    onClick={handleRemoveWatchlist}
                                                    className="w-full text-left px-3 py-2 rounded-md hover:bg-dark-hover transition-colors duration-150 text-sm text-gray-400 mb-1"
                                                >
                                                    ✕ Remove context
                                                </button>
                                            )}
                                            {watchlists.map((watchlist) => (
                                                <button
                                                    key={watchlist.id}
                                                    onClick={() => handleSelectWatchlist(watchlist)}
                                                    className={`w-full text-left px-3 py-2 rounded-md hover:bg-dark-hover transition-colors duration-150 flex items-center justify-between ${
                                                        selectedWatchlist?.id === watchlist.id ? 'bg-dark-hover' : ''
                                                    }`}
                                                >
                                                    <div className="flex-1">
                                                        <div className="text-sm text-white font-medium">{watchlist.name}</div>
                                                        <div className="text-xs text-gray-400">
                                                            {watchlist.items?.length || 0} stocks
                                                        </div>
                                                    </div>
                                                    {selectedWatchlist?.id === watchlist.id && (
                                                        <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                        </svg>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        <button
                            onClick={handleClearChat}
                            className="text-gray-400 hover:text-gray-300 transition-colors p-2 rounded-lg hover:bg-dark-hover"
                            title="Clear chat"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-dark-hover"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-dark-bg">
                    {messages.map((message, index) => {
                        // Skip rendering system messages as regular messages (they're shown differently)
                        if (message.role === 'system') {
                            return (
                                <div key={index} className="flex justify-center">
                                    <div className="bg-dark-surface border border-dark-border rounded-lg px-4 py-2 text-xs text-gray-400">
                                        {message.text}
                                    </div>
                                </div>
                            )
                        }
                        
                        return (
                            <div
                                key={index}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                                        message.role === 'user'
                                            ? 'bg-white text-dark-bg rounded-br-sm'
                                            : 'bg-dark-surface border border-dark-border text-gray-200 rounded-bl-sm'
                                    }`}
                                >
                                    {message.role === 'user' ? (
                                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed font-medium">
                                            {message.text}
                                        </p>
                                    ) : (
                                        <div className="text-sm leading-relaxed">
                                            {formatMessage(message.text)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                    
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-dark-surface border border-dark-border text-gray-300 rounded-2xl rounded-bl-sm px-5 py-4">
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Form */}
                <div className="p-6 border-t border-dark-border bg-dark-surface">
                    <form onSubmit={handleSendMessage} className="flex gap-3">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                placeholder="Ask about stocks, markets, investing..."
                                className="w-full px-5 py-4 bg-dark-card border border-dark-border rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-gray-500 focus:border-gray-600 outline-none transition-all duration-200 text-sm"
                                disabled={loading}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        handleSendMessage(e)
                                    }
                                }}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !inputMessage.trim()}
                            className={`px-6 py-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center ${
                                loading || !inputMessage.trim()
                                    ? 'bg-gray-800 cursor-not-allowed text-gray-600'
                                    : 'bg-white text-dark-bg hover:bg-gray-200 hover:shadow-medium'
                            }`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </form>
                    <p className="text-xs text-gray-500 mt-3 text-center">
                        Educational information only. Not financial advice.
                    </p>
                </div>
            </div>
        </div>
    )
}
