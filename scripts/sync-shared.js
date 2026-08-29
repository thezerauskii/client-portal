/**
 * sync-shared.js — copies the workspace-root shared/domain modules into the
 * portal's src/shared/domain so they stay in sync.
 *
 * The client-portal is a SEPARATE git repo, so it can't import the workspace
 * shared/ folder directly. Run this before building/deploying to pull the
 * latest shared domain code:
 *
 *   node scripts/sync-shared.js
 *
 * The canonical source lives at: <workspace-root>/shared/domain/
 */
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { copyFileSync, mkdirSync, existsSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const portalRoot = join(__dirname, '..')
// workspace root is one level above client-portal
const sharedSrc = join(portalRoot, '..', 'shared', 'domain')
const sharedDest = join(portalRoot, 'src', 'shared', 'domain')

const FILES = ['sections.js', 'stickerGeometry.js', 'telegramUrl.js', 'requestForm.js', 'servicesPricing.js', 'musicStudio.js']

if (!existsSync(sharedSrc)) {
  console.warn(`[sync-shared] Source not found at ${sharedSrc} — skipping (portal keeps its committed copy).`)
  process.exit(0)
}

mkdirSync(sharedDest, { recursive: true })
for (const f of FILES) {
  copyFileSync(join(sharedSrc, f), join(sharedDest, f))
  console.log(`[sync-shared] Synced ${f}`)
}
console.log('[sync-shared] Done.')
