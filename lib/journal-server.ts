import { createHmac, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import { promises as fs, readFileSync } from 'node:fs'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
  }
}
export function secret(name: string) {
  const file = process.env[`${name}_FILE`]
  return (file ? readFileSync(file, 'utf8') : process.env[name] || '').trim()
}
export const serverMode = () => process.env.JOURNAL_STORAGE === 'server'
export function authConfig() {
  const key = secret('SESSION_SECRET')
  const hash = secret('ADMIN_PASSWORD_HASH')
  return {
    key,
    hash,
    configured:
      serverMode() && key.length >= 32 && /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash),
  }
}
export function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { 'Cache-Control': 'no-store' } })
}
export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a),
    right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}
export function authenticated(request: NextRequest) {
  const config = authConfig()
  if (!config.configured) return false
  const token = request.cookies.get('daily_session')?.value || ''
  const [expires, signature] = token.split('.')
  if (!/^\d+$/.test(expires) || Number(expires) <= Date.now()) return false
  const expected = createHmac('sha256', config.key)
    .update(`${expires}:${config.hash}`)
    .digest('hex')
  return safeEqual(signature || '', expected)
}
export function protect(request: NextRequest) {
  if (!authConfig().configured) throw new ApiError(503, '服务端尚未配置管理员账号')
  if (!authenticated(request)) throw new ApiError(401, '请先登录个人空间')
}
export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin')
  const expected = process.env.SITE_URL
    ? new URL(process.env.SITE_URL).origin
    : new URL(request.url).origin
  if (!origin || origin !== expected)
    throw new ApiError(403, '请求来源不匹配，请检查 SITE_URL 配置')
}
export async function limitedBody(request: Request, limit: number) {
  if (Number(request.headers.get('content-length')) > limit)
    throw new ApiError(413, '文件或请求过大')
  const reader = request.body?.getReader()
  if (!reader) throw new ApiError(400, '请求不能为空')
  let size = 0
  const chunks: Uint8Array[] = []
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > limit) {
        await reader.cancel()
        throw new ApiError(413, '文件或请求过大')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  return Buffer.concat(chunks)
}
export async function readJson(request: Request, limit = 8 * 1024 * 1024) {
  try {
    return JSON.parse((await limitedBody(request, limit)).toString('utf8'))
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(400, 'JSON 格式不正确')
  }
}
export async function handle(action: () => Promise<Response>) {
  try {
    return await action()
  } catch (error) {
    if (error instanceof ApiError) return json({ error: error.message }, error.status)
    console.error(
      'Journal operation failed:',
      error instanceof Error ? error.message : 'unknown error'
    )
    return json({ error: '服务器保存或读取失败，请检查磁盘和数据卷权限' }, 500)
  }
}
export const dataDir = () => path.resolve(process.env.JOURNAL_DATA_DIR || '.runtime')
export async function initialize() {
  await fs.mkdir(path.join(dataDir(), 'files'), { recursive: true })
}
export type StoredFile = { id: string; name: string; size: number; type: string }
export type Snapshot = {
  goals?: { id: string; title: string; date: string; done: boolean }[]
  revision: number
  entries: Record<string, unknown>[]
  days: Record<string, Record<string, unknown>>
}
export async function readSnapshot(): Promise<Snapshot> {
  await initialize()
  try {
    return JSON.parse(await fs.readFile(path.join(dataDir(), 'journal.json'), 'utf8'))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      return { revision: 0, entries: [], days: {} }
    throw error
  }
}
let pending: Promise<unknown> = Promise.resolve()
export function exclusive<T>(operation: () => Promise<T>): Promise<T> {
  const task = pending.then(operation, operation)
  pending = task.catch(() => undefined)
  return task
}
export async function atomicJson(target: string, value: unknown) {
  const temporary = target + '.' + randomUUID() + '.tmp'
  const file = await fs.open(temporary, 'wx', 0o600)
  try {
    await file.writeFile(JSON.stringify(value))
    await file.sync()
  } finally {
    await file.close()
  }
  await fs.rename(temporary, target)
}
export const validId = (id: string) => /^[a-f0-9-]{36}$/.test(id)
export async function storedFile(id: string): Promise<StoredFile> {
  if (!validId(id)) throw new ApiError(400, '文件编号无效')
  try {
    return JSON.parse(await fs.readFile(path.join(dataDir(), 'files', id + '.json'), 'utf8'))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new ApiError(404, '文件不存在')
    throw error
  }
}
function string(value: unknown, max: number, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim()))
    throw new ApiError(400, '记录字段无效或长度超限')
  return value
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new ApiError(400, '记录格式无效')
  return value as Record<string, unknown>
}
function date(value: unknown) {
  const text = string(value, 10, true)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new ApiError(400, '日期格式无效')
  const day = new Date(text + 'T00:00:00Z')
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== text)
    throw new ApiError(400, '日期无效')
  return text
}
async function reference(value: unknown) {
  if (value === undefined || value === null) return undefined
  const entry = record(value)
  return storedFile(string(entry.id, 36, true))
}
export async function validateSnapshot(value: unknown): Promise<Snapshot> {
  const input = record(value)
  if (
    !Number.isSafeInteger(input.revision) ||
    (input.revision as number) < 0 ||
    !Array.isArray(input.entries) ||
    input.entries.length > 5000
  )
    throw new ApiError(400, '记录数量或版本无效')
  const ids = new Set<string>()
  const entries = [] as Record<string, unknown>[]
  for (const raw of input.entries) {
    const item = record(raw),
      id = string(item.id, 36, true)
    if (
      !validId(id) ||
      ids.has(id) ||
      !['note', 'memo', 'task'].includes(String(item.kind)) ||
      typeof item.done !== 'boolean'
    )
      throw new ApiError(400, '记录编号或类型无效')
    ids.add(id)
    const time = string(item.time, 5)
    if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new ApiError(400, '时间无效')
    entries.push({
      id,
      kind: item.kind,
      title: string(item.title, 160, true),
      text: string(item.text, 1000000),
      date: date(item.date),
      time,
      location: string(item.location, 100),
      done: item.done,
      file: await reference(item.file),
    })
  }
  const days: Snapshot['days'] = Object.create(null)
  const sourceDays = record(input.days)
  if (Object.keys(sourceDays).length > 10000) throw new ApiError(400, '日期数量过多')
  for (const [key, raw] of Object.entries(sourceDays)) {
    date(key)
    const day = record(raw)
    const cover = await reference(day.cover)
    if (day.checkedIn !== undefined && typeof day.checkedIn !== 'boolean')
      throw new ApiError(400, '打卡状态无效')
    if (
      cover &&
      (!['image/png', 'image/jpeg', 'image/webp'].includes(cover.type) ||
        cover.size > 10 * 1024 * 1024)
    )
      throw new ApiError(400, '封面必须是 10 MB 内的图片')
    if (day.offset !== undefined && (!Number.isSafeInteger(day.offset) || Number(day.offset) < 0))
      throw new ApiError(400, '封面序号无效')
    days[key] = {
      location: day.location === undefined ? '' : string(day.location, 100),
      offset: day.offset || 0,
      cover,
      checkedIn: day.checkedIn === true,
    }
  }
  const rawGoals = input.goals ?? []
  if (!Array.isArray(rawGoals) || rawGoals.length > 200) throw new ApiError(400, '目标数量无效')
  const goalIds = new Set<string>()
  const goals = rawGoals.map((raw) => {
    const goal = record(raw),
      id = string(goal.id, 36, true)
    if (!validId(id) || goalIds.has(id) || typeof goal.done !== 'boolean')
      throw new ApiError(400, '目标编号或状态无效')
    goalIds.add(id)
    return { id, title: string(goal.title, 160, true), date: date(goal.date), done: goal.done }
  })
  return { revision: input.revision as number, entries, days, goals }
}
export function passwordMatches(password: string, hash: string) {
  const [, salt, expected] = hash.split(':')
  return safeEqual(scryptSync(password, salt, 64).toString('hex'), expected)
}
export function issueSession() {
  const { key, hash } = authConfig()
  const expires = String(Date.now() + 12 * 60 * 60 * 1000)
  return expires + '.' + createHmac('sha256', key).update(`${expires}:${hash}`).digest('hex')
}
export const cookieOptions = () => ({
  httpOnly: true,
  secure: (process.env.SITE_URL || '').startsWith('https://'),
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 12 * 60 * 60,
})
