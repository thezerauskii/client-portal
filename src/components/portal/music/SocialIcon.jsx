import React from 'react'

/**
 * SocialIcon — iconos SVG propios (dibujados a mano, NO emojis ni logos
 * chillones) para las redes del artista. Estilo serigrafía monocromo que hereda
 * currentColor, para atenuarlos a la paleta cálida de la consola. Si no hay
 * icono específico para la plataforma, cae a un globo genérico (link).
 *
 * Props: platform (id), size=20
 */
const ICONS = {
  twitter: <path d="M4 4l7 8.5M20 4l-7 8.5M11 12.5L4 20M13 11.5L20 20" />,
  instagram: <g><rect x="4" y="4" width="16" height="16" rx="4.5" fill="none" /><circle cx="12" cy="12" r="3.6" fill="none" /><circle cx="17" cy="7" r="0.6" /></g>,
  telegram: <path d="M21 5L3 12l5 2 2 5 3-4 5 3z" fill="none" />,
  discord: <g fill="none"><path d="M7 8.5C9 7.5 15 7.5 17 8.5L18.5 16C17 17 15.5 17.5 14.5 17.5L14 16.2C15 16 16 15.5 16 15.5M6 15.5S8 16.5 10 16.2L9.5 17.5C8.5 17.5 7 17 5.5 16z" /><circle cx="9.5" cy="12.5" r="1" fill="currentColor" stroke="none" /><circle cx="14.5" cy="12.5" r="1" fill="currentColor" stroke="none" /></g>,
  patreon: <g fill="none"><circle cx="14" cy="10" r="5" /><rect x="4" y="4.5" width="2.4" height="15" fill="currentColor" stroke="none" /></g>,
  kofi: <g fill="none"><rect x="4" y="7" width="12" height="9" rx="3" /><path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16" /><line x1="6" y1="4.5" x2="6" y2="6" /><line x1="9" y1="4.5" x2="9" y2="6" /></g>,
  bluesky: <path d="M12 11C10 7 6 5 5 6c-1 1.2 0 4.5 1.5 5.5C4.5 11.5 4 13 5 13.8c1 .8 4-.3 7-2.8 3 2.5 6 3.6 7 2.8 1-.8.5-2.3-1.5-2.3C19 10.5 20 7.2 19 6c-1-1-5 1-7 5z" fill="none" />,
  tumblr: <path d="M13 4c0 3 1 4 4 4v3h-4v5c0 1.5.5 2 2 2h2v3h-3c-3 0-4-2-4-4v-6H7V8c2 0 3-1.5 3-4z" fill="none" />,
  mastodon: <g fill="none"><path d="M5 9c0-3 2-4.5 7-4.5S19 6 19 9v4c0 2-1.5 3.5-4 3.5H9" /><path d="M9 9v4M12 9v3M15 9v4" /><path d="M6 15c1 3 4 4 8 4" /></g>,
  artstation: <g fill="none"><path d="M4 16l7-11 5 8H7" /><path d="M15 14l2 3H8" /></g>,
  deviantart: <path d="M17 4h-4l-2 4-4-1v5l5 1-3 6h4l2-4 4 1V7l-5-1z" fill="none" />,
  furaffinity: <g fill="none"><path d="M6 18l3-9 6-3-1 6-8 6z" /><circle cx="9" cy="10" r="0.7" fill="currentColor" stroke="none" /></g>,
  pixiv: <g fill="none"><path d="M6 20V7c0-2 2-3 5-3s6 1.5 6 4-2.5 4-5.5 4H6" /></g>,
  newgrounds: <g fill="none"><circle cx="12" cy="12" r="8" /><path d="M8 14l2-5 2 3 2-4 2 6" /></g>,
}

export default function SocialIcon({ platform, size = 20 }) {
  const body = ICONS[platform]
  return (
    <svg
      viewBox="0 0 24 24"
      width={size} height={size}
      fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round"
      className="social-icon" aria-hidden="true"
    >
      {body || (
        <g><circle cx="12" cy="12" r="9" /><line x1="3" y1="12" x2="21" y2="12" /><path d="M12 3a15 15 0 0 1 4 9 15 15 0 0 1-4 9 15 15 0 0 1-4-9 15 15 0 0 1 4-9z" /></g>
      )}
    </svg>
  )
}
