import React from 'react'
import { cablePath } from '../../../shared/domain/musicStudio.js'

/**
 * SynthCable — cable de parcheo con GRAVEDAD (cuelga como cuerda real) y un
 * JACK TS de 2.5 mm dibujado en cada punta. Puramente visual/interactivo.
 *
 * El jack se dibuja apuntando "hacia afuera" del cable (según el ángulo de la
 * tangente en la punta) para que al meterlo en un agujerito se vea natural.
 *
 * Props:
 *  - from {x,y}, to {x,y}
 *  - color, plugColor
 *  - restLength: longitud de reposo (para la gravedad). Si se pasa `sag`, manda.
 *  - sag: cuelgue fijo en px (compat). Si se omite, se calcula por gravedad.
 *  - grabbed: 'A' | 'B' | null — punta que el usuario está agarrando (se resalta).
 *  - plugged: { A?: boolean, B?: boolean } — puntas encajadas en un agujero.
 *  - animated: si true, un puntito viaja por el cable (señal).
 */
export default function SynthCable({
  from, to, color = '#2b2b30', plugColor = '#c9ccd2',
  restLength = 260, sag, grabbed = null, plugged = null, animated = false,
}) {
  const opts = (typeof sag === 'number') ? sag : { restLength, gravity: 0.55 }
  const d = cablePath(from.x, from.y, to.x, to.y, opts)

  // Ángulo de cada punta (para orientar el jack hacia afuera). Aproximamos la
  // tangente con la dirección hacia el punto medio colgado.
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
  const angA = Math.atan2(from.y - mid.y, from.x - mid.x) * 180 / Math.PI
  const angB = Math.atan2(to.y - mid.y, to.x - mid.x) * 180 / Math.PI

  return (
    <g className="synth-cable">
      {/* sombra del cable */}
      <path d={d} fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="8" strokeLinecap="round" transform="translate(0,3)" />
      {/* cuerpo del cable (goma) */}
      <path d={d} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" />
      {/* brillo superior */}
      <path d={d} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="2" strokeLinecap="round" />

      {animated && (
        <circle r="3" fill="#fff" opacity="0.9">
          <animateMotion dur="2.4s" repeatCount="indefinite" path={d} />
        </circle>
      )}

      <Jack25 x={from.x} y={from.y} angle={angA} color={plugColor} grabbed={grabbed === 'A'} plugged={plugged?.A} />
      <Jack25 x={to.x} y={to.y} angle={angB} color={plugColor} grabbed={grabbed === 'B'} plugged={plugged?.B} />
    </g>
  )
}

/**
 * Jack25 — conector TS de 2.5 mm dibujado a escala. Partes reales:
 *  - punta (tip) metálica redondeada
 *  - anillo aislante negro
 *  - manguito (sleeve) metálico
 *  - collar / alivio de tensión (donde entra el cable)
 * Orientado por `angle` (grados) para que "salga" del cable hacia el agujero.
 */
function Jack25({ x, y, angle = 0, color = '#cdd0d6', grabbed = false, plugged = false }) {
  return (
    <g
      className={`sc-jack ${grabbed ? 'is-grabbed' : ''} ${plugged ? 'is-plugged' : ''}`}
      transform={`translate(${x} ${y}) rotate(${angle})`}
    >
      {/* halo al agarrar / encajar */}
      {(grabbed || plugged) && (
        <circle className="sc-jack-halo" cx="0" cy="0" r="15"
          fill="none" stroke={grabbed ? '#D2683D' : '#CA9C68'} strokeWidth="2" opacity="0.85" />
      )}
      {/* La punta apunta en +x local (hacia afuera del cable). */}
      {/* Funda de goma / alivio de tensión (donde entra el cable). */}
      <rect x="-20" y="-5.5" width="12" height="11" rx="4" fill="#1c1c20" stroke="#3a3a42" strokeWidth="0.8" />
      <rect x="-20" y="-5.5" width="4" height="11" rx="2" fill="#2c2c32" />
      {/* Cuerpo metálico (manguito) con degradado simulado por capas. */}
      <rect x="-9" y="-5" width="11" height="10" rx="2.5" fill={color} stroke="#8b8e96" strokeWidth="0.8" />
      <rect x="-9" y="-5" width="11" height="3" rx="2" fill="rgba(255,255,255,0.35)" />
      <rect x="-9" y="2.4" width="11" height="2.6" rx="1.3" fill="rgba(0,0,0,0.25)" />
      {/* Anillo aislante negro (separa manguito y punta). */}
      <rect x="2" y="-4" width="2.6" height="8" rx="0.5" fill="#0e0e10" />
      {/* Punta (tip) cónica redondeada. */}
      <rect x="4.6" y="-3.4" width="6" height="6.8" rx="1" fill={color} stroke="#8b8e96" strokeWidth="0.8" />
      <path d="M 10.6 -3.4 Q 14.5 0 10.6 3.4 Z" fill={color} stroke="#8b8e96" strokeWidth="0.8" strokeLinejoin="round" />
      {/* Brillo metálico longitudinal. */}
      <rect x="-8" y="-3.2" width="18" height="1.3" rx="0.6" fill="rgba(255,255,255,0.55)" />
    </g>
  )
}

/**
 * SynthCablesBackground — capa decorativa de cables colgando (gravedad).
 * Detrás del contenido (pointer-events none).
 */
export function SynthCablesBackground({ accent = '#D2683D' }) {
  const cables = [
    { from: { x: 60, y: 40 }, to: { x: 340, y: 70 }, color: '#2b2b30' },
    { from: { x: 420, y: 30 }, to: { x: 700, y: 60 }, color: '#3a3a3e' },
    { from: { x: 120, y: 190 }, to: { x: 520, y: 210 }, color: '#2b2b30' },
  ]
  return (
    <svg className="synth-cables-bg" viewBox="0 0 760 280" preserveAspectRatio="none" aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.6, pointerEvents: 'none' }}>
      {cables.map((c, i) => <SynthCable key={i} {...c} restLength={360} />)}
    </svg>
  )
}
