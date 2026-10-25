'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { DocumentRecord } from '../lib/documents'
export default function RecentDocuments() {
  const [items, setItems] = useState<DocumentRecord[]>([])
  const [message, setMessage] = useState('正在读取你的收藏…')
  useEffect(() => {
    let active = true
    async function load() {
      try {
        const response = await fetch('/api/documents/', { cache: 'no-store' })
        if (!response.ok) throw new Error('登录服务器个人空间后，可在这里查看照片和证书。')
        const value = await response.json()
        if (active) {
          setItems(value.slice(0, 6))
          setMessage('还没有收藏，添加第一张照片或证书吧。')
        }
      } catch (error) {
        if (active) setMessage((error as Error).message)
      }
    }
    load()
    window.addEventListener('focus', load)
    return () => {
      active = false
      window.removeEventListener('focus', load)
    }
  }, [])
  return (
    <section className="recent-documents" aria-label="我的照片与证书">
      <div className="section-heading">
        <div>
          <p className="eyebrow">COLLECT LITTLE MOMENTS</p>
          <h2>照片与证书</h2>
        </div>
        <Link href="/documents/">添加 / 查看全部 ↗</Link>
      </div>
      {items.length ? (
        <div className="recent-grid">
          {items.map((item) => (
            <a
              key={item.id}
              className="recent-item"
              href={`/api/files/${item.fileId}/`}
              target="_blank"
              rel="noreferrer"
            >
              {item.type.startsWith('image/') ? (
                <img src={`/api/files/${item.fileId}/`} alt={item.name} />
              ) : (
                <span className="recent-pdf">
                  ▤<small>PDF</small>
                </span>
              )}
              <strong>{item.name}</strong>
              <small>{item.category}</small>
            </a>
          ))}
        </div>
      ) : (
        <Link className="recent-empty" href="/documents/">
          ＋ {message}
        </Link>
      )}
    </section>
  )
}
