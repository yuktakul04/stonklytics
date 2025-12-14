import { useState, useRef, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'
import { api } from '../api'

// Function to format AI responses with markdown-like formatting
const formatMessage = (text) => {
    if (!text) return ''
    
    const lines = text.split('\n')
    const formattedLines = []
    
    lines.forEach((line, index) => {
        const trimmedLine = line.trim()
        
        if (trimmedLine.startsWith('### ')) {
            const content = trimmedLine.substring(4)
            formattedLines.push(
                <div key={index} className="font-semibold text-white text-sm mt-4 mb-2 first:mt-0">
                    {formatInlineText(content)}
                </div>
            )
        }
        else if (trimmedLine.startsWith('## ')) {
            const content = trimmedLine.substring(3)
            formattedLines.push(
                <div key={index} className="font-semibold text-white text-base mt-4 mb-2 first:mt-0">
                    {formatInlineText(content)}
                </div>
            )
        }
        else if (trimmedLine.startsWith('# ')) {
            const content = trimmedLine.substring(2)
            formattedLines.push(
                <div key={index} className="font-semibold text-white text-lg mt-4 mb-2 first:mt-0">
                    {formatInlineText(content)}
                </div>
            )
        }
        else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
            const content = trimmedLine.substring(2)
            formattedLines.push(
                <div key={index} className="flex items-start gap-2 my-1.5">
                    <span className="text-zinc-500 mt-1 flex-shrink-0">•</span>
                    <span className="flex-1">{formatInlineText(content)}</span>
                </div>
            )
        }
        else if (/^\d+\.\s/.test(trimmedLine)) {
            const match = trimmedLine.match(/^(\d+)\.\s(.+)/)
            if (match) {
                formattedLines.push(
                    <div key={index} className="flex items-start gap-2 my-1.5">
                        <span className="text-zinc-500 font-mono text-sm flex-shrink-0">{match[1]}.</span>
                        <span className="flex-1">{formatInlineText(match[2])}</span>
                    </div>
                )
            }
        }
        else if (trimmedLine && !trimmedLine.startsWith('#') && (trimmedLine === trimmedLine.toUpperCase() || trimmedLine.endsWith(':'))) {
            formattedLines.push(
                <div key={index} className="font-medium text-white mt-3 mb-1.5 first:mt-0">
                    {formatInlineText(trimmedLine)}
                </div>
            )
        }
        else if (trimmedLine) {
            formattedLines.push(
                <div key={index} className="my-1.5 leading-relaxed text-zinc-300">
                    {formatInlineText(trimmedLine)}
                </div>
            )
        }
        else {
            formattedLines.push(<div key={index} className="h-2" />)
        }
    })
    
    return formattedLines.length > 0 ? formattedLines : formatInlineText(text)
}

const formatInlineText = (text) => {
    if (!text) return ''
    
    const parts = []
    let currentIndex = 0
    
    const boldRegex = /\*\*(.+?)\*\*/g
    let match
    
    while ((match = boldRegex.exec(text)) !== null) {
        if (match.index > currentIndex) {
            parts.push(text.substring(currentIndex, match.index))
        }
        
        parts.push(<strong key={match.index} className="font-medium text-white">{match[1]}</strong>)
        
        currentIndex = match.index + match[0].length
    }
    
    if (currentIndex < text.length) {
        parts.push(text.substring(currentIndex))
    }
    
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

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser)
            if (firebaseUser && isOpen) {
                fetchWatchlists()
            }
        })
        return () => unsubscribe()
    }, [isOpen])

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
        
        setMessages(prev => [...prev, { role: 'user', text: userMessage }])
        setLoading(true)

        try {
            const history = messages
                .filter(msg => msg.role !== 'system')
                .map(msg => ({
                    role: msg.role === 'model' ? 'model' : 'user',
                    parts: [{ text: msg.text }]
                }))

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
                timeout: 60000
            })

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
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={handleBackdropClick}
        >
            {/* Chat Modal */}
            <div 
                className="bg-[#0f0f12] border border-[#27272a] rounded-xl shadow-large w-full max-w-3xl h-[85vh] max-h-[800px] flex flex-col overflow-hidden animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272a] bg-[#18181b]">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-[#27272a] rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-white">AI Assistant</h2>
                            <div className="flex items-center gap-2">
                                <p className="text-xs text-zinc-500">Powered by Gemini</p>
                                {selectedWatchlist && (
                                    <>
                                        <span className="text-zinc-700">•</span>
                                        <p className="text-xs text-green-500 font-medium">
                                            {selectedWatchlist.name}
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-1">
                        {/* Watchlist Selector */}
                        {user && watchlists.length > 0 && (
                            <div className="relative" ref={watchlistDropdownRef}>
                                <button
                                    onClick={() => setShowWatchlistDropdown(!showWatchlistDropdown)}
                                    className="text-zinc-500 hover:text-zinc-300 transition-colors p-2 rounded-lg hover:bg-[#27272a] flex items-center space-x-1"
                                    title="Import watchlist"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                    {selectedWatchlist && (
                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                    )}
                                </button>
                                
                                {showWatchlistDropdown && (
                                    <div className="absolute right-0 mt-2 w-56 bg-[#18181b] border border-[#27272a] rounded-lg shadow-large z-10 max-h-72 overflow-y-auto ui-scrollbar">
                                        <div className="p-2">
                                            <div className="text-[10px] font-medium text-zinc-600 uppercase tracking-wide px-2 py-1 mb-1">
                                                Select Watchlist
                                            </div>
                                            {selectedWatchlist && (
                                                <button
                                                    onClick={handleRemoveWatchlist}
                                                    className="w-full text-left px-3 py-2 rounded-md hover:bg-[#27272a] transition-colors duration-150 text-sm text-zinc-500 mb-1"
                                                >
                                                    ✕ Remove context
                                                </button>
                                            )}
                                            {watchlists.map((watchlist) => (
                                                <button
                                                    key={watchlist.id}
                                                    onClick={() => handleSelectWatchlist(watchlist)}
                                                    className={`w-full text-left px-3 py-2 rounded-md hover:bg-[#27272a] transition-colors duration-150 flex items-center justify-between ${
                                                        selectedWatchlist?.id === watchlist.id ? 'bg-[#27272a]' : ''
                                                    }`}
                                                >
                                                    <div className="flex-1">
                                                        <div className="text-sm text-white font-medium">{watchlist.name}</div>
                                                        <div className="text-xs text-zinc-500">
                                                            {watchlist.items?.length || 0} stocks
                                                        </div>
                                                    </div>
                                                    {selectedWatchlist?.id === watchlist.id && (
                                                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
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
                            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-[#27272a] transition-colors"
                            title="Clear chat"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-[#27272a] transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#09090b] ui-scrollbar">
                    {messages.map((message, index) => {
                        if (message.role === 'system') {
                            return (
                                <div key={index} className="flex justify-center">
                                    <div className="bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-1.5 text-xs text-zinc-500">
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
                                    className={`max-w-[85%] rounded-xl px-4 py-3 ${
                                        message.role === 'user'
                                            ? 'bg-[#3b82f6] text-white rounded-br-none'
                                            : 'bg-[#18181b] border border-[#27272a] text-zinc-300 rounded-bl-none'
                                    }`}
                                >
                                    {message.role === 'user' ? (
                                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
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
                            <div className="bg-[#18181b] border border-[#27272a] text-zinc-400 rounded-xl rounded-bl-none px-4 py-3">
                                <div className="flex items-center space-x-1.5">
                                    <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                                    <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Form */}
                <div className="px-6 py-4 border-t border-[#27272a] bg-[#18181b]">
                    <form onSubmit={handleSendMessage} className="flex gap-3">
                        <div className="flex-1">
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                placeholder="Ask about stocks, markets, investing..."
                                className="w-full px-4 py-3 bg-[#0f0f12] border border-[#27272a] rounded-lg text-white text-sm placeholder:text-zinc-600 focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]/20 transition-all"
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
                            className={`px-4 py-3 bg-[#3b82f6] hover:bg-[#1d4ed8] text-white rounded-lg transition-colors ${loading || !inputMessage.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </form>
                    <p className="text-[10px] text-zinc-600 mt-2 text-center">
                        Educational information only. Not financial advice.
                    </p>
                </div>
            </div>
        </div>
    )
}
