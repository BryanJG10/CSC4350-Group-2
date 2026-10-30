import { Link, useParams } from 'react-router-dom'
import { availability, type Catalog } from '../domain'
import { Heading, ItemMetadata, Notice, NotFound, Rating } from '../components'

export function ItemDetails({ catalog }: { catalog: Catalog }) {
  const { itemId } = useParams()
  const item = catalog.items.find(i => i.id === itemId)
  if (!item) return <NotFound />
  const station = catalog.stations.find(s => s.id === item.stationId)!
  const hall = catalog.halls.find(h => h.id === station.hallId)!
  const reviews = catalog.reviews
    .filter(r => r.itemId === item.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const menuUrl = `/stations/${station.id}?date=${item.date}&meal=${item.meal}`
  return (
    <>
      <Heading>{item.name}</Heading>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Dining halls</Link>
        <span>/</span>
        <Link to={`/halls/${hall.id}`}>{hall.name}</Link>
        <span>/</span>
        <Link to={menuUrl}>{station.name}</Link>
      </nav>
      <div className="cards three item-summary">
        <section className="card">
          <h2>Student rating</h2>
          <Rating reviews={reviews} />
        </section>
        <section className="card">
          <h2>{item.startsAt && item.endsAt ? 'Scheduled' : 'Not scheduled'}</h2>
          <p>
            {item.date} · {item.meal}
          </p>
          <p>{availability(item)}</p>
        </section>
        <section className="card">
          <h2>Menu information</h2>
          <ItemMetadata item={item} />
        </section>
      </div>
      <div className="actions">
        <Link className="button primary" to={`/items/${item.id}/review`}>
          Write a review
        </Link>
      </div>
      <Notice title="About this item">
        <p>{item.description}</p>
        <p>
          Dietary and allergen information comes from menu records. Student feedback below does not change those
          records.
        </p>
      </Notice>
      <section aria-labelledby="reviews-heading">
        <h2 id="reviews-heading">
          Reviews <span className="muted">· Newest first</span>
        </h2>
        {reviews.length ? (
          <ol className="reviews">
            {reviews.map(r => (
              <li key={r.id}>
                <div className="review-meta">
                  <strong>
                    {r.author} · {r.rating} / 5
                  </strong>
                  <time dateTime={r.createdAt}>
                    {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'America/New_York' }).format(
                      new Date(r.createdAt),
                    )}
                  </time>
                </div>
                <p className="review-text">{r.text || 'Rating only; no written review.'}</p>
                {r.tags.length > 0 && <p className="tags">Student feedback: {r.tags.join(' · ')}</p>}
              </li>
            ))}
          </ol>
        ) : (
          <Notice title="No reviews yet">
            <p>Be the first to share feedback about this item.</p>
          </Notice>
        )}
      </section>
      <Link className="button" to={menuUrl}>
        Back to menu
      </Link>
    </>
  )
}
