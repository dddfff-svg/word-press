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
  return (
    <section className="task-card" aria-label="目标倒计时">
      <h2 className="text-xl font-semibold">目标倒计时</h2>
      <p className="muted">比赛、考试、旅行……给期待的日子定一个目标。按北京时间计算。</p>
      <form
        className="my-4 flex flex-wrap gap-3"
        onSubmit={async (event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          const targetDate = String(form.get('date') || '')
          if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) return
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
        <input
          className="rounded border bg-transparent p-2"
          aria-label="目标名称"
          placeholder="例如：12 月比赛"
          value={title}
          maxLength={160}
          required
          onChange={(event) => setTitle(event.target.value)}
        />
        <input
          className="rounded border bg-transparent p-2"
          aria-label="目标日期"
          name="date"
          type="date"
          required
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
        <button
          className="rounded bg-emerald-800 px-4 py-2 text-white disabled:opacity-50"
          disabled={disabled || !title.trim()}
        >
          添加目标
        </button>
      </form>
      <div className="grid gap-3 sm:grid-cols-2">
        {[...goals]
          .sort((a, b) => Number(a.done) - Number(b.done) || a.date.localeCompare(b.date))
          .map((goal) => {
            const remaining = Math.round(
              (Date.parse(goal.date + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 86400000
            )
            return (
              <article
                key={goal.id}
                className="space-y-2 rounded-xl border border-gray-200 p-4 dark:border-gray-700"
              >
                <h3 className="font-semibold break-words">{goal.title}</h3>
                <p className="text-sm text-gray-500">{goal.date}</p>
                <p className="text-lg text-emerald-700">
                  {goal.done
                    ? '✓ 已完成'
                    : remaining > 0
                      ? `还有 ${remaining} 天`
                      : remaining === 0
                        ? '就是今天！'
                        : `已过去 ${-remaining} 天`}
                </p>
                <div className="flex gap-4 text-sm">
                  <button
                    disabled={disabled}
                    onClick={() =>
                      onChange(
                        goals.map((item) =>
                          item.id === goal.id ? { ...item, done: !item.done } : item
                        )
                      )
                    }
                  >
                    {goal.done ? '恢复目标' : '标记完成'}
                  </button>
                  <button
                    disabled={disabled}
                    onClick={() => {
                      if (confirm(`删除目标“${goal.title}”？`))
                        onChange(goals.filter((item) => item.id !== goal.id))
                    }}
                  >
                    删除
                  </button>
                </div>
              </article>
            )
          })}
      </div>
      {!goals.length && <p className="muted">还没有目标，添加一个期待的日子吧。</p>}
    </section>
  )
}
