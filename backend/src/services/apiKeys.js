import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_PATH = join(__dirname, '../../data/api_keys.json')
const FLUSH_DELAY_MS = 3000

// Keys ficam em memória; o disco é a persistência, não a fonte de verdade no caminho quente.
let keys = loadFromDisk()
let dirty = false
let flushTimer = null

function loadFromDisk() {
  if (!existsSync(DATA_PATH)) {
    mkdirSync(dirname(DATA_PATH), { recursive: true })
    writeFileSync(DATA_PATH, '[]', 'utf-8')
    return []
  }
  return JSON.parse(readFileSync(DATA_PATH, 'utf-8'))
}

// Escrita atômica: grava em .tmp e faz rename (atômico no mesmo FS).
// Evita que um crash no meio da escrita corrompa o JSON e derrube todos os requests.
function writeToDisk() {
  const tmp = `${DATA_PATH}.${process.pid}.tmp`
  writeFileSync(tmp, JSON.stringify(keys, null, 2), 'utf-8')
  renameSync(tmp, DATA_PATH)
  dirty = false
}

// Flush debounced e assíncrono: usado no caminho quente (validateKey) pra não
// bloquear o event loop com I/O de disco a cada request.
function scheduleFlush() {
  dirty = true
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    if (dirty) writeToDisk()
  }, FLUSH_DELAY_MS)
  flushTimer.unref?.() // não segura o processo vivo só por causa do timer
}

// Garante que contagens pendentes sejam gravadas ao encerrar.
function flushOnExit() {
  if (dirty) {
    try { writeToDisk() } catch { /* nada a fazer no shutdown */ }
  }
}
process.once('SIGINT', () => { flushOnExit(); process.exit(0) })
process.once('SIGTERM', () => { flushOnExit(); process.exit(0) })
process.once('beforeExit', flushOnExit)

export function listKeys() {
  return keys
}

export function createKey(name) {
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
  writeToDisk() // op de admin (rara): persiste na hora pra não perder a key
  return newKey
}

export function validateKey(key) {
  const found = keys.find(k => k.key === key && k.active)
  if (!found) return null
  found.requestCount++
  found.lastUsed = new Date().toISOString()
  scheduleFlush() // caminho quente: só marca dirty, grava depois em lote
  return found
}

export function revokeKey(id) {
  const idx = keys.findIndex(k => k.id === id)
  if (idx === -1) return false
  keys.splice(idx, 1)
  writeToDisk() // op de admin (rara): persiste na hora
  return true
}

export function getStats() {
  return {
    totalKeys: keys.length,
    activeKeys: keys.filter(k => k.active).length,
    totalRequests: keys.reduce((sum, k) => sum + k.requestCount, 0),
  }
}
