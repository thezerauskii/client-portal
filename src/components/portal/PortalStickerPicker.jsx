/**
 * PortalStickerPicker — Panel de selección de stickers para el cliente.
 *
 * Versión adaptada del StickerPanel de Electron:
 * - Solo muestra los sets del artista (sin agregar ni eliminar)
 * - Llama al proxy para resolver stickers
 * - Tabs por set, grid 4 columnas, video stickers en hover
 *
 * Props:
 *   artistId     — UUID del artista
 *   stickerSets  — string[] — nombres de sticker sets del artista
 *   onSelect     — (sticker) => void — callback al elegir un sticker
 *   onClose      — () => void — cierra el picker
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useStickerProxy } from '../../hooks/useStickerProxy.js'

// ── Single sticker item ───────────────────────────────────────────────────────

function StickerItem({ sticker, artistId, onClick }) {
  const [thumbUrl, setThumbUrl] = useState(null)
  const [hovered, setHovered] = useState(false)
  const [imgError, setImgError] = useState(false)
  const videoRef = useRef(null)
  const { getFileUrl } = useStickerProxy(artistId)

  const isVideo = sticker.is_video ?? false

  // Resolve thumbnail URL on mount
  useEffect(() => {
    let cancelled = false
    const thumbFileId = sticker.thumbnail?.file_id ?? sticker.thumb?.file_id
    if (!thumbFileId) return

    getFileUrl(thumbFileId).then(url => {
      if (!cancelled && url) setThumbUrl(url)
    })

    return () => { cancelled = true }
  }, [sticker.thumbnail?.file_id, sticker.thumb?.file_id, getFileUrl])

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

  const handleClick = useCallback(async () => {
    // Resolve full sticker URL for thumbUrl to store
    let resolvedUrl = thumbUrl
    if (!resolvedUrl && sticker.file_id) {
      resolvedUrl = await getFileUrl(sticker.file_id)
    }

    onClick({
      ...sticker,
      thumbUrl: resolvedUrl || '',
    })
  }, [sticker, thumbUrl, getFileUrl, onClick])

  return (
    <button
      className="portal-sticker-item"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="gridcell"
      aria-label={sticker.emoji ? `Sticker ${sticker.emoji}` : 'Sticker'}
      title={sticker.emoji || 'Sticker'}
    >
      {isVideo && hovered && thumbUrl ? (
        <video
          ref={videoRef}
          src={thumbUrl}
          loop
          muted
          playsInline
          autoPlay
          className="portal-sticker-item-media"
        />
      ) : thumbUrl && !imgError ? (
        <img
          src={thumbUrl}
          alt={sticker.emoji || 'sticker'}
          onError={() => setImgError(true)}
          loading="lazy"
          className="portal-sticker-item-media"
        />
      ) : (
        <span className="portal-sticker-item-fallback">
          {sticker.emoji || '🖼'}
        </span>
      )}
    </button>
  )
}

// ── Main Picker ───────────────────────────────────────────────────────────────

export default function PortalStickerPicker({ artistId, stickerSets, onSelect, onClose }) {
  const panelRef = useRef(null)
  const { fetchStickerSet, loading, error } = useStickerProxy(artistId)

  const [activeSetName, setActiveSetName] = useState(stickerSets[0] || null)
  const [loadedSets, setLoadedSets] = useState({}) // { setName: { title, stickers } }

  // ── Fetch active set on tab change ──────────────────────────────────────────
  useEffect(() => {
    if (!activeSetName) return
    if (loadedSets[activeSetName]) return // Already loaded

    let cancelled = false

    fetchStickerSet(activeSetName).then(result => {
      if (cancelled || !result) return
      setLoadedSets(prev => ({ ...prev, [activeSetName]: result }))
    })

    return () => { cancelled = true }
  }, [activeSetName, loadedSets, fetchStickerSet])

  // ── Close on outside click ──────────────────────────────────────────────────
  useEffect(() => {
    function handleMouseDown(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [onClose])

  // ── Close on Escape ─────────────────────────────────────────────────────────
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const activeStickers = loadedSets[activeSetName]?.stickers || []

  return (
    <div
      ref={panelRef}
      className="portal-sticker-picker"
      role="dialog"
      aria-label="Selector de stickers"
    >
      {/* Tabs */}
      {stickerSets.length > 1 && (
        <div className="portal-sticker-tabs" role="tablist" aria-label="Sticker sets">
          {stickerSets.map(name => {
            const setData = loadedSets[name]
            const label = setData?.title ?? name
            const isActive = name === activeSetName
            return (
              <button
                key={name}
                className={`portal-sticker-tab${isActive ? ' portal-sticker-tab--active' : ''}`}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveSetName(name)}
                title={label}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="portal-sticker-loading">
          <div className="mini-spinner" style={{ width: 20, height: 20 }} />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <p className="portal-sticker-error">{error}</p>
      )}

      {/* Grid */}
      {!loading && activeStickers.length > 0 && (
        <div className="portal-sticker-grid" role="grid" aria-label="Stickers">
          {activeStickers.map(sticker => (
            <StickerItem
              key={sticker.file_unique_id}
              sticker={sticker}
              artistId={artistId}
              onClick={onSelect}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && activeStickers.length === 0 && activeSetName && (
        <p className="portal-sticker-empty">Cargando stickers...</p>
      )}
    </div>
  )
}
