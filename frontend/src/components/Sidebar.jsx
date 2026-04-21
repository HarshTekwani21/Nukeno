import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'

const Sidebar = ({ activeTab, setActiveTab, onTaskSelect, notificationCount = 0, currentUser, onLogout }) => {
  const [tasks, setTasks] = useState([])
  const [notes, setNotes] = useState([])
  const [showNewTask, setShowNewTask] = useState(false)
  const [showNewNote, setShowNewNote] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', priority: 'medium', deadline: '' })
  const [newNote, setNewNote] = useState({ title: '', content: '' })
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const [tasksData, notesData] = await Promise.all([api.getTasks(), api.getNotes()])
      setTasks(tasksData.tasks || [])
      setNotes(notesData.notes || [])
    } catch {
      // silent fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) return
    try {
      await api.createTask(newTask)
      setNewTask({ title: '', priority: 'medium', deadline: '' })
      setShowNewTask(false)
      loadData()
    } catch { /* silent */ }
  }

  const handleCreateNote = async () => {
    if (!newNote.title.trim()) return
    try {
      await api.createNote(newNote)
      setNewNote({ title: '', content: '' })
      setShowNewNote(false)
      loadData()
    } catch { /* silent */ }
  }

  const handleDeleteTask = async (taskId, e) => {
    e.stopPropagation()
    try { await api.deleteTask(taskId); loadData() } catch { /* silent */ }
  }

  const handleDeleteNote = async (noteId) => {
    try { await api.deleteNote(noteId); loadData() } catch { /* silent */ }
  }

  const getPriorityDot = (priority) => {
    if (priority === 'high') return '#d94bff'
    if (priority === 'medium') return '#6e4ef2'
    return '#00d4ff'
  }

  const getStatusBadge = (task) => {
    if (!task.deadline) return null
    try {
      const diff = new Date(task.deadline) - new Date()
      if (diff < 0) return (
        <span className="text-xs px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(217,75,255,0.15)', color: '#d94bff' }}>Overdue</span>
      )
      if (diff < 86400000) return (
        <span className="text-xs px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(0,212,255,0.12)', color: '#00d4ff' }}>Today</span>
      )
    } catch { /* skip */ }
    return null
  }

  const groupedTasks = {
    high: tasks.filter(t => t.priority === 'high' && !t.completed),
    medium: tasks.filter(t => t.priority === 'medium' && !t.completed),
    low: tasks.filter(t => t.priority === 'low' && !t.completed),
  }

  const inputStyle = {
    background: 'rgba(11,13,26,0.7)',
    border: '1px solid rgba(30,36,71,0.8)',
    color: '#e8eaf6'
  }

  return (
    <div
      className="w-72 flex flex-col h-full border-r backdrop-blur-xl"
      style={{ background: 'linear-gradient(180deg, #13162b 0%, #0f1224 100%)', borderColor: 'rgba(30,36,71,0.7)' }}
    >
      {/* Logo header */}
      <div className="p-5 border-b" style={{ borderColor: 'rgba(30,36,71,0.6)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <img src="/NukenoLogoi.png" alt="Nukeno" className="w-11 h-11 object-contain" />
            {notificationCount > 0 && (
              <div
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ background: '#d94bff', fontSize: '9px' }}
              >
                {notificationCount > 9 ? '9+' : notificationCount}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-lg font-bold gradient-text">Nukeno</h1>
            <p className="text-xs text-gray-600">Your AI Assistant</p>
          </div>
        </div>

        <div
          className="flex gap-1 p-1 rounded-xl"
          style={{ background: 'rgba(11,13,26,0.6)', border: '1px solid rgba(30,36,71,0.5)' }}
        >
          {[
            { id: 'chat', label: '💬 Chat' },
            { id: 'tasks', label: '✅ Tasks' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={
                activeTab === tab.id
                  ? { background: 'linear-gradient(135deg, #c84bff, #6e4ef2)', color: '#fff', boxShadow: '0 2px 10px rgba(200,75,255,0.2)' }
                  : { color: '#6b7280' }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-container">
        {/* Tasks panel */}
        <div
          className="rounded-xl p-4 border"
          style={{ background: 'rgba(200,75,255,0.04)', borderColor: 'rgba(200,75,255,0.15)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2"
              style={{ color: '#c84bff' }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Tasks
              <span className="px-1.5 py-0.5 rounded-full text-xs"
                style={{ background: 'rgba(200,75,255,0.15)', color: '#c84bff' }}>
                {tasks.filter(t => !t.completed).length}
              </span>
            </h2>
            <button
              onClick={() => setShowNewTask(!showNewTask)}
              className="text-xs font-medium transition-colors hover:opacity-80"
              style={{ color: '#c84bff' }}
            >
              + New
            </button>
          </div>

          {showNewTask && (
            <div
              className="mb-4 p-3 rounded-xl space-y-2"
              style={{ background: 'rgba(11,13,26,0.6)', border: '1px solid rgba(30,36,71,0.8)', animation: 'fadeInUp 0.2s ease-out' }}
            >
              <input
                type="text"
                placeholder="What needs to be done?"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateTask()}
                className="w-full px-3 py-2 rounded-lg text-sm placeholder-gray-600 focus:outline-none"
                style={{ ...inputStyle }}
                autoFocus
              />
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                style={{ ...inputStyle }}
              >
                <option value="high">🔴 High Priority</option>
                <option value="medium">🟡 Medium Priority</option>
                <option value="low">🟢 Low Priority</option>
              </select>
              <input
                type="datetime-local"
                value={newTask.deadline}
                onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                style={{ ...inputStyle, colorScheme: 'dark' }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateTask}
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-medium text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #c84bff, #6e4ef2)' }}
                >
                  Save
                </button>
                <button
                  onClick={() => setShowNewTask(false)}
                  className="px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
                  style={{ background: 'rgba(30,36,71,0.5)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 rounded-lg animate-pulse"
                  style={{ background: 'rgba(30,36,71,0.4)' }} />
              ))}
            </div>
          ) : tasks.filter(t => !t.completed).length === 0 ? (
            <p className="text-xs text-gray-600 text-center py-4">No tasks yet</p>
          ) : (
            <div className="space-y-3">
              {[
                { key: 'high', label: 'High Priority', color: '#d94bff' },
                { key: 'medium', label: 'Medium Priority', color: '#6e4ef2' },
                { key: 'low', label: 'Low Priority', color: '#00d4ff' },
              ].map(({ key, label, color }) =>
                groupedTasks[key].length > 0 ? (
                  <div key={key}>
                    <p className="text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color }}>
                      {label}
                    </p>
                    {groupedTasks[key].map(task => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        dotColor={color}
                        onDelete={handleDeleteTask}
                        onSelect={() => { onTaskSelect(task.title); setActiveTab('chat') }}
                        getStatusBadge={getStatusBadge}
                      />
                    ))}
                  </div>
                ) : null
              )}
            </div>
          )}
        </div>

        {/* Notes panel */}
        <div
          className="rounded-xl p-4 border"
          style={{ background: 'rgba(0,212,255,0.03)', borderColor: 'rgba(0,212,255,0.12)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2"
              style={{ color: '#00d4ff' }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Notes
              <span className="px-1.5 py-0.5 rounded-full text-xs"
                style={{ background: 'rgba(0,212,255,0.12)', color: '#00d4ff' }}>
                {notes.length}
              </span>
            </h2>
            <button
              onClick={() => setShowNewNote(!showNewNote)}
              className="text-xs font-medium transition-colors hover:opacity-80"
              style={{ color: '#00d4ff' }}
            >
              + New
            </button>
          </div>

          {showNewNote && (
            <div
              className="mb-3 p-3 rounded-xl space-y-2"
              style={{ background: 'rgba(11,13,26,0.6)', border: '1px solid rgba(30,36,71,0.8)', animation: 'fadeInUp 0.2s ease-out' }}
            >
              <input
                type="text"
                placeholder="Note title..."
                value={newNote.title}
                onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm placeholder-gray-600 focus:outline-none"
                style={{ ...inputStyle }}
                autoFocus
              />
              <textarea
                placeholder="Note content..."
                value={newNote.content}
                onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                rows="3"
                className="w-full px-3 py-2 rounded-lg text-sm placeholder-gray-600 focus:outline-none resize-none"
                style={{ ...inputStyle }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateNote}
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-medium text-white"
                  style={{ background: 'linear-gradient(135deg, #6e4ef2, #00d4ff)' }}
                >
                  Save
                </button>
                <button
                  onClick={() => setShowNewNote(false)}
                  className="px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
                  style={{ background: 'rgba(30,36,71,0.5)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {notes.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-4">No notes yet</p>
            ) : (
              notes.slice(-5).reverse().map(note => (
                <div
                  key={note.id}
                  className="p-3 rounded-lg transition-all group cursor-pointer"
                  style={{ background: 'rgba(11,13,26,0.5)', border: '1px solid rgba(30,36,71,0.4)' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,212,255,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(30,36,71,0.4)'}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs text-white font-medium mb-0.5 truncate">{note.title}</h3>
                      <p className="text-xs text-gray-600 line-clamp-2">{note.content}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all ml-2 flex-shrink-0"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* User footer */}
      {currentUser && (
        <div
          className="p-4 border-t flex items-center gap-3 flex-shrink-0"
          style={{ borderColor: 'rgba(30,36,71,0.6)' }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #c84bff, #6e4ef2)', color: '#fff' }}
          >
            {currentUser[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{currentUser}</p>
            <p className="text-xs text-gray-600">Active session</p>
          </div>
          <button
            onClick={onLogout}
            title="Sign out"
            className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

const TaskItem = ({ task, dotColor, onDelete, onSelect, getStatusBadge }) => (
  <div
    onClick={onSelect}
    className="p-2.5 rounded-lg transition-all group cursor-pointer mb-1.5 last:mb-0"
    style={{ background: 'rgba(11,13,26,0.5)', border: '1px solid rgba(30,36,71,0.4)' }}
    onMouseEnter={e => e.currentTarget.style.borderColor = `${dotColor}33`}
    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(30,36,71,0.4)'}
  >
    <div className="flex items-start gap-2.5">
      <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: dotColor }} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white font-medium truncate">{task.title}</p>
        {task.deadline && (
          <p className="text-xs text-gray-600 mt-0.5">
            {new Date(task.deadline).toLocaleDateString()}
          </p>
        )}
        {getStatusBadge(task) && (
          <div className="mt-1">{getStatusBadge(task)}</div>
        )}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(task.id, e) }}
        className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all flex-shrink-0"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
)

export default Sidebar
