const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export async function verifySingle(link: string, apiKey: string) {
  const res = await fetch(`${BASE}/verify/single`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ link }),
  })
  return res.json()
}

export async function verifyBatch(links: string[], apiKey: string, concurrency = 500) {
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
