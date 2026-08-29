/**
 * POST /api/music/comment — a visitor leaves a timeline comment on a track.
 * Respects the artist's moderation setting: if requireApproval, the comment is
 * inserted with status 'pending'; otherwise 'approved'. Service role insert.
 */
import { createClient } from '@supabase/supabase-js'
import { validateMusicComment } from '../_validation.js'

const rl = new Map()
const LIMIT = 8, WINDOW = 60000
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

  const v = validateMusicComment(req.body || {})
  if (!v.valid) return res.status(400).json({ error: v.error })

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return res.status(500).json({ error: 'Server misconfigured' })
  const supabase = createClient(url, key)

  const { artistId, trackId, timeSec, text = '', author = 'Anónimo', sticker = null } = req.body

  // Read the artist's moderation preference from music_studio.interactions
  const { data: profile } = await supabase
    .from('profiles')
    .select('music_studio')
    .eq('id', artistId)
    .maybeSingle()

  const inter = profile?.music_studio?.interactions || {}
  if (inter.allowComments === false) {
    return res.status(403).json({ error: 'Los comentarios están desactivados.' })
  }
  const status = inter.requireApproval === false ? 'approved' : 'pending'

  const { error } = await supabase.from('music_comments').insert({
    user_id: artistId,
    track_id: trackId,
    time_sec: timeSec,
    author: String(author).slice(0, 60),
    text: String(text).slice(0, 500),
    sticker: sticker || null,
    status,
  })

  if (error) return res.status(500).json({ error: 'No se pudo guardar el comentario' })
  return res.status(200).json({ ok: true, status })
}
