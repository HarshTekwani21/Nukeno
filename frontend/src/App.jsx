import React, { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import ChatUI from './components/ChatUI'
import ToastNotification from './components/ToastNotification'
import Login from './components/Login'
import { useNotifications } from './hooks/useNotifications'

function App() {
  const [activeTab, setActiveTab] = useState('chat')
  const [selectedTask, setSelectedTask] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('nukeno_token'))
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem('nukeno_user'))
  const { notifications, dismiss } = useNotifications()

  const handleLogin = (newToken, username) => {
    setToken(newToken)
    setCurrentUser(username)
  }

  const handleLogout = () => {
    localStorage.removeItem('nukeno_token')
    localStorage.removeItem('nukeno_user')
    setToken(null)
    setCurrentUser(null)
  }

  if (!token) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-nukeno-navy">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onTaskSelect={(title) => setSelectedTask(title)}
        notificationCount={notifications.length}
        currentUser={currentUser}
        onLogout={handleLogout}
      />
      <ChatUI selectedTask={selectedTask} currentUser={currentUser} />
      <ToastNotification notifications={notifications} onDismiss={dismiss} />
    </div>
  )
}

export default App
