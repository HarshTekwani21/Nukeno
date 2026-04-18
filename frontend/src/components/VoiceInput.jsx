import React, { useState, useRef, useEffect, useCallback } from 'react'

const VoiceInput = ({ onTranscript, onEnd, disabled }) => {
  const [isListening, setIsListening] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState(null)
  const [speechSupported, setSpeechSupported] = useState(true)
  
  const recognitionRef = useRef(null)
  const finalTranscriptRef = useRef('')

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      setSpeechSupported(false)
      return
    }

    recognitionRef.current = new SpeechRecognition()
    recognitionRef.current.continuous = true
    recognitionRef.current.interimResults = true
    recognitionRef.current.lang = 'en-US'

    recognitionRef.current.onstart = () => {
      setIsListening(true)
      setError(null)
    }

    recognitionRef.current.onresult = (event) => {
      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += transcript
        } else {
          interim += transcript
        }
      }

      if (final) {
        finalTranscriptRef.current += final
        onTranscript(final)
      }

      setInterimTranscript(interim)
    }

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      if (event.error === 'not-allowed') {
        setError('Microphone access denied')
      } else if (event.error === 'no-speech') {
        setError('No speech detected')
      } else {
        setError(`Error: ${event.error}`)
      }
    }

    recognitionRef.current.onend = () => {
      setIsListening(false)
      setInterimTranscript('')
      
      if (finalTranscriptRef.current) {
        onEnd(finalTranscriptRef.current)
        finalTranscriptRef.current = ''
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [onTranscript, onEnd])

  const startListening = useCallback(() => {
    setError(null)
    finalTranscriptRef.current = ''
    
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start()
      } catch (e) {
        console.error('Failed to start recognition:', e)
      }
    }
  }, [isListening])

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }
  }, [isListening])

  const handleClick = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  if (!speechSupported) {
    return (
      <div className="p-4 rounded-full bg-gray-700 text-gray-400">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={disabled || !speechSupported}
        className={`relative p-4 rounded-full transition-all duration-300 ${
          isListening
            ? 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg shadow-green-500/50 animate-pulse'
            : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/30'
        } disabled:opacity-30 disabled:cursor-not-allowed`}
      >
        {isListening ? (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
          </div>
        ) : (
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        )}
      </button>

      {isListening && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2">
          <div className="bg-green-500/20 backdrop-blur px-4 py-2 rounded-full border border-green-500/30 text-sm text-green-400 min-w-[200px] text-center">
            {interimTranscript || "Listening..."}
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2">
          <div className="bg-red-500/20 backdrop-blur px-3 py-1 rounded-full border border-red-500/30 text-xs text-red-400">
            {error}
          </div>
        </div>
      )}
    </div>
  )
}

export default VoiceInput