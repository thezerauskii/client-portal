/**
 * audioEngine.js — small helpers around Web Audio API used by the music components.
 * Keeps a single shared AudioContext and utilities to decode audio + read peaks.
 */

let _ctx = null

/** Get (lazily create) the shared AudioContext. Returns null if unsupported. */
export function getAudioContext() {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  if (!_ctx) _ctx = new AC()
  return _ctx
}

/** True if the browser supports Web Audio. */
export function isWebAudioSupported() {
  return typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext)
}

/**
 * Fetch a URL and decode it into an AudioBuffer.
 * @returns {Promise<AudioBuffer>}
 */
export async function loadAudioBuffer(url) {
  const ctx = getAudioContext()
  if (!ctx) throw new Error('Web Audio no soportado')
  const res = await fetch(url)
  if (!res.ok) throw new Error('No se pudo cargar el audio')
  const arr = await res.arrayBuffer()
  return await ctx.decodeAudioData(arr)
}

/** Resume the context if suspended (must be called from a user gesture). */
export async function resumeContext() {
  const ctx = getAudioContext()
  if (ctx && ctx.state === 'suspended') {
    try { await ctx.resume() } catch { /* ignore */ }
  }
}

/**
 * Build a ConvolverNode impulse response (decaying noise) — reverb without files.
 * @param {number} seconds decay length
 * @param {number} decay curve exponent
 */
export function makeReverbIR(ctx, seconds = 2.2, decay = 2.5) {
  const rate = ctx.sampleRate
  const len = Math.max(1, Math.floor(rate * seconds))
  const impulse = ctx.createBuffer(2, len, rate)
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch)
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
    }
  }
  return impulse
}
