import React, { useState, useRef, useEffect } from 'react'

const VoiceButton = ({ onTranscription, disabled }) => {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)

  const mediaRecorderRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const animationFrameRef = useRef(null)
  const timerRef = useRef(null)
  const chunksRef = useRef([])

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const updateAudioLevel = () => {
    if (!analyserRef.current) return
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)
    setAudioLevel(dataArray.reduce((a, b) => a + b) / dataArray.length / 128)
    if (isRecording) animationFrameRef.current = requestAnimationFrame(updateAudioLevel)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 }
      })

      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      audioContextRef.current = audioContext
      analyserRef.current = analyser

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/wav'
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeType })
        stream.getTracks().forEach(t => t.stop())
        if (audioContextRef.current) audioContextRef.current.close()
        onTranscription(audioBlob)
      }

      mediaRecorderRef.current.start(100)
      setIsRecording(true)
      setRecordingTime(0)
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000)
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel)
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        alert('Microphone access denied. Enable it in browser settings.')
      } else {
        alert('Failed to access microphone.')
      }
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      setAudioLevel(0)
    }
  }

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <div className="relative">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled}
        className="relative p-4 rounded-full transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed"
        style={
          isRecording
            ? {
                background: 'linear-gradient(135deg, #d94bff, #c84bff)',
                boxShadow: '0 4px 20px rgba(217,75,255,0.4)',
                animation: 'neon-pulse 1.5s ease-in-out infinite'
              }
            : {
                background: 'linear-gradient(135deg, #c84bff, #6e4ef2, #00d4ff)',
                boxShadow: '0 4px 15px rgba(200,75,255,0.25)'
              }
        }
      >
        {isRecording ? (
          <div className="relative">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
            <div
              className="absolute inset-0 rounded-full opacity-30"
              style={{
                background: '#d94bff',
                transform: `scale(${1 + audioLevel * 0.6})`,
                transition: 'transform 0.1s',
                animation: 'recording-pulse 1s ease-out infinite'
              }}
            />
          </div>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>

      {isRecording && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 flex flex-col items-center">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border"
            style={{ background: 'rgba(217,75,255,0.1)', borderColor: 'rgba(217,75,255,0.3)' }}
          >
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#d94bff' }} />
            <span className="text-xs font-medium" style={{ color: '#d94bff' }}>
              {formatTime(recordingTime)}
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-1">Click to stop</p>
        </div>
      )}
    </div>
  )
}

export default VoiceButton
