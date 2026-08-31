import React from 'react'
import PatchbayCompare from './PatchbayCompare.jsx'
import SpectrogramCompare from './SpectrogramCompare.jsx'
import WaveformPlayer from './WaveformPlayer.jsx'
import FxRack from './FxRack.jsx'
import WebAudioSynth from './WebAudioSynth.jsx'
import Workbench from './Workbench.jsx'
import ContactPatch from './ContactPatch.jsx'
import SocialIcon from './SocialIcon.jsx'
import { videoEmbed, spotifyEmbedUrl, soundcloudEmbedUrl, SOCIAL_PLATFORMS } from '../../../shared/domain/musicStudio.js'

/**
 * ModuleAudio — renderiza los MÓDULOS DE AUDIO/INTERACTIVOS envolviendo los
 * componentes existentes. Resuelve `dataRef` contra los datos de music_studio y
 * conserva TODA la analítica (fiverr-click, play-count, like) vía handlers.
 *
 * Se pasa a ModuleCanvas como `renderAudioModule`. Devuelve null para tipos que
 * no maneja (ModuleContent cubre los de contenido).
 *
 * Props:
 *  - mod: módulo normalizado.
 *  - data: music_studio normalizado (comparisons, library, gigs, synth, fxDemo, etc.).
 *  - accent
 *  - handlers: { onFiverr, onPlay, toggleLike, likedTracks }
 *  - socialLinks, platformConnections (del contexto del portal)
 */
export default function ModuleAudio({ mod, data = {}, accent = '#22c55e', handlers = {}, socialLinks = {}, platformConnections = {} }) {
  const p = mod.props || {}
  const byId = (arr, id) => (Array.isArray(arr) ? arr.find(x => x.id === id) : null)

  switch (mod.type) {
    case 'comparator': {
      const cmp = byId(data.comparisons, mod.dataRef) || data.comparisons?.[0] || {}
      // DEFAULT = la CONSOLA VINTAGE con VU, foquitos, casete, perilla y los 5
      // botones REW/PLAY/PAUSE/STOP/FF (PatchbayCompare, el que se ve en Vercel).
      // variant 'spectrogram' → el comparador simple (solo si se pide expreso).
      if (p.variant === 'spectrogram') {
        return <SpectrogramCompare trackA={cmp.trackA} trackB={cmp.trackB} labelA={cmp.labelA} labelB={cmp.labelB} accent={accent} />
      }
      return <PatchbayCompare trackA={cmp.trackA} trackB={cmp.trackB} labelA={cmp.labelA} labelB={cmp.labelB} accent={accent} patchbay={{ ...(data.patchbay || {}), enabled: true }} />
    }

    case 'library-track': {
      const t = byId(data.library, mod.dataRef) || data.library?.[0]
      if (!t) return <div className="mk-module-ph">Pista</div>
      return (
        <div className="mk-audio-track">
          <div className="mk-audio-track-head">
            {t.coverUrl && <img src={t.coverUrl} alt="" className="mk-audio-cover" loading="lazy" />}
            <div>
              <h3 className="mk-audio-title">{t.title}</h3>
              {t.category && <span className="mk-audio-cat">{t.category}</span>}
            </div>
            {handlers.toggleLike && (
              <button className={`mk-like ${handlers.likedTracks?.has(t.id) ? 'is-on' : ''}`} onClick={() => handlers.toggleLike(t.id, !!t.__example)} aria-label="Me gusta">
                <svg width="16" height="16" viewBox="0 0 24 24" fill={handlers.likedTracks?.has(t.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              </button>
            )}
          </div>
          {t.audio?.url && !t.__example
            ? <WaveformPlayer url={t.audio.url} accent={accent} onEnded={() => {}} registerSeek={() => {}} onTime={(cur) => { if (cur > 0.5 && !t.__counted) { t.__counted = true; handlers.onPlay?.(t.id, false) } }} />
            : <div className="mk-wave-ph" aria-hidden="true">{Array.from({ length: 40 }).map((_, i) => <span key={i} style={{ height: `${20 + Math.abs(Math.sin(i * 0.6)) * 60}%`, background: accent }} />)}</div>}
        </div>
      )
    }

    case 'fx-rack':
      // Siempre renderiza: aunque el artista no ponga demo, el visitante puede
      // subir su propia pista para escuchar el preview con efectos.
      return <FxRack audio={data.fxDemo?.audio} accent={accent} defaults={data.fxDemo?.enabledDefaults || {}} allowUpload />

    case 'synth': {
      const preset = data.synth?.presets?.find(x => x.id === data.synth.defaultPresetId) || data.synth?.presets?.[0] || {}
      return <WebAudioSynth preset={preset} accent={accent} octaves={p.octaves || 2} keysHint={data.synth?.keysHint !== false} />
    }

    case 'workbench':
      return <Workbench modules={data.workbench?.modules || []} accent={accent} synthPreset={data.synth?.presets?.[0] || {}} />

    case 'gig': {
      const g = byId(data.gigs, mod.dataRef) || data.gigs?.[0]
      if (!g) return <div className="mk-module-ph">Paquete</div>
      const ex = !!g.__example
      return (
        <div className="mk-gig">
          {g.imageUrl && <img src={g.imageUrl} alt={g.title} className="mk-gig-img" />}
          <span className={`mk-gig-tier mk-gig-tier--${g.tier}`}>{g.tier === 'basic' ? 'Básico' : g.tier === 'pro' ? 'Pro' : 'Estándar'}</span>
          <h3 className="mk-gig-title">{g.title}</h3>
          <div className="mk-gig-price">{g.price ? `${g.price} ${g.currency || ''}` : ''}</div>
          {g.description && <p className="mk-gig-desc">{g.description}</p>}
          {(g.includes || []).length > 0 && <ul className="mk-gig-includes">{g.includes.map((it, i) => <li key={i}>{it}</li>)}</ul>}
          {g.fiverrUrl && !ex
            ? <a className="mk-gig-cta" href={g.fiverrUrl} target="_blank" rel="noopener noreferrer" onClick={() => handlers.onFiverr?.(g.id, ex)}>Pedir en Fiverr</a>
            : <span className="mk-gig-cta mk-gig-cta--dim">Pedir en Fiverr</span>}
        </div>
      )
    }

    case 'soundcloud': {
      const scEmbed = soundcloudEmbedUrl({ url: p.url, user: p.user || data.soundcloudUser })
      const scLink = p.url || (p.user || data.soundcloudUser ? `https://soundcloud.com/${(p.user || data.soundcloudUser).replace(/^@/, '')}` : '')
      return (
        <div className="mk-hud mk-hud--soundcloud">
          <div className="mk-hud-head"><SocialIcon name="soundcloud" size={20} /><span>{p.title || 'SoundCloud'}</span></div>
          {scEmbed
            ? <iframe className="mk-hud-embed" title="SoundCloud" src={scEmbed} allow="autoplay" />
            : <div className="mk-hud-ph">Pega un enlace de SoundCloud o tu usuario.</div>}
          {scLink && <a className="mk-hud-link" href={scLink} target="_blank" rel="noopener noreferrer">Abrir en SoundCloud →</a>}
        </div>
      )
    }

    case 'spotify': {
      const spEmbed = spotifyEmbedUrl(p.url)
      return (
        <div className="mk-hud mk-hud--spotify">
          <div className="mk-hud-head"><SocialIcon name="spotify" size={20} /><span>{p.title || 'Spotify'}</span></div>
          {spEmbed
            ? <iframe className="mk-hud-embed" title="Spotify" src={spEmbed} allow="autoplay; clipboard-write; encrypted-media; picture-in-picture" loading="lazy" />
            : <div className="mk-hud-ph">Pega un enlace de Spotify (track, álbum o playlist).</div>}
          {p.url && <a className="mk-hud-link" href={p.url} target="_blank" rel="noopener noreferrer">Abrir en Spotify →</a>}
        </div>
      )
    }

    case 'video': {
      const url = p.url || data.videoDemoUrl
      const emb = videoEmbed(url)
      if (!emb) return <div className="mk-module-ph">Video</div>
      if (emb.kind === 'file') return <video className="mk-video" src={emb.src} controls playsInline />
      return <div className="mk-video"><iframe src={emb.src} title="Video" frameBorder="0" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen /></div>
    }

    case 'testimonial': {
      const t = byId(data.testimonials, mod.dataRef) || data.testimonials?.[0]
      if (!t) return <div className="mk-module-ph">Testimonio</div>
      return (
        <div className="mk-testimonial">
          <div className="mk-stars">{'★'.repeat(t.rating || 5)}</div>
          <p className="mk-testimonial-text">"{t.text}"</p>
          <span className="mk-testimonial-author">— {t.author}</span>
        </div>
      )
    }

    case 'socials': {
      const links = (p.links || []).filter(l => l && l.url)
      if (links.length > 0) {
        return (
          <div className="mk-socials">
            {links.map((l, i) => (
              <a key={i} className="mk-social-btn" href={l.url} target="_blank" rel="noopener noreferrer"
                 title={(SOCIAL_PLATFORMS.find(s => s.id === l.platform)?.label) || l.platform}>
                <SocialIcon name={l.platform} size={26} />
              </a>
            ))}
          </div>
        )
      }
      return <ContactPatch socialLinks={socialLinks} platformConnections={platformConnections} style={data.patchbay?.contactStyle || 'patchbay'} accent={accent} />
    }

    default:
      return null
  }
}
