/**
 * PortalStickerPicker — Panel flotante de stickers para el cliente.
 *
 * Funciona como el StickerPanel de Electron:
 * - Ventana flotante por encima de todo (fixed, z-index alto)
 * - Tabs por set del artista + input para agregar sets propios
 * - Grid 4 columnas con thumbnails
 * - Video stickers en hover
 * - Click para pegar sticker en la comisión
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
    // Also try thumbnail file_id if main URL not resolved
    if (!resolvedUrl) {
      const thumbFileId = sticker.thumbnail?.file_id ?? sticker.thumb?.file_id
      if (thumbFileId) resolvedUrl = await getFileUrl(thumbFileId)
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

  // Combine artist sets + user-added sets
  const [userAddedSets, setUserAddedSets] = useState([])
  const allSets = [...stickerSets, ...userAddedSets]

  const [activeSetName, setActiveSetName] = useState(allSets[0] || null)
  const [loadedSets, setLoadedSets] = useState({}) // { setName: { title, stickers } }
  const [addInput, setAddInput] = useState('')
  const [addError, setAddError] = useState(null)

  // ── Fetch active set on tab change ──────────────────────────────────────────
  useEffect(() => {
    if (!activeSetName) return
    if (loadedSets[activeSetName]) return

    let cancelled = false
    fetchStickerSet(activeSetName).then(result => {
      if (cancelled || !result) return
      setLoadedSets(prev => ({ ...prev, [activeSetName]: result }))
    })
    return () => { cancelled = true }
  }, [activeSetName, loadedSets, fetchStickerSet])

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

  // ── Close on click outside ──────────────────────────────────────────────────
  useEffect(() => {
    function handleMouseDown(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose()
      }
    }
    // Small delay to prevent immediate close on the button click that opened it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleMouseDown)
    }, 50)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [onClose])

  // ── Add set handler ─────────────────────────────────────────────────────────
  const handleAddSet = useCallback(() => {
    let setName = addInput.trim()
    if (!setName) return

    // If user pasted a full URL like https://t.me/addstickers/SetName, extract the name
    const urlMatch = setName.match(/(?:t\.me\/addstickers\/)(.+)$/i)
    if (urlMatch) setName = urlMatch[1]

    // Remove any trailing slashes or spaces
    setName = setName.replace(/\/+$/, '').trim()

    if (!setName) return

    setAddError(null)

    // Check if already exists
    if (allSets.includes(setName)) {
      setActiveSetName(setName)
      setAddInput('')
      return
    }

    // Try to fetch it
    fetchStickerSet(setName).then(result => {
      if (result) {
        setUserAddedSets(prev => [...prev, setName])
        setLoadedSets(prev => ({ ...prev, [setName]: result }))
        setActiveSetName(setName)
        setAddInput('')
        setAddError(null)
      } else {
        setAddError('Set no encontrado. Verifica el nombre.')
      }
    })
  }, [addInput, allSets, fetchStickerSet])

  const handleAddKeyDown = useCallback((e) => {
    if (e.key === 'Enter') handleAddSet()
  }, [handleAddSet])

  const activeStickers = loadedSets[activeSetName]?.stickers || []

  return (
    <div className="portal-sticker-picker-backdrop" onClick={onClose}>
      <div
        ref={panelRef}
        className="portal-sticker-picker"
        role="dialog"
        aria-label="Selector de stickers"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="portal-sticker-picker-header">
          <span className="portal-sticker-picker-title">Stickers</span>
          <button className="portal-sticker-picker-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        {/* Add sticker set input */}
        <div className="portal-sticker-add-row">
          <input
            className="portal-sticker-add-input"
            type="text"
            placeholder="Nombre del set o URL (t.me/addstickers/...)"
            value={addInput}
            onChange={(e) => setAddInput(e.target.value)}
            onKeyDown={handleAddKeyDown}
            aria-label="Agregar sticker set"
          />
          <button
            className="portal-sticker-add-btn"
            onClick={handleAddSet}
            disabled={loading || !addInput.trim()}
          >
            Agregar
          </button>
        </div>
        {addError && <p className="portal-sticker-add-error">{addError}</p>}

        {/* Tabs */}
        {allSets.length > 0 && (
          <div className="portal-sticker-tabs" role="tablist" aria-label="Sticker sets">
            {allSets.map(name => {
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

        {/* No sets at all */}
        {allSets.length === 0 && !loading && (
          <p className="portal-sticker-empty">Agrega un sticker set para empezar</p>
        )}
      </div>
    </div>
  )
}
