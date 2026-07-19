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

/**
 * Detecta o tipo da entidade Telegram usando seletores CSS do HTML (mais confiável)
 * e fallback para texto da página em múltiplos idiomas.
 * @param {import('cheerio').CheerioAPI} $ - instância do cheerio com o HTML carregado
 * @param {string} pageText - texto completo da página normalizado (lowercase)
 * @param {{ isInvite: boolean, username: string|null }} parsed - link parseado
 * @returns {'bot'|'channel'|'group'|null}
 */
function detectTelegramType($, getPageText, { isInvite, username }) {
  // --- Verificação via seletores CSS do Telegram (mais confiável, independe de idioma) ---

  // Texto do botão de ação principal da página (Join Channel, Join Group, Start Bot, etc.)
  const actionBtnText = $('a.tgme_action_button_new').text().toLowerCase().trim()

  // Elemento .tgme_page_extra contém a contagem de subscribers/members
  const extraText = $('.tgme_page_extra').text().toLowerCase()

  // Subscribers — só aparece em CANAIS (multilíngue)
  const hasSubscribersEl = extraText.includes('subscriber')
    || extraText.includes('assinante')
    || extraText.includes('abonado')
    || extraText.includes('подписчик')
    || extraText.includes('aboné')
    || extraText.includes('สมาชิก')

  // Members — aparece em GRUPOS (multilíngue)
  const hasMembersEl = extraText.includes('member')
    || extraText.includes('membro')
    || extraText.includes('miembro')
    || extraText.includes('участник')
    || extraText.includes('membre')

  // Botão aponta para canal
  const hasJoinChannelBtn = actionBtnText.includes('join channel')
    || actionBtnText.includes('preview channel')
    || actionBtnText.includes('entrar no canal')
    || actionBtnText.includes('view channel')

  // Botão aponta para grupo
  const hasJoinGroupBtn = actionBtnText.includes('join group')
    || actionBtnText.includes('entrar no grupo')
    || actionBtnText.includes('send message')

  // Botão aponta para bot
  const hasStartBotBtn = actionBtnText.includes('start bot')
    || actionBtnText.includes('open bot')

  // --- Verificação via username ---
  const usernameIsBot = username && username.toLowerCase().endsWith('_bot')

  // --- Decisão via sinais CSS (caminho comum, sem varrer o texto da página) ---
  if (usernameIsBot || hasStartBotBtn) return 'bot'
  if (hasJoinChannelBtn || hasSubscribersEl) return 'channel'
  if (hasJoinGroupBtn || hasMembersEl) return 'group'

  // --- Fallback: sinais CSS inconclusivos, aí sim varre o texto completo (caro) ---
  const pageText = getPageText()

  const hasSubscribersText = pageText.includes(' subscriber')
    || pageText.includes(' subscribers')
    || pageText.includes(' assinante')
    || pageText.includes(' assinantes')
    || pageText.includes(' подписчик')
    || pageText.includes(' abonado')

  const mentionsInviteChannel = pageText.includes('you are invited to the channel')
    || pageText.includes('join channel')
    || pageText.includes('preview channel')
    || pageText.includes('entrar no canal')

  if (hasSubscribersText || (isInvite && mentionsInviteChannel)) return 'channel'

  const hasMembersText = pageText.includes(' member')
    || pageText.includes(' members')
    || pageText.includes(' membro')
    || pageText.includes(' membros')
    || pageText.includes(' участник')

  const mentionsInviteGroup = pageText.includes('you are invited to the group')
    || pageText.includes('join group')
    || pageText.includes('entrar no grupo')

  if (hasMembersText || (isInvite && mentionsInviteGroup)) return 'group'

  // Último fallback: não identificado como invite = assume group
  return isInvite ? null : 'group'
}

/**
 * Extrai a contagem de membros/assinantes do texto de .tgme_page_extra.
 * Formatos: "10 040 954 subscribers" | "25 308 members, 530 online" | "@Bot\n7 084 047 monthly users"
 * O separador de milhar do Telegram é NBSP ( ). Retorna o total (nunca o "online").
 * @returns {number|null}
 */
export function parseMemberCount(extraText) {
  if (!extraText) return null
  const m = extraText.match(
    /([\d][\d.,\s ]*)\s*(subscrib|assinante|abonad|abonné|подписчик|member|membro|miembro|участник|membre|monthly|usuário|user)/i
  )
  if (!m) return null
  const digits = m[1].replace(/\D/g, '')
  return digits ? parseInt(digits, 10) : null
}

/**
 * Contagem de MEMBROS ATIVOS (o "N online" da pagina).
 * So existe em GRUPOS ("25 308 members, 530 online" => 530).
 * Canais e bots nao expoem online na pagina publica, entao retorna null.
 * @returns {number|null} membros ativos no momento, ou null.
 */
export function parseOnlineCount(extraText) {
  if (!extraText) return null
  const m = extraText.match(/([\d][\d.,\s ]*)\s*(online|онлайн|en línea|en linea|em linha)/i)
  if (!m) return null
  const digits = m[1].replace(/\D/g, '')
  return digits ? parseInt(digits, 10) : null
}

export function extractTelegramPageMeta(html, parsed) {
  const $ = cheerio.load(html)
  const title = $('.tgme_page_title').text().trim()
  // pageText é caro ($.text() varre o HTML todo); computa lazy só se detectTelegramType precisar
  let pageTextCache = null
  const getPageText = () => (pageTextCache ??= normalizePageText($.text()))
  const type = detectTelegramType($, getPageText, parsed)
  const extra = $('.tgme_page_extra').text()
  const members = parseMemberCount(extra)        // membros totais
  const membersOnline = parseOnlineCount(extra)  // membros ativos (só grupos)

  if (!title) {
    return {
      status: 'offline',
      name: null,
      type,
      members: null,
      membersOnline: null,
      error: parsed.isInvite ? 'Convite inválido ou expirado' : 'Perfil não encontrado',
    }
  }

  if (type === 'bot' && $('a.tgme_action_button_new').length === 0) {
    return {
      status: 'offline',
      name: null,
      type: 'bot',
      members: null,
      membersOnline: null,
      error: 'Bot desativado (sem botão de ação)',
    }
  }

  return {
    status: 'online',
    name: title,
    type,
    members,
    membersOnline,
    error: null,
  }
}

export async function checkTelegramLink(rawLink, timeoutMs = 8000) {
  const checkedAt = new Date().toISOString()

  const parsed = parseLink(rawLink)
  if (!parsed) {
    return { link: rawLink, status: 'offline', name: null, type: null, members: null, membersOnline: null, checkedAt, error: 'Link inválido' }
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
      return { link: rawLink, status: 'offline', name: null, type: null, members: null, membersOnline: null, checkedAt, error: 'Página não encontrada (404)' }
    }

    if (statusCode !== 200) {
      return { link: rawLink, status: 'offline', name: null, type: null, members: null, membersOnline: null, checkedAt, error: `HTTP ${statusCode}` }
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
      members: null,
      membersOnline: null,
      checkedAt,
      error: isTimeout ? 'Timeout' : (err.message || 'Erro de rede'),
    }
  }
}
