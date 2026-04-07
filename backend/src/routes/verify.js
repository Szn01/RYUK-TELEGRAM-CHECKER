import pLimit from 'p-limit'
import { checkTelegramLink } from '../services/checker.js'
import { requireApiKey } from '../middleware/auth.js'
import { config } from '../config.js'

export async function verifyRoutes(fastify) {
  fastify.post('/verify/single', {
    preHandler: requireApiKey,
    schema: {
      description: 'Verifica um único link do Telegram',
      tags: ['verify'],
      security: [{ apiKey: [] }],
      body: {
        type: 'object',
        required: ['link'],
        properties: {
          link: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            link: { type: 'string' },
            status: { type: 'string' },
            name: { type: ['string', 'null'] },
            type: { type: ['string', 'null'] },
            checkedAt: { type: 'string' },
            error: { type: ['string', 'null'] },
          }
        }
      }
    }
  }, async (request) => {
    return checkTelegramLink(request.body.link, config.requestTimeoutMs)
  })

  fastify.post('/verify/batch', {
    preHandler: requireApiKey,
    schema: {
      description: 'Verifica múltiplos links do Telegram em paralelo (máx 500)',
      tags: ['verify'],
      security: [{ apiKey: [] }],
      body: {
        type: 'object',
        required: ['links'],
        properties: {
          links: { type: 'array', items: { type: 'string' }, maxItems: 500 },
          concurrency: { type: 'integer', minimum: 1, maximum: 100, default: 50 }
        }
      }
    }
  }, async (request, reply) => {
    const { links, concurrency = config.defaultConcurrency } = request.body
    if (!links || links.length === 0) {
      return reply.code(422).send({ error: 'Lista de links vazia' })
    }
    const limit = pLimit(Math.min(concurrency, config.maxConcurrency))
    const start = Date.now()
    const results = await Promise.all(
      links.map(link => limit(() => checkTelegramLink(link, config.requestTimeoutMs)))
    )
    const online = results.filter(r => r.status === 'online').length
    return {
      total: results.length,
      online,
      offline: results.length - online,
      results,
      duration_ms: Date.now() - start,
    }
  })
}
