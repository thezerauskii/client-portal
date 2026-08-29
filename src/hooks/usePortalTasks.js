import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseReady } from '../lib/supabase.js'

/**
 * usePortalTasks — single source of truth for an artist's tasks in the portal.
 *
 * Fetches all non-archived tasks once per artistId and caches the result at
 * module level, so StatsBar and PortalKanbanBoard share ONE query instead of
 * each hitting Supabase separately.
 *
 * Selects the superset of columns needed by all consumers.
 *
 * @param {string} artistId
 * @returns {{ tasks: Array, loading: boolean, error: Error|null, refetch: () => void }}
 */

// Module-level cache: { [artistId]: { tasks, promise } }
const _cache = new Map()

const TASK_COLUMNS =
  'id, text, parent_id, priority, stage, client, client_email, deadline, note, attachments, checklist, reactions, is_nsfw, nsfw_access_code, completed_state'

async function fetchTasksForArtist(artistId) {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_COLUMNS)
    .eq('user_id', artistId)
    .or('archived.is.null,archived.eq.false')

  if (error) throw error
  return data || []
}

export function usePortalTasks(artistId) {
  const [tasks, setTasks] = useState(() => _cache.get(artistId)?.tasks || [])
  const [loading, setLoading] = useState(() => !_cache.get(artistId)?.tasks)
  const [error, setError] = useState(null)

  const load = useCallback(async (force = false) => {
    if (!artistId || !isSupabaseReady()) {
      setLoading(false)
      return
    }

    // Serve from cache unless forced
    const cached = _cache.get(artistId)
    if (cached?.tasks && !force) {
      setTasks(cached.tasks)
      setLoading(false)
      return
    }

    // De-dupe concurrent requests: reuse in-flight promise
    if (cached?.promise && !force) {
      try {
        const result = await cached.promise
        setTasks(result)
        setLoading(false)
      } catch (err) {
        setError(err)
        setLoading(false)
      }
      return
    }

    setLoading(true)
    setError(null)
    const promise = fetchTasksForArtist(artistId)
    _cache.set(artistId, { tasks: cached?.tasks || null, promise })

    try {
      const result = await promise
      _cache.set(artistId, { tasks: result, promise: null })
      setTasks(result)
      setLoading(false)
    } catch (err) {
      _cache.set(artistId, { tasks: cached?.tasks || null, promise: null })
      setError(err)
      setLoading(false)
    }
  }, [artistId])

  useEffect(() => {
    load()
  }, [load])

  const refetch = useCallback(() => load(true), [load])

  return { tasks, loading, error, refetch }
}

/** Clear the module cache (e.g. for testing or forced refresh). */
export function clearPortalTasksCache() {
  _cache.clear()
}
