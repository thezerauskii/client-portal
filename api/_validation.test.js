/**
 * Tests for portal API payload validation.
 * Run with: node --test client-portal/api/_validation.test.js
 * Uses Node's built-in test runner — no external dependencies.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isValidId, validateStickerPayload, isValidStickerKey } from './_validation.js'

// ─── isValidId ────────────────────────────────────────────────────────────
test('isValidId accepts a UUID', () => {
  assert.equal(isValidId('6d74847d-beda-45fb-ac99-63c52212dfec'), true)
})

test('isValidId accepts alphanumeric with underscore', () => {
  assert.equal(isValidId('AgADBAADwqYxG_abc123'), true)
})

test('isValidId rejects empty, non-string, and injection chars', () => {
  assert.equal(isValidId(''), false)
  assert.equal(isValidId(null), false)
  assert.equal(isValidId(123), false)
  assert.equal(isValidId('abc; DROP TABLE tasks'), false)
  assert.equal(isValidId('<script>'), false)
  assert.equal(isValidId('a'.repeat(200)), false) // too long
})

// ─── validateStickerPayload ─────────────────────────────────────────────────
test('valid sticker payload passes', () => {
  const r = validateStickerPayload({
    file_unique_id: 'AgADBAAD123',
    file_id: 'CAACAgIAAxkBAAEB',
    emoji: '😀',
    thumbUrl: 'https://api.telegram.org/file/bot123/thumb.webp',
    is_video: false,
  })
  assert.equal(r.valid, true)
})

test('sticker payload with minimal fields passes', () => {
  const r = validateStickerPayload({ file_unique_id: 'abc123' })
  assert.equal(r.valid, true)
})

test('sticker payload with empty thumbUrl passes', () => {
  const r = validateStickerPayload({ file_unique_id: 'abc123', thumbUrl: '' })
  assert.equal(r.valid, true)
})

test('rejects missing file_unique_id', () => {
  assert.equal(validateStickerPayload({}).valid, false)
})

test('rejects malformed file_unique_id', () => {
  assert.equal(validateStickerPayload({ file_unique_id: 'a b c' }).valid, false)
  assert.equal(validateStickerPayload({ file_unique_id: '../../etc' }).valid, false)
})

test('rejects non-telegram thumbUrl (XSS / phishing vector)', () => {
  const r = validateStickerPayload({
    file_unique_id: 'abc123',
    thumbUrl: 'https://evil.com/steal.js',
  })
  assert.equal(r.valid, false)
  assert.equal(r.error, 'Invalid thumbUrl')
})

test('rejects javascript: thumbUrl', () => {
  const r = validateStickerPayload({
    file_unique_id: 'abc123',
    thumbUrl: 'javascript:alert(1)',
  })
  assert.equal(r.valid, false)
})

test('rejects oversized emoji', () => {
  const r = validateStickerPayload({
    file_unique_id: 'abc123',
    emoji: 'x'.repeat(100),
  })
  assert.equal(r.valid, false)
})

test('rejects oversized file_id', () => {
  const r = validateStickerPayload({
    file_unique_id: 'abc123',
    file_id: 'x'.repeat(600),
  })
  assert.equal(r.valid, false)
})

test('rejects non-boolean is_video', () => {
  const r = validateStickerPayload({ file_unique_id: 'abc123', is_video: 'yes' })
  assert.equal(r.valid, false)
})

// ─── isValidStickerKey ───────────────────────────────────────────────────────
test('isValidStickerKey accepts proper key', () => {
  assert.equal(isValidStickerKey('__sticker__AgADBAAD123'), true)
})

test('isValidStickerKey rejects keys without prefix or with injection', () => {
  assert.equal(isValidStickerKey('AgADBAAD123'), false)
  assert.equal(isValidStickerKey('__sticker__a b'), false)
  assert.equal(isValidStickerKey('__sticker__' + 'x'.repeat(200)), false)
  assert.equal(isValidStickerKey(null), false)
})

// ─── validateRequestSubmission ────────────────────────────────────────────
import { validateRequestSubmission, validateImageUpload } from './_validation.js'

test('valid request submission passes', () => {
  const r = validateRequestSubmission({
    artistId: '6d74847d-beda-45fb-ac99-63c52212dfec',
    name: 'Juan',
    email: 'juan@example.com',
    description: 'Quiero un dibujo de mi personaje',
    answers: { f_type: { label: 'Tipo', value: 'Busto' } },
    images: ['https://x.supabase.co/ref.png'],
  })
  assert.equal(r.valid, true)
})

test('rejects invalid email', () => {
  const r = validateRequestSubmission({ artistId: 'abc', name: 'Juan', email: 'not-an-email' })
  assert.equal(r.valid, false)
})

test('rejects missing name', () => {
  const r = validateRequestSubmission({ artistId: 'abc', email: 'a@b.com' })
  assert.equal(r.valid, false)
})

test('rejects non-https image url', () => {
  const r = validateRequestSubmission({
    artistId: 'abc', name: 'J', email: 'a@b.com',
    images: ['http://evil.com/x.png'],
  })
  assert.equal(r.valid, false)
})

test('rejects too many images', () => {
  const r = validateRequestSubmission({
    artistId: 'abc', name: 'J', email: 'a@b.com',
    images: Array(6).fill('https://x.co/a.png'),
  })
  assert.equal(r.valid, false)
})

test('rejects oversized answer value', () => {
  const r = validateRequestSubmission({
    artistId: 'abc', name: 'J', email: 'a@b.com',
    answers: { f1: { label: 'x', value: 'z'.repeat(6000) } },
  })
  assert.equal(r.valid, false)
})

// ─── validateImageUpload ──────────────────────────────────────────────────
test('valid png data URL passes', () => {
  const r = validateImageUpload({ artistId: 'abc', dataUrl: 'data:image/png;base64,iVBORw0KGgo=' })
  assert.equal(r.valid, true)
  assert.equal(r.mime, 'image/png')
})

test('rejects non-image data URL', () => {
  const r = validateImageUpload({ artistId: 'abc', dataUrl: 'data:text/html;base64,PHNjcmlwdD4=' })
  assert.equal(r.valid, false)
})

test('rejects missing dataUrl', () => {
  const r = validateImageUpload({ artistId: 'abc' })
  assert.equal(r.valid, false)
})
