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
