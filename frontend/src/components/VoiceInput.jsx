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
    if (!SpeechRecognition) { setSpeechSupported(false); return }

    recognitionRef.current = new SpeechRecognition()
    recognitionRef.current.continuous = true
    recognitionRef.current.interimResults = true
    recognitionRef.current.lang = 'en-US'

    recognitionRef.current.onstart = () => { setIsListening(true); setError(null) }

    recognitionRef.current.onresult = (event) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) final += t
        else interim += t
      }
      if (final) { finalTranscriptRef.current += final; onTranscript(final) }
      setInterimTranscript(interim)
    }

    recognitionRef.current.onerror = (event) => {
      if (event.error === 'not-allowed') setError('Mic denied')
      else if (event.error === 'no-speech') setError('No speech')
      else setError(`Error: ${event.error}`)
    }

    recognitionRef.current.onend = () => {
      setIsListening(false)
      setInterimTranscript('')
      if (finalTranscriptRef.current) {
        onEnd(finalTranscriptRef.current)
        finalTranscriptRef.current = ''
      }
    }

    return () => { if (recognitionRef.current) recognitionRef.current.stop() }
  }, [onTranscript, onEnd])

  const startListening = useCallback(() => {
    setError(null)
    finalTranscriptRef.current = ''
    if (recognitionRef.current && !isListening) {
      try { recognitionRef.current.start() } catch { /* already started */ }
    }
  }, [isListening])

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) recognitionRef.current.stop()
  }, [isListening])

  if (!speechSupported) {
    return (
      <div
        className="p-4 rounded-full"
        style={{ background: 'rgba(30,36,71,0.5)', color: '#4b5563' }}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={isListening ? stopListening : startListening}
        disabled={disabled || !speechSupported}
        className="relative p-4 rounded-full transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed"
        style={
          isListening
            ? {
                background: 'linear-gradient(135deg, #c84bff, #6e4ef2)',
                boxShadow: '0 4px 20px rgba(200,75,255,0.4)',
                animation: 'neon-pulse 1.5s ease-in-out infinite'
              }
            : {
                background: 'rgba(19,22,43,0.8)',
                border: '1px solid rgba(30,36,71,0.8)',
                boxShadow: 'none'
              }
        }
      >
        {isListening ? (
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-4 rounded-full animate-pulse" style={{ background: '#fff' }} />
            <div className="w-1.5 h-4 rounded-full animate-pulse" style={{ background: '#fff', animationDelay: '0.15s' }} />
            <div className="w-1.5 h-4 rounded-full animate-pulse" style={{ background: '#fff', animationDelay: '0.3s' }} />
          </div>
        ) : (
          <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        )}
      </button>

      {isListening && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-10">
          <div
            className="px-4 py-2 rounded-full border text-xs text-center min-w-[180px] backdrop-blur"
            style={{ background: 'rgba(200,75,255,0.1)', borderColor: 'rgba(200,75,255,0.3)', color: '#c84bff' }}
          >
            {interimTranscript || 'Listening...'}
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2">
          <div
            className="px-3 py-1 rounded-full border text-xs backdrop-blur"
            style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)', color: '#f87171' }}
          >
            {error}
          </div>
        </div>
      )}
    </div>
  )
}

export default VoiceInput
