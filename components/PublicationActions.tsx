'use client'
import { useEffect, useState } from 'react'
import { apiResult } from '../lib/journal-client'
export default function PublicationActions({ id }: { id: string }) {
  const [admin, setAdmin] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('')
  useEffect(() => {
    fetch('/api/session/', { cache: 'no-store' })
      .then(apiResult)
      .then((value) => setAdmin(value.mode === 'server' && value.authenticated))
      .catch(() => {})
  }, [])
  if (!admin) return null
  return (
    <div className="rounded-xl bg-emerald-50 p-4 text-sm dark:bg-emerald-950">
      <span>管理员操作 · </span>
      <button
        className="text-emerald-700 underline"
        disabled={busy}
        onClick={async () => {
          if (!confirm('撤回这篇公开笔记及其公共附件入口？私人原稿保留。')) return
          setBusy(true)
          try {
            await apiResult(await fetch(`/api/publications/${id}/`, { method: 'DELETE' }))
            window.location.assign('/notes/')
          } catch (error) {
            setMessage((error as Error).message)
            setBusy(false)
          }
        }}
      >
        撤回公开
      </button>
      <p role="status">{message}</p>
    </div>
  )
}
