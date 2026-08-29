/**
 * Tests for the music interaction validators. Run with: node --test
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  validateLike, validatePlay, validateFiverrClick, validateMusicComment,
  isValidTrackId, isValidClientId,
} from './_validation.js'

const AID = '11111111-1111-1111-1111-111111111111'

test('validateLike: valid', () => {
  assert.equal(validateLike({ artistId: AID, trackId: 'trk_abc', clientId: 'c_xyz123' }).valid, true)
})
test('validateLike: rejects bad ids', () => {
  assert.equal(validateLike({ artistId: AID, trackId: 'bad id!', clientId: 'c_x' }).valid, false)
  assert.equal(validateLike({ artistId: '', trackId: 'trk_a', clientId: 'c_x' }).valid, false)
  assert.equal(validateLike({ artistId: AID, trackId: 'trk_a' }).valid, false)
})

test('validatePlay: valid + invalid', () => {
  assert.equal(validatePlay({ artistId: AID, trackId: 'trk_a' }).valid, true)
  assert.equal(validatePlay({ artistId: AID }).valid, false)
})

test('validateFiverrClick: hero and gig targets', () => {
  assert.equal(validateFiverrClick({ artistId: AID, target: 'hero' }).valid, true)
  assert.equal(validateFiverrClick({ artistId: AID, target: 'gig_123' }).valid, true)
  assert.equal(validateFiverrClick({ artistId: AID, target: 'bad target!' }).valid, false)
  assert.equal(validateFiverrClick({ artistId: AID }).valid, false)
})

test('validateMusicComment: valid with text', () => {
  assert.equal(validateMusicComment({ artistId: AID, trackId: 'trk_a', timeSec: 12.5, text: 'buena mezcla' }).valid, true)
})
test('validateMusicComment: rejects empty (no text, no sticker)', () => {
  assert.equal(validateMusicComment({ artistId: AID, trackId: 'trk_a', timeSec: 5, text: '' }).valid, false)
})
test('validateMusicComment: rejects too-long text', () => {
  assert.equal(validateMusicComment({ artistId: AID, trackId: 'trk_a', timeSec: 5, text: 'x'.repeat(501) }).valid, false)
})
test('validateMusicComment: rejects invalid timeSec', () => {
  assert.equal(validateMusicComment({ artistId: AID, trackId: 'trk_a', timeSec: -1, text: 'hi' }).valid, false)
  assert.equal(validateMusicComment({ artistId: AID, trackId: 'trk_a', timeSec: 999999, text: 'hi' }).valid, false)
})
test('validateMusicComment: accepts sticker-only', () => {
  assert.equal(validateMusicComment({ artistId: AID, trackId: 'trk_a', timeSec: 3, sticker: { file_unique_id: 'abc123' } }).valid, true)
})

test('isValidTrackId / isValidClientId bounds', () => {
  assert.equal(isValidTrackId('trk_ok-1'), true)
  assert.equal(isValidTrackId('x'.repeat(200)), false)
  assert.equal(isValidClientId('c_1'), true)
  assert.equal(isValidClientId('has space'), false)
})
