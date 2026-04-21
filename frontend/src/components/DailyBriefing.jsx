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
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="mb-5 p-4 rounded-xl border animate-pulse"
        style={{ background: 'rgba(19,22,43,0.4)', borderColor: 'rgba(30,36,71,0.4)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg" style={{ background: 'rgba(30,36,71,0.6)' }} />
          <div className="h-3 rounded w-32" style={{ background: 'rgba(30,36,71,0.6)' }} />
        </div>
      </div>
    )
  }

  if (!summary) return null

  const { summary: sum } = summary
  const hasUrgent = (sum?.overdue_count || 0) > 0 || (sum?.upcoming_count || 0) > 0

  return (
    <div
      className="mb-5 rounded-xl border transition-all duration-300"
      style={{
        background: hasUrgent
          ? 'linear-gradient(135deg, rgba(217,75,255,0.06), rgba(200,75,255,0.03))'
          : 'linear-gradient(135deg, rgba(110,78,242,0.06), rgba(0,212,255,0.03))',
        borderColor: hasUrgent ? 'rgba(217,75,255,0.25)' : 'rgba(110,78,242,0.2)',
        boxShadow: hasUrgent ? '0 0 20px rgba(217,75,255,0.08)' : undefined
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/2 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={
              hasUrgent
                ? { background: 'linear-gradient(135deg, #d94bff, #c84bff)', boxShadow: '0 4px 15px rgba(217,75,255,0.3)' }
                : { background: 'linear-gradient(135deg, #6e4ef2, #00d4ff)', boxShadow: '0 4px 15px rgba(110,78,242,0.2)' }
            }
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold" style={{ color: hasUrgent ? '#d94bff' : '#a78bfa' }}>
              Daily Briefing
            </h3>
            <p className="text-xs text-gray-600 mt-0.5">
              {sum?.total_tasks || 0} tasks · {sum?.notes_count || 0} notes
            </p>
          </div>

          {hasUrgent && (
            <div
              className="px-2 py-0.5 rounded-full text-xs font-bold animate-neon-pulse"
              style={{ background: 'rgba(217,75,255,0.15)', color: '#d94bff', border: '1px solid rgba(217,75,255,0.3)' }}
            >
              {(sum?.overdue_count || 0) + (sum?.upcoming_count || 0)} urgent
            </div>
          )}
        </div>

        <svg
          className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {sum?.overdue_count > 0 && (
            <div
              className="flex items-center gap-3 p-3 rounded-lg border"
              style={{ background: 'rgba(217,75,255,0.06)', borderColor: 'rgba(217,75,255,0.2)' }}
            >
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-neon-pulse"
                style={{ background: '#d94bff' }} />
              <div>
                <p className="text-xs font-medium" style={{ color: '#d94bff' }}>
                  {sum.overdue_count} overdue task{sum.overdue_count > 1 ? 's' : ''}
                </p>
                {sum.overdue_tasks?.length > 0 && (
                  <p className="text-xs text-gray-600 mt-0.5">
                    {sum.overdue_tasks.map(t => t.title).join(', ')}
                  </p>
                )}
              </div>
            </div>
          )}

          {sum?.high_priority_count > 0 && (
            <div
              className="flex items-center gap-3 p-3 rounded-lg border"
              style={{ background: 'rgba(200,75,255,0.05)', borderColor: 'rgba(200,75,255,0.15)' }}
            >
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: '#c84bff' }} />
              <p className="text-xs font-medium" style={{ color: '#c84bff' }}>
                {sum.high_priority_count} high priority task{sum.high_priority_count > 1 ? 's' : ''}
              </p>
            </div>
          )}

          {sum?.upcoming_count > 0 && (
            <div
              className="flex items-center gap-3 p-3 rounded-lg border"
              style={{ background: 'rgba(0,212,255,0.05)', borderColor: 'rgba(0,212,255,0.15)' }}
            >
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: '#00d4ff' }} />
              <div>
                <p className="text-xs font-medium" style={{ color: '#00d4ff' }}>
                  {sum.upcoming_count} task{sum.upcoming_count > 1 ? 's' : ''} due today
                </p>
                {sum.upcoming_tasks?.length > 0 && (
                  <p className="text-xs text-gray-600 mt-0.5">
                    {sum.upcoming_tasks.map(t => t.title).join(', ')}
                  </p>
                )}
              </div>
            </div>
          )}

          {sum?.total_tasks === 0 && sum?.notes_count === 0 && (
            <div className="text-center py-4">
              <p className="text-xs text-gray-600">No tasks or notes yet.</p>
              <p className="text-xs text-gray-700 mt-1">Start by asking Nukeno something!</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default DailyBriefing
