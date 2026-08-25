import React from 'react'
import PortalGallery from '../../components/portal/PortalGallery.jsx'

/**
 * Portal Portfolio page — displays the artist's public gallery.
 * Renders the PortalGallery component which handles data fetching,
 * responsive grid display, and lightbox interaction.
 */
export default function PortalPortfolio() {
  return (
    <div>
      <h2 style={{
        margin: '0 0 1.25rem',
        fontSize: '1.15rem',
        fontWeight: 700,
        color: 'var(--text, #e8e8ec)',
      }}>
        Portafolio
      </h2>
      <PortalGallery />
    </div>
  )
}
