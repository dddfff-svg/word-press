'use client'
import Link from 'next/link'
import { useEffect, useState, type FormEvent } from 'react'
import type { DocumentRecord } from '../lib/documents'
import { apiResult } from '../lib/journal-client'
const blank = { name: '', category: '证书', description: '', issuer: '', date: '', expires: '' }
export default function Documents() {
  const [items, setItems] = useState<DocumentRecord[]>([])
  const [fields, setFields] = useState(blank)
  const [files, setFiles] = useState<File[]>([])
  const [editing, setEditing] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('全部')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [authorized, setAuthorized] = useState(false)
  async function refresh() {
    const response = await fetch('/api/documents/', { cache: 'no-store' })
    const data = await apiResult(response)
    setAuthorized(true)
    setItems(data)
  }
  useEffect(() => {
    refresh().catch((error) => setMessage(error.message))
  }, [])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    const form = event.currentTarget
    try {
      if (editing) {
        await apiResult(
          await fetch(`/api/documents/${editing}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fields),
          })
        )
      } else {
        if (!files.length) throw new Error('请选择图片或 PDF')
        for (const file of files) {
          if (
            !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type) ||
            file.size > 20 * 1024 * 1024
          )
            throw new Error(`${file.name}：仅支持 20 MB 内的 JPG、PNG、WebP 和 PDF`)
        }
        for (const file of files) {
          const body = new FormData()
          body.append('file', file)
          const uploaded = await apiResult(await fetch('/api/files/', { method: 'POST', body }))
          await apiResult(
            await fetch('/api/documents/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...fields,
                name: fields.name || file.name,
                fileId: uploaded.id,
              }),
            })
          )
        }
      }
      setFields(blank)
      setFiles([])
      setEditing('')
      form.reset()
      setMessage('已保存到服务器')
    } catch (error) {
      setMessage((error as Error).message)
    } finally {
      await refresh().catch(() => {})
      setBusy(false)
    }
  }
  async function remove(item: DocumentRecord) {
    if (!confirm(`移除“${item.name}”？原始附件仍保留在服务器及备份中，不会释放磁盘空间。`)) return
    setBusy(true)
    try {
      await apiResult(await fetch(`/api/documents/${item.id}/`, { method: 'DELETE' }))
      await refresh()
    } catch (error) {
      setMessage((error as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-transparent p-3 dark:border-gray-600'
  return (
    <section className="space-y-6 py-8">
      <Link href="/" className="text-emerald-700">
        ← 回到随记
      </Link>
      <h1 className="text-3xl font-semibold">我的资料</h1>
      <p className="text-gray-500">收藏照片、证书和扫描件，仅登录后可查看。每个文件最多 20 MB。</p>
      <p role="status" className="text-emerald-700">
        {message}
      </p>
      {!authorized ? (
        <Link href="/" className="underline">
          前往首页登录个人空间
        </Link>
      ) : (
        <>
          <form
            onSubmit={submit}
            className="grid gap-4 rounded-2xl border border-gray-200 p-6 sm:grid-cols-2 dark:border-gray-700"
          >
            <h2 className="text-xl font-semibold sm:col-span-2">
              {editing ? '编辑资料' : '添加照片 / 证书'}
            </h2>
            {!editing && (
              <label className="sm:col-span-2">
                选择文件（可多选）
                <input
                  className={inputClass}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  required
                  onChange={(event) => setFiles(Array.from(event.target.files || []))}
                />
              </label>
            )}
            {Object.entries({
              name: '名称（多选时可留空，使用文件名）',
              category: '分类（可自定义）',
              issuer: '颁发机构',
              date: '获得 / 拍摄日期',
              expires: '到期日期',
              description: '说明',
            }).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  className={inputClass}
                  list={key === 'category' ? 'document-categories' : undefined}
                  type={['date', 'expires'].includes(key) ? 'date' : 'text'}
                  maxLength={key === 'description' ? 2000 : 160}
                  required={key === 'category' || (editing !== '' && key === 'name')}
                  value={fields[key as keyof typeof fields]}
                  onChange={(event) => setFields({ ...fields, [key]: event.target.value })}
                />
              </label>
            ))}
            <datalist id="document-categories">
              {['证书', '生活照片', '其他资料', ...new Set(items.map((item) => item.category))].map(
                (name, index) => (
                  <option key={index} value={name} />
                )
              )}
            </datalist>
            <button
              disabled={busy}
              className="rounded-lg bg-emerald-800 px-5 py-3 text-white disabled:opacity-50"
            >
              {busy ? '正在保存…' : editing ? '保存修改' : '上传并保存'}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing('')
                  setFields(blank)
                }}
              >
                取消编辑
              </button>
            )}
          </form>
          <div className="flex flex-wrap gap-4">
            <input
              aria-label="搜索资料"
              className={inputClass + ' max-w-sm'}
              placeholder="搜索名称、机构、说明"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select
              aria-label="按分类筛选"
              className="rounded-lg border bg-transparent p-3"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {['全部', ...new Set(items.map((item) => item.category))].map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
            <a className="self-center text-emerald-700 underline" href="/api/backup/">
              下载完整备份
            </a>
          </div>
          <p className="text-sm text-gray-500">
            备份包含随记、打卡记录及所有附件。请保存到自己的电脑。
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items
              .filter(
                (item) =>
                  (category === '全部' || item.category === category) &&
                  [item.name, item.issuer, item.description]
                    .join(' ')
                    .toLowerCase()
                    .includes(query.toLowerCase())
              )
              .map((item) => (
                <article
                  key={item.id}
                  className="space-y-3 overflow-hidden rounded-2xl border border-gray-200 p-4 dark:border-gray-700"
                >
                  <a href={`/api/files/${item.fileId}/`} target="_blank" rel="noreferrer">
                    {item.type.startsWith('image/') ? (
                      <img
                        className="h-44 w-full rounded-lg object-contain"
                        src={`/api/files/${item.fileId}/`}
                        alt={item.name}
                      />
                    ) : (
                      <div className="flex h-44 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                        PDF · 点击预览 ↗
                      </div>
                    )}
                  </a>
                  <h2 className="font-semibold break-words">{item.name}</h2>
                  <p className="text-sm text-gray-500">
                    {item.category} · {(item.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <p className="text-sm">{item.issuer}</p>
                  <p className="text-sm">
                    {item.date && `日期：${item.date}`} {item.expires && `到期：${item.expires}`}
                  </p>
                  <p className="text-sm break-words whitespace-pre-wrap">{item.description}</p>
                  <div className="flex gap-4 text-sm">
                    <a className="underline" href={`/api/files/${item.fileId}/?download=1`}>
                      下载
                    </a>
                    <button
                      disabled={busy}
                      onClick={() => {
                        setEditing(item.id)
                        setFields({
                          name: item.name,
                          category: item.category,
                          description: item.description,
                          issuer: item.issuer,
                          date: item.date,
                          expires: item.expires,
                        })
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                    >
                      编辑
                    </button>
                    <button disabled={busy} onClick={() => remove(item)}>
                      移除
                    </button>
                  </div>
                </article>
              ))}
          </div>
          {!items.length && (
            <p className="py-10 text-center text-gray-500">还没有资料，上传第一张照片或证书吧。</p>
          )}
        </>
      )}
    </section>
  )
}
