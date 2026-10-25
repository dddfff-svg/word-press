import siteMetadata from '@/data/siteMetadata'
import headerNavLinks from '@/data/headerNavLinks'
import Logo from '@/data/logo.svg'
import Link from './Link'
import MobileNav from './MobileNav'
import ThemeSwitch from './ThemeSwitch'
import SearchButton from './SearchButton'
import HomeMark from './HomeMark'

const Header = () => {
  let headerClass = 'flex items-center w-full bg-white dark:bg-gray-950 justify-between py-10'
  if (siteMetadata.stickyNav) {
    headerClass += ' sticky top-0 z-50'
  }

  return (
    <header className={headerClass}>
      <Link href="/" aria-label={siteMetadata.headerTitle}>
        <div className="flex items-center justify-between">
          <div className="mr-3">
            <Logo />
          </div>
          {typeof siteMetadata.headerTitle === 'string' ? (
            <div className="hidden h-6 text-2xl font-semibold sm:block">
              {siteMetadata.headerTitle}
            </div>
          ) : (
            siteMetadata.headerTitle
          )}
        </div>
      </Link>
      <div className="flex items-center space-x-4 leading-5 sm:-mr-6 sm:space-x-6">
        <div className="no-scrollbar hidden max-w-[55vw] items-center gap-x-3 overflow-x-auto sm:flex lg:max-w-none">
          {headerNavLinks.map((link) => (
            <Link
              key={link.title}
              href={link.href}
              className={`hover:text-primary-500 dark:hover:text-primary-400 m-1 flex shrink-0 items-center gap-2 text-sm font-medium whitespace-nowrap text-gray-900 dark:text-gray-100 ${link.href === '/' ? 'rounded-full bg-emerald-50 px-3 py-2 tracking-wide dark:bg-emerald-950' : ''}`}
            >
              {link.title}
              {link.href === '/' && <HomeMark />}
            </Link>
          ))}
        </div>
        <SearchButton />
        <ThemeSwitch />
        <MobileNav />
      </div>
    </header>
  )
}

export default Header
