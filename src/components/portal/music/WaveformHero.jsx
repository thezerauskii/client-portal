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
      const gap = 3
      const barW = 6
      const step = barW + gap
      const bars = Math.max(16, Math.floor(w / step))
      const totalW = bars * step
      const offset = (w - totalW) / 2 + gap / 2
      const mid = h / 2
      const maxBar = h * 0.72

      // subtle center glow behind the bars
      const grad = ctx.createRadialGradient(w / 2, mid, 0, w / 2, mid, Math.max(w, h) * 0.6)
      grad.addColorStop(0, rgba(0.12))
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)

      ctx.save()
      ctx.shadowColor = rgba(0.55)
      ctx.shadowBlur = 12
      for (let i = 0; i < bars; i++) {
        const x = offset + i * step
        // layered sines create an organic, music-like envelope
        const p1 = Math.sin(t * 0.0022 + i * 0.28)
        const p2 = Math.sin(t * 0.0011 + i * 0.13 + 1.3)
        const p3 = Math.sin(t * 0.0035 + i * 0.5 + 2.1)
        const v = (p1 * 0.5 + p2 * 0.3 + p3 * 0.2) * 0.5 + 0.5 // 0..1
        const bh = Math.max(barW, (0.14 + v * 0.86) * maxBar)
        const y = mid - bh / 2
        // vertical gradient per bar for a glossy look
        const bg = ctx.createLinearGradient(0, y, 0, y + bh)
        bg.addColorStop(0, rgba(0.95))
        bg.addColorStop(0.5, rgba(0.75))
        bg.addColorStop(1, rgba(0.35))
        ctx.fillStyle = bg
        roundRect(ctx, x, y, barW, bh, barW / 2)
        ctx.fill()
      }
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
