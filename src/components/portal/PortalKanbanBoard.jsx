import React, { useState, useEffect, useMemo } from 'react'
import { usePortalContext } from './PortalDataProvider.jsx'
import { supabase, isSupabaseReady } from '../../lib/supabase.js'

// ─── Constants ───────────────────────────────────────────────────────────────

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
  const [allTasks, setAllTasks] = useState([])
  const [kanbanConfig, setKanbanConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterText, setFilterText] = useState('')

  // Fetch all tasks and kanban_config on mount
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
            .select('id, text, parent_id, priority, stage, client, client_email, deadline, note, attachments, checklist')
            .eq('user_id', artistId)
            .or('archived.is.null,archived.eq.false'),
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

        setAllTasks(tasksRes.data || [])

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

  // Separate section tasks (no parent_id) from commission tasks (have parent_id)
  const { sectionTasks, commissionTasks } = useMemo(() => {
    const sections = allTasks.filter((t) => !t.parent_id)
    const commissions = allTasks.filter((t) => t.parent_id)
    return { sectionTasks: sections, commissionTasks: commissions }
  }, [allTasks])

  // Filter commission tasks by client name or email (case-insensitive)
  const filteredCommissions = useMemo(() => {
    if (!filterText.trim()) return commissionTasks
    const q = filterText.toLowerCase().trim()
    return commissionTasks.filter((t) => {
      const client = (t.client || '').toLowerCase()
      const email = (t.client_email || '').toLowerCase()
      return client.includes(q) || email.includes(q)
    })
  }, [commissionTasks, filterText])

  // Build columns from sections that have children OR are listed in kanban_config
  const columnData = useMemo(() => {
    const colorOverrides = kanbanConfig?.color_overrides || {}
    const labelOverrides = kanbanConfig?.label_overrides || {}
    const orderOverrides = kanbanConfig?.order_overrides || {}
    const customSections = kanbanConfig?.custom_sections

    // Build a map of section tasks by ID for quick lookup
    const sectionMap = new Map(sectionTasks.map((s) => [s.id, s]))

    // Determine which section IDs to show as columns
    let sectionIds = []

    if (Array.isArray(customSections) && customSections.length > 0) {
      // kanban_config has an explicit list of sections — use that order
      sectionIds = customSections.map((s) => s.id)
    } else {
      // Fallback: show all sections that have at least one commission child
      const parentIds = new Set(commissionTasks.map((t) => t.parent_id))
      sectionIds = sectionTasks
        .filter((s) => parentIds.has(s.id))
        .map((s) => s.id)
    }

    // Build column data
    return sectionIds.map((sectionId) => {
      const section = sectionMap.get(sectionId)
      const customSection = Array.isArray(customSections)
        ? customSections.find((s) => s.id === sectionId)
        : null

      // Column label: overrides > section task text > custom_sections label > fallback
      const label =
        labelOverrides[sectionId] ||
        section?.text ||
        customSection?.label ||
        customSection?.name ||
        'Sin nombre'

      // Column color: overrides > custom_sections color > default
      const color =
        colorOverrides[sectionId] ||
        customSection?.color ||
        '#7c6af7'

      // Tasks for this column
      const columnTasks = filteredCommissions.filter((t) => t.parent_id === sectionId)

      // Apply order_overrides if available
      const orderList = orderOverrides[sectionId]
      if (Array.isArray(orderList) && orderList.length > 0) {
        const orderMap = new Map(orderList.map((id, i) => [id, i]))
        columnTasks.sort((a, b) => {
          const oa = orderMap.has(a.id) ? orderMap.get(a.id) : 9999
          const ob = orderMap.has(b.id) ? orderMap.get(b.id) : 9999
          return oa - ob
        })
      }

      return { id: sectionId, label, color, tasks: columnTasks }
    })
  }, [sectionTasks, commissionTasks, filteredCommissions, kanbanConfig])

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

  if (commissionTasks.length === 0) {
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
      {filterText.trim() && filteredCommissions.length === 0 && (
        <div className="portal-empty-state" style={{ marginTop: '1rem' }}>
          <span className="portal-empty-state-text">
            No se encontraron comisiones para "{filterText}"
          </span>
        </div>
      )}
    </div>
  )
}
