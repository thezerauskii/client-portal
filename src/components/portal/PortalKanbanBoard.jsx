import React, { useState, useEffect, useMemo } from 'react'
import { usePortalContext } from './PortalDataProvider.jsx'
import { supabase, isSupabaseReady } from '../../lib/supabase.js'

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_SECTIONS = [
  { id: 'backlog', label: '📋 Backlog y Proyectos', color: '#7c6af7' },
  { id: 'active', label: '🎨 Comisiones en progreso', color: '#34d399' },
  { id: 'review', label: '🔍 En Revisión', color: '#fbbf24' },
  { id: 'new', label: '✨ Comisiones Nuevas', color: '#60a5fa' },
]

const PRIORITY_OPTIONS = {
  ok: { name: 'Todo en orden', color: '#22C55E' },
  low: { name: 'Prioridad baja', color: '#60A5FA' },
  medium: { name: 'Media', color: '#F59E0B' },
  high: { name: 'Alta', color: '#F97316' },
  urgent: { name: 'Urgente', color: '#EF4444' },
}

const STAGE_OPTIONS = {
  new: { name: 'Nueva', color: '#60A5FA' },
  sketch: { name: 'Sketch/Boceto', color: '#A78BFA' },
  lineart: { name: 'Lineart', color: '#F472B6' },
  base: { name: 'Color base', color: '#FB923C' },
  shade: { name: 'Shade/Render', color: '#FBBF24' },
  review: { name: 'En revisión', color: '#34D399' },
  delivered: { name: 'Entregado', color: '#22C55E' },
}

// ─── PortalClientFilter ─────────────────────────────────────────────────────

function PortalClientFilter({ value, onChange }) {
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(localValue)
    }, 300)
    return () => clearTimeout(timer)
  }, [localValue, onChange])

  // Sync if parent resets value
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  return (
    <input
      className="portal-filter-input"
      type="text"
      placeholder="Busca tu comisión por nombre o email"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      aria-label="Filtrar comisiones por cliente"
    />
  )
}

// ─── PortalKanbanCard ───────────────────────────────────────────────────────

function PortalKanbanCard({ task }) {
  const title = task.text || 'Comisión'
  const priority = PRIORITY_OPTIONS[task.priority]
  const stage = STAGE_OPTIONS[task.stage]

  // Get first image thumbnail from attachments
  const thumbnail = useMemo(() => {
    if (!task.attachments || !Array.isArray(task.attachments)) return null
    const imgItem = task.attachments.find((a) => {
      const url = a?.url || a?.src || ''
      return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url) || url.startsWith('data:image')
    })
    return imgItem?.url || imgItem?.src || null
  }, [task.attachments])

  // Format deadline
  const deadlineStr = useMemo(() => {
    if (!task.deadline) return null
    try {
      const d = new Date(task.deadline)
      if (isNaN(d.getTime())) return null
      return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
    } catch {
      return null
    }
  }, [task.deadline])

  return (
    <div className="portal-kanban-card" role="article" aria-label={title}>
      {thumbnail && (
        <img
          className="portal-kanban-card-thumb"
          src={thumbnail}
          alt=""
          loading="lazy"
        />
      )}
      <div className="portal-kanban-card-title">{title}</div>
      <div className="portal-kanban-card-meta">
        {task.client && (
          <span
            className="portal-pill"
            style={{ '--pill-color': 'var(--text-muted)' }}
          >
            {task.client}
          </span>
        )}
        {priority && (
          <span
            className="portal-pill"
            style={{ '--pill-color': priority.color }}
          >
            {priority.name}
          </span>
        )}
        {stage && (
          <span
            className="portal-pill"
            style={{ '--pill-color': stage.color }}
          >
            {stage.name}
          </span>
        )}
        {deadlineStr && (
          <span
            className="portal-pill"
            style={{ '--pill-color': '#f87171' }}
          >
            📅 {deadlineStr}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── PortalKanbanBoard (Main Component) ─────────────────────────────────────

export default function PortalKanbanBoard() {
  const { artistId } = usePortalContext()
  const [tasks, setTasks] = useState([])
  const [kanbanConfig, setKanbanConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterText, setFilterText] = useState('')

  // Fetch tasks and kanban_config on mount
  useEffect(() => {
    if (!artistId || !isSupabaseReady()) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function fetchData() {
      setLoading(true)
      setError(null)

      try {
        const [tasksRes, configRes] = await Promise.all([
          supabase
            .from('tasks')
            .select('id, text, priority, stage, client, client_email, deadline, note, attachments, checklist, section_id')
            .eq('user_id', artistId)
            .eq('archived', false),
          supabase
            .from('kanban_config')
            .select('*')
            .eq('user_id', artistId)
            .single(),
        ])

        if (cancelled) return

        if (tasksRes.error) {
          setError(tasksRes.error)
          setLoading(false)
          return
        }

        setTasks(tasksRes.data || [])

        // kanban_config might not exist yet — that's ok, use defaults
        if (configRes.data) {
          setKanbanConfig(configRes.data)
        }

        setLoading(false)
      } catch (err) {
        if (!cancelled) {
          setError(err)
          setLoading(false)
        }
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [artistId])

  // Build columns from kanban_config custom_sections + default sections
  const columns = useMemo(() => {
    const customSections = kanbanConfig?.custom_sections
    const colorOverrides = kanbanConfig?.color_overrides || {}
    const labelOverrides = kanbanConfig?.label_overrides || {}

    // Use custom sections if available, otherwise defaults
    let sections = DEFAULT_SECTIONS
    if (Array.isArray(customSections) && customSections.length > 0) {
      sections = customSections.map((s) => ({
        id: s.id,
        label: labelOverrides[s.id] || s.label || s.name || s.id,
        color: colorOverrides[s.id] || s.color || '#7c6af7',
      }))
    } else {
      // Apply overrides to defaults
      sections = DEFAULT_SECTIONS.map((s) => ({
        ...s,
        label: labelOverrides[s.id] || s.label,
        color: colorOverrides[s.id] || s.color,
      }))
    }

    return sections
  }, [kanbanConfig])

  // Filter tasks by client name or email (case-insensitive)
  const filteredTasks = useMemo(() => {
    if (!filterText.trim()) return tasks
    const q = filterText.toLowerCase().trim()
    return tasks.filter((t) => {
      const client = (t.client || '').toLowerCase()
      const email = (t.client_email || '').toLowerCase()
      return client.includes(q) || email.includes(q)
    })
  }, [tasks, filterText])

  // Group tasks into columns by section_id, apply order_overrides
  const columnData = useMemo(() => {
    const orderOverrides = kanbanConfig?.order_overrides || {}

    return columns.map((col) => {
      const columnTasks = filteredTasks.filter((t) => t.section_id === col.id)

      // Apply order_overrides: if there's an ordered list of task IDs for this column, use it
      const orderList = orderOverrides[col.id]
      if (Array.isArray(orderList) && orderList.length > 0) {
        const orderMap = new Map(orderList.map((id, i) => [id, i]))
        columnTasks.sort((a, b) => {
          const oa = orderMap.has(a.id) ? orderMap.get(a.id) : 9999
          const ob = orderMap.has(b.id) ? orderMap.get(b.id) : 9999
          return oa - ob
        })
      }

      return { ...col, tasks: columnTasks }
    })
  }, [columns, filteredTasks, kanbanConfig])

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="portal-empty-state">
        <div className="mini-spinner" style={{ width: 24, height: 24 }} />
        <span className="portal-empty-state-text">Cargando comisiones...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="portal-empty-state">
        <span className="portal-empty-state-icon">⚠️</span>
        <span className="portal-empty-state-text">
          No se pudieron cargar las comisiones. Intenta recargar la página.
        </span>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="portal-empty-state">
        <span className="portal-empty-state-icon">📭</span>
        <span className="portal-empty-state-text">
          No hay comisiones activas actualmente
        </span>
      </div>
    )
  }

  return (
    <div className="portal-kanban-wrapper">
      {/* Client Filter */}
      <div style={{ marginBottom: '1rem' }}>
        <PortalClientFilter value={filterText} onChange={setFilterText} />
      </div>

      {/* Kanban Board */}
      <div className="portal-kanban" role="region" aria-label="Tablero de comisiones">
        {columnData.map((col) => (
          <div className="portal-kanban-column" key={col.id}>
            {/* Column Header */}
            <div className="portal-kanban-column-header">
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: col.color,
                  flexShrink: 0,
                }}
                aria-hidden="true"
              />
              <span className="portal-kanban-column-title">{col.label}</span>
              <span className="portal-kanban-column-count">{col.tasks.length}</span>
            </div>

            {/* Column Body — Cards */}
            <div className="portal-kanban-column-body">
              {col.tasks.length === 0 ? (
                <div style={{
                  padding: '1rem 0.5rem',
                  textAlign: 'center',
                  fontSize: '0.72rem',
                  color: 'var(--text-dim)',
                  opacity: 0.6,
                }}>
                  Sin comisiones
                </div>
              ) : (
                col.tasks.map((task) => (
                  <PortalKanbanCard key={task.id} task={task} />
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* No results after filtering */}
      {filterText.trim() && filteredTasks.length === 0 && (
        <div className="portal-empty-state" style={{ marginTop: '1rem' }}>
          <span className="portal-empty-state-text">
            No se encontraron comisiones para "{filterText}"
          </span>
        </div>
      )}
    </div>
  )
}
