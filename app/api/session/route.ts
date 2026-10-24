import { NextRequest } from 'next/server'
import {
  ApiError,
  authenticated,
  authConfig,
  cookieOptions,
  handle,
  issueSession,
  json,
  passwordMatches,
  readJson,
  sameOrigin,
  serverMode,
} from '../../../lib/journal-server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
let failures = 0
let resetAt = 0
export async function GET(request: NextRequest) {
  return handle(async () =>
    json({
      mode: serverMode() ? 'server' : 'local',
      configured: authConfig().configured,
      authenticated: authenticated(request),
    })
  )
}
export async function POST(request: NextRequest) {
  return handle(async () => {
    sameOrigin(request)
    const config = authConfig()
    if (!config.configured) throw new ApiError(503, '请先在服务器配置管理员账号')
    if (Date.now() > resetAt) {
      failures = 0
      resetAt = Date.now() + 15 * 60 * 1000
    }
    if (failures >= 15) throw new ApiError(429, '登录尝试过多，请在 15 分钟后重试')
    const input = await readJson(request, 4096)
    if (typeof input?.password !== 'string' || input.password.length > 256)
      throw new ApiError(400, '密码格式无效')
    if (!passwordMatches(input.password, config.hash)) {
      failures++
      throw new ApiError(401, '管理员密码不正确')
    }
    failures = 0
    const response = json({ authenticated: true })
    response.cookies.set('daily_session', issueSession(), cookieOptions())
    return response
  })
}
export async function DELETE(request: NextRequest) {
  return handle(async () => {
    sameOrigin(request)
    const response = json({ authenticated: false })
    response.cookies.set('daily_session', '', { ...cookieOptions(), maxAge: 0 })
    return response
  })
}
