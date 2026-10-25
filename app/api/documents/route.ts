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
  sameOrigin,
  storedFile,
} from '../../../lib/journal-server'
import { documentFields, documentsPath, readDocuments } from '../../../lib/documents'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  return handle(async () => {
    protect(request)
    return json(await readDocuments())
  })
}
export async function POST(request: NextRequest) {
  return handle(async () => {
    protect(request)
    sameOrigin(request)
    const input = await readJson(request, 8192)
    if (!input || typeof input !== 'object' || typeof input.fileId !== 'string')
      throw new ApiError(400, '资料格式无效')
    const fields = documentFields(input)
    const file = await storedFile(input.fileId)
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type))
      throw new ApiError(400, '资料只支持图片和 PDF')
    return exclusive(async () => {
      const records = await readDocuments()
      if (records.length >= 10000) throw new ApiError(400, '资料数量已达上限')
      if (records.some((item) => item.fileId === file.id)) throw new ApiError(409, '文件已加入资料')
      const item = {
        ...fields,
        id: randomUUID(),
        fileId: file.id,
        type: file.type,
        size: file.size,
        created: new Date().toISOString(),
      }
      await atomicJson(documentsPath(), [item, ...records])
      return json(item, 201)
    })
  })
}
