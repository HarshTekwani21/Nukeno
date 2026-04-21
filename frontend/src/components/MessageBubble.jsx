import React from 'react'

const MessageBubble = ({ message, isUser, timestamp, status }) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'sending':
        return (
          <svg className="w-3 h-3 animate-spin text-gray-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'sent':
      case 'received':
        return (
          <svg className="w-3 h-3" style={{ color: '#00d4ff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 group`}>
      <div
        className="max-w-[80%] px-5 py-3.5 rounded-2xl"
        style={
          isUser
            ? {
                background: 'linear-gradient(135deg, #c84bff, #6e4ef2, #00d4ff)',
                color: '#fff',
                borderBottomRightRadius: '4px',
                boxShadow: '0 4px 20px rgba(200,75,255,0.2)',
                animation: 'slideIn 0.25s ease-out'
              }
            : {
                background: 'rgba(19, 22, 43, 0.9)',
                color: '#e8eaf6',
                borderBottomLeftRadius: '4px',
                border: '1px solid rgba(30,36,71,0.8)',
                borderLeft: '2px solid rgba(0,212,255,0.5)',
                boxShadow: '0 4px 20px rgba(0,212,255,0.06)',
                backdropFilter: 'blur(8px)',
                animation: 'slideIn 0.25s ease-out'
              }
        }
      >
        <div className="flex items-start gap-3">
          {!isUser && (
            <div
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden"
              style={{ background: 'rgba(110,78,242,0.2)', border: '1px solid rgba(110,78,242,0.3)' }}
            >
              <img src="/NukenoLogoi.png" alt="N" className="w-5 h-5 object-contain" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
              {message}
            </p>

            <div className={`flex items-center gap-2 mt-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {timestamp && (
                <span className="text-xs opacity-50">{timestamp}</span>
              )}
              {isUser && status && (
                <div className="opacity-50 group-hover:opacity-100 transition-opacity">
                  {getStatusIcon()}
                </div>
              )}
            </div>
          </div>

          {isUser && (
            <div
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.15)' }}
            >
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
              </svg>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}

export default MessageBubble
