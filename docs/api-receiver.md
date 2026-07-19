# Telegram Checker API — Guia de Resultado

## Objeto Individual

```json
{
  "link": "https://t.me/username",
  "status": "online",
  "name": "Nome do Bot, Grupo ou Canal",
  "type": "channel",
  "members": 10040954,
  "membersOnline": 458,
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
| members | int\|null | **Membros totais** (assinantes em canal, membros em grupo). null se a página não expõe ou offline |
| membersOnline | int\|null | **Membros ativos** (o "N online"). Só existe em **grupos**; canais e bots retornam null |
| checkedAt | string | ISO 8601 timestamp |
| error | string\|null | Mensagem de erro se offline |

## Escopo de membros (`scope`)

Os campos `members`/`membersOnline` aparecem conforme o `scope` enviado na requisição:

| scope | Campos no resultado | Total agregado no batch |
|---|---|---|
| `"members"` (padrão) | `members` | `totalMembers` |
| `"active"` | `membersOnline` | `totalMembersOnline` |
| `"both"` | `members` + `membersOnline` | `totalMembers` + `totalMembersOnline` |

> Para contagem em massa recorrente, use o padrão (`members`) e leia `totalMembers` do batch — já vem somado (só dos online), pronto para contabilizar em outro sistema.

**Observações:**
- `members` de **bot** = "monthly users" (usuários mensais), não membros de grupo.
- `membersOnline` é sempre `null` fora de grupos — não é erro, é o comportamento da página do Telegram.

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

## Exemplo batch completo (scope padrão = `members`)

```json
{
  "total": 3,
  "online": 2,
  "offline": 1,
  "duration_ms": 1240,
  "totalMembers": 1250308,
  "results": [
    { "link": "https://t.me/canal1", "status": "online", "name": "Canal VIP", "type": "channel", "members": 1225000, "checkedAt": "...", "error": null },
    { "link": "https://t.me/livsc6va5ss3sz_bot", "status": "offline", "name": null, "type": "bot", "members": null, "checkedAt": "...", "error": "Bot desativado" },
    { "link": "https://t.me/RLjT7VCMrK6u5eO", "status": "online", "name": "Grupo VIP", "type": "group", "members": 25308, "checkedAt": "...", "error": null }
  ]
}
```

## Somar membros de vários batches (contagem em massa)

```js
// Recorrente (ex: diário): soma direta do total já agregado por batch
const totalHoje = batches.reduce((s, b) => s + (b.totalMembers || 0), 0)

// Ou somando dos resultados individuais, se preferir
const total = data.results.reduce((s, r) => s + (r.members || 0), 0)
```
