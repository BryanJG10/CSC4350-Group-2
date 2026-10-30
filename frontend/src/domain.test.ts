import { describe, expect, it } from 'vitest'
import { aggregate, emptyFilters, filterItems, draftSchema } from './domain'
import { fixtures } from './services/fixtures'

describe('combined search semantics', () => {
  it('ANDs text, hall, station, meal, rating, diet and multiple exclusions', () => {
    const result = filterItems(fixtures, {
      text: ' BOWL ',
      hall: 'patton',
      station: 'plant',
      meal: 'Lunch',
      rating: '4',
      diet: 'Vegan',
      exclude: ['Milk', 'Soy', 'Wheat'],
    })
    expect(result.map(i => i.id)).toEqual(['rice-bowl'])
  })
  it('does not consider unknown allergens or diet to be verified matches', () => {
    expect(filterItems(fixtures, { ...emptyFilters, exclude: ['Milk'] }).map(i => i.id)).not.toContain('daily-bowl')
    expect(filterItems(fixtures, { ...emptyFilters, diet: 'Vegan' }).map(i => i.id)).not.toContain('daily-bowl')
    expect(filterItems(fixtures, emptyFilters).map(i => i.id)).toContain('daily-bowl')
  })
  it('includes unrated items by default but excludes them for minimum ratings', () => {
    expect(filterItems(fixtures, emptyFilters).map(i => i.id)).toContain('vegetables')
    expect(filterItems(fixtures, { ...emptyFilters, rating: '1' }).map(i => i.id)).not.toContain('vegetables')
  })
  it('returns an empty list for incompatible filters', () => {
    expect(filterItems(fixtures, { ...emptyFilters, station: 'grill', diet: 'Vegan', rating: '5' })).toEqual([])
  })
})
describe('rating rules', () => {
  it('weights station averages by review count, not averages of item averages', () => {
    const ids = new Set(fixtures.items.filter(i => i.stationId === 'grill').map(i => i.id))
    expect(aggregate(fixtures.reviews.filter(r => ids.has(r.itemId)))).toEqual({ count: 4, average: 4 })
    expect(aggregate([])).toEqual({ count: 0, average: null })
  })
  it.each([0, 6, 1.5, NaN])('rejects invalid rating %s', rating => {
    expect(draftSchema.safeParse({ rating, text: '', tags: [] }).success).toBe(false)
  })
  it('allows rating-only reviews and rejects excessive text/unsupported tags', () => {
    expect(draftSchema.safeParse({ rating: 4, text: '', tags: [] }).success).toBe(true)
    expect(draftSchema.safeParse({ rating: 4, text: 'a'.repeat(1001), tags: [] }).success).toBe(false)
    expect(draftSchema.safeParse({ rating: 4, text: '', tags: ['Verified allergen free'] }).success).toBe(false)
  })
})
