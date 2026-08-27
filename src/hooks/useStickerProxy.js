/**
 * useStickerProxy — Hook que encapsula las llamadas al proxy de Telegram
 * y a las Edge Functions de place/remove sticker.
 *
 * Cache en memoria (Map) para evitar llamadas duplicadas en la misma sesión.
 */

import { useState, useCallback, useRef } from 'react'

// ── Base URL for Supabase Edge Functions ──────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const FUNCTIONS_BASE = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1` : ''

// ── In-memory caches ──────────────────────────────────────────────────────────
const stickerSetCache = new Map() // key: `${artistId}:${setName}` → { title, stickers }
const fileUrlCache = new Map()    // key: `${artistId}:${fileId}` → url string

/**
 * @param {string} artistId - UUID del artista
 */
export function useStickerProxy(artistId) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

  /**
   * Fetch a sticker set via the proxy Edge Function.
   * @param {string} setName - Telegram sticker set name
   * @returns {Promise<{title: string, stickers: Array}>}
   */
  const fetchStickerSet = useCallback(async (setName) => {
    if (!FUNCTIONS_BASE || !artistId) return null

    const cacheKey = `${artistId}:${setName}`
    if (stickerSetCache.has(cacheKey)) {
      return stickerSetCache.get(cacheKey)
    }

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        action: 'getStickerSet',
        artistId,
        setName,
      })

      const res = await fetch(`${FUNCTIONS_BASE}/telegram-sticker-proxy?${params}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      // data is the sticker set result: { name, title, stickers: [...] }
      const result = { title: data.title, stickers: data.stickers || [] }
      stickerSetCache.set(cacheKey, result)
      setLoading(false)
      return result
    } catch (err) {
      setError(err.message || 'Error fetching sticker set')
      setLoading(false)
      return null
    }
  }, [artistId])

  /**
   * Resolve a file URL via the proxy Edge Function.
   * @param {string} fileId - Telegram file_id
   * @returns {Promise<string|null>} - Direct URL to the file
   */
  const getFileUrl = useCallback(async (fileId) => {
    if (!FUNCTIONS_BASE || !artistId || !fileId) return null

    const cacheKey = `${artistId}:${fileId}`
    if (fileUrlCache.has(cacheKey)) {
      return fileUrlCache.get(cacheKey)
    }

    try {
      const params = new URLSearchParams({
        action: 'getFile',
        artistId,
        fileId,
      })

      const res = await fetch(`${FUNCTIONS_BASE}/telegram-sticker-proxy?${params}`)
      const data = await res.json()

      if (!res.ok) {
        console.warn('[useStickerProxy] getFile error:', data.error)
        return null
      }

      const url = data.fileUrl
      if (url) fileUrlCache.set(cacheKey, url)
      return url
    } catch (err) {
      console.warn('[useStickerProxy] getFile network error:', err.message)
      return null
    }
  }, [artistId])

  /**
   * Place a sticker on a task via the place-sticker Edge Function.
   * @param {string} taskId
   * @param {{file_unique_id: string, file_id: string, emoji: string, thumbUrl: string, is_video: boolean}} sticker
   * @returns {Promise<{ok: boolean, reactions?: object, error?: string}>}
   */
  const placeSticker = useCallback(async (taskId, sticker) => {
    if (!FUNCTIONS_BASE || !artistId || !taskId) {
      return { ok: false, error: 'Missing params' }
    }

    try {
      const res = await fetch(`${FUNCTIONS_BASE}/place-sticker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, artistId, sticker }),
      })

      const data = await res.json()

      if (!res.ok) {
        return { ok: false, error: data.error || `HTTP ${res.status}` }
      }

      return { ok: true, reactions: data.reactions }
    } catch (err) {
      return { ok: false, error: err.message || 'Network error' }
    }
  }, [artistId])

  /**
   * Remove a client-placed sticker from a task.
   * @param {string} taskId
   * @param {string} stickerKey - e.g. "__sticker__UniqueId123"
   * @returns {Promise<{ok: boolean, reactions?: object, error?: string}>}
   */
  const removeSticker = useCallback(async (taskId, stickerKey) => {
    if (!FUNCTIONS_BASE || !artistId || !taskId) {
      return { ok: false, error: 'Missing params' }
    }

    try {
      const res = await fetch(`${FUNCTIONS_BASE}/remove-sticker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, artistId, stickerKey }),
      })

      const data = await res.json()

      if (!res.ok) {
        return { ok: false, error: data.error || `HTTP ${res.status}` }
      }

      return { ok: true, reactions: data.reactions }
    } catch (err) {
      return { ok: false, error: err.message || 'Network error' }
    }
  }, [artistId])

  /**
   * Clear all caches (useful if user needs a refresh)
   */
  const clearCache = useCallback(() => {
    stickerSetCache.clear()
    fileUrlCache.clear()
  }, [])

  return {
    fetchStickerSet,
    getFileUrl,
    placeSticker,
    removeSticker,
    clearCache,
    loading,
    error,
  }
}
