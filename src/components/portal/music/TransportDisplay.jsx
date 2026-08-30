import React from 'react'

/**
 * TransportDisplay — pantalla "NOW PLAYING" estilo LCD/dot-matrix del transport.
 * Muestra pista, artista, tiempo mm:ss / mm:ss y una barra de progreso con
 * marcas. Fuente tabular, leve glow. El cursor de tiempo parpadea (CSS) cuando
 * está reproduciendo. Opcional mini-espectro de barras reactivo al nivel.
 *
 * Props:
 *  - title, artist: strings.
 *  - current, duration: segundos (números).
 *  - progress: 0..1 (si se pasa, tiene prioridad sobre current/duration para la barra).
 *  - level: 0..1 opcional — mini-espectro.
 *  - playing: boolean — cursor parpadea.
 *  - accent: color.
 */
export default function TransportDisplay({
  title = '', artist = '', current = 0, duration = 0, progress = null,
  level = null, playing = false, accent = '#22c55e',
}) {
  const p = progress != null ? clamp01(progress) : (duration ? clamp01(current / duration) : 0)
  const cur = progress != null && duration ? progress * duration : current
  return (
    <div className={`tdisp ${playing ? 'is-playing' : ''}`} style={{ '--accent': accent }} role="status" aria-live="off">
      <div className="tdisp-glass" aria-hidden="true" />
      <div className="tdisp-row tdisp-row--top">
        <span className="tdisp-badge">NOW PLAYING</span>
        {level != null && <MiniSpectrum level={level} />}
      </div>
      <div className="tdisp-title" title={title}>{title || '— — —'}</div>
      <div className="tdisp-artist">{artist || ''}</div>
      <div className="tdisp-bar" aria-hidden="true">
        <div className="tdisp-bar-fill" style={{ width: `${p * 100}%` }} />
        {Array.from({ length: 9 }).map((_, i) => <span key={i} className="tdisp-bar-tick" style={{ left: `${(i / 8) * 100}%` }} />)}
      </div>
      <div className="tdisp-time">
        <span className="tdisp-cur">{fmt(cur)}</span>
        <span className="tdisp-cursor">_</span>
        <span className="tdisp-dur">{fmt(duration)}</span>
      </div>
    </div>
  )
}

function MiniSpectrum({ level }) {
  const bars = 8
  const l = clamp01(level)
  return (
    <div className="tdisp-spec" aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => {
        // cada barra con un peso distinto para que "baile"
        const w = 0.4 + 0.6 * Math.abs(Math.sin((i + 1) * 1.7))
        const h = Math.max(0.12, Math.min(1, l * w))
        return <span key={i} className="tdisp-spec-bar" style={{ height: `${h * 100}%` }} />
      })}
    </div>
  )
}

function fmt(sec) {
  const s = Math.max(0, Math.floor(sec || 0))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}
function clamp01(v) { return Math.max(0, Math.min(1, v || 0)) }
