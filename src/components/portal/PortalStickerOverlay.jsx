/**
 * PortalStickerOverlay — Stickers posicionables sobre el thumbnail.
 *
 * Modos:
 *   - Normal: muestra stickers en sus posiciones guardadas
 *   - Placing: un nuevo sticker sigue el cursor/dedo, usuario decide dónde pegarlo
 *   - Editing: stickers existentes son arrastrables para reposicionar
 *
 * Props:
 *   reactions         — objeto reactions del task
 *   onRemoveSticker   — (stickerKey) => void
 *   placingSticker    — sticker object siendo colocado (null si no hay)
 *   onPlaceConfirm    — (sticker, {x, y}) => void — confirma posición del sticker nuevo
 *   onPlaceCancel     — () => void — cancela colocación
 *   editMode          — bool: si true, activa modo reposicionar
 *   onMoveConfirm     — (updatedReactions) => void — confirma nuevas posiciones
 *   onEditCancel      — () => void — cancela edición
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { hashStr, defaultRot } from '../../shared/domain/stickerGeometry.js'

// ── Draggable Sticker Chip ────────────────────────────────────────────────────

function StickerChip({ stickerKey, val, index, onRemove, draggable, containerRef, onDragEnd, onRefreshUrl }) {
  const [hovered, setHovered] = useState(false)
  const [imgError, setImgError] = useState(false)
  const videoRef = useRef(null)
  const chipRef = useRef(null)
  const dragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  const thumbUrl = typeof val === 'object' ? val.thumbUrl : val
  const isHttp = typeof thumbUrl === 'string' && thumbUrl.startsWith('http') && !imgError
  const isVideo = !!(val.is_video && isHttp)

  const xPct = val.x ?? (5 + (hashStr(stickerKey) % 60))
  const yPct = val.y ?? (5 + ((hashStr(stickerKey) * 7) % 55))
  const rot = val.rot ?? defaultRot(stickerKey)

  const handleMouseEnter = useCallback(() => {
    setHovered(true)
    if (isVideo && videoRef.current) videoRef.current.play().catch(() => {})
  }, [isVideo])

  const handleMouseLeave = useCallback(() => {
    setHovered(false)
    if (isVideo && videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0 }
  }, [isVideo])

  // ── Drag logic ──────────────────────────────────────────────────────────────
  const handlePointerDown = useCallback((e) => {
    if (!draggable || !containerRef?.current || !chipRef.current) return
    e.preventDefault()
    e.stopPropagation()
    dragging.current = true

    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const chipRect = chipRef.current.getBoundingClientRect()
    dragOffset.current = { x: clientX - chipRect.left, y: clientY - chipRect.top }

    let lastX = xPct, lastY = yPct

    function onMove(ev) {
      if (!dragging.current) return
      const cx = ev.touches ? ev.touches[0].clientX : ev.clientX
      const cy = ev.touches ? ev.touches[0].clientY : ev.clientY
      const cRect = containerRef.current.getBoundingClientRect()
      const chipW = chipRef.current.offsetWidth
      const chipH = chipRef.current.offsetHeight
      lastX = (Math.max(0, Math.min(cx - dragOffset.current.x - cRect.left, cRect.width - chipW)) / cRect.width) * 100
      lastY = (Math.max(0, Math.min(cy - dragOffset.current.y - cRect.top, cRect.height - chipH)) / cRect.height) * 100
      chipRef.current.style.left = lastX + '%'
      chipRef.current.style.top = lastY + '%'
    }

    function onUp() {
      dragging.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onUp)
      if (onDragEnd) onDragEnd(stickerKey, lastX, lastY)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onUp)
  }, [draggable, containerRef, stickerKey, xPct, yPct, onDragEnd])

  const style = {
    position: 'absolute',
    left: xPct + '%',
    top: yPct + '%',
    transform: `rotate(${rot}deg)`,
    zIndex: hovered ? 999 : 10 + index,
    cursor: draggable ? 'grab' : 'default',
    touchAction: draggable ? 'none' : 'auto',
  }

  function renderMedia() {
    if (isVideo && isHttp) {
      return (
        <>
          {thumbUrl && !hovered && <img src={thumbUrl} alt={val.emoji ?? 'sticker'} className="portal-sticker-media" draggable={false} onError={() => setImgError(true)} />}
          {hovered && <video ref={videoRef} src={thumbUrl} loop muted playsInline autoPlay className="portal-sticker-media" />}
        </>
      )
    }
    if (isHttp) {
      return <img src={thumbUrl} alt={val.emoji ?? 'sticker'} className="portal-sticker-media" loading="lazy" draggable={false} onError={() => setImgError(true)} />
    }
    // Fallback: show emoji or a generic sticker placeholder
    return (
      <span className="portal-sticker-fallback" aria-hidden="true" style={{ opacity: 0.6, fontSize: '1.2rem' }}>
        {val.emoji || <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>}
      </span>
    )
  }

  return (
    <div
      ref={chipRef}
      className={`portal-sticker-chip${hovered ? ' portal-sticker-chip--hovered' : ''}${draggable ? ' portal-sticker-chip--draggable' : ''}${val._entering ? ' portal-sticker-chip--entering' : ''}`}
      style={style}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={draggable ? handlePointerDown : undefined}
      onTouchStart={draggable ? handlePointerDown : undefined}
      role="img"
      aria-label={val.emoji ? `Sticker ${val.emoji}` : 'Sticker'}
    >
      {renderMedia()}
      {onRemove && !draggable && (
        <button
          className="portal-sticker-delete"
          onClick={(e) => { e.stopPropagation(); onRemove(stickerKey) }}
          aria-label="Quitar sticker"
        >×</button>
      )}
    </div>
  )
}

// ── Placing Ghost (new sticker following cursor) ──────────────────────────────

function PlacingGhost({ sticker, containerRef, onConfirm, onCancel }) {
  const ghostRef = useRef(null)
  const [pos, setPos] = useState({ x: 50, y: 50 })
  const dragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  // Center ghost initially
  useEffect(() => {
    setPos({ x: 50, y: 50 })
  }, [sticker])

  const handlePointerDown = useCallback((e) => {
    if (!containerRef?.current || !ghostRef.current) return
    e.preventDefault()
    dragging.current = true
    const cx = e.touches ? e.touches[0].clientX : e.clientX
    const cy = e.touches ? e.touches[0].clientY : e.clientY
    const rect = ghostRef.current.getBoundingClientRect()
    dragOffset.current = { x: cx - rect.left, y: cy - rect.top }

    function onMove(ev) {
      if (!dragging.current) return
      const mcx = ev.touches ? ev.touches[0].clientX : ev.clientX
      const mcy = ev.touches ? ev.touches[0].clientY : ev.clientY
      const cRect = containerRef.current.getBoundingClientRect()
      const gW = ghostRef.current.offsetWidth
      const gH = ghostRef.current.offsetHeight
      const newX = (Math.max(0, Math.min(mcx - dragOffset.current.x - cRect.left, cRect.width - gW)) / cRect.width) * 100
      const newY = (Math.max(0, Math.min(mcy - dragOffset.current.y - cRect.top, cRect.height - gH)) / cRect.height) * 100
      setPos({ x: newX, y: newY })
    }

    function onUp() {
      dragging.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onUp)
  }, [containerRef])

  const thumbUrl = sticker.thumbUrl || ''
  const isHttp = thumbUrl.startsWith('http')

  return (
    <>
      {/* Ghost sticker */}
      <div
        ref={ghostRef}
        className="portal-sticker-chip portal-sticker-chip--placing"
        style={{ position: 'absolute', left: pos.x + '%', top: pos.y + '%', zIndex: 1000, cursor: 'grab', touchAction: 'none' }}
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
      >
        {isHttp ? (
          <img src={thumbUrl} alt={sticker.emoji || 'sticker'} className="portal-sticker-media" draggable={false} />
        ) : (
          <span className="portal-sticker-fallback">{sticker.emoji || <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>}</span>
        )}
      </div>

      {/* Action buttons */}
      <div className="portal-sticker-place-actions">
        <button className="portal-sticker-place-done" onClick={() => onConfirm(pos)}>
          Pegar aqui
        </button>
        <button className="portal-sticker-place-cancel" onClick={onCancel}>
          Cancelar
        </button>
      </div>

      {/* Instruction overlay */}
      <div className="portal-sticker-place-hint">
        Arrastra el sticker donde quieras
      </div>
    </>
  )
}

// ── Main Export ───────────────────────────────────────────────────────────────

export default function PortalStickerOverlay({
  reactions,
  onRemoveSticker,
  placingSticker,
  onPlaceConfirm,
  onPlaceCancel,
  editMode,
  onMoveConfirm,
  onEditCancel,
}) {
  const containerRef = useRef(null)
  const [localPositions, setLocalPositions] = useState({})

  // Reset local positions when entering edit mode
  useEffect(() => {
    if (editMode) setLocalPositions({})
  }, [editMode])

  const stickerEntries = reactions
    ? Object.entries(reactions).filter(([k, v]) => k.startsWith('__sticker__') && v && (v.count > 0 || typeof v === 'string'))
    : []

  const handleDragEnd = useCallback((key, x, y) => {
    setLocalPositions(prev => ({ ...prev, [key]: { x, y } }))
  }, [])

  const handleConfirmMoves = useCallback(() => {
    if (!reactions || !onMoveConfirm) return
    const updated = { ...reactions }
    Object.entries(localPositions).forEach(([key, { x, y }]) => {
      if (updated[key]) {
        updated[key] = { ...updated[key], x, y }
      }
    })
    onMoveConfirm(updated)
  }, [reactions, localPositions, onMoveConfirm])

  // Nothing to show
  if (stickerEntries.length === 0 && !placingSticker) return null

  return (
    <div
      ref={containerRef}
      className={`portal-sticker-overlay portal-sticker-overlay--positioned${editMode ? ' portal-sticker-overlay--edit' : ''}${placingSticker ? ' portal-sticker-overlay--edit' : ''}`}
    >
      {/* Existing stickers */}
      {stickerEntries.map(([key, val], index) => {
        const displayVal = localPositions[key] ? { ...val, x: localPositions[key].x, y: localPositions[key].y } : val
        return (
          <StickerChip
            key={key}
            stickerKey={key}
            val={displayVal}
            index={index}
            onRemove={onRemoveSticker}
            draggable={editMode}
            containerRef={containerRef}
            onDragEnd={handleDragEnd}
          />
        )
      })}

      {/* Placing mode — new sticker ghost */}
      {placingSticker && (
        <PlacingGhost
          sticker={placingSticker}
          containerRef={containerRef}
          onConfirm={(pos) => onPlaceConfirm && onPlaceConfirm(placingSticker, pos)}
          onCancel={onPlaceCancel}
        />
      )}

      {/* Edit mode actions */}
      {editMode && (
        <div className="portal-sticker-place-actions">
          <button className="portal-sticker-place-done" onClick={handleConfirmMoves}>
            Listo
          </button>
          <button className="portal-sticker-place-cancel" onClick={onEditCancel}>
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}
