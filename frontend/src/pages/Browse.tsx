import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { demoDate, meals, type Catalog } from '../domain'
import { Heading, ItemList, Notice, NotFound, Rating, Select } from '../components'

export function Halls({ catalog }: { catalog: Catalog }) {
  const [text, setText] = useState('')
  const navigate = useNavigate()
  return (
    <>
      <Heading>Choose a dining hall</Heading>
      <p className="intro">Explore the sample menu and see what students think.</p>
      <form
        className="stack"
        onSubmit={event => {
          event.preventDefault()
          navigate(`/search?text=${encodeURIComponent(text)}`)
        }}
      >
        <label className="field">
          Search menu items
          <input
            value={text}
            onChange={event => setText(event.target.value)}
            placeholder="Search by item name"
            type="search"
          />
        </label>
        <div>
          <button type="submit">Search</button>
        </div>
      </form>
      <div className="cards halls">
        {catalog.halls.map(hall => (
          <section className="card" key={hall.id}>
            <h2>{hall.name}</h2>
            <p>Browse stations and menus</p>
            <Link className="button" to={`/halls/${hall.id}`} aria-label={`View ${hall.name} hall`}>
              View hall
            </Link>
          </section>
        ))}
      </div>
      <Notice title="Your next step">
        <p>Choose a hall to view its stations, or search across all three halls.</p>
      </Notice>
    </>
  )
}

export function Stations({ catalog }: { catalog: Catalog }) {
  const { hallId } = useParams()
  const [params, setParams] = useSearchParams()
  const meal = params.get('meal') || 'Lunch'
  const hall = catalog.halls.find(h => h.id === hallId)
  if (!hall) return <NotFound />
  const stations = catalog.stations.filter(s => s.hallId === hall.id)
  return (
    <>
      <Heading>{`${hall.name} · Stations`}</Heading>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Dining halls</Link>
        <span>/ {hall.name}</span>
      </nav>
      <p>{hall.hours ?? 'Hours not provided'}</p>
      <Select label="Meal period" value={meal} onChange={e => setParams({ meal: e.target.value })}>
        {meals.map(m => (
          <option key={m}>{m}</option>
        ))}
      </Select>
      <div className="cards">
        {stations.map(station => {
          const ids = new Set(catalog.items.filter(i => i.stationId === station.id).map(i => i.id))
          return (
            <section className="card" key={station.id}>
              <h2>{station.name}</h2>
              <Rating reviews={catalog.reviews.filter(r => ids.has(r.itemId))} />
              <p>{station.description}</p>
              <Link
                className="button"
                aria-label={`View ${station.name} menu`}
                to={`/stations/${station.id}?meal=${meal}&date=${demoDate}`}
              >
                View menu
              </Link>
            </section>
          )
        })}
      </div>
      {!stations.length && (
        <Notice title="No stations yet">
          <p>Station information has not been supplied for this hall.</p>
        </Notice>
      )}
      <Notice title="Station ratings">
        <p>
          Station scores summarize all reviews of menu items served at that station. The meal selector controls which
          menu you open.
        </p>
      </Notice>
      <Link className="button" to="/">
        Back to dining halls
      </Link>
    </>
  )
}

export function Menu({ catalog }: { catalog: Catalog }) {
  const { stationId } = useParams()
  const [params, setParams] = useSearchParams()
  const station = catalog.stations.find(s => s.id === stationId)
  const meal = params.get('meal') || 'Lunch'
  const date = params.get('date') || demoDate
  if (!station) return <NotFound />
  const hall = catalog.halls.find(h => h.id === station.hallId)!
  const items = catalog.items.filter(i => i.stationId === stationId && i.meal === meal && i.date === date)
  function change(key: string, value: string) {
    const next = new URLSearchParams(params)
    next.set(key, value)
    setParams(next)
  }
  return (
    <>
      <Heading>{`${station.name} · ${meal} menu`}</Heading>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Dining halls</Link>
        <span>/</span>
        <Link to={`/halls/${hall.id}?meal=${meal}`}>{hall.name}</Link>
        <span>/ {station.name}</span>
      </nav>
      <div className="form-grid">
        <label className="field">
          Menu date
          <input type="date" value={date} onChange={e => change('date', e.target.value)} />
        </label>
        <Select label="Meal period" value={meal} onChange={e => change('meal', e.target.value)}>
          {meals.map(m => (
            <option key={m}>{m}</option>
          ))}
        </Select>
      </div>
      <p className="muted">Sample menus are dated October 8, 2026. A listed item may be unscheduled.</p>
      {items.length ? (
        <ItemList items={items} catalog={catalog} />
      ) : (
        <Notice title="No menu for this selection">
          <p>No items are listed for this date and meal period. Choose another date or meal period.</p>
          <button onClick={() => setParams({ date: demoDate, meal: 'Lunch' })}>Show sample lunch</button>
        </Notice>
      )}
      <Link className="button" to={`/halls/${hall.id}?meal=${meal}`}>
        Back to stations
      </Link>
    </>
  )
}
