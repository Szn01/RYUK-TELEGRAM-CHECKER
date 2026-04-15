# Telegram Checker API — Guia de Resultado

## Objeto Individual

```json
{
  "link": "https://t.me/username",
  "status": "online",
  "name": "Nome do Bot, Grupo ou Canal",
  "type": "bot",
  "checkedAt": "2026-04-07T12:00:00.000Z",
  "error": null
}
```

| Campo | Tipo | Valores |
|---|---|---|
| link | string | Link original enviado |
| status | string | `"online"` ou `"offline"` |
| name | string\|null | Nome real (null se offline) |
| type | string\|null | `"bot"`, `"group"`, `"channel"` ou `null` |
| checkedAt | string | ISO 8601 timestamp |
| error | string\|null | Mensagem de erro se offline |

## Interpretação

- `status: "online"` + `name` preenchido → ativo e acessível
- `status: "offline"` + `error: "Timeout"` → pode ser temporário
- `status: "offline"` + `error: "Página não encontrada (404)"` → definitivamente inativo
- `type: null` → não foi possível determinar tipo

## Filtrar resultados

```js
const { results } = data
const online = results.filter(r => r.status === 'online')
const offline = results.filter(r => r.status === 'offline')
const bots = results.filter(r => r.type === 'bot')
const grupos = results.filter(r => r.type === 'group')
const canais = results.filter(r => r.type === 'channel')
const linksOnline = online.map(r => r.link).join('\n')
```

## Exemplo batch completo

```json
{
  "total": 3,
  "online": 2,
  "offline": 1,
  "duration_ms": 1240,
  "results": [
    { "link": "https://t.me/IncvIppp1nsua_bot", "status": "online", "name": "Vip Access", "type": "bot", "checkedAt": "...", "error": null },
    { "link": "https://t.me/livsc6va5ss3sz_bot", "status": "offline", "name": null, "type": "bot", "checkedAt": "...", "error": "Bot desativado" },
    { "link": "https://t.me/RLjT7VCMrK6u5eO", "status": "online", "name": "Grupo VIP", "type": "group", "checkedAt": "...", "error": null }
  ]
}
```
