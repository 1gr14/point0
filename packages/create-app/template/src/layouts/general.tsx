import { NavLink } from '@/lib/navigation'
import { root } from '@/lib/root'
import { useIsNavigating } from '@point0/core/navigation'

export const generalLayout = root.lets('layout', 'generalLayout').layout(({ children }) => {
  const isNavigating = useIsNavigating()
  return (
    <div
      className="min-h-screen bg-linear-to-b from-slate-100 via-slate-50 to-blue-50 text-slate-800 transition-opacity duration-300 ease-in-out"
      style={{ opacity: isNavigating ? 0.6 : 1 }}
    >
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-2xl border border-white/70 bg-white/80 px-6 py-5 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              <NavLink className="hover:text-blue-700" exactClassName="pointer-events-none" route="home">
                My App
              </NavLink>
            </h1>
            <nav>
              <ul className="flex flex-wrap items-center gap-2">
                <li>
                  <NavLink
                    exactClassName="pointer-events-none text-slate-300!"
                    className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    route="home"
                  >
                    Home
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    exactClassName="pointer-events-none text-slate-300!"
                    className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    route="about"
                  >
                    About
                  </NavLink>
                </li>
              </ul>
            </nav>
          </div>
        </header>
        <main className="rounded-2xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur">{children}</main>
      </div>
    </div>
  )
})
