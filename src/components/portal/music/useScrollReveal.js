import { useEffect, useRef, useState } from 'react'

/**
 * useScrollReveal — revela un elemento cuando entra al viewport (una sola vez).
 * Usa IntersectionObserver. Respeta prefers-reduced-motion: si está activo (o si
 * `enabled` es false, o no hay IO), devuelve revealed:true de entrada (sin animar).
 *
 * @param {{ enabled?: boolean, threshold?: number, rootMargin?: string }} opts
 * @returns {[React.RefObject, boolean]} [ref, revealed]
 */
export function useScrollReveal({ enabled = true, threshold = 0.12, rootMargin = '0px 0px -8% 0px' } = {}) {
  const ref = useRef(null)
  const reduced = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
  const [revealed, setRevealed] = useState(() => !enabled || reduced || typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    if (revealed) return
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { setRevealed(true); return }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { setRevealed(true); io.disconnect(); break }
      }
    }, { threshold, rootMargin })
    io.observe(el)
    return () => io.disconnect()
  }, [revealed, threshold, rootMargin])

  return [ref, revealed]
}

export default useScrollReveal
