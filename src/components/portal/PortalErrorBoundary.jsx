import React from 'react'

/**
 * PortalErrorBoundary — catches runtime render errors in portal pages.
 * Shows a friendly Spanish error message with a reload button.
 * Dark-themed using CSS variables.
 */
export default class PortalErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[PortalErrorBoundary]', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.icon}><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
            <h1 style={styles.title}>Algo salió mal</h1>
            <p style={styles.message}>
              Ocurrió un error inesperado al cargar esta página. 
              Por favor intenta recargar.
            </p>
            <button style={styles.button} onClick={this.handleReload}>
              Recargar
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
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
  icon: {
    fontSize: '3rem',
    marginBottom: '1rem',
  },
  title: {
    color: 'var(--text, #e8e8ec)',
    fontSize: '1.5rem',
    fontWeight: 700,
    marginBottom: '0.75rem',
  },
  message: {
    color: 'var(--text-muted, #888896)',
    fontSize: '0.9rem',
    lineHeight: 1.5,
    marginBottom: '1.5rem',
  },
  button: {
    background: 'var(--accent, #e8e8ec)',
    color: 'var(--bg, #111113)',
    border: 'none',
    borderRadius: 'var(--radius-sm, 7px)',
    padding: '0.6rem 1.5rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
  },
}
