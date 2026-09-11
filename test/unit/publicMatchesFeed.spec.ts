import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.fn()

vi.stubGlobal('$fetch', fetchMock)

describe('fetchPublicMatchesFeed', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  it('returns the proxy list when the edge cache responds', async () => {
    const { fetchPublicMatchesFeed } =
      await import('../../app/utils/publicMatchesFeed')
    fetchMock.mockResolvedValueOnce([
      {
        match_id: 1,
        duration: 1800,
        radiant_team: [1, 2, 3, 4],
        dire_team: [5, 6, 7, 8],
      },
    ])

    const rows = await fetchPublicMatchesFeed()
    expect(rows).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/public-matches')
  })

  it('falls back to OpenDota when the proxy is rate-limited', async () => {
    const { fetchPublicMatchesFeed } =
      await import('../../app/utils/publicMatchesFeed')
    const rateError = Object.assign(new Error('rate'), { statusCode: 429 })
    fetchMock.mockRejectedValueOnce(rateError).mockResolvedValueOnce([
      {
        match_id: 2,
        duration: 2000,
        radiant_team: [1, 2, 3, 4],
        dire_team: [5, 6, 7, 8],
      },
      {
        match_id: 3,
        duration: 0,
        radiant_team: [1],
        dire_team: [2],
      },
    ])

    const rows = await fetchPublicMatchesFeed()
    expect(rows).toHaveLength(1)
    expect(rows[0]?.match_id).toBe(2)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('/api/publicMatches')
  })

  it('does not fall back on unrelated proxy errors', async () => {
    const { fetchPublicMatchesFeed } =
      await import('../../app/utils/publicMatchesFeed')
    const boom = Object.assign(new Error('nope'), { statusCode: 500 })
    fetchMock.mockRejectedValueOnce(boom)

    await expect(fetchPublicMatchesFeed()).rejects.toThrow('nope')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
