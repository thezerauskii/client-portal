/**
 * Vercel Serverless Function: /api/submit-request
 *
 * Public endpoint: a portal visitor submits a commission request.
 * Inserts into commission_requests with the artist's user_id (service role).
 * Custom field answers go into the `answers` jsonb column; system fields
 * (name, email, description, budget, deadline, images) map to native columns.
 *
 * POST body:
 * {
 *   artistId, name, email, social?, description?, budgetMin?, budgetMax?,
 *   deadline?, images?: string[], answers?: { fieldId: {label, value} }
 * }
 */

import { createClient } from '@supabase/supabase-js'
import { validateRequestSubmission } from './_validation.js'

const rateLimitMap = new Map()
const RATE_LIMIT = 5
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

async function notifyTelegram(token, chatId, request) {
  if (!token || !chatId) return
  const text =
    `🎨 Nueva solicitud de comisión\n\n` +
    `Cliente: ${request.name}\n` +
    `Email: ${request.email}\n` +
    (request.description ? `Descripción: ${request.description.slice(0, 300)}\n` : '') +
    `ID: ${request.id}`
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    })
  } catch { /* non-critical */ }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' })
  }

  const validation = validateRequestSubmission(req.body || {})
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Server misconfigured' })
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const {
    artistId, name, email, social = '', description = '',
    budgetMin = null, budgetMax = null, deadline = '',
    images = [], answers = {},
  } = req.body

  // Verify the artist exists
  const { data: artist, error: artistErr } = await supabase
    .from('profiles')
    .select('id, telegram_token, telegram_chat_id')
    .eq('id', artistId)
    .single()
  if (artistErr || !artist) return res.status(404).json({ error: 'Artist not found' })

  const id = `REQ-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

  const record = {
    id,
    user_id: artistId,
    status: 'pending',
    name: name.trim(),
    email: email.trim(),
    social: String(social).slice(0, 200),
    description: String(description).slice(0, 5000),
    budget_min: typeof budgetMin === 'number' ? budgetMin : (budgetMin ? Number(budgetMin) || null : null),
    budget_max: typeof budgetMax === 'number' ? budgetMax : (budgetMax ? Number(budgetMax) || null : null),
    deadline: String(deadline).slice(0, 100),
    images: images.map(url => ({ name: 'ref', url })),
    answers,
    with_payment: false,
    terms: true,
  }

  const { error: insertErr } = await supabase
    .from('commission_requests')
    .insert(record)

  if (insertErr) {
    return res.status(500).json({ error: 'No se pudo guardar la solicitud', detail: insertErr.message })
  }

  // Optional Telegram notification (non-blocking best effort)
  await notifyTelegram(artist.telegram_token, artist.telegram_chat_id, record)

  return res.status(200).json({ ok: true, requestId: id })
}
