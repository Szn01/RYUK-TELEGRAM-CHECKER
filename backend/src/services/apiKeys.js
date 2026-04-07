import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_PATH = join(__dirname, '../../data/api_keys.json')

function load() {
  if (!existsSync(DATA_PATH)) {
    mkdirSync(dirname(DATA_PATH), { recursive: true })
    writeFileSync(DATA_PATH, '[]', 'utf-8')
    return []
  }
  return JSON.parse(readFileSync(DATA_PATH, 'utf-8'))
}

function save(keys) {
  writeFileSync(DATA_PATH, JSON.stringify(keys, null, 2), 'utf-8')
}

export function listKeys() {
  return load()
}

export function createKey(name) {
  const keys = load()
  const newKey = {
    id: randomUUID(),
    key: `tk_${randomUUID().replace(/-/g, '')}`,
    name: name || 'Sem nome',
    active: true,
    createdAt: new Date().toISOString(),
    requestCount: 0,
    lastUsed: null,
  }
  keys.push(newKey)
  save(keys)
  return newKey
}

export function validateKey(key) {
  const keys = load()
  const found = keys.find(k => k.key === key && k.active)
  if (!found) return null
  found.requestCount++
  found.lastUsed = new Date().toISOString()
  save(keys)
  return found
}

export function revokeKey(id) {
  const keys = load()
  const idx = keys.findIndex(k => k.id === id)
  if (idx === -1) return false
  keys.splice(idx, 1)
  save(keys)
  return true
}

export function getStats() {
  const keys = load()
  return {
    totalKeys: keys.length,
    activeKeys: keys.filter(k => k.active).length,
    totalRequests: keys.reduce((sum, k) => sum + k.requestCount, 0),
  }
}
