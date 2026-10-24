const { randomBytes, scryptSync } = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const directory = path.resolve(process.argv[2] || '.secrets')
fs.mkdirSync(directory, { recursive: true, mode: 0o700 })
const hashFile = path.join(directory, 'admin_password_hash')
const keyFile = path.join(directory, 'session_secret')
if (fs.existsSync(hashFile) || fs.existsSync(keyFile)) {
  console.error('Secrets already exist. Refusing to replace existing login credentials.')
  process.exit(1)
}
const password = randomBytes(18).toString('base64url')
const salt = randomBytes(16).toString('hex')
const hash = `scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`
// Compose bind-mounted secret files must be readable by the non-root container user.
// The enclosing directory stays owner-only on the host.
fs.writeFileSync(hashFile, hash, { mode: 0o444, flag: 'wx' })
fs.writeFileSync(keyFile, randomBytes(48).toString('hex'), { mode: 0o444, flag: 'wx' })
console.log('Admin login password (shown once): ' + password)
console.log('Save this password in your password manager. It is not your SSH password.')
