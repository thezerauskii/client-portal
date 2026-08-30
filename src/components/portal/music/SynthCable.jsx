import React from 'react'
import { cablePath } from '../../../shared/domain/musicStudio.js'

/**
 * SynthCable — a decorative patch cable (SVG bezier with gravity sag), like
 * u-he ACE synth cables. Purely visual. Give it two points and a color.
 *
 * Props: from {x,y}, to {x,y}, color, sag, plugColor
 */
export default function SynthCable({ from, to, color = '#3a3a3e', sag = 52, animated = false, inFlight = false }) {
  // Cable FÍSICO estilo Korg/Arturia: goma gruesa, plug metálico, sombra
  // proyectada, curva con gravedad. Sin "chispa" corriendo dentro. El rebote al
  // conectar lo da la clase .is-landed (CSS) cuando NO está en vuelo.
  const d = cablePath(from.x, from.y, to.x, to.y, sag)
  return (
    <g className={`synth-cable ${inFlight ? 'is-flight' : 'is-landed'}`}>
      {/* sombra proyectada sobre el panel */}
      <path d={d} fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="9" strokeLinecap="round" transform="translate(1,4)" />
      {/* núcleo de goma (oscuro) */}
      <path d={d} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" />
      {/* highlight superior (luz sobre la goma) */}
      <path d={d} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="2.5" strokeLinecap="round" transform="translate(0,-1)" />
      {/* plugs metálicos (cilindro gris con banda) en ambos extremos */}
      <Plug x={from.x} y={from.y} />
      <Plug x={to.x} y={to.y} />
    </g>
  )
}

/** Plug metálico realista (cabeza de conector jack). */
function Plug({ x, y }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle r="7.5" className="cable-plug-base" />
      <circle r="5" className="cable-plug-metal" />
      <rect x="-5" y="-1.4" width="10" height="2.8" className="cable-plug-band" />
      <circle r="1.6" className="cable-plug-tip" />
    </g>
  )
}

/**
 * SynthCablesBackground — a full-bleed decorative layer of a few looping cables.
 * Sits behind content (pointer-events none).
 */
export function SynthCablesBackground({ accent = '#f472b6' }) {
  const cables = [
    { from: { x: 60, y: 40 }, to: { x: 340, y: 120 }, color: accent, sag: 60 },
    { from: { x: 420, y: 30 }, to: { x: 700, y: 90 }, color: '#60a5fa', sag: 80 },
    { from: { x: 120, y: 200 }, to: { x: 520, y: 240 }, color: '#a78bfa', sag: 50 },
  ]
  return (
    <svg className="synth-cables-bg" viewBox="0 0 760 280" preserveAspectRatio="none" aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.5, pointerEvents: 'none' }}>
      {cables.map((c, i) => <SynthCable key={i} {...c} />)}
    </svg>
  )
}
