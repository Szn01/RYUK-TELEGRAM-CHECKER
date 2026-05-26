/**
 * ============================================================
 *  SCRIPT TEMPORÁRIO — Verificador de Yandex Disk em Massa
 *  Arquivo alvo: C:\Users\Samuel\Downloads\contas colombia.txt
 *  Uso: node verificar-yandex.js
 * ============================================================
 *
 * COMO FUNCIONA:
 *  - Lê cada linha do .txt no formato:  NUMERO.zip: https://disk.yandex.ru/d/HASH
 *  - Faz requisição HTTP a cada link do Yandex Disk
 *  - OFFLINE = HTTP 404  OU  HTML contém "такой страницы нет"
 *  - ONLINE  = HTTP 200  E   HTML NÃO contém a mensagem de erro
 *  - Grava dois arquivos de resultado na pasta: resultado-yandex/
 *
 *  COMO DETECTAR (testado manualmente em 21/05/2026):
 *    ON  → HTTP 200, HTML ~50.900 chars, sem texto de erro
 *    OFF → HTTP 404, HTML ~44.900 chars, contém "такой страницы нет"
 *
 * CONFIGURAÇÕES:
 */

import { request } from 'undici'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import pLimit from 'p-limit'

// ─── CONFIGURAÇÕES ────────────────────────────────────────────────────────────

/** Caminho do arquivo de entrada */
const ARQUIVO_ENTRADA = 'C:\\Users\\Samuel\\Downloads\\contas colombia.txt'

/** Quantas requisições rodar ao mesmo tempo (não exagere para não ser bloqueado) */
const CONCORRENCIA = 10

/** Timeout máximo por requisição (ms) */
const TIMEOUT_MS = 8000

// O Yandex Disk é um SPA (React) — o HTML retornado é sempre o mesmo shell.
// A diferença real é o código HTTP: 404 = OFFLINE, 200 = ONLINE.

// ─── PASTA DE SAÍDA ───────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url))
const PASTA_RESULTADO = join(__dirname, 'resultado-yandex')
const DATA_HORA = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const ARQUIVO_ONLINE  = join(PASTA_RESULTADO, `online_${DATA_HORA}.txt`)
const ARQUIVO_OFFLINE = join(PASTA_RESULTADO, `offline_${DATA_HORA}.txt`)
const ARQUIVO_ERRO    = join(PASTA_RESULTADO, `erros_${DATA_HORA}.txt`)
const ARQUIVO_LOG     = join(PASTA_RESULTADO, `log_${DATA_HORA}.txt`)

// ─── HEADERS DE NAVEGADOR ────────────────────────────────────────────────────

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept': 'text/html,application/xhtml+xml,application/xhtml;q=0.9,*/*;q=0.8',
  'Cache-Control': 'no-cache',
}

// ─── FUNÇÕES AUXILIARES ───────────────────────────────────────────────────────

/**
 * Escreve uma linha no log com timestamp
 * @param {string} msg
 */
function log(msg) {
  const linha = `[${new Date().toLocaleTimeString('pt-BR')}] ${msg}`
  console.log(linha)
  appendLog(linha)
}

/** Buffer de log para gravar no arquivo */
const _logBuffer = []
function appendLog(linha) {
  _logBuffer.push(linha)
}
function salvarLog() {
  writeFileSync(ARQUIVO_LOG, _logBuffer.join('\n'), 'utf8')
}

/**
 * Lê e parseia o arquivo de contas
 * @returns {{ numero: string, url: string }[]}
 */
function lerArquivoContas() {
  log(`📂 Lendo arquivo: ${ARQUIVO_ENTRADA}`)
  const conteudo = readFileSync(ARQUIVO_ENTRADA, 'utf8')
  const linhas = conteudo.split('\n')

  const contas = []
  for (const linha of linhas) {
    const trimada = linha.trim()
    if (!trimada) continue

    // Formato esperado: "573147981990.zip: https://disk.yandex.ru/d/HASH"
    const match = trimada.match(/^(.+?):\s*(https?:\/\/\S+)/)
    if (!match) {
      log(`⚠️  Linha ignorada (formato inválido): ${trimada.slice(0, 60)}`)
      continue
    }

    const numero = match[1].replace('.zip', '').trim()
    const url    = match[2].trim()
    contas.push({ numero, url })
  }

  log(`✅ ${contas.length} contas carregadas do arquivo`)
  return contas
}

/**
 * Verifica se um link do Yandex Disk está online ou offline
 * @param {{ numero: string, url: string }} conta
 * @returns {Promise<{ numero: string, url: string, status: 'online'|'offline'|'erro', motivo: string }>}
 */
async function verificarLink({ numero, url }) {
  try {
    const { statusCode, body } = await request(url, {
      method: 'GET',
      headers: HEADERS,
      bodyTimeout: TIMEOUT_MS,
      headersTimeout: TIMEOUT_MS,
      maxRedirections: 5,
    })

    const html = await body.text()

    // DUPLA VERIFICAÇÃO (confirmada por testes reais em 21/05/2026):
    //   OFFLINE → HTTP 404  E/OU  HTML contém "такой страницы нет"
    //   ONLINE  → HTTP 200  E     HTML NÃO contém a mensagem de erro
    const textoErro = html.includes('такой страницы нет')

    if (statusCode === 200 && !textoErro) {
      return { numero, url, status: 'online', motivo: 'OK' }
    }

    if (textoErro) {
      return { numero, url, status: 'offline', motivo: 'Página removida (erro russo detectado no HTML)' }
    }

    return { numero, url, status: 'offline', motivo: `HTTP ${statusCode}` }

  } catch (err) {
    const isTimeout = err.code?.includes('TIMEOUT') || err.message?.includes('timeout')
    const motivo = isTimeout ? 'Timeout' : (err.message || 'Erro de rede desconhecido')
    return { numero, url, status: 'erro', motivo }
  }
}

// ─── FUNÇÃO PRINCIPAL ─────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════╗')
  console.log('║     VERIFICADOR YANDEX DISK — COLOMBIA          ║')
  console.log('╚══════════════════════════════════════════════════╝\n')

  // Cria a pasta de resultados se não existir
  if (!existsSync(PASTA_RESULTADO)) {
    mkdirSync(PASTA_RESULTADO, { recursive: true })
    log(`📁 Pasta criada: ${PASTA_RESULTADO}`)
  }

  // Lê as contas do arquivo
  const contas = lerArquivoContas()
  if (contas.length === 0) {
    log('❌ Nenhuma conta encontrada. Verifique o arquivo de entrada.')
    salvarLog()
    return
  }

  const total = contas.length
  let processados = 0
  let totalOnline  = 0
  let totalOffline = 0
  let totalErro    = 0

  const linhasOnline  = []
  const linhasOffline = []
  const linhasErro    = []

  log(`🚀 Iniciando verificação de ${total} contas com concorrência de ${CONCORRENCIA}...`)
  log(`⏱️  Timeout por link: ${TIMEOUT_MS}ms\n`)

  const limit = pLimit(CONCORRENCIA)

  const tarefas = contas.map(conta =>
    limit(async () => {
      const resultado = await verificarLink(conta)
      processados++

      const progresso = `[${processados}/${total}]`

      if (resultado.status === 'online') {
        totalOnline++
        linhasOnline.push(`${resultado.numero}: ${resultado.url}`)
        log(`${progresso} ✅ ONLINE  → ${resultado.numero}`)
      } else if (resultado.status === 'offline') {
        totalOffline++
        linhasOffline.push(`${resultado.numero}: ${resultado.url} | MOTIVO: ${resultado.motivo}`)
        log(`${progresso} ❌ OFFLINE → ${resultado.numero}`)
      } else {
        totalErro++
        linhasErro.push(`${resultado.numero}: ${resultado.url} | ERRO: ${resultado.motivo}`)
        log(`${progresso} ⚠️  ERRO    → ${resultado.numero} | ${resultado.motivo}`)
      }

      // Grava resultados parciais a cada 50 verificações (segurança)
      if (processados % 50 === 0) {
        salvarResultados(linhasOnline, linhasOffline, linhasErro)
        log(`💾 Resultados parciais salvos (${processados}/${total})`)
      }
    })
  )

  await Promise.all(tarefas)

  // Grava resultado final
  salvarResultados(linhasOnline, linhasOffline, linhasErro)
  salvarLog()

  console.log('\n╔══════════════════════════════════════════════════╗')
  console.log('║                   RESULTADO FINAL               ║')
  console.log('╠══════════════════════════════════════════════════╣')
  console.log(`║  Total verificado : ${String(total).padEnd(27)}║`)
  console.log(`║  ✅ Online        : ${String(totalOnline).padEnd(27)}║`)
  console.log(`║  ❌ Offline       : ${String(totalOffline).padEnd(27)}║`)
  console.log(`║  ⚠️  Erros         : ${String(totalErro).padEnd(26)}║`)
  console.log('╠══════════════════════════════════════════════════╣')
  console.log(`║  📄 Resultados em: resultado-yandex/            ║`)
  console.log('╚══════════════════════════════════════════════════╝')
}

/**
 * Grava os arquivos de resultado (pode ser chamado parcialmente)
 * @param {string[]} online
 * @param {string[]} offline
 * @param {string[]} erro
 */
function salvarResultados(online, offline, erro) {
  writeFileSync(ARQUIVO_ONLINE,  online.join('\n'),  'utf8')
  writeFileSync(ARQUIVO_OFFLINE, offline.join('\n'), 'utf8')
  if (erro.length > 0) {
    writeFileSync(ARQUIVO_ERRO, erro.join('\n'), 'utf8')
  }
}

// ─── EXECUÇÃO ─────────────────────────────────────────────────────────────────

main().catch(err => {
  console.error('💥 ERRO FATAL:', err)
  appendLog(`💥 ERRO FATAL: ${err.message}\n${err.stack}`)
  salvarLog()
  process.exit(1)
})
