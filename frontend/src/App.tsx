import { useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes } from 'react-router-dom'
import type { Catalog } from './domain'
import { Heading, Notice, NotFound } from './components'
import { Halls, Menu, Stations } from './pages/Browse'
import { Search } from './pages/Search'
import { ItemDetails } from './pages/Item'
import { ReviewPage } from './pages/Review'
import type { DiningService } from './services/dining'

export default function App({ service }: { service: DiningService }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    service
      .getCatalog(controller.signal)
      .then(data => {
        if (!controller.signal.aborted) setCatalog(data)
      })
      .catch(reason => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'The menu could not load.')
      })
    return () => controller.abort()
  }, [service, attempt])
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main"
        onClick={event => {
          event.preventDefault()
          document.getElementById('main')?.focus()
        }}
      >
        Skip to content
      </a>
      <header>
        <Link to="/" className="brand">
          Dining Hall Review
        </Link>
        <span>Team Deuce · GSU</span>
      </header>
      <div className="mode-notice">
        {service.mode === 'mock' ? (
          <>
            <strong>Sample data · Mock mode</strong>
            <span>Menus and reviews are illustrative. Posted demo reviews reset on refresh.</span>
          </>
        ) : (
          <>
            <strong>HTTP mode · Integration pending</strong>
            <span>API contracts and authentication require team confirmation.</span>
          </>
        )}
      </div>
      <nav className="primary-nav" aria-label="Main navigation">
        <NavLink to="/" end>
          Halls
        </NavLink>
        <NavLink to="/search">Search</NavLink>
      </nav>
      <main id="main" tabIndex={-1}>
        {error ? (
          <>
            <Heading>Menu unavailable</Heading>
            <Notice title="We couldn’t load the menu" error>
              <p>{error}</p>
              <button
                onClick={() => {
                  setError(null)
                  setAttempt(a => a + 1)
                }}
              >
                Try again
              </button>
            </Notice>
          </>
        ) : !catalog ? (
          <p role="status" className="loading">
            Loading dining halls and menus…
          </p>
        ) : (
          <Routes>
            <Route path="/" element={<Halls catalog={catalog} />} />
            <Route path="/halls/:hallId" element={<Stations catalog={catalog} />} />
            <Route path="/stations/:stationId" element={<Menu catalog={catalog} />} />
            <Route path="/search" element={<Search catalog={catalog} />} />
            <Route path="/items/:itemId" element={<ItemDetails catalog={catalog} />} />
            <Route
              path="/items/:itemId/review"
              element={
                <ReviewPage
                  catalog={catalog}
                  service={service}
                  onPosted={review =>
                    setCatalog(current =>
                      current
                        ? { ...current, reviews: [review, ...current.reviews.filter(r => r.id !== review.id)] }
                        : current,
                    )
                  }
                />
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        )}
      </main>
      <footer>
        <p>Dining Hall Review · CSC 4350 · Sprint 2</p>
        {service.mode === 'mock' && (
          <details>
            <summary>Demo scenarios</summary>
            <p>Each link reloads the sample data. Failures happen once so you can retry.</p>
            <div className="scenario-links">
              {[
                ['normal', 'Normal'],
                ['read-failure', 'Menu load failure'],
                ['submit-failure', 'Review failure'],
                ['session-expired', 'Expired session'],
                ['rate-limited', 'Submission limit'],
              ].map(([scenario, name]) => (
                <a
                  key={scenario}
                  href={`?scenario=${scenario}#${scenario === 'read-failure' || scenario === 'normal' ? '/' : '/items/chicken-bowl/review'}`}
                >
                  {name}
                </a>
              ))}
            </div>
          </details>
        )}
      </footer>
    </div>
  )
}
