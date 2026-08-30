/**
 * Shared domain: fixed kanban section IDs.
 *
 * SINGLE SOURCE OF TRUTH — these UUIDs are used as task parent_id values
 * across the Electron app and the client portal. Changing an ID here breaks
 * the mapping in BOTH apps, so keep them in sync.
 *
 * Pure data — no imports, safe for Node (Vercel API), browser, and Electron.
 */

export const SECTION_IDS = {
  BACKLOG: '6d74847d-beda-45fb-ac99-63c52212dfec',
  NEW: '02ee79a6-abd7-436f-938b-4386c520e203',
  IN_PROGRESS: 'd02c3d13-e87b-4b43-83b6-7407e689a32e',
  IN_REVIEW: 'b5f9edcb-6fd0-4f89-a15d-9eb710ae37a0',
}

/** The "En Revisión" section — used for the portal stats "in review" count. */
export const REVIEW_SECTION_ID = SECTION_IDS.IN_REVIEW

/** Default labels for the fixed sections (Spanish). */
export const SECTION_DEFAULT_LABELS = {
  [SECTION_IDS.BACKLOG]: 'Backlog y Proyectos',
  [SECTION_IDS.NEW]: 'Comisiones Nuevas',
  [SECTION_IDS.IN_PROGRESS]: 'comisiones en progreso',
  [SECTION_IDS.IN_REVIEW]: 'En Revisión',
}

/**
 * Sections that count as "active commissions".
 * Excludes Backlog (planning/ideas, not active work) and any completed/archived task.
 * Used by BOTH the Electron studio header and the public portal so the numbers match.
 */
export const ACTIVE_SECTION_IDS = [
  SECTION_IDS.NEW,
  SECTION_IDS.IN_PROGRESS,
  SECTION_IDS.IN_REVIEW,
]

/** All fixed section UUIDs, for O(1) "is this row a panel/section?" checks. */
export const ALL_SECTION_IDS = [
  SECTION_IDS.BACKLOG,
  SECTION_IDS.NEW,
  SECTION_IDS.IN_PROGRESS,
  SECTION_IDS.IN_REVIEW,
]

/**
 * Returns true if the row is a PANEL/section/column rather than a real card.
 * A card is only a card if it is NOT itself a section. We detect a section by:
 *  - its id being one of the fixed section UUIDs, OR
 *  - an explicit discriminator on the row (is_section / type === 'section').
 * This makes the active-commission count robust even if a panel row was
 * accidentally saved with an active parent_id (nesting), so we never count
 * panels as commissions — only the cards (tarjetas) inside them.
 *
 * @param {{ id?: string, is_section?: boolean, isSection?: boolean, type?: string }} row
 * @returns {boolean}
 */
export function isPanelRow(row) {
  if (!row) return false
  if (row.is_section === true || row.isSection === true) return true
  if (row.type === 'section' || row.type === 'panel' || row.type === 'column') return true
  if (row.id && ALL_SECTION_IDS.includes(row.id)) return true
  return false
}

/**
 * Returns true if a task counts as an active commission.
 * A task must: be a real CARD (not a panel/section row), live inside an active
 * workflow section (not Backlog), not be completed, and not be archived.
 * Section rows (parent_id null) and portfolio items are naturally excluded
 * because they lack an active parent; panel rows with an accidental active
 * parent are excluded explicitly via isPanelRow.
 *
 * @param {{ id?: string, parent_id?: string, parentId?: string, completed_state?: boolean, completed?: boolean, archived?: boolean, is_section?: boolean, type?: string }} task
 * @returns {boolean}
 */
export function isActiveCommission(task) {
  if (!task) return false
  if (isPanelRow(task)) return false // never count panels/columns, only cards
  const parent = task.parent_id ?? task.parentId ?? null
  const completed = task.completed_state ?? task.completed ?? false
  const archived = task.archived ?? false
  return ACTIVE_SECTION_IDS.includes(parent) && !completed && !archived
}
