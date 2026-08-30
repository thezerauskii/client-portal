import React, { useEffect, useMemo, useState } from 'react'
import { usePortalContext } from '../../components/portal/PortalDataProvider.jsx'
import { normalizeMusicStudio } from '../../shared/domain/musicStudio.js'
import SpectrogramCompare from '../../components/portal/music/SpectrogramCompare.jsx'
import WaveformPlayer from '../../components/portal/music/WaveformPlayer.jsx'
import FxRack from '../../components/portal/music/FxRack.jsx'
import { SynthCablesBackground } from '../../components/portal/music/SynthCable.jsx'
import WaveformHero from '../../components/portal/music/WaveformHero.jsx'
import { buildPreviewModel } from './musicPreviewModel.js'
import './PortalMusic.css'

/** POST helper — fire-and-forget analytics/interaction endpoints. */
function post(url, body) {
  try {
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {})
  } catch { /* ignore */ }
}

/** Small "Ejemplo" pill for preview-only blocks. */
function ExampleBadge() {
  return <span className="pm-example-badge" aria-label="contenido de ejemplo">Ejemplo</span>
}

/** SVG image placeholder for example gigs without a real image. */
function GigImagePlaceholder() {
  return (
    <div className="pm-gig-img pm-gig-img--ph" aria-hidden="true">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
    </div>
  )
}

export default function PortalMusic() {
  const { artistId, studioName, accentColor, musicStudio } = usePortalContext()
  const accent = accentColor || '#22C55E'
  const real = useMemo(() => normalizeMusicStudio(musicStudio || {}), [musicStudio])
  const data = useMemo(() => buildPreviewModel(real), [real])

  const [likedTracks, setLikedTracks] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('music_likes_' + artistId) || '[]')) } catch { return new Set() }
  })

  const clientId = useMemo(() => {
    let id = localStorage.getItem('music_client_id')
    if (!id) { id = 'c_' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('music_client_id', id) }
    return id
  }, [])

  const hero = data.hero

  function onFiverr(target, isExample) {
    if (isExample) return
    post('/api/music/fiverr-click', { artistId, target })
  }
  function onPlay(trackId, isExample) {
    if (isExample) return
    post('/api/music/play', { artistId, trackId })
  }
  function toggleLike(trackId, isExample) {
    if (isExample || likedTracks.has(trackId)) return
    const next = new Set(likedTracks); next.add(trackId); setLikedTracks(next)
    try { localStorage.setItem('music_likes_' + artistId, JSON.stringify([...next])) } catch {}
    post('/api/music/like', { artistId, trackId, clientId })
  }

  const isAnalog = data.theme === 'synth-analog'
  const heroIsExample = !!data.hero.__example
  const gigsAreExample = data.gigs.some(g => g.__example)
  const libIsExample = data.library.some(t => t.__example)
  const toolsAreExample = data.tools.some(t => t.__example)
  const testiAreExample = data.testimonials.some(t => t.__example)

  // Featured comparator: prefer a real one with audio, else the (example) first.
  const featured = data.comparisons.find(c => c.id === hero.featuredComparisonId) || data.comparisons[0] || null
  const featuredHasAudio = !!(featured?.trackA?.url && featured?.trackB?.url)

  return (
    <div className={`pm-root ${isAnalog ? 'pm-root--analog' : ''}`} style={{ '--accent': accent }}>
      {/* ── HERO ── */}
      <section className="pm-hero" style={hero.bgType === 'image' && hero.bgUrl ? { backgroundImage: `url(${hero.bgUrl})` } : undefined}>
        {hero.bgType === 'video' && hero.bgUrl && (
          <video className="pm-hero-video" src={hero.bgUrl} autoPlay muted loop playsInline />
        )}
        {(hero.bgType === 'waveform' || heroIsExample) && <WaveformHero accent={accent} />}
        <div className="pm-hero-overlay" />
        {heroIsExample && <div className="pm-hero-badge"><ExampleBadge /></div>}
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
          {hero.fiverrUrl ? (
            <a className="pm-cta" href={hero.fiverrUrl} target="_blank" rel="noopener noreferrer" onClick={() => onFiverr('hero', heroIsExample)} style={{ background: accent }}>
              {hero.ctaLabel || 'Contrátame en Fiverr'}
            </a>
          ) : (
            <span className="pm-cta pm-cta--disabled" style={{ background: accent }}>{hero.ctaLabel || 'Contrátame en Fiverr'}</span>
          )}
        </div>
      </section>

      {/* ── FEATURED DEMO / COMPARADOR (siempre visible) ── */}
      <section className="pm-section pm-section--analog">
        {isAnalog && <SynthCablesBackground accent={accent} />}
        <h2 className="pm-h2">Escucha la magia {!featuredHasAudio && <ExampleBadge />}</h2>
        <p className="pm-sub">Gira la perilla para escuchar el master frente al original, en tiempo real.</p>
        {featuredHasAudio ? (
          <SpectrogramCompare trackA={featured.trackA} trackB={featured.trackB} labelA={featured.labelA} labelB={featured.labelB} accent={accent} />
        ) : (
          <div className="pm-compare-ph">
            <div className="pm-compare-ph-wave" aria-hidden="true"><WaveformHero accent={accent} /></div>
            <div className="pm-compare-ph-inner">
              <div className="pm-compare-ph-tracks">
                <div className="pm-compare-ph-track"><span className="pm-compare-ph-dot" style={{ background: '#60a5fa' }} /> {featured?.labelA || 'Original'}</div>
                <div className="pm-compare-ph-track"><span className="pm-compare-ph-dot" style={{ background: accent }} /> {featured?.labelB || 'Master'}</div>
              </div>
              <div className="pm-compare-ph-knob" aria-hidden="true" style={{ borderColor: accent }}>
                <span className="pm-compare-ph-knob-tick" style={{ background: accent }} />
              </div>
              <p className="pm-compare-ph-note">Aquí aparecerá el comparador Original vs. Master con una perilla analógica.</p>
            </div>
          </div>
        )}
      </section>

      {/* ── PAQUETES / GIGS (siempre visible) ── */}
      <section className="pm-section">
        <h2 className="pm-h2">Paquetes {gigsAreExample && <ExampleBadge />}</h2>
        <div className="pm-gigs">
          {data.gigs.map(g => {
            const ex = !!g.__example
            const inner = (
              <>
                {g.imageUrl ? <img src={g.imageUrl} alt={g.title} className="pm-gig-img" /> : <GigImagePlaceholder />}
              </>
            )
            return (
              <div className="pm-gig" key={g.id}>
                {g.imageUrl && !ex ? (
                  <a href={g.fiverrUrl || '#'} target="_blank" rel="noopener noreferrer" onClick={() => g.fiverrUrl && onFiverr(g.id, ex)} className="pm-gig-imglink">{inner}</a>
                ) : (
                  <div className="pm-gig-imglink">{inner}</div>
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
                {g.fiverrUrl && !ex ? (
                  <a className="pm-gig-cta" href={g.fiverrUrl} target="_blank" rel="noopener noreferrer" onClick={() => onFiverr(g.id, ex)} style={{ borderColor: accent, color: accent }}>
                    Pedir en Fiverr
                  </a>
                ) : (
                  <span className="pm-gig-cta pm-gig-cta--disabled" style={{ borderColor: accent, color: accent }}>Pedir en Fiverr</span>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── MÁS COMPARACIONES (solo reales con audio) ── */}
      {data.comparisons.filter(c => c !== featured && c.trackA?.url && c.trackB?.url).length > 0 && (
        <section className="pm-section">
          <h2 className="pm-h2">Más comparaciones</h2>
          {data.comparisons.filter(c => c !== featured && c.trackA?.url && c.trackB?.url).map(c => (
            <div className="pm-block" key={c.id}><h3 className="pm-block-title">{c.title}{c.genre ? ` · ${c.genre}` : ''}</h3><SpectrogramCompare trackA={c.trackA} trackB={c.trackB} labelA={c.labelA} labelB={c.labelB} accent={accent} /></div>
          ))}
        </section>
      )}

      {/* ── LIBRERÍA (siempre visible) ── */}
      <section className="pm-section">
        <h2 className="pm-h2">Librería {libIsExample && <ExampleBadge />}</h2>
        {data.library.map(t => {
          const ex = !!t.__example
          return (
            <div className="pm-track" key={t.id}>
              <div className="pm-track-head">
                <div>
                  <h3 className="pm-track-title">{t.title}</h3>
                  {t.category && <span className="pm-track-cat">{t.category}</span>}
                </div>
                {data.interactions.allowLikes && (
                  <button className={`pm-like ${likedTracks.has(t.id) ? 'pm-like--on' : ''}`} onClick={() => toggleLike(t.id, ex)} aria-label="Me gusta" style={{ color: likedTracks.has(t.id) ? accent : undefined }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={likedTracks.has(t.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  </button>
                )}
              </div>
              {t.description && <p className="pm-track-desc">{t.description}</p>}
              {t.audio?.url && !ex ? (
                <WaveformPlayer url={t.audio.url} accent={accent} onEnded={() => {}} registerSeek={() => {}} onTime={(cur) => { if (cur > 0.5 && !t.__counted) { t.__counted = true; onPlay(t.id, ex) } }} />
              ) : (
                <div className="pm-wave-ph" aria-hidden="true">
                  {Array.from({ length: 48 }).map((_, i) => <span key={i} style={{ height: `${20 + Math.abs(Math.sin(i * 0.6)) * 60}%`, background: accent }} />)}
                </div>
              )}
            </div>
          )
        })}
      </section>

      {/* ── VIDEO DEMO (solo real) ── */}
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

      {/* ── SOUNDCLOUD (real o bloque explicativo) ── */}
      {data.soundcloudUser ? (
        <section className="pm-section">
          <h2 className="pm-h2">Escúchame en SoundCloud</h2>
          <a className="pm-soundcloud" href={`https://soundcloud.com/${data.soundcloudUser}`} target="_blank" rel="noopener noreferrer">
            @{data.soundcloudUser} en SoundCloud →
          </a>
        </section>
      ) : (
        <section className="pm-section">
          <h2 className="pm-h2">Escúchame en SoundCloud <ExampleBadge /></h2>
          <div className="pm-hint">Aquí enlazarás tu perfil de SoundCloud y tu video demo cuando los agregues.</div>
        </section>
      )}

      {/* ── FX DEMO (solo real) ── */}
      {data.fxDemo?.audio?.url && (
        <section className="pm-section">
          <h2 className="pm-h2">Prueba mis efectos</h2>
          <FxRack audio={data.fxDemo.audio} accent={accent} defaults={data.fxDemo.enabledDefaults} />
        </section>
      )}

      {/* ── VSTs / SETUP (siempre visible) ── */}
      <section className="pm-section">
        <h2 className="pm-h2">Mi setup / VSTs {toolsAreExample && <ExampleBadge />}</h2>
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

      {/* ── TESTIMONIOS (siempre visible) ── */}
      <section className="pm-section">
        <h2 className="pm-h2">Lo que dicen mis clientes {testiAreExample && <ExampleBadge />}</h2>
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

      {/* ── CTA FINAL ── */}
      <section className="pm-section pm-final">
        <h2 className="pm-h2">¿Listo para empezar?</h2>
        {hero.fiverrUrl ? (
          <a className="pm-cta" href={hero.fiverrUrl} target="_blank" rel="noopener noreferrer" onClick={() => onFiverr('hero', heroIsExample)} style={{ background: accent }}>
            {hero.ctaLabel || 'Contrátame en Fiverr'}
          </a>
        ) : (
          <span className="pm-cta pm-cta--disabled" style={{ background: accent }}>{hero.ctaLabel || 'Contrátame en Fiverr'}</span>
        )}
      </section>
    </div>
  )
}
