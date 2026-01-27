import { useCallback, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { clearToken, getToken } from '../auth/auth'
import { useSocketNotifications } from '../socket/useSocketNotifications'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function Layout() {
  const navigate = useNavigate()
  const token = getToken()
  const [realtimeCount, setRealtimeCount] = useState(0)

  const onNotification = useCallback(() => {
    setRealtimeCount((c) => c + 1)
  }, [])

  useSocketNotifications(onNotification)

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-primary">Todo</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  to="/"
                  className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
                >
                  Projects
                </Link>
                <Link
                  to="/notifications"
                  onClick={() => {
                    setRealtimeCount(0)
                  }}
                  className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
                >
                  Notifications
                  {realtimeCount > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {realtimeCount}
                    </Badge>
                  )}
                </Link>
                <Link
                  to="/admin"
                  className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
                >
                  Admin
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              {token ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    clearToken()
                    navigate('/login')
                  }}
                >
                  Logout
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}
