import React, { useEffect, useRef, useCallback } from 'react'

/**
 * CompareWaveform — dibuja las 2 pistas (Original / Master) SUPERPUESTAS en un
 * canvas, como el comparador clásico. La opacidad de cada onda refleja el
 * crossfade (mix): al girar la perilla se enfatiza la que suena más. Muestra el
 * playhead según progress y permite click-para-buscar.
 *
 * Es puramente visual: recibe los peaks ya calculados (min/max por columna) y no
 * toca audio. Se coloca detrás de la capa de jacks/cables del patchbay.
 *
 * Props:
 *  - peaksA, peaksB: [{min,max}] | null
 *  - mix: 0..1 (0 = énfasis Original, 1 = énfasis Master)
 *  - progress: 0..1 (playhead)
 *  - colorA: color Original (azul petróleo por defecto)
 *  - colorB: color Master (acento)
 *  - onSeek: (ratio 0..1) => void  (opcional)
 */
export default function CompareWaveform({ peaksA, peaksB, mix = 0.5, progress = 0, colorA = '#4a7a8c', colorB = '#22c55e', onSeek }) {
  const canvasRef = useRef(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth || 1
    const h = canvas.clientHeight || 1
    canvas.width = Math.max(1, Math.floor(w * dpr))
    canvas.height = Math.max(1, Math.floor(h * dpr))
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    const mid = h / 2

    const drawWave = (peaks, color, emphasis) => {
      if (!peaks || !peaks.length) return
      const cols = peaks.length
      const colW = w / cols
      ctx.globalAlpha = 0.3 + emphasis * 0.6
      ctx.fillStyle = color
      for (let i = 0; i < cols; i++) {
        const p = peaks[i]
        const x = i * colW
        const top = mid - Math.abs(p.max) * mid * 0.9
        const bot = mid + Math.abs(p.min) * mid * 0.9
        ctx.fillRect(x, top, Math.max(1, colW - 0.4), Math.max(1, bot - top))
      }
      ctx.globalAlpha = 1
    }

    drawWave(peaksA, colorA, 1 - mix)  // Original (fondo)
    drawWave(peaksB, colorB, mix)      // Master (encima)

    // playhead
    if (progress > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.fillRect(w * progress - 1, 0, 2, h)
    }
  }, [peaksA, peaksB, mix, progress, colorA, colorB])

  useEffect(() => { draw() }, [draw])
  useEffect(() => {
    const onResize = () => draw()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [draw])

  const handleClick = (e) => {
    if (!onSeek) return
    const rect = e.currentTarget.getBoundingClientRect()
    onSeek(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)))
  }

  return <canvas ref={canvasRef} className="pbc-wave-canvas" onClick={handleClick} />
}
