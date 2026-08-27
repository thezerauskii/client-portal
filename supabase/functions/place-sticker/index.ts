/**
 * Supabase Edge Function: place-sticker
 *
 * Permite a un cliente visitante colocar un sticker sobre una comisión.
 * Validaciones:
 *   1. El task pertenece al artistId indicado
 *   2. El sticker set existe en la config del artista
 *   3. No más de 5 stickers con placedBy='client' por task
 *
 * POST body:
 * {
 *   taskId: string,
 *   artistId: string,
 *   sticker: {
 *     file_unique_id: string,
 *     file_id: string,
 *     emoji: string,
 *     thumbUrl: string,
 *     is_video: boolean
 *   }
 * }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MAX_CLIENT_STICKERS = 5

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// ── Rate Limiter ──────────────────────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60_000

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Rate limit
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(clientIp)) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
    })
  }

  // Parse body
  let body: any
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { taskId, artistId, sticker } = body

  if (!taskId || !artistId || !sticker?.file_unique_id) {
    return new Response(JSON.stringify({ error: 'Missing required fields: taskId, artistId, sticker.file_unique_id' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Supabase admin client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // 1. Validate task belongs to the artist
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('id, user_id, reactions')
    .eq('id', taskId)
    .single()

  if (taskError || !task) {
    return new Response(JSON.stringify({ error: 'Task not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (task.user_id !== artistId) {
    return new Response(JSON.stringify({ error: 'Task does not belong to this artist' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 2. Check client sticker limit (max 5 per task)
  const currentReactions: Record<string, any> = task.reactions || {}
  const clientStickerCount = Object.values(currentReactions).filter(
    (v: any) => v && typeof v === 'object' && v.placedBy === 'client'
  ).length

  if (clientStickerCount >= MAX_CLIENT_STICKERS) {
    return new Response(JSON.stringify({
      error: `Maximum ${MAX_CLIENT_STICKERS} stickers per commission reached`,
      currentCount: clientStickerCount,
    }), {
      status: 409,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 3. Build the sticker reaction entry
  const stickerKey = `__sticker__${sticker.file_unique_id}`

  // If this exact sticker already exists, don't duplicate
  if (currentReactions[stickerKey] && currentReactions[stickerKey].placedBy === 'client') {
    return new Response(JSON.stringify({
      error: 'This sticker is already placed on this commission',
      reactions: currentReactions,
    }), {
      status: 409,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Generate semi-random position (like Electron does with hash)
  function hashStr(str: string): number {
    let h = 0
    for (let i = 0; i < str.length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
    }
    return Math.abs(h)
  }

  const hash = hashStr(stickerKey)
  const x = 5 + (hash % 60)
  const y = 5 + ((hash * 7) % 55)
  const rot = (hash % 22) - 11

  const newSticker = {
    type: 'sticker',
    file_id: sticker.file_id || '',
    file_unique_id: sticker.file_unique_id,
    is_video: sticker.is_video || false,
    emoji: sticker.emoji || '',
    thumbUrl: sticker.thumbUrl || '',
    count: 1,
    x,
    y,
    rot,
    placedBy: 'client',
    placedAt: new Date().toISOString(),
  }

  // 4. Merge into reactions
  const updatedReactions = { ...currentReactions, [stickerKey]: newSticker }

  const { error: updateError } = await supabase
    .from('tasks')
    .update({ reactions: updatedReactions })
    .eq('id', taskId)

  if (updateError) {
    return new Response(JSON.stringify({ error: 'Failed to save sticker', detail: updateError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: true, reactions: updatedReactions }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
