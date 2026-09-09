import { describe, expect, it } from 'vitest'
import {
  abilityHeadingI18nKey,
  abilityKind,
  isTriggeredAbilityKind,
} from '../../app/utils/itemHover'

describe('abilityKind', () => {
  it('keeps OpenDota use/toggle/upgrade distinct from active', () => {
    expect(abilityKind({ type: 'use', title: 'Plant' })).toBe('use')
    expect(abilityKind({ type: 'toggle', title: 'Unholy Strength' })).toBe(
      'toggle',
    )
    expect(abilityKind({ type: 'upgrade', title: 'Town Portal Scroll' })).toBe(
      'upgrade',
    )
    expect(abilityKind({ type: 'active', title: 'Blink' })).toBe('active')
    expect(abilityKind({ type: 'passive', title: 'Spell Block' })).toBe(
      'passive',
    )
  })

  it('falls back for unknown types', () => {
    expect(abilityKind({ type: 'channel', title: 'Sip' })).toBe('other')
    expect(abilityKind({ title: 'Mystery' })).toBe('other')
  })
})

describe('ability heading keys', () => {
  it('maps named kinds to i18n prefixes', () => {
    expect(abilityHeadingI18nKey('use')).toBe('itemHover.use')
    expect(abilityHeadingI18nKey('toggle')).toBe('itemHover.toggle')
    expect(abilityHeadingI18nKey('upgrade')).toBe('itemHover.upgrade')
    expect(abilityHeadingI18nKey('other')).toBeNull()
  })

  it('treats use/toggle/upgrade as resource-bearing like active', () => {
    expect(isTriggeredAbilityKind('use')).toBe(true)
    expect(isTriggeredAbilityKind('toggle')).toBe(true)
    expect(isTriggeredAbilityKind('upgrade')).toBe(true)
    expect(isTriggeredAbilityKind('passive')).toBe(false)
    expect(isTriggeredAbilityKind('other')).toBe(false)
  })
})
