export function checkinStats(days: Record<string, { checkedIn?: boolean }>, today: string) {
  const number = (date: string) => Date.parse(date + 'T00:00:00Z') / 86400000
  const current = number(today)
  const checked = new Set(
    Object.entries(days)
      .filter(([date, day]) => day.checkedIn && number(date) <= current)
      .map(([date]) => number(date))
  )
  let cursor = checked.has(current) ? current : current - 1
  let streak = 0
  while (checked.has(cursor)) {
    streak++
    cursor--
  }
  let longest = 0,
    run = 0,
    previous = -Infinity
  for (const day of [...checked].sort((a, b) => a - b)) {
    run = day === previous + 1 ? run + 1 : 1
    longest = Math.max(longest, run)
    previous = day
  }
  return { streak, total: checked.size, longest }
}
