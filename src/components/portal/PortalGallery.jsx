import React, { useState, useEffect, useCallback } from 'react'
import { usePortalContext } from './PortalDataProvider.jsx'
import { supabase } from '../../lib/supabase.js'

/**
 * Resolves the display URL for a portfolio item based on its backend type.
 * - 'r2': builds URL from VITE_R2_WORKER_URL + '/' + storageKey
 * - 'base64' or 'url': uses the url field directly
 */
function resolveImageUrl(item) {
  if (item.backend === 'r2' && item.storage_key) {
    const workerUrl = import.meta.env.VITE_R2_WORKER_URL || ''
    return `${workerUrl}/${item.storage_key}`
  }
  return item.url
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
 * Fetches portfolio_items from Supabase for the current artist,
 * displays them in a responsive CSS grid, and opens a lightbox
 * on click with full-size image, title, description, and arrow navigation.
 *
 * Keyboard: Escape to close, ArrowLeft/ArrowRight for prev/next.
 */
export default function PortalGallery() {
  const { artistId } = usePortalContext()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  // Fetch portfolio items
  useEffect(() => {
    if (!artistId || !supabase) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function fetchItems() {
      setLoading(true)
      setError(null)

      try {
        const { data, error: queryError } = await supabase
          .from('portfolio_items')
          .select('id, url, title, description, tags, storage_key, backend, created_at')
          .eq('user_id', artistId)
          .order('sort_order', { ascending: true })

        if (cancelled) return

        if (queryError) {
          setError(queryError)
          setLoading(false)
          return
        }

        setItems(data || [])
        setLoading(false)
      } catch (err) {
        if (!cancelled) {
          setError(err)
          setLoading(false)
        }
      }
    }

    fetchItems()
    return () => { cancelled = true }
  }, [artistId])

  // Lightbox handlers
  const openLightbox = useCallback((index) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }, [])

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false)
  }, [])

  const goNext = useCallback(() => {
    setLightboxIndex((prev) => (prev + 1) % items.length)
  }, [items.length])

  const goPrev = useCallback(() => {
    setLightboxIndex((prev) => (prev - 1 + items.length) % items.length)
  }, [items.length])

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

  const currentItem = items[lightboxIndex]

  return (
    <>
      {/* Responsive grid */}
      <div className="portal-grid">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="portal-card portal-gallery-card"
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
                e.target.nextSibling && (e.target.nextSibling.style.display = 'flex')
              }}
            />
            <div className="portal-gallery-card-broken" style={{ display: 'none' }}>
              <span>🖼️</span>
            </div>
            <div className="portal-gallery-card-overlay">
              {item.title && (
                <span className="portal-gallery-card-title">{item.title}</span>
              )}
              {item.created_at && (
                <span className="portal-gallery-card-date">{formatDate(item.created_at)}</span>
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
          {items.length > 1 && (
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

          {/* Image + info */}
          <div className="portal-lightbox-content">
            <img
              src={resolveImageUrl(currentItem)}
              alt={currentItem.title || ''}
              className="portal-lightbox-img"
            />
            {(currentItem.title || currentItem.description) && (
              <div className="portal-lightbox-info">
                {currentItem.title && (
                  <h3 className="portal-lightbox-title">{currentItem.title}</h3>
                )}
                {currentItem.description && (
                  <p className="portal-lightbox-description">{currentItem.description}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
