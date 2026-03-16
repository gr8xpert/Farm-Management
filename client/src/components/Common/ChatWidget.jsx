import { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send, Trash2, Loader2, Bot, User, Sparkles } from 'lucide-react'
import api from '../../services/api'

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      fetchHistory()
    }
  }, [isOpen])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchHistory = async () => {
    setHistoryLoading(true)
    try {
      const res = await api.get('/ai/history')
      if (res.data.success && res.data.data.length > 0) {
        setMessages(res.data.data.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: new Date(m.created_on)
        })))
      } else {
        // Add welcome message
        setMessages([{
          role: 'assistant',
          content: 'Hello! I\'m your Farm Management AI Assistant. I can help you with:\n\n• Sales and purchases analysis\n• Customer and supplier information\n• Payment tracking and outstanding balances\n• Stock levels and alerts\n• Business insights and recommendations\n\nHow can I help you today?',
          timestamp: new Date()
        }])
      }
    } catch (error) {
      console.error('Error fetching chat history:', error)
      setMessages([{
        role: 'assistant',
        content: 'Hello! How can I help you manage your farm today?',
        timestamp: new Date()
      }])
    } finally {
      setHistoryLoading(false)
    }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const res = await api.post('/ai/chat', { message: userMessage.content })
      if (res.data.success) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: res.data.data.response,
          timestamp: new Date()
        }])
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        isError: true
      }])
    } finally {
      setLoading(false)
    }
  }

  const clearHistory = async () => {
    if (!confirm('Are you sure you want to clear chat history?')) return

    try {
      await api.delete('/ai/history')
      setMessages([{
        role: 'assistant',
        content: 'Chat history cleared. How can I help you today?',
        timestamp: new Date()
      }])
    } catch (error) {
      console.error('Error clearing history:', error)
    }
  }

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 ${isOpen ? 'scale-0' : 'scale-100'}`}
        style={{ borderRadius: '50%' }}
      >
        <MessageCircle className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
          <Sparkles className="w-2.5 h-2.5 text-white" />
        </span>
      </button>

      {/* Chat Window */}
      <div
        className={`fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] transition-all duration-300 ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
        style={{
          height: '500px',
          maxHeight: 'calc(100vh - 6rem)',
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold">Farm AI Assistant</h3>
              <p className="text-xs text-green-100">Powered by Groq</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearHistory}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              title="Clear history"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          className="bg-gray-50 p-4 overflow-y-auto"
          style={{ height: 'calc(100% - 140px)' }}
        >
          {historyLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-green-600" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] p-3 text-sm ${
                      msg.role === 'user'
                        ? 'bg-green-600 text-white rounded-2xl rounded-br-sm'
                        : msg.isError
                        ? 'bg-red-50 text-red-700 border border-red-200 rounded-2xl rounded-bl-sm'
                        : 'bg-white text-gray-700 shadow-sm border border-gray-100 rounded-2xl rounded-bl-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-green-100' : 'text-gray-400'}`}>
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-gray-600" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-2 justify-start">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="bg-white p-3 rounded-2xl rounded-bl-sm shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={sendMessage}
          className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3"
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your farm data..."
              className="flex-1 px-4 py-2.5 bg-gray-100 border-0 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2.5 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
