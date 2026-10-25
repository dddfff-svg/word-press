import { NextRequest } from 'next/server'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ApiError, dataDir, handle, validId } from '../../../../lib/journal-server'
import { readPublications } from '../../../../lib/publications'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await context.params
    if (!validId(id)) throw new ApiError(404, '公开附件不存在')
    const item = (await readPublications()).find((record) => record.id === id)
    if (!item?.fileId) throw new ApiError(404, '该附件未公开或笔记已撤回')
    const data = await fs.readFile(path.join(dataDir(), 'files', item.fileId))
    const inline = item.fileType?.startsWith('image/') || item.fileType === 'application/pdf'
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': item.fileType || 'application/octet-stream',
        'Cache-Control': 'no-store',
        'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(item.fileName || 'file').replace(/'/g, '%27')}`,
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    })
  })
}
