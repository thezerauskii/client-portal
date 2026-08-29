/**
 * POST /api/music/like — a visitor likes a track.
 * Dedup by (track_id, client_id) unique constraint. Service role insert.
 */
import { createClient } from '@supabase/supabase-js'
import { validateLike } from '../_validation.js'

const rl = new Map()
const LIMIT = 30, WINDOW = 60000
function limited(ip) {
  const now = Date.now(); const e = rl.get(ip)
  if (!e || now > e.resetAt) { rl.set(ip, { count: 1, resetAt: now + WINDOW }); return false }
  e.count++; return e.count > LIMIT
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
  if (limited(ip)) return res.status(429).json({ error: 'Demasiadas solicitudes.' })

  const v = validateLike(req.body || {})
  if (!v.valid) return res.status(400).json({ error: v.error })

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return res.status(500).json({ error: 'Server misconfigured' })
  const supabase = createClient(url, key)

  const { artistId, trackId, clientId } = req.body
  const { error } = await supabase
    .from('music_likes')
    .insert({ artist_id: artistId, track_id: trackId, client_id: clientId })

  // Unique violation (already liked) is not an error for us
  if (error && error.code !== '23505') {
    return res.status(500).json({ error: 'No se pudo registrar el like' })
  }
  return res.status(200).json({ ok: true })
}
