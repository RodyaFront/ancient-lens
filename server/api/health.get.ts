import { healthResponseSchema } from '#shared/schemas/health'

export default defineEventHandler(() => {
  return healthResponseSchema.parse({
    ok: true,
    service: 'ancient-lens',
  })
})
