import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { createMockService, type DiningService } from './services/dining'

function setup(route = '/', service: DiningService = createMockService({ delay: 0 })) {
  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={[route]}>
      <App service={service} />
    </MemoryRouter>,
  )
  return user
}
describe('student workflows', () => {
  it('navigates hall → station → menu → item and preserves meal selection', async () => {
    const user = setup()
    await user.click(await screen.findByRole('link', { name: 'View Patton hall' }))
    await user.selectOptions(screen.getByLabelText('Meal period'), 'Dinner')
    await user.click(screen.getByRole('link', { name: 'View Plant Kitchen menu' }))
    expect(await screen.findByRole('heading', { name: 'Plant Kitchen · Dinner menu' })).toBeVisible()
    await user.click(screen.getByRole('link', { name: 'Tofu bowl' }))
    expect(await screen.findByRole('heading', { name: 'Tofu bowl' })).toBeVisible()
    await user.click(screen.getByRole('link', { name: 'Back to menu' }))
    expect(screen.getByLabelText('Meal period')).toHaveValue('Dinner')
  })
  it('combines all filters, resets dependent stations, and recovers from no results', async () => {
    const user = setup('/search')
    await screen.findByRole('heading', { name: 'Search & filter menu items' })
    await user.type(screen.getByLabelText('Search term'), 'bowl')
    await user.selectOptions(screen.getByLabelText('Dining hall'), 'patton')
    await user.selectOptions(screen.getByLabelText('Station'), 'plant')
    await user.selectOptions(screen.getByLabelText('Meal period'), 'Lunch')
    await user.selectOptions(screen.getByLabelText('Minimum rating'), '4')
    await user.selectOptions(screen.getByLabelText('Dietary preference'), 'Vegan')
    await user.click(screen.getByLabelText('Milk', { exact: true }))
    await user.click(screen.getByLabelText('Soy', { exact: true }))
    await user.click(screen.getByRole('button', { name: 'Apply filters' }))
    expect(screen.getByRole('status')).toHaveTextContent('1 item matches')
    expect(screen.getByRole('link', { name: 'Vegetable rice bowl' })).toBeVisible()
    await user.selectOptions(screen.getByLabelText('Dining hall'), 'north')
    expect(screen.getByLabelText('Station')).toHaveValue('')
    expect(
      within(screen.getByLabelText('Station')).queryByRole('option', { name: 'Plant Kitchen' }),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Apply filters' }))
    expect(screen.getByRole('heading', { name: 'No matching items' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Clear all filters' }))
    expect(screen.getByRole('status')).toHaveTextContent('8 items match')
  })
  it('requires a rating, retains failed text and tags, retries and updates history', async () => {
    const service = createMockService({ delay: 0, scenario: 'submit-failure' })
    const submit = vi.spyOn(service, 'submitReview')
    const user = setup('/items/chicken-bowl/review', service)
    await user.click(await screen.findByRole('button', { name: 'Submit review' }))
    expect(submit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a rating')
    // Regression: focus must land on the rating so keyboard users can fix it in place.
    expect(screen.getByRole('radio', { name: '1 out of 5' })).toHaveFocus()
    await user.click(screen.getByRole('radio', { name: '5 out of 5' }))
    await user.type(screen.getByLabelText('Your review (optional)'), 'Great vegetables.')
    await user.click(screen.getByLabelText('Would recommend'))
    await user.click(screen.getByRole('button', { name: 'Submit review' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('draft is kept')
    expect(screen.getByLabelText('Your review (optional)')).toHaveValue('Great vegetables.')
    expect(screen.getByLabelText('Would recommend')).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: 'Demo review posted' })).toBeVisible()
    await user.click(screen.getByRole('link', { name: 'View item and reviews' }))
    expect(screen.getByText('Great vegetables.')).toBeVisible()
    expect(screen.getByText('4.5 / 5 · 4 reviews')).toBeVisible()
    expect(sessionStorage.getItem('dining-review-draft:chicken-bowl')).toBeNull()
  })
  it('keeps a draft with no rating across cancel and return', async () => {
    const user = setup('/items/chicken-bowl/review')
    await user.type(await screen.findByLabelText('Your review (optional)'), 'Unfinished draft')
    await user.click(screen.getByRole('link', { name: 'Cancel' }))
    await user.click(screen.getByRole('link', { name: 'Write a review' }))
    expect(screen.getByLabelText('Your review (optional)')).toHaveValue('Unfinished draft')
  })
  it('shows loading, then a recoverable load failure', async () => {
    const user = setup('/', createMockService({ delay: 5, scenario: 'read-failure' }))
    expect(screen.getByRole('status')).toHaveTextContent('Loading')
    expect(await screen.findByRole('alert')).toHaveTextContent('could not load')
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: 'Choose a dining hall' })).toBeVisible()
  })
  it('shows distinct unrated, unscheduled and unknown metadata states', async () => {
    const user = setup('/items/vegetables')
    expect(await screen.findByText('No reviews')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Not scheduled' })).toBeVisible()
    await user.click(screen.getByRole('link', { name: 'Search' }))
    await user.click(screen.getByRole('link', { name: 'Daily bowl' }))
    expect(screen.getByText('Allergen information not provided')).toBeVisible()
  })
})
