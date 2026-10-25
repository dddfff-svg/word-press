'use client'
import { useState } from 'react'
import { newEntryId, type Goal } from '../lib/journal-client'
export default function Goals({
  goals,
  today,
  disabled,
  onChange,
}: {
  goals: Goal[]
  today: string
  disabled: boolean
  onChange: (goals: Goal[]) => Promise<boolean>
}) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const remaining = (goal: Goal) =>
    Math.round((Date.parse(goal.date + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 86400000)
  const ordered = [...goals].sort(
    (a, b) =>
      Number(a.done) - Number(b.done) ||
      Number(remaining(a) < 0) - Number(remaining(b) < 0) ||
      a.date.localeCompare(b.date)
  )
  const featured = ordered.find((goal) => !goal.done)
  const count = featured ? remaining(featured) : 0
  return (
    <aside className="cover-goals" aria-label="比赛与计划倒计时">
      <div className="goal-caption">
        <span>下一站 · 值得期待</span>
        <span>◷</span>
      </div>
      {featured ? (
        <>
          <h2>{featured.title}</h2>
          <div className="goal-count">
            <strong>{Math.abs(count)}</strong>
            <span>{count > 0 ? '天后出发' : count === 0 ? '就是今天' : '天前已到期'}</span>
          </div>
          <p className="goal-deadline">
            {featured.date.replaceAll('-', ' / ')}{' '}
            <span>· {count < 0 ? '目标日期已过' : '每一天，都更近一点'}</span>
          </p>
        </>
      ) : (
        <>
          <h2>给未来一点期待</h2>
          <p className="goal-empty">比赛、考试，或一件想完成的小事。</p>
        </>
      )}
      <details className="goal-manager">
        <summary>
          比赛与计划{' '}
          <span>{goals.length ? `${goals.length} 个目标 · 管理 ＋` : '添加一个目标 ＋'}</span>
        </summary>
        <div className="goal-manager-body">
          {ordered.map((goal) => (
            <div key={goal.id} className="goal-mini-row">
              <div>
                <strong>{goal.title}</strong>
                <small>
                  {goal.date} ·{' '}
                  {goal.done
                    ? '已完成'
                    : remaining(goal) === 0
                      ? '就是今天'
                      : remaining(goal) > 0
                        ? `还有 ${remaining(goal)} 天`
                        : `已过去 ${-remaining(goal)} 天`}
                </small>
              </div>
              <button
                type="button"
                disabled={disabled}
                aria-label={`${goal.done ? '恢复' : '完成'}目标：${goal.title}`}
                onClick={() =>
                  onChange(
                    goals.map((item) =>
                      item.id === goal.id ? { ...item, done: !item.done } : item
                    )
                  )
                }
              >
                {goal.done ? '↶' : '✓'}
              </button>
              <button
                type="button"
                disabled={disabled}
                aria-label={`删除目标：${goal.title}`}
                onClick={() => {
                  if (confirm(`删除目标“${goal.title}”？`))
                    onChange(goals.filter((item) => item.id !== goal.id))
                }}
              >
                ×
              </button>
            </div>
          ))}
          <form
            onSubmit={async (event) => {
              event.preventDefault()
              const targetDate = String(new FormData(event.currentTarget).get('date') || '')
              if (!title.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) return
              if (
                await onChange([
                  ...goals,
                  { id: newEntryId(), title: title.trim(), date: targetDate, done: false },
                ])
              ) {
                setTitle('')
                setDate('')
              }
            }}
          >
            <label>
              目标名称
              <input
                aria-label="目标名称"
                required
                maxLength={160}
                value={title}
                placeholder="例如：12 月 1 日比赛"
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label>
              目标日期
              <input
                aria-label="目标日期"
                name="date"
                type="date"
                value={date}
                required
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
            <button disabled={disabled || !title.trim()} className="goal-add">
              添加目标
            </button>
          </form>
        </div>
      </details>
    </aside>
  )
}
