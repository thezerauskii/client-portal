import React, { useEffect, useRef } from 'react'

/**
 * WaveformHero — an animated waveform/spectrum background for the hero.
 * Pure Canvas + requestAnimationFrame (no audio needed). Draws layered,
 * flowing sine bars that shimmer in the accent color. Respects
 * prefers-reduced-motion (renders a single static frame).
 *
 * Props: accent, height (optional, defaults to fill container)
 */
export default function WaveformHero({ accent = '#22C55E' }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const reduced = typeof window !== 'undefined' && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const ctx = canvas.getContext('2d')
    let w = 0, h = 0
    function resize() {
      const dpr = window.devicePixelRatio || 1
      w = canvas.clientWidth; h = canvas.clientHeight
      canvas.width = w * dpr; canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    // parse accent to rgb for alpha layering
    function hexToRgb(hex) {
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '')
      return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 34, g: 197, b: 94 }
    }
    const c = hexToRgb(accent)

    function frame(t) {
      ctx.clearRect(0, 0, w, h)
      const bars = Math.max(24, Math.floor(w / 12))
      const bw = w / bars
      const mid = h / 2
      // three layered waveforms with different phases/alpha
      const layers = [
        { amp: 0.42, speed: 0.0016, freq: 0.9, alpha: 0.5 },
        { amp: 0.30, speed: 0.0024, freq: 1.6, alpha: 0.35 },
        { amp: 0.55, speed: 0.0011, freq: 0.5, alpha: 0.22 },
      ]
      for (const L of layers) {
        for (let i = 0; i < bars; i++) {
          const x = i * bw
          const phase = t * L.speed + i * L.freq * 0.12
          const v = (Math.sin(phase) * 0.5 + 0.5) * L.amp + 0.05
          const bh = v * h
          ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${L.alpha})`
          ctx.fillRect(x, mid - bh / 2, Math.max(1, bw - 2), bh)
        }
      }
    }

    if (reduced) { frame(0); return () => ro.disconnect() }
    const loop = (ts) => { frame(ts); rafRef.current = requestAnimationFrame(loop) }
    rafRef.current = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect() }
  }, [accent])

  return <canvas ref={canvasRef} className="waveform-hero" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
}
