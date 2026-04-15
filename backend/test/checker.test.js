import test from 'node:test'
import assert from 'node:assert/strict'
import { extractTelegramPageMeta } from '../src/services/checker.js'

test('classifies invite group pages as online group', () => {
  const html = `
    <div class="tgme_page_title">Grupo VIP</div>
    <div class="tgme_page_extra">4 945 members, 4 online</div>
    <a class="tgme_action_button_new">Join Group</a>
    <div>You are invited to the group <b>Grupo VIP</b>. Click above to join.</div>
  `

  assert.deepEqual(
    extractTelegramPageMeta(html, { isInvite: true, username: null }),
    { status: 'online', name: 'Grupo VIP', type: 'group', error: null }
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
    { status: 'online', name: 'Canal VIP', type: 'channel', error: null }
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
    { status: 'online', name: 'Telegram News', type: 'channel', error: null }
  )
})
