/**
 * Shared domain: Request form builder definitions.
 *
 * The field type catalog + default form template, shared between the Electron
 * builder and the portal public renderer so both agree on the schema.
 *
 * Pure data/functions — no imports.
 */

/** Field types available in the form builder, with a short description shown
 *  on hover in the "add question" gallery. */
export const FIELD_TYPES = [
  { type: 'short_text', label: 'Texto corto', desc: 'Una línea de texto (nombre, usuario, etc.)' },
  { type: 'long_text', label: 'Texto largo', desc: 'Párrafo largo para descripciones detalladas' },
  { type: 'email', label: 'Email', desc: 'Correo electrónico con validación automática' },
  { type: 'radio', label: 'Opción única', desc: 'El cliente elige UNA opción de una lista' },
  { type: 'checkbox', label: 'Opción múltiple', desc: 'El cliente elige VARIAS opciones (ideal para temas)' },
  { type: 'select', label: 'Desplegable', desc: 'Lista desplegable para elegir una opción' },
  { type: 'budget', label: 'Presupuesto', desc: 'Rango de presupuesto mínimo y máximo' },
  { type: 'date', label: 'Fecha / deadline', desc: 'Selector de fecha límite' },
  { type: 'image_upload', label: 'Imágenes', desc: 'El cliente sube imágenes de referencia' },
  { type: 'section', label: 'Sección', desc: 'Título para separar y organizar preguntas' },
]

/** Types that require an options list. */
export const OPTION_TYPES = new Set(['radio', 'checkbox', 'select'])

/** System field keys that map to native commission_requests columns. */
export const SYSTEM_KEYS = new Set(['name', 'email', 'description', 'budget', 'deadline', 'images'])

/**
 * Predefined furry/NSFW theme library — the artist toggles which ones to offer
 * as options in a field, and can also add custom ones.
 * These are just suggested option strings.
 */
export const FURRY_THEME_LIBRARY = [
  'SFW / General',
  'Suggestive',
  'NSFW explícito',
  'Vore',
  'Macro / Micro',
  'Giantess / Giant',
  'Transformación (TF)',
  'Inflación',
  'Musculoso / Muscle',
  'Feral',
  'Anthro',
  'Fat / Chubby',
  'Hyper',
  'Bondage',
  'Latex',
  'Fetiche de patas',
  'Diaper / ABDL',
  'Gore',
  'Wholesome / Comfy',
]

/**
 * Default form template shown to a new artist (and used by the portal when the
 * artist hasn't configured a form yet). NSFW-aware (age confirmation).
 * Fields are grouped into pages via `pageIndex`.
 */
export function makeDefaultForm() {
  return {
    title: 'Solicita tu comisión',
    description: 'Llena este formulario con los detalles de tu comisión y te responderé pronto.',
    headerImage: '',            // URL of a decorative PNG banner shown at the top
    status: 'open',             // open | waitlist | closed
    statusMessage: '',
    requireTos: true,
    requireAge: true,
    pages: ['Información', 'Detalles', 'Referencias'],   // step labels
    fields: [
      { id: 'f_name', type: 'short_text', label: 'Tu nombre', required: true, system: 'name', options: [], pageIndex: 0 },
      { id: 'f_email', type: 'email', label: 'Tu correo electrónico', required: true, system: 'email', options: [], pageIndex: 0 },
      { id: 'f_social', type: 'short_text', label: 'Redes sociales (opcional)', required: false, options: [], pageIndex: 0 },
      { id: 'f_type', type: 'select', label: 'Tipo de comisión', required: true, options: ['Busto', 'Medio cuerpo', 'Cuerpo completo', 'Ref sheet', 'Otro'], pageIndex: 1 },
      { id: 'f_theme', type: 'checkbox', label: 'Temática', required: false, options: ['SFW / General', 'NSFW explícito', 'Anthro', 'Feral'], pageIndex: 1 },
      { id: 'f_desc', type: 'long_text', label: 'Describe tu idea', help: 'Personaje, pose, ambientación, detalles importantes', required: true, system: 'description', options: [], pageIndex: 1 },
      { id: 'f_budget', type: 'budget', label: 'Presupuesto (USD)', required: false, system: 'budget', options: [], pageIndex: 1 },
      { id: 'f_deadline', type: 'date', label: '¿Tienes una fecha límite?', required: false, system: 'deadline', options: [], pageIndex: 1 },
      { id: 'f_refs', type: 'image_upload', label: 'Imágenes de referencia', help: 'Sube hasta 5 imágenes', required: false, system: 'images', options: [], pageIndex: 2 },
    ],
  }
}

/** Generate a new empty field of a given type on a given page. */
export function makeField(type, pageIndex = 0) {
  const id = 'f_' + Math.random().toString(36).slice(2, 9)
  return {
    id,
    type,
    label: '',
    help: '',
    required: false,
    options: OPTION_TYPES.has(type) ? ['Opción 1'] : [],
    pageIndex,
  }
}

/** Normalize a form: ensure pages array + every field has a valid pageIndex. */
export function normalizeForm(form) {
  if (!form || !Array.isArray(form.fields)) return makeDefaultForm()
  const pages = Array.isArray(form.pages) && form.pages.length > 0 ? form.pages : ['Formulario']
  const fields = form.fields.map(f => ({
    ...f,
    pageIndex: typeof f.pageIndex === 'number' && f.pageIndex < pages.length ? f.pageIndex : 0,
  }))
  return { ...form, pages, fields }
}

/** Get the fields belonging to a given page index. */
export function fieldsForPage(form, pageIndex) {
  return (form.fields || []).filter(f => (f.pageIndex ?? 0) === pageIndex)
}

/** Validate a filled answer against a field. Returns error string or null. */
export function validateAnswer(field, value) {
  if (field.type === 'section') return null
  const empty = value == null || value === '' || (Array.isArray(value) && value.length === 0)
  if (field.required && empty) return 'Este campo es obligatorio'
  if (field.type === 'email' && value) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Correo inválido'
  }
  return null
}
