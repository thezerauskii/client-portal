import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { usePortalContext } from './PortalDataProvider.jsx'

/**
 * Resolves the display URL for a portfolio item.
 * Items now carry a pre-built imageUrl from the R2 worker fetch.
 */
function resolveImageUrl(item) {
  return item.imageUrl || ''
}

/**
 * Formats a date string for display in the gallery card.
 */
function formatDate(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

/**
 * PortalGallery — Read-only portfolio grid with lightbox.
 *
 * Fetches portfolio images directly from the R2 worker for the current artist,
 * displays them in a responsive masonry grid (CSS columns), and opens a lightbox
 * on click with full-size image + info panel beside it.
 *
 * Includes tag filter bar when tags are available.
 * Keyboard: Escape to close, ArrowLeft/ArrowRight for prev/next.
 */
export default function PortalGallery() {
  const { artistId } = usePortalContext()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTag, setActiveTag] = useState(null)

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  // Fetch portfolio items from R2 worker
  useEffect(() => {
    if (!artistId) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function fetchItems() {
      setLoading(true)
      setError(null)

      try {
        const workerUrl = import.meta.env.VITE_R2_WORKER_URL || 'https://commission-manager-r2.commission-manager-studio.workers.dev'
        const res = await fetch(`${workerUrl}/public/portfolio/${artistId}`)

        if (cancelled) return

        if (!res.ok) {
          const errText = await res.text()
          setError({ message: `R2 worker error: ${res.status} — ${errText}` })
          setLoading(false)
          return
        }

        const data = await res.json()

        if (!data.ok || !data.objects || data.objects.length === 0) {
          setItems([])
          setLoading(false)
          return
        }

        // Build items from R2 objects
        const portfolioItems = data.objects.map(obj => {
          const fileName = obj.key.split('/').pop() || ''
          const title = fileName.replace(/^\d+_[a-z0-9]+_?/i, '').replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ').trim() || fileName
          return {
            id: obj.key,
            title: title,
            description: obj.description || '',
            tags: obj.tags || [],
            imageUrl: `${workerUrl}/file/${obj.key}`,
            uploaded: obj.uploaded,
          }
        })

        setItems(portfolioItems)
        setLoading(false)
      } catch (err) {
        if (!cancelled) {
          setError({ message: err.message || 'Error connecting to R2' })
          setLoading(false)
        }
      }
    }

    fetchItems()
    return () => { cancelled = true }
  }, [artistId])

  // Tags
  const allTags = useMemo(() => [...new Set(items.flatMap(i => i.tags || []))], [items])
  const filteredItems = useMemo(() => {
    if (!activeTag) return items
    return items.filter(i => i.tags?.includes(activeTag))
  }, [items, activeTag])

  // Lightbox handlers
  const openLightbox = useCallback((index) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }, [])

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false)
  }, [])

  const goNext = useCallback(() => {
    setLightboxIndex((prev) => (prev + 1) % filteredItems.length)
  }, [filteredItems.length])

  const goPrev = useCallback(() => {
    setLightboxIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length)
  }, [filteredItems.length])

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightboxOpen) return

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        closeLightbox()
      } else if (e.key === 'ArrowRight') {
        goNext()
      } else if (e.key === 'ArrowLeft') {
        goPrev()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxOpen, closeLightbox, goNext, goPrev])

  // Loading state
  if (loading) {
    return (
      <div className="portal-empty-state">
        <div className="mini-spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
        <p className="portal-empty-state-text">Cargando portafolio...</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="portal-empty-state">
        <span className="portal-empty-state-icon">⚠️</span>
        <p className="portal-empty-state-text">Error al cargar el portafolio</p>
        <div className="portal-debug-panel">
          <p className="portal-debug-label">Debug info:</p>
          <pre className="portal-debug-content">
            {JSON.stringify({ message: error.message }, null, 2)}
          </pre>
        </div>
      </div>
    )
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className="portal-empty-state">
        <span className="portal-empty-state-icon">🖼️</span>
        <p className="portal-empty-state-text">El portafolio está vacío</p>
      </div>
    )
  }

  const currentItem = filteredItems[lightboxIndex]

  return (
    <>
      {/* Tag filter bar */}
      {allTags.length > 0 && (
        <div className="portal-gallery-tags">
          <button
            className={`portal-gallery-tag ${!activeTag ? 'portal-gallery-tag--active' : ''}`}
            onClick={() => setActiveTag(null)}
          >
            Todas
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              className={`portal-gallery-tag ${activeTag === tag ? 'portal-gallery-tag--active' : ''}`}
              onClick={() => setActiveTag(tag === activeTag ? null : tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Masonry grid */}
      <div className="portal-gallery-grid">
        {filteredItems.map((item, index) => (
          <div
            key={item.id}
            className="portal-gallery-card"
            onClick={() => openLightbox(index)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                openLightbox(index)
              }
            }}
            aria-label={`Ver ${item.title || 'imagen'}`}
          >
            <img
              src={resolveImageUrl(item)}
              alt={item.title || ''}
              loading="lazy"
              className="portal-gallery-card-img"
              onError={(e) => {
                e.target.style.display = 'none'
                if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'
              }}
            />
            <div className="portal-gallery-card-broken" style={{ display: 'none' }}>
              <span>🖼️</span>
            </div>
            <div className="portal-gallery-card-overlay">
              {item.title && (
                <span className="portal-gallery-card-title">{item.title}</span>
              )}
              {item.tags?.length > 0 && (
                <div className="portal-gallery-card-tags">
                  {item.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="portal-gallery-card-tag">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox overlay */}
      {lightboxOpen && currentItem && (
        <div className="portal-lightbox" role="dialog" aria-modal="true" aria-label="Visor de imagen">
          {/* Backdrop */}
          <div className="portal-lightbox-backdrop" onClick={closeLightbox} />

          {/* Close button */}
          <button
            className="portal-lightbox-close"
            onClick={closeLightbox}
            aria-label="Cerrar"
          >
            ✕
          </button>

          {/* Navigation arrows */}
          {filteredItems.length > 1 && (
            <>
              <button
                className="portal-lightbox-nav portal-lightbox-nav--prev"
                onClick={goPrev}
                aria-label="Imagen anterior"
              >
                ‹
              </button>
              <button
                className="portal-lightbox-nav portal-lightbox-nav--next"
                onClick={goNext}
                aria-label="Imagen siguiente"
              >
                ›
              </button>
            </>
          )}

          {/* Image + info panel side by side */}
          <div className="portal-lightbox-content portal-lightbox-content--split">
            <img
              src={resolveImageUrl(currentItem)}
              alt={currentItem.title || ''}
              className="portal-lightbox-img"
            />
            <div className="portal-lightbox-panel">
              <h3 className="portal-lightbox-title">{currentItem.title || 'Sin título'}</h3>
              {currentItem.description && (
                <p className="portal-lightbox-description">{currentItem.description}</p>
              )}
              {currentItem.uploaded && (
                <p className="portal-lightbox-date">{formatDate(currentItem.uploaded)}</p>
              )}
              {currentItem.tags?.length > 0 && (
                <div className="portal-lightbox-tags">
                  {currentItem.tags.map(tag => (
                    <span key={tag} className="portal-lightbox-tag">{tag}</span>
                  ))}
                </div>
              )}
              <p className="portal-lightbox-counter">
                {lightboxIndex + 1} / {filteredItems.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
