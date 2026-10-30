import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { allergens, diets, emptyFilters, filterItems, meals, type Catalog, type Filters } from '../domain'
import { Heading, ItemList, Notice, Select } from '../components'

function readFilters(params: URLSearchParams): Filters {
  return {
    ...emptyFilters,
    ...Object.fromEntries(
      ['text', 'hall', 'station', 'meal', 'rating', 'diet'].map(key => [key, params.get(key) || '']),
    ),
    exclude: params.getAll('exclude'),
  }
}

export function Search({ catalog }: { catalog: Catalog }) {
  const [params, setParams] = useSearchParams()
  const applied = readFilters(params)
  const items = filterItems(catalog, applied)
  return (
    <>
      <Heading>Search & filter menu items</Heading>
      <p className="intro">Find an item across all supported dining halls.</p>
      <FilterForm
        key={params.toString()}
        catalog={catalog}
        initial={applied}
        onApply={filters => {
          const next = new URLSearchParams()
          for (const [key, value] of Object.entries(filters)) {
            if (Array.isArray(value)) value.forEach(v => next.append(key, v))
            else if (value) next.set(key, value)
          }
          setParams(next)
        }}
        onClear={() => setParams({})}
      />
      <p role="status">
        {items.length} {items.length === 1 ? 'item matches' : 'items match'} the applied filters.
      </p>
      {items.length ? (
        <ItemList items={items} catalog={catalog} />
      ) : (
        <Notice title="No matching items">
          <p>No items match these filters. Change your search or clear the filters.</p>
          <button onClick={() => setParams({})}>Clear all filters</button>
        </Notice>
      )}
    </>
  )
}

function FilterForm({
  catalog,
  initial,
  onApply,
  onClear,
}: {
  catalog: Catalog
  initial: Filters
  onApply: (f: Filters) => void
  onClear: () => void
}) {
  const [filters, setFilters] = useState(initial)
  const set = (key: keyof Filters, value: string) =>
    setFilters(f => ({ ...f, [key]: value, ...(key === 'hall' ? { station: '' } : {}) }))
  return (
    <form
      className="stack filter-form"
      onSubmit={e => {
        e.preventDefault()
        onApply(filters)
      }}
    >
      <label className="field">
        Search term
        <input
          type="search"
          placeholder="Search by item name"
          value={filters.text}
          onChange={e => set('text', e.target.value)}
        />
      </label>
      <div className="form-grid three">
        <Select label="Dining hall" value={filters.hall} onChange={e => set('hall', e.target.value)}>
          <option value="">All halls</option>
          {catalog.halls.map(h => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </Select>
        <Select label="Station" value={filters.station} onChange={e => set('station', e.target.value)}>
          <option value="">All stations</option>
          {catalog.stations
            .filter(s => !filters.hall || s.hallId === filters.hall)
            .map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
        </Select>
        <Select label="Meal period" value={filters.meal} onChange={e => set('meal', e.target.value)}>
          <option value="">All meals</option>
          {meals.map(m => (
            <option key={m}>{m}</option>
          ))}
        </Select>
        <Select label="Minimum rating" value={filters.rating} onChange={e => set('rating', e.target.value)}>
          <option value="">Any, including unrated</option>
          {[1, 2, 3, 4, 5].map(n => (
            <option value={n} key={n}>
              {n}+ out of 5
            </option>
          ))}
        </Select>
        <Select label="Dietary preference" value={filters.diet} onChange={e => set('diet', e.target.value)}>
          <option value="">Any diet</option>
          {diets.map(d => (
            <option key={d}>{d}</option>
          ))}
        </Select>
      </div>
      <fieldset>
        <legend>Exclude listed allergens</legend>
        <div className="choices">
          {allergens.map(a => (
            <label key={a}>
              <input
                type="checkbox"
                checked={filters.exclude.includes(a)}
                onChange={e =>
                  setFilters(f => ({
                    ...f,
                    exclude: e.target.checked ? [...f.exclude, a] : f.exclude.filter(v => v !== a),
                  }))
                }
              />
              {a}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="muted">
        Diet and allergen filters exclude items with unknown required metadata. Listed information does not establish
        absence of cross-contact; confirm ingredients with dining staff.
      </p>
      <div className="actions">
        <button type="submit">Apply filters</button>
        <button
          type="button"
          onClick={() => {
            setFilters(emptyFilters)
            onClear()
          }}
        >
          Clear filters
        </button>
      </div>
    </form>
  )
}
