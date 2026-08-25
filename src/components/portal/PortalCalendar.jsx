/**
 * PortalCalendar — Read-only monthly calendar for the public client portal.
 * Shows commission deadlines on a CSS Grid calendar.
 * Uses shared calendar utilities from src/utils/calendarUtils.js.
 */
import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { usePortalContext } from './PortalDataProvider.jsx'
import { supabase, isSupabaseReady } from '../../lib/supabase.js'
import {
  getCalendarDays,
  isSameDay,
  parseDeadline,
  DAYS_ES,
  MONTHS_ES,
} from '../../utils/calendarUtils.js'

/** Priority → color mapping */
const PRIORITY_COLORS = {
  ok: '#22C55E',
  low: '#60A5FA',
  medium: '#F59E0B',
  high: '#F97316',
  urgent: '#EF4444',
}

export default function PortalCalendar() {
  const { artistId } = usePortalContext()
  const today = new Date()

  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [selectedEvents, setSelectedEvents] = useState([])

  // Fetch tasks with deadlines
  const fetchTasks = useCallback(async () => {
    if (!artistId || !isSupabaseReady()) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: queryError } = await supabase
        .from('tasks')
        .select('id, text, client, deadline, priority, stage')
        .eq('user_id', artistId)
        .not('deadline', 'is', null)
        .eq('archived', false)

      if (queryError) {
        setError(queryError)
      } else {
        setTasks(data || [])
      }
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [artistId])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Generate calendar grid for the current month
  const days = useMemo(() => getCalendarDays(year, month), [year, month])

  // Build events map: "YYYY-M-D" → event[]
  const eventMap = useMemo(() => {
    const map = {}
    tasks.forEach(task => {
      const d = parseDeadline(task.deadline)
      if (!d) return
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      const color = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.ok
      if (!map[key]) map[key] = []
      map[key].push({
        id: task.id,
        title: task.text || task.client || 'Comisión',
        client: task.client || '',
        color,
        priority: task.priority || 'ok',
        stage: task.stage || '',
        deadline: task.deadline,
      })
    })
    return map
  }, [tasks])

  function getEvents(date) {
    if (!date) return []
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    return eventMap[key] || []
  }

  function prevMonth() {
    if (month === 0) {
      setYear(y => y - 1)
      setMonth(11)
    } else {
      setMonth(m => m - 1)
    }
  }

  function nextMonth() {
    if (month === 11) {
      setYear(y => y + 1)
      setMonth(0)
    } else {
      setMonth(m => m + 1)
    }
  }

  function goToToday() {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
  }

  function handleDayClick(date, events) {
    if (events.length > 0) {
      setSelectedDay(date)
      setSelectedEvents(events)
    }
  }

  function closeModal() {
    setSelectedDay(null)
    setSelectedEvents([])
  }

  // Close modal on Escape
  useEffect(() => {
    if (!selectedDay) return
    function handleKey(e) {
      if (e.key === 'Escape') closeModal()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [selectedDay])

  // Loading state
  if (loading) {
    return (
      <div className="portal-empty-state">
        <div className="mini-spinner" style={{ width: 24, height: 24 }} />
        <p className="portal-empty-state-text">Cargando calendario...</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="portal-empty-state">
        <span className="portal-empty-state-icon">⚠️</span>
        <p className="portal-empty-state-text">Error al cargar el calendario.</p>
        <button
          onClick={fetchTasks}
          style={{
            padding: '0.4rem 1rem',
            background: 'var(--green, #22C55E)',
            color: '#000',
            border: 'none',
            borderRadius: 'var(--radius-sm, 6px)',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 600,
          }}
        >
          Reintentar
        </button>
      </div>
    )
  }

  // Empty state — no deadlines at all
  if (tasks.length === 0) {
    return (
      <div className="portal-empty-state">
        <span className="portal-empty-state-icon">📅</span>
        <p className="portal-empty-state-text">No hay deadlines programados.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Month navigation */}
      <div className="portal-calendar-nav">
        <button
          onClick={prevMonth}
          aria-label="Mes anterior"
          style={navBtnStyle}
        >
          ‹
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 className="portal-calendar-title">
            {MONTHS_ES[month]} {year}
          </h2>
          <button
            onClick={goToToday}
            style={todayBtnStyle}
          >
            Hoy
          </button>
        </div>

        <button
          onClick={nextMonth}
          aria-label="Mes siguiente"
          style={navBtnStyle}
        >
          ›
        </button>
      </div>

      {/* Calendar grid */}
      <div className="portal-calendar-grid">
        {/* Day name headers */}
        {DAYS_ES.map(dayName => (
          <div key={dayName} className="portal-calendar-day-name">
            {dayName}
          </div>
        ))}

        {/* Day cells */}
        {days.map((date, i) => {
          const events = getEvents(date)
          const isToday = date ? isSameDay(date, today) : false
          const hasEvents = events.length > 0

          if (!date) {
            return <div key={i} className="portal-calendar-cell portal-calendar-cell--other-month" />
          }

          return (
            <div
              key={i}
              className={`portal-calendar-cell${isToday ? ' portal-calendar-cell--today' : ''}`}
              onClick={() => handleDayClick(date, events)}
              style={{ cursor: hasEvents ? 'pointer' : 'default' }}
              role={hasEvents ? 'button' : undefined}
              aria-label={hasEvents ? `${date.getDate()} ${MONTHS_ES[month]} — ${events.length} deadline${events.length > 1 ? 's' : ''}` : undefined}
            >
              <span className="portal-calendar-cell-number">
                {date.getDate()}
              </span>
              {events.slice(0, 3).map(ev => (
                <span
                  key={ev.id}
                  className="portal-calendar-cell-event"
                  style={{ '--event-color': ev.color }}
                  title={ev.title}
                >
                  {ev.title}
                </span>
              ))}
              {events.length > 3 && (
                <span
                  className="portal-calendar-cell-event"
                  style={{ '--event-color': 'var(--text-muted)', fontSize: '0.58rem' }}
                >
                  +{events.length - 3} más
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Day detail modal */}
      {selectedDay && selectedEvents.length > 0 && (
        <div
          className="portal-lightbox"
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
          role="dialog"
          aria-modal="true"
          aria-label={`Deadlines del ${selectedDay.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}`}
        >
          <div className="portal-lightbox-backdrop" onClick={closeModal} />
          <div style={modalPanelStyle}>
            {/* Modal header */}
            <div style={modalHeaderStyle}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
                {selectedDay.toLocaleDateString('es', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </h3>
              <button
                onClick={closeModal}
                aria-label="Cerrar"
                style={modalCloseBtnStyle}
              >
                ×
              </button>
            </div>

            {/* Modal body — list of events */}
            <div style={modalBodyStyle}>
              {selectedEvents.map(ev => (
                <div key={ev.id} style={{ ...eventCardStyle, borderLeftColor: ev.color }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: 'var(--text, #e8e8ec)' }}>
                    {ev.title}
                  </p>
                  {ev.client && (
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.72rem', color: 'var(--text-muted, #888896)' }}>
                      👤 {ev.client}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                    <span
                      className="portal-pill"
                      style={{ '--pill-color': ev.color }}
                    >
                      {ev.priority}
                    </span>
                    {ev.stage && (
                      <span
                        className="portal-pill"
                        style={{ '--pill-color': 'var(--text-muted)' }}
                      >
                        {ev.stage}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// --- Inline styles for elements without CSS class equivalents ---

const navBtnStyle = {
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--surface, #1a1a1e)',
  border: '1px solid var(--border, #2e2e36)',
  borderRadius: 'var(--radius-sm, 6px)',
  color: 'var(--text, #e8e8ec)',
  fontSize: '1.1rem',
  cursor: 'pointer',
  transition: 'background 130ms ease',
}

const todayBtnStyle = {
  padding: '0.3rem 0.65rem',
  background: 'var(--surface, #1a1a1e)',
  border: '1px solid var(--border, #2e2e36)',
  borderRadius: 'var(--radius-sm, 6px)',
  color: 'var(--text-muted, #888896)',
  fontSize: '0.72rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background 130ms ease, color 130ms ease',
}

const modalPanelStyle = {
  position: 'relative',
  zIndex: 10001,
  background: 'var(--surface, #1a1a1e)',
  border: '1px solid var(--border, #2e2e36)',
  borderRadius: 'var(--radius, 12px)',
  width: '100%',
  maxWidth: '420px',
  maxHeight: '80vh',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
}

const modalHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '1rem 1.25rem',
  borderBottom: '1px solid var(--border, #2e2e36)',
}

const modalCloseBtnStyle = {
  width: '28px',
  height: '28px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--surface2, #222227)',
  border: '1px solid var(--border, #2e2e36)',
  borderRadius: '50%',
  color: 'var(--text, #e8e8ec)',
  fontSize: '1rem',
  cursor: 'pointer',
  transition: 'background 130ms ease',
}

const modalBodyStyle = {
  padding: '1rem 1.25rem',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
}

const eventCardStyle = {
  background: 'var(--surface2, #222227)',
  borderRadius: 'var(--radius-sm, 6px)',
  padding: '0.75rem 1rem',
  borderLeft: '3px solid var(--green, #22C55E)',
}
