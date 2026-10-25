import { NextRequest } from 'next/server'
import { randomUUID } from 'node:crypto'
import {
  ApiError,
  atomicJson,
  exclusive,
  handle,
  json,
  protect,
  readJson,
  readSnapshot,
  sameOrigin,
  storedFile,
  validId,
} from '../../../lib/journal-server'
import { publicationFields, publicationsPath, readPublications } from '../../../lib/publications'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  return handle(async () => {
    protect(request)
    return json(await readPublications())
  })
}
export async function POST(request: NextRequest) {
  return handle(async () => {
    protect(request)
    sameOrigin(request)
    const input = await readJson(request, 4 * 1024 * 1024)
    const fields = publicationFields(input)
    if (typeof input.sourceId !== 'string' || !validId(input.sourceId))
      throw new ApiError(400, '笔记编号无效')
    return exclusive(async () => {
      const source = (await readSnapshot()).entries.find(
        (entry) => entry.id === input.sourceId && ['note', 'memo'].includes(String(entry.kind))
      )
      if (!source) throw new ApiError(404, '私人笔记不存在，请先保存笔记')
      let file: { fileId?: string; fileName?: string; fileType?: string } = {}
      if (input.shareFile) {
        const reference = source.file as { id?: string } | undefined
        if (!reference?.id) throw new ApiError(400, '笔记没有已保存的附件')
        if (input.fileId !== reference.id)
          throw new ApiError(409, '附件已变化，请重新打开预览后确认')
        const metadata = await storedFile(reference.id)
        file = { fileId: metadata.id, fileName: metadata.name, fileType: metadata.type }
      }
      const records = await readPublications(),
        previous = records.find((item) => item.sourceId === input.sourceId)
      if (!previous && records.length >= 5000) throw new ApiError(400, '公开笔记数量已达上限')
      const now = new Date().toISOString()
      const item = {
        ...fields,
        ...file,
        id: previous?.id || randomUUID(),
        sourceId: input.sourceId,
        published: previous?.published || now,
        updated: now,
      }
      await atomicJson(publicationsPath(), [
        item,
        ...records.filter((record) => record.id !== item.id),
      ])
      return json(item, previous ? 200 : 201)
    })
  })
}
