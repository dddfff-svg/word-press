import { NextRequest } from 'next/server'
import {
  ApiError,
  atomicJson,
  exclusive,
  handle,
  json,
  protect,
  sameOrigin,
  validId,
} from '../../../../lib/journal-server'
import { publicationsPath, readPublications } from '../../../../lib/publications'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    protect(request)
    sameOrigin(request)
    const { id } = await context.params
    if (!validId(id)) throw new ApiError(400, '发布编号无效')
    return exclusive(async () => {
      const records = await readPublications()
      if (!records.some((item) => item.id === id)) throw new ApiError(404, '公开笔记不存在')
      await atomicJson(
        publicationsPath(),
        records.filter((item) => item.id !== id)
      )
      return json({ ok: true })
    })
  })
}
