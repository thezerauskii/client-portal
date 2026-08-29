import React, { useState, useEffect, useMemo } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { usePortalContext } from './PortalDataProvider.jsx'
import { usePortalTasks } from '../../hooks/usePortalTasks.js'

/* ─── Navigation items for the portal sidebar ─── */
const NAV_ITEMS = [
  { id: 'commissions', path: 'commissions', label: 'Estudio de Comisiones', icon: CommissionsIcon },
  { id: 'portfolio', path: 'portfolio', label: 'Galería de Portafolio', icon: PortfolioIcon },
  { id: 'calendar', path: 'calendar', label: 'Calendario', icon: CalendarIcon },
  { id: 'links', path: 'links', label: 'Medios de comunicación', icon: LinksIcon },
]

/* ─── SVG Icons (matching Electron sidebarIcons style) ─── */
function CommissionsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  )
}

function PortfolioIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function LinksIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  )
}

function HamburgerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

/* ─── Stats Bar component ─── */
// Stage to progress mapping (matches Electron)
const STAGE_PROGRESS = {
  new: 0, sketch: 20, lineart: 40, base: 60, shade: 80, review: 90, delivered: 100,
}
// "En Revisión" section ID from kanban config
const REVIEW_SECTION_ID = 'b5f9edcb-6fd0-4f89-a15d-9eb710ae37a0'

function StatsBar({ artistId }) {
  const { tasks } = usePortalTasks(artistId)

  // Derive stats from the shared tasks set (no separate query)
  const stats = useMemo(() => {
    const commissions = (tasks || []).filter(t => t.parent_id)
    const active = commissions.length
    const inReview = commissions.filter(t => t.parent_id === REVIEW_SECTION_ID).length
    const avgProgress = active > 0
      ? Math.round(commissions.reduce((sum, t) => sum + (STAGE_PROGRESS[t.stage] || 0), 0) / active)
      : 0
    return { active, avgProgress, inReview }
  }, [tasks])

  return (
    <div className="portal-stats-bar">
      <div className="portal-stat">
        <span className="portal-stat-value">{stats.active}</span>
        <span className="portal-stat-label">COMISIONES ACTIVAS</span>
      </div>
      <span className="portal-stat-divider" aria-hidden="true" />
      <div className="portal-stat">
        <span className="portal-stat-value">{stats.avgProgress}%</span>
        <span className="portal-stat-label">AVANCE PROMEDIO</span>
      </div>
      <span className="portal-stat-divider" aria-hidden="true" />
      <div className="portal-stat">
        <span className="portal-stat-value">{stats.inReview}</span>
        <span className="portal-stat-label">EN REVISIÓN</span>
      </div>
    </div>
  )
}

/* ─── Main Layout ─── */
export default function PortalLayout({ children }) {
  const { slug } = useParams()
  const { studioName, projectIcon, accentColor, artistId, projectBannerUrl, projectSubtitle, globalBgUrl } = usePortalContext()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [slug])

  const displayName = studioName || 'Estudio'

  return (
    <div className="portal-layout">
      {/* ─── Background image (global_bg_url) ─── */}
      {globalBgUrl && (
        <div
          className="portal-layout-bg"
          style={{ backgroundImage: `url(${globalBgUrl})` }}
          aria-hidden="true"
        />
      )}

      {/* ─── Sidebar (full height) ─── */}
      <aside
        className={`portal-layout-sidebar ${mobileMenuOpen ? 'portal-layout-sidebar--open' : ''}`}
        aria-label="Navegación del portal"
      >
        <div className="portal-sidebar-brand">
          <img src="/logo-possum.svg" alt="" className="portal-sidebar-logo" />
          <span className="portal-sidebar-brand-name">Possumble</span>
        </div>
        <nav className="portal-layout-sidebar-nav">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.id}
                to={`/p/${slug}/${item.path}`}
                className={({ isActive }) =>
                  `portal-sidebar-item ${isActive ? 'portal-sidebar-item--active' : ''}`
                }
                style={({ isActive }) =>
                  isActive && accentColor
                    ? { '--sidebar-accent': accentColor }
                    : undefined
                }
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="portal-sidebar-item-icon">
                  <Icon />
                </span>
                <span className="portal-sidebar-item-label">{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
      </aside>

      {/* Backdrop for mobile sidebar */}
      {mobileMenuOpen && (
        <div
          className="portal-layout-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ─── Right side: banner + content + footer ─── */}
      <div className="portal-layout-right">
        {/* Banner Header */}
        <header className="portal-layout-header">
          <div
            className="portal-banner"
            style={projectBannerUrl ? { backgroundImage: `url(${projectBannerUrl})` } : undefined}
          >
            <div className="portal-banner-overlay" />
            <div className="portal-banner-content">
              <button
                className="portal-layout-hamburger"
                onClick={() => setMobileMenuOpen(o => !o)}
                aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <CloseIcon /> : <HamburgerIcon />}
              </button>
              <div className="portal-banner-text">
                <h1 className="portal-banner-title">{displayName}</h1>
                {projectSubtitle && (
                  <p className="portal-banner-subtitle">{projectSubtitle}</p>
                )}
              </div>
              <StatsBar artistId={artistId} />
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="portal-layout-main">
          {children}
        </main>

        {/* Footer */}
        <footer className="portal-layout-footer">
          <span>
            Powered by{' '}
            <a href="https://possumble.studio" target="_blank" rel="noopener noreferrer">
              Possumble Studio
            </a>
          </span>
        </footer>
      </div>
    </div>
  )
}
