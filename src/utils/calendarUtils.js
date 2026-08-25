/**
 * Shared calendar utility functions.
 * Extracted from CalendarPage.jsx for reuse in the portal calendar.
 */

/** Spanish day names starting Monday */
export const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

/** Spanish month names */
export const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

/**
 * Generate an array of Date objects (and nulls for padding) for a calendar month grid.
 * Week starts on Monday. Month is 0-indexed.
 *
 * @param {number} year
 * @param {number} month - 0-indexed (0 = January)
 * @returns {(Date|null)[]} Array of dates (null = empty leading/trailing cell)
 */
export function getCalendarDays(year, month) {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)

  // Day of week for first day (0=Sun → adjust to Mon-start)
  let startDow = first.getDay() // 0=Sun, 1=Mon, ...
  if (startDow === 0) startDow = 7
  startDow -= 1 // now 0=Mon

  const days = []
  // Fill leading empty days
  for (let i = 0; i < startDow; i++) days.push(null)
  // Fill month days
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d))
  // Fill trailing empty days to complete last row
  while (days.length % 7 !== 0) days.push(null)
  return days
}

/**
 * Check if two dates represent the same calendar day.
 *
 * @param {Date} a
 * @param {Date} b
 * @returns {boolean}
 */
export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/**
 * Parse a deadline string into a Date object. Returns null if invalid.
 *
 * @param {string|null|undefined} str
 * @returns {Date|null}
 */
export function parseDeadline(str) {
  if (!str) return null
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}
