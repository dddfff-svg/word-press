'use client'
import { useEffect, useState } from 'react'
import Journal from './Journal'
import { apiResult } from '../lib/journal-client'
import './journal.css'

type Session = { mode: 'local' | 'server'; configured: boolean; authenticated: boolean }
export default function JournalGate() {
  const [session, setSession] = useState<Session>()
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  async function refresh() {
    try {
      setSession(await apiResult(await fetch('/api/session/', { cache: 'no-store' })))
    } catch {
      setError('无法连接个人空间，请刷新重试。')
    }
  }
  useEffect(() => {
    refresh()
  }, [])
  async function login(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await apiResult(
        await fetch('/api/session/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        })
      )
      setPassword('')
      await refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : '登录失败')
    } finally {
      setBusy(false)
    }
  }
  async function logout() {
    try {
      await apiResult(await fetch('/api/session/', { method: 'DELETE' }))
      setSession({ mode: 'server', configured: true, authenticated: false })
    } catch {
      setError('退出失败，请重试')
    }
  }
  if (!session)
    return (
      <div className="journal empty-state">
        <p>{error || '正在打开个人空间…'}</p>
        <button onClick={refresh}>重新连接</button>
      </div>
    )
  if (session.mode === 'local') return <Journal storage="local" />
  if (session.authenticated)
    return (
      <>
        <div className="journal account-bar">
          <span>已登录 · 服务端个人空间</span>
          <button onClick={logout}>退出登录</button>
        </div>
        {error && <p role="alert">{error}</p>}
        <Journal storage="server" />
      </>
    )
  return (
    <section className="journal login-card">
      <p className="eyebrow">YOUR PRIVATE DAILY SPACE</p>
      <h1>欢迎回到你的日常</h1>
      <p>登录后查看笔记、随记与日常计划。博客文章仍可公开阅读。</p>
      {session.configured ? (
        <form onSubmit={login}>
          <label htmlFor="admin-password">管理员密码</label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={256}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="primary-button" disabled={busy}>
            {busy ? '正在登录…' : '进入个人空间'}
          </button>
        </form>
      ) : (
        <p>管理员账号尚未配置，请在服务器运行初始化命令并重启容器。</p>
      )}
      {error && (
        <p className="login-error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
