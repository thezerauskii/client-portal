import React, { useRef, useState, useEffect } from 'react'
import ModuleContent from './ModuleContent.jsx'
import SynthCable from './SynthCable.jsx'
import { cablePath } from '../../../shared/domain/musicStudio.js'
import './modules.css'

const CONTENT_TYPES = new Set([
  'hero-combo', 'text', 'image', 'metrics', 'services', 'skills', 'projects', 'list',
  'banner-cta', 'avatar', 'divider',
  // Fase 14 — módulos interactivos vintage (los renderiza ModuleContent).
  'icon-row', 'vinyl-player', 'reveal-slider', 'marquee-ticker', 'price-tiers',
  'faq-accordion', 'process-steps', 'countdown-offer', 'audio-cards', 'cta-banner-neon',
])
const CABLE_TYPES = new Set(['cable', 'jack'])

/**
 * ModuleCanvas — lienzo del constructor de página. Renderiza los módulos en su
 * posición (x,y,w,h,z) en coordenadas de DISEÑO (px lógicos sobre canvas.width),
 * escaladas responsivamente al ancho real del contenedor.
 *
 * En el PORTAL es solo-lectura. Los módulos de audio (comparator, synth, etc.)
 * se inyectan vía `renderAudioModule` (7.3) para no acoplar este componente a
 * los engines de Web Audio. Si un tipo no tiene renderer, muestra un placeholder.
 *
 * Props:
 *  - canvas: { width, grid, snap, bg }
 *  - modules: [{ id, type, x, y, w, h, z, rotation, props, dataRef }]
 *  - accent
 *  - renderAudiomodule: (mod) => ReactNode | null   (inyectado por PortalMusic)
 *  - showGrid: dibujar el grid (editor)
 *  - onCta: (url) => void
 */
export default function ModuleCanvas({ canvas = {}, modules = [], accent = '#22c55e', renderAudioModule, showGrid = false, onCta, children }) {
  const width = canvas.width || 1200
  const grid = canvas.grid || 24
  const bg = canvas.bg || 'river-styx'
  const mode = canvas.mode || 'free'
  const boardRef = useRef(null)
  const [scale, setScale] = useState(1)
  // Overrides LOCALES del cable (el visitante puede jugar: arrastrar/conectar).
  // No persiste — es sólo interacción divertida en la página publicada.
  const [cableOverrides, setCableOverrides] = useState({}) // { [id]: { ax,ay,bx,by,endAJack,endBJack } }
  const [grab, setGrab] = useState(null) // { id, end:'A'|'B' }
  const grabRef = useRef(null)

  // Escala: ancho real / ancho lógico. El alto del lienzo = alto lógico * scale.
  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    const measure = () => setScale((el.clientWidth || width) / width)
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(el)
    window.addEventListener('resize', measure)
    return () => { ro?.disconnect(); window.removeEventListener('resize', measure) }
  }, [width])

  // Alto lógico = el módulo más bajo + margen.
  const logicalHeight = Math.max(
    600,
    ...modules.map(m => (m.y || 0) + (m.h || 0) + 40)
  )

  const sorted = [...modules].sort((a, b) => (a.z || 0) - (b.z || 0))
  const jacks = modules.filter(m => m.type === 'jack')
  // Aplica overrides locales del visitante encima de las props originales.
  const cables = modules.filter(m => m.type === 'cable').map(m => (
    cableOverrides[m.id] ? { ...m, props: { ...(m.props || {}), ...cableOverrides[m.id] } } : m
  ))

  // Centro (px lógicos) de un jack por id.
  const jackCenter = (jackId) => {
    const j = jacks.find(x => x.id === jackId)
    if (!j) return null
    return { x: (j.x || 0) + (j.w || 40) / 2, y: (j.y || 0) + (j.h || 40) / 2 }
  }
  // Punto de un extremo del cable: si está enganchado a un jack usa su centro;
  // si está suelto usa la coord relativa del propio cable (ax/ay o bx/by).
  const cableEnd = (cab, which) => {
    const jackId = which === 'A' ? cab.props?.endAJack : cab.props?.endBJack
    const c = jackCenter(jackId)
    if (c) return c
    const rx = which === 'A' ? (cab.props?.ax ?? 0.2) : (cab.props?.bx ?? 0.7)
    const ry = which === 'A' ? (cab.props?.ay ?? 0.3) : (cab.props?.by ?? 0.5)
    return { x: rx * width, y: ry * logicalHeight }
  }

  // ── Arrastre de un extremo de cable (jugable en la página publicada) ──
  const pointToLogical = (clientX, clientY) => {
    const stage = boardRef.current?.querySelector('.mk-stage')
    const r = stage?.getBoundingClientRect()
    if (!r) return { x: 0, y: 0 }
    const s = (r.width || width) / width
    return { x: (clientX - r.left) / s, y: (clientY - r.top) / s }
  }
  const nearestJack = (lx, ly) => {
    let best = null, bestD = 46 // radio de enganche (px lógicos)
    for (const j of jacks) {
      const cx = (j.x || 0) + (j.w || 40) / 2, cy = (j.y || 0) + (j.h || 40) / 2
      const d = Math.hypot(cx - lx, cy - ly)
      if (d < bestD) { bestD = d; best = j }
    }
    return best
  }
  const onCableGrab = (e, cableId, end) => {
    e.preventDefault(); e.stopPropagation()
    grabRef.current = { id: cableId, end }
    setGrab({ id: cableId, end })
    window.addEventListener('pointermove', onCableMove)
    window.addEventListener('pointerup', onCableUp)
  }
  const onCableMove = (e) => {
    const g = grabRef.current
    if (!g) return
    const { x, y } = pointToLogical(e.clientX, e.clientY)
    const rx = Math.max(0, Math.min(1, x / width))
    const ry = Math.max(0, Math.min(1, y / logicalHeight))
    setCableOverrides(prev => {
      const base = prev[g.id] || {}
      const patch = g.end === 'A'
        ? { ax: rx, ay: ry, endAJack: null }  // al arrastrar, se desconecta
        : { bx: rx, by: ry, endBJack: null }
      return { ...prev, [g.id]: { ...base, ...patch } }
    })
  }
  const onCableUp = (e) => {
    const g = grabRef.current
    window.removeEventListener('pointermove', onCableMove)
    window.removeEventListener('pointerup', onCableUp)
    grabRef.current = null
    setGrab(null)
    if (!g) return
    const { x, y } = pointToLogical(e.clientX, e.clientY)
    const j = nearestJack(x, y)
    if (j) {
      // Encaja en el agujero más cercano (conectar).
      const cx = (j.x || 0) + (j.w || 40) / 2, cy = (j.y || 0) + (j.h || 40) / 2
      setCableOverrides(prev => {
        const base = prev[g.id] || {}
        const patch = g.end === 'A'
          ? { endAJack: j.id, ax: cx / width, ay: cy / logicalHeight }
          : { endBJack: j.id, bx: cx / width, by: cy / logicalHeight }
        return { ...prev, [g.id]: { ...base, ...patch } }
      })
    }
  }

  // ── Modo APILADO: los módulos fluyen en una columna vertical por orden ──
  // (z asc, luego y). Ancho completo, alto natural. No hay cables/jacks aquí.
  if (mode === 'stack') {
    const flow = [...modules]
      .filter(m => m.type !== 'cable' && m.type !== 'jack')
      .sort((a, b) => (a.z || 0) - (b.z || 0) || (a.y || 0) - (b.y || 0))
    return (
      <div className={`mk-canvas mk-canvas--stackmode mk-bg--${bg}`} style={{ '--accent': accent }}>
        <div className="mk-flow">
          {flow.map(mod => (
            <div key={mod.id} className={`mk-flow-item mk-module--${mod.type}`} style={{ minHeight: mod.h }} data-module-id={mod.id}>
              {CONTENT_TYPES.has(mod.type)
                ? <ModuleContent mod={mod} accent={accent} onCta={onCta} />
                : (renderAudioModule ? renderAudioModule(mod) : <ModulePlaceholder type={mod.type} />)}
            </div>
          ))}
          {children}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={boardRef}
      className={`mk-canvas mk-bg--${bg} ${(showGrid || canvas.showGrid) ? 'mk-canvas--grid' : ''}`}
      style={{ '--accent': accent, '--mk-grid': `${grid}px`, height: logicalHeight * scale }}
    >
      <div className="mk-stage" style={{ width, height: logicalHeight, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        {/* Capa de cables (SVG) sobre todo el lienzo — jugable: arrastra las puntas */}
        {cables.length > 0 && (
          <svg className="mk-cables mk-cables--interactive" viewBox={`0 0 ${width} ${logicalHeight}`} width={width} height={logicalHeight}>
            {cables.map(cab => {
              const a = cableEnd(cab, 'A'); const b = cableEnd(cab, 'B')
              const plugged = { A: !!cab.props?.endAJack, B: !!cab.props?.endBJack }
              const grabbed = grab?.id === cab.id ? grab.end : null
              return (
                <React.Fragment key={cab.id}>
                  <SynthCable from={a} to={b} color="#2a2a2e" restLength={340} plugged={plugged} grabbed={grabbed} />
                  {/* Zonas de agarre invisibles en cada punta */}
                  <circle className="mk-cable-grab" cx={a.x} cy={a.y} r="16" fill="transparent"
                    onPointerDown={(e) => onCableGrab(e, cab.id, 'A')} />
                  <circle className="mk-cable-grab" cx={b.x} cy={b.y} r="16" fill="transparent"
                    onPointerDown={(e) => onCableGrab(e, cab.id, 'B')} />
                </React.Fragment>
              )
            })}
          </svg>
        )}

        {/* Jacks (agujeros) */}
        {jacks.map(j => (
          <div key={j.id} className="mk-jack" style={{ left: j.x, top: j.y, width: j.w, height: j.h, zIndex: j.z || 1 }} data-module-id={j.id}>
            <span className="mk-jack-ring"><span className="mk-jack-hole" /></span>
            {j.props?.label && <span className="mk-jack-label">{j.props.label}</span>}
          </div>
        ))}

        {/* Módulos de contenido/audio */}
        {sorted.filter(m => !CABLE_TYPES.has(m.type)).map(mod => (
          <div
            key={mod.id}
            className={`mk-module mk-module--${mod.type}`}
            style={{
              left: mod.x, top: mod.y, width: mod.w, height: mod.h, zIndex: mod.z || 1,
              transform: mod.rotation ? `rotate(${mod.rotation}deg)` : undefined,
            }}
            data-module-id={mod.id}
          >
            {CONTENT_TYPES.has(mod.type)
              ? <ModuleContent mod={mod} accent={accent} onCta={onCta} />
              : (renderAudioModule ? renderAudioModule(mod) : <ModulePlaceholder type={mod.type} />)}
          </div>
        ))}
        {children}
      </div>
    </div>
  )
}

function ModulePlaceholder({ type }) {
  return <div className="mk-module-ph">{type}</div>
}
