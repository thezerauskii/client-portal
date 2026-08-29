import React, { useEffect, useMemo, useState } from 'react'
import { usePortalContext } from '../../components/portal/PortalDataProvider.jsx'
import { normalizeMusicStudio } from '../../shared/domain/musicStudio.js'
import SpectrogramCompare from '../../components/portal/music/SpectrogramCompare.jsx'
import WaveformPlayer from '../../components/portal/music/WaveformPlayer.jsx'
import FxRack from '../../components/portal/music/FxRack.jsx'
import { SynthCablesBackground } from '../../components/portal/music/SynthCable.jsx'
import './PortalMusic.css'

/** POST helper — fire-and-forget analytics/interaction endpoints. */
function post(url, body) {
  try {
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {})
  } catch { /* ignore */ }
}

export default function PortalMusic() {
  const { artistId, studioName, accentColor, musicStudio } = usePortalContext()
  const accent = accentColor || '#22C55E'
  const data = useMemo(() => normalizeMusicStudio(musicStudio || {}), [musicStudio])

  const [likedTracks, setLikedTracks] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('music_likes_' + artistId) || '[]')) } catch { return new Set() }
  })

  const clientId = useMemo(() => {
    let id = localStorage.getItem('music_client_id')
    if (!id) { id = 'c_' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('music_client_id', id) }
    return id
  }, [])

  const hero = data.hero
  const featured = data.comparisons.find(c => c.id === hero.featuredComparisonId) || data.comparisons[0] || null

  function onFiverr(target) {
    post('/api/music/fiverr-click', { artistId, target })
  }
  function onPlay(trackId) {
    post('/api/music/play', { artistId, trackId })
  }
  function toggleLike(trackId) {
    if (likedTracks.has(trackId)) return
    const next = new Set(likedTracks); next.add(trackId); setLikedTracks(next)
    try { localStorage.setItem('music_likes_' + artistId, JSON.stringify([...next])) } catch {}
    post('/api/music/like', { artistId, trackId, clientId })
  }

  const isAnalog = data.theme === 'synth-analog'

  return (
    <div className={`pm-root ${isAnalog ? 'pm-root--analog' : ''}`} style={{ '--accent': accent }}>
      {/* ── HERO ── */}
      <section className="pm-hero" style={hero.bgType === 'image' && hero.bgUrl ? { backgroundImage: `url(${hero.bgUrl})` } : undefined}>
        {hero.bgType === 'video' && hero.bgUrl && (
          <video className="pm-hero-video" src={hero.bgUrl} autoPlay muted loop playsInline />
        )}
        <div className="pm-hero-overlay" />
        <div className="pm-hero-content">
          <h1 className="pm-hero-title">{hero.headline || studioName}</h1>
          {hero.tagline && <p className="pm-hero-tagline">{hero.tagline}</p>}
          {(hero.metrics || []).length > 0 && (
            <div className="pm-metrics">
              {hero.metrics.map((m, i) => (
                <div className="pm-metric" key={i}>
                  <span className="pm-metric-val" style={{ color: accent }}>{m.value}</span>
                  <span className="pm-metric-label">{m.label}</span>
                </div>
              ))}
            </div>
          )}
          {hero.fiverrUrl && (
            <a className="pm-cta" href={hero.fiverrUrl} target="_blank" rel="noopener noreferrer" onClick={() => onFiverr('hero')} style={{ background: accent }}>
              {hero.ctaLabel || 'Contrátame en Fiverr'}
            </a>
          )}
        </div>
      </section>

      {/* ── FEATURED DEMO (always present as preview) ── */}
      <section className="pm-section pm-section--analog">
        {isAnalog && <SynthCablesBackground accent={accent} />}
        <h2 className="pm-h2">Escucha la magia</h2>
        <p className="pm-sub">Gira la perilla para escuchar el master frente al original, en tiempo real.</p>
        {featured?.trackA?.url && featured?.trackB?.url ? (
          <SpectrogramCompare trackA={featured.trackA} trackB={featured.trackB} labelA={featured.labelA} labelB={featured.labelB} accent={accent} />
        ) : (
          <div className="mm-empty-card">Aquí aparecerá el comparador de master (Original vs. Master) con una perilla analógica.</div>
        )}
      </section>

      {/* ── GIGS ── */}
      {data.gigs.length > 0 && (
        <section className="pm-section">
          <h2 className="pm-h2">Paquetes</h2>
          <div className="pm-gigs">
            {data.gigs.map(g => (
              <div className="pm-gig" key={g.id}>
                {g.imageUrl && (
                  <a href={g.fiverrUrl || '#'} target="_blank" rel="noopener noreferrer" onClick={() => g.fiverrUrl && onFiverr(g.id)} className="pm-gig-imglink">
                    <img src={g.imageUrl} alt={g.title} className="pm-gig-img" />
                  </a>
                )}
                <span className={`pm-gig-tier pm-gig-tier--${g.tier}`}>{g.tier === 'basic' ? 'Básico' : g.tier === 'pro' ? 'Pro' : 'Estándar'}</span>
                <h3 className="pm-gig-title">{g.title}</h3>
                <div className="pm-gig-price" style={{ color: accent }}>{g.price ? `${g.price} ${g.currency || ''}` : ''}</div>
                {g.description && <p className="pm-gig-desc">{g.description}</p>}
                {(g.includes || []).length > 0 && (
                  <ul className="pm-gig-includes">{g.includes.map((it, i) => <li key={i}>{it}</li>)}</ul>
                )}
                <div className="pm-gig-meta">
                  {g.deliveryDays && <span>⏱ {g.deliveryDays} días</span>}
                  {g.revisions && <span>↻ {g.revisions} revisiones</span>}
                </div>
                {g.fiverrUrl && (
                  <a className="pm-gig-cta" href={g.fiverrUrl} target="_blank" rel="noopener noreferrer" onClick={() => onFiverr(g.id)} style={{ borderColor: accent, color: accent }}>
                    Pedir en Fiverr
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── EXAMPLES: more comparisons ── */}
      {data.comparisons.filter(c => c !== featured).length > 0 && (
        <section className="pm-section">
          <h2 className="pm-h2">Más comparaciones</h2>
          {data.comparisons.filter(c => c !== featured).map(c => (
            c.trackA?.url && c.trackB?.url
              ? <div className="pm-block" key={c.id}><h3 className="pm-block-title">{c.title}{c.genre ? ` · ${c.genre}` : ''}</h3><SpectrogramCompare trackA={c.trackA} trackB={c.trackB} labelA={c.labelA} labelB={c.labelB} accent={accent} /></div>
              : null
          ))}
        </section>
      )}

      {/* ── LIBRARY ── */}
      {data.library.length > 0 && (
        <section className="pm-section">
          <h2 className="pm-h2">Librería</h2>
          {data.library.map(t => t.audio?.url && (
            <div className="pm-track" key={t.id}>
              <div className="pm-track-head">
                <div>
                  <h3 className="pm-track-title">{t.title}</h3>
                  {t.category && <span className="pm-track-cat">{t.category}</span>}
                </div>
                {data.interactions.allowLikes && (
                  <button className={`pm-like ${likedTracks.has(t.id) ? 'pm-like--on' : ''}`} onClick={() => toggleLike(t.id)} aria-label="Me gusta" style={{ color: likedTracks.has(t.id) ? accent : undefined }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={likedTracks.has(t.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  </button>
                )}
              </div>
              {t.description && <p className="pm-track-desc">{t.description}</p>}
              <WaveformPlayer url={t.audio.url} accent={accent} onEnded={() => {}} registerSeek={() => {}} onTime={(cur) => { if (cur > 0.5 && !t.__counted) { t.__counted = true; onPlay(t.id) } }} />
            </div>
          ))}
        </section>
      )}

      {/* ── VIDEO DEMO ── */}
      {data.videoDemoUrl && (
        <section className="pm-section">
          <h2 className="pm-h2">Video demo</h2>
          {/youtube\.com|youtu\.be/.test(data.videoDemoUrl) ? (
            <div className="pm-video">
              <iframe
                src={data.videoDemoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                title="Video demo" frameBorder="0" allow="accelerometer; encrypted-media" allowFullScreen />
            </div>
          ) : (
            <video className="pm-video" src={data.videoDemoUrl} controls />
          )}
        </section>
      )}

      {/* ── SOUNDCLOUD ── */}
      {data.soundcloudUser && (
        <section className="pm-section">
          <h2 className="pm-h2">Escúchame en SoundCloud</h2>
          <a className="pm-soundcloud" href={`https://soundcloud.com/${data.soundcloudUser}`} target="_blank" rel="noopener noreferrer">
            @{data.soundcloudUser} en SoundCloud →
          </a>
        </section>
      )}

      {/* ── FX DEMO ── */}
      {data.fxDemo?.audio?.url && (
        <section className="pm-section">
          <h2 className="pm-h2">Prueba mis efectos</h2>
          <FxRack audio={data.fxDemo.audio} accent={accent} defaults={data.fxDemo.enabledDefaults} />
        </section>
      )}

      {/* ── TOOLS ── */}
      {data.tools.length > 0 && (
        <section className="pm-section">
          <h2 className="pm-h2">Mi setup / VSTs</h2>
          <div className="pm-tools">
            {data.tools.map(t => (
              <div className="pm-tool" key={t.id}>
                {t.logoUrl && <img src={t.logoUrl} alt="" className="pm-tool-logo" />}
                <div>
                  <span className="pm-tool-name">{t.name}</span>
                  {t.category && <span className="pm-tool-cat">{t.category}</span>}
                  {t.note && <p className="pm-tool-note">{t.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── TESTIMONIALS ── */}
      {data.testimonials.length > 0 && (
        <section className="pm-section">
          <h2 className="pm-h2">Lo que dicen mis clientes</h2>
          <div className="pm-testimonials">
            {data.testimonials.map(t => (
              <div className="pm-testimonial" key={t.id}>
                <div className="pm-stars" style={{ color: accent }}>{'★'.repeat(t.rating || 5)}</div>
                <p className="pm-testimonial-text">"{t.text}"</p>
                <span className="pm-testimonial-author">— {t.author}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── FINAL CTA ── */}
      {hero.fiverrUrl && (
        <section className="pm-section pm-final">
          <h2 className="pm-h2">¿Listo para empezar?</h2>
          <a className="pm-cta" href={hero.fiverrUrl} target="_blank" rel="noopener noreferrer" onClick={() => onFiverr('hero')} style={{ background: accent }}>
            {hero.ctaLabel || 'Contrátame en Fiverr'}
          </a>
        </section>
      )}
    </div>
  )
}
