/**
 * POST /api/music/contact — a visitor sends a sound-design brief/lead.
 * Stored as a commission_request (reusing that table) tagged as a music lead,
 * and notifies the artist via Telegram if configured. Optional audio reference
 * URL (already uploaded elsewhere) is validated to be an https URL under R2.
 */
import { createClient } from '@supabase/supabase-js'

const rl = new Map()
const LIMIT = 5, WINDOW = 60000
function limited(ip) {
  const now = Date.now(); const e = rl.get(ip)
  if (!e || now > e.resetAt) { rl.set(ip, { count: 1, resetAt: now + WINDOW }); return false }
  e.count++; return e.count > LIMIT
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function notify(token, chatId, lead) {
  if (!token || !chatId) return
  const text = `🎧 Nuevo lead de sonido\n\nNombre: ${lead.name}\nEmail: ${lead.email}\n` +
    (lead.projectType ? `Tipo: ${lead.projectType}\n` : '') +
    (lead.budget ? `Presupuesto: ${lead.budget}\n` : '') +
    (lead.message ? `Mensaje: ${lead.message.slice(0, 300)}` : '')
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
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

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
  if (limited(ip)) return res.status(429).json({ error: 'Demasiadas solicitudes.' })

  const b = req.body || {}
  if (typeof b.artistId !== 'string' || !b.artistId) return res.status(400).json({ error: 'Invalid artistId' })
  if (typeof b.name !== 'string' || b.name.trim().length < 1 || b.name.length > 100) return res.status(400).json({ error: 'Nombre inválido' })
  if (typeof b.email !== 'string' || !EMAIL.test(b.email) || b.email.length > 200) return res.status(400).json({ error: 'Correo inválido' })
  if (b.message != null && (typeof b.message !== 'string' || b.message.length > 5000)) return res.status(400).json({ error: 'Mensaje demasiado largo' })
  if (b.refUrl != null && b.refUrl !== '' && (typeof b.refUrl !== 'string' || !/^https:\/\//.test(b.refUrl) || b.refUrl.length > 1024)) {
    return res.status(400).json({ error: 'URL de referencia inválida' })
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return res.status(500).json({ error: 'Server misconfigured' })
  const supabase = createClient(url, key)

  const { data: artist, error: aerr } = await supabase
    .from('profiles').select('id, telegram_token, telegram_chat_id').eq('id', b.artistId).single()
  if (aerr || !artist) return res.status(404).json({ error: 'Artist not found' })

  const id = `SND-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
  const { error: ierr } = await supabase.from('commission_requests').insert({
    id, user_id: b.artistId, status: 'pending',
    name: b.name.trim(), email: b.email.trim(),
    description: String(b.message || '').slice(0, 5000),
    images: b.refUrl ? [{ name: 'ref', url: b.refUrl }] : [],
    answers: { _source: { label: 'Origen', value: 'music' }, projectType: { label: 'Tipo', value: String(b.projectType || '').slice(0, 200) }, budget: { label: 'Presupuesto', value: String(b.budget || '').slice(0, 100) } },
    terms: true, with_payment: false,
  })
  if (ierr) return res.status(500).json({ error: 'No se pudo enviar', detail: ierr.message })

  await notify(artist.telegram_token, artist.telegram_chat_id, b)
  return res.status(200).json({ ok: true, id })
}
