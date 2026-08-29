import React, { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePortalContext } from '../../components/portal/PortalDataProvider.jsx'
import { normalizeServices, formatPrice } from '../../shared/domain/servicesPricing.js'
import '../../styles/portal-services.css'

/* ─── One service card (public, read-only) ─── */
function ServiceCard({ svc, currency, onRequest }) {
  const [revealed, setRevealed] = useState(false)
  const hasImg = svc.images && svc.images[0]
  const blur = svc.nsfw && !revealed

  return (
    <div className={`psvc-card ${!svc.available ? 'psvc-card--off' : ''}`}>
      {hasImg && (
        <div className="psvc-img-wrap" onClick={() => blur && setRevealed(true)}>
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
              <img key={i} src={url} alt={`${svc.title} ${i + 2}`} className={svc.nsfw && !revealed ? 'psvc-img--blur' : ''} />
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

  return (
    <div className="psvc-wrap">
      {data.headerImage && <img src={data.headerImage} alt="" className="psvc-header-img" />}
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

      {/* ─── SECTION: Servicios ─── */}
      <hr className="psvc-divider" />
      <h2 className="psvc-section-title">Servicios</h2>
      <div className="psvc-grid">
        {data.services.map(svc => (
          <ServiceCard key={svc.id} svc={svc} currency={data.currency} onRequest={handleRequest} />
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
    </div>
  )
}
