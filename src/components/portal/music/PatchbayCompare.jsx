import React, { useEffect, useRef, useState, useCallback } from 'react'
import PatchBay, { PatchToggles } from './PatchBay.jsx'
import Knob from './Knob.jsx'
import TapeReels from './TapeReels.jsx'
import VuMeter from './VuMeter.jsx'
import TubeGlow from './TubeGlow.jsx'
import TransportDisplay from './TransportDisplay.jsx'
import PatchAudioEngine from './patchAudioEngine.js'
import { basePorts, cableColorFor, vuAngle } from '../../../shared/domain/patchGraph.js'
import { isWebAudioSupported } from './audioEngine.js'
import './music.css'

/**
 * PatchbayCompare — variante "consola vintage" del comparador Original/Master.
 *
 * En vez de un botón play, el cliente CONECTA cables de las señales (Original /
 * Master) a la salida para escuchar, y los DESCONECTA para silenciar. La perilla
 * hace crossfade cuando ambas suenan. VU con aguja/dot-matrix, bulbos que respiran,
 * casete girando y un display NOW PLAYING dan el alma analógica. La validación y
 * ruteo son puros (patchGraph); el audio lo ejecuta PatchAudioEngine.
 *
 * Props: trackA (original), trackB (master), labelA, labelB, accent,
 *        patchbay (bloque de config normalizado: surfaces, vuStyle, bulbs,
 *        vuMeter, tapeReels, transportDisplay, woodTone).
 * Cae a <audio controls> si no hay Web Audio.
 */
export default function PatchbayCompare({ trackA, trackB, labelA = 'Original', labelB = 'Master', accent = '#22c55e', patchbay = {} }) {
  const W = 760, H = 240
  const cfg = patchbay || {}
  const surfaces = cfg.surfaces || {}
  const bg = surfaces.background || { texture: 'paper' }
  const panel = surfaces.panel || { texture: 'metal' }
  const vuStyle = cfg.vuStyle === 'dotmatrix' ? 'dotmatrix' : 'needle'
  const showVu = cfg.vuMeter !== false
  const showBulbs = cfg.bulbs !== false
  const showReels = cfg.tapeReels !== false
  const showDisplay = cfg.transportDisplay !== false
  const woodTone = cfg.woodTone || 'walnut'

  const ports = React.useMemo(() => ([
    { ...find('src-original'), x: 70, y: 40, color: cableColorFor('original', accent), label: (labelA || 'ORIGINAL').toUpperCase() },
    { ...find('src-master'), x: W - 70, y: 40, color: cableColorFor('master', accent), label: (labelB || 'MASTER').toUpperCase() },
    { ...find('sink-out'), x: W / 2, y: H - 40, label: 'OUT' },
  ]), [accent, labelA, labelB])

  const [cables, setCables] = useState([])
  const [mix, setMix] = useState(0.5)
  const [level, setLevel] = useState(0)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const engineRef = useRef(null)
  const rafRef = useRef(0)
  const unsupported = !isWebAudioSupported()

  const urlA = trackA?.url, urlB = trackB?.url

  useEffect(() => {
    if (unsupported || (!urlA && !urlB)) return
    let cancelled = false
    const eng = new PatchAudioEngine()
    engineRef.current = eng
    eng.load({ original: urlA, master: urlB })
      .then(ok => { if (!cancelled) { setReady(!!ok); setDuration(eng._maxDuration ? eng._maxDuration() : 0) } })
      .catch(e => { if (!cancelled) setError(e.message || 'Error de audio') })
    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
      eng.dispose()
      engineRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlA, urlB, unsupported])

  useEffect(() => {
    const eng = engineRef.current
    if (!eng || !ready) return
    eng.applyRouting(ports, cables)
  }, [cables, ports, ready])

  useEffect(() => {
    const eng = engineRef.current
    if (!eng || !ready) return
    const tick = () => {
      if (eng.isPlaying()) {
        setLevel(eng.getLevel())
        const dur = eng._maxDuration ? eng._maxDuration() : 0
        setProgress(dur ? Math.min(1, eng._elapsed() / dur) : 0)
      } else {
        setLevel(l => l * 0.85)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [ready])

  const onMix = useCallback((v) => { setMix(v); engineRef.current?.setMix(v) }, [])

  const playing = cables.length > 0

  if (unsupported) {
    return (
      <div className="pbc wf-fallback">
        <p className="wf-note">Tu navegador no soporta la consola interactiva. Escucha por separado:</p>
        {urlA && <audio src={urlA} controls style={{ width: '100%', marginBottom: 6 }} />}
        {urlB && <audio src={urlB} controls style={{ width: '100%' }} />}
      </div>
    )
  }

  return (
    <div
      className={`pbc pbc--wood-${woodTone} pbc-bg--${bg.texture || 'paper'}`}
      style={{
        '--accent': accent,
        '--pbc-bg-tint': bg.tint || 'transparent',
        '--pbc-panel-tint': panel.tint || 'transparent',
      }}
    >
      <div className="pbc-console">
        {/* Columna izquierda: bulbos + VU */}
        <aside className="pbc-rack pbc-rack--left" aria-hidden="true">
          {showBulbs && <div className="pbc-bulbs"><TubeGlow on level={playing ? level : null} /><TubeGlow on level={playing ? level : null} /></div>}
          {showVu && <VuMeter level={level} style={vuStyle} accent={accent} size={vuStyle === 'dotmatrix' ? 120 : 116} label="L" />}
        </aside>

        {/* Centro: panel de metal con onda + jacks + cables + perilla + display */}
        <div className={`pbc-center pbc-panel--${panel.texture || 'metal'}`}>
          <div className="pbc-screws" aria-hidden="true" />
          <div className="pbc-stage" style={{ aspectRatio: `${W} / ${H}` }}>
            <div className="pbc-legend"><span style={{ color: cableColorFor('original', accent) }}>{labelA}</span><span style={{ color: accent }}>{labelB}</span></div>
            <PatchBay ports={ports} cables={cables} onChange={setCables} width={W} height={H} accent={accent} />
          </div>
          <div className="pbc-controls">
            {showReels && <TapeReels playing={playing} progress={progress} title={playing ? (labelB || 'Master') : ''} accent={accent} size={150} />}
            <Knob value={mix} onChange={onMix} accent={accent} label="Original ↔ Master" leftLabel={labelA} rightLabel={labelB} size={92} />
          </div>
          {showDisplay && (
            <TransportDisplay
              title={playing ? (labelB || 'Master') : 'En espera'}
              artist={playing ? labelA : ''}
              progress={progress}
              duration={duration}
              level={playing ? level : null}
              playing={playing}
              accent={accent}
            />
          )}
        </div>

        {/* Columna derecha: bulbos + VU (simetría) */}
        <aside className="pbc-rack pbc-rack--right" aria-hidden="true">
          {showBulbs && <div className="pbc-bulbs"><TubeGlow on level={playing ? level : null} /><TubeGlow on level={playing ? level : null} /></div>}
          {showVu && <VuMeter level={level} style={vuStyle} accent={accent} size={vuStyle === 'dotmatrix' ? 120 : 116} label="R" />}
        </aside>
      </div>

      {/* Fallback accesible: conectar/desconectar por botón */}
      <PatchToggles ports={ports} cables={cables} onChange={setCables} accent={accent} />
      {error && <p className="wf-status wf-status--err">{error}</p>}
      {(!urlA && !urlB) ? (
        <p className="pbc-hint">Vista previa de la consola. Sube tu <b>Original</b> y tu <b>Master</b> para que suene al conectar los cables.</p>
      ) : (
        <p className="pbc-hint">Conecta un cable de <b>Original</b> o <b>Master</b> a <b>OUT</b> para escuchar. Con ambos conectados, gira la perilla para comparar. Suelta el cable para silenciar.</p>
      )}
    </div>
  )
}

function find(id) {
  const p = basePorts().find(x => x.id === id)
  return p ? { ...p } : { id, kind: id === 'sink-out' ? 'in' : 'out', role: id === 'sink-out' ? 'sink' : 'source' }
}
