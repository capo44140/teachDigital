import { describe, it, expect, beforeEach, vi } from 'vitest'
import activityService from '../../src/services/activityService.js'

const mockApiService = vi.hoisted(() => ({
  request: vi.fn()
}))

vi.mock('../../src/services/apiService.js', () => ({
  apiService: mockApiService
}))

const ACTIVITY = {
  id: 5,
  title: 'Devoirs de mathématiques',
  description: 'Exercices',
  child_id: 2,
  priority: 'high',
  status: 'active',
  due_date: '2026-10-25T18:00:00.000Z',
  created_at: '2026-10-20T10:00:00.000Z'
}

describe('activityService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApiService.request.mockResolvedValue({ success: true, data: { activities: [] } })
  })

  it('charge les activités depuis l\'API et les garde en cache', async () => {
    mockApiService.request.mockResolvedValue({ success: true, data: { activities: [ACTIVITY] } })

    const activities = await activityService.getActivities()

    expect(mockApiService.request).toHaveBeenCalledWith('/api/activities')
    expect(activities).toEqual([ACTIVITY])
    expect(activityService.activities).toEqual([ACTIVITY])
  })

  it('transmet les filtres à l\'API', async () => {
    await activityService.getActivities({ child_id: 2, status: 'active', search: 'math' })

    expect(mockApiService.request).toHaveBeenCalledWith(
      '/api/activities?child_id=2&status=active&search=math'
    )
  })

  it('crée une activité et convertit une échéance vide en null', async () => {
    mockApiService.request.mockResolvedValue({ success: true, data: { activity: ACTIVITY } })

    const created = await activityService.createActivity({
      title: 'Devoirs',
      child_id: 2,
      priority: 'high',
      due_date: ''
    })

    expect(created).toEqual(ACTIVITY)
    const [, options] = mockApiService.request.mock.calls[0]
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toMatchObject({ title: 'Devoirs', child_id: 2, due_date: null })
  })

  it('met à jour une activité avec PUT', async () => {
    mockApiService.request.mockResolvedValue({ success: true, data: { activity: { ...ACTIVITY, status: 'completed' } } })

    const updated = await activityService.updateActivity(5, { status: 'completed' })

    expect(updated.status).toBe('completed')
    expect(mockApiService.request).toHaveBeenCalledWith('/api/activities/5', expect.objectContaining({ method: 'PUT' }))
  })

  it('supprime une activité', async () => {
    mockApiService.request.mockResolvedValue({ success: true })

    await expect(activityService.deleteActivity(5)).resolves.toBe(true)
    expect(mockApiService.request).toHaveBeenCalledWith('/api/activities/5', { method: 'DELETE' })
  })

  it('calcule les statistiques à partir des activités', async () => {
    mockApiService.request.mockResolvedValue({
      success: true,
      data: {
        activities: [
          ACTIVITY,
          { ...ACTIVITY, id: 6, status: 'completed', priority: 'low', due_date: '2020-01-01T00:00:00.000Z' }
        ]
      }
    })

    const stats = await activityService.getActivityStats()

    expect(stats).toMatchObject({ total: 2, active: 1, completed: 1, high_priority: 1, completion_rate: 50 })
  })
})
