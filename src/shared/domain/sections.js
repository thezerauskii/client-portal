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
