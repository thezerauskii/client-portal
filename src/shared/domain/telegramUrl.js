/**
 * Shared domain: Telegram sticker set URL parsing.
 *
 * Extracts the set name from a raw input that may be either a bare set name
 * or a full Telegram share URL (https://t.me/addstickers/SetName).
 *
 * Used by: Electron StickerPanel, Portal useStickerProxy.
 * Pure function — no imports.
 */

/**
 * Parse a sticker set name from user input.
 * @param {string} input — bare name or a t.me/addstickers URL
 * @returns {string} the extracted set name (trimmed)
 */
export function parseStickerSetName(input) {
  const trimmed = (input || '').trim()
  const urlMatch = trimmed.match(/(?:t\.me\/addstickers\/)([A-Za-z0-9_]+)/)
  return urlMatch ? urlMatch[1] : trimmed
}
