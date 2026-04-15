import React, { useState } from 'react'
import Sidebar from './components/Sidebar'
import ChatUI from './components/ChatUI'

function App() {
  const [activeTab, setActiveTab] = useState('chat')
  const [selectedTask, setSelectedTask] = useState(null)

  const handleTaskSelect = (taskTitle) => {
    setSelectedTask(taskTitle)
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        onTaskSelect={handleTaskSelect}
      />
      <ChatUI />
    </div>
  )
}

export default App
