'use client'
import { useState } from 'react'
import { checkinStats } from '../lib/checkin'
import type { Store } from '../lib/journal-client'
export default function Checkin({
  days,
  today,
  disabled,
  onCheckin,
}: {
  days: Store['days']
  today: string
  disabled: boolean
  onCheckin: (title: string) => Promise<boolean>
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const latest =
    Object.entries(days)
      .filter(([, day]) => day.checkinTitle)
      .sort(([a], [b]) => b.localeCompare(a))[0]?.[1].checkinTitle || ''
  const checked = !!days[today]?.checkedIn
  const title = checked ? days[today]?.checkinTitle || '每日打卡' : (draft ?? latest)
  const stats = checkinStats(days, today)
  return (
    <section className="checkin-card" aria-label="每日打卡">
      <div className="checkin-heading">
        <span className="checkin-icon">✓</span>
        <div>
          <p className="eyebrow">A LITTLE EVERY DAY</p>
          <h2>把坚持，变成日常。</h2>
        </div>
      </div>
      <form
        onSubmit={async (event) => {
          event.preventDefault()
          if (title.trim()) await onCheckin(title.trim())
        }}
      >
        <label htmlFor="checkin-title">今天在坚持什么？</label>
        <div className="checkin-action">
          <input
            id="checkin-title"
            maxLength={100}
            required
            disabled={checked || disabled}
            value={title}
            placeholder="例如：跑步 3 公里 / 读书 30 分钟"
            onChange={(event) => setDraft(event.target.value)}
          />
          <button disabled={disabled || checked || !title.trim()}>
            {checked ? '✓ 今日已打卡' : '✓ 完成打卡'}
          </button>
        </div>
      </form>
      <div className="checkin-stats">
        <span>
          连续 <strong>{stats.streak}</strong> 天
        </span>
        <span>
          累计 <strong>{stats.total}</strong> 天
        </span>
        <span>
          最长 <strong>{stats.longest}</strong> 天
        </span>
      </div>
      <p className="checkin-help">每天记录一件坚持的事，天数统计包含全部打卡。标题会在次日沿用。</p>
      <div className="checkin-week" aria-label="最近七天打卡记录">
        {Array.from({ length: 7 }, (_, index) => {
          const date = new Date(Date.parse(today + 'T00:00:00Z') - (6 - index) * 86400000)
            .toISOString()
            .slice(0, 10)
          const day = days[date]
          return (
            <span
              key={date}
              className={day?.checkedIn ? 'is-checked' : ''}
              title={`${date} ${day?.checkedIn ? day.checkinTitle || '每日打卡' : '未打卡'}`}
            >
              <small>{date.slice(5)}</small>
              <strong>{day?.checkedIn ? '✓' : '·'}</strong>
            </span>
          )
        })}
      </div>
    </section>
  )
}
