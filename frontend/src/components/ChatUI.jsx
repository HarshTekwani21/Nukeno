import React, { useState, useRef, useEffect, useCallback } from 'react'
import MessageBubble from './MessageBubble'
import VoiceInput from './VoiceInput'
import DailyBriefing from './DailyBriefing'
import { api } from '../services/api'

const ChatUI = () => {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('checking')
  const [tasksExtracted, setTasksExtracted] = useState([])
  const [messageCount, setMessageCount] = useState(0)
  const [activeTab, setActiveTab] = useState('chat')
  const [userId] = useState(() => `user_${Date.now()}`)
  const [sessionId] = useState(() => `session_${Date.now()}`)
  
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  useEffect(() => {
    checkConnection()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      window.speechSynthesis.cancel()
    }
  }, [])

  const checkConnection = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:10000'}/health`)
      if (response.ok) {
        setConnectionStatus('connected')
      } else {
        setConnectionStatus('error')
      }
    } catch {
      setConnectionStatus('disconnected')
    }
  }

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [])

  const handleSend = async (text = input) => {
    if (!text.trim() || isLoading) return

    const userMessage = text.trim()
    setInput('')
    
    setMessages(prev => [...prev, { 
      id: Date.now(), 
      text: userMessage, 
      isUser: true, 
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent'
    }])
    
    setIsLoading(true)

    try {
      const response = await api.chat(userMessage, sessionId)
      
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        text: response.response, 
        isUser: false, 
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'received'
      }])

      // Auto-speak the response using browser TTS
      if (response.response) {
        useFallbackTTS(response.response)
      }

      if (response.tasks_extracted?.length > 0) {
        setTasksExtracted(response.tasks_extracted)
        typingTimeoutRef.current = setTimeout(() => setTasksExtracted([]), 5000)
      }

      scrollToBottom()
      
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, { 
        id: Date.now() + 1,
        text: 'Connection error. Please check your internet and try again.', 
        isUser: false, 
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'error'
      }])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleVoiceTranscription = async (audioBlob) => {
    setIsLoading(true)
    
    const userTranscriptId = Date.now()
    setMessages(prev => [...prev, { 
      id: userTranscriptId,
      text: '🎤 Voice message...',
      isUser: true, 
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sending'
    }])
    
    try {
      const response = await api.voiceChat(audioBlob)
      
      if (response.error) {
        setMessages(prev => prev.map(m => 
          m.id === userTranscriptId 
            ? { ...m, text: response.transcript || 'Could not process audio', status: 'error' }
            : m
        ))
        
        if (response.response) {
          setMessages(prev => [...prev, { 
            id: Date.now(),
            text: response.response, 
            isUser: false, 
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'received'
          }])
        }
      } else if (response.transcript) {
        setMessages(prev => prev.map(m => 
          m.id === userTranscriptId 
            ? { ...m, text: response.transcript, status: 'sent' }
            : m
        ))
        
        setMessages(prev => [...prev, { 
          id: Date.now(),
          text: response.response, 
          isUser: false, 
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'received'
        }])

        if (response.audio_data) {
          playAudio(response.audio_data, response.mime_type)
        } else if (response.response) {
          useFallbackTTS(response.response)
        }
      }
      
      scrollToBottom()
      
    } catch (error) {
      console.error('Voice chat error:', error)
      setMessages(prev => prev.map(m => 
        m.id === userTranscriptId 
          ? { ...m, text: 'Voice message failed', status: 'error' }
          : m
      ))
    } finally {
      setIsLoading(false)
    }
  }

  const playAudio = (audioData, mimeType) => {
    try {
      const binaryString = atob(audioData)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: mimeType || 'audio/pcm' })
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      
      setIsSpeaking(true)
      audio.onended = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(url)
      }
      audio.onerror = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(url)
        useFallbackTTS(messages[messages.length - 1]?.text)
      }
      audio.play()
    } catch (error) {
      console.error('Audio playback error:', error)
      useFallbackTTS(messages[messages.length - 1]?.text)
    }
  }

  const useFallbackTTS = (text) => {
    if (!text || !('speechSynthesis' in window)) return
    
    window.speechSynthesis.cancel()
    
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.1
    utterance.pitch = 1
    utterance.volume = 1
    
    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = voices.find(v => 
      v.name.includes('Neural') || v.name.includes('Google') || v.lang.startsWith('en-')
    )
    if (preferredVoice) utterance.voice = preferredVoice
    
    setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    
    window.speechSynthesis.speak(utterance)
  }

  const stopSpeaking = () => {
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const clearChat = () => {
    setMessages([])
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-nukeno-dark via-gray-900 to-nukeno-dark">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800/50 backdrop-blur-sm bg-nukeno-dark/50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <span className="text-white font-bold text-lg">N</span>
            </div>
            <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-nukeno-dark ${
              connectionStatus === 'connected' ? 'bg-green-500' : 
              connectionStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
            }`} />
          </div>
          <div>
            <h2 className="text-white font-semibold">Nukeno</h2>
            <p className="text-xs text-gray-500">
              {connectionStatus === 'connected' ? `${messages.length} messages` : 
               connectionStatus === 'error' ? 'Connection error' : 'Connecting...'}
            </p>
          </div>
          <div className="flex gap-2 bg-gray-800/50 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'chat' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              💬 Chat
            </button>
            <button
              onClick={() => setActiveTab('voice')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'voice' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              🎤 Voice
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'tasks' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              ✅ Tasks
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'notes' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              📝 Notes
            </button>
          </div>
        </div>
        
        <button
          onClick={clearChat}
          className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          title="Clear chat"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 chat-container">
        {activeTab === 'voice' && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center mb-8">
              <div className="w-32 h-32 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <span className="text-6xl">🎤</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Voice Chat</h2>
              <p className="text-gray-400 mb-6">Click the microphone to start talking</p>
            </div>
            <VoiceInput
              onTranscript={(text) => {
                setInput(text)
              }}
              onEnd={(finalText) => {
                handleSend(finalText)
              }}
              disabled={isLoading}
            />
          </div>
        )}

        {activeTab !== 'voice' && (
          <>
            <DailyBriefing />
        
        {tasksExtracted.length > 0 && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-sm text-green-400">
              ✓ Added {tasksExtracted.length} task{tasksExtracted.length > 1 ? 's' : ''} to your list
            </p>
          </div>
        )}
        
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="relative mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/40 animate-pulse">
                <span className="text-white font-bold text-4xl">N</span>
              </div>
              <div className="absolute inset-0 w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl animate-ping opacity-20" />
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-3">Welcome to Nukeno</h2>
            <p className="text-gray-400 max-w-md mb-8">
              Your intelligent AI assistant. Ask me anything about your tasks, get priorities, or just chat.
            </p>
            
            <div className="flex flex-wrap gap-3 justify-center max-w-2xl">
              <button
                onClick={() => handleSend("What's my top priority today?")}
                className="px-5 py-2.5 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 hover:border-indigo-500/50 text-white rounded-xl text-sm transition-all hover:scale-105"
              >
                What's my top priority?
              </button>
              <button
                onClick={() => handleSend("I feel overwhelmed")}
                className="px-5 py-2.5 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 hover:border-indigo-500/50 text-white rounded-xl text-sm transition-all hover:scale-105"
              >
                I'm overwhelmed
              </button>
              <button
                onClick={() => handleSend("Summarize my week")}
                className="px-5 py-2.5 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 hover:border-indigo-500/50 text-white rounded-xl text-sm transition-all hover:scale-105"
              >
                Summarize my week
              </button>
              <button
                onClick={() => handleSend("Add task: Review proposal by Friday")}
                className="px-5 py-2.5 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 hover:border-indigo-500/50 text-indigo-300 rounded-xl text-sm transition-all hover:scale-105"
              >
                + Add a task
              </button>
            </div>
          </div>
        )}

        <div className="space-y-1">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`transform transition-all duration-300 ${
                message.status === 'sending' ? 'opacity-70' : 'opacity-100'
              }`}
              style={{
                animation: message.status === 'received' ? 'fadeInUp 0.3s ease-out' : 'none'
              }}
            >
              <MessageBubble
                message={message.text}
                isUser={message.isUser}
                timestamp={message.timestamp}
                status={message.status}
              />
            </div>
          ))}
        </div>

        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="bg-nukeno-gray/80 backdrop-blur text-gray-100 px-5 py-4 rounded-2xl rounded-bl-md border border-gray-700/50 shadow-lg">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full typing-dot" />
                  <div className="w-2 h-2 bg-indigo-400 rounded-full typing-dot" />
                  <div className="w-2 h-2 bg-indigo-400 rounded-full typing-dot" />
                </div>
                <span className="text-sm text-gray-400 ml-2">Nukeno is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} className="h-4" />
        </>
        )}

        <div className="p-4 border-t border-gray-800/50 backdrop-blur-sm bg-nukeno-dark/50">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end gap-3">
            <VoiceInput
              onTranscript={(text) => {
                setInput(text)
              }}
              onEnd={(finalText) => {
                handleSend(finalText)
              }}
              disabled={isLoading}
            />
            
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message or click the mic..."
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent resize-none backdrop-blur transition-all"
                rows="1"
                style={{ minHeight: '48px', maxHeight: '120px' }}
                disabled={isLoading}
              />
            </div>
            
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="p-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/30"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>

            {isSpeaking && (
              <button
                onClick={stopSpeaking}
                className="p-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-xl transition-all animate-pulse"
                title="Stop speaking"
              >
                <div className="flex gap-0.5 items-center">
                  <div className="w-1 h-4 bg-red-400 rounded-full animate-pulse" />
                  <div className="w-1 h-4 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
                  <div className="w-1 h-4 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                </div>
              </button>
            )}
          </div>
          
          <p className="text-xs text-gray-600 mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

export default ChatUI
