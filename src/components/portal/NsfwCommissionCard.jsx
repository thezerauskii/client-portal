import React, { useMemo } from 'react'
import NsfwBlurImage from './NsfwBlurImage.jsx'

/**
 * NsfwCommissionCard — Renders the unlocked private commission card
 * with blur on images and task metadata.
 */
export default function NsfwCommissionCard({ task }) {
  if (!task) return null

  const images = useMemo(() => {
    if (!task.attachments || !Array.isArray(task.attachments)) return []
    return task.attachments.filter(a => {
      const url = a?.url || a?.src || ''
      return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url) || url.startsWith('data:image') || url.includes('/file/')
    })
  }, [task.attachments])

  const deadlineStr = useMemo(() => {
    if (!task.deadline) return null
    try {
      const d = new Date(task.deadline)
      if (isNaN(d.getTime())) return null
      return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
    } catch { return null }
  }, [task.deadline])

  const stageLabel = {
    new: 'Nueva',
    sketch: 'Boceto',
    lineart: 'Lineart',
    base: 'Color base',
    shade: 'Sombreado',
    render: 'Render',
    review: 'Revision',
    delivered: 'Entregada',
  }

  return (
    <div className="nsfw-commission-card" style={{
      background: 'var(--surface, #15151c)',
      border: '1px solid var(--border, #3a3a4a)',
      borderRadius: '10px',
      padding: '14px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* NSFW Badge */}
      <span style={{
        position: 'absolute',
        top: '8px',
        right: '8px',
        background: 'rgba(239,68,68,0.15)',
        border: '1px solid rgba(239,68,68,0.3)',
        borderRadius: '4px',
        padding: '2px 6px',
        fontSize: '10px',
        fontWeight: 700,
        color: '#ef4444',
      }}>
        🔞 NSFW
      </span>

      {/* Title */}
      <h4 style={{
        margin: '0 0 8px',
        fontSize: '14px',
        fontWeight: 600,
        color: 'var(--text, #eee)',
        paddingRight: '60px',
      }}>
        {task.text}
      </h4>

      {/* Meta pills */}
      <div style={{
        display: 'flex',
        gap: '6px',
        flexWrap: 'wrap',
        marginBottom: images.length > 0 ? '12px' : '0',
      }}>
        {task.stage && (
          <span style={{
            fontSize: '10px',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: '4px',
            background: 'rgba(167,139,250,0.12)',
            color: 'var(--accent, #a78bfa)',
            border: '1px solid rgba(167,139,250,0.2)',
          }}>
            {stageLabel[task.stage] || task.stage}
          </span>
        )}
        {deadlineStr && (
          <span style={{
            fontSize: '10px',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: '4px',
            background: 'rgba(245,158,11,0.12)',
            color: '#f59e0b',
            border: '1px solid rgba(245,158,11,0.2)',
          }}>
            📅 {deadlineStr}
          </span>
        )}
      </div>

      {/* Images with blur */}
      {images.length > 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          {images.map((img, i) => (
            <NsfwBlurImage
              key={i}
              src={img.url || img.src}
              alt={`Adjunto ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
