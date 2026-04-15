import React, { useState, useEffect } from 'react'
import { api } from '../services/api'

const DailyBriefing = () => {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    loadSummary()
    
    const interval = setInterval(loadSummary, 60000)
    return () => clearInterval(interval)
  }, [])

  const loadSummary = async () => {
    try {
      const data = await api.getDailySummary()
      setSummary(data)
    } catch (error) {
      console.error('Failed to load summary:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="mb-6 p-5 bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-xl border border-gray-700/30 animate-pulse">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-gray-700 rounded-lg" />
          <div className="h-4 bg-gray-700 rounded w-32" />
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-700 rounded w-3/4" />
          <div className="h-3 bg-gray-700 rounded w-1/2" />
        </div>
      </div>
    )
  }

  if (!summary) return null

  const { summary: sum } = summary
  const hasUrgent = (sum?.overdue_count || 0) > 0 || (sum?.upcoming_count || 0) > 0

  return (
    <div className={`mb-6 rounded-xl border transition-all duration-300 ${
      hasUrgent 
        ? 'bg-gradient-to-br from-red-900/20 to-orange-900/20 border-red-500/30' 
        : 'bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border-indigo-500/20'
    }`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            hasUrgent 
              ? 'bg-gradient-to-br from-red-500 to-orange-500 shadow-lg shadow-red-500/30' 
              : 'bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/30'
          }`}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="text-left">
            <h3 className={`font-semibold ${hasUrgent ? 'text-red-300' : 'text-indigo-300'}`}>
              Daily Briefing
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {sum?.total_tasks || 0} tasks • {sum?.notes_count || 0} notes
            </p>
          </div>
        </div>
        
        <svg 
          className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-3">
          {sum?.overdue_count > 0 && (
            <div className="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-300">
                  {sum.overdue_count} overdue task{sum.overdue_count > 1 ? 's' : ''}
                </p>
                {sum.overdue_tasks?.length > 0 && (
                  <p className="text-xs text-red-400/70 mt-1">
                    {sum.overdue_tasks.map(t => t.title).join(', ')}
                  </p>
                )}
              </div>
            </div>
          )}

          {sum?.high_priority_count > 0 && (
            <div className="flex items-center gap-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <div className="w-2 h-2 bg-yellow-500 rounded-full" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-300">
                  {sum.high_priority_count} high priority task{sum.high_priority_count > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          )}

          {sum?.upcoming_count > 0 && (
            <div className="flex items-center gap-3 p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
              <div className="w-2 h-2 bg-orange-500 rounded-full" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-300">
                  {sum.upcoming_count} task{sum.upcoming_count > 1 ? 's' : ''} due today
                </p>
                {sum.upcoming_tasks?.length > 0 && (
                  <p className="text-xs text-orange-400/70 mt-1">
                    {sum.upcoming_tasks.map(t => t.title).join(', ')}
                  </p>
                )}
              </div>
            </div>
          )}

          {sum?.total_tasks === 0 && sum?.notes_count === 0 && (
            <div className="text-center py-6">
              <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500">No tasks or notes yet</p>
              <p className="text-xs text-gray-600 mt-1">Start by asking Nukeno something!</p>
            </div>
          )}

          {!hasUrgent && sum?.total_tasks === 0 && (
            <p className="text-sm text-gray-400 text-center py-2">
              Looking good! Add tasks or notes to get started.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default DailyBriefing
