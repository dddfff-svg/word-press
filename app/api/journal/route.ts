import { NextRequest } from 'next/server'
import path from 'node:path'
import {
  ApiError,
  atomicJson,
  dataDir,
  exclusive,
  handle,
  json,
  protect,
  readJson,
  readSnapshot,
  sameOrigin,
  validateSnapshot,
} from '../../../lib/journal-server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  return handle(async () => {
    protect(request)
    return json(await readSnapshot())
  })
}
export async function PUT(request: NextRequest) {
  return handle(async () => {
    sameOrigin(request)
    protect(request)
    const input = await validateSnapshot(await readJson(request))
    return exclusive(async () => {
      const current = await readSnapshot()
      if (current.revision !== input.revision)
        throw new ApiError(409, '其他设备已修改记录，请刷新后重试；当前编辑内容尚未保存')
      const next = { ...input, revision: current.revision + 1 }
      await atomicJson(path.join(dataDir(), 'journal.json'), next)
      return json(next)
    })
  })
}
