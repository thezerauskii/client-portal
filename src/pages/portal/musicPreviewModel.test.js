/**
 * Tests for musicPreviewModel.js — run with: node --test
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeMusicStudio } from '../../shared/domain/musicStudio.js'
import { buildPreviewModel, hasHeroContent } from './musicPreviewModel.js'

test('empty input yields example content in every section', () => {
  const m = buildPreviewModel(normalizeMusicStudio({}))
  assert.ok(m.hero.__example, 'hero should be example')
  assert.ok(m.gigs.length >= 1 && m.gigs.every(g => g.__example), 'gigs should be example')
  assert.ok(m.comparisons.length >= 1 && m.comparisons.every(c => c.__example), 'comparisons example')
  assert.ok(m.library.length >= 1 && m.library.every(t => t.__example), 'library example')
  assert.ok(m.tools.length >= 1 && m.tools.every(t => t.__example), 'tools example')
  assert.ok(m.testimonials.length >= 1 && m.testimonials.every(t => t.__example), 'testimonials example')
})

test('a real section is preserved while others stay example', () => {
  const real = normalizeMusicStudio({
    gigs: [{ id: 'g1', title: 'Mi gig real', tier: 'basic', price: '50', includes: [] }],
  })
  const m = buildPreviewModel(real)
  // real gigs preserved, not tagged example
  assert.equal(m.gigs.length, 1)
  assert.equal(m.gigs[0].title, 'Mi gig real')
  assert.ok(!m.gigs[0].__example, 'real gig must not be tagged example')
  // other sections still example
  assert.ok(m.tools.every(t => t.__example))
  assert.ok(m.library.every(t => t.__example))
})

test('real hero content is used over example', () => {
  const real = normalizeMusicStudio({ hero: { headline: 'Mi título' } })
  const m = buildPreviewModel(real)
  assert.equal(m.hero.headline, 'Mi título')
  assert.ok(!m.hero.__example, 'real hero must not be tagged example')
})

test('hasHeroContent detects real vs empty hero', () => {
  assert.equal(hasHeroContent({ headline: '', tagline: '', metrics: [] }), false)
  assert.equal(hasHeroContent({ headline: 'X' }), true)
  assert.equal(hasHeroContent({ fiverrUrl: 'https://fiverr.com/x' }), true)
  assert.equal(hasHeroContent({ bgType: 'image', bgUrl: 'http://a/b.jpg' }), true)
})
