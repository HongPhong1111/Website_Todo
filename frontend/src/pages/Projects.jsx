import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading'
import { Skeleton } from '@/components/ui/skeleton'
import { FolderOpen, Plus, Users, Calendar, Star, TrendingUp, Clock } from 'lucide-react'

export default function Projects() {
  const [items, setItems] = useState([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/projects')
      setItems(res.data.data || [])
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleCreate = useCallback(async () => {
    if (!name.trim()) return
    
    setCreating(true)
    try {
      const res = await api.post('/api/projects', { name: name.trim() })
      setItems(prev => [res.data, ...prev])
      setName('')
    } catch (error) {
      console.error('Failed to create project:', error)
    } finally {
      setCreating(false)
    }
  }, [name])

  useEffect(() => {
    ;(async () => {
      await load()
    })()
  }, [load])

  return (
    <div className="px-4 sm:px-6 lg:px-8 animate-fade-in">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FolderOpen className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage your collaborative projects and track progress
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Enter project name..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                  disabled={creating}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={creating || !name.trim()}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 btn-shine hover-lift"
              >
                {creating ? (
                  <div className="flex items-center space-x-2">
                    <LoadingSpinner size="sm" />
                    <span>Creating...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>Create Project</span>
                  </div>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          [1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          items.map((p, index) => (
            <Card key={p.id} className="card-hover hover:shadow-xl cursor-pointer group stagger-item" style={{ animationDelay: `${index * 0.1}s` }}>
              <Link to={`/projects/${p.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold group-hover:text-blue-600 transition-colors">
                        {p.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        <div className="flex items-center space-x-2 text-sm">
                          <span className="text-gray-500">#{p.id}</span>
                          <span className="text-gray-400">•</span>
                          <div className="flex items-center space-x-1">
                            <Users className="h-3 w-3" />
                            <span>{p.member_count || 0} members</span>
                          </div>
                        </div>
                      </CardDescription>
                    </div>
                    <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                      <FolderOpen className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span>Active</span>
                        </div>
                      </Badge>
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        <span>Updated today</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 text-blue-600 group-hover:translate-x-1 transition-transform">
                      <span className="text-sm font-medium">View tasks</span>
                      <span className="text-lg">→</span>
                    </div>
                  </div>
                </CardContent>
              </Link>
            </Card>
          ))
        )}
        {!loading && items.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500">No projects yet. Create your first project!</p>
          </div>
        )}
      </div>
    </div>
  )
}
