import React, { useEffect, useRef, useState, useCallback } from 'react'
import { getAudioContext, loadAudioBuffer, resumeContext, isWebAudioSupported, makeReverbIR } from './audioEngine.js'
import './music.css'

/**
 * FxRack — plays a demo track through a Web Audio chain with toggleable
 * reverb, doubler and basic compression, adjustable in real time.
 *
 * Chain: source → [compressor] → [doubler(dry+delay)] → [reverb(dry/wet)] → destination
 *
 * Props:
 *  - audio: { url, name }
 *  - accent: color
 *  - defaults: { reverb, doubler, compressor } initial enabled state
 */
export default function FxRack({ audio, accent = '#22C55E', defaults = {} }) {
  const bufRef = useRef(null)
  const srcRef = useRef(null)
  const nodesRef = useRef({})
  const startedAt = useRef(0)
  const offset = useRef(0)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [unsupported] = useState(!isWebAudioSupported())

  const [reverbOn, setReverbOn] = useState(!!defaults.reverb)
  const [doublerOn, setDoublerOn] = useState(!!defaults.doubler)
  const [compOn, setCompOn] = useState(!!defaults.compressor)
  const [reverbAmt, setReverbAmt] = useState(0.35)
  const [compAmt, setCompAmt] = useState(0.5)

  const url = audio?.url

  useEffect(() => {
    let cancelled = false
    if (!url || unsupported) { setLoading(false); return }
    setLoading(true); setError(null)
    loadAudioBuffer(url)
      .then(buf => { if (!cancelled) { bufRef.current = buf; setLoading(false) } })
      .catch(e => { if (!cancelled) { setError(e.message || 'Error de audio'); setLoading(false) } })
    return () => { cancelled = true; stop() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, unsupported])

  // Rebuild the FX graph for the current source + toggles
  const buildGraph = useCallback((ctx, src) => {
    const n = {}
    let node = src

    // Compressor
    if (compOn) {
      const comp = ctx.createDynamicsCompressor()
      comp.threshold.value = -24 - compAmt * 12   // more amount → lower threshold
      comp.ratio.value = 3 + compAmt * 9
      comp.attack.value = 0.003
      comp.release.value = 0.25
      node.connect(comp); node = comp; n.comp = comp
    }

    // Doubler: dry + short delayed/detuned copy mixed
    if (doublerOn) {
      const merge = ctx.createGain()
      node.connect(merge)                     // dry
      const delay = ctx.createDelay()
      delay.delayTime.value = 0.028
      const dgain = ctx.createGain(); dgain.gain.value = 0.6
      node.connect(delay); delay.connect(dgain); dgain.connect(merge)
      node = merge; n.doubler = merge
    }

    // Reverb: dry/wet with convolver
    if (reverbOn) {
      const out = ctx.createGain()
      const dry = ctx.createGain(); dry.gain.value = 1 - reverbAmt
      const wet = ctx.createGain(); wet.gain.value = reverbAmt
      const conv = ctx.createConvolver()
      conv.buffer = makeReverbIR(ctx, 2.2, 2.6)
      node.connect(dry); dry.connect(out)
      node.connect(conv); conv.connect(wet); wet.connect(out)
      node = out; n.reverbDry = dry; n.reverbWet = wet
    }

    node.connect(ctx.destination)
    nodesRef.current = n
  }, [compOn, compAmt, doublerOn, reverbOn, reverbAmt])

  const play = useCallback(async (off = 0) => {
    const ctx = getAudioContext()
    if (!ctx || !bufRef.current) return
    await resumeContext()
    stopInternal()
    const src = ctx.createBufferSource()
    src.buffer = bufRef.current
    buildGraph(ctx, src)
    offset.current = Math.max(0, Math.min(off, bufRef.current.duration - 0.01))
    startedAt.current = ctx.currentTime
    src.onended = () => { setPlaying(false) }
    src.start(0, offset.current)
    srcRef.current = src
    setPlaying(true)
  }, [buildGraph])

  function stopInternal() {
    if (srcRef.current) { try { srcRef.current.onended = null; srcRef.current.stop() } catch {} srcRef.current.disconnect(); srcRef.current = null }
    setPlaying(false)
  }
  function stop() { stopInternal(); offset.current = 0 }

  function toggle() {
    if (playing) stopInternal()
    else play(0)
  }

  // Live-update effect params while playing (rebuild graph on toggle changes)
  useEffect(() => {
    if (playing) {
      const ctx = getAudioContext()
      const elapsed = ctx.currentTime - startedAt.current + offset.current
      play(elapsed % (bufRef.current?.duration || 1))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reverbOn, doublerOn, compOn])

  // Live-update wet/comp amounts without full rebuild
  useEffect(() => {
    const n = nodesRef.current
    if (n.reverbDry && n.reverbWet) { n.reverbDry.gain.value = 1 - reverbAmt; n.reverbWet.gain.value = reverbAmt }
  }, [reverbAmt])
  useEffect(() => {
    const n = nodesRef.current
    if (n.comp) { n.comp.threshold.value = -24 - compAmt * 12; n.comp.ratio.value = 3 + compAmt * 9 }
  }, [compAmt])

  if (unsupported) {
    return (
      <div className="fx-rack wf-fallback">
        <p className="wf-note">Tu navegador no soporta los efectos en vivo. Reproducción simple:</p>
        {url && <audio src={url} controls style={{ width: '100%' }} />}
      </div>
    )
  }

  return (
    <div className="fx-rack">
      <div className="fx-transport">
        <button className="wf-play-btn" onClick={toggle} disabled={loading || !!error} aria-label={playing ? 'Pausar' : 'Reproducir'} style={{ '--accent': accent }}>
          {playing
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
        </button>
        <span className="fx-title">Demo de efectos</span>
        {loading && <span className="wf-status">Cargando…</span>}
        {error && <span className="wf-status wf-status--err">{error}</span>}
      </div>

      <div className="fx-controls">
        <div className={`fx-unit ${compOn ? 'fx-unit--on' : ''}`}>
          <label className="fx-toggle">
            <input type="checkbox" checked={compOn} onChange={e => setCompOn(e.target.checked)} />
            <span>Compresión</span>
          </label>
          <input className="fx-knob" type="range" min="0" max="1" step="0.01" value={compAmt} onChange={e => setCompAmt(parseFloat(e.target.value))} disabled={!compOn} aria-label="Cantidad de compresión" />
        </div>

        <div className={`fx-unit ${doublerOn ? 'fx-unit--on' : ''}`}>
          <label className="fx-toggle">
            <input type="checkbox" checked={doublerOn} onChange={e => setDoublerOn(e.target.checked)} />
            <span>Doubler</span>
          </label>
        </div>

        <div className={`fx-unit ${reverbOn ? 'fx-unit--on' : ''}`}>
          <label className="fx-toggle">
            <input type="checkbox" checked={reverbOn} onChange={e => setReverbOn(e.target.checked)} />
            <span>Reverb</span>
          </label>
          <input className="fx-knob" type="range" min="0" max="1" step="0.01" value={reverbAmt} onChange={e => setReverbAmt(parseFloat(e.target.value))} disabled={!reverbOn} aria-label="Cantidad de reverb" />
        </div>
      </div>
      <p className="fx-note">Muestra de lo que puedo hacer como sound designer. El trabajo final se realiza con VSTs profesionales en DAW.</p>
    </div>
  )
}
