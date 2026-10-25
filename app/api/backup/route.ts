import { NextRequest } from 'next/server'
import { promises as fs, createReadStream } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { Readable } from 'node:stream'
import { dataDir, exclusive, handle, initialize, protect } from '../../../lib/journal-server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  return handle(async () => {
    protect(request)
    const directory = await fs.mkdtemp(path.join(tmpdir(), 'daily-backup-'))
    const archive = path.join(directory, 'backup.tar.gz')
    try {
      await exclusive(async () => {
        await initialize()
        await promisify(execFile)('tar', ['-czf', archive, '-C', dataDir(), '.'], {
          timeout: 120000,
        })
      })
      const stream = createReadStream(archive)
      const cleanup = () => {
        fs.rm(directory, { recursive: true, force: true }).catch(() => {})
      }
      stream.on('close', cleanup)
      return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, {
        headers: {
          'Content-Type': 'application/gzip',
          'Cache-Control': 'private, no-store',
          'Content-Disposition': `attachment; filename="daily-backup-${new Date().toISOString().slice(0, 10)}.tar.gz"`,
        },
      })
    } catch (error) {
      await fs.rm(directory, { recursive: true, force: true })
      throw error
    }
  })
}
