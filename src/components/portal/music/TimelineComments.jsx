import React, { useState } from 'react'
import './music.css'

/**
 * TimelineComments — a small composer + list of comments anchored to a time.
 * Rendering of the markers themselves is handled by WaveformPlayer (markers prop);
 * this component provides the "add comment at current time" UI and the list.
 *
 * Props:
 *  - comments: [{ id, time_sec, author, text, sticker, status }]
 *  - currentTime: number (sec) — where a new comment will be anchored
 *  - onAdd({ timeSec, text, sticker })
 *  - onDelete(id)          // owner only
 *  - onModerate(id, status) // owner only ('approved'|'hidden')
 *  - canModerate: boolean
 *  - accent
 */
export default function TimelineComments({
  comments = [], currentTime = 0, onAdd, onDelete, onModerate, canModerate = false, accent = '#22C55E',
}) {
  const [text, setText] = useState('')

  const fmt = (s) => { const m = Math.floor(s / 60); const ss = Math.floor(s % 60); return `${m}:${ss.toString().padStart(2, '0')}` }

  function submit(e) {
    e.preventDefault()
    const t = text.trim()
    if (!t) return
    onAdd?.({ timeSec: currentTime, text: t.slice(0, 500), sticker: null })
    setText('')
  }

  return (
    <div className="tc-wrap">
      {onAdd && (
        <form className="tc-composer" onSubmit={submit}>
          <span className="tc-at" style={{ color: accent }}>@ {fmt(currentTime)}</span>
          <input
            className="tc-input"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Comentar en este momento…"
            maxLength={500}
            aria-label="Comentario"
          />
          <button className="tc-send" type="submit" style={{ background: accent }}>Comentar</button>
        </form>
      )}

      <ul className="tc-list">
        {comments.length === 0 && <li className="tc-empty">Sin comentarios todavía.</li>}
        {comments.map(c => (
          <li key={c.id} className={`tc-item ${c.status === 'pending' ? 'tc-item--pending' : ''} ${c.status === 'hidden' ? 'tc-item--hidden' : ''}`}>
            <span className="tc-time" style={{ color: accent }}>{fmt(c.time_sec)}</span>
            <div className="tc-body">
              <span className="tc-author">{c.author || 'Anónimo'}</span>
              {c.text && <span className="tc-text">{c.text}</span>}
              {c.sticker?.thumbUrl && <img className="tc-sticker" src={c.sticker.thumbUrl} alt="sticker" />}
              {c.status === 'pending' && <span className="tc-badge">pendiente</span>}
            </div>
            {canModerate && (
              <div className="tc-actions">
                {c.status !== 'approved' && <button onClick={() => onModerate?.(c.id, 'approved')} title="Aprobar">✓</button>}
                {c.status !== 'hidden' && <button onClick={() => onModerate?.(c.id, 'hidden')} title="Ocultar">⦸</button>}
                <button onClick={() => onDelete?.(c.id)} title="Borrar">✕</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
