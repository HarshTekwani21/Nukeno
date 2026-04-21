import React, { useState } from 'react'
import Sidebar from './components/Sidebar'
import ChatUI from './components/ChatUI'
import ToastNotification from './components/ToastNotification'
import { useNotifications } from './hooks/useNotifications'

function App() {
  const [activeTab, setActiveTab] = useState('chat')
  const [selectedTask, setSelectedTask] = useState(null)
  const { notifications, dismiss } = useNotifications()

  return (
    <div className="flex h-screen overflow-hidden bg-nukeno-navy">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onTaskSelect={(title) => setSelectedTask(title)}
        notificationCount={notifications.length}
      />
      <ChatUI selectedTask={selectedTask} />
      <ToastNotification notifications={notifications} onDismiss={dismiss} />
    </div>
  )
}

export default App
