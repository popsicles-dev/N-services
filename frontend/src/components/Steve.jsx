import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

export default function Steve() {
    const [isOpen, setIsOpen] = useState(false)
    const [message, setMessage] = useState('')
    const [messages, setMessages] = useState([
        { role: 'assistant', content: "Hi! I'm Steve, your SEO Expert. Need help? Just ask!" }
    ])
    const [loading, setLoading] = useState(false)
    const [sessionId, setSessionId] = useState('')
    const chatEndRef = useRef(null)

    useEffect(() => {
        setSessionId(Math.random().toString(36).substring(7))
    }, [])

    useEffect(() => {
        if (isOpen) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages, loading, isOpen])

    const handleAsk = async () => {
        if (!message.trim()) return

        const userMsg = message
        setMessage('')
        setMessages(prev => [...prev, { role: 'user', content: userMsg }])
        setLoading(true)

        try {
            const res = await axios.post('http://localhost:8000/api/chat/ask', {
                session_id: sessionId,
                message: userMsg
            })
            setMessages(prev => [...prev, { role: 'assistant', content: res.data.answer }])
        } catch (err) {
            console.error(err)
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again." }])
        } finally {
            setLoading(false)
        }
    }

    // Collapsed State (Floating Icon)
    if (!isOpen) {
        return (
            <div
                onClick={() => setIsOpen(true)}
                className="bg-white dark:bg-gray-800 p-2 rounded-full shadow-lg cursor-pointer hover:scale-110 transition-transform duration-300 group border border-gray-100 dark:border-gray-700"
            >
                <div className="relative h-14 w-14">
                    <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-lg group-hover:bg-blue-500/30 transition-colors"></div>
                    {/* Head */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center transform scale-90">
                        <div className="w-[70%] h-[35%] bg-white dark:bg-gray-200 rounded-full relative z-10">
                            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[70%] h-[60%] bg-black rounded-lg overflow-hidden">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full flex justify-center items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-blink"></div>
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-blink animation-delay-300"></div>
                                </div>
                            </div>
                        </div>
                        <div className="w-full h-[65%] bg-white dark:bg-gray-200 rounded-t-lg rounded-b-2xl shadow-sm relative mt-[-2px]">
                            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-cyan-200 dark:bg-cyan-600 blur-sm"></div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Expanded State (Chat Window)
    return (
        <div className="w-[350px] h-[500px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10">
                        <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-md"></div>
                        <div className="absolute inset-0 flex flex-col items-center transform scale-75">
                            <div className="w-[70%] h-[35%] bg-white dark:bg-gray-200 rounded-full relative z-10">
                                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[70%] h-[60%] bg-black rounded-lg overflow-hidden">
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full flex justify-center items-center gap-1">
                                        <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                                        <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                                    </div>
                                </div>
                            </div>
                            <div className="w-full h-[65%] bg-white dark:bg-gray-200 rounded-t-lg rounded-b-2xl shadow-sm relative mt-[-1px]"></div>
                        </div>
                    </div>
                    <div>
                        <h3 className="font-bold text-sm text-gray-900 dark:text-white">Steve</h3>
                        <p className="text-xs text-blue-600 dark:text-blue-400">SEO Expert</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-gray-900/50">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${msg.role === 'user'
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-bl-none'
                            }`}>
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce animation-delay-150"></div>
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce animation-delay-300"></div>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <div className="relative">
                    <textarea
                        className="w-full rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition p-3 pr-10 text-sm resize-none"
                        placeholder="Ask Steve..."
                        rows="1"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleAsk()
                            }
                        }}
                    ></textarea>
                    <button
                        onClick={handleAsk}
                        disabled={loading || !message.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                    </button>
                </div>
            </div>
        </div>
    )
}
