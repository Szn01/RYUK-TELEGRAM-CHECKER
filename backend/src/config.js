import 'dotenv/config'
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const DEFAULT_DATA_DIR = process.env.DATA_DIR || join(__dirname, '../data')

let currentDataDir = DEFAULT_DATA_DIR
let settingsFilePath = join(currentDataDir, 'settings.json')

const state = {
  port: parseInt(process.env.PORT || '3000', 10),
  defaultConcurrency: parseInt(process.env.DEFAULT_CONCURRENCY || '500', 10),
  maxConcurrency: parseInt(process.env.MAX_CONCURRENCY || '500', 10),
  requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || '8000', 10),
  adminSecret: process.env.ADMIN_SECRET || 'admin123',
  dataDir: currentDataDir,
}

function writeSettingsToDisk() {
  if (!existsSync(currentDataDir)) {
    mkdirSync(currentDataDir, { recursive: true })
  }
  const tmp = `${settingsFilePath}.${process.pid}.tmp`
  const dataToSave = {
    port: state.port,
    defaultConcurrency: state.defaultConcurrency,
    maxConcurrency: state.maxConcurrency,
    requestTimeoutMs: state.requestTimeoutMs,
    adminSecret: state.adminSecret,
  }
  writeFileSync(tmp, JSON.stringify(dataToSave, null, 2), 'utf-8')
  renameSync(tmp, settingsFilePath)
}

export function initSettings(customDataDir) {
  if (customDataDir) {
    currentDataDir = customDataDir
  } else {
    currentDataDir = process.env.DATA_DIR || join(__dirname, '../data')
  }
  state.dataDir = currentDataDir
  settingsFilePath = join(currentDataDir, 'settings.json')

  if (!existsSync(currentDataDir)) {
    mkdirSync(currentDataDir, { recursive: true })
  }

  if (existsSync(settingsFilePath)) {
    try {
      const fileData = JSON.parse(readFileSync(settingsFilePath, 'utf-8'))
      if (typeof fileData.port === 'number') state.port = fileData.port
      if (typeof fileData.defaultConcurrency === 'number') state.defaultConcurrency = fileData.defaultConcurrency
      if (typeof fileData.maxConcurrency === 'number') state.maxConcurrency = fileData.maxConcurrency
      if (typeof fileData.requestTimeoutMs === 'number') state.requestTimeoutMs = fileData.requestTimeoutMs
      if (typeof fileData.adminSecret === 'string' && fileData.adminSecret.trim()) {
        state.adminSecret = fileData.adminSecret
      }
    } catch {
      // Se o arquivo estiver corrompido, grava o estado atual
      writeSettingsToDisk()
    }
  } else {
    writeSettingsToDisk()
  }

  return getSettings()
}

export function getSettings() {
  return {
    port: state.port,
    defaultConcurrency: state.defaultConcurrency,
    maxConcurrency: state.maxConcurrency,
    requestTimeoutMs: state.requestTimeoutMs,
    adminSecret: state.adminSecret,
    dataDir: state.dataDir,
  }
}

export function updateSettings(partial) {
  if (!partial || typeof partial !== 'object') {
    throw new Error('Configurações inválidas')
  }

  if (partial.adminSecret !== undefined) {
    if (typeof partial.adminSecret !== 'string' || !partial.adminSecret.trim()) {
      throw new Error('adminSecret deve ser uma string não vazia')
    }
    state.adminSecret = partial.adminSecret.trim()
  }

  if (partial.defaultConcurrency !== undefined) {
    const val = Number(partial.defaultConcurrency)
    if (isNaN(val) || val < 1) {
      throw new Error('defaultConcurrency deve ser um número maior que 0')
    }
    state.defaultConcurrency = Math.floor(val)
  }

  if (partial.maxConcurrency !== undefined) {
    const val = Number(partial.maxConcurrency)
    if (isNaN(val) || val < 1) {
      throw new Error('maxConcurrency deve ser um número maior que 0')
    }
    state.maxConcurrency = Math.floor(val)
  }

  if (partial.requestTimeoutMs !== undefined) {
    const val = Number(partial.requestTimeoutMs)
    if (isNaN(val) || val < 500) {
      throw new Error('requestTimeoutMs deve ser de no mínimo 500ms')
    }
    state.requestTimeoutMs = Math.floor(val)
  }

  if (partial.port !== undefined) {
    const val = Number(partial.port)
    if (!isNaN(val) && val > 0 && val <= 65535) {
      state.port = Math.floor(val)
    }
  }

  writeSettingsToDisk()
  return getSettings()
}

// Inicializa com os caminhos padrões de inicialização
initSettings()

export const config = new Proxy(state, {
  get(target, prop) {
    return target[prop]
  },
  set(target, prop, value) {
    target[prop] = value
    return true
  }
})
