/**
 * Shared domain: Music Studio (Estudio de Sonido).
 *
 * Data model shared between the Electron editor and the public portal.
 * Pure data/functions — NO imports (safe for Node serverless, browser, Electron).
 *
 * Shape stored in profiles.music_studio (jsonb) — see normalizeMusicStudio().
 */

// ── Upload limits (single source of truth — controls R2 cost) ────────────────
export const AUDIO_MAX_BYTES = 60 * 1024 * 1024 // 60 MB per audio file
export const COVER_MAX_BYTES = 5 * 1024 * 1024 // 5 MB per cover image
export const AUDIO_EXTS = ['mp3', 'wav', 'ogg', 'm4a', 'flac']
export const AUDIO_MIME_PREFIX = 'audio/'

/** Human-readable MB from bytes. */
export function bytesToMB(bytes) {
  return (bytes / (1024 * 1024)).toFixed(1)
}

/**
 * Validate an audio File (browser/Electron). Returns { ok, error } — never throws.
 * @param {File|Blob & { name?: string, type?: string, size?: number }} file
 */
export function validateAudioFile(file) {
  if (!file) return { ok: false, error: 'No hay archivo.' }
  const name = file.name || ''
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : ''
  const type = file.type || ''
  const isAudio = type.startsWith(AUDIO_MIME_PREFIX) || AUDIO_EXTS.includes(ext)
  if (!isAudio) {
    return { ok: false, error: 'Formato no permitido. Usa mp3, wav, ogg, m4a o flac.' }
  }
  if (typeof file.size === 'number' && file.size > AUDIO_MAX_BYTES) {
    return { ok: false, error: `El audio pesa ${bytesToMB(file.size)} MB y supera el límite de 60 MB. Comprime o recorta el archivo.` }
  }
  return { ok: true }
}

/**
 * Validate an audio upload on the server (no File API — validate by bytes/type).
 * @param {{ sizeBytes?: number, contentType?: string, filename?: string }} info
 */
export function validateAudioUpload({ sizeBytes, contentType, filename } = {}) {
  const ext = filename && filename.includes('.') ? filename.split('.').pop().toLowerCase() : ''
  const type = contentType || ''
  const isAudio = type.startsWith(AUDIO_MIME_PREFIX) || AUDIO_EXTS.includes(ext)
  if (!isAudio) return { ok: false, error: 'Formato de audio no permitido.' }
  if (typeof sizeBytes === 'number' && sizeBytes > AUDIO_MAX_BYTES) {
    return { ok: false, error: `El audio supera el límite de 60 MB.` }
  }
  return { ok: true }
}

// ── ID helper ────────────────────────────────────────────────────────────────
export function makeId(prefix = 'm') {
  return prefix + '_' + Math.random().toString(36).slice(2, 9)
}

// ── Equal-power crossfade for the A/B comparator ─────────────────────────────
/**
 * @param {number} x 0..1 (0 = only A / "before", 1 = only B / "after")
 * @returns {{ a: number, b: number }} gain values (equal-power curve)
 */
export function crossfadeGains(x) {
  const t = Math.max(0, Math.min(1, Number(x) || 0))
  return {
    a: Math.cos(t * 0.5 * Math.PI),
    b: Math.cos((1 - t) * 0.5 * Math.PI),
  }
}

/**
 * Map a 0..1 knob value to a rotary angle in degrees for a vintage knob.
 * Sweeps from -135° (fully left = Original) to +135° (fully right = Master).
 */
export function knobAngle(x) {
  const t = Math.max(0, Math.min(1, Number(x) || 0))
  return -135 + t * 270
}

/** Bézier path for a synth patch cable between two points (with gravity sag). */
export function cablePath(sx, sy, tx, ty, sag = 40) {
  const dx = Math.abs(tx - sx) * 0.4
  return `M ${sx} ${sy} C ${sx + dx} ${sy + sag}, ${tx - dx} ${ty + sag}, ${tx} ${ty}`
}

// ── Downsample audio samples to N min/max peak pairs (for Canvas waveform) ──
/**
 * @param {Float32Array|number[]} samples
 * @param {number} n number of columns to produce
 * @returns {{ min: number, max: number }[]} length n
 */
export function downsamplePeaks(samples, n) {
  const N = Math.max(1, Math.floor(n) || 1)
  const out = []
  const len = samples ? samples.length : 0
  if (len === 0) {
    for (let i = 0; i < N; i++) out.push({ min: 0, max: 0 })
    return out
  }
  const block = Math.max(1, Math.floor(len / N))
  for (let i = 0; i < N; i++) {
    let min = 1
    let max = -1
    const start = i * block
    const end = Math.min(len, start + block)
    if (start >= len) { out.push({ min: 0, max: 0 }); continue }
    for (let j = start; j < end; j++) {
      const v = samples[j]
      if (v < min) min = v
      if (v > max) max = v
    }
    out.push({ min, max })
  }
  return out
}

// ── Factory helpers ──────────────────────────────────────────────────────────
/** Work session types (eMastered-style). "album" intentionally omitted. */
export const WORK_SESSIONS = [
  { id: 'single', label: 'Single', desc: 'Sube una pista del cliente y tu master para comparar.' },
  { id: 'stems', label: 'Stems', desc: 'Sube los stems para una comparación coordinada.' },
]

/** Common music genres (cards). */
export const GENRES = [
  'Pop', 'Rock', 'Hip-Hop', 'Electrónica', 'Dubstep', 'House', 'Techno',
  'Trap', 'Lo-fi', 'Jazz', 'Clásica', 'Metal', 'R&B', 'Reggaetón', 'Ambient', 'Otro',
]

export function makeComparison() {
  return {
    id: makeId('cmp'),
    title: 'Antes / Después',
    session: 'single',   // 'single' | 'stems'
    genre: '',
    subgenre: '',
    trackA: null, // { url, name, storageKey }  — original (cliente)
    trackB: null, // master
    labelA: 'Original',
    labelB: 'Master',
    sortOrder: 0,
  }
}

export function makeLibraryTrack() {
  return {
    id: makeId('trk'),
    title: 'Nueva pista',
    description: '',
    category: '',
    coverUrl: '',
    audio: null, // { url, name, storageKey, durationSec }
    sortOrder: 0,
  }
}

export function makeGig(tier = 'basic') {
  return {
    id: makeId('gig'),
    title: '',
    description: '',
    imageUrl: '',      // Fiverr-style gig thumbnail
    includes: [],
    price: '',
    currency: 'USD',
    deliveryDays: '',
    revisions: '',
    fiverrUrl: '',     // clicking the card/image goes here
    tier, // 'basic' | 'standard' | 'pro'
    exampleTrackIds: [],
    sortOrder: 0,
  }
}

export function makeTool() {
  return { id: makeId('tool'), name: '', category: '', note: '', logoUrl: '', exampleTrackId: '' }
}

export function makeTestimonial() {
  return { id: makeId('tst'), author: '', text: '', rating: 5, avatarUrl: '' }
}

// ── Normalize the whole jsonb blob to a safe shape ───────────────────────────
export function normalizeMusicStudio(data) {
  const d = (data && typeof data === 'object') ? data : {}
  const arr = (v) => (Array.isArray(v) ? v : [])
  return {
    intro: typeof d.intro === 'string' ? d.intro : '',
    bannerUrl: typeof d.bannerUrl === 'string' ? d.bannerUrl : '',
    backgroundUrl: typeof d.backgroundUrl === 'string' ? d.backgroundUrl : '',
    hero: {
      headline: d.hero?.headline || '',
      tagline: d.hero?.tagline || '',
      bgType: d.hero?.bgType || 'waveform', // 'image' | 'video' | 'waveform'
      bgUrl: d.hero?.bgUrl || '',
      fiverrUrl: d.hero?.fiverrUrl || '',
      ctaLabel: d.hero?.ctaLabel || 'Contrátame en Fiverr',
      featuredComparisonId: d.hero?.featuredComparisonId || '',
      metrics: arr(d.hero?.metrics), // [{ label, value }]
    },
    comparisons: arr(d.comparisons),
    library: arr(d.library),
    gigs: arr(d.gigs),
    tools: arr(d.tools),
    testimonials: arr(d.testimonials),
    soundcloudUser: typeof d.soundcloudUser === 'string' ? d.soundcloudUser : '',
    videoDemoUrl: typeof d.videoDemoUrl === 'string' ? d.videoDemoUrl : '',
    theme: d.theme || 'studio', // 'studio' | 'synth-analog'
    fxDemo: {
      audio: d.fxDemo?.audio || null,
      enabledDefaults: {
        reverb: !!d.fxDemo?.enabledDefaults?.reverb,
        doubler: !!d.fxDemo?.enabledDefaults?.doubler,
        compressor: !!d.fxDemo?.enabledDefaults?.compressor,
      },
    },
    categories: arr(d.categories),
    interactions: {
      allowLikes: d.interactions?.allowLikes !== false, // default true
      allowComments: d.interactions?.allowComments !== false, // default true
      requireApproval: d.interactions?.requireApproval !== false, // default true (moderated)
    },
  }
}

export function makeDefaultMusicStudio() {
  return normalizeMusicStudio({
    intro: 'Producción, mezcla y masterización. Escucha la diferencia.',
    hero: {
      headline: 'Haz que tus canciones suenen profesionales',
      tagline: 'Mezcla y masterización con oído profesional.',
      ctaLabel: 'Contrátame en Fiverr',
      metrics: [],
    },
    interactions: { allowLikes: true, allowComments: true, requireApproval: true },
  })
}
