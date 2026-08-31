import React, { useRef, useState, useEffect } from 'react'
import ModuleContent from './ModuleContent.jsx'
import SynthCable from './SynthCable.jsx'
import { cablePath } from '../../../shared/domain/musicStudio.js'
import './modules.css'

const CONTENT_TYPES = new Set([
  'text', 'image', 'metrics', 'services', 'skills', 'projects', 'list',
  'banner-cta', 'avatar', 'divider',
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
  const cables = modules.filter(m => m.type === 'cable')

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
      className={`mk-canvas mk-bg--${bg} ${showGrid ? 'mk-canvas--grid' : ''}`}
      style={{ '--accent': accent, '--mk-grid': `${grid}px`, height: logicalHeight * scale }}
    >
      <div className="mk-stage" style={{ width, height: logicalHeight, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        {/* Capa de cables (SVG) sobre todo el lienzo */}
        {cables.length > 0 && (
          <svg className="mk-cables" viewBox={`0 0 ${width} ${logicalHeight}`} width={width} height={logicalHeight} aria-hidden="true">
            {cables.map(cab => {
              const a = cableEnd(cab, 'A'); const b = cableEnd(cab, 'B')
              // Si un extremo está SUELTO (sin jack), el cable cuelga (sag mayor).
              const loose = !cab.props?.endAJack || !cab.props?.endBJack
              return <SynthCable key={cab.id} from={a} to={b} color="#3a3a3e" sag={loose ? 70 : 36} />
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
