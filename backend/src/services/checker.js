import { request } from 'undici'
import * as cheerio from 'cheerio'

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept': 'text/html,application/xhtml+xml,application/xhtml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Cache-Control': 'no-cache',
}

export function parseLink(raw) {
  if (!raw || typeof raw !== 'string') return null
  let link = raw.trim()
  link = link.split('?')[0].trim()

  if (link.startsWith('@')) {
    return { url: `https://t.me/${link.slice(1)}`, username: link.slice(1), isInvite: false }
  }

  if (!link.startsWith('http')) {
    link = 'https://' + link
  }

  try {
    const u = new URL(link)
    if (!u.hostname.includes('t.me')) return null
    const path = u.pathname.replace(/^\//, '')
    if (!path) return null
    const isInvite = path.startsWith('+')
    return { url: `https://t.me/${path}`, username: isInvite ? null : path, isInvite }
  } catch {
    return null
  }
}

function normalizePageText(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function detectTelegramType(pageText, { isInvite, username }) {
  const usernameIsBot = username && username.toLowerCase().endsWith('_bot')
  const hasBotCta = pageText.includes('start bot')
  const mentionsInviteChannel = pageText.includes('you are invited to the channel') || pageText.includes('join channel')
  const mentionsInviteGroup = pageText.includes('you are invited to the group') || pageText.includes('join group')
  const hasSubscribers = pageText.includes(' subscriber') || pageText.includes(' subscribers')
  const hasMembers = pageText.includes(' member') || pageText.includes(' members')

  if (usernameIsBot || hasBotCta) return 'bot'
  if (isInvite && mentionsInviteChannel) return 'channel'
  if (isInvite && mentionsInviteGroup) return 'group'
  if (hasSubscribers) return 'channel'
  if (hasMembers) return 'group'
  return isInvite ? null : 'group'
}

export function extractTelegramPageMeta(html, parsed) {
  const $ = cheerio.load(html)
  const title = $('.tgme_page_title').text().trim()
  const pageText = normalizePageText($.text())
  const type = detectTelegramType(pageText, parsed)

  if (!title) {
    return {
      status: 'offline',
      name: null,
      type,
      error: parsed.isInvite ? 'Convite inválido ou expirado' : 'Perfil não encontrado',
    }
  }

  if (type === 'bot' && !(pageText.includes('start bot') || pageText.includes('tgme_action_button_new'))) {
    return {
      status: 'offline',
      name: null,
      type: 'bot',
      error: 'Bot desativado (sem botão START BOT)',
    }
  }

  return {
    status: 'online',
    name: title,
    type,
    error: null,
  }
}

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

    const meta = extractTelegramPageMeta(html, parsed)
    return { link: rawLink, checkedAt, ...meta }

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
