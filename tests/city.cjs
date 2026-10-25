const fs = require('node:fs')
const assert = require('node:assert/strict')
const esbuild = require('esbuild')
const code = esbuild.transformSync(fs.readFileSync('lib/city.ts','utf8'), {loader:'ts',format:'cjs'}).code
const loaded = {exports:{}}
new Function('module','exports',code)(loaded,loaded.exports)
const city = loaded.exports.cityLabel
assert.equal(city({city:'杭州市',principalSubdivision:'浙江省',latitude:30,longitude:120}), '浙江省 · 杭州市')
assert.equal(city({city:'上海市',principalSubdivision:'上海市'}), '上海市')
assert.equal(city({locality:'西湖区'}), '西湖区')
assert.throws(()=>city({latitude:30,longitude:120}))
console.log('PASS: city labels, duplicate province handling, locality fallback, no coordinates in output.')
