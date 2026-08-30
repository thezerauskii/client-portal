/**
 * patchAudioEngine — ejecuta en Web Audio lo que el patchGraph (puro) decide.
 *
 * No decide QUÉ suena (eso es resolveRouting en shared/domain/patchGraph.js);
 * solo crea/destruye los nodos para que las fuentes ACTIVAS suenen, aplica el
 * crossfade de la perilla cuando Original+Master están activos, opcionalmente
 * mete un efecto en la cadena, y expone un AnalyserNode para el VU meter.
 *
 * Uso:
 *   const eng = new PatchAudioEngine()
 *   await eng.load({ original: urlA, master: urlB })
 *   eng.setMix(0.5)                       // perilla 0..1 (original↔master)
 *   eng.applyRouting(ports, cables)       // arranca/detiene según resolveRouting
 *   eng.getLevel()                        // 0..1 para el VU (rms del analyser)
 *   eng.dispose()                         // al desmontar
 *
 * Toda la lógica de ruteo se valida en patchGraph.test.js (puro). Aquí la parte
 * de Web Audio no es unit-testeable (no hay AudioContext en jsdom), por eso se
 * mantiene lo más delgada posible.
 */
import { getAudioContext, loadAudioBuffer, resumeContext, makeReverbIR } from './audioEngine.js'
import { resolveRouting, rms } from '../../../shared/domain/patchGraph.js'
import { downsamplePeaks } from '../../../shared/domain/musicStudio.js'

export class PatchAudioEngine {
  constructor() {
    this.ctx = null
    this.buffers = {}          // { 'src-original': AudioBuffer, 'src-master': AudioBuffer }
    this.voices = {}           // { portId: { src, gain } } fuentes sonando ahora
    this.analyser = null
    this.master = null         // GainNode master → destino + analyser
    this.mix = 0.5             // 0 = solo original, 1 = solo master
    this.startedAt = 0
    this.offset = 0
    this._levelBuf = null
  }

  async load({ original, master }) {
    this.ctx = getAudioContext()
    if (!this.ctx) return false
    this.master = this.ctx.createGain()
    this.analyser = this.ctx.createAnalyser()
    this.analyser.fftSize = 1024
    this._levelBuf = new Float32Array(this.analyser.fftSize)
    this.master.connect(this.analyser)
    this.master.connect(this.ctx.destination)
    const jobs = []
    if (original) jobs.push(loadAudioBuffer(original).then(b => { this.buffers['src-original'] = b }))
    if (master) jobs.push(loadAudioBuffer(master).then(b => { this.buffers['src-master'] = b }))
    await Promise.all(jobs)
    // Si NO hay pistas reales, generamos audio de DEMO para que la consola
    // (VU, casete, tiempo) funcione y se pueda ver/oír. Original = tono seco;
    // Master = el mismo tono con más cuerpo/armónicos (simula "mejorado").
    if (!this.buffers['src-original'] && !this.buffers['src-master']) {
      this.buffers['src-original'] = this._makeDemoBuffer('original')
      this.buffers['src-master'] = this._makeDemoBuffer('master')
      this.isDemo = true
    }
    return true
  }

  /** Genera un buffer musical sintético (demo) — loop de ~8s con dinámica. */
  _makeDemoBuffer(kind) {
    const ctx = this.ctx
    const dur = 8, rate = ctx.sampleRate
    const buf = ctx.createBuffer(1, Math.floor(dur * rate), rate)
    const data = buf.getChannelData(0)
    // progresión simple de notas (La menor) con envolvente por nota
    const notes = [220, 261.63, 329.63, 220, 293.66, 349.23, 261.63, 220]
    const noteLen = dur / notes.length
    for (let i = 0; i < data.length; i++) {
      const t = i / rate
      const ni = Math.min(notes.length - 1, Math.floor(t / noteLen))
      const f = notes[ni]
      const local = (t - ni * noteLen) / noteLen
      const env = Math.sin(Math.PI * local) // sube y baja por nota (dinámica → VU se mueve)
      let s = Math.sin(2 * Math.PI * f * t) * 0.5
      if (kind === 'master') {
        // "master": + armónico + sub → más cuerpo y algo más fuerte
        s += Math.sin(2 * Math.PI * f * 2 * t) * 0.18
        s += Math.sin(2 * Math.PI * f * 0.5 * t) * 0.22
        s *= 1.15
      }
      data[i] = Math.max(-1, Math.min(1, s * env * 0.7))
    }
    return buf
  }

  /** Ganancia de cada fuente según el crossfade (equal-power). */
  _gainFor(portId, activeSources) {
    const hasOrig = activeSources.includes('src-original')
    const hasMast = activeSources.includes('src-master')
    // Solo cruzamos cuando AMBAS están activas (comportamiento del comparador).
    if (hasOrig && hasMast) {
      const a = Math.cos(this.mix * 0.5 * Math.PI) // original
      const b = Math.cos((1 - this.mix) * 0.5 * Math.PI) // master
      if (portId === 'src-original') return a
      if (portId === 'src-master') return b
    }
    return 1
  }

  /** Arranca/detiene voces para reflejar exactamente resolveRouting(cables). */
  async applyRouting(ports, cables) {
    if (!this.ctx) return
    await resumeContext()
    const { activeSources, chains } = resolveRouting(ports, cables)
    const effectOf = (id) => (chains.find(c => c.source === id)?.effect || null)

    // Detener voces que ya NO están activas o que cambiaron de cadena (directo↔efecto).
    for (const id of Object.keys(this.voices)) {
      if (!activeSources.includes(id) || this.voices[id].effect !== effectOf(id)) {
        this._stopVoice(id)
      }
    }
    // Arrancar/actualizar voces activas.
    const anyPlaying = Object.keys(this.voices).length > 0
    for (const id of activeSources) {
      const g = this._gainFor(id, activeSources)
      if (this.voices[id]) {
        this.voices[id].gain.gain.value = g       // actualizar mezcla
      } else {
        this._startVoice(id, g, anyPlaying ? this._elapsed() : 0, effectOf(id))
      }
    }
    if (activeSources.length === 0) { this.startedAt = 0; this.offset = 0 }
  }

  _elapsed() {
    if (!this.startedAt) return 0
    return Math.min(this.ctx.currentTime - this.startedAt + this.offset, this._maxDuration())
  }

  /**
   * Salta a una posición (ratio 0..1) reiniciando las voces activas desde ese
   * offset. Si no hay nada sonando, solo recuerda el offset para el próximo play.
   */
  seek(ratio) {
    const dur = this._maxDuration()
    const off = Math.max(0, Math.min(1, ratio)) * dur
    const active = Object.keys(this.voices)
    if (active.length === 0) { this.startedAt = 0; this.offset = off; return }
    // Reinicia cada voz activa desde el nuevo offset.
    const effects = {}
    for (const id of active) effects[id] = this.voices[id].effect || null
    for (const id of active) this._stopVoice(id)
    this.startedAt = 0; this.offset = 0
    for (const id of active) {
      const g = this._gainFor(id, active)
      this._startVoice(id, g, off, effects[id])
    }
  }

  _maxDuration() {
    return Math.max(
      this.buffers['src-original']?.duration || 0,
      this.buffers['src-master']?.duration || 0,
    )
  }

  _startVoice(portId, gainVal, offset = 0, effectId = null) {
    const buf = this.buffers[portId]
    if (!buf) return
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    const gain = this.ctx.createGain()
    gain.gain.value = gainVal
    src.connect(gain)
    // Si la fuente pasa por un efecto (fx-*), insertamos el nodo entre gain y master.
    let fxNode = null
    if (effectId) {
      fxNode = this._makeEffect(effectId)
      if (fxNode) { gain.connect(fxNode); fxNode.connect(this.master) }
      else gain.connect(this.master)
    } else {
      gain.connect(this.master)
    }
    if (!this.startedAt) { this.startedAt = this.ctx.currentTime; this.offset = offset }
    src.start(0, offset)
    this.voices[portId] = { src, gain, fx: fxNode, effect: effectId }
  }

  /** Crea un nodo de efecto para la cadena (por ahora: reverb por convolución). */
  _makeEffect(/* effectId */) {
    try {
      const conv = this.ctx.createConvolver()
      conv.buffer = makeReverbIR(this.ctx, 2.2, 2.4)
      return conv
    } catch { return null }
  }

  _stopVoice(portId) {
    const v = this.voices[portId]
    if (!v) return
    try { v.src.onended = null; v.src.stop() } catch { /* ignore */ }
    try { v.src.disconnect(); v.gain.disconnect(); v.fx && v.fx.disconnect() } catch { /* ignore */ }
    delete this.voices[portId]
  }

  setMix(mix) {
    this.mix = Math.max(0, Math.min(1, mix))
    // Reaplica ganancias a voces activas si ambas suenan.
    const active = Object.keys(this.voices)
    if (active.includes('src-original') && active.includes('src-master')) {
      this.voices['src-original'].gain.gain.value = this._gainFor('src-original', active)
      this.voices['src-master'].gain.gain.value = this._gainFor('src-master', active)
    }
  }

  /**
   * Nivel 0..1 del master para el VU (RMS del dominio del tiempo, amplificado).
   * El RMS de música ronda 0.1–0.3, así que lo escalamos (×2.8) con clamp para
   * que la aguja del VU se mueva de forma visible y llegue a rojo en los picos,
   * como un VU analógico real.
   */
  getLevel() {
    if (!this.analyser || !this._levelBuf) return 0
    this.analyser.getFloatTimeDomainData(this._levelBuf)
    return Math.min(1, rms(this._levelBuf) * 2.8)
  }

  /**
   * Peaks min/max de cada pista para dibujar las 2 ondas superpuestas.
   * @param {number} n columnas
   * @returns {{ a: {min,max}[]|null, b: {min,max}[]|null }}
   */
  getPeaks(n = 700) {
    const bufA = this.buffers['src-original']
    const bufB = this.buffers['src-master']
    return {
      a: bufA ? downsamplePeaks(bufA.getChannelData(0), n) : null,
      b: bufB ? downsamplePeaks(bufB.getChannelData(0), n) : null,
    }
  }

  /** Progreso 0..1 sobre la duración máxima (para el playhead del waveform). */
  progress() {
    const dur = this._maxDuration()
    return dur ? Math.min(1, this._elapsed() / dur) : 0
  }

  /** ¿Hay algo sonando? */
  isPlaying() { return Object.keys(this.voices).length > 0 }

  dispose() {
    for (const id of Object.keys(this.voices)) this._stopVoice(id)
    try { this.analyser?.disconnect() } catch { /* ignore */ }
    try { this.master?.disconnect() } catch { /* ignore */ }
    this.analyser = null; this.master = null; this.buffers = {}; this.voices = {}
  }
}

export default PatchAudioEngine
