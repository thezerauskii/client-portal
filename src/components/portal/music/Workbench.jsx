import React, { useRef, useState, useEffect } from 'react'
import SynthCable from './SynthCable.jsx'
import WebAudioSynth from './WebAudioSynth.jsx'
import './music.css'

/**
 * Workbench — "Mesa de trabajo": un tablero donde el artista coloca MÓDULOS
 * (cables decorativos, mini-Korg) en la posición que quiera. En el PORTAL es
 * solo-lectura: renderiza cada módulo de `workbench.modules` en su (x,y). En el
 * EDITOR (Electron) se reutiliza con `editable` para arrastrar/añadir/borrar.
 *
 * Posiciones relativas 0..1 sobre el tablero (responsive). Un cable = dos plugs
 * (endA/endB) unidos por un cable físico (sin audio, decorativo por ahora).
 *
 * Props:
 *  - modules: [{id,type,...}]  (workbench.modules normalizado)
 *  - accent
 *  - editable: si true, permite drag de módulos/plugs y muestra controles.
 *  - onChange(modules): callback del editor.
 *  - synthPreset: preset para los módulos synth.
 */
export default function Workbench({ modules = [], accent = '#22c55e', editable = false, onChange, synthPreset = {} }) {
  const boardRef = useRef(null)
  const [size, setSize] = useState({ w: 760, h: 420 })
  const drag = useRef(null) // { id, part } part: 'move'|'a'|'b'

  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    const measure = () => setSize({ w: el.clientWidth || 760, h: el.clientHeight || 420 })
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(el)
    window.addEventListener('resize', measure)
    return () => { ro?.disconnect(); window.removeEventListener('resize', measure) }
  }, [])

  // Coordenadas relativas 0..1 desde un evento de puntero.
  const relFromEvent = (e) => {
    const el = boardRef.current
    if (!el) return { x: 0, y: 0 }
    const r = el.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    }
  }

  const startDrag = (e, id, part) => {
    if (!editable) return
    e.preventDefault(); e.stopPropagation()
    drag.current = { id, part }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onMove = (e) => {
    if (!editable || !drag.current) return
    const { id, part } = drag.current
    const { x, y } = relFromEvent(e)
    onChange?.(modules.map(m => {
      if (m.id !== id) return m
      if (m.type === 'cable') {
        if (part === 'a') return { ...m, ax: x, ay: y }
        if (part === 'b') return { ...m, bx: x, by: y }
        return m
      }
      return { ...m, x, y } // synth: mover esquina
    }))
  }
  const endDrag = () => { drag.current = null }

  const px = (rel, dim) => rel * (dim === 'x' ? size.w : size.h)

  return (
    <div className={`wb-board ${editable ? 'wb-board--edit' : ''}`} ref={boardRef}
      onPointerMove={onMove} onPointerUp={endDrag} onPointerLeave={endDrag}>
      <div className="wb-grain" aria-hidden="true" />

      {/* Capa de cables (SVG) — se dibuja sobre el tablero */}
      <svg className="wb-cables" viewBox={`0 0 ${size.w} ${size.h}`} preserveAspectRatio="none" aria-hidden="true">
        {modules.filter(m => m.type === 'cable').map(m => (
          <SynthCable key={m.id}
            from={{ x: px(m.ax, 'x'), y: px(m.ay, 'y') }}
            to={{ x: px(m.bx, 'x'), y: px(m.by, 'y') }}
            color="#3a3a3e" sag={40} />
        ))}
      </svg>

      {/* Módulos interactivos (plugs arrastrables, synth) */}
      {modules.map(m => {
        if (m.type === 'cable') {
          return (
            <React.Fragment key={m.id}>
              <WbPlug x={px(m.ax, 'x')} y={px(m.ay, 'y')} editable={editable} onDown={(e) => startDrag(e, m.id, 'a')} label="A" />
              <WbPlug x={px(m.bx, 'x')} y={px(m.by, 'y')} editable={editable} onDown={(e) => startDrag(e, m.id, 'b')} label="B" />
              {editable && <WbDelete x={px((m.ax + m.bx) / 2, 'x')} y={px((m.ay + m.by) / 2, 'y')} onClick={() => onChange?.(modules.filter(x => x.id !== m.id))} />}
            </React.Fragment>
          )
        }
        // synth
        return (
          <div key={m.id} className="wb-module wb-module--synth" style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}>
            {editable && (
              <div className="wb-module-bar" onPointerDown={(e) => startDrag(e, m.id, 'move')}>
                <span>MINI-KORG</span>
                <button className="wb-module-x" onClick={() => onChange?.(modules.filter(x => x.id !== m.id))} aria-label="Quitar">×</button>
              </div>
            )}
            <WebAudioSynth preset={synthPreset} accent={accent} octaves={m.octaves || 2} keysHint={!editable} />
          </div>
        )
      })}

      {modules.length === 0 && (
        <p className="wb-empty">{editable ? 'Añade módulos (cable o mini-Korg) y colócalos donde quieras.' : ''}</p>
      )}
    </div>
  )
}

/** Plug físico (cabeza de jack metálica). Arrastrable si editable. */
function WbPlug({ x, y, editable, onDown, label }) {
  return (
    <div
      className={`wb-plug ${editable ? 'is-draggable' : ''}`}
      style={{ left: x, top: y }}
      onPointerDown={onDown}
      role={editable ? 'button' : undefined}
      aria-label={editable ? `Mover extremo ${label}` : undefined}
    >
      <span className="wb-plug-ring"><span className="wb-plug-hole" /></span>
    </div>
  )
}

function WbDelete({ x, y, onClick }) {
  return (
    <button className="wb-cable-del" style={{ left: x, top: y }} onClick={onClick} aria-label="Quitar cable">×</button>
  )
}
