import { NextRequest } from 'next/server'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { dataDir, handle, protect, storedFile } from '../../../../lib/journal-server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    protect(request)
    const file = await storedFile((await context.params).id)
    const content = await fs.readFile(path.join(dataDir(), 'files', file.id))
    const inline =
      request.nextUrl.searchParams.get('download') !== '1' &&
      (file.type.startsWith('image/') || file.type === 'application/pdf')
    return new Response(new Uint8Array(content), {
      headers: {
        'Content-Type': file.type,
        'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(file.name).replace(/'/g, '%27')}`,
        'Content-Length': String(file.size),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    })
  })
}
