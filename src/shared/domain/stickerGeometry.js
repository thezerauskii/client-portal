/**
 * Shared domain: sticker geometry calculations.
 *
 * These functions define how stickers are positioned and rotated on cards.
 * Used by: Electron StickerOverlay, Portal PortalStickerOverlay, API place-sticker.
 *
 * MUST produce identical results in all consumers — any change here is reflected
 * in both apps and the API simultaneously.
 *
 * Pure functions — no imports, no side effects.
 */

/**
 * DJB2 hash of a string → positive integer.
 * Used for deterministic sticker positions from their unique key.
 */
export function hashStr(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/**
 * Default rotation in degrees for a sticker chip.
 * Range: -11 to +10 degrees.
 */
export function defaultRot(key) {
  return (hashStr(key) % 22) - 11
}

/**
 * Default x/y percentage position for a sticker placed without explicit coords.
 * @param {string} key — the sticker key (e.g. '__sticker__AgAD123')
 * @returns {{ x: number, y: number }} — percent of container
 */
export function defaultStickerPosition(key) {
  const hash = hashStr(key)
  return {
    x: 5 + (hash % 60),
    y: 5 + ((hash * 7) % 55),
  }
}
