import { json } from '../../../lib/journal-server'
export const dynamic = 'force-dynamic'
export async function GET() {
  return json({ status: 'ok' })
}
