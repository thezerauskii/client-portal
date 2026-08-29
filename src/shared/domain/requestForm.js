/**
 * Shared domain: Request form builder definitions.
 *
 * The field type catalog + default form template, shared between the Electron
 * builder and the portal public renderer so both agree on the schema.
 *
 * Pure data/functions — no imports.
 */

/** Field types available in the form builder. */
export const FIELD_TYPES = [
  { type: 'short_text', label: 'Texto corto' },
  { type: 'long_text', label: 'Texto largo' },
  { type: 'email', label: 'Email' },
  { type: 'radio', label: 'Opción única' },
  { type: 'checkbox', label: 'Opción múltiple' },
  { type: 'select', label: 'Desplegable' },
  { type: 'budget', label: 'Presupuesto (rango)' },
  { type: 'date', label: 'Fecha / deadline' },
  { type: 'image_upload', label: 'Subir imágenes de referencia' },
  { type: 'section', label: 'Encabezado de sección' },
]

/** Types that require an options list. */
export const OPTION_TYPES = new Set(['radio', 'checkbox', 'select'])

/** System field keys that map to native commission_requests columns. */
export const SYSTEM_KEYS = new Set(['name', 'email', 'description', 'budget', 'deadline', 'images'])

/**
 * Default form template shown to a new artist (and used by the portal when the
 * artist hasn't configured a form yet). NSFW-aware (age confirmation).
 */
export function makeDefaultForm() {
  return {
    title: 'Solicita tu comisión',
    description: 'Llena este formulario con los detalles de tu comisión y te responderé pronto.',
    status: 'open', // open | waitlist | closed
    statusMessage: '',
    requireTos: true,
    requireAge: true,
    fields: [
      { id: 'f_name', type: 'short_text', label: 'Tu nombre', required: true, system: 'name', options: [] },
      { id: 'f_email', type: 'email', label: 'Tu correo electrónico', required: true, system: 'email', options: [] },
      { id: 'f_social', type: 'short_text', label: 'Redes sociales (opcional)', required: false, options: [] },
      { id: 'f_type', type: 'select', label: 'Tipo de comisión', required: true, options: ['Busto', 'Medio cuerpo', 'Cuerpo completo', 'Ref sheet', 'Otro'] },
      { id: 'f_desc', type: 'long_text', label: 'Describe tu idea', help: 'Personaje, pose, ambientación, detalles importantes', required: true, system: 'description', options: [] },
      { id: 'f_refs', type: 'image_upload', label: 'Imágenes de referencia', help: 'Sube hasta 5 imágenes', required: false, system: 'images', options: [] },
      { id: 'f_budget', type: 'budget', label: 'Presupuesto (USD)', required: false, system: 'budget', options: [] },
      { id: 'f_deadline', type: 'date', label: '¿Tienes una fecha límite?', required: false, system: 'deadline', options: [] },
    ],
  }
}

/** Generate a new empty field of a given type. */
export function makeField(type) {
  const id = 'f_' + Math.random().toString(36).slice(2, 9)
  return {
    id,
    type,
    label: '',
    help: '',
    required: false,
    options: OPTION_TYPES.has(type) ? ['Opción 1'] : [],
  }
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
