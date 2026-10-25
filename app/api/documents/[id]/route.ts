import { NextRequest } from 'next/server'
import {
  ApiError,
  atomicJson,
  exclusive,
  handle,
  json,
  protect,
  readJson,
  sameOrigin,
  validId,
} from '../../../../lib/journal-server'
import { documentFields, documentsPath, readDocuments } from '../../../../lib/documents'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
async function change(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
  remove: boolean
) {
  return handle(async () => {
    protect(request)
    sameOrigin(request)
    const { id } = await context.params
    if (!validId(id)) throw new ApiError(400, '资料编号无效')
    const fields = remove ? null : documentFields(await readJson(request, 8192))
    return exclusive(async () => {
      const records = await readDocuments()
      if (!records.some((item) => item.id === id)) throw new ApiError(404, '资料不存在')
      // Keep underlying attachments so journal references and existing backups stay valid.
      const updated = remove
        ? records.filter((item) => item.id !== id)
        : records.map((item) => (item.id === id ? { ...item, ...fields } : item))
      await atomicJson(documentsPath(), updated)
      return json({ ok: true })
    })
  })
}
export const PATCH = (request: NextRequest, context: { params: Promise<{ id: string }> }) =>
  change(request, context, false)
export const DELETE = (request: NextRequest, context: { params: Promise<{ id: string }> }) =>
  change(request, context, true)
