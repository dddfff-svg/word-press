import Link from 'next/link'
import { notFound } from 'next/navigation'
import { readPublications } from '../../../lib/publications'
import PublicationActions from '../../../components/PublicationActions'
export const dynamic = 'force-dynamic'
export const metadata = { title: '公开笔记' }
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params,
    item = (await readPublications()).find((record) => record.id === id)
  if (!item) notFound()
  return (
    <article className="mx-auto max-w-3xl space-y-6 py-10">
      <PublicationActions id={id} />
      <Link href="/notes/" className="text-emerald-700">
        ← 公开笔记
      </Link>
      <p className="text-sm text-gray-400">
        {item.category} · 更新于 {item.updated.slice(0, 10)}
      </p>
      <h1 className="text-3xl font-semibold break-words">{item.title}</h1>
      <p className="text-sm text-emerald-700">{item.tags.map((tag) => '#' + tag).join(' ')}</p>
      <div className="leading-8 break-words whitespace-pre-wrap">{item.text}</div>
      {item.fileId && (
        <div className="rounded-xl border border-gray-200 p-5">
          {item.fileType?.startsWith('image/') && (
            <img
              className="mb-4 max-h-[600px] rounded-lg object-contain"
              src={`/api/public-files/${id}/`}
              alt={item.fileName}
            />
          )}
          <a
            className="text-emerald-700 underline"
            href={`/api/public-files/${id}/`}
            target="_blank"
            rel="noreferrer"
          >
            查看公开附件：{item.fileName}
          </a>
        </div>
      )}
    </article>
  )
}
