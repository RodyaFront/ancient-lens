import { describe, expect, it } from 'vitest'
import { toErrorMessage } from '../../shared/utils/toErrorMessage'

describe('toErrorMessage', () => {
  it('returns the message from an Error', () => {
    expect(toErrorMessage(new Error('Broken'))).toBe('Broken')
  })

  it('falls back for unknown values', () => {
    expect(toErrorMessage(null)).toBe('Unknown error')
  })
})
