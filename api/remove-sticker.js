/**
 * Vercel Serverless Function: /api/remove-sticker
 *
 * Permite a un cliente eliminar un sticker que él mismo colocó.
 *
 * POST body:
 * { taskId: string, artistId: string, stickerKey: string }
 */

import { createClient } from '@supabase/supabase-js'

// Rate Limiter
const rateLimitMap = new Map()
const RATE_LIMIT = 20
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
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Rate limit exceeded' })
  }

  const { taskId, artistId, stickerKey } = req.body || {}

  if (!taskId || !artistId || !stickerKey) {
    return res.status(400).json({ error: 'Missing required fields: taskId, artistId, stickerKey' })
  }

  if (!stickerKey.startsWith('__sticker__')) {
    return res.status(400).json({ error: 'Invalid stickerKey format' })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Server misconfigured' })
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // 1. Fetch task
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('id, user_id, reactions')
    .eq('id', taskId)
    .single()

  if (taskError || !task) return res.status(404).json({ error: 'Task not found' })
  if (task.user_id !== artistId) return res.status(403).json({ error: 'Task does not belong to this artist' })

  // 2. Validate sticker
  const currentReactions = task.reactions || {}
  const stickerEntry = currentReactions[stickerKey]

  if (!stickerEntry) return res.status(404).json({ error: 'Sticker not found' })
  if (stickerEntry.placedBy !== 'client') {
    return res.status(403).json({ error: 'Cannot remove stickers placed by the artist' })
  }

  // 3. Remove
  const updatedReactions = { ...currentReactions }
  delete updatedReactions[stickerKey]

  const { error: updateError } = await supabase
    .from('tasks')
    .update({ reactions: updatedReactions })
    .eq('id', taskId)

  if (updateError) {
    return res.status(500).json({ error: 'Failed to remove sticker', detail: updateError.message })
  }

  return res.status(200).json({ ok: true, reactions: updatedReactions })
}
