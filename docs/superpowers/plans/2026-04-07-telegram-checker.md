# Telegram Checker — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** API HTTP + painel web para verificar em massa se bots/grupos do Telegram estão online ou offline via scraping HTML de t.me.

**Architecture:** Backend Fastify serve a API REST + arquivos estáticos do frontend React compilado (single process). Detecção feita via undici+cheerio scraping do HTML público de t.me — sem browser headless, sem sessão Telegram. API Keys gerenciadas em JSON file. Admin panel protegido por `ADMIN_SECRET` env var.

**Tech Stack:** Node.js 20, Fastify 4, undici, cheerio, p-limit, @fastify/swagger, @fastify/swagger-ui, @fastify/static, React 18, Vite 5, Tailwind CSS 3, TypeScript (frontend)

---

## File Map

```
C:\Operação\telegram-checker\
├── backend/
│   ├── src/
│   │   ├── server.js          # Fastify bootstrap, plugins, routes
│   │   ├── config.js          # Lê .env, exporta constantes
│   │   ├── middleware/
│   │   │   └── auth.js        # Valida x-api-key e x-admin-secret
│   │   ├── services/
│   │   │   ├── checker.js     # parseLink + checkTelegramLink (undici+cheerio)
│   │   │   └── apiKeys.js     # CRUD de api_keys.json
│   │   └── routes/
│   │       ├── health.js      # GET /health
│   │       ├── verify.js      # POST /verify/single, /verify/batch
│   │       └── admin.js       # GET/POST/DELETE /admin/keys, GET /admin/stats
│   ├── data/
│   │   └── api_keys.json      # Persistência de keys (criado automaticamente)
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx            # Router: / = UserPanel, /admin = AdminPanel
│   │   ├── api/
│   │   │   └── index.ts       # fetch wrapper (baseURL, headers)
│   │   ├── pages/
│   │   │   ├── UserPanel.tsx  # Textarea de links + tabela de resultados
│   │   │   └── AdminPanel.tsx # Login por ADMIN_SECRET + CRUD de keys
│   │   └── components/
│   │       ├── StatusBadge.tsx    # Badge ON/OFF
│   │       ├── ResultsTable.tsx   # Tabela com link, tipo, status, nome
│   │       └── KeysTable.tsx      # Tabela de API keys com contadores
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
└── docs/
    ├── api-sender.md
    └── api-receiver.md
```

---

## Task 1: Scaffold Backend

**Files:**
- Create: `backend/package.json`
- Create: `backend/.env.example`
- Create: `backend/src/config.js`
- Create: `backend/data/.gitkeep`

- [ ] **Step 1: Criar package.json do backend**

```json
{
  "name": "telegram-checker-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js"
  },
  "dependencies": {
    "fastify": "^4.28.1",
    "@fastify/swagger": "^8.15.0",
    "@fastify/swagger-ui": "^4.1.0",
    "@fastify/static": "^7.0.4",
    "@fastify/cors": "^9.0.1",
    "cheerio": "^1.0.0",
    "undici": "^6.21.0",
    "p-limit": "^6.2.0",
    "dotenv": "^16.4.5",
    "uuid": "^10.0.0"
  }
}
```

Salvar em `backend/package.json` e rodar:
```bash
cd "C:/Operação/telegram-checker/backend" && npm install
```

- [ ] **Step 2: Criar .env.example**

```env
PORT=3000
DEFAULT_CONCURRENCY=50
MAX_CONCURRENCY=100
REQUEST_TIMEOUT_MS=8000
ADMIN_SECRET=troca_por_segredo_admin
```

Também criar `frontend/.env.example`:
```env
VITE_API_URL=http://localhost:3000
```

E copiar para `frontend/.env` antes de rodar o dev server.

- [ ] **Step 3: Criar src/config.js**

```js
import 'dotenv/config'

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  defaultConcurrency: parseInt(process.env.DEFAULT_CONCURRENCY || '50', 10),
  maxConcurrency: parseInt(process.env.MAX_CONCURRENCY || '100', 10),
  requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || '8000', 10),
  adminSecret: process.env.ADMIN_SECRET || 'admin123',
}
```

- [ ] **Step 4: Criar data/api_keys.json vazio**

```json
[]
```

- [ ] **Step 5: Commit**

```bash
cd "C:/Operação/telegram-checker"
git init
git add backend/
git commit -m "feat: scaffold backend"
```

---

## Task 2: Core — Checker Service

**Files:**
- Create: `backend/src/services/checker.js`

Esta é a parte mais crítica. A lógica detecta online/offline pelo HTML de `t.me`.

**Regras de detecção (baseadas nos screenshots do VeriUK):**
- Bot **ON**: `.tgme_page_title` tem texto real + botão "START BOT" presente na página
- Bot **OFF**: `.tgme_page_title` ausente/vazio OU botão "SEND MESSAGE" (página genérica "If you have Telegram...")
- Grupo **ON**: `.tgme_page_title` tem texto + `.tgme_page_extra` com contagem de membros
- Grupo **OFF**: HTTP 404, ou sem `.tgme_page_title`, ou erro de rede
- Link `t.me/+HASH`: verificar `.tg_join_link` ou título no HTML da preview

- [ ] **Step 1: Criar backend/src/services/checker.js**

```js
import { request } from 'undici'
import * as cheerio from 'cheerio'

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept': 'text/html,application/xhtml+xml,application/xhtml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Cache-Control': 'no-cache',
}

/**
 * Normaliza qualquer formato de link Telegram para URL canônica.
 * Strip de query params (?start=...) antes de verificar.
 * Retorna { url, username, isInvite }
 */
export function parseLink(raw) {
  if (!raw || typeof raw !== 'string') return null
  let link = raw.trim()

  // Remover query params (?start=xxx etc.) — irrelevantes para verificação
  link = link.split('?')[0].trim()

  // @username → https://t.me/username
  if (link.startsWith('@')) {
    return { url: `https://t.me/${link.slice(1)}`, username: link.slice(1), isInvite: false }
  }

  // Adicionar https:// se faltando
  if (!link.startsWith('http')) {
    link = 'https://' + link
  }

  try {
    const u = new URL(link)
    if (!u.hostname.includes('t.me')) return null

    const path = u.pathname.replace(/^\//, '')
    if (!path) return null

    // t.me/+HASH = link de convite
    const isInvite = path.startsWith('+')

    return { url: `https://t.me/${path}`, username: isInvite ? null : path, isInvite }
  } catch {
    return null
  }
}

/**
 * Verifica se um link do Telegram está online ou offline.
 * Faz GET em https://t.me/{username} e analisa o HTML com cheerio.
 */
export async function checkTelegramLink(rawLink, timeoutMs = 8000) {
  const checkedAt = new Date().toISOString()

  const parsed = parseLink(rawLink)
  if (!parsed) {
    return { link: rawLink, status: 'offline', name: null, type: null, checkedAt, error: 'Link inválido' }
  }

  try {
    const { statusCode, body } = await request(parsed.url, {
      method: 'GET',
      headers: BROWSER_HEADERS,
      bodyTimeout: timeoutMs,
      headersTimeout: timeoutMs,
      maxRedirections: 3,
    })

    const html = await body.text()

    if (statusCode === 404) {
      return { link: rawLink, status: 'offline', name: null, type: null, checkedAt, error: 'Página não encontrada (404)' }
    }

    if (statusCode !== 200) {
      return { link: rawLink, status: 'offline', name: null, type: null, checkedAt, error: `HTTP ${statusCode}` }
    }

    const $ = cheerio.load(html)

    // Link de convite (+HASH) — verificar preview do grupo
    if (parsed.isInvite) {
      const title = $('.tgme_page_title').text().trim()
      if (title) {
        return { link: rawLink, status: 'online', name: title, type: 'group', checkedAt, error: null }
      }
      return { link: rawLink, status: 'offline', name: null, type: 'group', checkedAt, error: 'Grupo inválido ou expirado' }
    }

    const title = $('.tgme_page_title').text().trim()

    if (!title) {
      return { link: rawLink, status: 'offline', name: null, type: null, checkedAt, error: 'Perfil não encontrado' }
    }

    // Detectar tipo: bot vs grupo/canal
    // Bots têm username terminando em _bot OU botão "START BOT" no HTML
    const pageText = html.toLowerCase()
    const hasStartBot = pageText.includes('start bot') || pageText.includes('tgme_action_button_new')
    const usernameIsBot = parsed.username && parsed.username.toLowerCase().endsWith('_bot')
    const isBot = hasStartBot || usernameIsBot

    // Bot OFF: página genérica tem "if you have telegram" sem título real do bot
    // Mas se chegou aqui, title existe, então está ON
    const type = isBot ? 'bot' : 'group'

    // Bot OFF especial: username termina em _bot mas não tem botão "START BOT"
    // Isso acontece quando o bot foi desativado mas a página retorna 200 com título genérico
    if (usernameIsBot && !hasStartBot) {
      return { link: rawLink, status: 'offline', name: null, type: 'bot', checkedAt, error: 'Bot desativado (sem botão START BOT)' }
    }

    return { link: rawLink, status: 'online', name: title, type, checkedAt, error: null }

  } catch (err) {
    const isTimeout = err.code === 'UND_ERR_CONNECT_TIMEOUT' || err.message?.includes('timeout')
    return {
      link: rawLink,
      status: 'offline',
      name: null,
      type: null,
      checkedAt,
      error: isTimeout ? 'Timeout' : (err.message || 'Erro de rede'),
    }
  }
}
```

- [ ] **Step 2: Testar manualmente os links fornecidos**

Criar `backend/test-checker.js` (temporário para validação):

```js
import { checkTelegramLink } from './src/services/checker.js'

const links = [
  // Bots OFF
  'https://t.me/tlAYcwNHCQR',
  'https://t.me/livsc6va5ss3sz_bot',
  // Bot ON
  'https://t.me/IncvIppp1nsua_bot',
  // Grupos OFF
  'https://t.me/RIdrbzdc',
  // Grupos ON
  'https://t.me/RLjT7VCMrK6u5eO',
  // Com query param
  'https://t.me/LiberOmm4eg1fs1_bot?start=OP',
]

for (const link of links) {
  const result = await checkTelegramLink(link)
  console.log(`${result.status.toUpperCase().padEnd(7)} | ${result.type?.padEnd(5) || 'null '} | ${link}`)
}
```

Rodar: `cd backend && node test-checker.js`

Esperado: bots OFF → `offline`, bots ON → `online/bot`, grupos ON → `online/group`

- [ ] **Step 3: Ajustar lógica se necessário baseado nos resultados**

Se algum link ON retornar offline, inspecionar o HTML real:
```js
// Adicionar ao test-checker.js temporariamente:
const { body } = await request('https://t.me/IncvIppp1nsua_bot', { headers: BROWSER_HEADERS })
const html = await body.text()
console.log(html.substring(0, 2000))
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/checker.js
git commit -m "feat: add telegram link checker service (undici+cheerio)"
```

---

## Task 3: API Keys Service

**Files:**
- Create: `backend/src/services/apiKeys.js`

- [ ] **Step 1: Criar backend/src/services/apiKeys.js**

```js
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
  // Incrementar contador
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
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/apiKeys.js
git commit -m "feat: add API keys service (JSON storage)"
```

---

## Task 4: Auth Middleware + Rotas

**Files:**
- Create: `backend/src/middleware/auth.js`
- Create: `backend/src/routes/health.js`
- Create: `backend/src/routes/verify.js`
- Create: `backend/src/routes/admin.js`

- [ ] **Step 1: Criar middleware/auth.js**

```js
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
```

- [ ] **Step 2: Criar routes/health.js**

```js
export async function healthRoutes(fastify) {
  fastify.get('/health', {
    schema: {
      description: 'Status da API',
      tags: ['system'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            uptime: { type: 'number' },
          }
        }
      }
    }
  }, async () => ({
    status: 'ok',
    uptime: process.uptime(),
  }))
}
```

- [ ] **Step 3: Criar routes/verify.js**

```js
import pLimit from 'p-limit'
import { checkTelegramLink } from '../services/checker.js'
import { requireApiKey } from '../middleware/auth.js'
import { config } from '../config.js'

export async function verifyRoutes(fastify) {
  // POST /verify/single
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
          link: { type: 'string', description: 'Link do Telegram (https://t.me/... ou @username)' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            link: { type: 'string' },
            status: { type: 'string', enum: ['online', 'offline'] },
            name: { type: ['string', 'null'] },
            type: { type: ['string', 'null'], description: 'bot | group | null' },
            checkedAt: { type: 'string' },
            error: { type: ['string', 'null'] },
          }
        }
      }
    }
  }, async (request) => {
    const { link } = request.body
    return checkTelegramLink(link, config.requestTimeoutMs)
  })

  // POST /verify/batch
  fastify.post('/verify/batch', {
    preHandler: requireApiKey,
    schema: {
      description: 'Verifica múltiplos links do Telegram em paralelo',
      tags: ['verify'],
      security: [{ apiKey: [] }],
      body: {
        type: 'object',
        required: ['links'],
        properties: {
          links: {
            type: 'array',
            items: { type: 'string' },
            maxItems: 500,
            description: 'Lista de links (máx 500)'
          },
          concurrency: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 50,
            description: 'Requisições simultâneas (máx 100)'
          }
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
    const offline = results.filter(r => r.status === 'offline').length

    return {
      total: results.length,
      online,
      offline,
      results,
      duration_ms: Date.now() - start,
    }
  })
}
```

- [ ] **Step 4: Criar routes/admin.js**

```js
import { listKeys, createKey, revokeKey, getStats } from '../services/apiKeys.js'
import { requireAdmin } from '../middleware/auth.js'

export async function adminRoutes(fastify) {
  const adminHook = { preHandler: requireAdmin }

  fastify.get('/admin/keys', adminHook, async () => ({ keys: listKeys() }))

  fastify.post('/admin/keys', adminHook, async (request, reply) => {
    const { name } = request.body || {}
    const key = createKey(name)
    return reply.code(201).send(key)
  })

  fastify.delete('/admin/keys/:id', adminHook, async (request, reply) => {
    const deleted = revokeKey(request.params.id)
    if (!deleted) return reply.code(404).send({ error: 'Key não encontrada' })
    return { success: true }
  })

  fastify.get('/admin/stats', adminHook, async () => getStats())
}
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/middleware/ backend/src/routes/
git commit -m "feat: add auth middleware and API routes"
```

---

## Task 5: Server Principal (Fastify)

**Files:**
- Create: `backend/src/server.js`

- [ ] **Step 1: Criar backend/src/server.js**

```js
import 'dotenv/config'
import Fastify from 'fastify'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import cors from '@fastify/cors'
import staticPlugin from '@fastify/static'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import { config } from './config.js'
import { healthRoutes } from './routes/health.js'
import { verifyRoutes } from './routes/verify.js'
import { adminRoutes } from './routes/admin.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const fastify = Fastify({ logger: true })

await fastify.register(cors, { origin: true })

await fastify.register(swagger, {
  openapi: {
    info: { title: 'Telegram Checker API', version: '1.0.0' },
    components: {
      securitySchemes: {
        apiKey: { type: 'apiKey', name: 'x-api-key', in: 'header' }
      }
    }
  }
})

await fastify.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: { docExpansion: 'list' }
})

// Registrar rotas da API
await fastify.register(healthRoutes)
await fastify.register(verifyRoutes)
await fastify.register(adminRoutes)

// Servir frontend buildado (se existir)
const frontendDist = join(__dirname, '../../frontend/dist')
if (existsSync(frontendDist)) {
  await fastify.register(staticPlugin, {
    root: frontendDist,
    prefix: '/',
    decorateReply: false,
  })
  fastify.setNotFoundHandler((req, reply) => {
    if (!req.url.startsWith('/api') && !req.url.startsWith('/docs')) {
      reply.sendFile('index.html')
    } else {
      reply.code(404).send({ error: 'Not found' })
    }
  })
}

await fastify.listen({ port: config.port, host: '0.0.0.0' })
console.log(`\n🚀 API rodando em http://localhost:${config.port}`)
console.log(`📚 Docs em http://localhost:${config.port}/docs`)
```

- [ ] **Step 2: Testar backend isolado**

```bash
cd "C:/Operação/telegram-checker/backend"
cp .env.example .env
# Editar .env se necessário
npm run dev
```

Verificar:
- `GET http://localhost:3000/health` → `{"status":"ok","uptime":...}`
- `GET http://localhost:3000/docs` → Swagger UI

- [ ] **Step 3: Criar primeira API key via curl**

```bash
curl -X POST http://localhost:3000/admin/keys \
  -H "x-admin-secret: admin123" \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste"}'
```

Pegar a key retornada e testar:

```bash
curl -X POST http://localhost:3000/verify/single \
  -H "x-api-key: tk_<key-aqui>" \
  -H "Content-Type: application/json" \
  -d '{"link":"https://t.me/IncvIppp1nsua_bot"}'
```

Esperado: `{"status":"online","name":"...","type":"bot",...}`

- [ ] **Step 4: Commit**

```bash
git add backend/src/server.js backend/.env.example
git commit -m "feat: add Fastify server with swagger"
```

---

## Task 6: Frontend — Scaffold

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/api/index.ts`

- [ ] **Step 1: Criar o projeto frontend**

```bash
cd "C:/Operação/telegram-checker"
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install lucide-react
```

- [ ] **Step 2: Configurar vite.config.ts com proxy para dev**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/verify': 'http://localhost:3000',
      '/admin': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
    }
  }
})
```

Com o proxy, durante dev o frontend em `:5173` roteia `/verify/*` e `/admin/*` direto para o backend em `:3000`, eliminando erros de CORS sem precisar configurar `VITE_API_URL`.

- [ ] **Step 3: Configurar tailwind.config.ts**

```ts
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

Adicionar ao `frontend/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 3: Criar src/api/index.ts**

```ts
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export function getApiUrl() {
  return BASE
}

export async function verifySingle(link: string, apiKey: string) {
  const res = await fetch(`${BASE}/verify/single`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ link }),
  })
  return res.json()
}

export async function verifyBatch(links: string[], apiKey: string, concurrency = 50) {
  const res = await fetch(`${BASE}/verify/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ links, concurrency }),
  })
  return res.json()
}

export async function adminListKeys(adminSecret: string) {
  const res = await fetch(`${BASE}/admin/keys`, {
    headers: { 'x-admin-secret': adminSecret },
  })
  return res.json()
}

export async function adminCreateKey(name: string, adminSecret: string) {
  const res = await fetch(`${BASE}/admin/keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret },
    body: JSON.stringify({ name }),
  })
  return res.json()
}

export async function adminRevokeKey(id: string, adminSecret: string) {
  const res = await fetch(`${BASE}/admin/keys/${id}`, {
    method: 'DELETE',
    headers: { 'x-admin-secret': adminSecret },
  })
  return res.json()
}

export async function adminGetStats(adminSecret: string) {
  const res = await fetch(`${BASE}/admin/stats`, {
    headers: { 'x-admin-secret': adminSecret },
  })
  return res.json()
}
```

- [ ] **Step 4: Criar src/App.tsx com routing simples**

```tsx
import { useState } from 'react'
import { UserPanel } from './pages/UserPanel'
import { AdminPanel } from './pages/AdminPanel'

export default function App() {
  const [page, setPage] = useState<'user' | 'admin'>(
    window.location.pathname.startsWith('/admin') ? 'admin' : 'user'
  )

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center gap-6">
        <span className="font-bold text-lg text-blue-400">Telegram Checker</span>
        <button
          onClick={() => setPage('user')}
          className={`text-sm px-3 py-1 rounded ${page === 'user' ? 'bg-blue-600' : 'text-gray-400 hover:text-white'}`}
        >
          Verificador
        </button>
        <button
          onClick={() => setPage('admin')}
          className={`text-sm px-3 py-1 rounded ${page === 'admin' ? 'bg-blue-600' : 'text-gray-400 hover:text-white'}`}
        >
          Admin
        </button>
      </nav>
      {page === 'user' ? <UserPanel /> : <AdminPanel />}
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/
git commit -m "feat: scaffold frontend react+vite+tailwind"
```

---

## Task 7: Frontend — User Panel

**Files:**
- Create: `frontend/src/components/StatusBadge.tsx`
- Create: `frontend/src/components/ResultsTable.tsx`
- Create: `frontend/src/pages/UserPanel.tsx`

O User Panel é o core do produto: usuário cola N links (um por linha, misturando bots/grupos), coloca a API key, clica em verificar e vê a tabela de resultados com status ON/OFF colorido, nome, tipo e link.

- [ ] **Step 1: Criar StatusBadge.tsx**

```tsx
export function StatusBadge({ status }: { status: 'online' | 'offline' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold
      ${status === 'online'
        ? 'bg-green-900 text-green-300 border border-green-700'
        : 'bg-red-900 text-red-300 border border-red-700'
      }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'online' ? 'bg-green-400' : 'bg-red-400'}`} />
      {status === 'online' ? 'ONLINE' : 'OFFLINE'}
    </span>
  )
}
```

- [ ] **Step 2: Criar ResultsTable.tsx**

```tsx
import { StatusBadge } from './StatusBadge'

type Result = {
  link: string
  status: 'online' | 'offline'
  name: string | null
  type: 'bot' | 'group' | null
  checkedAt: string
  error: string | null
}

export function ResultsTable({ results, stats }: {
  results: Result[]
  stats?: { total: number; online: number; offline: number; duration_ms: number }
}) {
  if (!results.length) return null

  return (
    <div className="mt-4">
      {stats && (
        <div className="flex gap-4 mb-3 text-sm">
          <span className="text-gray-400">Total: <b className="text-white">{stats.total}</b></span>
          <span className="text-green-400">Online: <b>{stats.online}</b></span>
          <span className="text-red-400">Offline: <b>{stats.offline}</b></span>
          <span className="text-gray-500">{(stats.duration_ms / 1000).toFixed(1)}s</span>
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Tipo</th>
              <th className="px-4 py-2 text-left">Nome</th>
              <th className="px-4 py-2 text-left">Link</th>
              <th className="px-4 py-2 text-left">Erro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {results.map((r, i) => (
              <tr key={i} className="hover:bg-gray-900/50">
                <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-2 text-gray-400 capitalize">{r.type || '—'}</td>
                <td className="px-4 py-2 text-white">{r.name || '—'}</td>
                <td className="px-4 py-2">
                  <a href={r.link} target="_blank" rel="noreferrer"
                    className="text-blue-400 hover:underline truncate block max-w-xs">
                    {r.link}
                  </a>
                </td>
                <td className="px-4 py-2 text-red-400 text-xs">{r.error || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Criar UserPanel.tsx**

```tsx
import { useState } from 'react'
import { verifyBatch } from '../api'
import { ResultsTable } from '../components/ResultsTable'

export function UserPanel() {
  const [apiKey, setApiKey] = useState(localStorage.getItem('apiKey') || '')
  const [linksText, setLinksText] = useState('')
  const [concurrency, setConcurrency] = useState(50)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [error, setError] = useState('')

  function saveApiKey(key: string) {
    setApiKey(key)
    localStorage.setItem('apiKey', key)
  }

  async function handleVerify() {
    const links = linksText
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)

    if (!links.length) return setError('Cole ao menos um link')
    if (!apiKey) return setError('Informe sua API Key')
    if (links.length > 500) return setError('Máximo 500 links por vez')

    setError('')
    setLoading(true)
    setResults([])
    setStats(null)

    try {
      const data = await verifyBatch(links, apiKey, concurrency)
      if (data.error) {
        setError(data.error)
      } else {
        setResults(data.results || [])
        setStats({ total: data.total, online: data.online, offline: data.offline, duration_ms: data.duration_ms })
      }
    } catch (e: any) {
      setError(e.message || 'Erro ao verificar')
    } finally {
      setLoading(false)
    }
  }

  const lineCount = linksText.split('\n').filter(l => l.trim()).length

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Verificador de Links</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="md:col-span-2">
          <label className="block text-sm text-gray-400 mb-1">API Key</label>
          <input
            type="text"
            value={apiKey}
            onChange={e => saveApiKey(e.target.value)}
            placeholder="tk_..."
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Concorrência</label>
          <input
            type="number"
            value={concurrency}
            onChange={e => setConcurrency(Number(e.target.value))}
            min={1} max={100}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-1">
          Links ({lineCount} detectados — 1 por linha, pode misturar bots e grupos)
        </label>
        <textarea
          value={linksText}
          onChange={e => setLinksText(e.target.value)}
          placeholder={'https://t.me/username\n@outro_username\nt.me/grupo\nhttps://t.me/+HASH'}
          rows={10}
          className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none resize-y"
        />
      </div>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      <button
        onClick={handleVerify}
        disabled={loading}
        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded font-semibold transition-colors"
      >
        {loading ? `Verificando ${lineCount} links...` : `Verificar ${lineCount || ''} links`}
      </button>

      <ResultsTable results={results} stats={stats} />
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/
git commit -m "feat: add user panel with batch link verification"
```

---

## Task 8: Frontend — Admin Panel

**Files:**
- Create: `frontend/src/components/KeysTable.tsx`
- Create: `frontend/src/pages/AdminPanel.tsx`

- [ ] **Step 1: Criar KeysTable.tsx**

```tsx
type Key = {
  id: string
  key: string
  name: string
  active: boolean
  createdAt: string
  requestCount: number
  lastUsed: string | null
}

export function KeysTable({ keys, onRevoke }: {
  keys: Key[]
  onRevoke: (id: string) => void
}) {
  if (!keys.length) {
    return <p className="text-gray-500 text-sm mt-4">Nenhuma key criada ainda.</p>
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-800 mt-4">
      <table className="w-full text-sm">
        <thead className="bg-gray-900 text-gray-400 text-xs uppercase">
          <tr>
            <th className="px-4 py-2 text-left">Nome</th>
            <th className="px-4 py-2 text-left">Key</th>
            <th className="px-4 py-2 text-left">Requests</th>
            <th className="px-4 py-2 text-left">Último uso</th>
            <th className="px-4 py-2 text-left">Criada em</th>
            <th className="px-4 py-2 text-left">Ação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {keys.map(k => (
            <tr key={k.id} className="hover:bg-gray-900/50">
              <td className="px-4 py-2 font-medium">{k.name}</td>
              <td className="px-4 py-2 font-mono text-xs text-blue-400">
                {k.key.slice(0, 12)}...
                <button
                  onClick={() => navigator.clipboard.writeText(k.key)}
                  className="ml-2 text-gray-500 hover:text-white text-xs"
                  title="Copiar"
                >⎘</button>
              </td>
              <td className="px-4 py-2 text-gray-300">{k.requestCount}</td>
              <td className="px-4 py-2 text-gray-400 text-xs">
                {k.lastUsed ? new Date(k.lastUsed).toLocaleString('pt-BR') : '—'}
              </td>
              <td className="px-4 py-2 text-gray-400 text-xs">
                {new Date(k.createdAt).toLocaleString('pt-BR')}
              </td>
              <td className="px-4 py-2">
                <button
                  onClick={() => onRevoke(k.id)}
                  className="text-red-400 hover:text-red-300 text-xs hover:underline"
                >
                  Revogar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Criar AdminPanel.tsx**

```tsx
import { useState, useEffect } from 'react'
import { adminListKeys, adminCreateKey, adminRevokeKey, adminGetStats } from '../api'
import { KeysTable } from '../components/KeysTable'

export function AdminPanel() {
  const [secret, setSecret] = useState(sessionStorage.getItem('adminSecret') || '')
  const [authed, setAuthed] = useState(false)
  const [keys, setKeys] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [newKeyName, setNewKeyName] = useState('')
  const [error, setError] = useState('')

  async function login() {
    const data = await adminListKeys(secret)
    if (data.error) return setError('Senha incorreta')
    sessionStorage.setItem('adminSecret', secret)
    setKeys(data.keys || [])
    setAuthed(true)
    loadStats()
  }

  async function loadStats() {
    const s = await adminGetStats(secret)
    setStats(s)
  }

  async function createKey() {
    if (!newKeyName.trim()) return
    const key = await adminCreateKey(newKeyName, secret)
    setKeys(prev => [...prev, key])
    setNewKeyName('')
    loadStats()
  }

  async function revokeKey(id: string) {
    if (!confirm('Revogar esta key?')) return
    await adminRevokeKey(id, secret)
    setKeys(prev => prev.filter(k => k.id !== id))
    loadStats()
  }

  if (!authed) {
    return (
      <div className="max-w-md mx-auto p-6 mt-20">
        <h1 className="text-2xl font-bold mb-6">Admin</h1>
        <input
          type="password"
          value={secret}
          onChange={e => setSecret(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
          placeholder="Admin secret..."
          className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 mb-3 focus:border-blue-500 focus:outline-none"
        />
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <button onClick={login} className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded font-semibold">
          Entrar
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Gerenciar API Keys</h1>
        {stats && (
          <div className="flex gap-6 text-sm text-gray-400">
            <span>Keys ativas: <b className="text-white">{stats.activeKeys}</b></span>
            <span>Requests totais: <b className="text-white">{stats.totalRequests}</b></span>
          </div>
        )}
      </div>

      <div className="flex gap-3 mb-2">
        <input
          type="text"
          value={newKeyName}
          onChange={e => setNewKeyName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && createKey()}
          placeholder="Nome da nova key (ex: Cliente 1)"
          className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <button
          onClick={createKey}
          className="px-4 py-2 bg-green-700 hover:bg-green-600 rounded font-semibold text-sm"
        >
          + Criar Key
        </button>
      </div>

      <KeysTable keys={keys} onRevoke={revokeKey} />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/
git commit -m "feat: add admin panel with API key management"
```

---

## Task 9: Documentação

**Files:**
- Create: `docs/api-sender.md`
- Create: `docs/api-receiver.md`

- [ ] **Step 1: Criar docs/api-sender.md**

```markdown
# Telegram Checker API — Guia de Envio

## Autenticação

Todas as rotas `/verify/*` exigem o header:

```
x-api-key: tk_sua_chave_aqui
```

Solicite sua chave ao administrador do sistema.

## POST /verify/single

Verifica um único link.

**Body:**
```json
{ "link": "https://t.me/username" }
```

**Formatos aceitos:**
- `https://t.me/username`
- `t.me/username`
- `@username`
- `https://t.me/+HASH` (links de convite)
- Com query params: `https://t.me/bot?start=OP` (params são ignorados)

**Curl:**
```bash
curl -X POST https://api.seudominio.com/verify/single \
  -H "x-api-key: tk_sua_chave" \
  -H "Content-Type: application/json" \
  -d '{"link":"https://t.me/username"}'
```

## POST /verify/batch

Verifica múltiplos links em paralelo (máximo 500 por requisição).

**Body:**
```json
{
  "links": ["https://t.me/a", "t.me/b", "@c"],
  "concurrency": 50
}
```

**Curl:**
```bash
curl -X POST https://api.seudominio.com/verify/batch \
  -H "x-api-key: tk_sua_chave" \
  -H "Content-Type: application/json" \
  -d '{"links":["https://t.me/bot1","https://t.me/grupo1"],"concurrency":50}'
```

**Exemplo em Node.js:**
```js
const res = await fetch('http://localhost:3000/verify/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-api-key': 'tk_...' },
  body: JSON.stringify({ links: ['https://t.me/username'], concurrency: 50 }),
})
const data = await res.json()
const online = data.results.filter(r => r.status === 'online')
```

**Exemplo em Python:**
```python
import requests
res = requests.post('http://localhost:3000/verify/batch',
  headers={'x-api-key': 'tk_...'},
  json={'links': ['https://t.me/username'], 'concurrency': 50}
)
data = res.json()
online = [r for r in data['results'] if r['status'] == 'online']
```

## Campos de Response (batch)

| Campo | Tipo | Descrição |
|---|---|---|
| total | int | Total de links verificados |
| online | int | Quantidade online |
| offline | int | Quantidade offline |
| results | array | Array de resultados individuais |
| duration_ms | int | Tempo total em ms |

## Códigos de Erro

| Código | Significado |
|---|---|
| 401 | x-api-key ausente ou inválida |
| 422 | Lista de links vazia ou body inválido |
| 500 | Erro interno |

## Limite

Máximo de **500 links por requisição** batch.
```

- [ ] **Step 2: Criar docs/api-receiver.md**

```markdown
# Telegram Checker API — Guia de Resultado

## Objeto Individual (result)

```json
{
  "link": "https://t.me/username",
  "status": "online",
  "name": "Nome do Bot ou Grupo",
  "type": "bot",
  "checkedAt": "2026-04-07T12:00:00.000Z",
  "error": null
}
```

| Campo | Tipo | Valores |
|---|---|---|
| link | string | Link original enviado |
| status | string | `"online"` ou `"offline"` |
| name | string\|null | Nome real do bot/grupo (null se offline) |
| type | string\|null | `"bot"`, `"group"` ou `null` |
| checkedAt | string | ISO 8601 timestamp |
| error | string\|null | Mensagem de erro se offline |

## Interpretação

- `status: "online"` + `name` preenchido → ativo e acessível publicamente
- `status: "offline"` + `error: "Timeout"` → pode ser temporário, tentar novamente
- `status: "offline"` + `error: "Página não encontrada (404)"` → definitivamente inativo
- `type: null` → não foi possível determinar se é bot ou grupo

## Filtrar online/offline do batch

```js
const { results } = data
const online = results.filter(r => r.status === 'online')
const offline = results.filter(r => r.status === 'offline')
const bots = results.filter(r => r.type === 'bot')
const grupos = results.filter(r => r.type === 'group')
```

## Exemplo de resposta batch completa

```json
{
  "total": 3,
  "online": 2,
  "offline": 1,
  "duration_ms": 1240,
  "results": [
    { "link": "https://t.me/IncvIppp1nsua_bot", "status": "online", "name": "Vip Access", "type": "bot", "checkedAt": "...", "error": null },
    { "link": "https://t.me/livsc6va5ss3sz_bot", "status": "offline", "name": null, "type": null, "checkedAt": "...", "error": "Perfil não encontrado" },
    { "link": "https://t.me/RLjT7VCMrK6u5eO", "status": "online", "name": "Grupo VIP", "type": "group", "checkedAt": "...", "error": null }
  ]
}
```
```

- [ ] **Step 3: Commit**

```bash
git add docs/
git commit -m "docs: add api-sender and api-receiver guides"
```

---

## Task 10: Build & Run Local

**Files:**
- Create: `backend/.env` (de .env.example)
- Create: `start.bat`

- [ ] **Step 1: Buildar frontend**

```bash
cd "C:/Operação/telegram-checker/frontend"
npm run build
```

O build vai para `frontend/dist/` — o Fastify serve esse diretório.

- [ ] **Step 2: Criar start.bat na raiz**

```bat
@echo off
echo Iniciando Telegram Checker...
cd /d "%~dp0backend"
if not exist .env (
  copy .env.example .env
  echo .env criado a partir do exemplo. Configure antes de continuar.
  pause
  exit /b
)
npm start
```

- [ ] **Step 3: Rodar o sistema completo**

```bash
# Terminal 1: backend (serve API + frontend)
cd "C:/Operação/telegram-checker/backend"
npm start
```

Abrir: http://localhost:3000 → User Panel
Abrir: http://localhost:3000/docs → Swagger

- [ ] **Step 4: Testar batch com os links fornecidos**

Colar no painel todos os links do usuário (bots ON/OFF + grupos ON/OFF), verificar e confirmar que a classificação está correta.

- [ ] **Step 5: Commit final**

```bash
git add .
git commit -m "feat: complete telegram checker system v1.0"
```

---

## Notas de Implementação

**Query params:** Sempre fazer strip antes de verificar. `?start=OP`, `?start=123` etc. são irrelevantes para o status do link.

**Links inválidos:** Se o link não for reconhecível como t.me, retornar `offline` com `error: "Link inválido"` — nunca quebrar o batch.

**Detecção de tipo:** Username terminando em `_bot` → type: "bot". Caso contrário usar presença de "START BOT" no HTML. Se ambos ausentes mas tem nome → "group".

**t.me/+HASH:** Invite links não têm username. Verificar se a página tem nome (grupo ativo) ou não (expirado/inativo).

**Concorrência:** p-limit com cap em MAX_CONCURRENCY (100) mesmo que o cliente peça mais.
