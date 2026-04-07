import { listKeys, createKey, revokeKey, getStats } from '../services/apiKeys.js'
import { requireAdmin } from '../middleware/auth.js'

export async function adminRoutes(fastify) {
  const hook = { preHandler: requireAdmin }

  fastify.get('/admin/keys', hook, async () => ({ keys: listKeys() }))

  fastify.post('/admin/keys', {
    ...hook,
    schema: {
      body: {
        type: 'object',
        properties: { name: { type: 'string' } }
      }
    }
  }, async (request, reply) => {
    const key = createKey(request.body?.name)
    return reply.code(201).send(key)
  })

  fastify.delete('/admin/keys/:id', hook, async (request, reply) => {
    const deleted = revokeKey(request.params.id)
    if (!deleted) return reply.code(404).send({ error: 'Key não encontrada' })
    return { success: true }
  })

  fastify.get('/admin/stats', hook, async () => getStats())
}
