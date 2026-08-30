import React, { useEffect, useRef, useState } from 'react'
import './music.css'

/**
 * TapeReels — dos carretes de cinta magnética estilo casete. Giran cuando
 * `playing` es true; al detenerse, DESACELERAN con inercia (no paran seco).
 * La cinta se "transfiere" del carrete izquierdo al derecho según `progress`
 * (0..1): el hub izquierdo se ve lleno al inicio y se vacía; el derecho al revés.
 *
 * Respeta prefers-reduced-motion (se queda estático).
 *
 * Props:
 *   playing   bool   — hay audio sonando
 *   progress  0..1   — avance de la pista
 *   title     string — etiqueta escrita del casete
 *   accent
 *   size      px (ancho del casete)
 */
export default function TapeReels({ playing = false, progress = 0, title = '', accent = '#22c55e', size = 220 }) {
  const [spin, setSpin] = useState(0)          // ángulo acumulado (grados)
  const velRef = useRef(0)                      // velocidad angular (deg/frame)
  const rafRef = useRef(0)
  const reduced = useRef(
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false
  )

  useEffect(() => {
    if (reduced.current) return
    const TARGET = 3.2          // deg/frame a máxima velocidad (~192°/s @60fps)
    const ACCEL = 0.12          // qué tan rápido alcanza la velocidad objetivo
    const FRICTION = 0.94       // desaceleración por inercia al parar
    const loop = () => {
      const target = playing ? TARGET : 0
      // aproximación suave a la velocidad objetivo (acelera) + fricción (frena)
      velRef.current += (target - velRef.current) * ACCEL
      if (!playing) velRef.current *= FRICTION
      if (Math.abs(velRef.current) < 0.02 && !playing) velRef.current = 0
      if (velRef.current !== 0) setSpin(s => (s + velRef.current) % 360)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing])

  // Radio de cinta en cada hub según el progreso (izq se vacía, der se llena).
  const p = Math.max(0, Math.min(1, progress))
  const rMin = 12, rMax = 26
  const rLeft = rMax - (rMax - rMin) * p
  const rRight = rMin + (rMax - rMin) * p
  const w = size, h = size * 0.62

  const Reel = ({ cx, tapeR }) => (
    <g transform={`translate(${cx},${h / 2})`}>
      {/* cinta enrollada (marrón) */}
      <circle r={tapeR} fill="#5a3d28" stroke="#3a2718" strokeWidth="1.5" />
      {/* hub que gira */}
      <g style={reduced.current ? undefined : { transform: `rotate(${spin}deg)`, transformOrigin: 'center', transformBox: 'fill-box' }}>
        <circle r="11" className="tr-hub" />
        {/* dientes del hub */}
        {Array.from({ length: 6 }).map((_, i) => {
          const a = (i / 6) * Math.PI * 2
          return <rect key={i} x={-1.4} y={-11} width="2.8" height="6" rx="1"
            transform={`rotate(${(a * 180) / Math.PI})`} className="tr-tooth" />
        })}
        <circle r="3" fill="#1a1a1e" />
      </g>
    </g>
  )

  return (
    <div className="tape-reels" style={{ width: w, '--accent': accent }}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" aria-hidden="true">
        {/* carcasa del casete */}
        <rect x="1" y="1" width={w - 2} height={h - 2} rx="10" className="tr-shell" />
        {/* ventana */}
        <rect x={w * 0.12} y={h * 0.18} width={w * 0.76} height={h * 0.5} rx="6" className="tr-window" />
        <Reel cx={w * 0.32} tapeR={rLeft} />
        <Reel cx={w * 0.68} tapeR={rRight} />
        {/* cinta entre carretes */}
        <line x1={w * 0.32} y1={h / 2 + 2} x2={w * 0.68} y2={h / 2 + 2} stroke="#3a2718" strokeWidth="2" opacity="0.7" />
      </svg>
      {title && <div className="tr-label"><span>{title}</span></div>}
    </div>
  )
}
