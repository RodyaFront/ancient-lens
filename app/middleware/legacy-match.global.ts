export default defineNuxtRouteMiddleware((to) => {
  const isLocaleRoot =
    to.path === '/' || /^\/[a-z]{2}$/i.test(to.path.replace(/\/$/, ''))

  if (!isLocaleRoot) {
    return
  }

  const matchId = to.query.match
  if (typeof matchId !== 'string' || !/^\d+$/.test(matchId)) {
    return
  }

  const query: Record<string, string> = {}
  if (to.query.snapshot === '1') {
    query.snapshot = '1'
  }

  const localePath = useLocalePath()
  return navigateTo({
    path: localePath({ name: 'match-id', params: { id: matchId } }),
    query,
  })
})
