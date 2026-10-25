import Documents from '../../components/Documents'
import { genPageMetadata } from '../seo'
export const metadata = genPageMetadata({ title: '我的资料' })
export default function Page() {
  return <Documents />
}
