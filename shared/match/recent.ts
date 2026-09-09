export function upsertRecentMatch<T extends { id: string }>(
  list: T[],
  entry: T,
  max: number,
): T[] {
  if (!/^\d{1,16}$/.test(entry.id) || max < 1) {
    return list.slice(0, Math.max(0, max))
  }

  return [entry, ...list.filter((item) => item.id !== entry.id)].slice(0, max)
}
