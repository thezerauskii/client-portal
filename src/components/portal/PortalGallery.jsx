import React, { useState, useEffect, useCallback } from 'react'
import { usePortalContext } from './PortalDataProvider.jsx'
import { supabase } from '../../lib/supabase.js'

/**
 * Resolves the display URL for a portfolio item based on its backend type.
 * Priority:
 * 1. Direct http URL (works without auth)
 * 2. R2 worker URL with /file/{storage_key} path
 * 3. Fallback to url field
 */
function resolveImageUrl(item) {
  // If there's a direct url field (not base64), prefer it — works without auth
  if (item.url && !item.url.startsWith('data:') && item.url.startsWith('http')) {
    return item.url
  }
  // R2 backend — try the worker URL with /file/ path
  if (item.backend === 'r2' && item.storage_key) {
    const workerUrl = import.meta.env.VITE_R2_WORKER_URL || 'https://commission-manager-r2.commission-manager-studio.workers.dev'
    return `${workerUrl}/file/${item.storage_key}`
  }
  // Fallback to url field
  return item.url || ''
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

  // Error state with debug info
  if (error) {
    const isTableMissing = error.message?.includes('relation') && error.message?.includes('does not exist')
    const isRLS = error.code === '42501' || error.message?.includes('permission denied')

    return (
      <div className="portal-empty-state">
        <span className="portal-empty-state-icon">⚠️</span>
        <p className="portal-empty-state-text">
          {isTableMissing
            ? 'La tabla de portafolio aún no está configurada para este artista.'
            : isRLS
              ? 'Sin permisos para ver el portafolio. Verifica las políticas RLS.'
              : 'Error al cargar el portafolio'}
        </p>
        <div className="portal-debug-panel">
          <p className="portal-debug-label">Debug info:</p>
          <pre className="portal-debug-content">
            {JSON.stringify({ code: error.code, message: error.message, hint: error.hint }, null, 2)}
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
        <div className="portal-debug-panel">
          <p className="portal-debug-label">Debug info:</p>
          <pre className="portal-debug-content">
            {JSON.stringify({ artistId, itemsFound: 0 }, null, 2)}
          </pre>
        </div>
      </div>
    )
  }

  const currentItem = items[lightboxIndex]

  return (
    <>
      {/* Responsive grid */}
      <div className="portal-grid portal-gallery-grid">
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
                // If the R2 URL failed, try fallback to direct url field
                const fallbackUrl = item.url || ''
                if (e.target.src !== fallbackUrl && fallbackUrl && fallbackUrl.startsWith('http')) {
                  e.target.src = fallbackUrl
                } else {
                  e.target.style.display = 'none'
                  if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'
                }
              }}
            />
            <div className="portal-gallery-card-broken" style={{ display: 'none' }}>
              <span>🖼️</span>
            </div>
            <div className="portal-gallery-card-overlay">
              {item.title && (
                <span className="portal-gallery-card-title">{item.title}</span>
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
