import pLimit from 'p-limit'
import { checkTelegramLink } from '../services/checker.js'
import { requireApiKey } from '../middleware/auth.js'
import { validateKey } from '../services/apiKeys.js'
import { config } from '../config.js'

// Escopos de contagem de membros expostos na resposta:
//   'members' (default) → só membros totais (uso principal: contagem em massa)
//   'active'            → só membros ativos (online)
//   'both'              → membros totais + ativos
// O checker sempre calcula os dois; o escopo só decide o que aparece na resposta.
function shapeByScope(result, scope) {
  const { members, membersOnline, ...rest } = result
  if (scope === 'active') return { ...rest, membersOnline }
  if (scope === 'both') return { ...rest, members, membersOnline }
  return { ...rest, members }
}

async function runBatch(links, concurrency, scope) {
  const limit = pLimit(Math.min(concurrency, config.maxConcurrency))
  const start = Date.now()
  const raw = await Promise.all(
    links.map(link => limit(() => checkTelegramLink(link, config.requestTimeoutMs)))
  )
  const online = raw.filter(r => r.status === 'online').length
  const results = raw.map(r => shapeByScope({ ...r, ok: r.status === 'online' }, scope))

  const summary = {
    total: raw.length,
    online,
    offline: raw.length - online,
    results,
    duration_ms: Date.now() - start,
  }
  // Totais agregados prontos para contabilizar em outro sistema (soma só dos online).
  if (scope === 'members' || scope === 'both') {
    summary.totalMembers = raw.reduce((s, r) => s + (r.members || 0), 0)
  }
  if (scope === 'active' || scope === 'both') {
    summary.totalMembersOnline = raw.reduce((s, r) => s + (r.membersOnline || 0), 0)
  }
  return summary
}

const SCOPE_SCHEMA = { type: 'string', enum: ['members', 'active', 'both'], default: 'members' }

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
          link: { type: 'string' },
          scope: SCOPE_SCHEMA
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
            members: { type: ['integer', 'null'] },
            membersOnline: { type: ['integer', 'null'] },
            checkedAt: { type: 'string' },
            error: { type: ['string', 'null'] },
          }
        }
      }
    }
  }, async (request) => {
    const scope = request.body.scope || 'members'
    const result = await checkTelegramLink(request.body.link, config.requestTimeoutMs)
    return shapeByScope(result, scope)
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
          concurrency: { type: 'integer', minimum: 1, maximum: 500, default: 500 },
          scope: SCOPE_SCHEMA
        }
      }
    }
  }, async (request, reply) => {
    const { links, concurrency = config.defaultConcurrency, scope = 'members' } = request.body
    if (!links || links.length === 0) {
      return reply.code(422).send({ error: 'Lista de links vazia' })
    }
    return runBatch(links, concurrency, scope)
  })

  // Endpoint de compatibilidade com Senderzinha
  // Aceita: POST /v1/batch, body { urls: [...] }, header Authorization: Bearer TOKEN
  fastify.post('/v1/batch', async (request, reply) => {
    const authHeader = request.headers['authorization'] || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : request.headers['x-api-key']
    if (!token) return reply.code(401).send({ error: 'Token ausente' })
    const keyData = validateKey(token)
    if (!keyData) return reply.code(401).send({ error: 'API key inválida ou desativada' })

    const { urls, links, concurrency = config.defaultConcurrency, scope = 'members' } = request.body
    const list = urls || links
    if (!list || list.length === 0) return reply.code(422).send({ error: 'Lista vazia' })

    return runBatch(list, concurrency, scope)
  })
}
