import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseReady } from '../lib/supabase.js'

/**
 * Hook that fetches artist profile data by public_slug from Supabase.
 * Uses the anon client (no auth session needed) — RLS policies
 * allow SELECT on profiles where public_slug IS NOT NULL.
 *
 * @param {string} slug - The public_slug of the artist
 * @returns {{ artistId, studioName, projectIcon, accentColor, socialLinks, platformConnections, loading, error, notFound, refetch }}
 */
export function usePortalData(slug) {
  const [data, setData] = useState({
    artistId: null,
    studioName: '',
    projectIcon: null,
    accentColor: null,
    theme: 'default',
    cyberpunkAccentColor: '#f472b6',
    socialLinks: {},
    platformConnections: {},
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notFound, setNotFound] = useState(false)

  const fetchProfile = useCallback(async () => {
    if (!slug) {
      setNotFound(true)
      setLoading(false)
      return
    }

    if (!isSupabaseReady()) {
      setError(new Error(`Supabase not configured. VITE_SUPABASE_URL=${import.meta.env.VITE_SUPABASE_URL || 'undefined'}, ANON_KEY=${import.meta.env.VITE_SUPABASE_ANON_KEY ? 'present' : 'undefined'}`))
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    setNotFound(false)

    try {
      const { data: profile, error: queryError } = await supabase
        .from('profiles')
        .select('id, project_name, project_icon, accent_color, theme, cyberpunk_accent_color, social_links, platform_connections')
        .eq('public_slug', slug)
        .single()

      if (queryError) {
        // PGRST116 = no rows found (single() with 0 results)
        if (queryError.code === 'PGRST116') {
          setNotFound(true)
        } else {
          setError(queryError)
        }
        setLoading(false)
        return
      }

      setData({
        artistId: profile.id,
        studioName: profile.project_name || '',
        projectIcon: profile.project_icon || null,
        accentColor: profile.accent_color || null,
        theme: profile.theme || 'default',
        cyberpunkAccentColor: profile.cyberpunk_accent_color || '#f472b6',
        socialLinks: profile.social_links || {},
        platformConnections: profile.platform_connections || {},
      })
      setLoading(false)
    } catch (err) {
      setError(err)
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  return {
    ...data,
    loading,
    error,
    notFound,
    refetch: fetchProfile,
  }
}
