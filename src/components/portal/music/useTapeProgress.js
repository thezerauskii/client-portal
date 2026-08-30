import { useEffect, useState } from 'react'

/**
 * useTapeProgress — devuelve el progreso de scroll de la ventana (0..1) con
 * throttle por rAF (barato, GPU-friendly). Pensado para la barra de progreso
 * "tipo cinta" del scroll inmersivo. Se desactiva con `enabled:false`.
 *
 * @param {{ enabled?: boolean }} opts
 * @returns {number} 0..1
 */
export function useTapeProgress({ enabled = true } = {}) {
  const [p, setP] = useState(0)

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return
    let raf = 0
    let ticking = false
    const compute = () => {
      ticking = false
      const doc = document.documentElement
      const max = (doc.scrollHeight - window.innerHeight) || 1
      const y = window.scrollY || doc.scrollTop || 0
      setP(Math.max(0, Math.min(1, y / max)))
    }
    const onScroll = () => {
      if (ticking) return
      ticking = true
      raf = requestAnimationFrame(compute)
    }
    compute()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [enabled])

  return p
}

export default useTapeProgress
