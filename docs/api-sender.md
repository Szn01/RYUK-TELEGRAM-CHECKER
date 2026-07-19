# Telegram Checker API — Guia de Envio

## Autenticação

Todas as rotas `/verify/*` exigem o header:
```
x-api-key: tk_sua_chave_aqui
```

## Escopo de contagem de membros (`scope`)

Todas as rotas aceitam o campo opcional `scope` no body, controlando quais campos de membros voltam:

| scope | Retorna | Total no batch |
|---|---|---|
| `"members"` (padrão) | membros totais (`members`) | `totalMembers` |
| `"active"` | membros ativos/online (`membersOnline`) | `totalMembersOnline` |
| `"both"` | ambos | `totalMembers` + `totalMembersOnline` |

Se omitido, assume `"members"` — ideal para contagem em massa recorrente.

## POST /verify/single

Verifica um único link.

**Body:**
```json
{ "link": "https://t.me/username", "scope": "members" }
```

**Formatos aceitos:**
- `https://t.me/username`
- `t.me/username`
- `@username`
- `https://t.me/+HASH` (links de convite)
- Com query params: `https://t.me/bot?start=OP` (params são ignorados automaticamente)

**Curl:**
```bash
curl -X POST http://localhost:3001/verify/single \
  -H "x-api-key: tk_sua_chave" \
  -H "Content-Type: application/json" \
  -d '{"link":"https://t.me/username"}'
```

## POST /verify/batch

Verifica múltiplos links em paralelo (máximo 2000 por requisição).

**Body:**
```json
{
  "links": ["https://t.me/a", "t.me/b", "@c"],
  "concurrency": 500,
  "scope": "members"
}
```

**Curl:**
```bash
curl -X POST http://localhost:3001/verify/batch \
  -H "x-api-key: tk_sua_chave" \
  -H "Content-Type: application/json" \
  -d '{"links":["https://t.me/bot1","https://t.me/grupo1"],"concurrency":500}'
```

**Node.js:**
```js
const res = await fetch('http://localhost:3001/verify/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-api-key': 'tk_...' },
  body: JSON.stringify({ links: ['https://t.me/username'], concurrency: 500 }),
})
const data = await res.json()
const online = data.results.filter(r => r.status === 'online')
```

**Python:**
```python
import requests
res = requests.post('http://localhost:3001/verify/batch',
  headers={'x-api-key': 'tk_...'},
  json={'links': ['https://t.me/username'], 'concurrency': 500}
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
| results | array | Resultados individuais |
| duration_ms | int | Tempo total em ms |
| totalMembers | int | Soma dos membros totais dos online (scope `members`/`both`) |
| totalMembersOnline | int | Soma dos membros ativos dos online (scope `active`/`both`) |

## Códigos de Erro

| Código | Significado |
|---|---|
| 401 | x-api-key ausente ou inválida |
| 422 | Lista vazia ou body inválido |
| 500 | Erro interno |

**Limite máximo:** 2000 links por requisição batch.
