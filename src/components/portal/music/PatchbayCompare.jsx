import React, { useEffect, useRef, useState, useCallback } from 'react'
import Knob from './Knob.jsx'
import TapeReels from './TapeReels.jsx'
import VuMeter from './VuMeter.jsx'
import TubeGlow from './TubeGlow.jsx'
import TransportDisplay from './TransportDisplay.jsx'
import CompareWaveform from './CompareWaveform.jsx'
import VintageButton from './VintageButton.jsx'
import PatchAudioEngine from './patchAudioEngine.js'
import { basePorts, cableColorFor, addCable } from '../../../shared/domain/patchGraph.js'
import { isWebAudioSupported } from './audioEngine.js'
import './music.css'

/**
 * PatchbayCompare — consola vintage del comparador Original/Master.
 *
 * La PANTALLA muestra SOLO las 2 ondas superpuestas (limpia, sin cables encima).
 * El transporte físico (PLAY/PAUSE/STOP) controla la reproducción. La perilla
 * hace crossfade Original↔Master. VU con aguja que MONITOREA el nivel real en
 * tiempo real, casete que gira mientras suena, y display NOW PLAYING.
 *
 * (Los cables conectables viven ahora en la "Mesa de trabajo" como módulos
 * posicionables, no encima del waveform.)
 *
 * Props: trackA, trackB, labelA, labelB, accent, patchbay (config normalizado).
 */
export default function PatchbayCompare({ trackA, trackB, labelA = 'Original', labelB = 'Master', accent = '#22c55e', patchbay = {} }) {
  const W = 760, H = 200
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

  // Puertos internos (solo para el motor de audio, NO se dibujan): fuentes → salida.
  const ports = React.useMemo(() => ([
    { ...findPort('src-original'), color: cableColorFor('original', accent) },
    { ...findPort('src-master'), color: cableColorFor('master', accent) },
    { ...findPort('sink-out') },
  ]), [accent])

  const [cables, setCables] = useState([])
  const [mix, setMix] = useState(0.5)
  const [level, setLevel] = useState(0)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [peaks, setPeaks] = useState({ a: null, b: null })
  const [playing, setPlaying] = useState(false)
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
      .then(ok => {
        if (cancelled) return
        setReady(!!ok)
        setDuration(eng._maxDuration ? eng._maxDuration() : 0)
        if (eng.getPeaks) setPeaks(eng.getPeaks(700))
      })
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
    setPlaying(cables.length > 0)
  }, [cables, ports, ready])

  // rAF: VU + progreso en tiempo real mientras suena; la aguja cae suave al parar.
  useEffect(() => {
    const eng = engineRef.current
    if (!eng || !ready) return
    const tick = () => {
      if (eng.isPlaying()) {
        setLevel(eng.getLevel())
        const dur = eng._maxDuration ? eng._maxDuration() : 0
        setProgress(dur ? Math.min(1, eng._elapsed() / dur) : 0)
      } else {
        setLevel(l => l * 0.9)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [ready])

  const onMix = useCallback((v) => { setMix(v); engineRef.current?.setMix(v) }, [])

  // ── Transporte: PLAY reproduce ambas pistas; STOP/PAUSE silencia ──
  const onPlay = useCallback(() => {
    let next = []
    if (urlA) next = addCable(ports, next, 'src-original', 'sink-out')
    if (urlB) next = addCable(ports, next, 'src-master', 'sink-out')
    setCables(next)
  }, [ports, urlA, urlB])

  const onStop = useCallback(() => { setCables([]) }, [])

  const onSeek = useCallback((ratio) => {
    // Reinicia la reproducción desde la posición (sencillo: re-arranca).
    if (playing) onPlay()
    setProgress(ratio)
  }, [playing, onPlay])

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
        {/* Columna izquierda: bulbos + VU (monitorea en tiempo real) */}
        <aside className="pbc-rack pbc-rack--left" aria-hidden="true">
          {showBulbs && <div className="pbc-bulbs"><TubeGlow on level={playing ? level : null} /><TubeGlow on level={playing ? level : null} /></div>}
          {showVu && <VuMeter level={level} style={vuStyle} accent={accent} size={vuStyle === 'dotmatrix' ? 120 : 116} label="L" />}
        </aside>

        {/* Centro: pantalla de onda LIMPIA + transporte + casete/perilla + display */}
        <div className={`pbc-center pbc-panel--${panel.texture || 'metal'}`}>
          <div className="pbc-screws" aria-hidden="true" />
          <div className="pbc-stage" style={{ aspectRatio: `${W} / ${H}` }}>
            <div className="pbc-legend"><span style={{ color: '#6fb0c4' }}>{labelA}</span><span style={{ color: accent }}>{labelB}</span></div>
            <CompareWaveform
              peaksA={peaks.a} peaksB={peaks.b}
              mix={mix} progress={progress}
              colorA="#6fb0c4" colorB={accent}
              onSeek={onSeek}
            />
          </div>
          {/* Transporte físico estilo Tape Deck */}
          <div className="pbc-transport" role="group" aria-label="Controles de reproducción">
            <VintageButton variant="transport" icon="prev" label="REW" accent={accent} size={44} onClick={onStop} />
            <VintageButton variant="transport" icon="play" label="PLAY" accent={accent} size={52} active={playing} onClick={onPlay} />
            <VintageButton variant="transport" icon="pause" label="PAUSE" accent={accent} size={44} onClick={onStop} />
            <VintageButton variant="transport" icon="stop" label="STOP" accent={accent} size={44} onClick={onStop} />
            <VintageButton variant="transport" icon="next" label="FF" accent={accent} size={44} onClick={onPlay} />
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

      {error && <p className="wf-status wf-status--err">{error}</p>}
    </div>
  )
}

function findPort(id) {
  const p = basePorts().find(x => x.id === id)
  if (p) return { ...p }
  const isIn = id === 'sink-out'
  return { id, kind: isIn ? 'in' : 'out', role: isIn ? 'sink' : 'source' }
}
