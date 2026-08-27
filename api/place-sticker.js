/**
 * Vercel Serverless Function: /api/place-sticker
 *
 * Permite a un cliente colocar un sticker sobre una comisión.
 *
 * POST body:
 * {
 *   taskId: string,
 *   artistId: string,
 *   sticker: { file_unique_id, file_id, emoji, thumbUrl, is_video }
 * }
 */

import { createClient } from '@supabase/supabase-js'

const MAX_CLIENT_STICKERS = 5

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

function hashStr(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return Math.abs(h)
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

  const { taskId, artistId, sticker } = req.body || {}

  if (!taskId || !artistId || !sticker?.file_unique_id) {
    return res.status(400).json({ error: 'Missing required fields: taskId, artistId, sticker.file_unique_id' })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Server misconfigured' })
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // 1. Validate task belongs to artist
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('id, user_id, reactions')
    .eq('id', taskId)
    .single()

  if (taskError || !task) return res.status(404).json({ error: 'Task not found' })
  if (task.user_id !== artistId) return res.status(403).json({ error: 'Task does not belong to this artist' })

  // 2. Check limit
  const currentReactions = task.reactions || {}
  const clientStickerCount = Object.values(currentReactions).filter(
    (v) => v && typeof v === 'object' && v.placedBy === 'client'
  ).length

  if (clientStickerCount >= MAX_CLIENT_STICKERS) {
    return res.status(409).json({ error: `Maximum ${MAX_CLIENT_STICKERS} stickers reached`, currentCount: clientStickerCount })
  }

  // 3. Build sticker entry
  const stickerKey = `__sticker__${sticker.file_unique_id}`

  if (currentReactions[stickerKey] && currentReactions[stickerKey].placedBy === 'client') {
    return res.status(409).json({ error: 'This sticker is already placed', reactions: currentReactions })
  }

  const hash = hashStr(stickerKey)
  const newSticker = {
    type: 'sticker',
    file_id: sticker.file_id || '',
    file_unique_id: sticker.file_unique_id,
    is_video: sticker.is_video || false,
    emoji: sticker.emoji || '',
    thumbUrl: sticker.thumbUrl || '',
    count: 1,
    x: 5 + (hash % 60),
    y: 5 + ((hash * 7) % 55),
    rot: (hash % 22) - 11,
    placedBy: 'client',
    placedAt: new Date().toISOString(),
  }

  // 4. Merge
  const updatedReactions = { ...currentReactions, [stickerKey]: newSticker }

  const { error: updateError } = await supabase
    .from('tasks')
    .update({ reactions: updatedReactions })
    .eq('id', taskId)

  if (updateError) {
    return res.status(500).json({ error: 'Failed to save sticker', detail: updateError.message })
  }

  return res.status(200).json({ ok: true, reactions: updatedReactions })
}
