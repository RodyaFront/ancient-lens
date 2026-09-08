export default defineNuxtRouteMiddleware((to) => {
  if (to.path !== '/') {
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

  return navigateTo({
    path: `/match/${matchId}`,
    query,
  })
})
