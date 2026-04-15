import pLimit from 'p-limit'
import { checkTelegramLink } from '../services/checker.js'
import { requireApiKey } from '../middleware/auth.js'
import { validateKey } from '../services/apiKeys.js'
import { config } from '../config.js'

async function runBatch(links, concurrency) {
  const limit = pLimit(Math.min(concurrency, config.maxConcurrency))
  const start = Date.now()
  const raw = await Promise.all(
    links.map(link => limit(() => checkTelegramLink(link, config.requestTimeoutMs)))
  )
  const results = raw.map(r => ({ ...r, ok: r.status === 'online' }))
  const online = results.filter(r => r.ok).length
  return {
    total: results.length,
    online,
    offline: results.length - online,
    results,
    duration_ms: Date.now() - start,
  }
}

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
      description: 'Verifica múltiplos links do Telegram em paralelo (máx 2000)',
      tags: ['verify'],
      security: [{ apiKey: [] }],
      body: {
        type: 'object',
        required: ['links'],
        properties: {
          links: { type: 'array', items: { type: 'string' }, maxItems: 2000 },
          concurrency: { type: 'integer', minimum: 1, maximum: 500, default: 500 }
        }
      }
    }
  }, async (request, reply) => {
    const { links, concurrency = config.defaultConcurrency } = request.body
    if (!links || links.length === 0) {
      return reply.code(422).send({ error: 'Lista de links vazia' })
    }
    return runBatch(links, concurrency)
  })

  // Endpoint de compatibilidade com Senderzinha
  // Aceita: POST /v1/batch, body { urls: [...] }, header Authorization: Bearer TOKEN
  fastify.post('/v1/batch', async (request, reply) => {
    const authHeader = request.headers['authorization'] || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : request.headers['x-api-key']
    if (!token) return reply.code(401).send({ error: 'Token ausente' })
    const keyData = validateKey(token)
    if (!keyData) return reply.code(401).send({ error: 'API key inválida ou desativada' })

    const { urls, links, concurrency = config.defaultConcurrency } = request.body
    const list = urls || links
    if (!list || list.length === 0) return reply.code(422).send({ error: 'Lista vazia' })

    return runBatch(list, concurrency)
  })
}
