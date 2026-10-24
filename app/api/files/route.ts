import { NextRequest } from 'next/server'
import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  ApiError,
  atomicJson,
  dataDir,
  handle,
  initialize,
  json,
  limitedBody,
  protect,
  sameOrigin,
} from '../../../lib/journal-server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function POST(request: NextRequest) {
  return handle(async () => {
    sameOrigin(request)
    protect(request)
    const body = await limitedBody(request, 21 * 1024 * 1024)
    const form = await new Response(new Uint8Array(body), {
      headers: { 'Content-Type': request.headers.get('content-type') || '' },
    }).formData()
    const file = form.get('file')
    if (
      !(file instanceof File) ||
      file.size === 0 ||
      file.size > 20 * 1024 * 1024 ||
      file.name.length > 240
    )
      throw new ApiError(400, '请选择 20 MB 内的文件')
    const extension = path.extname(file.name).toLowerCase()
    if (
      !['.md', '.txt', '.pdf', '.png', '.jpg', '.jpeg', '.webp', '.doc', '.docx'].includes(
        extension
      )
    )
      throw new ApiError(400, '不支持此文件类型')
    const buffer = Buffer.from(await file.arrayBuffer())
    let type = 'application/octet-stream'
    if (['.md', '.txt'].includes(extension)) type = 'text/plain; charset=utf-8'
    if (extension === '.pdf' && buffer.subarray(0, 5).toString() === '%PDF-')
      type = 'application/pdf'
    if (
      ['.jpg', '.jpeg'].includes(extension) &&
      buffer[0] === 255 &&
      buffer[1] === 216 &&
      buffer[2] === 255
    )
      type = 'image/jpeg'
    if (
      extension === '.png' &&
      buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    )
      type = 'image/png'
    if (
      extension === '.webp' &&
      buffer.subarray(0, 4).toString() === 'RIFF' &&
      buffer.subarray(8, 12).toString() === 'WEBP'
    )
      type = 'image/webp'
    if (['.png', '.jpg', '.jpeg', '.webp'].includes(extension) && !type.startsWith('image/'))
      throw new ApiError(400, '图片格式与扩展名不匹配')
    await initialize()
    const id = randomUUID(),
      metadata = { id, name: file.name, size: file.size, type }
    await fs.writeFile(path.join(dataDir(), 'files', id), buffer, { flag: 'wx', mode: 0o600 })
    await atomicJson(path.join(dataDir(), 'files', id + '.json'), metadata)
    return json(metadata, 201)
  })
}
