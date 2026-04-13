import { Suspense } from 'react'
import { useRoutes } from 'react-router-dom'
import PageLoader from '@/components/ui/PageLoader'
import { appRoutes } from '@/routes/app-routes'
import { publicRoutes } from '@/routes/public-routes'

export default function App() {
  const routes = useRoutes([...publicRoutes, ...appRoutes])

  return (
    <Suspense fallback={<PageLoader />}>
      {routes}
    </Suspense>
  )
}
