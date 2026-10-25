const fs = require('node:fs')
const assert = require('node:assert/strict')
const esbuild = require('esbuild')
const output = esbuild.transformSync(fs.readFileSync('lib/checkin.ts', 'utf8'), {
  loader: 'ts',
  format: 'cjs',
}).code
const loaded = { exports: {} }
new Function('module', 'exports', output)(loaded, loaded.exports)
const stats = loaded.exports.checkinStats
assert.deepEqual(stats({}, '2026-01-01'), { streak: 0, total: 0, longest: 0 })
assert.deepEqual(
  stats({ '2025-12-30': { checkedIn: true }, '2025-12-31': { checkedIn: true } }, '2026-01-01'),
  { streak: 2, total: 2, longest: 2 }
)
assert.equal(stats({ '2025-12-30': { checkedIn: true } }, '2026-01-01').streak, 0)
assert.deepEqual(
  stats(
    {
      '2026-01-01': { checkedIn: true },
      '2026-01-02': { checkedIn: true },
      '2026-01-04': { checkedIn: true },
      '2026-01-05': { checkedIn: true },
    },
    '2026-01-04'
  ),
  { streak: 1, total: 3, longest: 2 }
)
console.log(
  'PASS: check-in streaks, year boundary, yesterday grace, gaps and future-date exclusion.'
)
