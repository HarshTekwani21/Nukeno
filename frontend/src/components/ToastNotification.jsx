import React, { useEffect, useState } from 'react'

const TOAST_DURATION = 8000

const Toast = ({ notification, onDismiss }) => {
  const [exiting, setExiting] = useState(false)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    if (hovered) return
    const timer = setTimeout(() => {
      setExiting(true)
      setTimeout(() => onDismiss(notification.id), 300)
    }, TOAST_DURATION)
    return () => clearTimeout(timer)
  }, [hovered, notification.id, onDismiss])

  const isOverdue = notification.type === 'overdue'

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl shadow-2xl w-80 cursor-pointer transition-all duration-300 ${
        exiting ? 'animate-slide-out-right' : 'animate-slide-in-right'
      }`}
      style={{
        background: 'rgba(19, 22, 43, 0.92)',
        borderColor: isOverdue ? 'rgba(217, 75, 255, 0.35)' : 'rgba(0, 212, 255, 0.3)',
        boxShadow: isOverdue
          ? '0 8px 32px rgba(217,75,255,0.15), 0 0 0 1px rgba(217,75,255,0.1)'
          : '0 8px 32px rgba(0,212,255,0.12), 0 0 0 1px rgba(0,212,255,0.08)'
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => {
        setExiting(true)
        setTimeout(() => onDismiss(notification.id), 300)
      }}
    >
      <div
        className="flex-shrink-0 w-1.5 self-stretch rounded-full"
        style={{ background: isOverdue ? '#d94bff' : '#00d4ff' }}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: isOverdue ? '#d94bff' : '#00d4ff' }}
          >
            {isOverdue ? '⚠ Overdue' : '⏰ Due Today'}
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded-full"
            style={{
              background: notification.priority === 'high'
                ? 'rgba(239,68,68,0.2)'
                : notification.priority === 'medium'
                ? 'rgba(234,179,8,0.2)'
                : 'rgba(34,197,94,0.2)',
              color: notification.priority === 'high' ? '#f87171'
                : notification.priority === 'medium' ? '#fbbf24' : '#4ade80'
            }}
          >
            {notification.priority}
          </span>
        </div>
        <p className="text-sm text-white font-medium truncate">{notification.title}</p>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation()
          setExiting(true)
          setTimeout(() => onDismiss(notification.id), 300)
        }}
        className="flex-shrink-0 text-gray-600 hover:text-gray-300 transition-colors mt-0.5"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

const ToastNotification = ({ notifications, onDismiss }) => {
  if (!notifications || notifications.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {notifications.slice(0, 3).map((notif, idx) => (
        <div
          key={notif.id}
          className="pointer-events-auto"
          style={{ transform: `translateY(${idx * 2}px)`, opacity: 1 - idx * 0.08 }}
        >
          <Toast notification={notif} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  )
}

export default ToastNotification
