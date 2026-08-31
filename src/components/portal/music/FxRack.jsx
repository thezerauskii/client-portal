import React, { useEffect, useRef, useState, useCallback } from 'react'
import { getAudioContext, loadAudioBuffer, resumeContext, isWebAudioSupported, makeReverbIR } from './audioEngine.js'
import './music.css'

/**
 * FxRack — reproduce una pista a través de una cadena Web Audio con efectos
 * ajustables en vivo (compresión fuerte estilo bus, reverb, doubler, EQ y
 * saturación). El VISITANTE puede subir SU PROPIA pista para escuchar un
 * preview: el archivo se mantiene sólo en memoria (URL.createObjectURL) y se
 * libera al desmontar — NO se guarda en disco ni se sube a ningún lado.
 *
 * Cadena: source → drive → EQ(low/high) → [compressor] → [doubler] → [reverb] → makeup → destination
 *
 * Props:
 *  - audio: { url, name }  (demo del artista)
 *  - accent
 *  - defaults: { reverb, doubler, compressor }
 *  - allowUpload (bool, default true): permite al visitante subir su pista.
 */
export default function FxRack({ audio, accent = '#22C55E', defaults = {}, allowUpload = true }) {
  const bufRef = useRef(null)
  const srcRef = useRef(null)
  const nodesRef = useRef({})
  const startedAt = useRef(0)
  const offset = useRef(0)
  const objUrlRef = useRef(null) // object URL del archivo del visitante (cache)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [unsupported] = useState(!isWebAudioSupported())

  // Fuente activa: la demo del artista o la pista subida por el visitante.
  const [userTrack, setUserTrack] = useState(null) // { url, name }
  const activeUrl = userTrack?.url || audio?.url
  const activeName = userTrack?.name || 'Demo de efectos'

  const [reverbOn, setReverbOn] = useState(!!defaults.reverb)
  const [doublerOn, setDoublerOn] = useState(!!defaults.doubler)
  const [compOn, setCompOn] = useState(!!defaults.compressor)
  const [driveOn, setDriveOn] = useState(false)
  const [reverbAmt, setReverbAmt] = useState(0.35)
  const [compAmt, setCompAmt] = useState(0.6)
  const [driveAmt, setDriveAmt] = useState(0.3)
  const [lowGain, setLowGain] = useState(0)   // -12..+12 dB
  const [highGain, setHighGain] = useState(0) // -12..+12 dB

  useEffect(() => {
    let cancelled = false
    if (!activeUrl || unsupported) { setLoading(false); return }
    setLoading(true); setError(null)
    loadAudioBuffer(activeUrl)
      .then(buf => { if (!cancelled) { bufRef.current = buf; setLoading(false) } })
      .catch(e => { if (!cancelled) { setError(e.message || 'Error de audio'); setLoading(false) } })
    return () => { cancelled = true; stop() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUrl, unsupported])

  // Libera el object URL al desmontar (no queda nada en disco).
  useEffect(() => () => { if (objUrlRef.current) { URL.revokeObjectURL(objUrlRef.current); objUrlRef.current = null } }, [])

  // Curva de saturación suave (soft-clip) para el WaveShaper.
  const makeDriveCurve = (amount) => {
    const k = amount * 40 + 1
    const n = 1024
    const curve = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1
      curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x))
    }
    return curve
  }

  const buildGraph = useCallback((ctx, src) => {
    const n = {}
    let node = src

    if (driveOn) {
      const shaper = ctx.createWaveShaper()
      shaper.curve = makeDriveCurve(driveAmt)
      shaper.oversample = '2x'
      node.connect(shaper); node = shaper; n.drive = shaper
    }

    const low = ctx.createBiquadFilter()
    low.type = 'lowshelf'; low.frequency.value = 200; low.gain.value = lowGain
    node.connect(low); node = low; n.low = low
    const high = ctx.createBiquadFilter()
    high.type = 'highshelf'; high.frequency.value = 4000; high.gain.value = highGain
    node.connect(high); node = high; n.high = high

    if (compOn) {
      const comp = ctx.createDynamicsCompressor()
      comp.threshold.value = -30 - compAmt * 18
      comp.ratio.value = 4 + compAmt * 16
      comp.knee.value = 6
      comp.attack.value = 0.002
      comp.release.value = 0.18
      node.connect(comp); node = comp; n.comp = comp
      const makeup = ctx.createGain()
      makeup.gain.value = 1 + compAmt * 1.1
      node.connect(makeup); node = makeup; n.makeup = makeup
    }

    if (doublerOn) {
      const merge = ctx.createGain()
      node.connect(merge)
      const delay = ctx.createDelay()
      delay.delayTime.value = 0.028
      const dgain = ctx.createGain(); dgain.gain.value = 0.6
      node.connect(delay); delay.connect(dgain); dgain.connect(merge)
      node = merge; n.doubler = merge
    }

    if (reverbOn) {
      const out = ctx.createGain()
      const dry = ctx.createGain(); dry.gain.value = 1 - reverbAmt * 0.85
      const wet = ctx.createGain(); wet.gain.value = reverbAmt
      const conv = ctx.createConvolver()
      conv.buffer = makeReverbIR(ctx, 3.2, 2.2)
      node.connect(dry); dry.connect(out)
      node.connect(conv); conv.connect(wet); wet.connect(out)
      node = out; n.reverbDry = dry; n.reverbWet = wet
    }

    node.connect(ctx.destination)
    nodesRef.current = n
  }, [compOn, compAmt, doublerOn, reverbOn, reverbAmt, driveOn, driveAmt, lowGain, highGain])

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

  const onPickFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (objUrlRef.current) URL.revokeObjectURL(objUrlRef.current)
    const u = URL.createObjectURL(file)
    objUrlRef.current = u
    stopInternal()
    setUserTrack({ url: u, name: file.name })
  }
  const clearUserTrack = () => {
    if (objUrlRef.current) { URL.revokeObjectURL(objUrlRef.current); objUrlRef.current = null }
    stopInternal(); setUserTrack(null)
  }

  useEffect(() => {
    if (playing) {
      const ctx = getAudioContext()
      const elapsed = ctx.currentTime - startedAt.current + offset.current
      play(elapsed % (bufRef.current?.duration || 1))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reverbOn, doublerOn, compOn, driveOn])

  useEffect(() => { const n = nodesRef.current; if (n.reverbDry && n.reverbWet) { n.reverbDry.gain.value = 1 - reverbAmt * 0.85; n.reverbWet.gain.value = reverbAmt } }, [reverbAmt])
  useEffect(() => { const n = nodesRef.current; if (n.comp) { n.comp.threshold.value = -30 - compAmt * 18; n.comp.ratio.value = 4 + compAmt * 16 } if (n.makeup) n.makeup.gain.value = 1 + compAmt * 1.1 }, [compAmt])
  useEffect(() => { const n = nodesRef.current; if (n.drive) n.drive.curve = makeDriveCurve(driveAmt) }, [driveAmt])
  useEffect(() => { const n = nodesRef.current; if (n.low) n.low.gain.value = lowGain }, [lowGain])
  useEffect(() => { const n = nodesRef.current; if (n.high) n.high.gain.value = highGain }, [highGain])

  if (unsupported) {
    return (
      <div className="fx-rack wf-fallback">
        <p className="wf-note">Tu navegador no soporta los efectos en vivo. Reproducción simple:</p>
        {activeUrl && <audio src={activeUrl} controls style={{ width: '100%' }} />}
      </div>
    )
  }

  return (
    <div className="fx-rack">
      <div className="fx-transport">
        <button className="wf-play-btn" onClick={toggle} disabled={loading || !!error || !activeUrl} aria-label={playing ? 'Pausar' : 'Reproducir'} style={{ '--accent': accent }}>
          {playing
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
        </button>
        <span className="fx-title">{activeName}</span>
        {loading && <span className="wf-status">Cargando…</span>}
        {error && <span className="wf-status wf-status--err">{error}</span>}
      </div>

      {allowUpload && (
        <div className="fx-upload">
          <label className="fx-upload-btn">
            <input type="file" accept="audio/*" onChange={onPickFile} hidden />
            {userTrack ? '↻ Cambiar mi pista' : '⇪ Sube tu pista y escucha el preview'}
          </label>
          {userTrack && <button className="fx-upload-clear" onClick={clearUserTrack} title="Volver a la demo">Usar demo</button>}
        </div>
      )}

      <div className="fx-controls">
        <div className={`fx-unit ${compOn ? 'fx-unit--on' : ''}`}>
          <label className="fx-toggle"><input type="checkbox" checked={compOn} onChange={e => setCompOn(e.target.checked)} /><span>Compresión</span></label>
          <input className="fx-knob" type="range" min="0" max="1" step="0.01" value={compAmt} onChange={e => setCompAmt(parseFloat(e.target.value))} disabled={!compOn} aria-label="Cantidad de compresión" />
        </div>

        <div className={`fx-unit ${reverbOn ? 'fx-unit--on' : ''}`}>
          <label className="fx-toggle"><input type="checkbox" checked={reverbOn} onChange={e => setReverbOn(e.target.checked)} /><span>Reverb</span></label>
          <input className="fx-knob" type="range" min="0" max="1" step="0.01" value={reverbAmt} onChange={e => setReverbAmt(parseFloat(e.target.value))} disabled={!reverbOn} aria-label="Cantidad de reverb" />
        </div>

        <div className={`fx-unit ${driveOn ? 'fx-unit--on' : ''}`}>
          <label className="fx-toggle"><input type="checkbox" checked={driveOn} onChange={e => setDriveOn(e.target.checked)} /><span>Saturación</span></label>
          <input className="fx-knob" type="range" min="0" max="1" step="0.01" value={driveAmt} onChange={e => setDriveAmt(parseFloat(e.target.value))} disabled={!driveOn} aria-label="Cantidad de saturación" />
        </div>

        <div className={`fx-unit ${doublerOn ? 'fx-unit--on' : ''}`}>
          <label className="fx-toggle"><input type="checkbox" checked={doublerOn} onChange={e => setDoublerOn(e.target.checked)} /><span>Doubler</span></label>
        </div>

        <div className="fx-unit fx-unit--on">
          <label className="fx-toggle"><span>Graves</span></label>
          <input className="fx-knob" type="range" min="-12" max="12" step="0.5" value={lowGain} onChange={e => setLowGain(parseFloat(e.target.value))} aria-label="Graves (EQ)" />
        </div>
        <div className="fx-unit fx-unit--on">
          <label className="fx-toggle"><span>Agudos</span></label>
          <input className="fx-knob" type="range" min="-12" max="12" step="0.5" value={highGain} onChange={e => setHighGain(parseFloat(e.target.value))} aria-label="Agudos (EQ)" />
        </div>
      </div>
      <p className="fx-note">Sube tu pista para escuchar un preview con mis efectos (compresión, reverb, saturación y EQ). Tu archivo no se guarda; se procesa sólo en tu navegador.</p>
    </div>
  )
}
