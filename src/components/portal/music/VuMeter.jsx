import React, { useEffect, useRef, useState } from 'react'
import { vuAngle } from '../../../shared/domain/patchGraph.js'

/**
 * VuMeter — medidor de nivel vintage. Dos estilos:
 *  - 'needle'   : carátula crema con aguja roja y "ballistics" (suavizado tipo VU real).
 *  - 'dotmatrix': columna de puntos verde/ámbar/rojo que suben con el nivel.
 *
 * La lógica de mapeo nivel→ángulo es pura (vuAngle en shared/domain). Aquí solo
 * se suaviza el valor con rAF para que la aguja no salte digital. reduced-motion
 * congela el suavizado (muestra el nivel directo, sin animar).
 *
 * Props:
 *  - level: number 0..1 (nivel de entrada, ya calculado por el motor de audio).
 *  - style: 'needle' | 'dotmatrix'. Default 'needle'.
 *  - accent: color (para dotmatrix zona media, opcional).
 *  - size: ancho en px. Default 120.
 *  - label: texto serigrafiado. Default 'VU'.
 */
export default function VuMeter({ level = 0, style = 'needle', accent = '#22c55e', size = 120, label = 'VU' }) {
  const [smooth, setSmooth] = useState(0)
  const rafRef = useRef(0)
  const targetRef = useRef(0)
  const valRef = useRef(0)
  const reduced = useRef(false)

  useEffect(() => {
    reduced.current = typeof window !== 'undefined' &&
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  useEffect(() => { targetRef.current = Math.max(0, Math.min(1, level || 0)) }, [level])

  useEffect(() => {
    if (reduced.current) { setSmooth(targetRef.current); return }
    const tick = () => {
      const t = targetRef.current
      // ballistics: sube rápido (attack), cae lento (release) como un VU real.
      const cur = valRef.current
      const k = t > cur ? 0.5 : 0.08
      valRef.current = cur + (t - cur) * k
      setSmooth(valRef.current)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  if (style === 'dotmatrix') {
    return <DotMatrix level={smooth} accent={accent} size={size} label={label} />
  }

  const h = Math.round(size * 0.66)
  const needle = vuAngle(smooth)
  const rad = (deg) => (deg * Math.PI) / 180
  return (
    <div className="vu vu--needle" style={{ width: size, '--accent': accent }}>
      <svg viewBox="0 0 120 80" width={size} height={h} className="vu-svg">
        <defs>
          <linearGradient id="vu-glass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="rgba(255,255,255,0.35)" />
            <stop offset="0.5" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="116" height="76" rx="8" className="vu-face" />
        <rect x="2" y="2" width="116" height="76" rx="8" fill="url(#vu-glass)" />
        <g transform="translate(60,66)">
          {Array.from({ length: 11 }).map((_, i) => {
            const a = rad(vuAngle(i / 10))
            const hot = i > 7
            return (
              <line key={i}
                x1={Math.sin(a) * 46} y1={-Math.cos(a) * 46}
                x2={Math.sin(a) * 52} y2={-Math.cos(a) * 52}
                stroke={hot ? '#d9483b' : '#3a2f1a'} strokeWidth={hot ? 1.6 : 1.1} />
            )
          })}
          {/* arco de la escala */}
          <path d={arc(46)} className="vu-arc" />
          <line x1="0" y1="0" x2={Math.sin(rad(needle)) * 50} y2={-Math.cos(rad(needle)) * 50} className="vu-needle" />
          <circle r="4.5" className="vu-pivot" />
        </g>
        <text x="60" y="20" textAnchor="middle" className="vu-label">{label}</text>
      </svg>
    </div>
  )
}

function DotMatrix({ level, accent, size, label }) {
  const rows = 12
  const lit = Math.round(level * rows)
  const h = Math.round(size * 1.1)
  return (
    <div className="vu vu--dot" style={{ width: size * 0.5, '--accent': accent }}>
      <div className="vu-dot-frame" style={{ height: h }}>
        {Array.from({ length: rows }).map((_, i) => {
          const idx = rows - 1 - i // pinta de arriba (rojo) a abajo (verde)
          const on = idx < lit
          const zone = idx >= rows - 2 ? 'hot' : idx >= rows - 5 ? 'warm' : 'ok'
          return <span key={i} className={`vu-dot ${on ? 'on' : ''} vu-dot--${zone}`} />
        })}
      </div>
      <span className="vu-dot-label">{label}</span>
    </div>
  )
}

// arco SVG de la escala del VU (de -50° a +50°, radio r)
function arc(r) {
  const a0 = (vuAngle(0) * Math.PI) / 180
  const a1 = (vuAngle(1) * Math.PI) / 180
  const x0 = Math.sin(a0) * r, y0 = -Math.cos(a0) * r
  const x1 = Math.sin(a1) * r, y1 = -Math.cos(a1) * r
  return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`
}
