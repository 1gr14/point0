import { Link } from '@/lib/navigate'
import { root } from '@/lib/root'
import { useIsNavigating } from '@point0/core/navigation'

export const generalLayout = root.lets('layout', 'generalLayout').layout(({ children }) => {
  const isNavigating = useIsNavigating()
  return (
    <div style={{ opacity: isNavigating ? 0.5 : 1, transition: 'opacity 0.3s ease-in-out' }}>
      <h1>IdeaNick</h1>
      <ul>
        <li>
          <Link route="home">Home</Link>
        </li>
        <li>
          <Link route="ideaList">Browse Ideas</Link>
        </li>
        <li>
          <Link route="ideaCreate">Create Idea</Link>
        </li>
      </ul>
      <hr />
      {children}
    </div>
  )
})
