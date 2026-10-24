import Link from 'next/link'
import { headers } from 'next/headers'
import { NextRequest } from 'next/server'
import { authenticated, serverMode } from '../../lib/journal-server'
import { genPageMetadata } from '../seo'

export const metadata = genPageMetadata({ title: '密码库' })
export const dynamic = 'force-dynamic'
function vaultAddress() {
  try {
    const address = new URL(process.env.VAULT_PUBLIC_URL || '')
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(address.hostname)
    if (address.username || address.password || address.search || address.hash) return null
    if (address.protocol !== 'https:' && !(local && address.protocol === 'http:')) return null
    return address.href
  } catch {
    return null
  }
}
export default async function VaultPage() {
  const loggedIn =
    !serverMode() ||
    authenticated(new NextRequest('http://localhost/', { headers: await headers() }))
  const address = vaultAddress()
  return (
    <section className="py-10">
      <p className="text-xs tracking-widest text-gray-400">YOUR PRIVATE VAULT</p>
      <h1 className="mt-4 text-3xl font-semibold">密码库</h1>
      <p className="mt-4 max-w-2xl leading-8 text-gray-500">
        集中管理网站账号、密码与安全笔记。由独立部署的 Vaultwarden
        提供密码管理服务，使用密码库自己的账号与主密码解锁。
      </p>
      <div className="mt-8 rounded-2xl border border-gray-200 p-8 dark:border-gray-800">
        <h2 className="text-xl font-semibold">你的账号收藏夹</h2>
        <ul className="mt-5 space-y-3 text-sm text-gray-500">
          <li>保存与整理登录信息，生成随机密码。</li>
          <li>通过兼容的 Bitwarden 浏览器扩展或手机客户端访问。</li>
          <li>密码库数据单独保存，博客只提供访问入口。</li>
        </ul>
        {!loggedIn ? (
          <div className="mt-7">
            <p className="mb-4 text-sm text-gray-500">请先登录博客个人空间，再打开密码库入口。</p>
            <Link
              className="inline-block rounded-lg bg-emerald-800 px-5 py-3 text-sm text-white"
              href="/"
            >
              登录个人空间
            </Link>
          </div>
        ) : address ? (
          <div className="mt-7">
            <a
              className="inline-block rounded-lg bg-emerald-800 px-5 py-3 text-sm text-white"
              href={address}
              target="_blank"
              rel="noopener noreferrer"
            >
              打开并解锁密码库 ↗
            </a>
            <p className="mt-4 text-xs leading-6 text-gray-500">
              将在独立页面打开。博客登录不会自动解锁密码库；请使用自己的密码库主密码。
            </p>
          </div>
        ) : (
          <div className="mt-7 rounded-lg bg-gray-50 p-5 dark:bg-gray-900">
            <p className="text-sm font-medium">密码库尚未配置</p>
            <p className="mt-2 text-sm leading-7 text-gray-500">
              无域名时可通过 SSH 隧道访问 localhost。在 deploy.env 中填写 VAULT_PUBLIC_URL
              并重新创建博客容器；公网地址需使用 HTTPS。
            </p>
            <a
              className="mt-3 inline-block text-sm text-emerald-700 dark:text-emerald-400"
              href="https://github.com/dddfff-svg/word-press/blob/main/VAULT.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              查看密码库部署步骤 ↗
            </a>
          </div>
        )}
      </div>
    </section>
  )
}

