import React from 'react'

/**
 * TubeGlow — bulbo incandescente decorativo (vidrio + filamento hairpin + halo
 * ámbar). Respira suave por CSS; si recibe `level` (0..1) sube su brillo con la
 * música. Puramente decorativo: pointer-events:none, aria-hidden.
 *
 * Props:
 *  - on: boolean (encendido). Default true.
 *  - level: number 0..1 opcional — modula intensidad del halo.
 *  - size: px del bulbo. Default 44.
 *  - hue: color del glow (default ámbar var(--vt-amber)).
 */
export default function TubeGlow({ on = true, level = null, size = 44, hue }) {
  // Intensidad: base de respiración (CSS) o reactiva al nivel si se pasa.
  const reactive = level != null
  const glow = reactive ? 0.35 + Math.min(1, level) * 0.65 : 1
  const w = size, h = Math.round(size * 1.55)
  return (
    <div
      className={`tube-glow ${on ? 'is-on' : 'is-off'} ${reactive ? 'is-reactive' : ''}`}
      style={{ width: w, height: h, '--tube-glow-hue': hue || 'var(--vt-amber, #ffb347)', '--tube-glow-i': glow }}
      aria-hidden="true"
    >
      <div className="tube-glow-halo" />
      <svg viewBox="0 0 44 68" width={w} height={h} className="tube-glow-svg">
        {/* casquillo metálico */}
        <rect x="14" y="52" width="16" height="12" rx="2" className="tube-cap" />
        <line x1="17" y1="64" x2="17" y2="67" className="tube-pin" />
        <line x1="22" y1="64" x2="22" y2="67" className="tube-pin" />
        <line x1="27" y1="64" x2="27" y2="67" className="tube-pin" />
        {/* vidrio */}
        <path d="M10 30 Q10 8 22 6 Q34 8 34 30 L34 52 L10 52 Z" className="tube-glass" />
        {/* reflejo */}
        <path d="M14 14 Q16 10 20 10" className="tube-reflect" />
        {/* filamento hairpin */}
        <path d="M18 48 L18 26 Q18 20 22 20 Q26 20 26 26 L26 48" className="tube-filament" />
      </svg>
    </div>
  )
}
