import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePortalContext } from '../../components/portal/PortalDataProvider.jsx'
import { normalizeServices, formatPrice } from '../../shared/domain/servicesPricing.js'
import '../../styles/portal-services.css'

/* Render **bold** markdown in paragraphs */
function renderBold(text) {
  if (!text) return null
  return String(text).split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>
  )
}

/* ─── Lightbox / visor (touch + wheel scroll between images) ─── */
function Lightbox({ images, index, onClose, onIndex }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onIndex((index + 1) % images.length)
      if (e.key === 'ArrowLeft') onIndex((index - 1 + images.length) % images.length)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [index, images.length, onClose, onIndex])

  const onWheel = (e) => {
    if (images.length < 2) return
    if (e.deltaY > 0 || e.deltaX > 0) onIndex((index + 1) % images.length)
    else onIndex((index - 1 + images.length) % images.length)
  }

  if (!images.length) return null
  return (
    <div className="psvc-lightbox" onClick={onClose} role="dialog" aria-modal="true">
      <button className="psvc-lightbox-close" onClick={onClose} aria-label="Cerrar">×</button>
      <div className="psvc-lightbox-stage" onClick={e => e.stopPropagation()} onWheel={onWheel}>
        {images.length > 1 && (
          <button className="psvc-lightbox-nav psvc-lightbox-nav--prev" onClick={() => onIndex((index - 1 + images.length) % images.length)} aria-label="Anterior">‹</button>
        )}
        <img src={images[index]} alt="" className="psvc-lightbox-img" />
        {images.length > 1 && (
          <button className="psvc-lightbox-nav psvc-lightbox-nav--next" onClick={() => onIndex((index + 1) % images.length)} aria-label="Siguiente">›</button>
        )}
      </div>
      {images.length > 1 && (
        <div className="psvc-lightbox-dots">
          {images.map((_, i) => (
            <span key={i} className={`psvc-lightbox-dot ${i === index ? 'is-on' : ''}`} onClick={e => { e.stopPropagation(); onIndex(i) }} />
          ))}
        </div>
      )}
    </div>
  )
}

/* View-only content block */
function ContentBlockView({ block, onOpenImage }) {
  if (block.type === 'divider') return <hr className="psvc-block-divider" />
  if (block.type === 'h1') return <h2 className="psvc-block-h1">{block.content}</h2>
  if (block.type === 'h2') return <h3 className="psvc-block-h2">{block.content}</h3>
  if (block.type === 'paragraph') return <p className="psvc-block-p">{renderBold(block.content)}</p>
  if (block.type === 'callout') return <div className="psvc-block-callout">{renderBold(block.content)}</div>
  if (block.type === 'image' || block.type === 'gallery') {
    const imgs = block.images || []
    return (
      <div className={block.type === 'gallery' ? 'psvc-block-gallery' : 'psvc-block-imgs'}>
        {imgs.map((url, i) => (
          <img key={i} src={url} alt={`img ${i + 1}`} loading="lazy"
            onClick={() => onOpenImage && onOpenImage(imgs, i)} style={{ cursor: 'zoom-in' }} />
        ))}
      </div>
    )
  }
  if (block.type === 'faq') return (
    <div className="psvc-block-faq">
      {(block.items || []).filter(it => it.q || it.a).map((it, i) => (
        <details key={i} className="psvc-faq-item">
          <summary>{it.q || 'Pregunta'}</summary>
          <p>{it.a}</p>
        </details>
      ))}
    </div>
  )
  if (block.type === 'priceTable') return (
    <table className="psvc-block-pricetable">
      <tbody>
        {(block.rows || []).filter(r => r.label || r.price).map((r, i) => (
          <tr key={i}><td>{r.label}</td><td className="psvc-pt-price">{r.price}</td></tr>
        ))}
      </tbody>
    </table>
  )
  if (block.type === 'button' && block.url) return (
    <a className="psvc-block-button" href={block.url} target="_blank" rel="noopener noreferrer">{block.label || 'Abrir enlace'}</a>
  )
  return null
}

/* ─── One service card (public, read-only) ─── */
function ServiceCard({ svc, currency, onRequest, onOpenImage }) {
  const [revealed, setRevealed] = useState(false)
  const hasImg = svc.images && svc.images[0]
  const blur = svc.nsfw && !revealed

  return (
    <div className={`psvc-card ${!svc.available ? 'psvc-card--off' : ''}`}>
      {hasImg && (
        <div className="psvc-img-wrap" onClick={() => { if (blur) { setRevealed(true); return } onOpenImage && onOpenImage(svc.images, 0) }} style={{ cursor: blur ? 'pointer' : 'zoom-in' }}>
          <img src={svc.images[0]} alt={svc.title} className={blur ? 'psvc-img--blur' : ''} />
          {blur && (
            <div className="psvc-nsfw-overlay">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              <span>NSFW · Click para revelar</span>
            </div>
          )}
        </div>
      )}
      <div className="psvc-body">
        <div className="psvc-head">
          <h3>{svc.title}</h3>
          <span className="psvc-price">{formatPrice(svc, currency)}</span>
        </div>
        {svc.description && <p className="psvc-desc">{svc.description}</p>}
        {/* Thumbnails of extra examples */}
        {svc.images && svc.images.length > 1 && (
          <div className="psvc-thumbs">
            {svc.images.slice(1).map((url, i) => (
              <img key={i} src={url} alt={`${svc.title} ${i + 2}`} className={svc.nsfw && !revealed ? 'psvc-img--blur' : ''}
                onClick={() => !blur && onOpenImage && onOpenImage(svc.images, i + 1)} style={{ cursor: blur ? 'default' : 'zoom-in' }} />
            ))}
          </div>
        )}
        {svc.available ? (
          <button className="psvc-request-btn" onClick={() => onRequest(svc.title)}>Solicitar este</button>
        ) : (
          <span className="psvc-off-tag">No disponible por ahora</span>
        )}
      </div>
    </div>
  )
}

export default function PortalServices() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { servicesPricing } = usePortalContext()

  const data = useMemo(() => servicesPricing ? normalizeServices(servicesPricing) : null, [servicesPricing])

  // Lightbox state: { images: string[], index: number } | null
  const [lightbox, setLightbox] = useState(null)
  const openImage = useCallback((images, index) => {
    const imgs = (images || []).filter(Boolean)
    if (imgs.length) setLightbox({ images: imgs, index })
  }, [])

  function handleRequest(serviceTitle) {
    navigate(`/p/${slug}/request`)
  }

  // Empty state (artist hasn't set up services)
  if (!data || data.services.length === 0) {
    return (
      <div className="psvc-wrap">
        <div className="psvc-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          <p>Este artista aún no ha publicado sus servicios y precios.</p>
        </div>
      </div>
    )
  }

  const bgStyle = data.backgroundUrl
    ? {
        backgroundImage: `linear-gradient(rgba(0,0,0,${data.backgroundOpacity}), rgba(0,0,0,${data.backgroundOpacity})), url(${data.backgroundUrl})`,
        backgroundSize: `${data.backgroundZoom || 100}%`,
        backgroundPosition: `${data.backgroundPosX ?? 50}% ${data.backgroundPosY ?? 50}%`,
        backgroundAttachment: 'fixed',
      }
    : undefined

  return (
    <div className="psvc-wrap psvc-wrap--bg" style={bgStyle}>
      {/* Decorative stickers (view-only, tap to zoom) */}
      {(data.stickers || []).length > 0 && (
        <div className="psvc-sticker-layer">
          {data.stickers.map(s => (
            <img
              key={s.id}
              src={s.url}
              alt=""
              className="psvc-sticker"
              style={{ left: s.x + '%', top: s.y + '%', transform: `translate(-50%,-50%) rotate(${s.rot}deg) scale(${s.scale})`, cursor: 'zoom-in', pointerEvents: 'auto' }}
              draggable={false}
              onClick={() => openImage([s.url], 0)}
            />
          ))}
        </div>
      )}

      {data.bannerUrl && <img src={data.bannerUrl} alt="" className="psvc-banner-img" style={{ height: data.bannerHeight ? `${data.bannerHeight}px` : undefined, cursor: 'zoom-in' }} onClick={() => openImage([data.bannerUrl], 0)} />}
      {data.headerImage && <img src={data.headerImage} alt="" className="psvc-header-img" style={{ height: data.headerHeight ? `${data.headerHeight}px` : undefined, cursor: 'zoom-in' }} onClick={() => openImage([data.headerImage], 0)} />}
      <div className="psvc-header">
        <h1>Servicios y Precios</h1>
        {data.intro && <p>{data.intro}</p>}
      </div>

      {data.status !== 'open' && (
        <div className={`psvc-banner psvc-banner--${data.status}`}>
          <strong>{data.status === 'closed' ? 'Comisiones cerradas' : 'Lista de espera'}</strong>
          {data.statusMessage && <p>{data.statusMessage}</p>}
        </div>
      )}

      {/* ─── Rich content blocks ─── */}
      {(data.blocks || []).length > 0 && (
        <div className="psvc-blocks">
          {data.blocks.map(b => <ContentBlockView key={b.id} block={b} onOpenImage={openImage} />)}
        </div>
      )}

      {/* ─── SECTION: Servicios ─── */}
      <hr className="psvc-divider" />
      <h2 className="psvc-section-title">Servicios</h2>
      <div className="psvc-grid">
        {data.services.map(svc => (
          <ServiceCard key={svc.id} svc={svc} currency={data.currency} onRequest={handleRequest} onOpenImage={openImage} />
        ))}
      </div>

      {/* ─── SECTION: Extras ─── */}
      {data.addons.length > 0 && (
        <>
          <hr className="psvc-divider" />
          <h2 className="psvc-section-title">Extras / Add-ons</h2>
          <ul className="psvc-addons">
            {data.addons.map(a => (
              <li key={a.id}><span>{a.name}</span><strong>{a.price}</strong></li>
            ))}
          </ul>
        </>
      )}

      {/* ─── SECTION: CTA ─── */}
      <hr className="psvc-divider" />
      <div className="psvc-cta">
        <p>¿Listo para pedir tu comisión?</p>
        <button className="psvc-cta-btn" onClick={() => navigate(`/p/${slug}/request`)}>Solicitar comisión →</button>
      </div>

      {lightbox && (
        <Lightbox
          images={lightbox.images}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onIndex={(i) => setLightbox(lb => lb ? { ...lb, index: i } : lb)}
        />
      )}
    </div>
  )
}
