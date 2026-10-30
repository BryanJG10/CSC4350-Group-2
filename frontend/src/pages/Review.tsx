import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { Link, useParams } from 'react-router-dom'
import { draftSchema, reviewTags, type Catalog, type Review as ReviewRecord, type ReviewDraft } from '../domain'
import { Heading, Notice, NotFound } from '../components'
import { ServiceError, type DiningService } from '../services/dining'

const blank: ReviewDraft = { rating: 0, text: '', tags: [] }
const draftKey = (id: string) => `dining-review-draft:${id}`
function readDraft(id: string): ReviewDraft {
  try {
    const parsed = draftSchema
      .extend({ rating: z.number().int().min(0).max(5) })
      .safeParse(JSON.parse(sessionStorage.getItem(draftKey(id)) || 'null'))
    return parsed.success ? parsed.data : blank
  } catch {
    return blank
  }
}

export function ReviewPage(props: {
  catalog: Catalog
  service: DiningService
  onPosted: (review: ReviewRecord) => void
}) {
  const { itemId } = useParams()
  const item = props.catalog.items.find(i => i.id === itemId)
  if (!item) return <NotFound />
  return <ReviewForm key={item.id} {...props} itemId={item.id} />
}

function ReviewForm({
  catalog,
  service,
  onPosted,
  itemId,
}: {
  catalog: Catalog
  service: DiningService
  onPosted: (review: ReviewRecord) => void
  itemId: string
}) {
  const item = catalog.items.find(i => i.id === itemId)!
  const station = catalog.stations.find(s => s.id === item.stationId)!
  const hall = catalog.halls.find(h => h.id === station.hallId)!
  const [draft, setDraft] = useState(() => readDraft(itemId))
  const [error, setError] = useState<ServiceError | null>(null)
  const [ratingError, setRatingError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [posted, setPosted] = useState(false)
  const [storageAvailable, setStorageAvailable] = useState(true)
  const lock = useRef(false)
  const ratingRef = useRef<HTMLInputElement>(null)
  const feedbackRef = useRef<HTMLDivElement>(null)

  function updateDraft(update: (current: ReviewDraft) => ReviewDraft) {
    const next = update(draft)
    setDraft(next)
    try {
      sessionStorage.setItem(draftKey(itemId), JSON.stringify(next))
    } catch {
      setStorageAvailable(false)
    }
  }
  // A missing rating focuses the rating group so it can be fixed in place; other outcomes focus the message.
  useEffect(() => {
    if (ratingError) ratingRef.current?.focus()
    else if (error || posted) feedbackRef.current?.focus()
  }, [error, posted, ratingError])

  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lock.current) return
    const parsed = draftSchema.safeParse(draft)
    if (!parsed.success) {
      setRatingError(!Number.isInteger(draft.rating) || draft.rating < 1 || draft.rating > 5)
      setError(new ServiceError(parsed.error.issues[0].message))
      return
    }
    lock.current = true
    setBusy(true)
    setError(null)
    setRatingError(false)
    try {
      const review = await service.submitReview(itemId, parsed.data)
      try {
        sessionStorage.removeItem(draftKey(itemId))
      } catch {
        setStorageAvailable(false)
      }
      onPosted(review)
      setPosted(true)
    } catch (reason) {
      setError(
        reason instanceof ServiceError
          ? reason
          : new ServiceError('Review could not be submitted. Your draft is kept. Try again.'),
      )
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  return (
    <>
      <Heading>Write your review</Heading>
      <p className="intro">
        {item.name} · {hall.name} / {station.name}
      </p>
      {service.mode === 'mock' && (
        <p className="muted">Submitting as Demo student. No real account or eligibility verification is connected.</p>
      )}
      {posted ? (
        <div ref={feedbackRef} tabIndex={-1}>
          <Notice title={service.mode === 'mock' ? 'Demo review posted' : 'Review posted'}>
            <p role="status">
              Your rating and feedback have been added to this item
              {service.mode === 'mock' ? ' for this page session' : ''}.
            </p>
            <Link className="button" to={`/items/${itemId}`}>
              View item and reviews
            </Link>
          </Notice>
        </div>
      ) : (
        <form className="stack" onSubmit={submit} noValidate aria-busy={busy}>
          <fieldset disabled={busy} aria-describedby={ratingError ? 'rating-error' : undefined}>
            <legend>Your rating (required)</legend>
            <div className="choices rating-choices">
              {[1, 2, 3, 4, 5].map(n => (
                <label key={n}>
                  <input
                    ref={n === 1 ? ratingRef : undefined}
                    type="radio"
                    name="rating"
                    value={n}
                    required
                    checked={draft.rating === n}
                    onChange={() => {
                      updateDraft(d => ({ ...d, rating: n }))
                      if (ratingError) setError(null)
                      setRatingError(false)
                    }}
                  />
                  {n} <span className="sr-only">out of 5</span>
                </label>
              ))}
            </div>
            {ratingError && (
              <p id="rating-error" className="error-text">
                Choose a rating from 1 to 5.
              </p>
            )}
          </fieldset>
          <label className="field">
            Your review (optional)
            <textarea
              rows={5}
              maxLength={1000}
              disabled={busy}
              value={draft.text}
              aria-describedby="review-length"
              onChange={e => updateDraft(d => ({ ...d, text: e.target.value }))}
            />
          </label>
          <p id="review-length" className="muted">
            {draft.text.length} / 1,000 characters
          </p>
          <fieldset disabled={busy}>
            <legend>Structured feedback (optional)</legend>
            <div className="choices">
              {reviewTags.map(tag => (
                <label key={tag}>
                  <input
                    type="checkbox"
                    checked={draft.tags.includes(tag)}
                    onChange={e =>
                      updateDraft(d => ({
                        ...d,
                        tags: e.target.checked ? [...d.tags, tag] : d.tags.filter(t => t !== tag),
                      }))
                    }
                  />
                  {tag}
                </label>
              ))}
            </div>
            <p className="muted">These describe your experience; they do not verify menu ingredients.</p>
          </fieldset>
          {error && (
            <div ref={feedbackRef} tabIndex={-1}>
              <Notice title="Review not submitted" error>
                <p>{error.message}</p>
                {error.status === 401 && service.mode === 'mock' && (
                  <button type="button" onClick={() => setError(null)}>
                    Restore demo session
                  </button>
                )}
              </Notice>
            </div>
          )}
          <div className="actions">
            <button
              className="primary"
              type="submit"
              disabled={busy || (error?.status === 401 && service.mode === 'mock')}
            >
              {busy ? 'Submitting…' : error && !ratingError ? 'Try again' : 'Submit review'}
            </button>
            {!busy && (
              <Link className="button" to={`/items/${itemId}`}>
                Cancel
              </Link>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                updateDraft(() => blank)
                setError(null)
                setRatingError(false)
              }}
            >
              Clear draft
            </button>
          </div>
          <p className="muted">
            {storageAvailable
              ? 'Drafts stay in this browser tab until posted or cleared. Cancel keeps your draft.'
              : 'Browser storage is unavailable. Your draft is kept on this page, but leaving or refreshing may lose it.'}
          </p>
        </form>
      )}
    </>
  )
}
