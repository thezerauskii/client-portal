/**
 * PortalStickerOverlay — Muestra stickers colocados sobre el thumbnail de una card.
 *
 * Versión simplificada del StickerOverlay de Electron:
 * - Solo lectura (sin drag-to-reposition)
 * - Video stickers reproducen en hover
 * - Botón × solo en stickers con placedBy='client' (para que el visitante los quite)
 *
 * Props:
 *   reactions        — objeto reactions del task (puede ser null)
 *   onRemoveSticker  — (stickerKey) => void — callback para eliminar sticker del cliente
 */

import { useState, useRef, useCallback, useEffect } from 'react'

// ── Utilities ─────────────────────────────────────────────────────────────────

function hashStr(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function defaultRot(key) {
  return ((hashStr(key) % 22) - 11)
}

// ── Single Sticker Chip ───────────────────────────────────────────────────────

function StickerChip({ stickerKey, val, index, onRemove }) {
  const [hovered, setHovered] = useState(false)
  const videoRef = useRef(null)

  const thumbUrl = typeof val === 'object' ? val.thumbUrl : val
  const isHttp = typeof thumbUrl === 'string' && thumbUrl.startsWith('http')
  const isVideo = !!(val.is_video && isHttp)
  const isClientPlaced = true // Everyone can delete any sticker

  // Position from saved data or hash-based default
  const xPct = val.x ?? (5 + (hashStr(stickerKey) % 60))
  const yPct = val.y ?? (5 + ((hashStr(stickerKey) * 7) % 55))
  const rot = val.rot ?? defaultRot(stickerKey)
  const hasPosition = val.x !== undefined

  const handleMouseEnter = useCallback(() => {
    setHovered(true)
    if (isVideo && videoRef.current) {
      videoRef.current.play().catch(() => {})
    }
  }, [isVideo])

  const handleMouseLeave = useCallback(() => {
    setHovered(false)
    if (isVideo && videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }, [isVideo])

  const style = hasPosition
    ? {
        position: 'absolute',
        left: xPct + '%',
        top: yPct + '%',
        transform: `rotate(${rot}deg)`,
        zIndex: 10 + index,
      }
    : {
        transform: `rotate(${rot}deg)`,
        zIndex: 10 + index,
      }

  function renderMedia() {
    if (isVideo && isHttp) {
      return (
        <>
          {thumbUrl && !hovered && (
            <img
              src={thumbUrl}
              alt={val.emoji ?? 'sticker'}
              className="portal-sticker-media"
              draggable={false}
            />
          )}
          {hovered && (
            <video
              ref={videoRef}
              src={thumbUrl}
              loop
              muted
              playsInline
              autoPlay
              className="portal-sticker-media"
            />
          )}
        </>
      )
    }

    if (isHttp) {
      return (
        <img
          src={thumbUrl}
          alt={val.emoji ?? 'sticker'}
          className="portal-sticker-media"
          loading="lazy"
          draggable={false}
        />
      )
    }

    return (
      <span className="portal-sticker-fallback" aria-hidden="true">
        {val.emoji ?? '🖼'}
      </span>
    )
  }

  return (
    <div
      className={`portal-sticker-chip${hovered ? ' portal-sticker-chip--hovered' : ''}${val._entering ? ' portal-sticker-chip--entering' : ''}`}
      style={style}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="img"
      aria-label={val.emoji ? `Sticker ${val.emoji}` : 'Sticker'}
    >
      {renderMedia()}
      {isClientPlaced && hovered && onRemove && (
        <button
          className="portal-sticker-delete"
          onClick={(e) => { e.stopPropagation(); onRemove(stickerKey) }}
          aria-label="Quitar sticker"
        >
          ×
        </button>
      )}
    </div>
  )
}

// ── Main Export ───────────────────────────────────────────────────────────────

export default function PortalStickerOverlay({ reactions, onRemoveSticker }) {
  if (!reactions) return null

  const stickerEntries = Object.entries(reactions).filter(
    ([k, v]) => k.startsWith('__sticker__') && v && (v.count > 0 || typeof v === 'string')
  )

  if (stickerEntries.length === 0) return null

  // Check if all stickers have position — if so, render in absolute mode
  const allPositioned = stickerEntries.every(([k, v]) => v.x !== undefined)

  return (
    <div
      className={`portal-sticker-overlay${allPositioned ? ' portal-sticker-overlay--positioned' : ''}`}
      aria-label="Stickers"
    >
      {stickerEntries.map(([key, val], index) => (
        <StickerChip
          key={key}
          stickerKey={key}
          val={val}
          index={index}
          onRemove={onRemoveSticker}
        />
      ))}
    </div>
  )
}
