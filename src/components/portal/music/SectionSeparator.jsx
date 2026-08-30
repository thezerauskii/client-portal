import React from 'react'

/**
 * SectionSeparator — separador con carácter analógico entre secciones.
 * Estilos: 'tape' (tira de cinta), 'patchrail' (regleta de jacks), 'screws'
 * (fila de tornillos), 'stitch' (costura de cuero), 'none' (nada).
 *
 * Puramente decorativo (aria-hidden). SVG ligero, sin animación (no reanima).
 *
 * Props: kind, accent
 */
export default function SectionSeparator({ kind = 'tape', accent = '#22c55e' }) {
  if (!kind || kind === 'none') return null
  return (
    <div className={`sep sep--${kind}`} aria-hidden="true" style={{ '--accent': accent }}>
      {kind === 'tape' && (
        <svg viewBox="0 0 1200 24" preserveAspectRatio="none" className="sep-svg">
          <rect x="0" y="7" width="1200" height="10" className="sep-tape-body" />
          <rect x="0" y="7" width="1200" height="2" className="sep-tape-hi" />
        </svg>
      )}
      {kind === 'patchrail' && (
        <svg viewBox="0 0 1200 26" preserveAspectRatio="xMidYMid meet" className="sep-svg">
          <rect x="0" y="4" width="1200" height="18" rx="4" className="sep-rail-body" />
          {Array.from({ length: 24 }).map((_, i) => (
            <g key={i} transform={`translate(${25 + i * 50}, 13)`}>
              <circle r="6" className="sep-rail-ring" />
              <circle r="2.5" className="sep-rail-hole" />
            </g>
          ))}
        </svg>
      )}
      {kind === 'screws' && (
        <svg viewBox="0 0 1200 20" preserveAspectRatio="xMidYMid meet" className="sep-svg">
          <line x1="0" y1="10" x2="1200" y2="10" className="sep-screws-line" />
          {Array.from({ length: 12 }).map((_, i) => (
            <g key={i} transform={`translate(${50 + i * 100}, 10) rotate(${(i * 37) % 180})`}>
              <circle r="5" className="sep-screw" />
              <line x1="-3" y1="0" x2="3" y2="0" className="sep-screw-slot" />
            </g>
          ))}
        </svg>
      )}
      {kind === 'stitch' && (
        <svg viewBox="0 0 1200 16" preserveAspectRatio="none" className="sep-svg">
          <line x1="8" y1="8" x2="1192" y2="8" className="sep-stitch" strokeDasharray="12 8" />
        </svg>
      )}
    </div>
  )
}
