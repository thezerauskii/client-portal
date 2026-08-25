import React from 'react'
import { usePortalContext } from './PortalDataProvider.jsx'
import { buildPlatformUrl, PLATFORM_INFO } from '../../utils/platformUrls.js'

/**
 * Combines socialLinks (manual URLs) and platformConnections (auto handles)
 * into a single deduplicated list. Manual URLs take priority.
 *
 * @param {{ [platform: string]: string }} socialLinks - Manual URLs keyed by platform
 * @param {{ [platform: string]: { handle: string, connected: boolean } }} platformConnections - Auto connections
 * @returns {{ platform: string, url: string, icon: string, name: string }[]}
 */
function buildCombinedLinks(socialLinks = {}, platformConnections = {}) {
  const combined = new Map()

  // 1. Start with platformConnections entries where connected === true
  for (const [platform, info] of Object.entries(platformConnections)) {
    if (!info || !info.connected || !info.handle) continue
    const url = buildPlatformUrl(platform, info.handle)
    if (url) {
      combined.set(platform, url)
    }
  }

  // 2. Add socialLinks entries where URL is not empty (overrides auto URLs)
  for (const [platform, url] of Object.entries(socialLinks)) {
    if (!url) continue
    combined.set(platform, url) // Overwrites platformConnections entry if same key
  }

  // 3. Build final display list with platform info
  const result = []
  for (const [platform, url] of combined) {
    const info = PLATFORM_INFO[platform]
    result.push({
      platform,
      url,
      icon: info ? info.icon : '🔗',
      name: info ? info.name : platform,
    })
  }

  return result
}

/**
 * PortalLinks — Grid of platform cards showing the artist's social links.
 * Combines manual socialLinks and auto-generated platformConnections.
 * Each card links to the artist's profile on that platform (new tab).
 */
export default function PortalLinks() {
  const { socialLinks, platformConnections } = usePortalContext()
  const links = buildCombinedLinks(socialLinks, platformConnections)

  // Empty state
  if (links.length === 0) {
    return (
      <div className="portal-empty-state">
        <div className="portal-empty-state-icon">🔗</div>
        <p className="portal-empty-state-text">Este artista no ha configurado sus redes</p>
      </div>
    )
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', marginBottom: '1rem' }}>
        Redes y plataformas
      </h2>
      <div className="portal-grid">
        {links.map(link => (
          <a
            key={link.platform}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="portal-platform-card"
          >
            <div className="portal-platform-card-icon">{link.icon}</div>
            <div className="portal-platform-card-info">
              <div className="portal-platform-card-name">{link.name}</div>
              <div className="portal-platform-card-link">{link.url}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
