import React, { useRef, useCallback } from 'react'
import { knobAngle } from '../../../shared/domain/musicStudio.js'
import './music.css'

/**
 * Knob — a vintage rotary knob. Drag up/down (or left/right) to turn it.
 * value 0..1. Sweeps -135°..+135°. Keyboard accessible (arrows).
 *
 * Props: value, onChange(v), size, label, accent, leftLabel, rightLabel
 */
export default function Knob({ value = 0.5, onChange, size = 84, label, accent = '#22C55E', leftLabel, rightLabel }) {
  const ref = useRef(null)
  const dragging = useRef(false)
  const startY = useRef(0)
  const startVal = useRef(0.5)

  const angle = knobAngle(value)

  const onDown = useCallback((e) => {
    dragging.current = true
    startY.current = e.clientY
    startVal.current = value
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }, [value])

  const onMove = useCallback((e) => {
    if (!dragging.current) return
    const dy = startY.current - e.clientY  // up = increase
    const next = Math.max(0, Math.min(1, startVal.current + dy / 200))
    onChange?.(next)
  }, [onChange])

  const onUp = useCallback((e) => {
    dragging.current = false
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }, [])

  function onKey(e) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); onChange?.(Math.min(1, value + 0.05)) }
    if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); onChange?.(Math.max(0, value - 0.05)) }
  }

  return (
    <div className="knob-wrap" style={{ width: size }}>
      <div
        ref={ref}
        className="knob"
        style={{ width: size, height: size, '--accent': accent }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onKeyDown={onKey}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        aria-label={label || 'Perilla'}
        tabIndex={0}
      >
        {/* ticks + números 0..10 (estilo synth vintage) */}
        <svg className="knob-ticks" viewBox="0 0 100 100" aria-hidden="true">
          {Array.from({ length: 11 }).map((_, i) => {
            const a = (-135 + (i / 10) * 270) * (Math.PI / 180)
            const major = i % 5 === 0
            const r1 = major ? 41 : 44
            const x1 = 50 + Math.sin(a) * r1, y1 = 50 - Math.cos(a) * r1
            const x2 = 50 + Math.sin(a) * 48, y2 = 50 - Math.cos(a) * 48
            const nx = 50 + Math.sin(a) * 34, ny = 50 - Math.cos(a) * 34
            return (
              <g key={i}>
                <line x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={major ? 'rgba(232,220,192,0.85)' : 'rgba(232,220,192,0.4)'}
                  strokeWidth={major ? 2 : 1} strokeLinecap="round" />
                {major && (
                  <text x={nx} y={ny + 3} textAnchor="middle" fontSize="9"
                    fill="rgba(232,220,192,0.75)" fontFamily="'Arial Narrow', system-ui">{i}</text>
                )}
              </g>
            )
          })}
        </svg>
        <div className="knob-body">
          <div className="knob-skirt" aria-hidden="true" />
          <div className="knob-cap" aria-hidden="true" />
          <div className="knob-indicator" style={{ transform: `rotate(${angle}deg)` }}>
            <span className="knob-pointer" style={{ background: accent, boxShadow: `0 0 6px ${accent}` }} />
          </div>
          <span className="knob-center" aria-hidden="true" />
        </div>
      </div>
      {(leftLabel || rightLabel) && (
        <div className="knob-endlabels"><span>{leftLabel}</span><span>{rightLabel}</span></div>
      )}
      {label && <span className="knob-label">{label}</span>}
    </div>
  )
}
