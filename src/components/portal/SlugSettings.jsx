import React, { useState, useCallback } from 'react'
import { supabase, isSupabaseReady } from '../../lib/supabase.js'

/**
 * Slug validation rules:
 * - Only lowercase letters (a-z), numbers (0-9), and hyphens (-)
 * - Minimum 3 characters, maximum 30 characters
 * - Cannot start or end with a hyphen
 */
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/
const MIN_LENGTH = 3
const MAX_LENGTH = 30

function validateSlug(value) {
  if (!value) return 'El slug es requerido'
  if (value.length < MIN_LENGTH) return `Mínimo ${MIN_LENGTH} caracteres`
  if (value.length > MAX_LENGTH) return `Máximo ${MAX_LENGTH} caracteres`
  if (!SLUG_REGEX.test(value)) {
    return 'Solo letras minúsculas, números y guiones. No puede empezar o terminar con guión.'
  }
  return null
}

/**
 * SlugSettings — standalone component for managing the public portal URL slug.
 * Intended to be embedded in the existing SettingsPage.
 *
 * Features:
 * - Input field for "Portal URL slug"
 * - Real-time validation (lowercase, numbers, hyphens only; 3-30 chars)
 * - On save: calls Supabase updateProfile({ public_slug: value })
 * - Preview: shows "Tu portal: tudominio.vercel.app/p/{slug}"
 *
 * @param {{ userId: string, currentSlug?: string, onSaved?: (slug: string) => void }} props
 */
export default function SlugSettings({ userId, currentSlug = '', onSaved }) {
  const [slug, setSlug] = useState(currentSlug)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleChange = useCallback((e) => {
    // Sanitize: force lowercase, remove invalid chars on the fly
    const raw = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    const trimmed = raw.slice(0, MAX_LENGTH)
    setSlug(trimmed)
    setError(null)
    setSuccess(false)
  }, [])

  const handleSave = useCallback(async () => {
    const validationError = validateSlug(slug)
    if (validationError) {
      setError(validationError)
      return
    }

    if (!isSupabaseReady()) {
      setError('Supabase no está configurado')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ public_slug: slug })
        .eq('id', userId)

      if (updateError) {
        // Handle unique constraint violation
        if (updateError.code === '23505') {
          setError('Este slug ya está en uso. Elige otro.')
        } else {
          setError(updateError.message || 'Error al guardar')
        }
      } else {
        setSuccess(true)
        if (onSaved) onSaved(slug)
      }
    } catch (err) {
      setError(err.message || 'Error de conexión')
    } finally {
      setSaving(false)
    }
  }, [slug, userId, onSaved])

  const portalDomain = import.meta.env.VITE_PORTAL_DOMAIN || 'tudominio.vercel.app'

  return (
    <div className="slug-settings" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      padding: '16px',
      background: 'var(--surface, #1e1e24)',
      borderRadius: '8px',
      border: '1px solid var(--border, #2e2e36)',
    }}>
      <label
        htmlFor="portal-slug-input"
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--text, #e0e0e0)',
        }}
      >
        Portal URL slug
      </label>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          id="portal-slug-input"
          type="text"
          value={slug}
          onChange={handleChange}
          placeholder="mi-estudio"
          maxLength={MAX_LENGTH}
          aria-describedby="slug-preview slug-error"
          style={{
            flex: 1,
            padding: '8px 12px',
            background: 'var(--bg, #121214)',
            border: `1px solid ${error ? 'var(--red, #ff5252)' : 'var(--border, #2e2e36)'}`,
            borderRadius: '6px',
            color: 'var(--text, #e0e0e0)',
            fontSize: '14px',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSave}
          disabled={saving || !slug}
          style={{
            padding: '8px 16px',
            background: saving ? 'var(--border, #2e2e36)' : 'var(--green, #00e676)',
            color: saving ? 'var(--text, #e0e0e0)' : '#000',
            border: 'none',
            borderRadius: '6px',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontWeight: 500,
            fontSize: '13px',
            whiteSpace: 'nowrap',
          }}
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      {/* Preview URL */}
      <p
        id="slug-preview"
        style={{
          fontSize: '12px',
          color: 'var(--text-secondary, #888)',
          margin: 0,
        }}
      >
        Tu portal:{' '}
        <span style={{ color: 'var(--green, #00e676)', fontFamily: 'monospace' }}>
          {portalDomain}/p/{slug || '...'}
        </span>
      </p>

      {/* Validation error */}
      {error && (
        <p
          id="slug-error"
          role="alert"
          style={{
            fontSize: '12px',
            color: 'var(--red, #ff5252)',
            margin: 0,
          }}
        >
          {error}
        </p>
      )}

      {/* Success message */}
      {success && (
        <p
          role="status"
          style={{
            fontSize: '12px',
            color: 'var(--green, #00e676)',
            margin: 0,
          }}
        >
          Slug guardado correctamente
        </p>
      )}

      {/* Character count */}
      <p style={{
        fontSize: '11px',
        color: 'var(--text-secondary, #666)',
        margin: 0,
        textAlign: 'right',
      }}>
        {slug.length}/{MAX_LENGTH}
      </p>
    </div>
  )
}
