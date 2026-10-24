const assert = require('node:assert/strict')
const { spawn } = require('node:child_process')
const { randomBytes, randomUUID, scryptSync } = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const port = 3097
const origin = `http://127.0.0.1:${port}`
const data = path.resolve('.runtime', `test-${randomUUID()}`)
const password = randomBytes(24).toString('hex')
const salt = randomBytes(16).toString('hex')
const env = {
  ...process.env,
  JOURNAL_STORAGE: 'server',
  JOURNAL_DATA_DIR: data,
  ADMIN_PASSWORD_HASH: `scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`,
  SESSION_SECRET: randomBytes(48).toString('hex'),
  SITE_URL: origin,
}
delete env.ADMIN_PASSWORD_HASH_FILE
delete env.SESSION_SECRET_FILE
let child
let output = ''
let cookie = ''
const request = (url, options = {}) =>
  fetch(origin + (url.endsWith('/') ? url : url + '/'), {
    ...options,
    headers: { Origin: origin, Cookie: cookie, ...options.headers },
  })
async function start() {
  child = spawn(
    process.execPath,
    [require.resolve('next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(port)],
    { env, stdio: ['ignore', 'pipe', 'pipe'] }
  )
  child.stdout.on('data', (chunk) => {
    output += chunk
  })
  child.stderr.on('data', (chunk) => {
    output += chunk
  })
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) throw new Error('Test server exited: ' + output)
    try {
      if ((await fetch(origin + '/api/health')).ok) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('Test server did not start: ' + output)
}
async function stop() {
  if (!child || child.exitCode !== null) return
  const exited = new Promise((resolve) => child.once('exit', resolve))
  child.kill()
  await exited
}
async function login() {
  const response = await request('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  assert.equal(response.status, 200, await response.clone().text())
  assert.match(response.headers.get('set-cookie'), /HttpOnly/i)
  cookie = response.headers.get('set-cookie').split(';')[0]
}
async function main() {
  await start()
  assert.equal((await request('/api/journal')).status, 401)
  assert.equal((await request('/api/files/' + randomUUID())).status, 401)
  assert.equal(
    (
      await request('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'http://other.example' },
        body: JSON.stringify({ password }),
      })
    ).status,
    403
  )
  assert.equal(
    (
      await request('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'incorrect' }),
      })
    ).status,
    401
  )
  await login()
  const initial = await (await request('/api/journal')).json()
  assert.equal(initial.revision, 0)
  const form = new FormData()
  form.append(
    'file',
    new Blob(['# hello\nThis is a test note.'], { type: 'text/plain' }),
    'note.md'
  )
  const uploaded = await request('/api/files', { method: 'POST', body: form })
  assert.equal(uploaded.status, 201, await uploaded.clone().text())
  const file = await uploaded.json()
  const state = {
    revision: 0,
    entries: [
      {
        id: randomUUID(),
        kind: 'note',
        title: 'API integration test',
        text: '# hello',
        date: '2026-10-24',
        time: '09:30',
        location: 'Test location',
        done: false,
        file,
      },
    ],
    days: { '2026-10-24': { location: 'Test location', offset: 1 } },
  }
  const save = await request('/api/journal', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  })
  assert.equal(save.status, 200, await save.clone().text())
  assert.equal((await save.json()).revision, 1)
  assert.equal(
    (
      await request('/api/journal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      })
    ).status,
    409
  )
  const download = await request('/api/files/' + file.id)
  assert.equal(await download.text(), '# hello\nThis is a test note.')
  assert.match(download.headers.get('content-disposition'), /attachment/)
  const invalid = { ...state, revision: 1, entries: [{ ...state.entries[0], date: '2026-02-31' }] }
  assert.equal(
    (
      await request('/api/journal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalid),
      })
    ).status,
    400
  )
  const forbidden = new FormData()
  forbidden.append('file', new Blob(['<script>alert(1)</script>']), 'bad.html')
  assert.equal((await request('/api/files', { method: 'POST', body: forbidden })).status, 400)
  await stop()
  await start()
  const persisted = await (await request('/api/journal')).json()
  assert.equal(persisted.entries[0].title, 'API integration test')
  assert.equal(persisted.days['2026-10-24'].location, 'Test location')
  assert.equal((await request('/api/files/' + file.id)).status, 200)
  const logout = await request('/api/session', { method: 'DELETE' })
  assert.equal(logout.status, 200)
  cookie = ''
  assert.equal((await request('/api/journal')).status, 401)
  console.log(
    'PASS: login, authorization, origin checks, uploads/downloads, validation, conflict protection, restart persistence and logout'
  )
  console.log('Temporary test data: ' + data)
}
main()
  .catch((error) => {
    console.error(error.message)
    console.error(output)
    process.exitCode = 1
  })
  .finally(stop)
