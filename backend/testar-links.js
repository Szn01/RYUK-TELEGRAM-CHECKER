import { request } from 'undici'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'ru-RU,ru;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
}

const contas = [
  { numero: '573242092023', url: 'https://disk.yandex.ru/d/n_Ee5GaUf0122w' },
  { numero: '573242092084', url: 'https://disk.yandex.ru/d/CVIiNeyUAsSyVg' },
  { numero: '573242392191', url: 'https://disk.yandex.ru/d/a5rTB-596b3UtA' },
  { numero: '573242403129', url: 'https://disk.yandex.ru/d/-rWr5PBIv-G91Q' },
  { numero: '573242096130', url: 'https://disk.yandex.ru/d/17NCkGKZBxmcgQ' },
  { numero: '573242102724', url: 'https://disk.yandex.ru/d/QMxvZ6Gv_sMJxQ' },
  { numero: '573242335985', url: 'https://disk.yandex.ru/d/kuY4WLooNRXkfg' },
  { numero: '573242104393', url: 'https://disk.yandex.ru/d/uZO-h1ZkP3t9_A' },
  { numero: '573242092086', url: 'https://disk.yandex.ru/d/20Bi8diN6Rrmxg' },
  { numero: '573242102871', url: 'https://disk.yandex.ru/d/8_DevjgP4VUQAQ' },
  { numero: '573242400273', url: 'https://disk.yandex.ru/d/XtR8cfwuh7srDg' },
  { numero: '573242403155', url: 'https://disk.yandex.ru/d/EKlus9egCp0azg' },
  { numero: '573242092098', url: 'https://disk.yandex.ru/d/JPBRfAfm42lQDA' },
  { numero: '573242403164', url: 'https://disk.yandex.ru/d/CF0uOYzUWDSXhA' },
  { numero: '573242102831', url: 'https://disk.yandex.ru/d/O17jPPycu6Lvsg' },
  { numero: '573242392347', url: 'https://disk.yandex.ru/d/DyLksQ-_2_smEw' },
  { numero: '573236490436', url: 'https://disk.yandex.ru/d/h8hmWKs17bUnEw' },
  { numero: '573242092097', url: 'https://disk.yandex.ru/d/6djdvm5n79wtfg' },
  { numero: '573242400561', url: 'https://disk.yandex.ru/d/6V-cj_N8Wtlt6Q' },
  { numero: '573242104386', url: 'https://disk.yandex.ru/d/r9AsNrQd-kNkgA' },
  { numero: '573242104458', url: 'https://disk.yandex.ru/d/g0hkDXl5mhuAmg' },
  { numero: '573242092076', url: 'https://disk.yandex.ru/d/I44f9l5SKPAOgA' },
  { numero: '573242400263', url: 'https://disk.yandex.ru/d/4MkoUWGdn2pUPg' },
]

let online = 0, offline = 0

for (const { numero, url } of contas) {
  const r = await request(url, { method: 'GET', headers: HEADERS, maxRedirections: 5, bodyTimeout: 8000, headersTimeout: 8000 })
  const html = await r.body.text()
  const isOnline = r.statusCode === 200 && !html.includes('такой страницы нет')

  if (isOnline) { online++; console.log(`✅ ONLINE  → ${numero}`) }
  else          { offline++; console.log(`❌ OFFLINE → ${numero}  (HTTP ${r.statusCode})`) }
}

console.log(`\nOnline: ${online} | Offline: ${offline}`)
