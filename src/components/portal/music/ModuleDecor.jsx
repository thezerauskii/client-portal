import React from 'react'

/**
 * ModuleDecor — módulos de DECORACIÓN de fondo (Fase 15). IDÉNTICO en Electron
 * y portal. Renderiza:
 *  - glow-light: mancha de luz radial/haz, color e intensidad configurables,
 *    on/off y parpadeo opcional. Sirve como "luz" del fondo, movible/resizeable.
 *  - panel-frame: superficie/marco vintage (mezclador/sinte) donde montar otros
 *    módulos encima. Variantes: solid | frame | screen | slot; formas y tornillos.
 */
export default function ModuleDecor({ mod, accent = '#D2683D' }) {
  const p = mod.props || {}
  if (mod.type === 'glow-light') return <GlowLight p={p} accent={accent} />
  if (mod.type === 'panel-frame') return <PanelFrame p={p} accent={accent} />
  return null
}

function GlowLight({ p, accent }) {
  const on = p.on !== false
  const color = p.color || accent
  const intensity = Math.max(0, Math.min(1, Number(p.intensity) ?? 0.6))
  const shape = p.shape === 'beam' ? 'beam' : 'radial'
  const style = {
    '--glow-color': color,
    '--glow-op': on ? intensity : 0,
    mixBlendMode: p.blend || 'screen',
  }
  return (
    <div
      className={`mk-glow mk-glow--${shape} ${on ? 'is-on' : ''} ${p.flicker ? 'mk-glow--flicker' : ''}`}
      style={style}
      aria-hidden="true"
    />
  )
}

function PanelFrame({ p, accent }) {
  const variant = ['solid', 'frame', 'screen', 'slot'].includes(p.variant) ? p.variant : 'frame'
  const shape = ['rect', 'rounded', 'pill'].includes(p.shape) ? p.shape : 'rect'
  const radius = shape === 'pill' ? 999 : shape === 'rounded' ? Math.max(0, Number(p.radius) || 16) : Math.max(0, Number(p.radius) ?? 16)
  const style = {
    '--panel-color': p.color || '#2B2F2E',
    '--panel-border': p.border || '#594C3D',
    '--panel-accent': accent,
    borderRadius: radius,
  }
  return (
    <div className={`mk-panel mk-panel--${variant}`} style={style} aria-hidden={p.label ? undefined : 'true'}>
      {p.screws && variant !== 'solid' && (
        <>
          <span className="mk-panel-screw mk-panel-screw--tl" />
          <span className="mk-panel-screw mk-panel-screw--tr" />
          <span className="mk-panel-screw mk-panel-screw--bl" />
          <span className="mk-panel-screw mk-panel-screw--br" />
        </>
      )}
      {p.label ? <span className="mk-panel-label">{p.label}</span> : null}
    </div>
  )
}
