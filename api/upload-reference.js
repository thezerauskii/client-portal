/**
 * Vercel Serverless Function: /api/upload-reference
 *
 * Allows anonymous portal visitors to upload commission reference images.
 * Images are stored in Supabase Storage bucket `references` under the artist's
 * namespace. Only the resulting public URL is returned (stored in the request).
 *
 * POST body: { artistId: string, dataUrl: string (base64 data URL) }
 * Returns: { ok: true, url: string }
 */

import { createClient } from '@supabase/supabase-js'
import { validateImageUpload } from './_validation.js'

// Rate limiter (in-memory per instance)
const rateLimitMap = new Map()
const RATE_LIMIT = 15
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

const BUCKET = 'references'
const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' }

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

  const validation = validateImageUpload(req.body || {})
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Server misconfigured' })
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { artistId } = req.body
  const { mime, base64 } = validation

  // Verify artist exists
  const { data: artist, error: artistErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', artistId)
    .single()
  if (artistErr || !artist) return res.status(404).json({ error: 'Artist not found' })

  const ext = EXT[mime] || 'png'
  const path = `${artistId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
  const buffer = Buffer.from(base64, 'base64')

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: mime, upsert: false })

  if (uploadErr) {
    return res.status(500).json({ error: 'Upload failed', detail: uploadErr.message })
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return res.status(200).json({ ok: true, url: pub.publicUrl })
}
