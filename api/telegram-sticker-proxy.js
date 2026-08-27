/**
 * Vercel Serverless Function: /api/telegram-sticker-proxy
 *
 * Proxy seguro para la API de Telegram Bot.
 * El bot token del artista nunca se expone al frontend.
 *
 * Query params:
 *   ?action=getStickerSet&artistId=UUID&setName=NAME
 *   ?action=getFile&artistId=UUID&fileId=FILE_ID
 */

import { createClient } from '@supabase/supabase-js'

// ── Rate Limiter (in-memory per instance) ─────────────────────────────────────
const rateLimitMap = new Map()
const RATE_LIMIT = 30
const RATE_WINDOW_MS = 60000

function isRateLimited(ip) {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  // Rate limit
  const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Max 30 requests per minute.' })
  }

  const { action, artistId, setName, fileId } = req.query

  if (!action || !artistId) {
    return res.status(400).json({ error: 'Missing required params: action, artistId' })
  }

  // Supabase admin client
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Server misconfigured: missing Supabase credentials' })
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Fetch artist's telegram token
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('telegram_token, telegram_sticker_sets')
    .eq('id', artistId)
    .single()

  if (profileError || !profile) {
    return res.status(404).json({ error: 'Artist not found' })
  }

  const token = profile.telegram_token
  if (!token) {
    return res.status(400).json({ error: 'Artist has no Telegram bot token configured' })
  }

  // ── Action: getStickerSet ─────────────────────────────────────────────────
  if (action === 'getStickerSet') {
    if (!setName) return res.status(400).json({ error: 'Missing param: setName' })

    // Note: We allow fetching any public sticker set — not just those in the artist's config.
    // This lets portal visitors add their own sets to place stickers from.

    try {
      const telegramRes = await fetch(
        `https://api.telegram.org/bot${token}/getStickerSet?name=${encodeURIComponent(setName)}`
      )
      const data = await telegramRes.json()

      if (!data.ok) {
        return res.status(502).json({ error: data.description || 'Telegram API error' })
      }

      res.setHeader('Cache-Control', 'public, max-age=3600')
      return res.status(200).json(data.result)
    } catch (err) {
      return res.status(502).json({ error: 'Failed to contact Telegram API' })
    }
  }

  // ── Action: getFile ───────────────────────────────────────────────────────
  if (action === 'getFile') {
    if (!fileId) return res.status(400).json({ error: 'Missing param: fileId' })

    try {
      const telegramRes = await fetch(
        `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`
      )
      const data = await telegramRes.json()

      if (!data.ok) {
        return res.status(502).json({ error: data.description || 'Telegram API error' })
      }

      const filePath = data.result.file_path
      const fileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`

      res.setHeader('Cache-Control', 'public, max-age=3300')
      return res.status(200).json({ fileUrl })
    } catch (err) {
      return res.status(502).json({ error: 'Failed to contact Telegram API' })
    }
  }

  return res.status(400).json({ error: `Unknown action: ${action}` })
}
