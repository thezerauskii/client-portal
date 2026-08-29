/**
 * Shared payload validation for portal sticker API endpoints.
 * Pure functions — no dependencies, safe to import in serverless functions and tests.
 */

export const ID_PATTERN = /^[A-Za-z0-9_-]+$/
export const TELEGRAM_URL_PATTERN = /^https:\/\/([a-z0-9-]+\.)*telegram\.org\//i
export const STICKER_KEY_PATTERN = /^__sticker__[A-Za-z0-9_-]+$/

/**
 * Validate that a value is a non-empty ID string (alphanumeric + dash/underscore).
 * UUIDs pass (they contain dashes).
 */
export function isValidId(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 128 && ID_PATTERN.test(value)
}

/**
 * Validate a sticker payload from an untrusted client.
 * @returns {{ valid: true } | { valid: false, error: string }}
 */
export function validateStickerPayload(sticker) {
  if (!sticker || typeof sticker !== 'object') {
    return { valid: false, error: 'Invalid sticker payload' }
  }
  if (typeof sticker.file_unique_id !== 'string' || !ID_PATTERN.test(sticker.file_unique_id) || sticker.file_unique_id.length > 128) {
    return { valid: false, error: 'Invalid file_unique_id' }
  }
  if (sticker.file_id != null && (typeof sticker.file_id !== 'string' || sticker.file_id.length > 512)) {
    return { valid: false, error: 'Invalid file_id' }
  }
  if (sticker.emoji != null && (typeof sticker.emoji !== 'string' || sticker.emoji.length > 16)) {
    return { valid: false, error: 'Invalid emoji' }
  }
  if (sticker.thumbUrl != null && sticker.thumbUrl !== '') {
    if (typeof sticker.thumbUrl !== 'string' || !TELEGRAM_URL_PATTERN.test(sticker.thumbUrl) || sticker.thumbUrl.length > 1024) {
      return { valid: false, error: 'Invalid thumbUrl' }
    }
  }
  if (sticker.is_video != null && typeof sticker.is_video !== 'boolean') {
    return { valid: false, error: 'Invalid is_video' }
  }
  return { valid: true }
}

/**
 * Validate a stickerKey for the remove endpoint.
 */
export function isValidStickerKey(stickerKey) {
  return typeof stickerKey === 'string' && stickerKey.length <= 160 && STICKER_KEY_PATTERN.test(stickerKey)
}

// ─── Request submission validation ───────────────────────────────────────────
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Validate a commission request submission from the public portal.
 * `answers` is an object { fieldId: { label, value } }.
 * @returns {{ valid: true } | { valid: false, error: string }}
 */
export function validateRequestSubmission(body) {
  if (!body || typeof body !== 'object') return { valid: false, error: 'Invalid body' }
  if (!isValidId(body.artistId)) return { valid: false, error: 'Invalid artistId' }

  const name = body.name
  if (typeof name !== 'string' || name.trim().length < 1 || name.length > 100) {
    return { valid: false, error: 'Nombre inválido' }
  }

  const email = body.email
  if (typeof email !== 'string' || !EMAIL_PATTERN.test(email) || email.length > 200) {
    return { valid: false, error: 'Correo inválido' }
  }

  // description optional but bounded
  if (body.description != null && (typeof body.description !== 'string' || body.description.length > 5000)) {
    return { valid: false, error: 'Descripción demasiado larga' }
  }

  // answers: object with bounded size
  if (body.answers != null) {
    if (typeof body.answers !== 'object' || Array.isArray(body.answers)) {
      return { valid: false, error: 'Respuestas inválidas' }
    }
    const keys = Object.keys(body.answers)
    if (keys.length > 50) return { valid: false, error: 'Demasiadas respuestas' }
    for (const k of keys) {
      const entry = body.answers[k]
      if (!entry || typeof entry !== 'object') return { valid: false, error: 'Respuesta malformada' }
      const val = entry.value
      // value may be string, number, boolean, or array of strings
      if (Array.isArray(val)) {
        if (val.length > 30) return { valid: false, error: 'Demasiadas opciones' }
        if (val.some(v => typeof v !== 'string' || v.length > 500)) return { valid: false, error: 'Opción inválida' }
      } else if (val != null && !['string', 'number', 'boolean'].includes(typeof val)) {
        return { valid: false, error: 'Valor de respuesta inválido' }
      } else if (typeof val === 'string' && val.length > 5000) {
        return { valid: false, error: 'Respuesta demasiado larga' }
      }
    }
  }

  // images: array of https URLs, max 5
  if (body.images != null) {
    if (!Array.isArray(body.images) || body.images.length > 5) {
      return { valid: false, error: 'Demasiadas imágenes' }
    }
    for (const url of body.images) {
      if (typeof url !== 'string' || !/^https:\/\//.test(url) || url.length > 1024) {
        return { valid: false, error: 'URL de imagen inválida' }
      }
    }
  }

  return { valid: true }
}

/**
 * Validate an image upload payload (base64 data URL).
 * @returns {{ valid: true, mime, buffer } | { valid: false, error: string }}
 */
export function validateImageUpload(body) {
  if (!body || typeof body !== 'object') return { valid: false, error: 'Invalid body' }
  if (!isValidId(body.artistId)) return { valid: false, error: 'Invalid artistId' }

  const dataUrl = body.dataUrl
  if (typeof dataUrl !== 'string') return { valid: false, error: 'Missing image data' }

  const match = dataUrl.match(/^data:(image\/(png|jpeg|jpg|webp|gif));base64,([A-Za-z0-9+/=]+)$/)
  if (!match) return { valid: false, error: 'Formato de imagen no soportado' }

  const mime = match[1]
  const b64 = match[3]
  // Approx byte size from base64 length; cap at 5MB
  const approxBytes = Math.floor(b64.length * 0.75)
  if (approxBytes > 5 * 1024 * 1024) return { valid: false, error: 'Imagen demasiado grande (máx 5MB)' }

  return { valid: true, mime, base64: b64 }
}
