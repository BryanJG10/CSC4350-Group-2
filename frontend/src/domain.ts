import { z } from 'zod'

export const meals = ['Breakfast', 'Lunch', 'Dinner'] as const
export const diets = ['Vegetarian', 'Vegan'] as const
export const allergens = [
  'Milk',
  'Wheat',
  'Soy',
  'Eggs',
  'Peanuts',
  'Tree nuts',
  'Fish',
  'Shellfish',
  'Sesame',
] as const
export const reviewTags = ['Long wait', 'Shortage', 'Vegan option', 'Would recommend'] as const
export const demoDate = '2026-10-08'

const id = z.string().min(1)
export const hallSchema = z.object({ id, name: z.string(), hours: z.string().nullable() })
export const stationSchema = z.object({ id, hallId: id, name: z.string(), description: z.string() })
export const itemSchema = z.object({
  id,
  stationId: id,
  name: z.string(),
  description: z.string(),
  meal: z.enum(meals),
  date: z.iso.date(),
  startsAt: z.iso.datetime({ offset: true }).nullable(),
  endsAt: z.iso.datetime({ offset: true }).nullable(),
  dietary: z.array(z.enum(diets)).nullable(),
  allergens: z.array(z.enum(allergens)).nullable(),
})
export const draftSchema = z.object({
  rating: z.number().int().min(1, 'Choose a rating from 1 to 5.').max(5),
  text: z.string().trim().max(1000, 'Keep your review to 1,000 characters or fewer.'),
  tags: z.array(z.enum(reviewTags)),
})
export const reviewSchema = draftSchema.extend({ id, itemId: id, author: z.string(), createdAt: z.iso.datetime() })
/** Rejects dangling references so pages can safely look up an item's station and hall. */
export const catalogSchema = z
  .object({
    halls: z.array(hallSchema),
    stations: z.array(stationSchema),
    items: z.array(itemSchema),
    reviews: z.array(reviewSchema),
  })
  .superRefine((catalog, ctx) => {
    const hallIds = new Set(catalog.halls.map(h => h.id))
    const stationIds = new Set(catalog.stations.map(s => s.id))
    const itemIds = new Set(catalog.items.map(i => i.id))
    catalog.stations.forEach((s, i) => {
      if (!hallIds.has(s.hallId))
        ctx.addIssue({ code: 'custom', path: ['stations', i, 'hallId'], message: `Unknown hall ${s.hallId}` })
    })
    catalog.items.forEach((item, i) => {
      if (!stationIds.has(item.stationId))
        ctx.addIssue({ code: 'custom', path: ['items', i, 'stationId'], message: `Unknown station ${item.stationId}` })
    })
    catalog.reviews.forEach((r, i) => {
      if (!itemIds.has(r.itemId))
        ctx.addIssue({ code: 'custom', path: ['reviews', i, 'itemId'], message: `Unknown item ${r.itemId}` })
    })
  })
export type Catalog = z.infer<typeof catalogSchema>
export type Item = z.infer<typeof itemSchema>
export type Review = z.infer<typeof reviewSchema>
export type ReviewDraft = z.infer<typeof draftSchema>
export type Filters = {
  text: string
  hall: string
  station: string
  meal: string
  rating: string
  diet: string
  exclude: string[]
}
export const emptyFilters: Filters = { text: '', hall: '', station: '', meal: '', rating: '', diet: '', exclude: [] }

export function aggregate(reviews: Review[]) {
  return {
    count: reviews.length,
    average: reviews.length ? reviews.reduce((total, r) => total + r.rating, 0) / reviews.length : null,
  }
}

/** Every active constraint is ANDed; unknown metadata never proves a dietary match. */
export function filterItems(catalog: Catalog, filters: Filters) {
  return catalog.items.filter(item => {
    const station = catalog.stations.find(s => s.id === item.stationId)
    const { average } = aggregate(catalog.reviews.filter(r => r.itemId === item.id))
    return (
      item.name.toLowerCase().includes(filters.text.trim().toLowerCase()) &&
      (!filters.hall || station?.hallId === filters.hall) &&
      (!filters.station || item.stationId === filters.station) &&
      (!filters.meal || item.meal === filters.meal) &&
      (!filters.rating || (average !== null && average >= Number(filters.rating))) &&
      (!filters.diet || item.dietary?.some(d => d === filters.diet)) &&
      (!filters.exclude.length ||
        (item.allergens !== null && filters.exclude.every(a => !item.allergens!.some(tag => tag === a))))
    )
  })
}

export function availability(item: Item) {
  if (!item.startsAt || !item.endsAt) return 'Not scheduled'
  const time = (value: string) =>
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }).format(
      new Date(value),
    )
  return `${time(item.startsAt)}–${time(item.endsAt)} ET`
}
