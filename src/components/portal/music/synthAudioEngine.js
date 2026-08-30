/**
 * synthAudioEngine — thin Web Audio wrapper that EXECUTES the pure synth logic
 * from shared/domain/synthEngine.js. It doesn't decide the sound math; it just
 * builds the node graph per voice and applies the ADSR via gain ramps.
 *
 * Signal path per voice:
 *   Osc(+Osc2) → per-voice Gain (ADSR) → filter (shared low-pass) → master
 *   master → Analyser → destination
 *
 * Polyphony is capped (voice-stealing on the oldest voice). Oscillators are
 * one-shot: they're created on noteOn and stopped/released after the ADSR
 * release, then discarded.
 */
import { getAudioContext, resumeContext } from './audioEngine.js'
import { noteToFreq, cutoffToHz, qToFilterQ, presetToParams } from '../../../shared/domain/synthEngine.js'

const MAX_VOICES = 6

export default class SynthAudioEngine {
  constructor() {
    this.ctx = null
    this.master = null
    this.filter = null
    this.analyser = null
    this._levelBuf = null
    this.params = presetToParams({})
    this.voices = new Map() // midi → { osc, osc2, gain, startedAt }
    this._order = []        // midi order for voice-stealing
  }

  /** Lazily create the shared graph. Returns false if Web Audio unsupported. */
  ensure() {
    if (this.ctx) return true
    const ctx = getAudioContext()
    if (!ctx) return false
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.gain.value = 0.7
    this.filter = ctx.createBiquadFilter()
    this.filter.type = 'lowpass'
    this.analyser = ctx.createAnalyser()
    this.analyser.fftSize = 1024
    this._levelBuf = new Float32Array(this.analyser.fftSize)
    // voices → filter → master → analyser → destination
    this.filter.connect(this.master)
    this.master.connect(this.analyser)
    this.master.connect(ctx.destination)
    this._applyFilter()
    return true
  }

  setPreset(preset) {
    this.params = presetToParams(preset)
    if (this.ctx) this._applyFilter()
  }

  _applyFilter() {
    if (!this.filter) return
    this.filter.frequency.setTargetAtTime(cutoffToHz(this.params.cutoff), this.ctx.currentTime, 0.01)
    this.filter.Q.setTargetAtTime(qToFilterQ(this.params.q), this.ctx.currentTime, 0.01)
  }

  /** Start a note (MIDI number, incl. octave shift applied by caller or here). */
  async noteOn(midi) {
    if (!this.ensure()) return
    await resumeContext()
    if (this.voices.has(midi)) return // already sounding

    if (this.voices.size >= MAX_VOICES) {
      const oldest = this._order.shift()
      if (oldest != null) this._release(oldest, true)
    }

    const ctx = this.ctx
    const now = ctx.currentTime
    const freq = noteToFreq(midi + this.params.octave * 12)
    const { osc, osc2, attack, decay, sustain } = this.params

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(1, now + attack)
    gain.gain.linearRampToValueAtTime(Math.max(0.0001, sustain), now + attack + decay)
    gain.connect(this.filter)

    const o1 = ctx.createOscillator()
    o1.type = osc
    o1.frequency.setValueAtTime(freq, now)
    o1.connect(gain)
    o1.start(now)

    let o2 = null
    if (osc2) {
      o2 = ctx.createOscillator()
      o2.type = osc2
      o2.frequency.setValueAtTime(freq, now)
      const g2 = ctx.createGain(); g2.gain.value = 0.5
      o2.connect(g2); g2.connect(gain)
      o2.start(now)
    }

    this.voices.set(midi, { osc: o1, osc2: o2, gain, startedAt: now })
    this._order.push(midi)
  }

  /** Release a note (ADSR release ramp, then cleanup). */
  noteOff(midi) {
    this._release(midi, false)
    const i = this._order.indexOf(midi)
    if (i >= 0) this._order.splice(i, 1)
  }

  _release(midi, immediate) {
    const v = this.voices.get(midi)
    if (!v) return
    this.voices.delete(midi)
    const now = this.ctx.currentTime
    const R = immediate ? 0.02 : this.params.release
    try {
      v.gain.gain.cancelScheduledValues(now)
      v.gain.gain.setValueAtTime(Math.max(0.0001, v.gain.gain.value), now)
      v.gain.gain.linearRampToValueAtTime(0.0001, now + R)
    } catch { /* ignore */ }
    const stopAt = now + R + 0.02
    try { v.osc.stop(stopAt) } catch { /* ignore */ }
    try { if (v.osc2) v.osc2.stop(stopAt) } catch { /* ignore */ }
    // disconnect after stop
    const cleanup = () => {
      try { v.osc.disconnect() } catch { /* ignore */ }
      try { v.osc2 && v.osc2.disconnect() } catch { /* ignore */ }
      try { v.gain.disconnect() } catch { /* ignore */ }
    }
    v.osc.onended = cleanup
  }

  /** RMS level 0..1 for a VU / waveform. */
  getLevel() {
    if (!this.analyser || !this._levelBuf) return 0
    this.analyser.getFloatTimeDomainData(this._levelBuf)
    let sum = 0
    for (let i = 0; i < this._levelBuf.length; i++) sum += this._levelBuf[i] * this._levelBuf[i]
    return Math.min(1, Math.sqrt(sum / this._levelBuf.length) * 2)
  }

  isPlaying() { return this.voices.size > 0 }

  dispose() {
    for (const midi of [...this.voices.keys()]) this._release(midi, true)
    this.voices.clear(); this._order = []
    try { this.filter?.disconnect() } catch { /* ignore */ }
    try { this.master?.disconnect() } catch { /* ignore */ }
    try { this.analyser?.disconnect() } catch { /* ignore */ }
    this.filter = null; this.master = null; this.analyser = null
  }
}
