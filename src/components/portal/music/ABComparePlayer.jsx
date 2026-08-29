import React, { useEffect, useRef, useState, useCallback } from 'react'
import { getAudioContext, loadAudioBuffer, resumeContext, isWebAudioSupported } from './audioEngine.js'
import { crossfadeGains, downsamplePeaks } from '../../../shared/domain/musicStudio.js'
import './music.css'

/**
 * ABComparePlayer — plays two audio tracks (A="before", B="after") in perfect
 * sync and cross-fades between them with a draggable slider, in real time.
 * The "after" waveform is revealed over the "before" one (photo-AI style).
 *
 * Props:
 *  - trackA, trackB: { url, name }
 *  - labelA, labelB: strings
 *  - accent: color
 */
export default function ABComparePlayer({ trackA, trackB, labelA = 'Original', labelB = 'Remaster', accent = '#22C55E' }) {
  const canvasRef = useRef(null)
  const bufA = useRef(null); const bufB = useRef(null)
  const peaksA = useRef(null); const peaksB = useRef(null)
  const srcA = useRef(null); const srcB = useRef(null)
  const gainA = useRef(null); const gainB = useRef(null)
  const startedAt = useRef(0); const offset = useRef(0)
  const rafRef = useRef(0)
  const mixRef = useRef(0.5)  // 0 = A, 1 = B

  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)
  const [mix, setMix] = useState(0.5)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [unsupported] = useState(!isWebAudioSupported())

  const urlA = trackA?.url
  const urlB = trackB?.url

  useEffect(() => {
    let cancelled = false
    if (!urlA || !urlB || unsupported) { setLoading(false); return }
    setLoading(true); setError(null)
    Promise.all([loadAudioBuffer(urlA), loadAudioBuffer(urlB)])
      .then(([a, b]) => {
        if (cancelled) return
        bufA.current = a; bufB.current = b
        peaksA.current = downsamplePeaks(a.getChannelData(0), 600)
        peaksB.current = downsamplePeaks(b.getChannelData(0), 600)
        setDuration(Math.max(a.duration, b.duration))
        setLoading(false)
        draw(0)
      })
      .catch(e => { if (!cancelled) { setError(e.message || 'Error de audio'); setLoading(false) } })
    return () => { cancelled = true; stop() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlA, urlB, unsupported])

  const draw = useCallback((progressSec) => {
    const canvas = canvasRef.current
    if (!canvas || !peaksA.current || !peaksB.current) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth; const h = 110
    canvas.width = w * dpr; canvas.height = h * dpr
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    const mid = h / 2
    const cols = peaksA.current.length
    const colW = w / cols
    const splitX = w * mixRef.current
    const dur = duration || 1
    const progRatio = Math.max(0, Math.min(1, progressSec / dur))
    for (let i = 0; i < cols; i++) {
      const x = i * colW
      // choose which track's peaks based on the split (visual reveal)
      const useB = x < splitX
      const p = useB ? peaksB.current[i] : peaksA.current[i]
      const top = mid - Math.abs(p.max) * mid * 0.9
      const bot = mid + Math.abs(p.min) * mid * 0.9
      const played = (i / cols) <= progRatio
      let color
      if (useB) color = played ? accent : 'rgba(34,197,94,0.35)'
      else color = played ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.18)'
      ctx.fillStyle = color
      ctx.fillRect(x, top, Math.max(1, colW - 0.5), Math.max(1, bot - top))
    }
    // split line
    ctx.fillStyle = accent
    ctx.fillRect(splitX - 1, 0, 2, h)
  }, [accent, duration])

  const applyMix = useCallback((x) => {
    mixRef.current = x
    const g = crossfadeGains(x)
    if (gainA.current) gainA.current.gain.value = g.a
    if (gainB.current) gainB.current.gain.value = g.b
    draw(current)
  }, [current, draw])

  function handleMix(e) {
    const x = parseFloat(e.target.value)
    setMix(x); applyMix(x)
  }

  const tick = useCallback(() => {
    const ctx = getAudioContext()
    if (!ctx || !bufA.current) return
    const elapsed = ctx.currentTime - startedAt.current + offset.current
    const cur = Math.min(elapsed, duration)
    setCurrent(cur); draw(cur)
    if (elapsed >= duration) { stopInternal(); setCurrent(0); return }
    rafRef.current = requestAnimationFrame(tick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, draw])

  function stopInternal() {
    cancelAnimationFrame(rafRef.current)
    for (const ref of [srcA, srcB]) {
      if (ref.current) { try { ref.current.onended = null; ref.current.stop() } catch {} ref.current.disconnect(); ref.current = null }
    }
    setPlaying(false)
  }
  function stop() { stopInternal(); offset.current = 0 }

  const playFrom = useCallback(async (off) => {
    const ctx = getAudioContext()
    if (!ctx || !bufA.current || !bufB.current) return
    await resumeContext()
    stopInternal()
    const g = crossfadeGains(mixRef.current)
    const sA = ctx.createBufferSource(); sA.buffer = bufA.current
    const gA = ctx.createGain(); gA.gain.value = g.a
    sA.connect(gA); gA.connect(ctx.destination)
    const sB = ctx.createBufferSource(); sB.buffer = bufB.current
    const gB = ctx.createGain(); gB.gain.value = g.b
    sB.connect(gB); gB.connect(ctx.destination)
    offset.current = Math.max(0, Math.min(off, duration - 0.01))
    startedAt.current = ctx.currentTime
    sA.start(0, offset.current); sB.start(0, offset.current)
    srcA.current = sA; srcB.current = sB
    gainA.current = gA; gainB.current = gB
    setPlaying(true)
    rafRef.current = requestAnimationFrame(tick)
  }, [duration, tick])

  function toggle() {
    if (playing) { stopInternal(); offset.current = current }
    else playFrom(current >= duration ? 0 : current)
  }
  function seek(sec) {
    const s = Math.max(0, Math.min(sec, duration))
    setCurrent(s); draw(s)
    if (playing) playFrom(s); else offset.current = s
  }
  function handleCanvasClick(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    seek(((e.clientX - rect.left) / rect.width) * duration)
  }

  const fmt = (s) => { const m = Math.floor(s / 60); const ss = Math.floor(s % 60); return `${m}:${ss.toString().padStart(2, '0')}` }

  if (unsupported) {
    return (
      <div className="ab-player wf-fallback">
        <p className="wf-note">Tu navegador no soporta el comparador interactivo. Escucha por separado:</p>
        {urlA && <audio src={urlA} controls style={{ width: '100%', marginBottom: 6 }} />}
        {urlB && <audio src={urlB} controls style={{ width: '100%' }} />}
      </div>
    )
  }

  return (
    <div className="ab-player">
      <div className="ab-labels">
        <span className="ab-label ab-label--a">{labelA}</span>
        <span className="ab-label ab-label--b" style={{ color: accent }}>{labelB}</span>
      </div>

      <div className="ab-canvas-wrap">
        {loading && <div className="wf-status">Cargando pistas…</div>}
        {error && <div className="wf-status wf-status--err">{error}</div>}
        <canvas
          ref={canvasRef}
          className="ab-canvas"
          style={{ height: 110, display: loading || error ? 'none' : 'block' }}
          onClick={handleCanvasClick}
        />
      </div>

      <div className="ab-controls">
        <button className="wf-play-btn" onClick={toggle} disabled={loading || !!error} aria-label={playing ? 'Pausar' : 'Reproducir'} style={{ '--accent': accent }}>
          {playing
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
        </button>
        <span className="wf-time">{fmt(current)} / {fmt(duration)}</span>
      </div>

      <div className="ab-slider-row">
        <span className="ab-slider-end">{labelA}</span>
        <input
          className="ab-slider"
          type="range" min="0" max="1" step="0.01"
          value={mix}
          onChange={handleMix}
          disabled={loading || !!error}
          aria-label="Comparar antes y después"
          style={{ '--accent': accent }}
        />
        <span className="ab-slider-end">{labelB}</span>
      </div>
      <p className="ab-hint">Arrastra el control mientras suena para escuchar la diferencia.</p>
    </div>
  )
}
