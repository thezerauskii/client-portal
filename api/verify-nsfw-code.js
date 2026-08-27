/**
 * Vercel Serverless Function: /api/verify-nsfw-code
 *
 * Validates a private commission access code and returns the task data if valid.
 *
 * POST body:
 * {
 *   code: string,       // "PRV-A7X-9K2"
 *   artistSlug: string  // "mi-slug"
 * }
 *
 * Responses:
 * 200: { ok: true, task: { id, text, attachments, stage, deadline, reactions } }
 * 200: { ok: false, error: "invalid_code" }
 * 429: { ok: false, error: "rate_limited" }
 * 400: { ok: false, error: "bad_request" }
 * 405: { ok: false, error: "method_not_allowed" }
 */

import { createClient } from '@supabase/supabase-js'

// ─── Rate Limiter (in-memory, per Vercel instance) ──────────────────────────
const rateLimitMap = new Map()
const RATE_LIMIT = 5
const RATE_WINDOW_MS = 60000 // 1 minute

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

// ─── Code format validator ──────────────────────────────────────────────────
const CODE_REGEX = /^PRV-[A-HJ-NP-Z2-9]{3}-[A-HJ-NP-Z2-9]{3}$/

// ─── Handler ────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' })
  }

  // Rate limit by IP
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown'
  if (isRateLimited(ip)) {
    return res.status(429).json({ ok: false, error: 'rate_limited' })
  }

  // Parse body
  const { code, artistSlug } = req.body || {}

  if (!code || !artistSlug) {
    return res.status(400).json({ ok: false, error: 'bad_request' })
  }

  // Validate code format (prevents SQL injection via parameterized queries anyway,
  // but also rejects garbage early)
  if (!CODE_REGEX.test(code)) {
    return res.status(200).json({ ok: false, error: 'invalid_code' })
  }

  // Validate slug format (basic sanity check)
  if (typeof artistSlug !== 'string' || artistSlug.length > 100) {
    return res.status(200).json({ ok: false, error: 'invalid_code' })
  }

  // Initialize Supabase with service role key (bypasses RLS)
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[verify-nsfw-code] Missing Supabase env vars')
    return res.status(500).json({ ok: false, error: 'server_error' })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // 1. Find artist by public_slug
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('public_slug', artistSlug)
      .single()

    if (profileError || !profile) {
      // Don't reveal whether slug is invalid or code is wrong
      return res.status(200).json({ ok: false, error: 'invalid_code' })
    }

    const artistId = profile.id

    // 2. Find task by nsfw_access_code AND user_id
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, text, attachments, stage, deadline, reactions, is_nsfw')
      .eq('nsfw_access_code', code)
      .eq('user_id', artistId)
      .single()

    if (taskError || !task) {
      return res.status(200).json({ ok: false, error: 'invalid_code' })
    }

    // 3. Return task data (limited fields only)
    return res.status(200).json({
      ok: true,
      task: {
        id: task.id,
        text: task.text,
        attachments: task.attachments || [],
        stage: task.stage || 'new',
        deadline: task.deadline || null,
        reactions: task.reactions || {},
      },
    })
  } catch (err) {
    console.error('[verify-nsfw-code] Unexpected error:', err?.message)
    return res.status(500).json({ ok: false, error: 'server_error' })
  }
}
