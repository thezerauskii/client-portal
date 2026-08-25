import React, { createContext, useContext } from 'react'
import { NavLink, useParams } from 'react-router-dom'

// Portal context — shared by PortalDataProvider and consumed by portal components
const PortalContext = createContext(null)

/**
 * Hook to consume portal data context.
 * Must be used inside PortalDataProvider/PortalLayout tree.
 */
export function usePortalContext() {
  const ctx = useContext(PortalContext)
  if (!ctx) {
    throw new Error('usePortalContext must be used within a PortalDataProvider')
  }
  return ctx
}

export { PortalContext }

const NAV_TABS = [
  { label: 'Comisiones', path: 'commissions' },
  { label: 'Portafolio', path: 'portfolio' },
  { label: 'Calendario', path: 'calendar' },
  { label: 'Links', path: 'links' },
]

export default function PortalLayout({ children }) {
  const { slug } = useParams()

  // Consume context — may be null during loading/error states from PortalDataProvider
  const ctx = useContext(PortalContext)
  const studioName = ctx?.studioName || 'Estudio'
  const avatarUrl = ctx?.avatarUrl || null
  const accentColor = ctx?.accentColor || null

  return (
    <div style={styles.wrapper}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          {/* Brand area: avatar + studio name */}
          <div style={styles.brand}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={`${studioName} avatar`}
                style={styles.avatar}
              />
            ) : (
              <div style={styles.avatarPlaceholder} aria-hidden="true">
                {studioName[0]?.toUpperCase() || '🎨'}
              </div>
            )}
            <span style={styles.studioName}>{studioName}</span>
          </div>

          {/* Navigation tabs */}
          <nav style={styles.nav} aria-label="Portal navigation">
            {NAV_TABS.map(tab => (
              <NavLink
                key={tab.path}
                to={`/p/${slug}/${tab.path}`}
                className={({ isActive }) =>
                  isActive ? 'portal-nav-tab portal-nav-tab--active' : 'portal-nav-tab'
                }
                style={({ isActive }) => ({
                  ...styles.navTab,
                  ...(isActive ? styles.navTabActive : {}),
                  ...(isActive && accentColor ? { color: accentColor, borderBottomColor: accentColor } : {}),
                })}
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main style={styles.content}>
        <div style={styles.contentInner}>
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <span style={styles.footerText}>
          Powered by{' '}
          <a
            href="https://possumble.studio"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.footerLink}
          >
            Possumble Studio
          </a>
        </span>
      </footer>
    </div>
  )
}

// --- Inline styles (same pattern as existing project components) ---

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    background: 'var(--bg, #111113)',
    color: 'var(--text, #e8e8ec)',
  },

  // Header
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    background: 'var(--surface, #1a1a1e)',
    borderBottom: '1px solid var(--border, #2e2e36)',
  },
  headerInner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0.75rem 1.5rem',
    flexWrap: 'wrap',
  },

  // Brand
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    flexShrink: 0,
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '1px solid var(--border, #2e2e36)',
  },
  avatarPlaceholder: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'var(--surface2, #222227)',
    border: '1px solid var(--border, #2e2e36)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.85rem',
    fontWeight: 700,
    color: 'var(--text, #e8e8ec)',
  },
  studioName: {
    fontSize: '0.9rem',
    fontWeight: 700,
    color: 'var(--text, #e8e8ec)',
    whiteSpace: 'nowrap',
  },

  // Nav
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    overflowX: 'auto',
  },
  navTab: {
    padding: '0.5rem 0.85rem',
    fontSize: '0.78rem',
    fontWeight: 500,
    color: 'var(--text-muted, #888896)',
    textDecoration: 'none',
    borderRadius: 'var(--radius-sm, 7px)',
    borderBottom: '2px solid transparent',
    transition: 'color 130ms ease, background 130ms ease, border-color 130ms ease',
    whiteSpace: 'nowrap',
  },
  navTabActive: {
    color: 'var(--green, #22C55E)',
    fontWeight: 600,
    borderBottomColor: 'var(--green, #22C55E)',
    background: 'rgba(34, 197, 94, 0.08)',
  },

  // Content
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  contentInner: {
    flex: 1,
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '1.5rem',
  },

  // Footer
  footer: {
    padding: '1.25rem 1.5rem',
    borderTop: '1px solid var(--border, #2e2e36)',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '0.72rem',
    color: 'var(--text-dim, #555560)',
  },
  footerLink: {
    color: 'var(--text-muted, #888896)',
    textDecoration: 'none',
    fontWeight: 500,
  },
}
