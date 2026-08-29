import React, { useState, useMemo, useCallback } from 'react'
import { usePortalContext } from '../../components/portal/PortalDataProvider.jsx'
import { makeDefaultForm, SYSTEM_KEYS, validateAnswer, normalizeForm, fieldsForPage } from '../../shared/domain/requestForm.js'
import { formatPrice as formatServicePrice } from '../../shared/domain/servicesPricing.js'
import '../../styles/portal-request.css'

const API_BASE = import.meta.env.VITE_FUNCTIONS_BASE || '/api'

/* ─── Single field renderer (fillable, no edit controls) ─── */
function FormField({ field, value, onChange, error, uploading, onUpload }) {
  if (field.type === 'section') {
    return <h3 className="preq-section">{field.label}</h3>
  }

  const id = `fld_${field.id}`
  return (
    <div className="preq-field">
      <label className="preq-label" htmlFor={id}>
        {field.label}{field.required && <span className="preq-req"> *</span>}
      </label>
      {field.help && <p className="preq-help">{field.help}</p>}

      {field.type === 'short_text' && (
        <input id={id} className={`preq-input ${error ? 'preq-input--err' : ''}`} value={value || ''} onChange={e => onChange(e.target.value)} />
      )}
      {field.type === 'email' && (
        <input id={id} type="email" className={`preq-input ${error ? 'preq-input--err' : ''}`} value={value || ''} onChange={e => onChange(e.target.value)} placeholder="correo@ejemplo.com" />
      )}
      {field.type === 'long_text' && (
        <textarea id={id} className={`preq-input ${error ? 'preq-input--err' : ''}`} rows={4} value={value || ''} onChange={e => onChange(e.target.value)} />
      )}
      {field.type === 'date' && (
        <input id={id} type="date" className={`preq-input ${error ? 'preq-input--err' : ''}`} value={value || ''} onChange={e => onChange(e.target.value)} />
      )}
      {field.type === 'budget' && (
        <div className="preq-budget">
          <input className="preq-input" type="number" placeholder="Mín" value={value?.min || ''} onChange={e => onChange({ ...value, min: e.target.value })} />
          <span className="preq-budget-sep">—</span>
          <input className="preq-input" type="number" placeholder="Máx" value={value?.max || ''} onChange={e => onChange({ ...value, max: e.target.value })} />
        </div>
      )}
      {field.type === 'select' && (
        <select id={id} className={`preq-input ${error ? 'preq-input--err' : ''}`} value={value || ''} onChange={e => onChange(e.target.value)}>
          <option value="">Selecciona…</option>
          {(field.options || []).map((o, i) => <option key={i} value={o}>{o}</option>)}
        </select>
      )}
      {field.type === 'radio' && (
        <div className="preq-options">
          {(field.options || []).map((o, i) => (
            <label key={i} className="preq-opt">
              <input type="radio" name={id} checked={value === o} onChange={() => onChange(o)} />
              <span>{o}</span>
            </label>
          ))}
        </div>
      )}
      {field.type === 'checkbox' && (
        <div className="preq-options">
          {(field.options || []).map((o, i) => {
            const arr = Array.isArray(value) ? value : []
            return (
              <label key={i} className="preq-opt">
                <input
                  type="checkbox"
                  checked={arr.includes(o)}
                  onChange={() => onChange(arr.includes(o) ? arr.filter(v => v !== o) : [...arr, o])}
                />
                <span>{o}</span>
              </label>
            )
          })}
        </div>
      )}
      {field.type === 'image_upload' && (
        <div className="preq-upload">
          <input
            type="file"
            accept="image/*"
            multiple
            id={id}
            className="preq-upload-input"
            onChange={e => onUpload(field.id, e.target.files)}
            disabled={uploading}
          />
          <label htmlFor={id} className="preq-upload-label">
            {uploading ? 'Subiendo…' : '+ Subir imágenes de referencia'}
          </label>
          {Array.isArray(value) && value.length > 0 && (
            <div className="preq-thumbs">
              {value.map((url, i) => (
                <div key={i} className="preq-thumb">
                  <img src={url} alt={`ref ${i + 1}`} />
                  <button type="button" className="preq-thumb-remove" onClick={() => onChange(value.filter((_, idx) => idx !== i))}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {error && <p className="preq-error">{error}</p>}
    </div>
  )
}

export default function PortalRequest() {
  const { artistId, requestForm, commissionsOpen, commissionsClosedMessage, servicesPricing } = usePortalContext()

  const form = useMemo(() => normalizeForm(requestForm || makeDefaultForm()), [requestForm])
  const status = form.status || (commissionsOpen ? 'open' : 'closed')
  const pages = form.pages || ['Formulario']
  const currency = servicesPricing?.currency || 'USD'

  const [page, setPage] = useState(0)
  const [values, setValues] = useState({})
  const [errors, setErrors] = useState({})
  const [uploadingField, setUploadingField] = useState(null)
  const [tos, setTos] = useState(false)
  const [age, setAge] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(null) // requestId
  const [submitError, setSubmitError] = useState(null)

  const setValue = useCallback((fieldId, val) => {
    setValues(v => ({ ...v, [fieldId]: val }))
    setErrors(e => ({ ...e, [fieldId]: undefined }))
  }, [])

  // Upload reference images to the serverless endpoint
  const handleUpload = useCallback(async (fieldId, fileList) => {
    if (!fileList || fileList.length === 0) return
    setUploadingField(fieldId)
    const existing = Array.isArray(values[fieldId]) ? values[fieldId] : []
    const remaining = 5 - existing.length
    const files = Array.from(fileList).slice(0, remaining)
    const uploaded = []
    for (const file of files) {
      try {
        const dataUrl = await new Promise((resolve, reject) => {
          const r = new FileReader()
          r.onload = () => resolve(r.result)
          r.onerror = reject
          r.readAsDataURL(file)
        })
        const res = await fetch(`${API_BASE}/upload-reference`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ artistId, dataUrl }),
        })
        const data = await res.json()
        if (res.ok && data.url) uploaded.push(data.url)
      } catch { /* skip failed */ }
    }
    setValue(fieldId, [...existing, ...uploaded])
    setUploadingField(null)
  }, [artistId, values, setValue])

  function validateFields(fields) {
    const errs = {}
    for (const field of fields) {
      const err = validateAnswer(field, values[field.id])
      if (err) errs[field.id] = err
    }
    return errs
  }

  function goNext() {
    const errs = validateFields(fieldsForPage(form, page))
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setPage(p => Math.min(p + 1, pages.length - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goPrev() {
    setErrors({})
    setPage(p => Math.max(p - 1, 0))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitError(null)
    const errs = validateFields(form.fields)
    if (form.requireTos && !tos) errs._tos = 'Debes aceptar los términos'
    if (form.requireAge && !age) errs._age = 'Debes confirmar tu edad'
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSubmitting(true)

    // Map system fields to native columns; the rest go to answers
    const payload = { artistId, answers: {} }
    let budget = null
    for (const field of form.fields) {
      const val = values[field.id]
      if (field.system && SYSTEM_KEYS.has(field.system)) {
        if (field.system === 'budget') budget = val
        else if (field.system === 'images') payload.images = Array.isArray(val) ? val : []
        else if (field.system === 'name') payload.name = val || ''
        else if (field.system === 'email') payload.email = val || ''
        else if (field.system === 'description') payload.description = val || ''
        else if (field.system === 'deadline') payload.deadline = val || ''
      } else if (field.type !== 'section') {
        payload.answers[field.id] = { label: field.label, value: val ?? '' }
      }
    }
    if (budget) { payload.budgetMin = budget.min || null; payload.budgetMax = budget.max || null }
    // Fallbacks if the form has no explicit system name/email fields
    if (!payload.name) payload.name = 'Cliente'
    if (!payload.email) { setErrors({ _email: 'Falta un campo de email en el formulario' }); setSubmitting(false); return }

    try {
      const res = await fetch(`${API_BASE}/submit-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setSubmitted(data.requestId)
      } else {
        setSubmitError(data.error || 'No se pudo enviar la solicitud')
      }
    } catch {
      setSubmitError('Error de conexión. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Success screen ───
  if (submitted) {
    return (
      <div className="preq-wrap">
        <div className="preq-success">
          <div className="preq-success-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
          </div>
          <h2>¡Solicitud enviada!</h2>
          <p>Tu número de solicitud es <strong>{submitted}</strong></p>
          <p className="preq-success-sub">El artista revisará tu solicitud y te contactará pronto.</p>
        </div>
      </div>
    )
  }

  const isLastPage = page >= pages.length - 1
  const currentFields = fieldsForPage(form, page)

  // Match the client's chosen service (any radio/select answer that equals a service title)
  // so we can show its minimum price as a hint on the budget field.
  const matchedService = useMemo(() => {
    const services = servicesPricing?.services
    if (!services || !services.length) return null
    for (const f of form.fields) {
      if (f.type === 'radio' || f.type === 'select') {
        const val = values[f.id]
        const found = services.find(s => s.title && s.title === val)
        if (found) return found
      }
    }
    return null
  }, [servicesPricing, form.fields, values])

  return (
    <div className="preq-wrap">
      {form.headerImage && <img src={form.headerImage} alt="" className="preq-header-img" />}
      <div className="preq-header">
        <h1>{form.title}</h1>
        {form.description && <p>{form.description}</p>}
      </div>

      {status !== 'open' && (
        <div className={`preq-banner preq-banner--${status}`}>
          <strong>{status === 'closed' ? 'Comisiones cerradas' : 'Lista de espera'}</strong>
          {(form.statusMessage || commissionsClosedMessage) && <p>{form.statusMessage || commissionsClosedMessage}</p>}
        </div>
      )}

      {status !== 'closed' && (
        <>
          {/* Step indicators */}
          {pages.length > 1 && (
            <div className="preq-steps">
              {pages.map((p, i) => (
                <span key={i} className={`preq-step ${i === page ? 'active' : ''} ${i < page ? 'done' : ''}`}>{p}</span>
              ))}
            </div>
          )}

          {/* Selected service price hint */}
          {matchedService && (
            <div className="preq-price-hint">
              <span className="preq-price-hint-label">{matchedService.title}</span>
              <span className="preq-price-hint-value">
                {formatServicePrice(matchedService, currency)}
              </span>
            </div>
          )}

          <form className="preq-form" onSubmit={handleSubmit}>
            {currentFields.map(field => (
              <FormField
                key={field.id}
                field={field}
                value={values[field.id]}
                onChange={val => setValue(field.id, val)}
                error={errors[field.id]}
                uploading={uploadingField === field.id}
                onUpload={handleUpload}
              />
            ))}

            {/* On last page: consent + submit; otherwise: next/prev */}
            {isLastPage && (
              <>
                {form.requireTos && (
                  <label className="preq-consent">
                    <input type="checkbox" checked={tos} onChange={e => setTos(e.target.checked)} />
                    <span>Acepto los <a href={`/p/${window.location.pathname.split('/p/')[1]?.split('/')[0]}/terms`} target="_blank" rel="noopener noreferrer">Términos de Servicio</a></span>
                  </label>
                )}
                {errors._tos && <p className="preq-error">{errors._tos}</p>}
                {form.requireAge && (
                  <label className="preq-consent">
                    <input type="checkbox" checked={age} onChange={e => setAge(e.target.checked)} />
                    <span>Confirmo que soy mayor de 18 años</span>
                  </label>
                )}
                {errors._age && <p className="preq-error">{errors._age}</p>}
                {errors._email && <p className="preq-error">{errors._email}</p>}
                {submitError && <div className="preq-submit-error">{submitError}</div>}
              </>
            )}

            <div className="preq-nav">
              {page > 0 && <button type="button" className="preq-nav-btn" onClick={goPrev}>← Anterior</button>}
              {!isLastPage
                ? <button type="button" className="preq-nav-btn preq-nav-btn--primary" onClick={goNext}>Siguiente →</button>
                : <button type="submit" className="preq-submit" disabled={submitting}>{submitting ? 'Enviando…' : 'Enviar solicitud'}</button>}
            </div>
          </form>
        </>
      )}
    </div>
  )
}
