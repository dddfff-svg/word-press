'use client'
import { useEffect, useRef, useState } from 'react'
import { apiResult, type Entry } from '../lib/journal-client'
import type { Publication } from '../lib/publications'
export default function PublishNote({ entry, disabled }: { entry: Entry; disabled: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [publication, setPublication] = useState<Publication>()
  const [title, setTitle] = useState(entry.title),
    [text, setText] = useState(entry.text)
  const [category, setCategory] = useState('笔记'),
    [tags, setTags] = useState('')
  const [shareFile, setShareFile] = useState(false),
    [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [preview, setPreview] = useState(false)
  useEffect(() => {
    if (!dialog.current?.open) {
      setTitle(entry.title)
      setText(entry.text)
    }
  }, [entry.title, entry.text])
  async function open() {
    setBusy(true)
    setMessage('')
    setPreview(false)
    setShareFile(false)
    setConfirm(false)
    setTitle(entry.title)
    setText(entry.text)
    dialog.current?.showModal()
    try {
      const records: Publication[] = await apiResult(
        await fetch('/api/publications/', { cache: 'no-store' })
      )
      const existing = records.find((item) => item.sourceId === entry.id)
      setPublication(existing)
      setCategory(existing?.category || '笔记')
      setTags(existing?.tags.join('，') || '')
    } catch (error) {
      setMessage((error as Error).message)
    } finally {
      setBusy(false)
    }
  }
  async function publish() {
    setBusy(true)
    setMessage('')
    try {
      const result = await apiResult(
        await fetch('/api/publications/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceId: entry.id,
            title,
            text,
            category,
            tags,
            shareFile,
            fileId: entry.file && 'id' in entry.file ? entry.file.id : undefined,
            confirm,
          }),
        })
      )
      setPublication(result)
      setPreview(false)
      setConfirm(false)
      setMessage('已公开发布。私人原稿、位置及未选中的附件仍保持私密。')
    } catch (error) {
      setMessage((error as Error).message)
    } finally {
      setBusy(false)
    }
  }
  async function withdraw() {
    if (
      !publication ||
      !window.confirm('撤回公开笔记及公开附件入口？私人原稿保留。已经被下载的副本无法收回。')
    )
      return
    setBusy(true)
    try {
      await apiResult(await fetch(`/api/publications/${publication.id}/`, { method: 'DELETE' }))
      setPublication(undefined)
      setMessage('已撤回，公开链接和附件入口已失效。')
      setPreview(false)
    } catch (error) {
      setMessage((error as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <button disabled={disabled} onClick={open}>
        发布 / 管理公开笔记
      </button>
      <dialog ref={dialog} className="journal-dialog publish-dialog">
        <div className="section-heading">
          <h2>{preview ? '发布预览' : '公开笔记'}</h2>
          <button aria-label="关闭发布窗口" disabled={busy} onClick={() => dialog.current?.close()}>
            ×
          </button>
        </div>
        <p className="muted">
          公开的是独立副本，私人原稿后续修改不会自动同步。位置与原始日期不公开。
        </p>
        <p role="status" className="publish-message">
          {message}
        </p>
        {publication && (
          <div className="publication-links">
            <a href={`/notes/${publication.id}/`} target="_blank" rel="noreferrer">
              查看已公开版本 ↗
            </a>
            <button
              disabled={busy}
              onClick={async () => {
                const url = new URL(`/notes/${publication.id}/`, window.location.origin).href
                try {
                  await navigator.clipboard.writeText(url)
                  setMessage('分享链接已复制')
                } catch {
                  setMessage('分享链接：' + url)
                }
              }}
            >
              复制分享链接
            </button>
            <button disabled={busy} onClick={withdraw}>
              撤回公开
            </button>
          </div>
        )}
        {!preview ? (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              setPreview(true)
            }}
          >
            <label>
              公开标题
              <input
                value={title}
                required
                maxLength={160}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label>
              公开正文
              <textarea
                value={text}
                required
                maxLength={1000000}
                rows={8}
                onChange={(event) => setText(event.target.value)}
              />
            </label>
            <div className="form-row">
              <label>
                分类
                <input
                  value={category}
                  maxLength={60}
                  onChange={(event) => setCategory(event.target.value)}
                />
              </label>
              <label>
                标签（逗号分隔）
                <input
                  value={tags}
                  maxLength={300}
                  onChange={(event) => setTags(event.target.value)}
                />
              </label>
            </div>
            {entry.file && (
              <label className="publish-checkbox">
                <input
                  type="checkbox"
                  checked={shareFile}
                  onChange={(event) => setShareFile(event.target.checked)}
                />
                同时公开附件：{entry.file.name}（图片也将用作公开封面）
              </label>
            )}
            <p className="muted">
              {publication?.fileId && !shareFile
                ? '此次更新将取消原公开附件。'
                : '附件默认不公开；正文中的私人图片链接不会自动转为公开链接。'}
            </p>
            <button className="primary-button" disabled={busy || !title.trim() || !text.trim()}>
              下一步：预览发布内容
            </button>
          </form>
        ) : (
          <div className="publish-preview">
            <p className="eyebrow">
              {category} · {tags}
            </p>
            <h3>{title}</h3>
            <div className="publish-body">{text}</div>
            <p className="muted">
              附件：{shareFile ? entry.file?.name : '不公开'} · 城市位置：不公开
            </p>
            <label className="publish-checkbox">
              <input
                type="checkbox"
                checked={confirm}
                onChange={(event) => setConfirm(event.target.checked)}
              />
              我确认上述正文及选中的附件可被任何访客查看
            </label>
            <div className="publication-links">
              <button disabled={busy} onClick={() => setPreview(false)}>
                返回修改
              </button>
              <button className="primary-button" disabled={busy || !confirm} onClick={publish}>
                {busy ? '正在发布…' : publication ? '确认更新公开版本' : '确认公开发布'}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  )
}
