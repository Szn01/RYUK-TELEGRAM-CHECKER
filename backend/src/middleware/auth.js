import { validateKey } from '../services/apiKeys.js'
import { config } from '../config.js'

export async function requireApiKey(request, reply) {
  const key = request.headers['x-api-key']
  if (!key) {
    return reply.code(401).send({ error: 'x-api-key obrigatório' })
  }
  const keyData = validateKey(key)
  if (!keyData) {
    return reply.code(401).send({ error: 'API key inválida ou desativada' })
  }
  request.keyData = keyData
}

export async function requireAdmin(request, reply) {
  const secret = request.headers['x-admin-secret']
  if (!secret || secret !== config.adminSecret) {
    return reply.code(401).send({ error: 'x-admin-secret inválido' })
  }
}
