import { describe, expect, it } from 'vitest'
import {
  isSiteNavPathActive,
  normalizeSiteNavPath,
} from '../../app/utils/siteNav'

describe('normalizeSiteNavPath', () => {
  it('normalizes empty and trailing slashes', () => {
    expect(normalizeSiteNavPath('')).toBe('/')
    expect(normalizeSiteNavPath('/')).toBe('/')
    expect(normalizeSiteNavPath('/matches/')).toBe('/matches')
    expect(normalizeSiteNavPath('/uk/matches///')).toBe('/uk/matches')
  })
})

describe('isSiteNavPathActive', () => {
  it('matches exact home paths without siblings', () => {
    expect(isSiteNavPathActive('/', '/', 'exact')).toBe(true)
    expect(isSiteNavPathActive('/uk', '/uk', 'exact')).toBe(true)
    expect(isSiteNavPathActive('/uk/', '/uk', 'exact')).toBe(true)
    expect(isSiteNavPathActive('/matches', '/', 'exact')).toBe(false)
    expect(isSiteNavPathActive('/uk/matches', '/uk', 'exact')).toBe(false)
  })

  it('matches section roots and nested paths', () => {
    expect(isSiteNavPathActive('/matches', '/matches', 'section')).toBe(true)
    expect(isSiteNavPathActive('/matches/', '/matches', 'section')).toBe(true)
    expect(isSiteNavPathActive('/matches/foo', '/matches', 'section')).toBe(
      true,
    )
    expect(isSiteNavPathActive('/uk/matches', '/uk/matches', 'section')).toBe(
      true,
    )
    expect(
      isSiteNavPathActive('/uk/matches/extra', '/uk/matches', 'section'),
    ).toBe(true)
  })

  it('does not treat sibling sections as active', () => {
    expect(isSiteNavPathActive('/saved', '/matches', 'section')).toBe(false)
    expect(isSiteNavPathActive('/uk/saved', '/uk/matches', 'section')).toBe(
      false,
    )
    expect(isSiteNavPathActive('/matches-archive', '/matches', 'section')).toBe(
      false,
    )
  })
})
