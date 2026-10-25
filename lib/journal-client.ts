export type RemoteFile = { id: string; name: string; size: number; type: string }
export type JournalFile = File | RemoteFile
export type Entry = {
  id: string
  kind: 'note' | 'memo' | 'task'
  title: string
  text: string
  date: string
  time: string
  location: string
  done: boolean
  file?: JournalFile
}
export type Day = { location?: string; cover?: JournalFile; offset?: number; checkedIn?: boolean }
export type Goal = { id: string; title: string; date: string; done: boolean }
export type Store = {
  revision?: number
  entries: Entry[]
  days: Record<string, Day>
  goals?: Goal[]
}
export async function apiResult(response: Response) {
  const value = await response.json()
  if (!response.ok) throw new Error(value.error || '服务请求失败')
  return value
}
export async function serverLoad(): Promise<Store> {
  return apiResult(await fetch('/api/journal/', { cache: 'no-store' }))
}
async function upload(file?: JournalFile): Promise<RemoteFile | undefined> {
  if (!file) return undefined
  if (!(file instanceof File)) return file
  const body = new FormData()
  body.append('file', file)
  return apiResult(await fetch('/api/files/', { method: 'POST', body }))
}
export async function serverPersist(state: Store): Promise<Store> {
  const entries: Entry[] = []
  for (const entry of state.entries) entries.push({ ...entry, file: await upload(entry.file) })
  const days: Store['days'] = {}
  for (const [date, day] of Object.entries(state.days))
    days[date] = { ...day, cover: await upload(day.cover) }
  return apiResult(
    await fetch('/api/journal/', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        revision: state.revision || 0,
        entries,
        days,
        goals: state.goals || [],
      }),
    })
  )
}

export function newEntryId() {
  // getRandomValues is also available on HTTP LAN/IP pages, unlike randomUUID.
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 15) | 64
  bytes[8] = (bytes[8] & 63) | 128
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
