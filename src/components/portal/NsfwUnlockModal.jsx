import React, { useState, useRef, useCallback } from 'react'
import NsfwCommissionCard from './NsfwCommissionCard.jsx'

/**
 * NsfwUnlockModal — Modal for clients to enter a private access code (PRV-XXX-XXX)
 * and view their NSFW commission.
 */
export default function NsfwUnlockModal({ artistSlug, onClose }) {
  const [part1, setPart1] = useState('')
  const [part2, setPart2] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error | rate_limited
  const [errorMsg, setErrorMsg] = useState('')
  const [task, setTask] = useState(null)

  const input1Ref = useRef(null)
  const input2Ref = useRef(null)

  // Valid charset (matches generator): A-HJ-NP-Z, 2-9
  const VALID_CHARS = /^[A-HJ-NP-Z2-9]*$/i

  const handlePart1 = useCallback((e) => {
    const val = e.target.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/gi, '').slice(0, 3)
    setPart1(val)
    if (val.length === 3) {
      input2Ref.current?.focus()
    }
  }, [])

  const handlePart2 = useCallback((e) => {
    const val = e.target.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/gi, '').slice(0, 3)
    setPart2(val)
  }, [])

  const handleKeyDown1 = useCallback((e) => {
    if (e.key === '-' || e.key === 'Tab') {
      e.preventDefault()
      input2Ref.current?.focus()
    }
  }, [])

  const handleKeyDown2 = useCallback((e) => {
    if (e.key === 'Backspace' && part2 === '') {
      e.preventDefault()
      input1Ref.current?.focus()
    }
  }, [part2])

  const canSubmit = part1.length === 3 && part2.length === 3 && status !== 'loading'

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault()
    if (!canSubmit) return

    setStatus('loading')
    setErrorMsg('')

    const code = `PRV-${part1}-${part2}`

    try {
      const res = await fetch('/api/verify-nsfw-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, artistSlug }),
      })

      if (res.status === 429) {
        setStatus('rate_limited')
        setErrorMsg('Demasiados intentos. Espera un momento.')
        return
      }

      const data = await res.json()

      if (data.ok) {
        setTask(data.task)
        setStatus('success')
      } else {
        setStatus('error')
        setErrorMsg('Codigo no encontrado')
      }
    } catch {
      setStatus('error')
      setErrorMsg('Error de conexion. Intenta de nuevo.')
    }
  }, [canSubmit, part1, part2, artistSlug])

  const handlePaste = useCallback((e) => {
    const pasted = (e.clipboardData || window.clipboardData).getData('text').trim().toUpperCase()
    // Try to parse PRV-XXX-XXX format
    const match = pasted.match(/^(?:PRV-)?([A-HJ-NP-Z2-9]{3})-?([A-HJ-NP-Z2-9]{3})$/i)
    if (match) {
      e.preventDefault()
      setPart1(match[1])
      setPart2(match[2])
      input2Ref.current?.focus()
    }
  }, [])

  return (
    <div
      className="nsfw-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nsfw-modal-title"
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div className="nsfw-modal-card" style={{
        background: 'var(--surface-elevated, #1e1e28)',
        border: '1px solid var(--border, #3a3a4a)',
        borderRadius: '14px',
        padding: '24px 28px',
        maxWidth: '420px',
        width: '100%',
        position: 'relative',
      }}>
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Cerrar"
          style={{
            position: 'absolute',
            top: '12px',
            right: '14px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted, #888)',
            fontSize: '18px',
            cursor: 'pointer',
            lineHeight: 1,
          }}
        ><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>

        {status !== 'success' ? (
          <>
            {/* Header */}
            <h3 id="nsfw-modal-title" style={{
              margin: '0 0 6px',
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--text, #eee)',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:'6px'}}><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 0-7.78 7.78 5.5 5.5 0 0 0 7.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>Desbloquear comision privada
            </h3>
            <p style={{
              margin: '0 0 20px',
              fontSize: '12px',
              color: 'var(--text-muted, #999)',
            }}>
              Ingresa el codigo que te compartio el artista
            </p>

            {/* Code Input */}
            <form onSubmit={handleSubmit}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                justifyContent: 'center',
                marginBottom: '16px',
              }}>
                <span style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--text-muted, #888)',
                  fontFamily: 'monospace',
                }}>PRV-</span>

                <input
                  ref={input1Ref}
                  type="text"
                  value={part1}
                  onChange={handlePart1}
                  onKeyDown={handleKeyDown1}
                  onPaste={handlePaste}
                  maxLength={3}
                  placeholder="___"
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  style={{
                    width: '60px',
                    textAlign: 'center',
                    fontSize: '18px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    letterSpacing: '2px',
                    padding: '8px 4px',
                    borderRadius: '8px',
                    border: '1px solid var(--border, #3a3a4a)',
                    background: 'var(--surface, #15151c)',
                    color: 'var(--accent, #a78bfa)',
                    outline: 'none',
                    textTransform: 'uppercase',
                  }}
                />

                <span style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--text-muted, #666)',
                }}>-</span>

                <input
                  ref={input2Ref}
                  type="text"
                  value={part2}
                  onChange={handlePart2}
                  onKeyDown={handleKeyDown2}
                  maxLength={3}
                  placeholder="___"
                  autoComplete="off"
                  spellCheck={false}
                  style={{
                    width: '60px',
                    textAlign: 'center',
                    fontSize: '18px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    letterSpacing: '2px',
                    padding: '8px 4px',
                    borderRadius: '8px',
                    border: '1px solid var(--border, #3a3a4a)',
                    background: 'var(--surface, #15151c)',
                    color: 'var(--accent, #a78bfa)',
                    outline: 'none',
                    textTransform: 'uppercase',
                  }}
                />
              </div>

              {/* Error message */}
              {(status === 'error' || status === 'rate_limited') && (
                <p style={{
                  textAlign: 'center',
                  fontSize: '12px',
                  color: status === 'rate_limited' ? '#f59e0b' : '#ef4444',
                  margin: '0 0 12px',
                }}>
                  {errorMsg}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={!canSubmit}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: canSubmit ? 'var(--accent, #a78bfa)' : 'var(--surface, #2a2a35)',
                  color: canSubmit ? '#fff' : 'var(--text-muted, #666)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                  transition: 'background 0.2s ease',
                }}
              >
                {status === 'loading' ? 'Verificando...' : 'Desbloquear'}
              </button>
            </form>
          </>
        ) : (
          /* Success — Show the NSFW Commission Card */
          <div>
            <h3 style={{
              margin: '0 0 12px',
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--text, #eee)',
              textAlign: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:'6px'}}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>Comision desbloqueada
            </h3>
            <NsfwCommissionCard task={task} />
          </div>
        )}
      </div>
    </div>
  )
}
