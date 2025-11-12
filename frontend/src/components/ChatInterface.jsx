import { useState, useRef, useEffect } from 'react'
import { api } from '../api'

export default function ChatInterface({ isOpen, onClose }) {
    const [messages, setMessages] = useState([
        {
            role: 'model',
            text: '👋 Hello! I\'m your AI finance assistant. Ask me anything about stocks, markets, or investing!'
        }
    ])
    const [inputMessage, setInputMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const messagesEndRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleSendMessage = async (e) => {
        e.preventDefault()
        if (!inputMessage.trim() || loading) return

        const userMessage = inputMessage.trim()
        setInputMessage('')
        
        // Add user message to chat
        setMessages(prev => [...prev, { role: 'user', text: userMessage }])
        setLoading(true)

        try {
            // Prepare chat history for API
            const history = messages.map(msg => ({
                role: msg.role === 'model' ? 'model' : 'user',
                parts: [{ text: msg.text }]
            }))

            const response = await api.post('/chat', {
                message: userMessage,
                history: history
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
                text: '👋 Hello! I\'m your AI finance assistant. Ask me anything about stocks, markets, or investing!'
            }
        ])
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
            
            {/* Chat Sidebar */}
            <div className={`fixed inset-y-0 left-0 w-96 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-white">AI Assistant</h2>
                                <p className="text-xs text-blue-100">Finance & Stock Expert</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={handleClearChat}
                                className="text-white hover:text-blue-100 transition-colors p-2 rounded-lg hover:bg-white hover:bg-opacity-10"
                                title="Clear chat"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                            <button
                                onClick={onClose}
                                className="text-white hover:text-blue-100 transition-colors p-2 rounded-lg hover:bg-white hover:bg-opacity-10"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Messages Container */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-lg p-3 ${
                                        message.role === 'user'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-white text-gray-800 shadow-sm border border-gray-200'
                                    }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                                </div>
                            </div>
                        ))}
                        
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white text-gray-800 rounded-lg p-3 shadow-sm border border-gray-200">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Form */}
                    <div className="p-4 border-t border-gray-200 bg-white">
                        <form onSubmit={handleSendMessage} className="flex gap-2">
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                placeholder="Ask about stocks, markets, investing..."
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                disabled={loading}
                            />
                            <button
                                type="submit"
                                disabled={loading || !inputMessage.trim()}
                                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                                    loading || !inputMessage.trim()
                                        ? 'bg-gray-300 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
                                } text-white`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </form>
                        <p className="text-xs text-gray-500 mt-2 text-center">
                            Educational information only. Not financial advice.
                        </p>
                    </div>
                </div>
            </div>
        </>
    )
}

