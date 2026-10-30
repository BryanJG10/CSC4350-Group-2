import { describe, expect, it, vi } from 'vitest'
import { createHttpService, createMockService } from './dining'
import { fixtures } from './fixtures'

const draft = { rating: 5, text: 'Fresh.', tags: [] }
describe('asynchronous mock service', () => {
  it('fails once without writing and supports a successful retry', async () => {
    const service = createMockService({ delay: 0, scenario: 'submit-failure' })
    await expect(service.submitReview('chicken-bowl', draft)).rejects.toThrow('draft is kept')
    expect((await service.getCatalog()).reviews).toHaveLength(fixtures.reviews.length)
    const review = await service.submitReview('chicken-bowl', draft)
    expect((await service.getCatalog()).reviews[0]).toEqual(review)
    expect((await createMockService({ delay: 0 }).getCatalog()).reviews).toHaveLength(fixtures.reviews.length)
  })
  it('retries failed reads and honors cancellation', async () => {
    const service = createMockService({ delay: 0, scenario: 'read-failure' })
    await expect(service.getCatalog()).rejects.toThrow('could not load')
    expect(await service.getCatalog()).toEqual(fixtures)
    await expect(service.getCatalog(AbortSignal.abort())).rejects.toThrow()
  })
})
describe('proposed HTTP adapter', () => {
  it('uses the same contract with cookie credentials and a JSON review body', async () => {
    const response = {
      ...draft,
      id: 'r10',
      itemId: 'chicken-bowl',
      author: 'Student',
      createdAt: '2026-10-08T18:00:00Z',
    }
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(fixtures)))
      .mockResolvedValueOnce(new Response(JSON.stringify(response)))
    const service = createHttpService('/api/', request)
    expect(await service.getCatalog()).toEqual(fixtures)
    expect(await service.submitReview('chicken-bowl', draft)).toEqual(response)
    expect(request).toHaveBeenLastCalledWith(
      '/api/items/chicken-bowl/reviews',
      expect.objectContaining({ method: 'POST', credentials: 'include', body: JSON.stringify(draft) }),
    )
  })
  it.each([401, 403, 404, 409, 429, 500])('reports HTTP %s without claiming success', async status => {
    const service = createHttpService('/api', vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status })))
    await expect(service.submitReview('chicken-bowl', draft)).rejects.toMatchObject({ status })
  })
  it('rejects a catalog whose items point at a missing station', async () => {
    const broken = { ...fixtures, items: [{ ...fixtures.items[0], stationId: 'missing' }] }
    const service = createHttpService(
      '/api',
      vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(broken))),
    )
    await expect(service.getCatalog()).rejects.toThrow('format')
  })
  it('rejects malformed responses and network failures', async () => {
    await expect(
      createHttpService('/api', vi.fn<typeof fetch>().mockResolvedValue(new Response('{}'))).getCatalog(),
    ).rejects.toThrow('format')
    await expect(
      createHttpService('/api', vi.fn<typeof fetch>().mockRejectedValue(new TypeError('offline'))).getCatalog(),
    ).rejects.toThrow('connection')
  })
})
