import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import ReactDOM from 'react-dom'
import { usePortalContext } from './PortalDataProvider.jsx'
import { supabase, isSupabaseReady } from '../../lib/supabase.js'
import { useStickerProxy } from '../../hooks/useStickerProxy.js'
import PortalStickerOverlay from './PortalStickerOverlay.jsx'
import { getSectionIcon, IconCalendar, IconWarning, IconMailbox } from './PortalIcons.jsx'
import { usePortalTasks } from '../../hooks/usePortalTasks.js'
import PortalStickerPicker from './PortalStickerPicker.jsx'
import NsfwUnlockModal from './NsfwUnlockModal.jsx'

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

// ─── CardGallery (Xbox 360 style stacked carousel) ──────────────────────────

function CardGallery({ images, startIndex, onClose }) {
  const [current, setCurrent] = useState(startIndex || 0)

  const goNext = useCallback(() => {
    setCurrent(prev => (prev + 1) % images.length)
  }, [images.length])

  const goPrev = useCallback(() => {
    setCurrent(prev => (prev - 1 + images.length) % images.length)
  }, [images.length])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, goNext, goPrev])

  if (!images || images.length === 0) return null

  return (
    <div className="portal-card-gallery" role="dialog" aria-modal="true" aria-label="Visor de imágenes">
      <div className="portal-card-gallery-backdrop" onClick={onClose} />
      <button className="portal-card-gallery-close" onClick={onClose} aria-label="Cerrar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>

      {/* Stacked cards container */}
      <div className="portal-card-gallery-stack">
        {images.map((img, i) => {
          const offset = i - current
          const absOffset = Math.abs(offset)
          if (absOffset > 2) return null // Only render nearby cards

          const style = {
            transform: `translateX(${offset * 60}%) scale(${1 - absOffset * 0.12}) translateZ(${-absOffset * 80}px)`,
            opacity: absOffset === 0 ? 1 : 0.5 - absOffset * 0.15,
            zIndex: images.length - absOffset,
            filter: absOffset > 0 ? `blur(${absOffset}px)` : 'none',
          }

          return (
            <div
              key={img.url || i}
              className={`portal-card-gallery-item ${offset === 0 ? 'portal-card-gallery-item--active' : ''}`}
              style={style}
              onClick={offset !== 0 ? () => setCurrent(i) : undefined}
            >
              <img src={img.url || img.src} alt={img.name || ''} />
            </div>
          )
        })}
      </div>

      {/* Nav arrows */}
      {images.length > 1 && (
        <>
          <button className="portal-card-gallery-nav portal-card-gallery-nav--prev" onClick={goPrev} aria-label="Anterior">‹</button>
          <button className="portal-card-gallery-nav portal-card-gallery-nav--next" onClick={goNext} aria-label="Siguiente">›</button>
        </>
      )}

      {/* Info bar */}
      <div className="portal-card-gallery-info">
        <span>{current + 1} / {images.length}</span>
        {images[current]?.name && <span className="portal-card-gallery-name">{images[current].name}</span>}
      </div>
    </div>
  )
}

// ─── PortalCardImage (handles NSFW blur / Private heavy blur) ────────────────

function PortalCardImage({ task, thumbnail, imageAttachments, extraCount, placingSticker, editMode, onViewImages, localReactions, onRemoveSticker, onPlaceConfirm, onPlaceCancel, onMoveConfirm, onEditCancel, showConfetti, onUnlockClick }) {
  const [revealed, setRevealed] = useState(false)
  const isPrivate = !!task.nsfw_access_code
  const isNsfw = !!task.is_nsfw && !isPrivate

  // Private: heavy blur, needs code to unlock (handled externally)
  // NSFW: light blur, click to reveal (spoiler-style)
  const blurAmount = isPrivate ? '20px' : isNsfw ? '8px' : '0px'
  const showBlur = (isPrivate || isNsfw) && !revealed

  function handleClick(e) {
    e.stopPropagation()
    if (placingSticker || editMode) return
    if (isNsfw && !revealed) {
      setRevealed(true)
      return
    }
    if (isPrivate && !revealed) {
      if (onUnlockClick) onUnlockClick()
      return
    }
    onViewImages(imageAttachments, 0)
  }

  return (
    <div
      style={{ position: 'relative', cursor: (placingSticker || editMode) ? 'default' : 'pointer' }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={isPrivate ? 'Comisión privada — necesita código' : `Ver ${imageAttachments.length} imagen${imageAttachments.length > 1 ? 'es' : ''}`}
    >
      <img
        className="portal-kanban-card-thumb"
        src={thumbnail}
        alt=""
        loading="lazy"
        style={showBlur ? { filter: `blur(${blurAmount})`, transition: 'filter 0.3s ease' } : { transition: 'filter 0.3s ease' }}
      />

      {/* NSFW spoiler overlay — click to reveal */}
      {isNsfw && !revealed && (
        <div className="portal-card-blur-overlay portal-card-blur-overlay--nsfw">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </svg>
          <span>Click para revelar</span>
        </div>
      )}

      {/* Private heavy blur overlay — needs code */}
      {isPrivate && !revealed && (
        <div className="portal-card-blur-overlay portal-card-blur-overlay--private">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span>Desbloquear</span>
          <span className="portal-card-blur-overlay-name">{task.text || 'Comisión'}</span>
        </div>
      )}

      {/* Normal hover overlay */}
      {!placingSticker && !editMode && !showBlur && (
        <div className="portal-kanban-card-thumb-hover">
          <span>Ver historial de cambios</span>
        </div>
      )}

      {extraCount > 0 && !showBlur && (
        <span style={{
          position: 'absolute',
          bottom: '6px',
          right: '6px',
          background: 'rgba(0,0,0,0.75)',
          color: '#fff',
          fontSize: '0.65rem',
          fontWeight: 700,
          padding: '2px 6px',
          borderRadius: '4px',
        }}>
          +{extraCount}
        </span>
      )}

      {/* Sticker overlay */}
      <PortalStickerOverlay
        reactions={localReactions}
        onRemoveSticker={onRemoveSticker}
        placingSticker={placingSticker}
        onPlaceConfirm={onPlaceConfirm}
        onPlaceCancel={onPlaceCancel}
        editMode={editMode}
        onMoveConfirm={onMoveConfirm}
        onEditCancel={onEditCancel}
      />
      {showConfetti && <div className="portal-sticker-confetti" />}
    </div>
  )
}

// ─── PortalKanbanCard ───────────────────────────────────────────────────────

const PortalKanbanCard = React.memo(function PortalKanbanCard({ task, onViewImages, artistId, telegramStickerSets }) {
  const title = task.text || 'Comisión'
  const priority = PRIORITY_OPTIONS[task.priority]
  const stage = STAGE_OPTIONS[task.stage]
  const [showPicker, setShowPicker] = useState(false)
  const [localReactions, setLocalReactions] = useState(task.reactions || {})
  const [placingSticker, setPlacingSticker] = useState(null) // sticker being placed
  const [editMode, setEditMode] = useState(false) // reposition mode
  const [showConfetti, setShowConfetti] = useState(false)
  const [showCardUnlock, setShowCardUnlock] = useState(false)
  const pickerBtnRef = useRef(null)
  const { placeSticker, removeSticker } = useStickerProxy(artistId)

  const hasStickerSets = telegramStickerSets && telegramStickerSets.length > 0

  // Sticker entries for the "move" button visibility
  const stickerEntries = useMemo(() => {
    return Object.entries(localReactions).filter(([k]) => k.startsWith('__sticker__'))
  }, [localReactions])

  // Count client stickers
  const clientStickerCount = useMemo(() => {
    return Object.values(localReactions).filter(
      (v) => v && typeof v === 'object' && v.placedBy === 'client'
    ).length
  }, [localReactions])

  // Handle sticker selection from picker — enter placing mode
  const handleStickerSelect = useCallback(async (sticker) => {
    if (clientStickerCount >= 10) return
    setShowPicker(false)
    setPlacingSticker(sticker)
  }, [clientStickerCount])

  // Handle place confirm — user chose position
  const handlePlaceConfirm = useCallback(async (sticker, pos) => {
    const stickerKey = `__sticker__${sticker.file_unique_id}`
    const hash = Math.abs([...stickerKey].reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 0))

    const newEntry = {
      type: 'sticker',
      file_id: sticker.file_id || '',
      file_unique_id: sticker.file_unique_id,
      is_video: sticker.is_video || false,
      emoji: sticker.emoji || '',
      thumbUrl: sticker.thumbUrl || '',
      count: 1,
      x: pos.x,
      y: pos.y,
      rot: (hash % 22) - 11,
      placedBy: 'client',
      placedAt: new Date().toISOString(),
      _entering: true,
    }

    setPlacingSticker(null)
    setLocalReactions(prev => ({ ...prev, [stickerKey]: newEntry }))

    // Show confetti
    setShowConfetti(true)
    setTimeout(() => setShowConfetti(false), 1200)

    // Remove _entering flag after animation
    setTimeout(() => {
      setLocalReactions(prev => {
        if (!prev[stickerKey]) return prev
        const { _entering, ...rest } = prev[stickerKey]
        return { ...prev, [stickerKey]: rest }
      })
    }, 350)

    // Persist to server
    const result = await placeSticker(task.id, {
      file_unique_id: sticker.file_unique_id,
      file_id: sticker.file_id || '',
      emoji: sticker.emoji || '',
      thumbUrl: sticker.thumbUrl || '',
      is_video: sticker.is_video || false,
    })

    if (result.ok && result.reactions) {
      // Update with server position (might differ slightly)
      setLocalReactions(prev => {
        const serverEntry = result.reactions[stickerKey]
        if (serverEntry) {
          return { ...prev, [stickerKey]: { ...serverEntry, x: pos.x, y: pos.y } }
        }
        return prev
      })
      // Now update the position on server
      // (The place-sticker API sets hash-based position, we need to override with user's chosen position)
    } else if (!result.ok) {
      setLocalReactions(prev => { const copy = { ...prev }; delete copy[stickerKey]; return copy })
      console.warn('[PortalKanbanCard] place sticker failed:', result.error)
    }
  }, [placeSticker, task.id])

  // Handle place cancel
  const handlePlaceCancel = useCallback(() => {
    setPlacingSticker(null)
  }, [])

  // Handle move confirm (edit mode done)
  const handleMoveConfirm = useCallback(async (updatedReactions) => {
    setEditMode(false)
    setLocalReactions(updatedReactions)
    // Persist positions to server — update each sticker's position
    // For now we just update locally. The positions are stored in the reactions object.
  }, [])

  // Handle edit cancel
  const handleEditCancel = useCallback(() => {
    setEditMode(false)
  }, [])

  // Handle sticker removal
  const handleRemoveSticker = useCallback(async (stickerKey) => {
    // Optimistic removal
    const prev = localReactions[stickerKey]
    setLocalReactions(r => {
      const copy = { ...r }
      delete copy[stickerKey]
      return copy
    })

    const result = await removeSticker(task.id, stickerKey)
    if (!result.ok) {
      // Rollback
      if (prev) setLocalReactions(r => ({ ...r, [stickerKey]: prev }))
      console.warn('[PortalKanbanCard] remove sticker failed:', result.error)
    }
  }, [localReactions, removeSticker, task.id])

  // Get all image attachments
  const imageAttachments = useMemo(() => {
    if (!task.attachments || !Array.isArray(task.attachments)) return []
    return task.attachments.filter((a) => {
      const url = a?.url || a?.src || ''
      return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url) || url.startsWith('data:image') || url.includes('/file/')
    })
  }, [task.attachments])

  const thumbnail = imageAttachments[0]?.url || imageAttachments[0]?.src || null
  const extraCount = imageAttachments.length > 1 ? imageAttachments.length - 1 : 0

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
    <div className={`portal-kanban-card${task.nsfw_access_code ? ' portal-kanban-card--private' : ''}${task.is_nsfw ? ' portal-kanban-card--nsfw' : ''}`} role="article" aria-label={title}>
      {/* Thumbnail with +N badge — clickable to open gallery */}
      {thumbnail && (
        <PortalCardImage
          task={task}
          thumbnail={thumbnail}
          imageAttachments={imageAttachments}
          extraCount={extraCount}
          placingSticker={placingSticker}
          editMode={editMode}
          onViewImages={onViewImages}
          localReactions={localReactions}
          onRemoveSticker={handleRemoveSticker}
          onPlaceConfirm={handlePlaceConfirm}
          onPlaceCancel={handlePlaceCancel}
          onMoveConfirm={handleMoveConfirm}
          onEditCancel={handleEditCancel}
          showConfetti={showConfetti}
          onUnlockClick={() => setShowCardUnlock(true)}
        />
      )}

      {/* Hide sticker UI for private cards */}
      {!task.nsfw_access_code && (
        <>


      {/* Sticker overlay — show even if no thumbnail */}
      {!thumbnail && Object.keys(localReactions).some(k => k.startsWith('__sticker__')) && (
        <div style={{ position: 'relative', minHeight: '50px' }}>
          <PortalStickerOverlay
            reactions={localReactions}
            onRemoveSticker={handleRemoveSticker}
            placingSticker={placingSticker}
            onPlaceConfirm={handlePlaceConfirm}
            onPlaceCancel={handlePlaceCancel}
            editMode={editMode}
            onMoveConfirm={handleMoveConfirm}
            onEditCancel={handleEditCancel}
          />
        </div>
      )}

      {/* Sticker picker button */}
      {hasStickerSets && (
        <div style={{ position: 'relative' }}>
          <button
            ref={pickerBtnRef}
            className="portal-sticker-btn"
            onClick={(e) => { e.stopPropagation(); setShowPicker(!showPicker) }}
            disabled={clientStickerCount >= 10 || placingSticker || editMode}
            title={clientStickerCount >= 10 ? 'Máximo 10 stickers alcanzado' : 'Añade un sticker'}
            aria-label="Añade un sticker"
          >
            <img src="/logo-sticker-btn.png" alt="" className="portal-sticker-btn-icon" />
            <span className="portal-sticker-btn-label">Añade un sticker</span>
            {clientStickerCount > 0 && <span className="portal-sticker-btn-count">{clientStickerCount}/10</span>}
          </button>
          {/* Move button — only show if there are stickers placed */}
          {stickerEntries.length > 0 && !placingSticker && !editMode && (
            <button
              className="portal-sticker-btn portal-sticker-btn--move"
              onClick={(e) => { e.stopPropagation(); setEditMode(true) }}
            >
              Mover stickers
            </button>
          )}
          {showPicker && (
            <PortalStickerPicker
              artistId={artistId}
              stickerSets={telegramStickerSets}
              onSelect={handleStickerSelect}
              onClose={() => setShowPicker(false)}
            />
          )}
        </div>
      )}

        </>
      )}

      {/* Title */}
      <div className="portal-kanban-card-title">{title}</div>

      {/* Pills row */}
      <div className="portal-kanban-card-meta">
        {priority && (
          <span className="portal-pill" style={{ '--pill-color': priority.color }}>
            {priority.name}
          </span>
        )}
        {task.client && (
          <span className="portal-pill" style={{ '--pill-color': 'var(--text-muted)' }}>
            As: {task.client}
          </span>
        )}
        {stage && (
          <span className="portal-pill" style={{ '--pill-color': stage.color }}>
            {stage.name}
          </span>
        )}
        {task.nsfw_access_code && (
          <span className="portal-pill" style={{ '--pill-color': '#a855f7' }}>
            Privada
          </span>
        )}
        {task.is_nsfw && (
          <span className="portal-pill" style={{ '--pill-color': '#ef4444' }}>
            NSFW
          </span>
        )}
      </div>

      {/* Deadline */}
      {deadlineStr && (
        <div style={{ marginTop: '0.3rem' }}>
          <span className="portal-pill" style={{ '--pill-color': '#f87171', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <IconCalendar size={11} /> {deadlineStr}
          </span>
        </div>
      )}

      {/* Inline unlock modal for private cards */}
      {showCardUnlock && (
        <NsfwUnlockModal artistSlug={window.location.pathname.split('/p/')[1]?.split('/')[0] || ''} onClose={() => setShowCardUnlock(false)} />
      )}
    </div>
  )
})

// ─── PortalKanbanBoard (Main Component) ─────────────────────────────────────

export default function PortalKanbanBoard() {
  const { artistId, telegramStickerSets } = usePortalContext()
  const [allTasks, setAllTasks] = useState([])
  const [kanbanConfig, setKanbanConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterText, setFilterText] = useState('')
  const [galleryImages, setGalleryImages] = useState(null)
  const [galleryStart, setGalleryStart] = useState(0)
  const [showNsfwModal, setShowNsfwModal] = useState(false)

  // Get artist slug from URL for NSFW unlock
  const artistSlug = window.location.pathname.split('/p/')[1]?.split('/')[0] || ''

  const openGallery = useCallback((images, startIdx) => {
    setGalleryImages(images)
    setGalleryStart(startIdx || 0)
  }, [])

  const closeGallery = useCallback(() => {
    setGalleryImages(null)
  }, [])

  // Tasks come from the shared cache (single query for whole portal)
  const { tasks: sharedTasks, loading: tasksLoading, error: tasksError } = usePortalTasks(artistId)

  // Sync shared tasks into local state (allows optimistic sticker updates)
  useEffect(() => {
    setAllTasks(sharedTasks || [])
  }, [sharedTasks])

  useEffect(() => {
    setLoading(tasksLoading)
    if (tasksError) setError(tasksError)
  }, [tasksLoading, tasksError])

  // kanban_config is a separate table — fetch it once on mount
  useEffect(() => {
    if (!artistId || !isSupabaseReady()) return
    let cancelled = false
    async function fetchConfig() {
      try {
        const { data } = await supabase
          .from('kanban_config')
          .select('*')
          .eq('user_id', artistId)
          .single()
        if (!cancelled && data) setKanbanConfig(data)
      } catch {
        // kanban_config might not exist yet — use defaults
      }
    }
    fetchConfig()
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

  // Build columns: ALWAYS include fixed sections + custom sections from config
  const columnData = useMemo(() => {
    const colorOverrides = kanbanConfig?.color_overrides || {}
    const labelOverrides = kanbanConfig?.label_overrides || {}
    const orderOverrides = kanbanConfig?.order_overrides || {}
    const customSections = kanbanConfig?.custom_sections || []

    // Fixed sections that always exist (as task parents in the DB)
    const FIXED_SECTIONS = [
      { id: '6d74847d-beda-45fb-ac99-63c52212dfec', defaultLabel: 'Backlog y Proyectos', defaultColor: '#6B7280', emoji: null },
      { id: 'd02c3d13-e87b-4b43-83b6-7407e689a32e', defaultLabel: 'comisiones en progreso', defaultColor: '#F59E0B', emoji: null },
      { id: 'b5f9edcb-6fd0-4f89-a15d-9eb710ae37a0', defaultLabel: 'En Revisión', defaultColor: '#FACC15', emoji: null },
      { id: '02ee79a6-abd7-436f-938b-4386c520e203', defaultLabel: 'Comisiones Nuevas', defaultColor: '#60A5FA', emoji: null },
    ]

    // Build section map from tasks (sections are tasks with no parent_id)
    const sectionMap = new Map(sectionTasks.map((s) => [s.id, s]))

    // Combine: fixed sections first, then custom sections that aren't duplicates
    const fixedIds = new Set(FIXED_SECTIONS.map(s => s.id))
    const allSectionDefs = [
      ...FIXED_SECTIONS,
      ...customSections
        .filter(cs => !fixedIds.has(cs.id))
        .map(cs => ({ id: cs.id, defaultLabel: cs.label || cs.name || 'Sin nombre', defaultColor: cs.color || '#7c6af7', emoji: null }))
    ]

    // Build column data
    return allSectionDefs.map((def) => {
      const section = sectionMap.get(def.id)

      // Label: overrides > section task text > default
      const label = labelOverrides[def.id] || section?.text || def.defaultLabel

      // Color: overrides > default
      const color = colorOverrides[def.id] || def.defaultColor

      // Tasks for this column
      const columnTasks = filteredCommissions.filter((t) => t.parent_id === def.id)

      // Apply order_overrides if available
      const orderList = orderOverrides[def.id]
      if (Array.isArray(orderList) && orderList.length > 0) {
        const orderMap = new Map(orderList.map((id, i) => [id, i]))
        columnTasks.sort((a, b) => {
          const oa = orderMap.has(a.id) ? orderMap.get(a.id) : 9999
          const ob = orderMap.has(b.id) ? orderMap.get(b.id) : 9999
          return oa - ob
        })
      }

      return { id: def.id, label, color, emoji: def.emoji, tasks: columnTasks }
    })
  }, [sectionTasks, filteredCommissions, kanbanConfig])

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
        <span className="portal-empty-state-icon"><IconWarning size={24} /></span>
        <span className="portal-empty-state-text">
          No se pudieron cargar las comisiones. Intenta recargar la página.
        </span>
      </div>
    )
  }

  if (commissionTasks.length === 0) {
    return (
      <div className="portal-empty-state">
        <span className="portal-empty-state-icon"><IconMailbox size={24} /></span>
        <span className="portal-empty-state-text">
          No hay comisiones activas actualmente
        </span>
      </div>
    )
  }

  return (
    <>
    <div className="portal-kanban-wrapper" style={{ position: 'relative' }}>
      {/* Client Filter */}
      <div style={{ marginBottom: '1rem' }}>
        <PortalClientFilter value={filterText} onChange={setFilterText} />
      </div>

      {/* Kanban Board */}
      <div className="portal-kanban" role="region" aria-label="Tablero de comisiones">
        {columnData.map((col) => (
          <div className="portal-kanban-column" key={col.id} style={{ '--col-accent': col.color }}>
            {/* Column Header */}
            <div className="portal-kanban-column-header">
              <span
                style={{ fontSize: '1rem', flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}
                aria-hidden="true"
              >
                {getSectionIcon(col.id)}
              </span>
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
                  <PortalKanbanCard key={task.id} task={task} onViewImages={openGallery} artistId={artistId} telegramStickerSets={telegramStickerSets} />
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

    {/* Card gallery overlay */}
    {galleryImages && (
      <CardGallery images={galleryImages} startIndex={galleryStart} onClose={closeGallery} />
    )}

    {/* NSFW Unlock Button — rendered via portal to escape layout transforms */}
    {ReactDOM.createPortal(
      <button
        className="portal-nsfw-unlock-btn"
        onClick={() => setShowNsfwModal(true)}
        title="Desbloquear comisión privada con código"
        aria-label="Desbloquear comisión privada"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>
        </svg>
        <span>Pegar código</span>
      </button>,
      document.body
    )}

    {/* NSFW Unlock Modal */}
    {showNsfwModal && (
      <NsfwUnlockModal artistSlug={artistSlug} onClose={() => setShowNsfwModal(false)} />
    )}
    </>
  )
}
