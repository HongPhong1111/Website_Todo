import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function Notifications() {
  const [items, setItems] = useState([])

  const load = useCallback(async () => {
    const res = await api.get('/api/notifications')
    setItems(res.data.data || [])
  }, [])

  useEffect(() => {
    ;(async () => {
      await load()
    })()
  }, [load])

  const markRead = useCallback(
    async (id) => {
      await api.post(`/api/notifications/${id}/read`)
      await load()
    },
    [load]
  )

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
          <p className="mt-2 text-sm text-gray-700">
            Stay updated with your project activities and team updates.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Button onClick={load} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      <div className="mt-8">
        {items.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500">No notifications yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {items.map((n) => (
              <Card
                key={n.id}
                className={`transition-all ${
                  !n.is_read ? 'border-l-4 border-l-primary bg-primary/5' : ''
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-medium text-gray-900">
                          {n.title}
                        </h3>
                        {!n.is_read && (
                          <Badge variant="default">New</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {n.message || n.title}
                      </p>
                      <p className="mt-2 text-xs text-gray-500">
                        {formatDate(n.created_at)}
                      </p>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      {!n.is_read ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            markRead(n.id)
                          }}
                        >
                          Mark as read
                        </Button>
                      ) : (
                        <Badge variant="secondary">Read</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
