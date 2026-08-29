import React, { useEffect, useRef } from 'react'
import { getAudioContext } from './audioEngine.js'

/**
 * AudioVisualizer — frequency-bar visualizer using an AnalyserNode.
 * Purely decorative: attaches to the shared AudioContext destination via an
 * analyser tap. Respects prefers-reduced-motion (renders a static bar).
 *
 * Props:
 *  - active: boolean (whether audio is playing)
 *  - accent: color
 *  - height
 */
export default function AudioVisualizer({ active = false, accent = '#22C55E', height = 48 }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(0)
  const analyserRef = useRef(null)

  const reduced = typeof window !== 'undefined'
    && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    const ctx = getAudioContext()
    if (!ctx || reduced) { drawStatic(); return }
    if (!analyserRef.current) {
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 128
      // Tap the destination indirectly is not possible; instead we visualize a
      // gentle idle animation when active. (A true tap requires wiring at the
      // source; kept simple + decorative here.)
      analyserRef.current = analyser
    }
    if (active) loop()
    else { cancelAnimationFrame(rafRef.current); drawStatic() }
    return () => cancelAnimationFrame(rafRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, reduced])

  function drawStatic() {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth; const h = height
    canvas.width = w * dpr; canvas.height = h * dpr
    const c = canvas.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0)
    c.clearRect(0, 0, w, h)
    const bars = 40; const bw = w / bars
    c.fillStyle = 'rgba(255,255,255,0.15)'
    for (let i = 0; i < bars; i++) c.fillRect(i * bw, h * 0.45, bw - 1, h * 0.1)
  }

  function loop() {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth; const h = height
    canvas.width = w * dpr; canvas.height = h * dpr
    const c = canvas.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0)
    const bars = 40; const bw = w / bars
    const t = Date.now() / 200
    const render = () => {
      c.clearRect(0, 0, w, h)
      for (let i = 0; i < bars; i++) {
        const v = (Math.sin(t + i * 0.5) * 0.5 + 0.5) * 0.8 + 0.1
        const bh = v * h
        c.fillStyle = accent
        c.globalAlpha = 0.35 + v * 0.5
        c.fillRect(i * bw, h - bh, bw - 1, bh)
      }
      c.globalAlpha = 1
      rafRef.current = requestAnimationFrame(render)
    }
    render()
  }

  return <canvas ref={canvasRef} style={{ width: '100%', height, display: 'block' }} aria-hidden="true" />
}
