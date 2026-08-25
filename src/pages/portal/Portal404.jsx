import React from 'react'
import { Link } from 'react-router-dom'

/**
 * Portal404 — shown when slug doesn't match any artist.
 * Dark-themed, centered layout with link to check URL.
 */
export default function Portal404() {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.code}>404</h1>
        <p style={styles.message}>
          Este artista no existe o no tiene portal público
        </p>
        <p style={styles.hint}>
          Verifica que la URL sea correcta e intenta de nuevo.
        </p>
        <Link to="/" style={styles.link}>
          Ir al inicio
        </Link>
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'var(--bg, #111113)',
    padding: '2rem',
  },
  card: {
    background: 'var(--surface, #1a1a1e)',
    border: '1px solid var(--border, #2e2e36)',
    borderRadius: 'var(--radius, 10px)',
    padding: '3rem 2.5rem',
    textAlign: 'center',
    maxWidth: '420px',
    width: '100%',
  },
  code: {
    fontSize: '4.5rem',
    fontWeight: 800,
    color: 'var(--text, #e8e8ec)',
    marginBottom: '0.5rem',
    lineHeight: 1,
  },
  message: {
    color: 'var(--text-muted, #888896)',
    fontSize: '1rem',
    lineHeight: 1.5,
    marginBottom: '0.5rem',
  },
  hint: {
    color: 'var(--text-dim, #555560)',
    fontSize: '0.8rem',
    marginBottom: '1.5rem',
  },
  link: {
    display: 'inline-block',
    background: 'var(--accent, #e8e8ec)',
    color: 'var(--bg, #111113)',
    border: 'none',
    borderRadius: 'var(--radius-sm, 7px)',
    padding: '0.6rem 1.5rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    textDecoration: 'none',
    transition: 'opacity 0.15s ease',
  },
}
