import React from 'react'
import VintageIcon from './VintageIcon.jsx'

/**
 * ModuleContent — renderiza los MÓDULOS DE CONTENIDO (no-audio) por tipo:
 * text, image, metrics, services, skills, projects, list, banner-cta, avatar,
 * divider. Puramente presentacional; recibe el módulo (con props) y el accent.
 * Los módulos de audio se renderizan aparte (ModuleAudio, 7.3).
 *
 * Paleta: usa los tokens --mk-* definidos en modules.css.
 *
 * Props: mod (módulo normalizado), accent, onCta(url) opcional.
 */
export default function ModuleContent({ mod, accent = '#22c55e', onCta }) {
  const p = mod.props || {}
  switch (mod.type) {
    case 'text':
      return (
        <div className={`mk-text mk-text--${p.size || 'lg'} mk-text--${p.align || 'left'}`}
          style={{ fontWeight: p.weight || 700, color: colorVar(p.color) }}>
          {p.text || ''}
        </div>
      )

    case 'image':
      return (
        <div className={`mk-image mk-image--${p.shape || 'rect'}`} style={{ borderRadius: p.shape === 'circle' ? '50%' : (p.radius || 12) }}>
          {p.url
            ? <img src={p.url} alt={p.alt || ''} style={{ objectFit: p.fit || 'cover' }} />
            : <span className="mk-image-ph"><VintageIcon name="waveform" size={28} /></span>}
        </div>
      )

    case 'avatar':
      return (
        <div className="mk-avatar">
          <div className="mk-avatar-img">
            {p.url ? <img src={p.url} alt={p.name || ''} /> : <span>{(p.name || '?').charAt(0)}</span>}
          </div>
          <div className="mk-avatar-text">
            <span className="mk-avatar-name">{p.name || ''}</span>
            {p.role && <span className="mk-avatar-role">{p.role}</span>}
          </div>
        </div>
      )

    case 'metrics':
      return (
        <div className={`mk-metrics mk-metrics--${p.style || 'dial'}`}>
          {(p.items || []).map((m, i) => (
            <div className="mk-metric" key={i}>
              <span className="mk-metric-val">{m.value}</span>
              <span className="mk-metric-label">{m.label}</span>
            </div>
          ))}
        </div>
      )

    case 'services':
      return (
        <div className="mk-services">
          {(p.items || []).map((s, i) => (
            <div className="mk-service" key={i}>
              <span className="mk-service-icon"><VintageIcon name={s.icon || 'waveform'} size={26} /></span>
              <span className="mk-service-title">{s.title || ''}</span>
              {s.desc && <span className="mk-service-desc">{s.desc}</span>}
            </div>
          ))}
        </div>
      )

    case 'skills':
      return (
        <div className="mk-skills">
          {(p.items || []).map((s, i) => (
            <div className="mk-skill" key={i}>
              <div className="mk-skill-head"><span>{s.label}</span><span>{s.pct}%</span></div>
              <div className="mk-skill-bar"><div className="mk-skill-fill" style={{ width: `${Math.max(0, Math.min(100, s.pct || 0))}%` }} /></div>
            </div>
          ))}
        </div>
      )

    case 'projects':
      return (
        <div className="mk-projects">
          {(p.items || []).map((pr, i) => {
            const inner = (
              <>
                <div className="mk-project-img">
                  {pr.imageUrl ? <img src={pr.imageUrl} alt={pr.title || ''} /> : <span className="mk-project-ph"><VintageIcon name="play" size={22} /></span>}
                </div>
                <span className="mk-project-title">{pr.title || ''}</span>
                {pr.subtitle && <span className="mk-project-sub">{pr.subtitle}</span>}
              </>
            )
            return pr.url
              ? <a className="mk-project" key={i} href={pr.url} target="_blank" rel="noopener noreferrer">{inner}</a>
              : <div className="mk-project" key={i}>{inner}</div>
          })}
        </div>
      )

    case 'list':
      return (
        <div className="mk-list">
          {p.title && <h4 className="mk-list-title">{p.title}</h4>}
          <ul>{(p.items || []).map((it, i) => <li key={i}>{it}</li>)}</ul>
        </div>
      )

    case 'banner-cta':
      return (
        <div className="mk-banner">
          <span className="mk-banner-text">{p.text || ''}</span>
          {p.url
            ? <a className="mk-banner-btn" href={p.url} target="_blank" rel="noopener noreferrer" onClick={() => onCta?.(p.url)}>{p.buttonLabel || 'Contáctame'}</a>
            : <span className="mk-banner-btn mk-banner-btn--dim">{p.buttonLabel || 'Contáctame'}</span>}
        </div>
      )

    case 'divider':
      return <div className={`mk-divider mk-divider--${p.style || 'orange-rule'}`} aria-hidden="true" />

    default:
      return null
  }
}

/** Mapea un nombre de color de props a un token de la paleta. */
function colorVar(c) {
  switch (c) {
    case 'orange': return 'var(--mk-orange)'
    case 'amber': return 'var(--mk-amber)'
    case 'wood': return 'var(--mk-wood)'
    case 'ink-dim': return 'var(--mk-ink-dim)'
    case 'ink':
    default: return 'var(--mk-ink)'
  }
}
