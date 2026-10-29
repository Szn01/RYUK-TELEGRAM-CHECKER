import { listKeys, createKey, revokeKey, getStats } from '../services/apiKeys.js'
import { getSettings, updateSettings } from '../config.js'
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

  fastify.get('/admin/settings', hook, async () => getSettings())

  fastify.put('/admin/settings', {
    ...hook,
    schema: {
      body: {
        type: 'object',
        properties: {
          adminSecret: { type: 'string' },
          defaultConcurrency: { type: 'number' },
          maxConcurrency: { type: 'number' },
          requestTimeoutMs: { type: 'number' },
          port: { type: 'number' },
        }
      }
    }
  }, async (request, reply) => {
    try {
      const updated = updateSettings(request.body)
      return reply.send(updated)
    } catch (err) {
      return reply.code(400).send({ error: err.message })
    }
  })
}
