import Link from 'next/link'
import { readPublications } from '../lib/publications'
export default async function PublicNotes({ limit }: { limit?: number }) {
  const all = (await readPublications()).sort((a, b) => b.updated.localeCompare(a.updated)),
    items = limit ? all.slice(0, limit) : all
  return (
    <section className="my-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs tracking-widest text-gray-400">SHARE A LITTLE INSPIRATION</p>
          <h2 className="mt-2 text-2xl font-semibold">公开笔记</h2>
        </div>
        {limit && (
          <Link className="text-sm text-emerald-700" href="/notes/">
            查看全部 ↗
          </Link>
        )}
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            className="rounded-2xl border border-gray-200 p-5 hover:border-emerald-400 dark:border-gray-700"
            key={item.id}
            href={`/notes/${item.id}/`}
          >
            {item.fileType?.startsWith('image/') && (
              <img
                className="mb-4 h-36 w-full rounded-lg object-cover"
                src={`/api/public-files/${item.id}/`}
                alt={item.title}
              />
            )}
            <p className="text-xs text-gray-400">
              {item.category} · {item.updated.slice(0, 10)}
            </p>
            <h3 className="mt-3 font-semibold break-words">{item.title}</h3>
            <p className="mt-3 line-clamp-3 text-sm leading-7 break-words text-gray-500">
              {item.text.slice(0, 240)}
            </p>
            <p className="mt-3 text-xs text-emerald-700">
              {item.tags.map((tag) => '#' + tag).join(' ')}
            </p>
          </Link>
        ))}
      </div>
      {!items.length && (
        <p className="rounded-2xl border border-dashed border-gray-200 p-8 text-sm text-gray-400">
          还没有公开笔记。私人笔记不会自动出现在这里。
        </p>
      )}
    </section>
  )
}
