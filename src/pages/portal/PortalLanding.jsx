import React, { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { usePortalContext } from '../../components/portal/PortalDataProvider.jsx'
import { supabase } from '../../lib/supabase.js'
import { IconBrush, IconImage, IconCalendar, IconLink } from '../../components/portal/PortalIcons.jsx'

/**
 * Portal landing page — /p/:slug
 * Displays artist info, quick stats, and links to portal sections.
 */
export default function PortalLanding() {
  const { slug } = useParams()
  const { artistId, studioName, projectIcon, accentColor } = usePortalContext()

  const [commissionCount, setCommissionCount] = useState(null)
  const [portfolioCount, setPortfolioCount] = useState(null)
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    if (!artistId || !supabase) return

    let cancelled = false

    async function fetchStats() {
      setLoadingStats(true)

      const [commRes, portRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', artistId)
          .or('archived.is.null,archived.eq.false'),
        supabase
          .from('portfolio_items')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', artistId),
      ])

      if (!cancelled) {
        setCommissionCount(commRes.count ?? 0)
        setPortfolioCount(portRes.count ?? 0)
        setLoadingStats(false)
      }
    }

    fetchStats()
    return () => { cancelled = true }
  }, [artistId])

  const accent = accentColor || 'var(--green, #22C55E)'

  const sections = [
    {
      key: 'commissions',
      title: 'Comisiones',
      icon: <IconBrush size={20} />,
      path: `/p/${slug}/commissions`,
      stat: commissionCount,
      statLabel: 'activas',
    },
    {
      key: 'portfolio',
      title: 'Portafolio',
      icon: <IconImage size={20} />,
      path: `/p/${slug}/portfolio`,
      stat: portfolioCount,
      statLabel: 'obras',
    },
    {
      key: 'calendar',
      title: 'Calendario',
      icon: <IconCalendar size={20} />,
      path: `/p/${slug}/calendar`,
      stat: null,
      statLabel: null,
    },
    {
      key: 'links',
      title: 'Links',
      icon: <IconLink size={20} />,
      path: `/p/${slug}/links`,
      stat: null,
      statLabel: null,
    },
  ]

  return (
    <div style={styles.container}>
      {/* Hero section */}
      <section style={styles.hero}>
        {projectIcon ? (
          <img
            src={projectIcon}
            alt={`${studioName} icon`}
            style={styles.heroIcon}
          />
        ) : (
          <div style={{ ...styles.heroIconPlaceholder, borderColor: accent }}>
            {studioName?.[0]?.toUpperCase() || 'P'}
          </div>
        )}
        <h1 style={styles.heroTitle}>{studioName}</h1>
        <div style={{ ...styles.accentBar, background: accent }} aria-hidden="true" />
      </section>

      {/* Quick stats */}
      <section style={styles.statsRow} aria-label="Estadísticas rápidas">
        <div style={styles.statBox}>
          <span style={{ ...styles.statNumber, color: accent }}>
            {loadingStats ? '—' : commissionCount}
          </span>
          <span style={styles.statLabel}>Comisiones activas</span>
        </div>
        <div style={styles.statBox}>
          <span style={{ ...styles.statNumber, color: accent }}>
            {loadingStats ? '—' : portfolioCount}
          </span>
          <span style={styles.statLabel}>Obras en portafolio</span>
        </div>
      </section>

      {/* Quick-links grid */}
      <section style={styles.grid} aria-label="Secciones del portal">
        {sections.map(section => (
          <Link
            key={section.key}
            to={section.path}
            style={styles.card}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = accent
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border, #2e2e36)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <span style={styles.cardIcon}>{section.icon}</span>
            <span style={styles.cardTitle}>{section.title}</span>
            {section.stat !== null && (
              <span style={{ ...styles.cardStat, color: accent }}>
                {loadingStats ? '...' : `${section.stat} ${section.statLabel}`}
              </span>
            )}
          </Link>
        ))}
      </section>
    </div>
  )
}

// --- Inline styles ---

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2rem',
    padding: '2rem 1rem',
  },

  // Hero
  hero: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
    textAlign: 'center',
  },
  heroIcon: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid var(--border, #2e2e36)',
  },
  heroIconPlaceholder: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    background: 'var(--surface, #1a1a1e)',
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.75rem',
    fontWeight: 700,
    color: 'var(--text, #e8e8ec)',
  },
  heroTitle: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--text, #e8e8ec)',
  },
  accentBar: {
    width: '48px',
    height: '3px',
    borderRadius: '2px',
    marginTop: '0.25rem',
  },

  // Stats
  statsRow: {
    display: 'flex',
    gap: '2rem',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  statBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.2rem',
  },
  statNumber: {
    fontSize: '1.75rem',
    fontWeight: 700,
  },
  statLabel: {
    fontSize: '0.78rem',
    color: 'var(--text-muted, #888896)',
  },

  // Grid
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '1rem',
    width: '100%',
    maxWidth: '640px',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1.5rem 1rem',
    background: 'var(--surface, #1a1a1e)',
    border: '1px solid var(--border, #2e2e36)',
    borderRadius: 'var(--radius, 10px)',
    textDecoration: 'none',
    color: 'var(--text, #e8e8ec)',
    transition: 'border-color 150ms ease, transform 150ms ease',
    cursor: 'pointer',
  },
  cardIcon: {
    fontSize: '1.75rem',
  },
  cardTitle: {
    fontSize: '0.9rem',
    fontWeight: 600,
  },
  cardStat: {
    fontSize: '0.72rem',
    fontWeight: 500,
  },
}
