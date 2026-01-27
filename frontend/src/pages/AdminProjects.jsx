import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading'
import { Skeleton } from '@/components/ui/skeleton'

export default function AdminProjects() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/admin/projects')
      setItems(res.data.data || [])
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      await load()
    })()
  }, [load])

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage all projects in the system.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Button onClick={load} variant="outline" disabled={loading}>
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Refreshing...
              </>
            ) : (
              'Refresh'
            )}
          </Button>
        </div>
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              {loading ? (
                <div className="bg-white">
                  <div className="px-6 py-3 border-b border-gray-200">
                    <Skeleton className="h-4 w-16" />
                  </div>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="px-6 py-4 border-b border-gray-200">
                      <div className="flex items-center space-x-4">
                        <Skeleton className="h-4 w-8" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide"
                      >
                        ID
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide"
                      >
                        Name
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide"
                      >
                        Owner
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide"
                      >
                        Members
                      </th>
                      <th
                        scope="col"
                        className="relative px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {p.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {p.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {p.owner_email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="secondary">
                          {p.member_count || 0} members
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={async () => {
                            if (window.confirm('Are you sure you want to delete this project?')) {
                              await api.delete(`/api/admin/projects/${p.id}`)
                              load()
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              )}
              {items.length === 0 && !loading && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No projects found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
