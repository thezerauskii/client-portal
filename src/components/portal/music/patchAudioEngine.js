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
import { getAudioContext, loadAudioBuffer, resumeContext } from './audioEngine.js'
import { resolveRouting, rms } from '../../../shared/domain/patchGraph.js'

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
    return true
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
    const { activeSources } = resolveRouting(ports, cables)

    // Detener voces que ya NO están activas.
    for (const id of Object.keys(this.voices)) {
      if (!activeSources.includes(id)) this._stopVoice(id)
    }
    // Arrancar/actualizar voces activas.
    const anyPlaying = Object.keys(this.voices).length > 0
    for (const id of activeSources) {
      const g = this._gainFor(id, activeSources)
      if (this.voices[id]) {
        this.voices[id].gain.gain.value = g       // actualizar mezcla
      } else {
        this._startVoice(id, g, anyPlaying ? this._elapsed() : 0)
      }
    }
    if (activeSources.length === 0) { this.startedAt = 0; this.offset = 0 }
  }

  _elapsed() {
    if (!this.startedAt) return 0
    return Math.min(this.ctx.currentTime - this.startedAt + this.offset, this._maxDuration())
  }

  _maxDuration() {
    return Math.max(
      this.buffers['src-original']?.duration || 0,
      this.buffers['src-master']?.duration || 0,
    )
  }

  _startVoice(portId, gainVal, offset = 0) {
    const buf = this.buffers[portId]
    if (!buf) return
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    const gain = this.ctx.createGain()
    gain.gain.value = gainVal
    src.connect(gain); gain.connect(this.master)
    if (!this.startedAt) { this.startedAt = this.ctx.currentTime; this.offset = offset }
    src.start(0, offset)
    this.voices[portId] = { src, gain }
  }

  _stopVoice(portId) {
    const v = this.voices[portId]
    if (!v) return
    try { v.src.onended = null; v.src.stop() } catch { /* ignore */ }
    try { v.src.disconnect(); v.gain.disconnect() } catch { /* ignore */ }
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

  /** Nivel 0..1 del master para el VU (rms del dominio del tiempo). */
  getLevel() {
    if (!this.analyser || !this._levelBuf) return 0
    this.analyser.getFloatTimeDomainData(this._levelBuf)
    return rms(this._levelBuf)
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
