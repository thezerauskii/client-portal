import { useEffect, useRef, useState } from 'react'

/**
 * useParallax — devuelve un desplazamiento vertical (px) proporcional al scroll,
 * para dar profundidad por capas. rAF-throttled y passive. Respeta
 * prefers-reduced-motion (devuelve 0 siempre) y `enabled:false`.
 *
 * @param {{ speed?: number, enabled?: boolean, max?: number }} opts
 *   speed: factor (0.1 lento, 0.4 al frente). max: clamp en px.
 * @returns {number} offset en px (puedes usarlo en translateY)
 */
export function useParallax({ speed = 0.2, enabled = true, max = 120 } = {}) {
  const [offset, setOffset] = useState(0)
  const ref = useRef(null)
  const ticking = useRef(false)
  const raf = useRef(0)

  const reduced = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

  useEffect(() => {
    if (!enabled || reduced || typeof window === 'undefined') { setOffset(0); return }
    const el = ref.current
    const compute = () => {
      ticking.current = false
      let base
      if (el) {
        const r = el.getBoundingClientRect()
        base = (window.innerHeight / 2) - (r.top + r.height / 2)
      } else {
        base = window.scrollY || 0
      }
      const v = Math.max(-max, Math.min(max, base * speed))
      setOffset(v)
    }
    const onScroll = () => {
      if (ticking.current) return
      ticking.current = true
      raf.current = requestAnimationFrame(compute)
    }
    compute()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf.current)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [speed, enabled, max, reduced])

  return [ref, offset]
}

export default useParallax
