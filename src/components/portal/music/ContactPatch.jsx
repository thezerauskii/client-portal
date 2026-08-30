import React from 'react'
import SocialIcon from './SocialIcon.jsx'
import { buildPlatformUrl, PLATFORM_INFO } from '../../../utils/platformUrls.js'
import './music.css'

/**
 * Combina socialLinks (URLs manuales) + platformConnections (handles) en una
 * lista deduplicada [{ platform, url, name }]. Manual gana sobre auto.
 * (Misma regla que PortalLinks, replicada aquí para no acoplar.)
 */
function buildLinks(socialLinks = {}, platformConnections = {}) {
  const combined = new Map()
  for (const [platform, info] of Object.entries(platformConnections || {})) {
    if (!info || !info.connected || !info.handle) continue
    const url = buildPlatformUrl(platform, info.handle)
    if (url) combined.set(platform, url)
  }
  for (const [platform, url] of Object.entries(socialLinks || {})) {
    if (!url) continue
    combined.set(platform, url)
  }
  return [...combined].map(([platform, url]) => ({
    platform, url, name: PLATFORM_INFO[platform]?.name || platform,
  }))
}

/**
 * ContactPatch — las redes del artista "con alma", integradas en la consola.
 * Dos estilos (patchbay.contactStyle):
 *  - 'patchbay': cada red es un jack etiquetado que se ilumina al hover.
 *  - 'stickers': etiquetas de papel pegadas (esquina despegada).
 * Cada red es un <a target=_blank aria-label>. Iconos SVG propios, color
 * atenuado a la paleta cálida. Si no hay redes, no renderiza nada.
 *
 * Props: socialLinks, platformConnections, style ('patchbay'|'stickers'), accent
 */
export default function ContactPatch({ socialLinks = {}, platformConnections = {}, style = 'patchbay', accent = '#22c55e' }) {
  const links = buildLinks(socialLinks, platformConnections)
  if (links.length === 0) return null

  if (style === 'stickers') {
    return (
      <div className="cpatch cpatch--stickers" style={{ '--accent': accent }}>
        {links.map((l, i) => (
          <a
            key={l.platform} href={l.url} target="_blank" rel="noopener noreferrer"
            className="cpatch-sticker" aria-label={`Abrir ${l.name} (nueva pestaña)`}
            style={{ '--rot': `${((i * 37) % 9) - 4}deg` }}
          >
            <span className="cpatch-sticker-icon"><SocialIcon platform={l.platform} size={22} /></span>
            <span className="cpatch-sticker-name">{l.name}</span>
          </a>
        ))}
      </div>
    )
  }

  // patchbay (default)
  return (
    <div className="cpatch cpatch--patchbay" style={{ '--accent': accent }}>
      {links.map(l => (
        <a
          key={l.platform} href={l.url} target="_blank" rel="noopener noreferrer"
          className="cpatch-jack" aria-label={`Abrir ${l.name} (nueva pestaña)`}
        >
          <span className="cpatch-jack-ring">
            <span className="cpatch-jack-hole" />
            <span className="cpatch-jack-icon"><SocialIcon platform={l.platform} size={18} /></span>
          </span>
          <span className="cpatch-jack-label">{l.name}</span>
        </a>
      ))}
    </div>
  )
}
