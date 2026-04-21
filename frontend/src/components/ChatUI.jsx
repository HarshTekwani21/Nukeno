import React, { useState, useRef, useEffect, useCallback } from 'react'
import MessageBubble from './MessageBubble'
import VoiceInput from './VoiceInput'
import DailyBriefing from './DailyBriefing'
import { api } from '../services/api'

const ChatUI = ({ selectedTask }) => {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('checking')
  const [whisperDevice, setWhisperDevice] = useState(null)
  const [tasksExtracted, setTasksExtracted] = useState([])
  const [activeTab, setActiveTab] = useState('chat')
  const [sessionId] = useState(() => `session_${Date.now()}`)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  useEffect(() => { checkConnection() }, [])

  useEffect(() => {
    if (selectedTask) {
      setInput(`Tell me about my task: ${selectedTask}`)
      setActiveTab('chat')
      inputRef.current?.focus()
    }
  }, [selectedTask])

  useEffect(() => { scrollToBottom() }, [messages])

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      window.speechSynthesis.cancel()
    }
  }, [])

  const checkConnection = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:10000'
      const res = await fetch(`${apiUrl}/health`)
      if (res.ok) {
        const data = await res.json()
        setConnectionStatus('connected')
        setWhisperDevice(data.whisper_device || null)
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

      if (response.response) useFallbackTTS(response.response)

      if (response.tasks_extracted?.length > 0) {
        setTasksExtracted(response.tasks_extracted)
        typingTimeoutRef.current = setTimeout(() => setTasksExtracted([]), 5000)
      }

      scrollToBottom()
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: 'Connection error. Make sure the backend is running on port 10000.',
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
    const msgId = Date.now()
    setMessages(prev => [...prev, {
      id: msgId,
      text: '🎤 Processing voice...',
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sending'
    }])

    try {
      const response = await api.voiceChat(audioBlob)
      if (response.transcript) {
        setMessages(prev => prev.map(m =>
          m.id === msgId ? { ...m, text: response.transcript, status: 'sent' } : m
        ))
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: response.response,
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'received'
        }])
        if (response.audio_data) playAudio(response.audio_data, response.mime_type)
        else if (response.response) useFallbackTTS(response.response)
      } else {
        setMessages(prev => prev.map(m =>
          m.id === msgId ? { ...m, text: 'Could not process audio', status: 'error' } : m
        ))
      }
      scrollToBottom()
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === msgId ? { ...m, text: 'Voice message failed', status: 'error' } : m
      ))
    } finally {
      setIsLoading(false)
    }
  }

  const playAudio = (audioData, mimeType) => {
    try {
      const bytes = Uint8Array.from(atob(audioData), c => c.charCodeAt(0))
      const blob = new Blob([bytes], { type: mimeType || 'audio/pcm' })
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      setIsSpeaking(true)
      audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(url) }
      audio.onerror = () => { setIsSpeaking(false); URL.revokeObjectURL(url) }
      audio.play()
    } catch {
      useFallbackTTS(messages[messages.length - 1]?.text)
    }
  }

  const useFallbackTTS = (text) => {
    if (!text || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.05
    utterance.pitch = 1.1
    const voices = window.speechSynthesis.getVoices()
    const preferred =
      voices.find(v => v.name === 'Google UK English Female') ||
      voices.find(v => v.name === 'Microsoft Zira - English (United States)') ||
      voices.find(v => v.name === 'Microsoft Hazel - English (Great Britain)') ||
      voices.find(v => v.name.toLowerCase().includes('female') && v.lang.startsWith('en-')) ||
      voices.find(v => v.name.includes('Samantha') && v.lang.startsWith('en-')) ||
      voices.find(v => (v.name.includes('Neural') || v.name.includes('Google')) && v.lang.startsWith('en-')) ||
      voices.find(v => v.lang.startsWith('en-'))
    if (preferred) utterance.voice = preferred
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

  const tabs = [
    { id: 'chat', label: 'Chat', icon: '💬' },
    { id: 'voice', label: 'Voice', icon: '🎤' },
    { id: 'tasks', label: 'Tasks', icon: '✅' },
    { id: 'notes', label: 'Notes', icon: '📝' },
  ]

  return (
    <div
      className="flex-1 flex flex-col h-full"
      style={{ background: 'linear-gradient(160deg, #0b0d1a 0%, #111526 60%, #0b0d1a 100%)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b backdrop-blur-sm flex-shrink-0"
        style={{ borderColor: 'rgba(30,36,71,0.6)', background: 'rgba(11,13,26,0.7)' }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-shrink-0">
            <img src="/NukenoLogoi.png" alt="Nukeno" className="w-9 h-9 object-contain" />
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2`}
              style={{
                borderColor: '#0b0d1a',
                background: connectionStatus === 'connected' ? '#4ade80'
                  : connectionStatus === 'error' ? '#f87171' : '#fbbf24',
                animation: connectionStatus === 'checking' ? 'pulse 1.5s infinite' : undefined
              }}
            />
          </div>
          <div className="flex-shrink-0">
            <h2 className="text-white font-semibold text-sm gradient-text">Nukeno</h2>
            <p className="text-xs text-gray-600">
              {connectionStatus === 'connected'
                ? `${messages.length > 0 ? `${messages.length} messages` : 'Ready'}${whisperDevice === 'cuda' ? ' · ⚡ GPU' : ''}`
                : connectionStatus === 'error' ? 'Backend offline'
                : 'Connecting...'}
            </p>
          </div>

          <div
            className="flex gap-0.5 p-1 rounded-xl border"
            style={{ background: 'rgba(19,22,43,0.6)', borderColor: 'rgba(30,36,71,0.5)' }}
          >
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
                style={
                  activeTab === tab.id
                    ? {
                        background: 'linear-gradient(135deg, #c84bff, #6e4ef2)',
                        color: '#fff',
                        boxShadow: '0 2px 10px rgba(200,75,255,0.25)'
                      }
                    : { color: '#6b7280' }
                }
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setMessages([])}
          className="p-2 rounded-lg transition-colors text-gray-600 hover:text-nukeno-cyan"
          style={{ background: 'transparent' }}
          title="Clear chat"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Scrollable messages */}
      <div className="flex-1 overflow-y-auto p-5 chat-container min-h-0">
        {activeTab === 'voice' ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center mb-8">
              <div
                className="relative mx-auto mb-6 w-32 h-32 rounded-full flex items-center justify-center neon-glow"
                style={{
                  background: 'linear-gradient(135deg, rgba(200,75,255,0.1), rgba(110,78,242,0.1), rgba(0,212,255,0.1))',
                  border: '1px solid rgba(200,75,255,0.2)'
                }}
              >
                <img src="/NukenoLogoi.png" alt="Nukeno" className="w-20 h-20 object-contain" />
                <div
                  className="absolute inset-0 rounded-full animate-ping opacity-5"
                  style={{ background: 'linear-gradient(135deg, #c84bff, #00d4ff)' }}
                />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Voice Mode</h2>
              {whisperDevice === 'cuda' && (
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-3"
                  style={{
                    background: 'rgba(0,212,255,0.08)',
                    border: '1px solid rgba(0,212,255,0.25)',
                    color: '#00d4ff'
                  }}
                >
                  ⚡ GPU Accelerated
                </div>
              )}
              <p className="text-gray-500 text-sm">Click the mic below to start talking</p>
            </div>
            <VoiceInput
              onTranscript={(text) => setInput(text)}
              onEnd={(finalText) => handleSend(finalText)}
              disabled={isLoading}
            />
          </div>
        ) : (
          <>
            <DailyBriefing />

            {tasksExtracted.length > 0 && (
              <div
                className="mb-4 p-3 rounded-xl border text-sm"
                style={{ background: 'rgba(0,212,255,0.05)', borderColor: 'rgba(0,212,255,0.2)', color: '#00d4ff' }}
              >
                ✓ Added {tasksExtracted.length} task{tasksExtracted.length > 1 ? 's' : ''} to your list
              </div>
            )}

            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center min-h-[58vh] text-center py-8">
                <div className="relative mb-7">
                  <div
                    className="w-28 h-28 rounded-3xl flex items-center justify-center neon-glow"
                    style={{
                      background: 'linear-gradient(135deg, rgba(200,75,255,0.1), rgba(110,78,242,0.1), rgba(0,212,255,0.1))',
                      border: '1px solid rgba(200,75,255,0.2)'
                    }}
                  >
                    <img src="/NukenoLogoi.png" alt="Nukeno" className="w-20 h-20 object-contain" />
                  </div>
                  <div
                    className="absolute inset-0 w-28 h-28 rounded-3xl animate-ping opacity-5"
                    style={{ background: 'linear-gradient(135deg, #c84bff, #00d4ff)' }}
                  />
                </div>

                <h2 className="text-3xl font-bold text-white mb-2">
                  Welcome to <span className="gradient-text">Nukeno</span>
                </h2>
                <p className="text-gray-500 max-w-sm mb-8 text-sm">
                  Your proactive AI assistant. Manage tasks, take notes, ask anything.
                </p>

                <div className="flex flex-wrap gap-3 justify-center max-w-xl">
                  {[
                    { text: "What's my top priority?", accent: false },
                    { text: "I'm overwhelmed, help me focus", accent: false },
                    { text: "Summarize my week", accent: false },
                    { text: "Add task: Review proposal by Friday", accent: true },
                  ].map(({ text, accent }) => (
                    <button
                      key={text}
                      onClick={() => handleSend(text)}
                      className="px-4 py-2 rounded-xl text-sm transition-all hover:scale-105"
                      style={
                        accent
                          ? {
                              color: '#00d4ff',
                              border: '1px solid rgba(0,212,255,0.3)',
                              background: 'rgba(0,212,255,0.05)'
                            }
                          : {
                              color: '#9ca3af',
                              border: '1px solid rgba(30,36,71,0.8)',
                              background: 'rgba(19,22,43,0.4)'
                            }
                      }
                    >
                      {text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1">
              {messages.map((message) => (
                <div
                  key={message.id}
                  style={{ opacity: message.status === 'sending' ? 0.6 : 1 }}
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
                <div
                  className="px-5 py-4 rounded-2xl border backdrop-blur-sm"
                  style={{
                    background: 'rgba(19,22,43,0.9)',
                    borderColor: 'rgba(30,36,71,0.8)',
                    borderLeft: '2px solid rgba(0,212,255,0.3)'
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full typing-dot" style={{ background: '#c84bff' }} />
                      <div className="w-2 h-2 rounded-full typing-dot" style={{ background: '#6e4ef2' }} />
                      <div className="w-2 h-2 rounded-full typing-dot" style={{ background: '#00d4ff' }} />
                    </div>
                    <span className="text-xs text-gray-500 ml-1">Nukeno is thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} className="h-4" />
          </>
        )}
      </div>

      {/* Fixed input bar — OUTSIDE the scroll container */}
      <div
        className="flex-shrink-0 p-4 border-t backdrop-blur-sm"
        style={{ borderColor: 'rgba(30,36,71,0.5)', background: 'rgba(11,13,26,0.85)' }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end gap-2">
            <VoiceInput
              onTranscript={(text) => setInput(text)}
              onEnd={(finalText) => handleSend(finalText)}
              disabled={isLoading}
            />

            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message or click the mic..."
                className="w-full px-4 py-3 rounded-xl text-white text-sm resize-none focus:outline-none transition-all placeholder-gray-600"
                style={{
                  background: 'rgba(19,22,43,0.8)',
                  border: `1px solid ${input ? 'rgba(110,78,242,0.4)' : 'rgba(30,36,71,0.8)'}`,
                  minHeight: '48px',
                  maxHeight: '120px',
                  boxShadow: input ? '0 0 0 1px rgba(200,75,255,0.1)' : 'none'
                }}
                rows="1"
                disabled={isLoading}
              />
            </div>

            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="p-3 rounded-xl transition-all transform hover:scale-105 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #c84bff, #6e4ef2, #00d4ff)',
                boxShadow: '0 4px 15px rgba(200,75,255,0.25)'
              }}
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>

            {isSpeaking && (
              <button
                onClick={stopSpeaking}
                className="p-3 rounded-xl transition-all flex-shrink-0"
                style={{
                  background: 'rgba(200,75,255,0.08)',
                  border: '1px solid rgba(200,75,255,0.25)',
                  animation: 'neon-pulse 2s ease-in-out infinite'
                }}
                title="Stop speaking"
              >
                <div className="flex gap-0.5 items-center h-5">
                  <div className="w-1 rounded-full animate-pulse" style={{ height: '60%', background: '#c84bff' }} />
                  <div className="w-1 rounded-full animate-pulse" style={{ height: '100%', background: '#6e4ef2', animationDelay: '0.1s' }} />
                  <div className="w-1 rounded-full animate-pulse" style={{ height: '40%', background: '#00d4ff', animationDelay: '0.2s' }} />
                </div>
              </button>
            )}
          </div>

          <p className="text-xs text-gray-700 mt-2 text-center">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
}

export default ChatUI
