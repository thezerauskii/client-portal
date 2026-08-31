import React, { useState, useRef, useEffect } from 'react'
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
    case 'hero-combo':
      return (
        <div className={`mk-hero mk-hero--${p.align || 'center'}`}>
          <h1 className="mk-hero-title">{p.headline || ''}</h1>
          {p.tagline && <p className="mk-hero-tagline">{p.tagline}</p>}
          {(p.metrics || []).length > 0 && (
            <div className="mk-hero-metrics">
              {(p.metrics || []).map((m, i) => (
                <div className="mk-hero-metric" key={i}>
                  <span className="mk-hero-metric-val">{m.value}</span>
                  <span className="mk-hero-metric-label">{m.label}</span>
                </div>
              ))}
            </div>
          )}
          {p.ctaLabel && (
            p.ctaUrl
              ? <a className="mk-hero-cta" href={p.ctaUrl} target="_blank" rel="noopener noreferrer" onClick={() => onCta?.(p.ctaUrl)}>{p.ctaLabel}</a>
              : <span className="mk-hero-cta mk-hero-cta--dim">{p.ctaLabel}</span>
          )}
        </div>
      )

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
            ? <img src={p.url} alt={p.alt || ''} style={{ objectFit: p.fit || 'cover', transform: `${p.flipH ? 'scaleX(-1) ' : ''}${p.flipV ? 'scaleY(-1)' : ''}`.trim() || undefined }} />
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

    // ── Fase 14 — módulos interactivos vintage (idénticos en Electron/portal) ──
    case 'icon-row':
      return <IconRow p={p} onCta={onCta} />
    case 'vinyl-player':
      return <VinylPlayer p={p} onCta={onCta} />
    case 'reveal-slider':
      return <RevealSlider p={p} />
    case 'marquee-ticker':
      return <MarqueeTicker p={p} />
    case 'price-tiers':
      return <PriceTiers p={p} onCta={onCta} />
    case 'faq-accordion':
      return <FaqAccordion p={p} />
    case 'process-steps':
      return <ProcessSteps p={p} />
    case 'countdown-offer':
      return <CountdownOffer p={p} onCta={onCta} />
    case 'audio-cards':
      return <AudioCards p={p} onCta={onCta} />
    case 'cta-banner-neon':
      return <CtaBannerNeon p={p} onCta={onCta} />

    default:
      return null
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * Fase 14 — subcomponentes interactivos vintage. IDÉNTICOS en Electron y portal.
 * Controles = diseño/interacción, NO audio real: sliders revelan imágenes,
 * botones disparan animación, cosas que se mueven solas → llevan al CTA.
 * Respetan prefers-reduced-motion vía CSS (clases .mk-*).
 * ──────────────────────────────────────────────────────────────────────────*/

/** Fila de iconos grandes con "encendido" al pasar el cursor. Clickeables si tienen url. */
function IconRow({ p, onCta, editable }) {
  const items = p.items || []
  return (
    <div className="mk-iconrow">
      {p.title ? <h4 className="mk-iconrow-title">{p.title}</h4> : null}
      <div className="mk-iconrow-grid">
        {items.map((it, i) => {
          const inner = (
            <>
              <span className="mk-iconrow-icon"><VintageIcon name={it.icon || 'note'} size={44} strokeWidth={1.4} /></span>
              <span className="mk-iconrow-label">{it.label || ''}</span>
            </>
          )
          return (it.url && !editable)
            ? <a className="mk-iconrow-item mk-iconrow-item--link" key={i} style={{ '--i': i }} href={it.url} target="_blank" rel="noopener noreferrer" onClick={() => onCta?.(it.url)}>{inner}</a>
            : <div className={`mk-iconrow-item ${it.url ? 'mk-iconrow-item--link' : ''}`} key={i} style={{ '--i': i }}>{inner}</div>
        })}
      </div>
    </div>
  )
}

/** Tocadiscos: el disco GIRA visualmente (autospin o al reproducir). Si hay
 *  audio subido, el botón lo reproduce/pausa (requiere gesto de usuario). */
function VinylPlayer({ p, onCta, editable }) {
  const audioUrl = p.audio?.url || ''
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef(null)
  const spinning = playing || (!!p.autospin)
  const toggle = (e) => {
    e.stopPropagation()
    const el = audioRef.current
    if (audioUrl && el) {
      if (el.paused) { el.play?.().then(() => setPlaying(true)).catch(() => setPlaying(false)) }
      else { el.pause?.(); setPlaying(false) }
    } else {
      setPlaying(s => !s)
    }
  }
  const hasAudio = !!audioUrl
  const label = hasAudio ? (playing ? 'Parar' : 'Reproducir') : (spinning ? 'Parar' : 'Girar')
  return (
    <div className="mk-vinyl">
      <div className="mk-vinyl-deck">
        <div className={`mk-vinyl-disc ${spinning ? 'is-spinning' : ''}`}>
          {p.coverUrl ? <img className="mk-vinyl-cover" src={p.coverUrl} alt={p.title || ''} /> : <span className="mk-vinyl-cover mk-vinyl-cover--ph"><VintageIcon name="vinyl" size={40} /></span>}
          <span className="mk-vinyl-hole" />
        </div>
        <span className={`mk-vinyl-arm ${spinning ? 'is-playing' : ''}`} aria-hidden="true" />
      </div>
      <div className="mk-vinyl-info">
        <span className="mk-vinyl-title">{p.title || ''}</span>
        <span className="mk-vinyl-sub">{p.subtitle || ''}</span>
      </div>
      <button type="button" className="mk-vinyl-btn" onClick={toggle} onPointerDown={(e) => e.stopPropagation()}>
        <VintageIcon name={(hasAudio ? playing : spinning) ? 'pause' : 'play'} size={16} /> {label}
      </button>
      {audioUrl ? <audio ref={audioRef} src={audioUrl} crossOrigin="anonymous" onEnded={() => setPlaying(false)} onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} preload="none" /> : null}
      {p.url && !editable ? <a className="mk-vinyl-link" href={p.url} target="_blank" rel="noopener noreferrer" onClick={() => onCta?.(p.url)}>Escuchar</a> : null}
    </div>
  )
}

/** Slider revelador: arrastra el tirador para descubrir la imagen "después". */
function RevealSlider({ p }) {
  const [pos, setPos] = useState(50) // % visible de "después"
  const wrapRef = useRef(null)
  const dragging = useRef(false)
  const setFromClientX = (clientX) => {
    const el = wrapRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const pct = ((clientX - r.left) / r.width) * 100
    setPos(Math.max(0, Math.min(100, pct)))
  }
  const onDown = (e) => { e.stopPropagation(); dragging.current = true; setFromClientX(e.clientX ?? e.touches?.[0]?.clientX) }
  useEffect(() => {
    const move = (e) => { if (dragging.current) setFromClientX(e.clientX ?? e.touches?.[0]?.clientX) }
    const up = () => { dragging.current = false }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
  }, [])
  return (
    <div className="mk-reveal" ref={wrapRef}>
      <div className="mk-reveal-img mk-reveal-before">
        {p.beforeUrl ? <img src={p.beforeUrl} alt={p.labelBefore || 'Antes'} /> : <span className="mk-reveal-ph"><VintageIcon name="waveform" size={28} /></span>}
        <span className="mk-reveal-tag mk-reveal-tag--before">{p.labelBefore || 'Antes'}</span>
      </div>
      <div className="mk-reveal-img mk-reveal-after" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
        {p.afterUrl ? <img src={p.afterUrl} alt={p.labelAfter || 'Después'} /> : <span className="mk-reveal-ph"><VintageIcon name="signal" size={28} /></span>}
        <span className="mk-reveal-tag mk-reveal-tag--after">{p.labelAfter || 'Después'}</span>
      </div>
      <div className="mk-reveal-handle" style={{ left: `${pos}%` }} onPointerDown={onDown} role="slider" aria-valuenow={Math.round(pos)} aria-label={p.label || 'Revelar'}>
        <span className="mk-reveal-grip"><VintageIcon name="sliders" size={16} /></span>
      </div>
      {p.label ? <span className="mk-reveal-hint">{p.label}</span> : null}
    </div>
  )
}

/** Ticker marquesina: texto que se desplaza en bucle (velocidad configurable). */
function MarqueeTicker({ p }) {
  const speed = Math.max(6, Math.min(120, Number(p.speed) || 30))
  const sep = p.separator || '✦'
  const chunk = (p.text || '').trim() || 'MEZCLA · MASTER · PRODUCCIÓN'
  const unit = `${chunk}   ${sep}   `
  return (
    <div className="mk-marquee" aria-label={chunk}>
      <div className="mk-marquee-track" style={{ animationDuration: `${Math.max(6, 1200 / speed)}s` }}>
        <span className="mk-marquee-unit">{unit.repeat(4)}</span>
        <span className="mk-marquee-unit" aria-hidden="true">{unit.repeat(4)}</span>
      </div>
    </div>
  )
}

/** Tabla de precios (3 niveles). Hover glow; el "featured" resalta. */
function PriceTiers({ p, onCta, editable }) {
  const tiers = p.tiers || []
  return (
    <div className="mk-tiers">
      {tiers.map((t, i) => (
        <div className={`mk-tier ${t.featured ? 'is-featured' : ''}`} key={i}>
          {t.featured ? <span className="mk-tier-badge">Popular</span> : null}
          <span className="mk-tier-name">{t.name || ''}</span>
          <span className="mk-tier-price"><b>${t.price || '0'}</b><em>{t.period || ''}</em></span>
          <ul className="mk-tier-features">
            {(t.features || []).map((f, j) => {
              const text = typeof f === 'string' ? f : (f?.text || '')
              const icon = (typeof f === 'object' && f?.icon) ? f.icon : 'signal'
              return <li key={j}><VintageIcon name={icon} size={16} /> {text}</li>
            })}
          </ul>
          {t.url && !editable
            ? <a className="mk-tier-cta" href={t.url} target="_blank" rel="noopener noreferrer" onClick={() => onCta?.(t.url)}>{t.ctaLabel || 'Elegir'}</a>
            : <span className="mk-tier-cta mk-tier-cta--dim">{t.ctaLabel || 'Elegir'}</span>}
        </div>
      ))}
    </div>
  )
}

/** Acordeón de preguntas frecuentes. Abre/cierra con clic. */
function FaqAccordion({ p }) {
  const [open, setOpen] = useState(0)
  const items = p.items || []
  return (
    <div className="mk-faq">
      {p.title ? <h4 className="mk-faq-title">{p.title}</h4> : null}
      {items.map((it, i) => (
        <div className={`mk-faq-item ${open === i ? 'is-open' : ''}`} key={i}>
          <button type="button" className="mk-faq-q" onClick={(e) => { e.stopPropagation(); setOpen(open === i ? -1 : i) }} onPointerDown={(e) => e.stopPropagation()}>
            <span>{it.q || ''}</span>
            <span className="mk-faq-chevron" aria-hidden="true">＋</span>
          </button>
          <div className="mk-faq-a"><p>{it.a || ''}</p></div>
        </div>
      ))}
    </div>
  )
}

/** Pasos del proceso 1→2→3→4 con línea conectora y numeración. */
function ProcessSteps({ p }) {
  const steps = p.steps || []
  return (
    <div className="mk-steps">
      {steps.map((s, i) => (
        <div className="mk-step" key={i} style={{ '--i': i }}>
          <span className="mk-step-num">{i + 1}</span>
          <span className="mk-step-icon"><VintageIcon name={s.icon || 'note'} size={26} /></span>
          <span className="mk-step-title">{s.title || ''}</span>
          <span className="mk-step-desc">{s.desc || ''}</span>
          {i < steps.length - 1 ? <span className="mk-step-link" aria-hidden="true" /> : null}
        </div>
      ))}
    </div>
  )
}

/** Cuenta atrás de oferta → urgencia → CTA. Se actualiza cada segundo. */
function CountdownOffer({ p, onCta, editable }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const target = p.deadline ? Date.parse(p.deadline) : NaN
  const hasDeadline = Number.isFinite(target)
  const diff = hasDeadline ? target - now : NaN
  const expired = hasDeadline && diff <= 0
  const parts = (() => {
    if (!hasDeadline || expired) return null
    const s = Math.floor(diff / 1000)
    return {
      d: Math.floor(s / 86400),
      h: Math.floor((s % 86400) / 3600),
      m: Math.floor((s % 3600) / 60),
      s: s % 60,
    }
  })()
  const pad = (n) => String(n).padStart(2, '0')
  return (
    <div className={`mk-countdown ${expired ? 'is-expired' : ''}`}>
      <span className="mk-countdown-text">{expired ? (p.expiredText || 'La oferta terminó') : (p.text || 'Oferta por tiempo limitado')}</span>
      {parts ? (
        <div className="mk-countdown-clock">
          {[['d', parts.d], ['h', parts.h], ['m', parts.m], ['s', parts.s]].map(([k, v]) => (
            <span className="mk-countdown-cell" key={k}><b>{pad(v)}</b><em>{k}</em></span>
          ))}
        </div>
      ) : (!hasDeadline ? <div className="mk-countdown-clock mk-countdown-clock--ph"><span className="mk-countdown-cell"><b>--</b><em>d</em></span><span className="mk-countdown-cell"><b>--</b><em>h</em></span><span className="mk-countdown-cell"><b>--</b><em>m</em></span><span className="mk-countdown-cell"><b>--</b><em>s</em></span></div> : null)}
      {p.url && !editable && !expired
        ? <a className="mk-countdown-btn" href={p.url} target="_blank" rel="noopener noreferrer" onClick={() => onCta?.(p.url)}>{p.buttonLabel || 'Aprovechar'}</a>
        : <span className="mk-countdown-btn mk-countdown-btn--dim">{p.buttonLabel || 'Aprovechar'}</span>}
    </div>
  )
}

/** Tarjetas de audio: portada + play. Si la tarjeta tiene audio subido, lo
 *  reproduce localmente; sólo una suena a la vez. */
function AudioCards({ p, onCta, editable }) {
  const [active, setActive] = useState(-1)
  const audioRef = useRef(null)
  const items = p.items || []
  const activeUrl = active >= 0 ? (items[active]?.audio?.url || '') : ''
  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    if (activeUrl) { el.play?.().catch(() => {}) } else { el.pause?.() }
  }, [activeUrl, active])
  const toggle = (i) => setActive(a => (a === i ? -1 : i))
  return (
    <div className="mk-audiocards">
      {p.title ? <h4 className="mk-audiocards-title">{p.title}</h4> : null}
      <div className="mk-audiocards-grid">
        {items.map((it, i) => (
          <div className={`mk-audiocard ${active === i ? 'is-active' : ''}`} key={i}>
            <div className="mk-audiocard-cover">
              {it.coverUrl ? <img src={it.coverUrl} alt={it.title || ''} /> : <span className="mk-audiocard-ph"><VintageIcon name="disc" size={30} /></span>}
              <button type="button" className="mk-audiocard-play" onClick={(e) => { e.stopPropagation(); toggle(i) }} onPointerDown={(e) => e.stopPropagation()} aria-label={active === i ? 'Pausar' : 'Reproducir'}>
                <VintageIcon name={active === i ? 'pause' : 'play'} size={18} />
              </button>
            </div>
            <span className="mk-audiocard-title">{it.title || ''}</span>
            <span className="mk-audiocard-sub">{it.subtitle || ''}</span>
            {it.url && !editable ? <a className="mk-audiocard-link" href={it.url} target="_blank" rel="noopener noreferrer" onClick={() => onCta?.(it.url)}>Abrir</a> : null}
          </div>
        ))}
      </div>
      {activeUrl ? <audio ref={audioRef} src={activeUrl} crossOrigin="anonymous" onEnded={() => setActive(-1)} preload="none" /> : null}
    </div>
  )
}

/** Banner CTA con glow neón pulsante. Empuja al clic. */
function CtaBannerNeon({ p, onCta, editable }) {
  return (
    <div className={`mk-neon mk-neon--${p.color || 'amber'}`}>
      <span className="mk-neon-text">{p.text || ''}</span>
      {p.url && !editable
        ? <a className="mk-neon-btn" href={p.url} target="_blank" rel="noopener noreferrer" onClick={() => onCta?.(p.url)}>{p.buttonLabel || 'Contáctame'}</a>
        : <span className="mk-neon-btn mk-neon-btn--dim">{p.buttonLabel || 'Contáctame'}</span>}
    </div>
  )
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
