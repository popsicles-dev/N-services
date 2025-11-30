import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

export default function Steve() {
    const [isOpen, setIsOpen] = useState(true)
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
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, loading])

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

    return (
        <div className="w-1/4 bg-white/50 dark:bg-gray-900/50 border-l border-gray-200/50 dark:border-gray-800/50 flex flex-col h-screen backdrop-blur-sm transition-all duration-300">
            {/* Header / Avatar Area */}
            <div className="p-4 border-b border-gray-200/50 dark:border-gray-800/50 flex flex-col items-center bg-white/30 dark:bg-gray-800/30">
                <div className="relative h-24 w-20 animate-float cursor-pointer group" onClick={() => setIsOpen(!isOpen)}>
                    <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl animate-glow"></div>
                    <div className="absolute inset-0 flex flex-col items-center transform scale-75 origin-top">
                        {/* Head */}
                        <div className="w-[70%] h-[35%] bg-white dark:bg-gray-200 rounded-full relative">
                            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[70%] h-[60%] bg-black rounded-lg overflow-hidden">
                                {/* Eyes */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full flex justify-center items-center gap-2">
                                    <div className={`w-1.5 h-1.5 bg-blue-400 rounded-full shadow-[0_0_6px_#49d6e9] ${loading ? 'animate-bounce' : 'animate-blink'}`}></div>
                                    <div className={`w-1.5 h-1.5 bg-blue-400 rounded-full shadow-[0_0_6px_#49d6e9] ${loading ? 'animate-bounce animation-delay-150' : 'animate-blink animation-delay-300'}`}></div>
                                </div>
                            </div>
                        </div>
                        {/* Body */}
                        <div className="w-full h-[65%] bg-white dark:bg-gray-200 rounded-t-lg rounded-b-2xl shadow-lg relative">
                            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-cyan-200 dark:bg-cyan-600 blur-sm"></div>
                        </div>
                    </div>
                </div>
                <h3 className="font-bold text-lg text-gray-800 dark:text-white mt-[-10px]">Steve</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">SEO Expert</p>
            </div>

            {/* Chat History Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm ${msg.role === 'user'
                            ? 'bg-primary text-white rounded-br-none'
                            : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-bl-none'
                            }`}>
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce animation-delay-150"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce animation-delay-300"></div>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white/30 dark:bg-gray-900/30 border-t border-gray-200/50 dark:border-gray-800/50 backdrop-blur-md">
                <div className="relative">
                    <textarea
                        className="w-full rounded-xl border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary focus:border-primary transition p-3 pr-12 text-sm resize-none shadow-sm"
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
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    )
}
