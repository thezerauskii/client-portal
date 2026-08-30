import React, { useEffect, useRef, useState } from 'react'
import './music.css'

/**
 * PortalMusicHeader — cabecera sticky "con alma" del estudio.
 *
 * Arriba (expandido): avatar grande + nombre + tagline + bio + CTA de contacto.
 * Al bajar el scroll se ENCOGE a una barra transport compacta (mini casete +
 * nombre + botón), quedando pegada arriba. Puramente presentacional; usa
 * page.header. Si no hay contenido (ni nombre ni avatar), no renderiza nada —
 * así las páginas que no lo configuran se ven exactamente como antes.
 *
 * Props:
 *  - header: page.header normalizado.
 *  - accent: color.
 *  - ctaUrl, ctaLabel: enlace de contacto (p.ej. Fiverr) — opcional.
 *  - sticky: si false, no se colapsa ni se pega (page.header.stickyTransport).
 */
export default function PortalMusicHeader({ header = {}, accent = '#22c55e', ctaUrl = '', ctaLabel = 'Contacto', sticky = true }) {
  const { avatarUrl, displayName, tagline, bio } = header
  const hasContent = !!(displayName || avatarUrl || tagline || bio)
  const [collapsed, setCollapsed] = useState(false)
  const rafRef = useRef(0)
  const ticking = useRef(false)

  const reduced = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

  useEffect(() => {
    if (!sticky || !hasContent || typeof window === 'undefined') return
    const THRESHOLD = 140
    const onScroll = () => {
      if (ticking.current) return
      ticking.current = true
      rafRef.current = requestAnimationFrame(() => {
        ticking.current = false
        setCollapsed((window.scrollY || 0) > THRESHOLD)
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('scroll', onScroll) }
  }, [sticky, hasContent])

  if (!hasContent) return null

  const initial = (displayName || '?').trim().charAt(0).toUpperCase()

  return (
    <header
      className={`pmh ${sticky ? 'pmh--sticky' : ''} ${collapsed ? 'is-collapsed' : ''} ${reduced ? 'pmh--reduced' : ''}`}
      style={{ '--accent': accent }}
    >
      <div className="pmh-inner">
        {/* Avatar / mini casete cuando colapsa */}
        <div className="pmh-avatar" aria-hidden={avatarUrl ? undefined : 'true'}>
          {avatarUrl
            ? <img src={avatarUrl} alt={displayName ? `Foto de ${displayName}` : ''} className="pmh-avatar-img" />
            : <span className="pmh-avatar-fallback" style={{ background: accent }}>{initial}</span>}
          {/* mini reels decorativos que se ven en modo colapsado */}
          <span className="pmh-reel pmh-reel--l" aria-hidden="true" />
          <span className="pmh-reel pmh-reel--r" aria-hidden="true" />
        </div>

        <div className="pmh-text">
          {displayName && <p className="pmh-name">{displayName}</p>}
          {tagline && <p className="pmh-tagline">{tagline}</p>}
          {bio && <p className="pmh-bio">{bio}</p>}
        </div>

        {ctaUrl && (
          <a className="pmh-cta" href={ctaUrl} target="_blank" rel="noopener noreferrer" style={{ background: accent }}>
            {ctaLabel}
          </a>
        )}
      </div>
    </header>
  )
}
