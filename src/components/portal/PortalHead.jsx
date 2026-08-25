import { useEffect } from 'react'
import { usePortalContext } from './PortalDataProvider.jsx'

/**
 * Sets the document title dynamically for portal pages.
 * Uses the artist's studio name from portal context + the section name.
 *
 * Usage:
 *   <PortalHead section="Comisiones" />
 *
 * Result: document.title = "Estudio Possumble — Comisiones"
 *
 * @param {{ section?: string }} props
 */
export default function PortalHead({ section }) {
  const { studioName } = usePortalContext()

  useEffect(() => {
    const title = section
      ? `${studioName || 'Portal'} — ${section}`
      : studioName || 'Portal de Comisiones'

    document.title = title

    // Restore default title on unmount
    return () => {
      document.title = 'Possumble Studio — Portal de Comisiones'
    }
  }, [studioName, section])

  return null
}
