/** English-style ordinal for popularity rank labels (1st, 2nd, 3rd, 4th…). */
export function formatOrdinal(n: number): string {
  const abs = Math.abs(Math.trunc(n))
  const mod100 = abs % 100
  if (mod100 >= 11 && mod100 <= 13) {
    return `${abs}th`
  }
  switch (abs % 10) {
    case 1:
      return `${abs}st`
    case 2:
      return `${abs}nd`
    case 3:
      return `${abs}rd`
    default:
      return `${abs}th`
  }
}

export function formatWinRatePercent(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`
}

export function formatAttrGain(base: number, gain: number): string {
  const gainText = Number.isInteger(gain) ? String(gain) : gain.toFixed(1)
  return `${base} +${gainText}`
}

export function formatArmorDisplay(armor: number): string {
  const rounded = Math.round(armor * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)
}

export function formatDamageRange(min: number, max: number): string {
  const a = Math.round(min)
  const b = Math.round(max)
  return a === b ? String(a) : `${a}–${b}`
}

export function formatRegen(n: number): string {
  const rounded = Math.round(n * 10) / 10
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  return `+${text}`
}
