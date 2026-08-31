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
  'text', 'image', 'metrics', 'services', 'skills', 'projects', 'list',
  'banner-cta', 'avatar', 'divider',
  // audio (envuelven componentes existentes)
  'comparator', 'library-track', 'fx-rack', 'synth', 'workbench', 'gig',
  'soundcloud', 'video', 'testimonial', 'socials',
  // patchbay físico
  'cable', 'jack',
]

/** Tamaños/props por defecto por tipo (w,h en px lógicos). */
const MODULE_DEFAULTS = {
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
      grid: Math.max(8, Math.min(80, num(c.grid, 24))),
      snap: typeof c.snap === 'boolean' ? c.snap : true,
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
