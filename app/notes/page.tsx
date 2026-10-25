import Link from 'next/link'
import PublicNotes from '../../components/PublicNotes'
export const dynamic = 'force-dynamic'
export const metadata = { title: '公开笔记' }
export default function Page() {
  return (
    <>
      <Link className="text-emerald-700" href="/">
        ← 回到随记
      </Link>
      <PublicNotes />
    </>
  )
}
