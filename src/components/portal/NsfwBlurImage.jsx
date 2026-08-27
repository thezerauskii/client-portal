import React, { useState, useCallback } from 'react'

/**
 * NsfwBlurImage — Image with blur(20px) that reveals on click after confirmation.
 * State is in-memory only (resets on page reload).
 */
export default function NsfwBlurImage({ src, alt = '' }) {
  const [revealed, setRevealed] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const handleClick = useCallback(() => {
    if (revealed) return
    setConfirming(true)
  }, [revealed])

  const handleConfirm = useCallback(() => {
    setRevealed(true)
    setConfirming(false)
  }, [])

  const handleCancel = useCallback(() => {
    setConfirming(false)
  }, [])

  return (
    <div className="nsfw-blur-image-container" style={{ position: 'relative' }}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onClick={handleClick}
        style={{
          width: '100%',
          borderRadius: '8px',
          filter: revealed ? 'blur(0)' : 'blur(20px)',
          transition: 'filter 0.3s ease',
          cursor: revealed ? 'default' : 'pointer',
          display: 'block',
        }}
      />

      {/* Overlay when blurred */}
      {!revealed && !confirming && (
        <div
          onClick={handleClick}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            cursor: 'pointer',
            background: 'rgba(0,0,0,0.15)',
          }}
        >
          <span style={{
            background: 'rgba(0,0,0,0.7)',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 600,
            padding: '6px 12px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            🔞 Click para revelar
          </span>
        </div>
      )}

      {/* Confirmation dialog overlay */}
      {confirming && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          background: 'rgba(0,0,0,0.8)',
          gap: '10px',
          padding: '12px',
        }}>
          <p style={{
            color: '#fff',
            fontSize: '12px',
            textAlign: 'center',
            margin: 0,
            lineHeight: 1.4,
          }}>
            Este contenido es para adultos.<br />¿Deseas verlo?
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleConfirm}
              style={{
                padding: '5px 14px',
                borderRadius: '6px',
                border: 'none',
                background: 'var(--accent, #a78bfa)',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Si, mostrar
            </button>
            <button
              onClick={handleCancel}
              style={{
                padding: '5px 14px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'transparent',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
