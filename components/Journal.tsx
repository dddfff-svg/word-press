'use client'

import { useEffect, useRef, useState } from 'react'
import './journal.css'
import {
  Entry,
  Store,
  JournalFile,
  serverLoad,
  serverPersist,
  newEntryId,
} from '../lib/journal-client'

const empty: Store = { entries: [], days: {} }
const covers = [
  '/static/images/ocean.jpeg',
  '/static/images/canada/mountains.jpg',
  '/static/images/canada/lake.jpg',
  '/static/images/canada/maple.jpg',
  '/static/images/canada/toronto.jpg',
]
const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
const dateObj = (date: string) => new Date(date + 'T12:00:00+08:00')
const dayNumber = (date: string) => Math.floor(Date.parse(date + 'T00:00:00Z') / 86400000)
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('daily-journal', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('journal')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
async function load(): Promise<Store> {
  const db = await database()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('journal', 'readonly')
    const req = tx.objectStore('journal').get('state')
    req.onsuccess = () => resolve(req.result || empty)
    req.onerror = () => reject(req.error)
    tx.oncomplete = () => db.close()
  })
}
async function persist(state: Store) {
  const db = await database()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('journal', 'readwrite')
    tx.objectStore('journal').put(state, 'state')
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
    tx.onabort = () => {
      db.close()
      reject(tx.error)
    }
  })
}
function useFileUrl(file?: JournalFile) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    if (!file) {
      setUrl('')
      return
    }
    if (!(file instanceof File)) {
      setUrl('/api/files/' + file.id + '/')
      return
    }
    const value = URL.createObjectURL(file)
    setUrl(value)
    return () => URL.revokeObjectURL(value)
  }, [file])
  return url
}
function Attachment({ file }: { file: JournalFile }) {
  const url = useFileUrl(file)
  return (
    <div className="attachment">
      {file.type.startsWith('image/') && url && <img src={url} alt={file.name} />}
      {file.type === 'application/pdf' && url && (
        <a href={url} target="_blank" rel="noreferrer">
          打开 PDF 预览 ↗
        </a>
      )}
      <a href={file instanceof File ? url : url + '?download=1'} download={file.name}>
        ↓ {file.name} · {(file.size / 1024).toFixed(0)} KB
      </a>
    </div>
  )
}

export default function Journal({ storage }: { storage: 'local' | 'server' }) {
  const [state, setState] = useState<Store>(empty)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [date, setDate] = useState('')
  const [currentDay, setCurrentDay] = useState('')
  const [tab, setTab] = useState('today')
  const [month, setMonth] = useState('')
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const [modal, setModal] = useState<Entry['kind'] | 'location' | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [entryDate, setEntryDate] = useState('')
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')
  const [file, setFile] = useState<JournalFile>()
  const [locating, setLocating] = useState(false)
  const coverInput = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const coverUrl = useFileUrl(state.days[date]?.cover)
  useEffect(() => {
    const day = today()
    setDate(day)
    setCurrentDay(day)
    setMonth(day.slice(0, 7))
    ;(storage === 'server' ? serverLoad() : load())
      .then((value) => {
        setState(value)
        setReady(true)
      })
      .catch((error) =>
        setNotice(error instanceof Error ? error.message : '无法打开个人空间，请刷新重试。')
      )
    const timer = window.setInterval(() => {
      const next = today()
      setCurrentDay((previous) => {
        if (next !== previous) setDate((selected) => (selected === previous ? next : selected))
        return next
      })
    }, 30000)
    return () => clearInterval(timer)
  }, [storage])
  useEffect(() => {
    if (modal) dialogRef.current?.showModal()
    else dialogRef.current?.close()
  }, [modal])
  async function save(next: Store) {
    if (!ready || busy) return false
    setBusy(true)
    try {
      const saved = storage === 'server' ? await serverPersist(next) : (await persist(next), next)
      setState(saved)
      setNotice(storage === 'server' ? '已保存到服务器' : '已保存到此浏览器')
      return true
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '保存失败，请保留原文件后重试。')
      return false
    } finally {
      setBusy(false)
    }
  }
  function open(kind: Entry['kind'] | 'location', entry?: Entry) {
    setEditing(entry?.id || null)
    setTitle(entry?.title || '')
    setText(entry?.text || '')
    setEntryDate(entry?.date || date)
    setTime(entry?.time || '')
    setLocation(entry?.location || state.days[date]?.location || '')
    setFile(entry?.file)
    setModal(kind)
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (modal === 'location') {
      if (
        await save({
          ...state,
          days: { ...state.days, [date]: { ...state.days[date], location: location.trim() } },
        })
      )
        setModal(null)
      return
    }
    if (!modal) return
    const entry: Entry = {
      id: editing || newEntryId(),
      kind: modal,
      title: title.trim(),
      text,
      date: entryDate,
      time,
      location: location.trim(),
      done: state.entries.find((x) => x.id === editing)?.done || false,
      file,
    }
    if (!entry.title) return
    if (
      await save({ ...state, entries: [entry, ...state.entries.filter((x) => x.id !== editing)] })
    )
      setModal(null)
  }
  function chooseFile(value?: File) {
    if (!value) return
    if (value.size > 20 * 1024 * 1024) {
      setNotice('单个附件请控制在 20 MB 内')
      return
    }
    setFile(value)
    if (!title) setTitle(value.name.replace(/\.[^.]+$/, ''))
    if (/\.(md|txt)$/i.test(value.name))
      value
        .text()
        .then(setText)
        .catch(() => setNotice('文本读取失败，可以保留为附件。'))
  }
  function locate() {
    if (!navigator.geolocation) {
      setNotice('此浏览器不支持定位，请手动填写')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation(
          `${position.coords.latitude.toFixed(3)}°, ${position.coords.longitude.toFixed(3)}°`
        )
        setLocating(false)
        setNotice('已获取坐标，可改为城市或自定义地点；尚未保存。')
      },
      () => {
        setLocating(false)
        setNotice('未能获取位置，请手动填写城市或地点。')
      },
      { timeout: 10000 }
    )
  }
  const tasks = state.entries.filter((x) => x.kind === 'task' && x.date === date)
  const visible = state.entries
    .filter(
      (x) =>
        (tab === 'today'
          ? x.date === date && x.kind !== 'task'
          : x.kind === { notes: 'note', memos: 'memo', plans: 'task' }[tab]) &&
        `${x.title} ${x.text} ${x.location}`.toLowerCase().includes(query.toLowerCase())
    )
    .sort((a, b) => b.date.localeCompare(a.date) || a.time.localeCompare(b.time))
  const monthStart = month ? new Date(month + '-01T12:00:00') : new Date()
  const monthCount = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate()
  const monthOffset = (monthStart.getDay() + 6) % 7
  const photo =
    coverUrl ||
    covers[((date ? dayNumber(date) : 0) + (state.days[date]?.offset || 0)) % covers.length]
  const completed = tasks.filter((x) => x.done).length
  function moveMonth(delta: number) {
    const value = new Date(monthStart.getFullYear(), monthStart.getMonth() + delta, 1)
    setMonth(`${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`)
  }
  async function remove(id: string) {
    if (
      window.confirm(
        storage === 'server'
          ? '确定删除这条记录？附件原文件暂时保留在服务器存储中。'
          : '确定删除这条本地记录及其附件？'
      )
    )
      await save({ ...state, entries: state.entries.filter((x) => x.id !== id) })
  }
  return (
    <div className="journal">
      <div className="journal-intro">
        <div>
          <p className="eyebrow">MY LITTLE CORNER OF THE WORLD</p>
          <h1>
            把日子，慢慢写下来<span>。</span>
          </h1>
          <p>收藏知识，记录灵感，也认真对待每一个平凡的今天。</p>
        </div>
        <span className="local-badge">
          ◉ {storage === 'server' ? '服务端个人空间' : '本地个人空间'}
        </span>
      </div>
      <section
        className="day-cover"
        style={{
          backgroundImage: `linear-gradient(90deg,rgba(14,32,33,.74),rgba(14,32,33,.18)),url("${photo}")`,
        }}
        aria-label="每日封面"
      >
        <div className="cover-top">
          <span>ONE DAY, ONE MEMORY</span>
          <button disabled={!ready || busy} onClick={() => coverInput.current?.click()}>
            ▧ 上传封面
          </button>
          <button
            disabled={!ready || busy}
            onClick={() =>
              save({
                ...state,
                days: {
                  ...state.days,
                  [date]: {
                    ...state.days[date],
                    cover: undefined,
                    offset: (state.days[date]?.offset || 0) + 1,
                  },
                },
              })
            }
          >
            ↻ 换一张
          </button>
        </div>
        <p className="cover-date">
          {date
            ? new Intl.DateTimeFormat('zh-CN', {
                timeZone: 'Asia/Shanghai',
                year: 'numeric',
                month: 'long',
              }).format(dateObj(date))
            : '载入中'}
        </p>
        <div className="cover-day">
          <strong>{date?.slice(8) || '—'}</strong>
          <div>
            <p>
              {date
                ? new Intl.DateTimeFormat('zh-CN', {
                    timeZone: 'Asia/Shanghai',
                    weekday: 'long',
                  }).format(dateObj(date))
                : ''}
            </p>
            <button disabled={!ready || busy} onClick={() => open('location')}>
              ⌖ {state.days[date]?.location || '添加今天的位置'} ↗
            </button>
          </div>
        </div>
        <p className="cover-quote">在自己的节奏里，收集生活的微光。</p>
        <div className="quick-actions">
          <button disabled={!ready || busy} onClick={() => open('memo')}>
            ＋ 写随记
          </button>
          <button disabled={!ready || busy} onClick={() => open('task')}>
            ✓ 新增计划
          </button>
          <button disabled={!ready || busy} onClick={() => open('note')}>
            ↑ 上传笔记
          </button>
          <label>
            查看日期{' '}
            <input
              aria-label="查看日期"
              type="date"
              value={date}
              onChange={(e) => {
                if (e.target.value) {
                  setDate(e.target.value)
                  setMonth(e.target.value.slice(0, 7))
                }
              }}
            />
          </label>
        </div>
        <input
          hidden
          ref={coverInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (f && f.size <= 10 * 1024 * 1024 && /^image\/(jpeg|png|webp)$/.test(f.type))
              await save({
                ...state,
                days: { ...state.days, [date]: { ...state.days[date], cover: f } },
              })
            else if (f) setNotice('请选择 10 MB 内的 JPG、PNG 或 WebP 图片')
            e.target.value = ''
          }}
        />
      </section>
      <div className="workspace-layout">
        <section className="journal-main">
          <nav className="journal-tabs" aria-label="内容分类">
            {[
              ['today', '今日概览'],
              ['notes', '笔记库'],
              ['memos', '日常随记'],
              ['plans', '所有计划'],
            ].map(([id, label]) => (
              <button
                key={id}
                aria-current={tab === id ? 'page' : undefined}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                {tab === 'today' ? 'A LITTLE EVERY DAY' : 'YOUR COLLECTION'}
              </p>
              <h2>
                {
                  {
                    today: '日子里的小记录',
                    notes: '我的笔记库',
                    memos: '灵感与日常',
                    plans: '把想做的事放进日历',
                  }[tab]
                }
              </h2>
            </div>
            <input
              className="search-field"
              aria-label="搜索记录"
              placeholder="搜索记录…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="entry-list">
            {visible.length === 0 ? (
              <div className="empty-state">
                <span>✎</span>
                <h3>{ready ? '留下一点属于今天的痕迹' : '正在打开你的个人空间…'}</h3>
                <p>一段想法、一份笔记，或者一个小小的计划。</p>
                <button
                  disabled={!ready || busy}
                  onClick={() => open(tab === 'notes' ? 'note' : tab === 'plans' ? 'task' : 'memo')}
                >
                  ＋ 创建第一条记录
                </button>
              </div>
            ) : (
              visible.map((entry) => (
                <article className="entry-card" key={entry.id}>
                  <div className="entry-meta">
                    <span>{{ note: '笔记', memo: '随记', task: '计划' }[entry.kind]}</span>
                    <time>
                      {entry.date} {entry.time}
                    </time>
                    {entry.location && <span>⌖ {entry.location}</span>}
                  </div>
                  <h3>
                    {entry.kind === 'task' && (
                      <input
                        aria-label={`完成 ${entry.title}`}
                        type="checkbox"
                        disabled={busy}
                        checked={entry.done}
                        onChange={() =>
                          save({
                            ...state,
                            entries: state.entries.map((x) =>
                              x.id === entry.id ? { ...x, done: !x.done } : x
                            ),
                          })
                        }
                      />
                    )}{' '}
                    {entry.title}
                  </h3>
                  {entry.text && <p className="entry-text">{entry.text}</p>}
                  {entry.file && <Attachment file={entry.file} />}
                  <div className="entry-controls">
                    <button disabled={busy} onClick={() => open(entry.kind, entry)}>
                      编辑
                    </button>
                    <button disabled={busy} onClick={() => remove(entry.id)}>
                      删除
                    </button>
                    <span>{storage === 'server' ? '仅管理员可见' : '仅此浏览器可见'}</span>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
        <aside className="journal-aside">
          <section className="calendar-card">
            <div className="calendar-heading">
              <h2>{month.replace('-', '年')}月</h2>
              <div>
                <button aria-label="上个月" onClick={() => moveMonth(-1)}>
                  ‹
                </button>
                <button aria-label="下个月" onClick={() => moveMonth(1)}>
                  ›
                </button>
              </div>
            </div>
            <div className="calendar-grid">
              {['一', '二', '三', '四', '五', '六', '日'].map((x) => (
                <span className="weekday" key={x}>
                  {x}
                </span>
              ))}
              {Array.from({ length: monthOffset }, (_, i) => (
                <span key={'blank' + i} />
              ))}
              {Array.from({ length: monthCount }, (_, i) => {
                const day = `${month}-${String(i + 1).padStart(2, '0')}`
                const hasEntry = state.entries.some((x) => x.date === day)
                return (
                  <button
                    key={day}
                    aria-label={day}
                    aria-pressed={date === day}
                    className={`${day === date ? 'selected' : ''} ${day === currentDay ? 'is-today' : ''}`}
                    onClick={() => {
                      setDate(day)
                      setTab('today')
                    }}
                  >
                    {i + 1}
                    <i className={hasEntry ? 'has-entry' : ''} />
                  </button>
                )
              })}
            </div>
            <button
              className="back-today"
              onClick={() => {
                setDate(currentDay)
                setMonth(currentDay.slice(0, 7))
                setTab('today')
              }}
            >
              回到今天 ↗
            </button>
          </section>
          <section className="task-card">
            <div className="section-heading">
              <h2>当日计划</h2>
              <span>
                {completed}/{tasks.length}
              </span>
            </div>
            <div className="progress-track">
              <div style={{ width: `${tasks.length ? (completed / tasks.length) * 100 : 0}%` }} />
            </div>
            {tasks.length === 0 && <p className="muted">给这一天安排一件小事吧。</p>}
            {tasks.map((task) => (
              <label className={`task-row ${task.done ? 'done' : ''}`} key={task.id}>
                <input
                  type="checkbox"
                  disabled={busy}
                  checked={task.done}
                  onChange={() =>
                    save({
                      ...state,
                      entries: state.entries.map((x) =>
                        x.id === task.id ? { ...x, done: !x.done } : x
                      ),
                    })
                  }
                />
                <span>
                  {task.title}
                  <small>{task.time || '全天'}</small>
                </span>
              </label>
            ))}
            <button className="add-task" disabled={!ready || busy} onClick={() => open('task')}>
              ＋ 添加计划
            </button>
          </section>
          <div className="storage-info">
            <strong>你的小小私人空间</strong>
            <p>
              {storage === 'server'
                ? '文件和记录保存在服务器数据卷中。登录同一站点即可在其他设备访问，请定期备份数据卷。'
                : '文件和记录保存在此浏览器；清理浏览器数据会移除记录，请保留原文件。'}
            </p>
          </div>
        </aside>
      </div>
      {notice && (
        <div className="journal-notice" role="status">
          {notice}
          <button aria-label="关闭提示" onClick={() => setNotice('')}>
            ×
          </button>
        </div>
      )}
      <dialog ref={dialogRef} className="journal-dialog" onCancel={() => setModal(null)}>
        <form onSubmit={submit}>
          <div className="section-heading">
            <h2>
              {modal === 'location'
                ? '这一天，你在哪里'
                : `${editing ? '编辑' : '新建'}${{ note: '笔记', memo: '随记', task: '计划' }[modal || 'memo']}`}
            </h2>
            <button type="button" aria-label="关闭" onClick={() => setModal(null)}>
              ×
            </button>
          </div>
          {modal === 'location' ? (
            <>
              <label>
                地点
                <input
                  value={location}
                  maxLength={100}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="例如：杭州 · 西湖 / 家里"
                />
              </label>
              <button
                className="secondary-button"
                type="button"
                disabled={locating}
                onClick={locate}
              >
                {locating ? '正在定位…' : '⌖ 获取当前位置坐标'}
              </button>
              <p className="muted">
                定位需浏览器授权。可以将坐标改成城市名称，保存后仅在此浏览器中显示。
              </p>
            </>
          ) : (
            <>
              <label>
                标题
                <input
                  required
                  maxLength={160}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="给这条记录起个名字"
                />
              </label>
              <div className="form-row">
                <label>
                  所属日期
                  <input
                    required
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                  />
                </label>
                <label>
                  时间（北京时间）
                  <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                </label>
              </div>
              {modal === 'note' && (
                <label className="upload-area">
                  ↑ 点击选择文件，支持 Markdown、TXT、PDF、图片和 Word
                  <input
                    type="file"
                    accept=".md,.txt,.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                    onChange={(e) => chooseFile(e.target.files?.[0])}
                  />
                  <small>
                    {file ? file.name : '单个文件最大 20 MB；文本可导入，其他格式保存原文件'}
                  </small>
                </label>
              )}
              <label>
                {modal === 'task' ? '备注' : '正文'}
                <textarea
                  rows={6}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="写点什么吧…"
                />
              </label>
              <label>
                地点（可选）
                <input
                  value={location}
                  maxLength={100}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="城市、地点，或留空"
                />
              </label>
            </>
          )}
          <div className="dialog-footer">
            <span>
              {storage === 'server' ? '服务端保存' : '本地保存'} ·{' '}
              {storage === 'server' ? '仅管理员可见' : '仅此浏览器可见'}
            </span>
            <button className="primary-button" type="submit" disabled={busy || !ready}>
              {busy ? '保存中…' : '保存记录'}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  )
}
