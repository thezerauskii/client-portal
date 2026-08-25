import React from 'react'
import PortalKanbanBoard from '../../components/portal/PortalKanbanBoard.jsx'

/**
 * Commissions portal page.
 * Renders a read-only Kanban board showing the artist's active commissions.
 */
export default function PortalCommissions() {
  return (
    <div style={{ padding: '0' }}>
      <h2 style={{
        margin: '0 0 1rem 0',
        fontSize: '1.1rem',
        fontWeight: 700,
        color: 'var(--text, #e8e8ec)',
      }}>
        Comisiones
      </h2>
      <PortalKanbanBoard />
    </div>
  )
}
