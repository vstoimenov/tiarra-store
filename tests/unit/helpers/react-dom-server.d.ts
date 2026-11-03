// The project has no @types/react-dom; the component tests only need this one function from it.
declare module 'react-dom/server' {
  import type { ReactNode } from 'react'

  export function renderToStaticMarkup(element: ReactNode): string
}
