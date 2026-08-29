import React, { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { usePortalContext } from '../../components/portal/PortalDataProvider.jsx'
import { usePortalTasks } from '../../hooks/usePortalTasks.js'
import { isActiveCommission } from '../../shared/domain/sections.js'
import {
  IconBrush, IconImage, IconCalendar, IconLink,
} from '../../components/portal/PortalIcons.jsx'

/* Price/Request icons (inline, matching the portal SVG style) */
function IconPrice({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}
function IconRequest({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  )
}

/**
 * Portal landing page — /p/:slug — store-style home.
 * Banner on top, big studio icon, then a centered grid of section options.
 */
export default function PortalLanding() {
  const { slug } = useParams()
  const {
    artistId, studioName, projectIcon, projectAvatarUrl, accentColor,
    projectBannerUrl, projectSubtitle,
  } = usePortalContext()

  // A profile picture (image URL) takes priority over the emoji/text icon.
  const avatarUrl = projectAvatarUrl || (typeof projectIcon === 'string' && projectIcon.startsWith('http') ? projectIcon : null)
  const emojiIcon = !avatarUrl && projectIcon && projectIcon.length <= 4 ? projectIcon : null

  const { tasks, loading: tasksLoading } = usePortalTasks(artistId)

  const activeCount = useMemo(
    () => (tasks || []).filter(isActiveCommission).length,
    [tasks]
  )

  const accent = accentColor || 'var(--green, #22C55E)'

  const sections = [
    { key: 'commissions', title: 'Comisiones', icon: <IconBrush size={26} />, path: `/p/${slug}/commissions`, stat: activeCount, statLabel: 'activas' },
    { key: 'services', title: 'Servicios y Precios', icon: <IconPrice size={26} />, path: `/p/${slug}/services` },
    { key: 'request', title: 'Solicitar comisión', icon: <IconRequest size={26} />, path: `/p/${slug}/request` },
    { key: 'portfolio', title: 'Portafolio', icon: <IconImage size={26} />, path: `/p/${slug}/portfolio` },
    { key: 'calendar', title: 'Calendario', icon: <IconCalendar size={26} />, path: `/p/${slug}/calendar` },
    { key: 'links', title: 'Links', icon: <IconLink size={26} />, path: `/p/${slug}/links` },
  ]

  return (
    <div className="plh-root">
      {/* ── Banner ── */}
      <div
        className="plh-banner"
        style={projectBannerUrl ? { backgroundImage: `url(${projectBannerUrl})` } : { background: `linear-gradient(135deg, ${accent}22, #0d0d12)` }}
      >
        <div className="plh-banner-overlay" />
      </div>

      {/* ── Identity: big icon overlapping the banner ── */}
      <div className="plh-identity">
        <div className="plh-avatar" style={{ borderColor: accent }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={studioName} className="plh-avatar-img" />
          ) : emojiIcon ? (
            <span className="plh-avatar-fallback">{emojiIcon}</span>
          ) : (
            <span className="plh-avatar-fallback">{studioName?.[0]?.toUpperCase() || 'P'}</span>
          )}
        </div>
        <h1 className="plh-name">{studioName}</h1>
        {projectSubtitle && <p className="plh-subtitle">{projectSubtitle}</p>}
        <div className="plh-accent-bar" style={{ background: accent }} aria-hidden="true" />
        <p className="plh-active">
          <strong style={{ color: accent }}>{tasksLoading ? '—' : activeCount}</strong> comisiones activas
        </p>
      </div>

      {/* ── Centered options grid (store-style) ── */}
      <nav className="plh-grid" aria-label="Secciones">
        {sections.map(s => (
          <Link
            key={s.key}
            to={s.path}
            className="plh-card"
            style={{ '--accent': accent }}
          >
            <span className="plh-card-icon">{s.icon}</span>
            <span className="plh-card-title">{s.title}</span>
            {s.stat != null && (
              <span className="plh-card-stat" style={{ color: accent }}>
                {tasksLoading ? '...' : `${s.stat} ${s.statLabel}`}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </div>
  )
}
