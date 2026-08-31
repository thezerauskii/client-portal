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

/**
 * Normalize the optional "vintage patchbay" block. Purely additive: if the
 * artist never touched it, everything defaults so the page behaves exactly like
 * before (enabled:false). Shared between the Electron editor and the portal.
 */
export function normalizePatchbay(p) {
  const d = (p && typeof p === 'object') ? p : {}
  const s = d.surfaces || {}
  const str = (v, def) => (typeof v === 'string' ? v : def)
  const bool = (v, def) => (typeof v === 'boolean' ? v : def)
  return {
    enabled: bool(d.enabled, false),           // false → página se ve como hoy
    bulbs: bool(d.bulbs, true),
    vuMeter: bool(d.vuMeter, true),
    vuStyle: (d.vuStyle === 'dotmatrix') ? 'dotmatrix' : 'needle',
    tapeReels: bool(d.tapeReels, true),
    woodTone: ['walnut', 'oak', 'dark'].includes(d.woodTone) ? d.woodTone : 'walnut',
    transportDisplay: bool(d.transportDisplay, true),
    contactStyle: (d.contactStyle === 'stickers') ? 'stickers' : 'patchbay',
    surfaces: {
      background: {
        texture: ['paper', 'wood', 'felt', 'concrete'].includes(s.background?.texture) ? s.background.texture : 'paper',
        tint: str(s.background?.tint, '#e8dcc0'),
      },
      panel: {
        texture: ['metal', 'wood', 'cream-plastic', 'bakelite'].includes(s.panel?.texture) ? s.panel.texture : 'metal',
        tint: str(s.panel?.tint, '#2b2b2e'),
      },
    },
  }
}

// ── Page structure (immersive layout, editable) ─────────────────────────────
/** Section ids the page knows how to render, in their natural order. */
export const PAGE_SECTION_IDS = ['hero', 'comparator', 'gigs', 'library', 'synth', 'setup', 'testimonials', 'contact']
/** Sections hidden by default (opt-in). */
const PAGE_SECTION_DEFAULT_HIDDEN = ['synth']

/**
 * Normalize `page.sections` into a stable, de-duplicated, fully-ordered list of
 * every known section id. Unknown ids are dropped; missing ids are appended in
 * their natural order. `order` is re-numbered 0..n so callers can sort safely.
 */
export function normalizeSections(input) {
  const arr = Array.isArray(input) ? input : []
  const byId = new Map()
  for (const s of arr) {
    if (!s || typeof s !== 'object') continue
    if (!PAGE_SECTION_IDS.includes(s.id)) continue
    if (byId.has(s.id)) continue
    byId.set(s.id, {
      id: s.id,
      visible: typeof s.visible === 'boolean' ? s.visible : !PAGE_SECTION_DEFAULT_HIDDEN.includes(s.id),
      order: typeof s.order === 'number' ? s.order : Number.MAX_SAFE_INTEGER,
    })
  }
  // Append any known section that wasn't provided, in natural order.
  PAGE_SECTION_IDS.forEach((id, i) => {
    if (!byId.has(id)) {
      byId.set(id, { id, visible: !PAGE_SECTION_DEFAULT_HIDDEN.includes(id), order: 1000 + i })
    }
  })
  // Sort by requested order (fallback natural order), then renumber 0..n.
  const natural = (id) => PAGE_SECTION_IDS.indexOf(id)
  return [...byId.values()]
    .sort((a, b) => (a.order - b.order) || (natural(a.id) - natural(b.id)))
    .map((s, i) => ({ id: s.id, visible: s.visible, order: i }))
}

/**
 * Normalize the optional `page` block (immersive layout + editable structure).
 * Purely additive: absent `page` → safe defaults so the page renders like today.
 */
export function normalizePage(p) {
  const d = (p && typeof p === 'object') ? p : {}
  const h = d.header || {}
  const sc = d.scroll || {}
  const str = (v, def = '') => (typeof v === 'string' ? v : def)
  const bool = (v, def) => (typeof v === 'boolean' ? v : def)
  return {
    header: {
      avatarUrl: str(h.avatarUrl),
      displayName: str(h.displayName),
      tagline: str(h.tagline),
      bio: str(h.bio),
      heroBgType: ['waveform', 'image', 'video'].includes(h.heroBgType) ? h.heroBgType : 'waveform',
      heroBgUrl: str(h.heroBgUrl),
      stickyTransport: bool(h.stickyTransport, true),
    },
    sections: normalizeSections(d.sections),
    scroll: {
      parallax: bool(sc.parallax, true),
      tapeProgress: bool(sc.tapeProgress, true),
      sectionReveal: bool(sc.sectionReveal, true),
      separators: ['tape', 'patchrail', 'screws', 'stitch', 'none'].includes(sc.separators) ? sc.separators : 'tape',
    },
  }
}

// ── Mini-synth presets (artist's saved sounds) ──────────────────────────────
const SYNTH_WAVEFORMS = ['sine', 'triangle', 'sawtooth', 'square']

/** Factory for a new synth preset with safe defaults. */
export function makeSynthPreset(name = 'Nuevo sonido') {
  return {
    id: makeId('syn'), name,
    osc: 'sawtooth', osc2: null,
    cutoff: 0.6, q: 0.2,
    attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.3,
    octave: 0,
  }
}

/** Clamp a numeric synth field to [min,max] with a default fallback. */
function clampNum(v, min, max, def) {
  const n = Number(v)
  if (!Number.isFinite(n)) return def
  return Math.max(min, Math.min(max, n))
}

/** Normalize a single preset to a safe shape. */
export function normalizeSynthPreset(p) {
  const d = (p && typeof p === 'object') ? p : {}
  const wf = (v, def) => (SYNTH_WAVEFORMS.includes(v) ? v : def)
  return {
    id: typeof d.id === 'string' && d.id ? d.id : makeId('syn'),
    name: typeof d.name === 'string' ? d.name : 'Sonido',
    osc: wf(d.osc, 'sawtooth'),
    osc2: d.osc2 == null ? null : wf(d.osc2, null),
    cutoff: clampNum(d.cutoff, 0, 1, 0.6),
    q: clampNum(d.q, 0, 1, 0.2),
    attack: clampNum(d.attack, 0.001, 3, 0.01),
    decay: clampNum(d.decay, 0.001, 3, 0.2),
    sustain: clampNum(d.sustain, 0, 1, 0.7),
    release: clampNum(d.release, 0.001, 5, 0.3),
    octave: Math.round(clampNum(d.octave, -2, 2, 0)),
  }
}

/**
 * Normalize the optional `synth` block (mini-synth section). Additive: absent
 * synth → empty presets, keysHint on. The section is opt-in via page.sections
 * (hidden by default), so this never changes existing pages.
 */
export function normalizeSynth(s) {
  const d = (s && typeof s === 'object') ? s : {}
  const presets = (Array.isArray(d.presets) ? d.presets : []).map(normalizeSynthPreset)
  const defaultPresetId = presets.some(p => p.id === d.defaultPresetId) ? d.defaultPresetId : (presets[0]?.id || '')
  return {
    presets,
    defaultPresetId,
    keysHint: typeof d.keysHint === 'boolean' ? d.keysHint : true,
  }
}

// ── Mesa de trabajo (workbench): módulos posicionables ──────────────────────
/** Tipos de módulo que la mesa de trabajo sabe renderizar. */
export const WORKBENCH_TYPES = ['cable', 'synth']

/**
 * Factory de un módulo nuevo. Posiciones relativas 0..1 sobre el tablero.
 *  - cable: dos extremos (endA, endB) que el artista coloca libremente.
 *  - synth: mini-Korg posicionable (x,y = esquina superior izquierda).
 */
export function makeWorkbenchModule(type = 'cable') {
  if (type === 'synth') {
    return { id: makeId('wb'), type: 'synth', x: 0.35, y: 0.4, octaves: 2 }
  }
  // cable por defecto
  return { id: makeId('wb'), type: 'cable', ax: 0.2, ay: 0.3, bx: 0.7, by: 0.6, color: 'auto' }
}

/** Normaliza un módulo a una forma segura (clamp de posiciones 0..1). */
export function normalizeWorkbenchModule(m) {
  const d = (m && typeof m === 'object') ? m : {}
  const type = WORKBENCH_TYPES.includes(d.type) ? d.type : 'cable'
  const id = (typeof d.id === 'string' && d.id) ? d.id : makeId('wb')
  const p = (v, def) => clampNum(v, 0, 1, def)
  if (type === 'synth') {
    return {
      id, type: 'synth',
      x: p(d.x, 0.35), y: p(d.y, 0.4),
      octaves: [1, 2, 3].includes(d.octaves) ? d.octaves : 2,
    }
  }
  return {
    id, type: 'cable',
    ax: p(d.ax, 0.2), ay: p(d.ay, 0.3),
    bx: p(d.bx, 0.7), by: p(d.by, 0.6),
    color: typeof d.color === 'string' ? d.color : 'auto',
  }
}

/**
 * Normaliza el bloque `workbench` (mesa de trabajo). Aditivo: ausente →
 * enabled:false + sin módulos, así la página se ve como hoy (cero regresión).
 * La mesa es opt-in; el artista la activa y coloca módulos en el editor.
 */
export function normalizeWorkbench(w) {
  const d = (w && typeof w === 'object') ? w : {}
  return {
    enabled: typeof d.enabled === 'boolean' ? d.enabled : false,
    modules: (Array.isArray(d.modules) ? d.modules : []).map(normalizeWorkbenchModule),
  }
}

// ── Constructor de página por MÓDULOS (canvas libre) ────────────────────────
/** Tipos de módulo del lienzo. */
export const MODULE_TYPES = [
  // contenido
  'hero-combo', 'text', 'image', 'metrics', 'services', 'skills', 'projects', 'list',
  'banner-cta', 'avatar', 'divider',
  // audio (envuelven componentes existentes)
  'comparator', 'library-track', 'fx-rack', 'synth', 'workbench', 'gig',
  'soundcloud', 'video', 'testimonial', 'socials',
  // Fase 14 — módulos interactivos vintage (diseño, no audio real)
  'icon-row', 'vinyl-player', 'reveal-slider', 'marquee-ticker', 'price-tiers',
  'faq-accordion', 'process-steps', 'countdown-offer', 'audio-cards', 'cta-banner-neon',
  // patchbay físico
  'cable', 'jack',
]

/** Tamaños/props por defecto por tipo (w,h en px lógicos). */
const MODULE_DEFAULTS = {
  'hero-combo': { w: 1104, h: 380, props: {
    headline: 'Haz que tus canciones suenen profesionales',
    tagline: 'Mezcla y masterización con oído profesional.',
    align: 'center',
    metrics: [{ value: '120+', label: 'Pistas mezcladas' }, { value: '★ 4.9', label: 'en Fiverr' }, { value: '48h', label: 'Entrega promedio' }],
    ctaLabel: 'Contrátame en Fiverr',
    ctaUrl: '',
  } },
  text: { w: 420, h: 120, props: { text: 'Texto', size: 'lg', weight: 700, color: 'ink', align: 'left' } },
  image: { w: 320, h: 240, props: { url: '', alt: '', fit: 'cover', radius: 12, shape: 'rect' } },
  metrics: { w: 460, h: 120, props: { items: [{ value: '10+', label: 'Proyectos' }], style: 'dial' } },
  services: { w: 720, h: 220, props: { items: [{ icon: 'waveform', title: 'Servicio', desc: '' }] } },
  skills: { w: 420, h: 200, props: { items: [{ label: 'Mezcla', pct: 90 }] } },
  projects: { w: 760, h: 260, props: { items: [{ imageUrl: '', title: 'Proyecto', subtitle: '', url: '' }] } },
  list: { w: 320, h: 200, props: { title: 'Lista', items: ['Ítem'] } },
  'banner-cta': { w: 760, h: 160, props: { text: '¿Listo para empezar?', buttonLabel: 'Contáctame', url: '' } },
  avatar: { w: 260, h: 120, props: { url: '', name: 'Nombre', role: '' } },
  divider: { w: 600, h: 24, props: { style: 'orange-rule' } },
  comparator: { w: 760, h: 460, props: {} },
  'library-track': { w: 560, h: 140, props: {} },
  'fx-rack': { w: 520, h: 220, props: {} },
  synth: { w: 520, h: 320, props: { octaves: 2 } },
  workbench: { w: 760, h: 480, props: {} },
  gig: { w: 300, h: 380, props: {} },
  soundcloud: { w: 360, h: 80, props: {} },
  video: { w: 560, h: 320, props: {} },
  testimonial: { w: 360, h: 180, props: {} },
  socials: { w: 480, h: 120, props: { style: 'patchbay' } },
  // ── Fase 14 — módulos interactivos vintage ──
  // Fila de iconos grandes (como en la primera imagen de referencia).
  'icon-row': { w: 1104, h: 180, props: {
    title: '',
    items: [
      { icon: 'vinyl', label: 'Producción' },
      { icon: 'sliders', label: 'Mezcla' },
      { icon: 'knob', label: 'Master' },
      { icon: 'mic', label: 'Grabación' },
      { icon: 'headphones', label: 'Escucha' },
    ],
  } },
  // Tocadiscos: la portada gira al pulsar (diseño, no audio real).
  'vinyl-player': { w: 360, h: 400, props: { coverUrl: '', title: 'Mi último single', subtitle: 'Escúchalo', url: '', autospin: false } },
  // Slider revelador: arrastra para descubrir la imagen "después".
  'reveal-slider': { w: 560, h: 360, props: { beforeUrl: '', afterUrl: '', label: 'Arrastra para revelar', labelBefore: 'Antes', labelAfter: 'Después' } },
  // Ticker marquesina: texto que se desplaza solo.
  'marquee-ticker': { w: 1104, h: 72, props: { text: 'MEZCLA · MASTER · PRODUCCIÓN · SOUND DESIGN', speed: 30, separator: '✦' } },
  // Tabla de precios (3 niveles) con hover glow.
  'price-tiers': { w: 1104, h: 420, props: { tiers: [
    { name: 'Básico', price: '30', period: '/track', features: ['Mezcla estéreo', '1 revisión', 'WAV'], ctaLabel: 'Elegir', url: '', featured: false },
    { name: 'Pro', price: '60', period: '/track', features: ['Mezcla + master', '2 revisiones', 'WAV + MP3'], ctaLabel: 'Elegir', url: '', featured: true },
    { name: 'Deluxe', price: '150', period: '/proyecto', features: ['Producción', 'Mezcla + master', '3 revisiones'], ctaLabel: 'Elegir', url: '', featured: false },
  ] } },
  // Acordeón de preguntas frecuentes.
  'faq-accordion': { w: 760, h: 340, props: { title: 'Preguntas frecuentes', items: [
    { q: '¿Cuánto tarda?', a: 'Entre 3 y 5 días según el paquete.' },
    { q: '¿Formatos de entrega?', a: 'WAV 24-bit y MP3 320. Stems opcionales.' },
    { q: '¿Cuántas revisiones?', a: 'Depende del paquete: de 1 a 3 revisiones.' },
  ] } },
  // Pasos del proceso (1→2→3→4) con línea que conecta.
  'process-steps': { w: 1104, h: 240, props: { steps: [
    { icon: 'mic', title: 'Envías', desc: 'Mándame tu pista o stems.' },
    { icon: 'sliders', title: 'Mezclo', desc: 'Balance, espacio y color.' },
    { icon: 'knob', title: 'Masterizo', desc: 'Volumen competitivo.' },
    { icon: 'disc', title: 'Recibes', desc: 'Listo para publicar.' },
  ] } },
  // Cuenta atrás de oferta (urgencia → CTA).
  'countdown-offer': { w: 760, h: 200, props: { deadline: '', text: 'Oferta por tiempo limitado', buttonLabel: 'Aprovechar', url: '', expiredText: 'La oferta terminó' } },
  // Tarjetas de audio (portada + título + botón play decorativo).
  'audio-cards': { w: 1104, h: 320, props: { title: 'Escucha mi trabajo', items: [
    { coverUrl: '', title: 'Track 1', subtitle: 'Master', url: '' },
    { coverUrl: '', title: 'Track 2', subtitle: 'Mezcla', url: '' },
    { coverUrl: '', title: 'Track 3', subtitle: 'Producción', url: '' },
  ] } },
  // Banner CTA con glow neón pulsante.
  'cta-banner-neon': { w: 1104, h: 200, props: { text: '¿LISTO PARA SONAR PRO?', buttonLabel: 'Contrátame ahora', url: '', color: 'amber' } },
  cable: { w: 0, h: 0, props: { ax: 0.2, ay: 0.3, bx: 0.7, by: 0.5, endAJack: null, endBJack: null } },
  jack: { w: 40, h: 40, props: { label: '' } },
}

/** Factory de un módulo nuevo colocado en (x,y). */
export function makeModule(type = 'text', x = 40, y = 40) {
  const t = MODULE_TYPES.includes(type) ? type : 'text'
  const def = MODULE_DEFAULTS[t] || MODULE_DEFAULTS.text
  return {
    id: makeId('mod'), type: t,
    x, y, w: def.w, h: def.h, z: 1, rotation: 0,
    props: JSON.parse(JSON.stringify(def.props)),
    dataRef: null,
  }
}

/** Normaliza un módulo a forma segura. Permite x/y fuera de la caja (canvas libre). */
export function normalizeModule(m) {
  const d = (m && typeof m === 'object') ? m : {}
  const type = MODULE_TYPES.includes(d.type) ? d.type : null
  if (!type) return null // tipo desconocido → se descarta en normalizeLayout
  const def = MODULE_DEFAULTS[type] || MODULE_DEFAULTS.text
  const num = (v, dflt) => (Number.isFinite(Number(v)) ? Number(v) : dflt)
  return {
    id: (typeof d.id === 'string' && d.id) ? d.id : makeId('mod'),
    type,
    x: num(d.x, 40),
    y: num(d.y, 40),
    w: Math.max(24, num(d.w, def.w)),
    h: Math.max(16, num(d.h, def.h)),
    z: Math.round(num(d.z, 1)),
    rotation: num(d.rotation, 0),
    props: (d.props && typeof d.props === 'object') ? { ...def.props, ...d.props } : JSON.parse(JSON.stringify(def.props)),
    dataRef: (typeof d.dataRef === 'string' && d.dataRef) ? d.dataRef : null,
  }
}

const CANVAS_BG = ['river-styx', 'carbon', 'tea', 'wood']

/**
 * Normaliza el bloque `layout` (constructor de módulos). Aditivo: ausente →
 * enabled:false + sin módulos → la página se renderiza en modo clásico.
 */
export function normalizeLayout(l) {
  const d = (l && typeof l === 'object') ? l : {}
  const c = d.canvas || {}
  const num = (v, dflt) => (Number.isFinite(Number(v)) ? Number(v) : dflt)
  return {
    enabled: typeof d.enabled === 'boolean' ? d.enabled : false,
    // Modo de composición: 'free' = lienzo libre (x,y), 'stack' = apilado vertical
    // por orden (el artista decide qué va primero). Default 'free'.
    mode: (d.mode === 'stack' || d.mode === 'free') ? d.mode : 'free',
    canvas: {
      width: Math.max(320, Math.min(3000, num(c.width, 1200))),
      height: Math.max(0, Math.min(20000, num(c.height, 0))), // 0 = auto (por contenido)
      grid: Math.max(8, Math.min(80, num(c.grid, 24))),
      snap: typeof c.snap === 'boolean' ? c.snap : true,
      showGrid: typeof c.showGrid === 'boolean' ? c.showGrid : false,
      bg: CANVAS_BG.includes(c.bg) ? c.bg : 'river-styx',
    },
    modules: (Array.isArray(d.modules) ? d.modules : []).map(normalizeModule).filter(Boolean),
  }
}

// ── Geometría pura del lienzo (testeable) ────────────────────────────────────
/** Redondea un valor al múltiplo de grid más cercano. */
export function snapToGrid(v, grid) {
  const g = Math.max(1, Number(grid) || 1)
  return Math.round((Number(v) || 0) / g) * g
}

/**
 * Nueva posición del módulo tras arrastrar (dx,dy). Permite salir de la caja,
 * pero con límites sanos (no perder el módulo demasiado lejos). snap opcional.
 */
export function moveModule(mod, dx, dy, { grid = 24, snap = false, canvasWidth = 1200 } = {}) {
  let x = (mod.x || 0) + dx
  let y = (mod.y || 0) + dy
  if (snap) { x = snapToGrid(x, grid); y = snapToGrid(y, grid) }
  // límites sanos: puede salirse, pero no más de un módulo de ancho fuera.
  const minX = -(mod.w || 0), maxX = canvasWidth + (mod.w || 0)
  x = Math.max(minX, Math.min(maxX, x))
  y = Math.max(-(mod.h || 0), y)
  return { ...mod, x, y }
}

/** Redimensiona con mínimos por tipo. snap opcional. */
export function resizeModule(mod, w, h, { grid = 24, snap = false } = {}) {
  let nw = Math.max(24, Number(w) || mod.w)
  let nh = Math.max(16, Number(h) || mod.h)
  if (snap) { nw = snapToGrid(nw, grid); nh = snapToGrid(nh, grid) }
  return { ...mod, w: nw, h: nh }
}

/** Tipos que NO ocupan caja rectangular (se excluyen de la detección de solapes). */
const NON_BOX_TYPES = new Set(['cable', 'jack'])

/** ¿Dos rectángulos {x,y,w,h} se intersectan? (bordes que se tocan NO cuentan). */
export function rectsOverlap(a, b, tolerance = 0) {
  const ax2 = a.x + a.w, ay2 = a.y + a.h
  const bx2 = b.x + b.w, by2 = b.y + b.h
  // Separados si uno está completamente a un lado del otro (con tolerancia).
  if (ax2 - tolerance <= b.x) return false
  if (bx2 - tolerance <= a.x) return false
  if (ay2 - tolerance <= b.y) return false
  if (by2 - tolerance <= a.y) return false
  return true
}

/**
 * layoutHasOverlaps(modules) — función pura y testeable. Devuelve la lista de
 * pares [i, j] de módulos cuyas cajas se solapan (ignora cable/jack que no son
 * cajas). `tolerance` permite considerar “no solape” a bordes que se tocan por
 * <= tolerance px (útil por redondeos de snap). Devuelve [] si no hay solapes.
 */
export function layoutOverlaps(modules, { tolerance = 1 } = {}) {
  const boxes = (Array.isArray(modules) ? modules : [])
    .map((m, idx) => ({ idx, m }))
    .filter(({ m }) => m && !NON_BOX_TYPES.has(m.type) && m.w > 0 && m.h > 0)
  const pairs = []
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (rectsOverlap(boxes[i].m, boxes[j].m, tolerance)) {
        pairs.push([boxes[i].idx, boxes[j].idx])
      }
    }
  }
  return pairs
}

/** ¿El layout tiene algún solape entre módulos-caja? (boolean de conveniencia). */
export function layoutHasOverlaps(modules, opts) {
  return layoutOverlaps(modules, opts).length > 0
}

/**
 * makeExampleLayout — un layout de DEMOSTRACIÓN listo para mostrar (modo libre),
 * inspirado en un portfolio (hero + avatar + métricas + servicios + skills +
 * proyectos + banner CTA + comparador + testimonio + redes). Referencia dataRef
 * a los primeros elementos existentes (comparador/testimonio) cuando aplica.
 * enabled:true para que se vea de inmediato. Puro y testeable.
 */
export function makeExampleLayout(assets = {}) {
  // `assets` opcional: { header, project1, project2, avatar, vinyl, revealBefore,
  // revealAfter, card1, card2, card3 } con URLs de R2 (las sube el botón
  // "Cargar ejemplo con imágenes"). Si no hay, quedan vacías.
  //
  // Layout en flujo VERTICAL sin solapes: mantengo un cursor `y` y coloco cada
  // bloque debajo del anterior. Las filas de columnas comparten `y` pero nunca
  // se solapan en x. GAP entre bloques = 32px.
  const PAD = 48
  const COL = 1104 // 1200 - PAD*2
  const GAP = 32
  const mods = []
  let y = 32
  let z = 1
  // Bloque a ancho completo.
  const full = (type, h, extra = {}) => {
    mods.push({ ...makeModule(type, PAD, y), w: COL, h, z: z++, ...extra })
    y += h + GAP
  }
  // Fila de columnas [{type,w,h,extra}]. Avanza `y` por la más alta.
  const row = (cols, { gap = 24 } = {}) => {
    let x = PAD
    let maxH = 0
    for (const c of cols) {
      mods.push({ ...makeModule(c.type, x, y), w: c.w, h: c.h, z: z++, ...(c.extra || {}) })
      x += c.w + gap
      if (c.h > maxH) maxH = c.h
    }
    y += maxH + GAP
  }

  // ── Cabecera (imagen alargada editable con crop) ──
  full('image', 300, { props: { url: assets.header || '', alt: 'Header', fit: 'cover', shape: 'rect', radius: 16 } })
  // Hero combinado.
  full('hero-combo', 280, { props: {
    headline: 'Muevo ideas con sonido', tagline: 'Mezcla y masterización con oído profesional.', align: 'center',
    metrics: [{ value: '8+', label: 'Años' }, { value: '120+', label: 'Proyectos' }, { value: '★ 4.9', label: 'Rating' }],
    ctaLabel: 'Contrátame en Fiverr', ctaUrl: '',
  } })
  // Ticker que se mueve solo (recuerda al VU / cinta rodando).
  full('marquee-ticker', 72, { props: { text: 'MEZCLA · MASTER · PRODUCCIÓN · SOUND DESIGN', speed: 26, separator: '✦' } })
  // Fila de iconos grandes (la "primera imagen" de referencia).
  full('icon-row', 180, { props: { title: 'Lo que hago', items: [
    { icon: 'vinyl', label: 'Producción' },
    { icon: 'sliders', label: 'Mezcla' },
    { icon: 'knob', label: 'Master' },
    { icon: 'mic', label: 'Grabación' },
    { icon: 'headphones', label: 'Escucha' },
  ] } })
  full('divider', 24, { props: { style: 'orange-rule' } })

  // ── Servicios (ancho completo) ──
  full('services', 200, { props: { items: [
    { icon: 'waveform', title: 'Mezcla', desc: 'Balance, espacio y claridad.' },
    { icon: 'knob', title: 'Master', desc: 'Volumen competitivo y pegada.' },
    { icon: 'note', title: 'Producción', desc: 'De la idea al track final.' },
  ] } })

  // ── Pasos del proceso (animación de conexión) ──
  full('process-steps', 240, {})

  // ── Skills (ancho completo) ──
  full('skills', 200, { props: { items: [
    { label: 'Mezcla', pct: 92 }, { label: 'Master', pct: 88 }, { label: 'Sound design', pct: 80 },
  ] } })
  // ── Comparador = consola vintage a ANCHO COMPLETO (VU + racks + transporte).
  // Necesita todo el ancho: con racks laterales, si es angosto se recorta.
  full('comparator', 560, { dataRef: null })

  // ── Reveal slider (arrastra para revelar) a ancho medio + vinilo ──
  row([
    { type: 'reveal-slider', w: 704, h: 360, extra: { props: {
      beforeUrl: assets.revealBefore || '', afterUrl: assets.revealAfter || '',
      label: 'Arrastra para revelar', labelBefore: 'Demo', labelAfter: 'Master',
    } } },
    { type: 'vinyl-player', w: 376, h: 360, extra: { props: {
      coverUrl: assets.vinyl || '', title: 'Último single', subtitle: 'Pulsa para girar', url: '', autospin: false,
    } } },
  ])

  // ── Prueba de efectos + mini-Korg ──
  row([
    { type: 'fx-rack', w: 540, h: 340 },
    { type: 'synth', w: 540, h: 340, extra: { props: { octaves: 2 } } },
  ])

  // ── Tarjetas de audio (portadas + play decorativo) ──
  full('audio-cards', 320, { props: { title: 'Escucha mi trabajo', items: [
    { coverUrl: assets.card1 || '', title: 'EP — Neon', subtitle: 'Mezcla + master', url: '' },
    { coverUrl: assets.card2 || '', title: 'Single — Río', subtitle: 'Master', url: '' },
    { coverUrl: assets.card3 || '', title: 'Beat — Lo-fi', subtitle: 'Producción', url: '' },
  ] } })

  // ── Proyectos (izq) + paquete/gig (der) ──
  row([
    { type: 'projects', w: 704, h: 420, extra: { props: { items: [
      { imageUrl: assets.project1 || '', title: 'EP — Neon', subtitle: 'Mezcla + master', url: '' },
      { imageUrl: assets.project2 || '', title: 'Single — Río', subtitle: 'Master', url: '' },
    ] } } },
    { type: 'gig', w: 376, h: 420, extra: { dataRef: null } },
  ])
  row([
    { type: 'video', w: 704, h: 320 },
    { type: 'soundcloud', w: 376, h: 80 },
  ])

  // ── Precios (3 niveles con hover glow) ──
  full('price-tiers', 420, {})

  // ── FAQ (izq) + testimonio (der) ──
  row([
    { type: 'faq-accordion', w: 704, h: 340 },
    { type: 'testimonial', w: 376, h: 340, extra: { dataRef: null } },
  ])

  // ── Cuenta atrás de oferta ──
  full('countdown-offer', 200, { props: { text: 'Oferta de lanzamiento', buttonLabel: 'Aprovechar', url: '' } })

  // ── Redes (espejo del editor) ──
  full('socials', 150, { props: { style: 'patchbay' } })

  // ── CTA final con glow neón ──
  full('cta-banner-neon', 200, { props: { text: '¿LISTO PARA SONAR PRO?', buttonLabel: 'Contrátame en Fiverr', url: '', color: 'amber' } })

  const height = Math.ceil((y + 40) / 24) * 24 // margen inferior, múltiplo de grid
  return normalizeLayout({
    enabled: true,
    mode: 'free',
    canvas: { width: 1200, height, grid: 24, snap: true, showGrid: true, bg: 'river-styx' },
    modules: mods,
  })
}

/**
 * layoutFromStudio(studio) — "Importar diseño actual": convierte los datos ya
 * existentes de music_studio (hero, comparisons, gigs, library, testimonials,
 * synth, fxDemo, soundcloud, video, tools) en un LAYOUT de módulos posicionados
 * en una columna (modo libre), con estilo vintage. Cada elemento de colección
 * (comparación, gig, pista, testimonio) se vuelve su propio módulo con `dataRef`
 * al id original, para que el panel siga editando el dato real. Puro/testeable.
 */
export function layoutFromStudio(studio) {
  const s = normalizeMusicStudio(studio || {})
  const W = 1200
  const PAD = 48
  const COL = W - PAD * 2 // ancho de columna útil
  const mods = []
  let y = 40
  let z = 1
  const push = (type, h, extra = {}, w = COL, x = PAD) => {
    const m = makeModule(type, x, y)
    m.w = w; m.h = h; m.z = z++
    if (extra.props) m.props = { ...m.props, ...extra.props }
    if (extra.dataRef) m.dataRef = extra.dataRef
    mods.push(m)
    y += h + 32
    return m
  }

  // HERO combinado (título + tagline + métricas + CTA) desde el hero actual.
  push('hero-combo', 300, { props: {
    headline: s.hero?.headline || 'Tu título aquí',
    tagline: s.hero?.tagline || '',
    align: 'center',
    metrics: (s.hero?.metrics || []).map(m => ({ value: m.value, label: m.label })),
    ctaLabel: s.hero?.ctaLabel || 'Contrátame en Fiverr',
    ctaUrl: s.hero?.fiverrUrl || '',
  } })
  push('divider', 24, { props: { style: 'orange-rule' } })

  // COMPARADORES (cada comparison → un módulo comparator con dataRef).
  for (const c of (s.comparisons || [])) {
    push('comparator', 460, { dataRef: c.id })
  }

  // GIGS (cada gig → un módulo gig con dataRef; en filas de a 3).
  const gigs = s.gigs || []
  if (gigs.length) {
    const gw = Math.floor((COL - 24 * 2) / 3)
    const rowH = 380
    gigs.forEach((g, i) => {
      const col = i % 3
      const row = Math.floor(i / 3)
      const m = makeModule('gig', PAD + col * (gw + 24), y + row * (rowH + 24))
      m.w = gw; m.h = rowH; m.z = z++; m.dataRef = g.id
      mods.push(m)
    })
    // Avanzar y por debajo de la última fila.
    y = mods.filter(x => x.type === 'gig').reduce((mx, x) => Math.max(mx, x.y + x.h), 0) + 32
  }

  // LIBRERÍA (cada pista → un módulo library-track con dataRef).
  for (const t of (s.library || [])) {
    push('library-track', 140, { dataRef: t.id })
  }

  // FX demo (si hay audio).
  if (s.fxDemo?.audio?.url) push('fx-rack', 220, {})

  // SoundCloud / Video (si están configurados).
  if (s.soundcloudUser) push('soundcloud', 80, {})
  if (s.videoDemoUrl) push('video', 320, {})

  // SYNTH (si hay presets).
  if ((s.synth?.presets || []).length) push('synth', 320, { props: { octaves: 2 } })

  // TESTIMONIOS (cada uno → módulo testimonial con dataRef).
  for (const t of (s.testimonials || [])) {
    push('testimonial', 180, { dataRef: t.id })
  }

  // REDES.
  push('socials', 130, { props: { style: s.patchbay?.contactStyle || 'patchbay' } })

  // BANNER CTA final.
  push('banner-cta', 160, { props: {
    text: '¿Listo para empezar?',
    buttonLabel: s.hero?.ctaLabel || 'Contrátame en Fiverr',
    url: s.hero?.fiverrUrl || '',
  } })

  return normalizeLayout({
    enabled: true,
    mode: 'free',
    canvas: { width: W, grid: 24, snap: true, bg: 'river-styx' },
    modules: mods,
  })
}

/** Conecta un extremo del cable (endA|endB) a un jack, o lo desconecta (jackId=null). */
export function plugConnect(cableMod, end, jackId) {
  const key = end === 'B' ? 'endBJack' : 'endAJack'
  return { ...cableMod, props: { ...(cableMod.props || {}), [key]: jackId || null } }
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
    theme: d.theme || 'studio', // 'studio' | 'synth-analog' | 'vintage-console'
    patchbay: normalizePatchbay(d.patchbay),
    page: normalizePage(d.page),
    synth: normalizeSynth(d.synth),
    workbench: normalizeWorkbench(d.workbench),
    layout: normalizeLayout(d.layout),
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

/** Example gigs so the preview is never empty (placeholders the artist edits). */
export function makeExampleGigs() {
  return [
    { ...makeGig('basic'), title: 'Mezcla básica', description: 'Balance, EQ y dinámica de tu pista.', price: '30', deliveryDays: '3', revisions: '1', includes: ['Mezcla estéreo', '1 revisión', 'Entrega WAV'], sortOrder: 0 },
    { ...makeGig('standard'), title: 'Mezcla + Master', description: 'Mezcla profesional y masterización lista para plataformas.', price: '60', deliveryDays: '5', revisions: '2', includes: ['Mezcla + master', '2 revisiones', 'WAV + MP3', 'Stems opcionales'], sortOrder: 1 },
    { ...makeGig('pro'), title: 'Producción completa', description: 'De la idea a la entrega: producción, mezcla y master.', price: '150', deliveryDays: '10', revisions: '3', includes: ['Producción', 'Mezcla + master', '3 revisiones', 'Sesión de stems'], sortOrder: 2 },
  ]
}

export function makeDefaultMusicStudio() {
  return normalizeMusicStudio({
    intro: 'Producción, mezcla y masterización. Escucha la diferencia.',
    hero: {
      headline: 'Haz que tus canciones suenen profesionales',
      tagline: 'Mezcla y masterización con oído profesional.',
      ctaLabel: 'Contrátame en Fiverr',
      metrics: [
        { value: '120+', label: 'Pistas mezcladas' },
        { value: '★ 4.9', label: 'en Fiverr' },
        { value: '48h', label: 'Entrega promedio' },
      ],
    },
    gigs: makeExampleGigs(),
    testimonials: [
      { ...makeTestimonial(), author: 'Cliente satisfecho', text: 'Mi track sonó como en la radio. Volveré.', rating: 5 },
    ],
    interactions: { allowLikes: true, allowComments: true, requireApproval: true },
  })
}

/**
 * Example content for the READ-ONLY portal preview. Lets the portal render the
 * full page structure (comparator/library/tools/soundcloud) with placeholders
 * when the artist hasn't filled data yet. Blocks are tagged `__example: true`
 * so the portal can badge them and skip real interactions. No real audio/media
 * (those sections need actual files) — only structure + copy.
 */
export function makeExamplePreview() {
  return {
    comparisons: [
      { ...makeComparison(), title: 'Antes / Después (ejemplo)', genre: 'Pop', labelA: 'Original', labelB: 'Master', __example: true },
    ],
    library: [
      { ...makeLibraryTrack(), title: 'Mi último master (ejemplo)', category: 'Pop', description: 'Así se verá cada pista tuya, con su forma de onda.', __example: true },
      { ...makeLibraryTrack(), title: 'Beat lo-fi (ejemplo)', category: 'Lo-fi', __example: true },
    ],
    tools: [
      { ...makeTool(), name: 'FabFilter Pro-Q 3', category: 'EQ', note: 'Ecualización quirúrgica', __example: true },
      { ...makeTool(), name: 'Valhalla VintageVerb', category: 'Reverb', note: 'Ambiente y profundidad', __example: true },
      { ...makeTool(), name: 'Ableton Live', category: 'DAW', __example: true },
    ],
    soundcloudUser: 'tu-usuario',
  }
}
