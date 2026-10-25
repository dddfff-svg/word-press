import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ApiError, dataDir } from './journal-server'
export type DocumentRecord = {
  id: string
  fileId: string
  name: string
  category: string
  description: string
  date: string
  expires: string
  issuer: string
  created: string
  type: string
  size: number
}
export const documentsPath = () => path.join(dataDir(), 'documents.json')
export async function readDocuments(): Promise<DocumentRecord[]> {
  try {
    return JSON.parse(await fs.readFile(documentsPath(), 'utf8'))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}
export function documentFields(value: Record<string, unknown>) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new ApiError(400, '资料格式无效')
  const result: Record<string, string> = {}
  for (const [key, max] of Object.entries({
    name: 160,
    category: 60,
    description: 2000,
    issuer: 160,
    date: 10,
    expires: 10,
  })) {
    const text = value[key] ?? ''
    if (typeof text !== 'string' || text.length > max) throw new ApiError(400, '资料字段长度无效')
    result[key] = text.trim()
  }
  if (!result.name || !result.category) throw new ApiError(400, '请填写名称和分类')
  for (const key of ['date', 'expires']) {
    const text = result[key]
    if (
      text &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(text) ||
        !Number.isFinite(Date.parse(text)) ||
        new Date(text).toISOString().slice(0, 10) !== text)
    )
      throw new ApiError(400, '日期无效')
  }
  return result as Pick<
    DocumentRecord,
    'name' | 'category' | 'description' | 'issuer' | 'date' | 'expires'
  >
}
