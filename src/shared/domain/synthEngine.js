/**
 * Shared domain: mini-synth engine (PURE logic).
 *
 * Everything here is pure math / data mapping — NO Web Audio, NO DOM — so it is
 * unit-testable in Node and shared identically between the Electron editor and
 * the public portal. The actual sound is produced by a thin WebAudio wrapper
 * (synthAudioEngine) that only EXECUTES these decisions.
 */

// ── Oscillator waveforms the engine supports ────────────────────────────────
export const WAVEFORMS = ['sine', 'triangle', 'sawtooth', 'square']

/**
 * MIDI note number → frequency in Hz (A4 = 69 = 440 Hz, equal temperament).
 * @param {number} midi
 * @returns {number} Hz
 */
export function noteToFreq(midi) {
  const m = Number(midi)
  if (!Number.isFinite(m)) return 0
  return 440 * Math.pow(2, (m - 69) / 12)
}

/**
 * QWERTY → semitone offset (relative to the base C of the current octave).
 * Classic tracker/DAW layout: z..m = white keys, s,d,g,h,j = black keys, and a
 * second row q..u one octave up.
 */
export const QWERTY_KEYS = {
  a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11, k: 12,
  o: 13, l: 14, p: 15,
}

/**
 * HARMONY_STYLES — escalas/acordes por estilo para el modo "armonías al teclear"
 * (cuando el sinte NO está activo y el usuario escribe fuera de un campo).
 * Cada estilo define grados (semitonos desde la tónica) que suenan bien juntos.
 */
export const HARMONY_STYLES = {
  // Alegre: mayor / pentatónica mayor — arpegios luminosos.
  happy: { scale: [0, 2, 4, 7, 9, 12, 16, 19], chord: [0, 4, 7, 11] },
  // Gótico: menor armónica / disminuido — tensión oscura.
  gothic: { scale: [0, 1, 3, 5, 7, 8, 11, 12], chord: [0, 3, 6, 8] },
  // Etéreo/soñador: lidio / add9.
  dreamy: { scale: [0, 2, 4, 6, 7, 9, 11, 12], chord: [0, 4, 7, 14] },
  // Lo-fi/jazzy: menor dórico con séptimas.
  lofi: { scale: [0, 2, 3, 5, 7, 9, 10, 12], chord: [0, 3, 7, 10] },
}
export const HARMONY_STYLE_IDS = Object.keys(HARMONY_STYLES)

/**
 * harmonyForKey — dado un carácter tecleado, una tónica base y un estilo,
 * devuelve un ARPEGIO: lista de { midi, delayMs, holdMs } que, tocados en
 * secuencia rápida, suenan como una pequeña armonía. Puro/determinista por
 * carácter (misma tecla → mismo arpegio), para que "escribir" suene musical.
 *
 * @param {string} ch  carácter (una letra/dígito)
 * @param {number} baseMidi  tónica (p.ej. 48 = C3)
 * @param {string} styleId  'happy'|'gothic'|'dreamy'|'lofi'
 * @returns {Array<{midi:number, delayMs:number, holdMs:number}>}
 */
export function harmonyForKey(ch, baseMidi = 48, styleId = 'happy') {
  const style = HARMONY_STYLES[styleId] || HARMONY_STYLES.happy
  const code = typeof ch === 'string' && ch.length ? ch.toLowerCase().charCodeAt(0) : 0
  if (!code) return []
  // Índice de grado a partir del carácter (determinista).
  const root = style.scale[code % style.scale.length]
  // Espacio/enter/puntuación → acorde completo; letras → arpegio de 2-3 notas.
  const isSpace = ch === ' ' || ch === '\n' || ch === '\t'
  const oct = ((code >> 3) % 2) * 12 // varía la octava un poco según la tecla
  if (isSpace) {
    // Acorde: todas las notas juntas.
    return style.chord.map((iv, i) => ({ midi: baseMidi + root + iv + oct, delayMs: i * 8, holdMs: 520 }))
  }
  // Arpegio: 3 grados de la escala partiendo del grado del carácter.
  const steps = [0, 2, 4].map(s => style.scale[(code + s) % style.scale.length])
  return steps.map((deg, i) => ({ midi: baseMidi + deg + oct, delayMs: i * 55, holdMs: 260 }))
}

/**
 * Build the list of playable keys for a keyboard spanning `octaves` starting at
 * `baseMidi`. Returns [{ midi, isBlack, index }] for rendering.
 * @param {number} baseMidi lowest note (e.g. 48 = C3)
 * @param {number} octaves  how many octaves (default 1.5 → 18 semitones)
 */
export function buildKeyboard(baseMidi = 48, octaves = 1.5) {
  const count = Math.max(1, Math.round(octaves * 12))
  const BLACK = new Set([1, 3, 6, 8, 10])
  const keys = []
  for (let i = 0; i <= count; i++) {
    const midi = baseMidi + i
    keys.push({ midi, isBlack: BLACK.has(((midi % 12) + 12) % 12), index: i })
  }
  return keys
}

// ── Parameter clamping (single source of truth for safe ranges) ─────────────
const PARAM_RANGES = {
  cutoff: { min: 0, max: 1, def: 0.6 },      // 0..1 (mapped to Hz by the engine)
  q: { min: 0, max: 1, def: 0.2 },           // resonance 0..1
  attack: { min: 0.001, max: 3, def: 0.01 }, // seconds
  decay: { min: 0.001, max: 3, def: 0.2 },
  sustain: { min: 0, max: 1, def: 0.7 },     // level 0..1
  release: { min: 0.001, max: 5, def: 0.3 },
  octave: { min: -2, max: 2, def: 0 },       // integer octave shift
}

/**
 * Clamp a named synth parameter to its safe range. Unknown params pass through.
 * @param {string} name
 * @param {number} value
 */
export function clampParam(name, value) {
  const r = PARAM_RANGES[name]
  const v = Number(value)
  if (!r) return Number.isFinite(v) ? v : 0
  if (!Number.isFinite(v)) return r.def
  const clamped = Math.max(r.min, Math.min(r.max, v))
  return name === 'octave' ? Math.round(clamped) : clamped
}

/**
 * Map a 0..1 cutoff knob to a filter frequency in Hz (exponential, musical).
 * 0 → ~80 Hz, 1 → ~12 kHz.
 */
export function cutoffToHz(cutoff01) {
  const t = clampParam('cutoff', cutoff01)
  const minHz = 80, maxHz = 12000
  return minHz * Math.pow(maxHz / minHz, t)
}

/**
 * Map a 0..1 resonance knob to a BiquadFilter Q value (0.7 .. ~18).
 */
export function qToFilterQ(q01) {
  const t = clampParam('q', q01)
  return 0.7 + t * 17.3
}

/**
 * Normalize an artist preset into safe engine params. Missing/invalid fields
 * fall back to defaults. Never throws.
 * @param {object} preset
 * @returns {{ osc, osc2, cutoff, q, attack, decay, sustain, release, octave }}
 */
export function presetToParams(preset) {
  const p = (preset && typeof preset === 'object') ? preset : {}
  const wf = (v, def) => (WAVEFORMS.includes(v) ? v : def)
  return {
    osc: wf(p.osc, 'sawtooth'),
    osc2: p.osc2 == null ? null : wf(p.osc2, null),
    cutoff: clampParam('cutoff', p.cutoff ?? 0.6),
    q: clampParam('q', p.q ?? 0.2),
    attack: clampParam('attack', p.attack ?? 0.01),
    decay: clampParam('decay', p.decay ?? 0.2),
    sustain: clampParam('sustain', p.sustain ?? 0.7),
    release: clampParam('release', p.release ?? 0.3),
    octave: clampParam('octave', p.octave ?? 0),
  }
}

/**
 * ADSR envelope value at time `t` (seconds) after note-on, given whether the
 * note is still held. Used for tests + optional visualization. The real audio
 * engine uses WebAudio gain ramps, but this mirrors the same math.
 *
 * @param {{attack,decay,sustain,release}} params
 * @param {number} t seconds since note-on
 * @param {boolean} held is the key still down?
 * @param {number} releaseStart seconds since note-on when the key was released
 * @returns {number} gain 0..1
 */
export function adsrGain(params, t, held = true, releaseStart = null) {
  const { attack, decay, sustain } = params
  const A = clampParam('attack', attack)
  const D = clampParam('decay', decay)
  const S = clampParam('sustain', sustain)
  const R = clampParam('release', params.release)
  if (t <= 0) return 0

  // Level reached at the moment of release (or now, if still held).
  const levelAt = (tt) => {
    if (tt < A) return tt / A
    if (tt < A + D) return 1 - (1 - S) * ((tt - A) / D)
    return S
  }

  if (held || releaseStart == null) return levelAt(t)

  // Released: ramp from the level at releaseStart down to 0 over R seconds.
  if (t < releaseStart) return levelAt(t)
  const startLevel = levelAt(releaseStart)
  const rt = t - releaseStart
  if (rt >= R) return 0
  return startLevel * (1 - rt / R)
}
