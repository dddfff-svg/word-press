import Link from 'next/link'
import { headers } from 'next/headers'
import { NextRequest } from 'next/server'
import { authenticated, serverMode } from '../../lib/journal-server'
export const dynamic = 'force-dynamic'
export const metadata = { title: '抖音续火花' }
export default async function SparkPage() {
  const loggedIn =
    !serverMode() ||
    authenticated(new NextRequest('http://localhost/', { headers: await headers() }))
  let address = ''
  try {
    const url = new URL(process.env.SPARK_PUBLIC_URL || '')
    if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password)
      address = url.href
  } catch {
    address = ''
  }
  return (
    <section className="space-y-6 py-12">
      <Link className="text-emerald-700" href="/">
        ← 回到随记
      </Link>
      <p className="text-xs tracking-widest text-gray-400">A LITTLE CONNECTION</p>
      <h1 className="text-3xl font-semibold">抖音续火花</h1>
      <p className="text-gray-500">从这里打开你服务器上已有的续火花服务，查看任务和运行情况。</p>
      <div className="rounded-2xl border border-gray-200 p-8 dark:border-gray-700">
        {!loggedIn ? (
          <Link href="/" className="text-emerald-700">
            先登录个人空间 →
          </Link>
        ) : address ? (
          <>
            <a
              className="inline-block rounded-xl bg-emerald-800 px-6 py-3 text-white"
              href={address}
              target="_blank"
              rel="noopener noreferrer"
            >
              打开续火花控制台 ↗
            </a>
            <p className="mt-4 text-sm text-gray-500">
              将在独立标签页打开。继续使用原服务的登录方式，博客登录不会代替该服务的验证。
            </p>
          </>
        ) : (
          <p className="text-gray-500">
            服务地址待配置。确认现有服务的访问地址和端口后，即可接通这里的入口。
          </p>
        )}
      </div>
    </section>
  )
}
