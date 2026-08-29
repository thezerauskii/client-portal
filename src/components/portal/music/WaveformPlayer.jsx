import React, { useEffect, useRef, useState, useCallback } from 'react'
import { getAudioContext, loadAudioBuffer, resumeContext, isWebAudioSupported } from './audioEngine.js'
import { downsamplePeaks } from '../../../shared/domain/musicStudio.js'
import './music.css'

/**
 * WaveformPlayer — decodes an audio URL, draws a Canvas waveform, plays with
 * play/pause + scrub + click-to-seek. Optional timeline markers overlay
 * (children rendered absolutely positioned by parent using `onTime`).
 *
 * Props:
 *  - url: audio URL
 *  - accent: accent color
 *  - height: canvas height (px)
 *  - onTime(currentSec, durationSec): playback position callback
 *  - onSeek(sec): called when user seeks
 *  - markers: [{ id, timeSec, color }] optional
 *  - onMarkerClick(marker)
 *  - registerSeek(fn): parent can call fn(sec) to seek programmatically
 */
export default function WaveformPlayer({
  url, accent = '#22C55E', height = 72,
  onTime, onSeek, markers = [], onMarkerClick, onEnded, registerSeek,
}) {
  const canvasRef = useRef(null)
  const bufferRef = useRef(null)
  const peaksRef = useRef(null)
  const sourceRef = useRef(null)
  const gainRef = useRef(null)
  const startedAtRef = useRef(0)     // ctx time when playback started
  const offsetRef = useRef(0)        // seconds into the track at start
  const rafRef = useRef(0)

  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [unsupported] = useState(!isWebAudioSupported())

  // ── Load + decode ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    if (!url || unsupported) { setLoading(false); return }
    setLoading(true); setError(null)
    loadAudioBuffer(url)
      .then(buf => {
        if (cancelled) return
        bufferRef.current = buf
        setDuration(buf.duration)
        peaksRef.current = downsamplePeaks(buf.getChannelData(0), 600)
        setLoading(false)
        draw(0)
      })
      .catch(e => { if (!cancelled) { setError(e.message || 'Error de audio'); setLoading(false) } })
    return () => { cancelled = true; stop() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, unsupported])

  // ── Drawing ─────────────────────────────────────────────────────────────────
  const draw = useCallback((progressSec) => {
    const canvas = canvasRef.current
    const peaks = peaksRef.current
    if (!canvas || !peaks) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = height
    canvas.width = w * dpr
    canvas.height = h * dpr
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    const mid = h / 2
    const cols = peaks.length
    const colW = w / cols
    const dur = bufferRef.current?.duration || 1
    const progRatio = Math.max(0, Math.min(1, progressSec / dur))
    for (let i = 0; i < cols; i++) {
      const p = peaks[i]
      const x = i * colW
      const top = mid - Math.abs(p.max) * mid * 0.95
      const bot = mid + Math.abs(p.min) * mid * 0.95
      const played = (i / cols) <= progRatio
      ctx.fillStyle = played ? accent : 'rgba(255,255,255,0.22)'
      ctx.fillRect(x, top, Math.max(1, colW - 0.5), Math.max(1, bot - top))
    }
  }, [accent, height])

  // ── Playback loop ────────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    const ctx = getAudioContext()
    if (!ctx || !bufferRef.current) return
    const elapsed = ctx.currentTime - startedAtRef.current + offsetRef.current
    const dur = bufferRef.current.duration
    const cur = Math.min(elapsed, dur)
    setCurrent(cur)
    draw(cur)
    onTime?.(cur, dur)
    if (elapsed >= dur) { stopInternal(); setCurrent(0); onEnded?.(); return }
    rafRef.current = requestAnimationFrame(tick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draw, onTime, onEnded])

  function stopInternal() {
    cancelAnimationFrame(rafRef.current)
    if (sourceRef.current) {
      try { sourceRef.current.onended = null; sourceRef.current.stop() } catch { /* already stopped */ }
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
    setPlaying(false)
  }

  function stop() { stopInternal(); offsetRef.current = 0 }

  const playFrom = useCallback(async (offset) => {
    const ctx = getAudioContext()
    const buf = bufferRef.current
    if (!ctx || !buf) return
    await resumeContext()
    stopInternal()
    const src = ctx.createBufferSource()
    src.buffer = buf
    const gain = ctx.createGain()
    src.connect(gain); gain.connect(ctx.destination)
    gainRef.current = gain
    offsetRef.current = Math.max(0, Math.min(offset, buf.duration - 0.01))
    startedAtRef.current = ctx.currentTime
    src.start(0, offsetRef.current)
    sourceRef.current = src
    setPlaying(true)
    rafRef.current = requestAnimationFrame(tick)
  }, [tick])

  function toggle() {
    if (playing) { stopInternal(); offsetRef.current = current }
    else playFrom(current >= duration ? 0 : current)
  }

  const seek = useCallback((sec) => {
    const s = Math.max(0, Math.min(sec, duration || 0))
    setCurrent(s)
    draw(s)
    onSeek?.(s)
    if (playing) playFrom(s)
    else offsetRef.current = s
  }, [duration, draw, onSeek, playing, playFrom])

  // expose seek to parent
  useEffect(() => { registerSeek?.(seek) }, [registerSeek, seek])

  function handleCanvasClick(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    seek(ratio * (duration || 0))
  }

  const fmt = (s) => {
    const m = Math.floor(s / 60); const ss = Math.floor(s % 60)
    return `${m}:${ss.toString().padStart(2, '0')}`
  }

  if (unsupported) {
    return (
      <div className="wf-fallback">
        <audio src={url} controls style={{ width: '100%' }} />
        <p className="wf-note">Tu navegador no soporta la forma de onda interactiva.</p>
      </div>
    )
  }

  return (
    <div className="wf-player">
      <button
        className="wf-play-btn"
        onClick={toggle}
        disabled={loading || !!error}
        aria-label={playing ? 'Pausar' : 'Reproducir'}
        style={{ '--accent': accent }}
      >
        {playing ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        )}
      </button>

      <div className="wf-canvas-wrap">
        {loading && <div className="wf-status">Cargando audio…</div>}
        {error && <div className="wf-status wf-status--err">{error}</div>}
        <canvas
          ref={canvasRef}
          className="wf-canvas"
          style={{ height, display: loading || error ? 'none' : 'block' }}
          onClick={handleCanvasClick}
          role="slider"
          aria-label="Línea de tiempo del audio"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(current)}
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'ArrowRight') seek(current + 5)
            if (e.key === 'ArrowLeft') seek(current - 5)
            if (e.key === ' ') { e.preventDefault(); toggle() }
          }}
        />
        {/* Timeline markers */}
        {!loading && !error && duration > 0 && markers.map(m => (
          <button
            key={m.id}
            className="wf-marker"
            style={{ left: `${(m.timeSec / duration) * 100}%`, background: m.color || accent }}
            title={m.title || `@ ${fmt(m.timeSec)}`}
            onClick={(e) => { e.stopPropagation(); onMarkerClick?.(m) }}
            aria-label={`Comentario en ${fmt(m.timeSec)}`}
          />
        ))}
      </div>

      <span className="wf-time">{fmt(current)} / {fmt(duration)}</span>
    </div>
  )
}
