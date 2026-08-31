import React from 'react'

/**
 * VintageIcon — iconos SVG dibujados a mano (NO emojis) para la consola.
 * Trazo tipo "serigrafía grabada". Los de tipo diagrama pueden dibujarse con
 * stroke-dasharray al entrar en viewport (clase .vintage-icon--draw activa la
 * animación de trazo; reduced-motion la desactiva por CSS).
 *
 * Props: name, size=22, className, draw=false, strokeWidth=1.8
 */
const PATHS = {
  play: <path d="M8 5 L19 12 L8 19 Z" />,
  pause: <g><rect x="7" y="5" width="3.5" height="14" rx="0.5" /><rect x="13.5" y="5" width="3.5" height="14" rx="0.5" /></g>,
  stop: <rect x="6" y="6" width="12" height="12" rx="1" />,
  rec: <circle cx="12" cy="12" r="5.5" />,
  prev: <g><path d="M18 6 L10 12 L18 18 Z" /><rect x="6" y="6" width="2.5" height="12" /></g>,
  next: <g><path d="M6 6 L14 12 L6 18 Z" /><rect x="15.5" y="6" width="2.5" height="12" /></g>,
  waveform: <path d="M3 12 L6 12 L8 6 L11 18 L13 9 L15 15 L17 12 L21 12" fill="none" />,
  harmonics: <g fill="none"><path d="M3 16 Q7.5 4 12 16 Q16.5 28 21 16" /><path d="M3 12 Q6 6 9 12 Q12 18 15 12 Q18 6 21 12" opacity="0.6" /></g>,
  envelope: <path d="M3 20 L7 5 L11 9 L11 15 L21 20" fill="none" />,
  eq: <g fill="none"><line x1="6" y1="4" x2="6" y2="20" /><circle cx="6" cy="9" r="2" /><line x1="12" y1="4" x2="12" y2="20" /><circle cx="12" cy="14" r="2" /><line x1="18" y1="4" x2="18" y2="20" /><circle cx="18" cy="8" r="2" /></g>,
  signal: <path d="M3 18 L8 18 L10 6 L14 6 L16 18 L21 18" fill="none" />,
  power: <g fill="none"><path d="M12 3 L12 11" /><path d="M6.5 6.5 A7 7 0 1 0 17.5 6.5" /></g>,
  cable: <g fill="none"><circle cx="5" cy="6" r="2" /><circle cx="19" cy="18" r="2" /><path d="M5 8 Q5 18 12 18 Q19 18 19 16" /></g>,
  // ── Set ampliado (Fase 14) — trazo serigrafía ──
  knob: <g fill="none"><circle cx="12" cy="12" r="7" /><line x1="12" y1="12" x2="12" y2="6.5" /><circle cx="12" cy="12" r="1.3" fill="currentColor" /></g>,
  fader: <g fill="none"><line x1="7" y1="4" x2="7" y2="20" /><line x1="17" y1="4" x2="17" y2="20" /><rect x="4.5" y="9" width="5" height="4" rx="1" /><rect x="14.5" y="12" width="5" height="4" rx="1" /></g>,
  sliders: <g fill="none"><line x1="4" y1="8" x2="20" y2="8" /><line x1="4" y1="16" x2="20" y2="16" /><circle cx="9" cy="8" r="2" /><circle cx="15" cy="16" r="2" /></g>,
  vinyl: <g fill="none"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" fill="currentColor" /></g>,
  disc: <g fill="none"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2.5" /></g>,
  mic: <g fill="none"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M6 11 A6 6 0 0 0 18 11" /><line x1="12" y1="17" x2="12" y2="21" /><line x1="8.5" y1="21" x2="15.5" y2="21" /></g>,
  headphones: <g fill="none"><path d="M4 13 A8 8 0 0 1 20 13" /><rect x="3.5" y="13" width="4" height="7" rx="1.5" /><rect x="16.5" y="13" width="4" height="7" rx="1.5" /></g>,
  speaker: <g fill="none"><rect x="6" y="3" width="12" height="18" rx="2" /><circle cx="12" cy="15" r="3.5" /><circle cx="12" cy="7" r="1.2" /></g>,
  note: <g fill="none"><path d="M9 18 V6 L18 4 V16" /><circle cx="7" cy="18" r="2" fill="currentColor" stroke="none" /><circle cx="16" cy="16" r="2" fill="currentColor" stroke="none" /></g>,
}

export default function VintageIcon({ name, size = 22, className = '', draw = false, strokeWidth = 1.8 }) {
  const body = PATHS[name] || PATHS.play
  const filled = name === 'play' || name === 'pause' || name === 'stop' || name === 'rec' || name === 'prev' || name === 'next'
  return (
    <svg
      viewBox="0 0 24 24"
      width={size} height={size}
      className={`vintage-icon ${draw ? 'vintage-icon--draw' : ''} ${className}`}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {body}
    </svg>
  )
}
