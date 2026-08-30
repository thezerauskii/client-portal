/**
 * patchGraph — motor PURO del patchbay vintage (sin DOM, sin Web Audio).
 *
 * Modela puertos (jacks) y cables (conexiones). Decide QUÉ suena; el motor de
 * audio del portal solo EJECUTA lo que aquí se resuelve. Al ser puro, es 100%
 * testeable y se comparte byte a byte entre Electron y el portal (sync-shared).
 *
 * Modelo:
 *   Port  = { id, kind:'out'|'in', role:'source'|'effect'|'sink', label }
 *   Cable = { id, fromPortId, toPortId, color }
 *
 * Regla del grafo: un cable va SIEMPRE de un puerto 'out' a uno 'in'. La señal
 * de una fuente (source.out) llega a la salida (sink.in) directo, o pasando por
 * un efecto (effect.in → effect.out → sink.in). No auto-conexión, no duplicados,
 * no ciclos.
 */

/**
 * Puertos base para el comparador Original/Master (+ efecto opcional + salida).
 * @param {{ hasEffect?: boolean, effectLabel?: string }} [opts]
 * @returns {Array} lista de puertos
 */
export function basePorts({ hasEffect = false, effectLabel = 'FX' } = {}) {
  const ports = [
    { id: 'src-original', kind: 'out', role: 'source', label: 'ORIGINAL' },
    { id: 'src-master', kind: 'out', role: 'source', label: 'MASTER' },
    { id: 'sink-out', kind: 'in', role: 'sink', label: 'OUT' },
  ]
  if (hasEffect) {
    ports.push({ id: 'fx-in', kind: 'in', role: 'effect', label: effectLabel })
    ports.push({ id: 'fx-out', kind: 'out', role: 'effect', label: effectLabel })
  }
  return ports
}

const byId = (ports, id) => ports.find(p => p.id === id) || null

/**
 * ¿Se puede conectar fromId → toId dado el estado actual?
 * Reglas: from debe ser 'out', to debe ser 'in', distinto puerto, sin duplicar
 * el mismo cable, y sin crear un ciclo (out y su propio in del mismo efecto).
 */
export function isValidConnection(ports, cables, fromId, toId) {
  if (!fromId || !toId || fromId === toId) return false
  const from = byId(ports, fromId)
  const to = byId(ports, toId)
  if (!from || !to) return false
  if (from.kind !== 'out' || to.kind !== 'in') return false
  // no duplicar exactamente el mismo cable
  if (cables.some(c => c.fromPortId === fromId && c.toPortId === toId)) return false
  // no conectar la salida de un efecto a su propia entrada (ciclo trivial)
  if (from.role === 'effect' && to.role === 'effect'
      && from.id.replace('-out', '') === to.id.replace('-in', '')) return false
  return true
}

/** Devuelve un NUEVO array de cables con el cable añadido (o el mismo si inválido). */
export function addCable(ports, cables, fromId, toId, color = '#f472b6') {
  if (!isValidConnection(ports, cables, fromId, toId)) return cables
  const id = `cbl_${fromId}__${toId}`
  return [...cables, { id, fromPortId: fromId, toPortId: toId, color }]
}

/** Devuelve un NUEVO array de cables sin el cable indicado. */
export function removeCable(cables, cableId) {
  return cables.filter(c => c.id !== cableId)
}

/**
 * Alterna la conexión de una fuente a la salida (o a un efecto si se indica):
 * si ya está conectada, la quita; si no, la añade. Útil para el fallback
 * accesible (botón Conectar/Desconectar).
 */
export function toggleSource(ports, cables, sourceId, targetId = 'sink-out', color) {
  const existing = cables.find(c => c.fromPortId === sourceId && c.toPortId === targetId)
  if (existing) return removeCable(cables, existing.id)
  return addCable(ports, cables, sourceId, targetId, color)
}

/**
 * Resuelve qué fuentes llegan realmente a la salida, y por qué cadena.
 * @returns {{ activeSources: string[], chains: Array<{ source, effect|null }> }}
 *   activeSources: ids de fuentes que suenan (directo o vía efecto).
 *   chains: para cada fuente activa, si pasa por un efecto o va directo.
 */
export function resolveRouting(ports, cables) {
  const outEdges = (portId) => cables.filter(c => c.fromPortId === portId)
  const inEdges = (portId) => cables.filter(c => c.toPortId === portId)

  const chains = []
  const activeSources = []

  for (const p of ports) {
    if (p.role !== 'source' || p.kind !== 'out') continue
    // ¿va directo a la salida?
    const direct = outEdges(p.id).some(c => c.toPortId === 'sink-out')
    // ¿va a un efecto cuya salida llega a la salida?
    let viaEffect = null
    for (const c of outEdges(p.id)) {
      const dest = byId(ports, c.toPortId)
      if (dest && dest.role === 'effect' && dest.kind === 'in') {
        const effectOut = dest.id.replace('-in', '-out')
        if (outEdges(effectOut).some(e => e.toPortId === 'sink-out')) {
          viaEffect = dest.id
          break
        }
      }
    }
    if (direct || viaEffect) {
      activeSources.push(p.id)
      chains.push({ source: p.id, effect: viaEffect })
    }
  }
  return { activeSources, chains }
}

// ── Geometría de jacks/cables + niveles de medidor (puro, testeable) ─────────

/**
 * Devuelve el id del jack más cercano a (px,py) dentro de `radius`, o null.
 * `jacks` = [{ id, x, y }]. Usado para "enganchar" el cable al soltar.
 */
export function plugSnap(px, py, jacks, radius = 26) {
  let best = null
  let bestD = radius
  for (const j of (jacks || [])) {
    const d = Math.hypot(j.x - px, j.y - py)
    if (d <= bestD) { bestD = d; best = j.id }
  }
  return best
}

/** Color del cable según el rol/tipo de señal (consistente en toda la consola). */
export function cableColorFor(role, accent = '#22c55e') {
  switch (role) {
    case 'original': return '#60a5fa'  // azul frío = pista original del cliente
    case 'master': return accent       // acento del artista = master
    case 'effect': return '#a78bfa'    // violeta = efecto
    default: return accent
  }
}

/**
 * Mapea un nivel 0..1 al ángulo de la aguja de un VU (grados).
 * Reposo a la izquierda (-50°), tope a la derecha (+50°). Clampa fuera de rango.
 */
export function vuAngle(level, minDeg = -50, maxDeg = 50) {
  const l = Math.max(0, Math.min(1, Number.isFinite(level) ? level : 0))
  return minDeg + (maxDeg - minDeg) * l
}

/**
 * RMS (nivel medio) de un array de muestras de audio en [-1,1] → 0..1.
 * Tolera arrays vacíos/no numéricos.
 */
export function rms(samples) {
  if (!samples || samples.length === 0) return 0
  let sum = 0
  let n = 0
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]
    if (Number.isFinite(s)) { sum += s * s; n++ }
  }
  if (n === 0) return 0
  return Math.min(1, Math.sqrt(sum / n))
}
