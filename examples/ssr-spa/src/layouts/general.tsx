import { client } from '../lib/client'

export const generalLayout = client.layout(({ children }) => {
  return (
    <div>
      <h1>IdeaNick</h1>
      <hr />
      {children}
    </div>
  )
})
