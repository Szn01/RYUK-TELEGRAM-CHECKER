import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'
import { config } from '../config.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FLUSH_DELAY_MS = 3000

let currentDataDir = config?.dataDir || process.env.DATA_DIR || join(__dirname, '../../data')
let DATA_PATH = join(currentDataDir, 'api_keys.json')

let keys = []
let dirty = false
let flushTimer = null

function loadFromDisk() {
  if (!existsSync(DATA_PATH)) {
    mkdirSync(dirname(DATA_PATH), { recursive: true })
    writeFileSync(DATA_PATH, '[]', 'utf-8')
    return []
  }
  try {
    return JSON.parse(readFileSync(DATA_PATH, 'utf-8'))
  } catch {
    return []
  }
}

export function initApiKeys(customDataDir) {
  if (customDataDir) {
    currentDataDir = customDataDir
  } else {
    currentDataDir = config?.dataDir || process.env.DATA_DIR || join(__dirname, '../../data')
  }
  DATA_PATH = join(currentDataDir, 'api_keys.json')
  keys = loadFromDisk()
  dirty = false
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  return keys
}

// Escrita atômica: grava em .tmp e faz rename (atômico no mesmo FS).
function writeToDisk() {
  if (!existsSync(dirname(DATA_PATH))) {
    mkdirSync(dirname(DATA_PATH), { recursive: true })
  }
  const tmp = `${DATA_PATH}.${process.pid}.tmp`
  writeFileSync(tmp, JSON.stringify(keys, null, 2), 'utf-8')
  renameSync(tmp, DATA_PATH)
  dirty = false
}

// Flush debounced e assíncrono: usado no caminho quente (validateKey)
function scheduleFlush() {
  dirty = true
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    if (dirty) writeToDisk()
  }, FLUSH_DELAY_MS)
  flushTimer.unref?.()
}

function flushOnExit() {
  if (dirty) {
    try { writeToDisk() } catch { /* nada a fazer no shutdown */ }
  }
}
process.once('SIGINT', () => { flushOnExit(); process.exit(0) })
process.once('SIGTERM', () => { flushOnExit(); process.exit(0) })
process.once('beforeExit', flushOnExit)

// Inicialização padrão
initApiKeys()

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
  writeToDisk()
  return newKey
}

export function validateKey(key) {
  const found = keys.find(k => k.key === key && k.active)
  if (!found) return null
  found.requestCount++
  found.lastUsed = new Date().toISOString()
  scheduleFlush()
  return found
}

export function revokeKey(id) {
  const idx = keys.findIndex(k => k.id === id)
  if (idx === -1) return false
  keys.splice(idx, 1)
  writeToDisk()
  return true
}

export function getStats() {
  return {
    totalKeys: keys.length,
    activeKeys: keys.filter(k => k.active).length,
    totalRequests: keys.reduce((sum, k) => sum + k.requestCount, 0),
  }
}
