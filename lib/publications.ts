import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ApiError, dataDir } from './journal-server'
export type Publication = {
  id: string
  sourceId: string
  title: string
  text: string
  category: string
  tags: string[]
  published: string
  updated: string
  fileId?: string
  fileName?: string
  fileType?: string
}
export const publicationsPath = () => path.join(dataDir(), 'publications.json')
export async function readPublications(): Promise<Publication[]> {
  try {
    return JSON.parse(await fs.readFile(publicationsPath(), 'utf8'))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}
export function publicationFields(input: Record<string, unknown>) {
  if (!input || typeof input !== 'object') throw new ApiError(400, '发布内容无效')
  const value: Record<string, string> = {}
  for (const [key, max] of Object.entries({ title: 160, text: 1000000, category: 60, tags: 300 })) {
    if (typeof input[key] !== 'string' || (input[key] as string).length > max)
      throw new ApiError(400, '发布字段无效或超长')
    value[key] = (input[key] as string).trim()
  }
  if (!value.title || !value.text) throw new ApiError(400, '标题和正文不能为空')
  if (typeof input.shareFile !== 'boolean' || input.confirm !== true)
    throw new ApiError(400, '请明确确认发布范围')
  return {
    title: value.title,
    text: value.text,
    category: value.category || '笔记',
    tags: [
      ...new Set(
        value.tags
          .split(/[,，]/)
          .map((tag) => tag.trim())
          .filter(Boolean)
      ),
    ].slice(0, 10),
  }
}
