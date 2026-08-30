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

    const rgba = (a) => `rgba(${c.r},${c.g},${c.b},${a})`

    function frame(t) {
      ctx.clearRect(0, 0, w, h)
      const gap = 2
      const barW = Math.max(3, Math.round(w / 220))
      const step = barW + gap
      const bars = Math.max(24, Math.floor(w / step))
      const totalW = bars * step
      const offset = (w - totalW) / 2 + gap / 2
      const mid = h / 2
      const maxBar = h * 0.82

      // subtle center glow behind the bars
      const glow = ctx.createRadialGradient(w / 2, mid, 0, w / 2, mid, Math.max(w, h) * 0.6)
      glow.addColorStop(0, rgba(0.12))
      glow.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, w, h)

      ctx.save()
      ctx.shadowColor = rgba(0.5)
      ctx.shadowBlur = 8
      for (let i = 0; i < bars; i++) {
        const x = offset + i * step
        const n = i / (bars - 1)               // 0..1 across the width
        // Frequency-band energy: more energy in the lows (left/center), tapering
        // to the highs — like a real spectrum analyzer. Symmetric around center.
        const dist = Math.abs(n - 0.5) * 2      // 0 center → 1 edges
        const bandEnergy = 0.35 + 0.65 * Math.pow(1 - dist, 1.6)
        // Fast + slow modulation per band for a lively, music-like motion.
        const fast = Math.sin(t * 0.010 + i * 0.55)
        const mids = Math.sin(t * 0.004 + i * 0.22 + 1.1)
        const slow = Math.sin(t * 0.0016 + i * 0.09 + 2.3)
        const beat = 0.5 + 0.5 * Math.sin(t * 0.006) // global "pulse"
        let v = (fast * 0.45 + mids * 0.35 + slow * 0.2) * 0.5 + 0.5 // 0..1
        v = Math.pow(v, 1.3) * bandEnergy * (0.7 + 0.3 * beat)
        const bh = Math.max(barW, (0.06 + v) * maxBar)
        // Symmetric bar: grows up AND down from the center axis (mirror).
        const half = bh / 2
        const y = mid - half
        const bg = ctx.createLinearGradient(0, y, 0, y + bh)
        bg.addColorStop(0, rgba(0.35))
        bg.addColorStop(0.5, rgba(0.95))   // brightest at the center axis
        bg.addColorStop(1, rgba(0.35))
        ctx.fillStyle = bg
        roundRect(ctx, x, y, barW, bh, Math.min(barW / 2, 2))
        ctx.fill()
      }
      // thin center reflection line
      ctx.globalAlpha = 0.25
      ctx.fillStyle = rgba(0.6)
      ctx.fillRect(offset, mid - 0.5, totalW, 1)
      ctx.globalAlpha = 1
      ctx.restore()
    }

    function roundRect(ctx, x, y, w2, h2, r) {
      const rr = Math.min(r, w2 / 2, h2 / 2)
      ctx.beginPath()
      ctx.moveTo(x + rr, y)
      ctx.arcTo(x + w2, y, x + w2, y + h2, rr)
      ctx.arcTo(x + w2, y + h2, x, y + h2, rr)
      ctx.arcTo(x, y + h2, x, y, rr)
      ctx.arcTo(x, y, x + w2, y, rr)
      ctx.closePath()
    }

    if (reduced) { frame(0); return () => ro.disconnect() }
    const loop = (ts) => { frame(ts); rafRef.current = requestAnimationFrame(loop) }
    rafRef.current = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect() }
  }, [accent])

  return <canvas ref={canvasRef} className="waveform-hero" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
}
