import React from 'react'
import { cablePath } from '../../../shared/domain/musicStudio.js'

/**
 * SynthCable — a decorative patch cable (SVG bezier with gravity sag), like
 * u-he ACE synth cables. Purely visual. Give it two points and a color.
 *
 * Props: from {x,y}, to {x,y}, color, sag, plugColor
 */
export default function SynthCable({ from, to, color = '#f472b6', sag = 46, animated = true }) {
  const d = cablePath(from.x, from.y, to.x, to.y, sag)
  return (
    <g className="synth-cable">
      {/* shadow */}
      <path d={d} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="7" strokeLinecap="round" transform="translate(0,2)" />
      {/* cable */}
      <path d={d} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" />
      {/* highlight */}
      <path d={d} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" />
      {/* plugs */}
      <circle cx={from.x} cy={from.y} r="6" fill="#1a1a1e" stroke={color} strokeWidth="2.5" />
      <circle cx={to.x} cy={to.y} r="6" fill="#1a1a1e" stroke={color} strokeWidth="2.5" />
      {animated && (
        <circle r="3" fill="#fff">
          <animateMotion dur="2.4s" repeatCount="indefinite" path={d} />
        </circle>
      )}
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
