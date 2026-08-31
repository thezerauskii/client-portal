import React from 'react'

/**
 * SocialIcon — logos simplificados de plataformas para el módulo de Redes.
 * Trazo/relleno monocromo (usa currentColor) para encajar con la paleta vintage.
 * Fallback: un globo/enlace genérico.
 */
const P = {
  spotify: <><circle cx="12" cy="12" r="10" fill="currentColor" /><path d="M7 9.5c3.2-1 6.6-.7 9.2.9M7.5 12.3c2.6-.8 5.4-.5 7.6.8M8 15c2-.6 4.1-.4 5.8.6" stroke="#0d0a07" strokeWidth="1.4" fill="none" strokeLinecap="round" /></>,
  youtube: <><rect x="2" y="5" width="20" height="14" rx="4" fill="currentColor" /><path d="M10 8.5v7l6-3.5z" fill="#0d0a07" /></>,
  soundcloud: <><path d="M9 17V9.5c3-1.2 6 .6 6.6 3.4.3-.1.6-.2 1-.2 1.6 0 2.9 1.2 2.9 2.7S18.2 18 16.6 18H9z" fill="currentColor" /><path d="M3 13v4M5 11.5v5.5M7 12v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></>,
  instagram: <><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="17" cy="7" r="1.3" fill="currentColor" /></>,
  tiktok: <path d="M14 4c.4 2.2 1.9 3.7 4 4v2.4c-1.4 0-2.8-.4-4-1.1V15a5 5 0 1 1-5-5c.3 0 .7 0 1 .1v2.6a2.4 2.4 0 1 0 1.5 2.2V4h2.5z" fill="currentColor" />,
  twitter: <path d="M18.5 3h3l-6.6 7.5L23 21h-6.2l-4.3-5.6L7.3 21H4.3l7-8L3.5 3h6.3l3.9 5.2L18.5 3z" fill="currentColor" />,
  bandcamp: <><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M8 16l3-8h5l-3 8z" fill="currentColor" /></>,
  applemusic: <><rect x="3" y="3" width="18" height="18" rx="5" fill="currentColor" /><path d="M15 7l-5 1.2V15a2 2 0 1 1-1.4-1.9V9l5-1.1V13a2 2 0 1 1-1.4-1.9" stroke="#0d0a07" strokeWidth="1.2" fill="none" /></>,
  discord: <path d="M8 6c2.7-.8 5.3-.8 8 0 1.6 2.3 2.4 4.9 2.4 7.7-1.2 1-2.6 1.7-4 2l-.9-1.4c.5-.2 1-.4 1.4-.7-2.5 1.2-5.4 1.2-7.8 0 .4.3.9.5 1.4.7L7.6 15.7c-1.4-.3-2.8-1-4-2C3.6 10.9 4.4 8.3 6 6z" fill="currentColor" />,
  website: <><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" fill="none" stroke="currentColor" strokeWidth="1.4" /></>,
}

export default function SocialIcon({ name, size = 24, className = '' }) {
  const body = P[name] || P.website
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={`social-icon ${className}`} aria-hidden="true">
      {body}
    </svg>
  )
}
