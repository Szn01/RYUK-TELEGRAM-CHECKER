import test from 'node:test'
import assert from 'node:assert/strict'
import { extractTelegramPageMeta, parseMemberCount, parseOnlineCount } from '../src/services/checker.js'

test('classifies invite group pages as online group', () => {
  const html = `
    <div class="tgme_page_title">Grupo VIP</div>
    <div class="tgme_page_extra">4 945 members, 4 online</div>
    <a class="tgme_action_button_new">Join Group</a>
    <div>You are invited to the group <b>Grupo VIP</b>. Click above to join.</div>
  `

  assert.deepEqual(
    extractTelegramPageMeta(html, { isInvite: true, username: null }),
    { status: 'online', name: 'Grupo VIP', type: 'group', members: 4945, membersOnline: 4, error: null }
  )
})

test('classifies invite channel pages as online channel', () => {
  const html = `
    <div class="tgme_page_title">Canal VIP</div>
    <div class="tgme_page_extra">12 304 subscribers</div>
    <a class="tgme_action_button_new">Join Channel</a>
    <div>You are invited to the channel <b>Canal VIP</b>. Click above to join.</div>
  `

  assert.deepEqual(
    extractTelegramPageMeta(html, { isInvite: true, username: null }),
    { status: 'online', name: 'Canal VIP', type: 'channel', members: 12304, membersOnline: null, error: null }
  )
})

test('classifies public channel pages as online channel', () => {
  const html = `
    <div class="tgme_page_title">Telegram News</div>
    <div class="tgme_page_extra">1 200 000 subscribers</div>
    <a class="tgme_action_button_new">View in Telegram</a>
  `

  assert.deepEqual(
    extractTelegramPageMeta(html, { isInvite: false, username: 'telegram' }),
    { status: 'online', name: 'Telegram News', type: 'channel', members: 1200000, membersOnline: null, error: null }
  )
})

test('parseMemberCount extrai membros totais de canais, grupos e bots', () => {
  assert.equal(parseMemberCount('10 040 954 subscribers'), 10040954)   // NBSP
  assert.equal(parseMemberCount('25 308 members, 530 online'), 25308)  // pega total, não online
  assert.equal(parseMemberCount('@BotFather\n7 084 047 monthly users'), 7084047)
  assert.equal(parseMemberCount('12 304 assinantes'), 12304)
  assert.equal(parseMemberCount(''), null)
  assert.equal(parseMemberCount('sem numeros aqui'), null)
})

test('parseOnlineCount extrai membros ativos só de grupos', () => {
  assert.equal(parseOnlineCount('25 308 members, 530 online'), 530)
  assert.equal(parseOnlineCount('9 864 members, 1 268 online'), 1268) // NBSP no online
  assert.equal(parseOnlineCount('10 040 954 subscribers'), null)      // canal não tem online
  assert.equal(parseOnlineCount('7 084 047 monthly users'), null)     // bot não tem online
  assert.equal(parseOnlineCount(''), null)
})
