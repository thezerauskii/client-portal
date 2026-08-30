import React, { useRef, useState, useCallback } from 'react'
import SynthCable from './SynthCable.jsx'
import { isValidConnection, addCable, removeCable, plugSnap } from '../../../shared/domain/patchGraph.js'
import './music.css'

/**
 * PatchBay — capa interactiva de jacks + cables patch (estilo synth modular).
 *
 * El cliente arrastra un cable desde un jack de SALIDA hasta uno de ENTRADA
 * para conectar (la señal empieza a sonar), o arrastra un cable ya conectado
 * fuera de su jack para desconectar (silenciar). Toda la validación/ruteo vive
 * en patchGraph (puro). Este componente solo dibuja y captura gestos.
 *
 * Props:
 *   ports   [{ id, kind, role, label, x, y }]  posiciones en coords del SVG (viewBox)
 *   cables  [{ id, fromPortId, toPortId, color }]
 *   onChange(nextCables)   — nuevo estado de cables
 *   width, height          — tamaño del viewBox
 *   accent
 *   snapRadius
 */
export default function PatchBay({
  ports = [], cables = [], onChange, width = 760, height = 280,
  accent = '#22c55e', snapRadius = 28,
}) {
  const svgRef = useRef(null)
  const [drag, setDrag] = useState(null) // { fromId, x, y } cable en vuelo
  const portById = useCallback((id) => ports.find(p => p.id === id) || null, [ports])

  // Convierte coords de pantalla a coords del viewBox del SVG.
  const toLocal = useCallback((clientX, clientY) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const r = svg.getBoundingClientRect()
    return {
      x: ((clientX - r.left) / r.width) * width,
      y: ((clientY - r.top) / r.height) * height,
    }
  }, [width, height])

  const inJacks = useCallback(
    () => ports.filter(p => p.kind === 'in').map(p => ({ id: p.id, x: p.x, y: p.y })),
    [ports]
  )

  // ── Empezar a arrastrar un cable desde un jack de salida ──────────────────
  const startFromOut = useCallback((e, port) => {
    if (port.kind !== 'out') return
    e.preventDefault(); e.stopPropagation()
    const p = toLocal(e.clientX, e.clientY)
    setDrag({ fromId: port.id, x: p.x, y: p.y })
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }, [toLocal])

  // ── Arrastrar un cable YA conectado desde su jack de entrada = quitarlo ────
  const pullFromIn = useCallback((e, port) => {
    if (port.kind !== 'in') return
    const connected = cables.find(c => c.toPortId === port.id)
    if (!connected) return
    e.preventDefault(); e.stopPropagation()
    // quitamos el cable y empezamos a arrastrar su origen (puede reconectarse)
    onChange?.(removeCable(cables, connected.id))
    const p = toLocal(e.clientX, e.clientY)
    setDrag({ fromId: connected.fromPortId, x: p.x, y: p.y })
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }, [cables, onChange, toLocal])

  const onMove = useCallback((e) => {
    if (!drag) return
    const p = toLocal(e.clientX, e.clientY)
    setDrag(d => (d ? { ...d, x: p.x, y: p.y } : d))
  }, [drag, toLocal])

  const onUp = useCallback((e) => {
    if (!drag) return
    const p = toLocal(e.clientX, e.clientY)
    const targetId = plugSnap(p.x, p.y, inJacks(), snapRadius)
    if (targetId && isValidConnection(ports, cables, drag.fromId, targetId)) {
      const from = portById(drag.fromId)
      const color = from?.color || accent
      onChange?.(addCable(ports, cables, drag.fromId, targetId, color))
    }
    setDrag(null)
  }, [drag, toLocal, inJacks, snapRadius, ports, cables, portById, accent, onChange])

  const isConnected = (portId) =>
    cables.some(c => c.fromPortId === portId || c.toPortId === portId)

  return (
    <svg
      ref={svgRef}
      className="patchbay"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={() => setDrag(null)}
    >
      {/* cables conectados */}
      {cables.map(c => {
        const a = portById(c.fromPortId); const b = portById(c.toPortId)
        if (!a || !b) return null
        return <SynthCable key={c.id} from={{ x: a.x, y: a.y }} to={{ x: b.x, y: b.y }} color={c.color || accent} animated />
      })}

      {/* cable en vuelo mientras se arrastra */}
      {drag && (() => {
        const a = portById(drag.fromId)
        if (!a) return null
        return <SynthCable from={{ x: a.x, y: a.y }} to={{ x: drag.x, y: drag.y }} color={a.color || accent} animated={false} />
      })()}

      {/* jacks */}
      {ports.map(p => (
        <g key={p.id} className={`pb-jack pb-jack--${p.kind} ${isConnected(p.id) ? 'is-on' : ''}`}
          transform={`translate(${p.x},${p.y})`}>
          {/* zona de agarre generosa (transparente) para pointer */}
          <circle
            r={snapRadius * 0.7} fill="transparent"
            style={{ cursor: p.kind === 'out' ? 'grab' : (isConnected(p.id) ? 'grab' : 'default'), touchAction: 'none' }}
            onPointerDown={(e) => p.kind === 'out' ? startFromOut(e, p) : pullFromIn(e, p)}
          />
          {/* anillo metálico */}
          <circle r="9" className="pb-jack-ring" />
          {/* agujero */}
          <circle r="4.5" className="pb-jack-hole" />
          {p.label && (
            <text y={p.kind === 'in' ? 24 : -14} textAnchor="middle" className="pb-jack-label">{p.label}</text>
          )}
        </g>
      ))}
    </svg>
  )
}

/**
 * PatchToggles — fallback ACCESIBLE (teclado/móvil): un botón por fuente para
 * conectar/desconectar sin arrastrar. Mismo estado (patchGraph).
 * Props: ports, cables, onChange, targetId (default 'sink-out'), accent
 */
export function PatchToggles({ ports = [], cables = [], onChange, targetId = 'sink-out', accent = '#22c55e' }) {
  const sources = ports.filter(p => p.role === 'source' && p.kind === 'out')
  const isOn = (id) => cables.some(c => c.fromPortId === id && c.toPortId === targetId)
  const toggle = (id) => {
    const existing = cables.find(c => c.fromPortId === id && c.toPortId === targetId)
    if (existing) onChange?.(removeCable(cables, existing.id))
    else {
      const from = ports.find(p => p.id === id)
      onChange?.(addCable(ports, cables, id, targetId, from?.color || accent))
    }
  }
  return (
    <div className="pb-toggles" role="group" aria-label="Conectar señales a la salida">
      {sources.map(s => (
        <button
          key={s.id}
          type="button"
          className={`pb-toggle ${isOn(s.id) ? 'is-on' : ''}`}
          aria-pressed={isOn(s.id)}
          onClick={() => toggle(s.id)}
          style={{ '--accent': accent }}
        >
          <span className="pb-toggle-led" aria-hidden="true" />
          {isOn(s.id) ? `Desconectar ${s.label}` : `Conectar ${s.label}`}
        </button>
      ))}
    </div>
  )
}
