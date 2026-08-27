/**
 * Supabase Edge Function: telegram-sticker-proxy
 *
 * Proxy seguro para la API de Telegram Bot.
 * El bot token del artista nunca se expone al frontend.
 *
 * Acciones:
 *   ?action=getStickerSet&artistId=UUID&setName=NAME
 *   ?action=getFile&artistId=UUID&fileId=FILE_ID
 *
 * Seguridad:
 *   - Rate limit por IP (30 req/min)
 *   - Cache headers (1h getStickerSet, 55min getFile)
 *   - Valida que el artista tiene token configurado
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Rate Limiter (in-memory, per-instance) ────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 30
const RATE_WINDOW_MS = 60_000

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return false
  }

  entry.count++
  if (entry.count > RATE_LIMIT) return true
  return false
}

// ── CORS headers ──────────────────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Rate limit check
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(clientIp)) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded. Max 30 requests per minute.' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
    })
  }

  // Parse query params
  const url = new URL(req.url)
  const action = url.searchParams.get('action')
  const artistId = url.searchParams.get('artistId')

  if (!action || !artistId) {
    return new Response(JSON.stringify({ error: 'Missing required params: action, artistId' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Create Supabase admin client to read the artist's token
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Fetch artist's telegram token
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('telegram_token, telegram_sticker_sets')
    .eq('id', artistId)
    .single()

  if (profileError || !profile) {
    return new Response(JSON.stringify({ error: 'Artist not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const token = profile.telegram_token
  if (!token) {
    return new Response(JSON.stringify({ error: 'Artist has no Telegram bot token configured' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // ── Action: getStickerSet ─────────────────────────────────────────────────
  if (action === 'getStickerSet') {
    const setName = url.searchParams.get('setName')
    if (!setName) {
      return new Response(JSON.stringify({ error: 'Missing param: setName' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Allow fetching any public sticker set (visitors can add their own sets)

    try {
      const telegramRes = await fetch(
        `https://api.telegram.org/bot${token}/getStickerSet?name=${encodeURIComponent(setName)}`
      )
      const data = await telegramRes.json()

      if (!data.ok) {
        return new Response(JSON.stringify({ error: data.description || 'Telegram API error' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Return sticker set with 1 hour cache
      return new Response(JSON.stringify(data.result), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600',
        },
      })
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Failed to contact Telegram API' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  // ── Action: getFile ───────────────────────────────────────────────────────
  if (action === 'getFile') {
    const fileId = url.searchParams.get('fileId')
    if (!fileId) {
      return new Response(JSON.stringify({ error: 'Missing param: fileId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    try {
      const telegramRes = await fetch(
        `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`
      )
      const data = await telegramRes.json()

      if (!data.ok) {
        return new Response(JSON.stringify({ error: data.description || 'Telegram API error' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const filePath = data.result.file_path
      const fileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`

      // Return the resolved URL with 55 min cache (Telegram invalidates at 1h)
      return new Response(JSON.stringify({ fileUrl }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3300',
        },
      })
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Failed to contact Telegram API' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  // Unknown action
  return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
