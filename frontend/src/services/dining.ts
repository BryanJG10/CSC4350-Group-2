import { catalogSchema, draftSchema, reviewSchema, type Catalog, type Review, type ReviewDraft } from '../domain'
import { fixtures } from './fixtures'

export class ServiceError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message)
    this.name = 'ServiceError'
  }
}

export interface DiningService {
  readonly mode: 'mock' | 'http'
  getCatalog(signal?: AbortSignal): Promise<Catalog>
  submitReview(itemId: string, draft: ReviewDraft): Promise<Review>
}
export type Scenario = 'normal' | 'read-failure' | 'submit-failure' | 'session-expired' | 'rate-limited'

/** A fresh instance owns its fixtures. No randomness, network, or persistent reviews. */
export function createMockService({
  delay = 250,
  scenario = 'normal',
}: { delay?: number; scenario?: Scenario } = {}): DiningService {
  const catalog = structuredClone(fixtures)
  let failRead = scenario === 'read-failure'
  let failSubmit = scenario !== 'normal' && scenario !== 'read-failure'
  let sequence = 0
  const pause = () => new Promise(resolve => setTimeout(resolve, delay))
  return {
    mode: 'mock',
    async getCatalog(signal) {
      await pause()
      signal?.throwIfAborted()
      if (failRead) {
        failRead = false
        throw new ServiceError('Sample menu could not load. Try again.')
      }
      return structuredClone(catalog)
    },
    async submitReview(itemId, draft) {
      await pause()
      if (!catalog.items.some(item => item.id === itemId)) throw new ServiceError('This item was not found.', 404)
      const validated = draftSchema.parse(draft)
      if (failSubmit) {
        failSubmit = false
        if (scenario === 'session-expired')
          throw new ServiceError('Session expired. Your draft is kept. Restore the demo session, then try again.', 401)
        if (scenario === 'rate-limited')
          throw new ServiceError('Submission limited. Your draft is kept. Try again when the limit resets.', 429)
        throw new ServiceError('Review could not be submitted. Your draft is kept. Try again.')
      }
      sequence += 1
      const review: Review = {
        ...validated,
        id: `demo-${sequence}`,
        itemId,
        author: 'Demo student',
        createdAt: new Date(Date.UTC(2026, 9, 8, 18, 0, sequence)).toISOString(),
      }
      catalog.reviews.unshift(review)
      return structuredClone(review)
    },
  }
}

/** Proposed contract only: confirm endpoints, sessions and CSRF with Jalen/Wilder. */
export function createHttpService(baseUrl: string, request: typeof fetch = fetch): DiningService {
  async function json(path: string, init?: RequestInit) {
    let response: Response
    try {
      response = await request(`${baseUrl.replace(/\/$/, '')}${path}`, {
        credentials: 'include',
        ...init,
        signal: init?.signal ?? AbortSignal.timeout(15000),
      })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error
      throw new ServiceError('Could not reach the service. Check your connection and try again.')
    }
    if (!response.ok) {
      const messages: Record<number, string> = {
        401: 'Session expired. Your draft is kept. Sign in through the team authentication flow before retrying.',
        403: 'You do not have permission for this action. Your draft is kept.',
        404: 'This item was not found. Return to dining halls.',
        409: 'A review already exists for this visit. Your draft is kept.',
        429: 'Submission limited. Your draft is kept. Wait before trying again.',
      }
      throw new ServiceError(
        messages[response.status] ?? 'The service could not complete this request. Try again.',
        response.status,
      )
    }
    try {
      return (await response.json()) as unknown
    } catch {
      throw new ServiceError('The service returned an invalid response. Try again.')
    }
  }
  return {
    mode: 'http',
    async getCatalog(signal) {
      const result = catalogSchema.safeParse(await json('/catalog', { signal }))
      if (!result.success) throw new ServiceError('The menu response does not match the agreed format.')
      return result.data
    },
    async submitReview(itemId, draft) {
      const body = draftSchema.parse(draft)
      const result = reviewSchema.safeParse(
        await json(`/items/${encodeURIComponent(itemId)}/reviews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
      )
      if (!result.success || result.data.itemId !== itemId)
        throw new ServiceError('The review response could not be verified. Check review history before retrying.')
      return result.data
    },
  }
}

export function configuredService(): DiningService {
  const mode = import.meta.env.VITE_DATA_MODE ?? 'mock'
  if (mode === 'http') return createHttpService(import.meta.env.VITE_API_BASE_URL || '/api')
  if (mode !== 'mock') throw new Error('VITE_DATA_MODE must be mock or http.')
  const scenario = new URLSearchParams(window.location.search).get('scenario')
  const supported: Scenario[] = ['normal', 'read-failure', 'submit-failure', 'session-expired', 'rate-limited']
  return createMockService({ scenario: supported.includes(scenario as Scenario) ? (scenario as Scenario) : 'normal' })
}
