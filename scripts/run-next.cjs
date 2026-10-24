const { spawnSync } = require('node:child_process')
const mode = process.argv[2] || 'dev'
const env = { ...process.env, INIT_CWD: process.cwd(), PWD: process.cwd() }
const result = spawnSync(process.execPath, [require.resolve('next/dist/bin/next'), mode], {
  env,
  stdio: 'inherit',
})
if (result.error) {
  console.error(result.error)
  process.exit(1)
}
process.exit(result.status ?? 1)
