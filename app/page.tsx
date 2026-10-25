import JournalGate from '@/components/JournalGate'
import PublicNotes from '@/components/PublicNotes'
export const dynamic = 'force-dynamic'
export default function Page() {
  return (
    <>
      <JournalGate />
      <PublicNotes limit={3} />
    </>
  )
}
