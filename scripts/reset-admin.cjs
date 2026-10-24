const { randomBytes, scryptSync } = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const directory = path.resolve(process.argv[2] || '.secrets')
const hashFile = path.join(directory, 'admin_password_hash')
const keyFile = path.join(directory, 'session_secret')
let temporary
try {
  const previous = fs.readFileSync(hashFile, 'utf8').trim()
  const key = fs.readFileSync(keyFile, 'utf8').trim()
  if (!/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(previous) || key.length < 32) {
    throw new Error('Existing administrator credentials are invalid; no files were changed.')
  }
  const password = randomBytes(18).toString('base64url')
  const salt = randomBytes(16).toString('hex')
  const hash = `scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`
  temporary = path.join(directory, `.admin-reset-${randomBytes(12).toString('hex')}`)
  fs.writeFileSync(temporary, hash, { mode: 0o444, flag: 'wx' })
  // Windows cannot replace a read-only destination; Linux supports atomic replacement.
  if (process.platform === 'win32') fs.chmodSync(hashFile, 0o600)
  try {
    fs.renameSync(temporary, hashFile)
  } catch (error) {
    if (process.platform === 'win32') fs.chmodSync(hashFile, 0o444)
    throw error
  }
  temporary = undefined
  // The session signature includes the password hash, invalidating existing logins.
  console.log('New blog administrator password (shown once): ' + password)
  console.log('Save it now. Force-recreate the blog container to load the new secret file.')
  console.log('Journal data and Vaultwarden credentials were not changed.')
} catch (error) {
  if (temporary && fs.existsSync(temporary)) fs.rmSync(temporary)
  console.error('Password reset failed: ' + error.message)
  process.exitCode = 1
}
