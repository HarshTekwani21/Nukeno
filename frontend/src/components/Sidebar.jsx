import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'

const Sidebar = ({ activeTab, setActiveTab, onTaskSelect }) => {
  const [tasks, setTasks] = useState([])
  const [notes, setNotes] = useState([])
  const [showNewTask, setShowNewTask] = useState(false)
  const [showNewNote, setShowNewNote] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', priority: 'medium', deadline: '' })
  const [newNote, setNewNote] = useState({ title: '', content: '' })
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const [tasksData, notesData] = await Promise.all([
        api.getTasks(),
        api.getNotes()
      ])
      setTasks(tasksData.tasks || [])
      setNotes(notesData.notes || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) return
    
    try {
      await api.createTask(newTask)
      setNewTask({ title: '', priority: 'medium', deadline: '' })
      setShowNewTask(false)
      loadData()
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  const handleCreateNote = async () => {
    if (!newNote.title.trim()) return
    
    try {
      await api.createNote(newNote)
      setNewNote({ title: '', content: '' })
      setShowNewNote(false)
      loadData()
    } catch (error) {
      console.error('Error creating note:', error)
    }
  }

  const handleDeleteTask = async (taskId, e) => {
    e.stopPropagation()
    try {
      await api.deleteTask(taskId)
      loadData()
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const handleDeleteNote = async (noteId) => {
    try {
      await api.deleteNote(noteId)
      loadData()
    } catch (error) {
      console.error('Error deleting note:', error)
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-gradient-to-r from-red-500 to-red-600'
      case 'medium': return 'bg-gradient-to-r from-yellow-500 to-orange-500'
      case 'low': return 'bg-gradient-to-r from-green-500 to-emerald-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusBadge = (task) => {
    if (!task.deadline) return null
    
    try {
      const deadline = new Date(task.deadline)
      const now = new Date()
      const diff = deadline - now
      
      if (diff < 0) {
        return <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full">Overdue</span>
      }
      if (diff < 86400000) {
        return <span className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-full">Today</span>
      }
    } catch {}
    
    return null
  }

  const groupedTasks = {
    high: tasks.filter(t => t.priority === 'high' && !t.completed),
    medium: tasks.filter(t => t.priority === 'medium' && !t.completed),
    low: tasks.filter(t => t.priority === 'low' && !t.completed),
    completed: tasks.filter(t => t.completed)
  }

  return (
    <div className="w-80 bg-gradient-to-b from-nukeno-gray/80 to-gray-900/80 backdrop-blur-xl border-r border-gray-800/50 flex flex-col h-full">
      <div className="p-5 border-b border-gray-800/50">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/30">
            <span className="text-white font-bold text-xl">N</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Nukeno</h1>
            <p className="text-xs text-gray-500">Your AI Assistant</p>
          </div>
        </div>
        
        <div className="flex gap-2 bg-gray-800/50 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'chat'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            💬 Chat
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'tasks'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            ✅ Tasks
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-xl p-4 border border-indigo-500/20">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-indigo-300 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Tasks
              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full text-xs">
                {tasks.filter(t => !t.completed).length}
              </span>
            </h2>
            <button
              onClick={() => setShowNewTask(!showNewTask)}
              className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors"
            >
              + New
            </button>
          </div>

          {showNewTask && (
            <div className="mb-4 p-3 bg-gray-800/50 rounded-lg space-y-3 animate-fadeIn">
              <input
                type="text"
                placeholder="What needs to be done?"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700/50 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                autoFocus
              />
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700/50 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="high">🔴 High Priority</option>
                <option value="medium">🟡 Medium Priority</option>
                <option value="low">🟢 Low Priority</option>
              </select>
              <input
                type="datetime-local"
                value={newTask.deadline}
                onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700/50 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateTask}
                  className="flex-1 px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-indigo-500 hover:to-purple-500 transition-all"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowNewTask(false)}
                  className="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-800/30 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : tasks.filter(t => !t.completed).length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No tasks yet</p>
          ) : (
            <div className="space-y-2">
              {groupedTasks.high.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-red-400 font-medium mb-2 uppercase tracking-wide">High Priority</p>
                  {groupedTasks.high.map(task => (
                    <TaskItem key={task.id} task={task} onDelete={handleDeleteTask} onSelect={onTaskSelect} setActiveTab={setActiveTab} getPriorityColor={getPriorityColor} getStatusBadge={getStatusBadge} />
                  ))}
                </div>
              )}
              
              {groupedTasks.medium.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-yellow-400 font-medium mb-2 uppercase tracking-wide">Medium Priority</p>
                  {groupedTasks.medium.map(task => (
                    <TaskItem key={task.id} task={task} onDelete={handleDeleteTask} onSelect={onTaskSelect} setActiveTab={setActiveTab} getPriorityColor={getPriorityColor} getStatusBadge={getStatusBadge} />
                  ))}
                </div>
              )}
              
              {groupedTasks.low.length > 0 && (
                <div>
                  <p className="text-xs text-green-400 font-medium mb-2 uppercase tracking-wide">Low Priority</p>
                  {groupedTasks.low.map(task => (
                    <TaskItem key={task.id} task={task} onDelete={handleDeleteTask} onSelect={onTaskSelect} setActiveTab={setActiveTab} getPriorityColor={getPriorityColor} getStatusBadge={getStatusBadge} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-amber-900/20 to-orange-900/20 rounded-xl p-4 border border-amber-500/20">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-amber-300 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Notes
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full text-xs">
                {notes.length}
              </span>
            </h2>
            <button
              onClick={() => setShowNewNote(!showNewNote)}
              className="text-amber-400 hover:text-amber-300 text-sm font-medium transition-colors"
            >
              + New
            </button>
          </div>

          {showNewNote && (
            <div className="mb-4 p-3 bg-gray-800/50 rounded-lg space-y-3 animate-fadeIn">
              <input
                type="text"
                placeholder="Note title..."
                value={newNote.title}
                onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700/50 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                autoFocus
              />
              <textarea
                placeholder="Note content..."
                value={newNote.content}
                onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                rows="3"
                className="w-full px-3 py-2 bg-gray-700/50 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateNote}
                  className="flex-1 px-3 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg text-sm font-medium hover:from-amber-500 hover:to-orange-500 transition-all"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowNewNote(false)}
                  className="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {notes.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No notes yet</p>
            ) : (
              notes.slice(-5).reverse().map(note => (
                <div
                  key={note.id}
                  className="p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-all group cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm text-white font-medium mb-1 truncate">{note.title}</h3>
                      <p className="text-xs text-gray-500 line-clamp-2">{note.content}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteNote(note.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all ml-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
      `}</style>
    </div>
  )
}

const TaskItem = ({ task, onDelete, onSelect, setActiveTab, getPriorityColor, getStatusBadge }) => (
  <div
    onClick={() => {
      onSelect(task.title)
      setActiveTab('chat')
    }}
    className="p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-all group cursor-pointer mb-2 last:mb-0"
  >
    <div className="flex items-start gap-3">
      <div className={`w-2 h-2 rounded-full mt-1.5 ${getPriorityColor(task.priority).replace('bg-gradient-to-r from-', 'bg-').split(' ')[0]}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate">{task.title}</p>
        {task.deadline && (
          <p className="text-xs text-gray-500 mt-1">
            {new Date(task.deadline).toLocaleDateString()}
          </p>
        )}
        {getStatusBadge(task) && (
          <div className="mt-1">{getStatusBadge(task)}</div>
        )}
      </div>
      <button
        onClick={(e) => onDelete(task.id, e)}
        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
)

export default Sidebar
