/**
 * Supabase Edge Function: remove-sticker
 *
 * Permite a un cliente visitante eliminar UN sticker que él mismo colocó.
 * Solo puede eliminar stickers con placedBy='client'.
 *
 * POST body:
 * {
 *   taskId: string,
 *   artistId: string,
 *   stickerKey: string  // e.g. "__sticker__UniqueId123"
 * }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

  const { taskId, artistId, stickerKey } = body

  if (!taskId || !artistId || !stickerKey) {
    return new Response(JSON.stringify({ error: 'Missing required fields: taskId, artistId, stickerKey' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Validate stickerKey format
  if (!stickerKey.startsWith('__sticker__')) {
    return new Response(JSON.stringify({ error: 'Invalid stickerKey format' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Supabase admin client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // 1. Fetch the task
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

  // 2. Validate task belongs to this artist
  if (task.user_id !== artistId) {
    return new Response(JSON.stringify({ error: 'Task does not belong to this artist' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 3. Check the sticker exists and was placed by client
  const currentReactions: Record<string, any> = task.reactions || {}
  const stickerEntry = currentReactions[stickerKey]

  if (!stickerEntry) {
    return new Response(JSON.stringify({ error: 'Sticker not found on this task' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (stickerEntry.placedBy !== 'client') {
    return new Response(JSON.stringify({ error: 'Cannot remove stickers placed by the artist' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 4. Remove the sticker
  const updatedReactions = { ...currentReactions }
  delete updatedReactions[stickerKey]

  const { error: updateError } = await supabase
    .from('tasks')
    .update({ reactions: updatedReactions })
    .eq('id', taskId)

  if (updateError) {
    return new Response(JSON.stringify({ error: 'Failed to remove sticker', detail: updateError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: true, reactions: updatedReactions }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
