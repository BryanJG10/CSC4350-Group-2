import { useEffect, useId, useRef, type ReactNode, type SelectHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'
import { aggregate, availability, type Catalog, type Item, type Review } from './domain'

export function Heading({ children }: { children: string }) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    document.title = `${children} | Dining Hall Review`
    ref.current?.focus()
  }, [children])
  return (
    <h1 tabIndex={-1} ref={ref}>
      {children}
    </h1>
  )
}
export function Notice({ title, children, error = false }: { title: string; children: ReactNode; error?: boolean }) {
  return (
    <section className={`notice${error ? ' error' : ''}`} role={error ? 'alert' : undefined}>
      <h2>{title}</h2>
      {children}
    </section>
  )
}
/** Label and select are siblings (not nested) so the accessible name is exactly `label`, not the option text. */
export function Select({ label, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} {...props}>
        {children}
      </select>
    </div>
  )
}
export function Rating({ reviews }: { reviews: Review[] }) {
  const { average, count } = aggregate(reviews)
  return (
    <span className="rating">
      {average === null ? 'No reviews' : `${average.toFixed(1)} / 5 · ${count} ${count === 1 ? 'review' : 'reviews'}`}
    </span>
  )
}
export function ItemMetadata({ item }: { item: Item }) {
  return (
    <>
      <p>
        {item.dietary === null
          ? 'Dietary information not provided'
          : item.dietary.length
            ? item.dietary.join(' · ')
            : 'No dietary labels listed'}
      </p>
      <p>
        {item.allergens === null
          ? 'Allergen information not provided'
          : item.allergens.length
            ? `Contains: ${item.allergens.join(', ')}`
            : 'No listed allergens'}
      </p>
    </>
  )
}
export function ItemList({ items, catalog }: { items: Item[]; catalog: Catalog }) {
  return (
    <ul className="item-list">
      {items.map(item => {
        const station = catalog.stations.find(s => s.id === item.stationId)!
        const hall = catalog.halls.find(h => h.id === station.hallId)!
        return (
          <li key={item.id}>
            <div>
              <h2>
                <Link to={`/items/${item.id}`}>{item.name}</Link>
              </h2>
              <p>
                {hall.name} / {station.name} · {item.meal}
              </p>
            </div>
            <div>
              <Rating reviews={catalog.reviews.filter(r => r.itemId === item.id)} />
              <ItemMetadata item={item} />
            </div>
            <div>
              <p>{item.date}</p>
              <p>{availability(item)}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
export function NotFound() {
  return (
    <>
      <Heading>Page not found</Heading>
      <Notice title="This page is unavailable">
        <p>Check the link or choose a dining hall to continue.</p>
        <Link className="button" to="/">
          Return to halls
        </Link>
      </Notice>
    </>
  )
}
