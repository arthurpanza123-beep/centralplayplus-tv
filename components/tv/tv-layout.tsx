import { Sidebar } from './sidebar'
import { Topbar } from './topbar'

interface TVLayoutProps {
  children: React.ReactNode
  title?: string
  headerRight?: React.ReactNode
}

export function TVLayout({ children, title, headerRight }: TVLayoutProps) {
  return (
    <div className="flex h-screen w-screen bg-background overflow-hidden">
      <Sidebar />

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top header bar */}
        <header className="flex items-center justify-between px-8 py-4 border-b border-border/30 shrink-0">
          <div className="flex items-center gap-4">
            {title && (
              <h1 className="text-2xl font-bold text-foreground text-balance">
                {title}
              </h1>
            )}
            {headerRight}
          </div>
          <Topbar />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
