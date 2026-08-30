import React, { useEffect, useRef, useState, useCallback } from 'react'
import Knob from './Knob.jsx'
import SynthAudioEngine from './synthAudioEngine.js'
import { buildKeyboard, QWERTY_KEYS, WAVEFORMS, noteToFreq } from '../../../shared/domain/synthEngine.js'
import { isWebAudioSupported } from './audioEngine.js'
import './music.css'

/**
 * WebAudioSynth — mini-sintetizador tocable. El cliente toca "el sonido del
 * artista": carga un preset (osc/filtro/ADSR) y toca con mouse/touch/QWERTY.
 * La lógica de sonido es pura (shared/domain/synthEngine); aquí solo se ejecuta
 * en Web Audio (SynthAudioEngine) y se dibuja el teclado + perillas vintage.
 *
 * Props:
 *  - preset: preset del artista (osc, osc2, cutoff, q, attack, decay, sustain, release, octave).
 *  - accent: color.
 *  - keysHint: mostrar las teclas QWERTY mapeadas. Default true.
 *  - editable: si true, las perillas modifican el preset y llaman onChange(patch).
 *  - onChange: (patch) => void — para el editor de presets en Electron.
 *  - baseMidi, octaves: rango del teclado (default C3, 1.5 oct).
 */
export default function WebAudioSynth({
  preset = {}, accent = '#22c55e', keysHint = true,
  editable = false, onChange, baseMidi = 48, octaves = 1.5,
}) {
  const unsupported = !isWebAudioSupported()
  const engineRef = useRef(null)
  const [active, setActive] = useState(() => new Set()) // midis sonando (para resaltar)
  const heldKeys = useRef(new Set())                     // teclas QWERTY abajo (anti-repeat)

  // Perillas: si editable, salen del preset; si no, controlan solo el sonido en vivo.
  const [live, setLive] = useState(() => ({
    cutoff: num(preset.cutoff, 0.6), q: num(preset.q, 0.2),
    attack: num(preset.attack, 0.01), release: num(preset.release, 0.3),
    osc: WAVEFORMS.includes(preset.osc) ? preset.osc : 'sawtooth',
    octave: Number.isFinite(preset.octave) ? preset.octave : 0,
  }))

  const keyboard = React.useMemo(() => buildKeyboard(baseMidi, octaves), [baseMidi, octaves])

  // Crear motor una vez.
  useEffect(() => {
    if (unsupported) return
    const eng = new SynthAudioEngine()
    engineRef.current = eng
    return () => { eng.dispose(); engineRef.current = null }
  }, [unsupported])

  // Aplicar preset/live al motor.
  useEffect(() => {
    const eng = engineRef.current
    if (!eng) return
    eng.setPreset({ ...preset, ...live })
  }, [preset, live])

  const setParam = useCallback((name, value) => {
    setLive(l => ({ ...l, [name]: value }))
    if (editable) onChange?.({ [name]: value })
  }, [editable, onChange])

  const press = useCallback((midi) => {
    const eng = engineRef.current
    if (!eng) return
    eng.noteOn(midi)
    setActive(prev => { const n = new Set(prev); n.add(midi); return n })
  }, [])

  const release = useCallback((midi) => {
    const eng = engineRef.current
    if (!eng) return
    eng.noteOff(midi)
    setActive(prev => { const n = new Set(prev); n.delete(midi); return n })
  }, [])

  // Teclado QWERTY.
  useEffect(() => {
    if (unsupported) return
    const onKeyDown = (e) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return
      const semi = QWERTY_KEYS[e.key?.toLowerCase()]
      if (semi == null) return
      const midi = baseMidi + semi
      if (heldKeys.current.has(midi)) return
      heldKeys.current.add(midi)
      press(midi)
    }
    const onKeyUp = (e) => {
      const semi = QWERTY_KEYS[e.key?.toLowerCase()]
      if (semi == null) return
      const midi = baseMidi + semi
      heldKeys.current.delete(midi)
      release(midi)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp) }
  }, [unsupported, baseMidi, press, release])

  if (unsupported) {
    return <div className="synth wf-fallback"><p className="wf-note">Tu navegador no soporta el mini-sintetizador (Web Audio).</p></div>
  }

  // Layout del teclado: blancas en fila, negras superpuestas.
  const whites = keyboard.filter(k => !k.isBlack)
  const whiteW = 100 / whites.length

  return (
    <div className="synth" style={{ '--accent': accent }}>
      <div className="synth-panel">
        {/* Controles / perillas vintage */}
        <div className="synth-controls">
          <div className="synth-osc">
            <span className="synth-lbl">Onda</span>
            <div className="synth-osc-btns" role="group" aria-label="Forma de onda">
              {WAVEFORMS.map(w => (
                <button key={w} type="button"
                  className={`synth-osc-btn ${live.osc === w ? 'is-on' : ''}`}
                  aria-pressed={live.osc === w}
                  onClick={() => setParam('osc', w)}>{WF_LABEL[w]}</button>
              ))}
            </div>
          </div>
          <Knob value={live.cutoff} onChange={v => setParam('cutoff', v)} accent={accent} label="Cutoff" size={68} />
          <Knob value={live.q} onChange={v => setParam('q', v)} accent={accent} label="Resonancia" size={68} />
          <Knob value={live.attack / 3} onChange={v => setParam('attack', v * 3)} accent={accent} label="Attack" size={68} />
          <Knob value={live.release / 5} onChange={v => setParam('release', v * 5)} accent={accent} label="Release" size={68} />
          <div className="synth-octave">
            <span className="synth-lbl">Octava</span>
            <div className="synth-oct-btns">
              <button type="button" className="synth-oct-btn" onClick={() => setParam('octave', Math.max(-2, (live.octave || 0) - 1))} aria-label="Bajar octava">−</button>
              <span className="synth-oct-val">{live.octave > 0 ? `+${live.octave}` : live.octave}</span>
              <button type="button" className="synth-oct-btn" onClick={() => setParam('octave', Math.min(2, (live.octave || 0) + 1))} aria-label="Subir octava">+</button>
            </div>
          </div>
        </div>

        {/* Teclado */}
        <div className="synth-keys" role="group" aria-label="Teclado del sintetizador">
          {whites.map((k, wi) => (
            <button
              key={k.midi} type="button"
              className={`synth-key synth-key--white ${active.has(k.midi) ? 'is-on' : ''}`}
              style={{ width: `${whiteW}%` }}
              aria-label={`Nota ${Math.round(noteToFreq(k.midi))} Hz`}
              onPointerDown={(e) => { e.preventDefault(); press(k.midi) }}
              onPointerUp={() => release(k.midi)}
              onPointerLeave={() => active.has(k.midi) && release(k.midi)}
              onPointerCancel={() => release(k.midi)}
            >
              {keysHint && <span className="synth-key-hint">{keyHintFor(k.midi, baseMidi)}</span>}
            </button>
          ))}
          {keyboard.filter(k => k.isBlack).map(k => {
            // posición de la negra: entre su blanca anterior y la siguiente
            const whitesBefore = keyboard.filter(x => !x.isBlack && x.index < k.index).length
            const left = whitesBefore * whiteW - whiteW * 0.3
            return (
              <button
                key={k.midi} type="button"
                className={`synth-key synth-key--black ${active.has(k.midi) ? 'is-on' : ''}`}
                style={{ left: `${left}%`, width: `${whiteW * 0.6}%` }}
                aria-label={`Nota ${Math.round(noteToFreq(k.midi))} Hz (sostenido)`}
                onPointerDown={(e) => { e.preventDefault(); press(k.midi) }}
                onPointerUp={() => release(k.midi)}
                onPointerLeave={() => active.has(k.midi) && release(k.midi)}
                onPointerCancel={() => release(k.midi)}
              />
            )
          })}
        </div>
        {keysHint && <p className="synth-hint">Toca con el ratón, con el dedo, o usa tu teclado (A W S E D F...).</p>}
      </div>
    </div>
  )
}

const WF_LABEL = { sine: 'Sine', triangle: 'Tri', sawtooth: 'Saw', square: 'Sqr' }

function keyHintFor(midi, baseMidi) {
  const semi = midi - baseMidi
  const entry = Object.entries(QWERTY_KEYS).find(([, v]) => v === semi)
  return entry ? entry[0].toUpperCase() : ''
}

function num(v, def) { return Number.isFinite(v) ? v : def }
