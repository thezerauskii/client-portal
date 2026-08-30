/**
 * musicPreviewModel — pure helpers for the READ-ONLY portal preview.
 *
 * Builds a view model that shows the FULL Estudio de Audio page structure:
 * real data per section when present, example content (tagged __example)
 * when a section is empty. No persistence, no side effects.
 */
import { makeDefaultMusicStudio, makeExamplePreview } from '../../shared/domain/musicStudio.js'

/** True when the hero has any real content worth showing over the example. */
export function hasHeroContent(hero) {
  return !!(hero && (
    hero.headline ||
    hero.tagline ||
    (hero.metrics && hero.metrics.length) ||
    hero.fiverrUrl ||
    (hero.bgType === 'image' && hero.bgUrl)
  ))
}

/**
 * @param {object} real normalized musicStudio (arrays guaranteed by normalizeMusicStudio)
 * @returns {object} preview model with per-section real|example fallback
 */
export function buildPreviewModel(real) {
  const ex = makeDefaultMusicStudio()   // hero + example gigs + a testimonial
  const exp = makeExamplePreview()      // comparator/library/tools/soundcloud examples
  const tag = (arr) => arr.map(x => ({ ...x, __example: true }))
  return {
    ...real,
    hero: hasHeroContent(real.hero) ? real.hero : { ...ex.hero, __example: true },
    gigs: real.gigs.length ? real.gigs : tag(ex.gigs),
    comparisons: real.comparisons.length ? real.comparisons : exp.comparisons,
    library: real.library.length ? real.library : exp.library,
    tools: real.tools.length ? real.tools : exp.tools,
    testimonials: real.testimonials.length ? real.testimonials : tag(ex.testimonials),
    soundcloudUser: real.soundcloudUser || '',
  }
}
