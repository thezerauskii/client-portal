import React, { useState, useEffect, useMemo } from 'react'
import { NavLink, useParams, useLocation } from 'react-router-dom'
import { usePortalContext } from './PortalDataProvider.jsx'
import { usePortalTasks } from '../../hooks/usePortalTasks.js'
import { isCommissionCard, isPanelRow, REVIEW_SECTION_ID } from '../../shared/domain/sections.js'

/* ─── Navigation items for the portal sidebar ─── */
function MusicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l10-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="16" cy="16" r="3" />
    </svg>
  )
}

const NAV_ITEMS = [
  { id: 'commissions', path: 'commissions', label: 'Estudio de Comisiones', icon: CommissionsIcon },
  { id: 'services', path: 'services', label: 'Servicios y Precios', icon: PriceIcon },
  { id: 'request', path: 'request', label: 'Solicitar comisión', icon: RequestIcon },
  { id: 'portfolio', path: 'portfolio', label: 'Galería de Portafolio', icon: PortfolioIcon },
  { id: 'calendar', path: 'calendar', label: 'Calendario', icon: CalendarIcon },
  { id: 'links', path: 'links', label: 'Medios de comunicación', icon: LinksIcon },
  { id: 'music', path: 'music', label: 'Estudio de Audio', icon: MusicIcon },
]

/* ─── SVG Icons (matching Electron sidebarIcons style) ─── */
function PriceIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

function RequestIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  )
}

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
function StatsBar({ artistId }) {
  const { tasks } = usePortalTasks(artistId)

  // Derive stats from the shared tasks set (no separate query).
  // "Active" = in a real workflow section (Nuevas / En Proceso / En Revisión),
  // not completed, not archived. Excludes Backlog + section rows + portfolio.
  const stats = useMemo(() => {
    // Every real card in any panel counts as a commission (excl. archived/panels).
    const commissions = (tasks || []).filter(isCommissionCard)
    const active = commissions.length
    const inReview = commissions.filter(t => (t.parent_id ?? t.parentId) === REVIEW_SECTION_ID).length
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
  const location = useLocation()
  const { studioName, projectIcon, projectAvatarUrl, projectBio, accentColor, artistId, projectBannerUrl, projectSubtitle, globalBgUrl, servicesPricing } = usePortalContext()
  // On the Services page, if the artist set a services-specific banner, hide the
  // global banner so it doesn't stack (the services banner replaces it there).
  const onServices = /\/services\/?$/.test(location.pathname)
  const servicesHasBanner = !!(servicesPricing && servicesPricing.bannerUrl)
  const hideGlobalBanner = onServices && servicesHasBanner
  // Profile picture: only an actual image URL counts (no emoji placeholder).
  const avatarUrl = projectAvatarUrl || (typeof projectIcon === 'string' && projectIcon.startsWith('http') ? projectIcon : null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  // Al hacer scroll, el banner (nombre + stats) se repliega hacia arriba y sólo
  // queda la barra de navegación (que ya es sticky). rAF-throttled + passive.
  const [headerCollapsed, setHeaderCollapsed] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [slug])

  useEffect(() => {
    if (typeof window === 'undefined') return
    let ticking = false
    let raf = 0
    const THRESHOLD = 90
    const onScroll = () => {
      if (ticking) return
      ticking = true
      raf = requestAnimationFrame(() => {
        ticking = false
        setHeaderCollapsed((window.scrollY || 0) > THRESHOLD)
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll) }
  }, [])

  const displayName = studioName || 'Estudio'

  return (
    <div className="portal-layout portal-layout--top">
      {/* ─── Background image (global_bg_url) ─── */}
      {globalBgUrl && (
        <div
          className="portal-layout-bg"
          style={{ backgroundImage: `url(${globalBgUrl})` }}
          aria-hidden="true"
        />
      )}

      {/* ─── Top navigation bar (store-style header) ─── */}
      <header className="portal-topnav">
        <div className="portal-topnav-inner">
          <div className="portal-topnav-brand">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="portal-topnav-avatar" />
            ) : (
              <span className="portal-topnav-avatar portal-topnav-avatar--empty" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </span>
            )}
            <span className="portal-topnav-name">{displayName}</span>
            <NavLink
              to={`/p/${slug}`}
              end
              className="portal-home-btn"
              title="Ir a la página principal"
              aria-label="Ir a inicio"
              onClick={() => setMobileMenuOpen(false)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9.5 12 3l9 6.5" /><path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
              </svg>
            </NavLink>
          </div>

          <button
            className="portal-topnav-hamburger"
            onClick={() => setMobileMenuOpen(o => !o)}
            aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <CloseIcon /> : <HamburgerIcon />}
          </button>

          <nav className={`portal-topnav-links ${mobileMenuOpen ? 'portal-topnav-links--open' : ''}`}>
            {NAV_ITEMS.map(item => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.id}
                  to={`/p/${slug}/${item.path}`}
                  className={({ isActive }) =>
                    `portal-topnav-item ${isActive ? 'portal-topnav-item--active' : ''}`
                  }
                  style={({ isActive }) =>
                    isActive && accentColor ? { '--nav-accent': accentColor } : undefined
                  }
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="portal-topnav-item-icon"><Icon /></span>
                  <span className="portal-topnav-item-label">{item.label}</span>
                </NavLink>
              )
            })}
          </nav>
        </div>
      </header>

      {/* Backdrop for mobile menu */}
      {mobileMenuOpen && (
        <div
          className="portal-layout-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ─── Content column ─── */}
      <div className="portal-layout-right portal-layout-right--top">
        <header className={`portal-layout-header ${headerCollapsed ? 'is-collapsed' : ''}`}>
          {/* Banner image only — clean, nothing overlaid.
              Hidden on the Services page when a services-specific banner exists. */}
          {!hideGlobalBanner && (
            <div
              className="portal-banner"
              style={projectBannerUrl ? { backgroundImage: `url(${projectBannerUrl})` } : undefined}
            >
              <div className="portal-banner-overlay" />
            </div>
          )}

          {/* Identity row BELOW the banner: avatar (only if set) + name + subtitle + stats */}
          <div className="portal-identity-row">
            {avatarUrl && (
              <div className="portal-identity-avatar" style={{ borderColor: accentColor || undefined }}>
                <img src={avatarUrl} alt={displayName} />
              </div>
            )}
            <div className="portal-identity-text">
              <h1 className="portal-identity-name">{displayName}</h1>
              {projectSubtitle && <p className="portal-identity-subtitle">{projectSubtitle}</p>}
              {projectBio && <p className="portal-identity-bio">{projectBio}</p>}
            </div>
            <StatsBar artistId={artistId} />
          </div>
        </header>

        <main className="portal-layout-main">
          {children}
        </main>

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
