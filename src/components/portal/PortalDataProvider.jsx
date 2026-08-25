import React, { createContext, useContext } from 'react'
import { useParams } from 'react-router-dom'
import { usePortalData } from '../../hooks/usePortalData.js'

/**
 * Context that provides artist portal data to all portal child components.
 * Loaded once via usePortalData(slug) and shared through the tree.
 */
const PortalDataContext = createContext(null)

/**
 * Hook to consume portal data from any child component.
 * @returns {{ artistId, studioName, projectIcon, accentColor, socialLinks, platformConnections, loading, error, notFound, refetch }}
 */
export function usePortalContext() {
  const ctx = useContext(PortalDataContext)
  if (!ctx) {
    throw new Error('usePortalContext must be used within a PortalDataProvider')
  }
  return ctx
}

/**
 * Context provider that wraps portal routes.
 * Extracts :slug from the URL, fetches the artist profile once,
 * and provides it to all child components.
 *
 * Handles three states:
 * - loading: shows a skeleton/spinner
 * - error: shows a retry button
 * - notFound: shows a 404 message
 */
export default function PortalDataProvider({ children }) {
  const { slug } = useParams()
  const portalData = usePortalData(slug)

  // Loading state — skeleton spinner
  if (portalData.loading) {
    return (
      <div className="portal-loading" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg, #121214)',
        color: 'var(--text, #e0e0e0)',
        gap: '16px',
      }}>
        <div className="mini-spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
        <p style={{ fontSize: '14px', opacity: 0.7 }}>Cargando portal...</p>
      </div>
    )
  }

  // Not found state — 404 page
  if (portalData.notFound) {
    return (
      <div className="portal-not-found" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg, #121214)',
        color: 'var(--text, #e0e0e0)',
        gap: '16px',
        padding: '24px',
        textAlign: 'center',
      }}>
        <h1 style={{ fontSize: '48px', margin: 0, opacity: 0.3 }}>404</h1>
        <p style={{ fontSize: '16px', maxWidth: '400px' }}>
          Este artista no existe o no tiene portal público.
        </p>
        <a
          href="/"
          style={{
            marginTop: '16px',
            padding: '8px 20px',
            background: 'var(--green, #00e676)',
            color: '#000',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 500,
            fontSize: '14px',
          }}
        >
          Volver al inicio
        </a>
      </div>
    )
  }

  // Error state — retry button
  if (portalData.error) {
    return (
      <div className="portal-error" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg, #121214)',
        color: 'var(--text, #e0e0e0)',
        gap: '16px',
        padding: '24px',
        textAlign: 'center',
      }}>
        <h2 style={{ fontSize: '20px', margin: 0 }}>Error al cargar el portal</h2>
        <p style={{ fontSize: '14px', opacity: 0.7, maxWidth: '400px' }}>
          No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.
        </p>
        <button
          onClick={portalData.refetch}
          style={{
            marginTop: '8px',
            padding: '8px 20px',
            background: 'var(--green, #00e676)',
            color: '#000',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '14px',
          }}
        >
          Reintentar
        </button>
      </div>
    )
  }

  // Success — provide data to children
  return (
    <PortalDataContext.Provider value={portalData}>
      {children}
    </PortalDataContext.Provider>
  )
}
