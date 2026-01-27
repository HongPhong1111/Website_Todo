import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import MinimalAddMember from '../components/MinimalAddMember'
import { Users, Plus, Settings, User, X, Trash2 } from 'lucide-react'

export default function ProjectDetail() {
  const { id } = useParams()
  const projectId = Number(id)

  const [tasks, setTasks] = useState([])
  const [title, setTitle] = useState('')
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentUserRole, setCurrentUserRole] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      console.log('Loading project data for projectId:', projectId)
      
      // Load tasks first
      const tasksRes = await api.get(`/api/tasks/by-project/${projectId}`)
      console.log('Tasks response:', tasksRes.data)
      setTasks(tasksRes.data.data || [])
      
      // Load members separately to avoid one failure breaking everything
      try {
        const projectRes = await api.get(`/api/projects/${projectId}/members`)
        console.log('Members response:', projectRes.data)
        const membersData = projectRes.data.data || []
        setMembers(membersData)
        
        // Set current user's role
        const token = localStorage.getItem('token')
        let currentUserId = null
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]))
            currentUserId = payload.userId?.toString()
          } catch (e) {
            console.error('Failed to parse token:', e)
          }
        }
        
        const currentUser = membersData.find(m => m.id.toString() === currentUserId)
        setCurrentUserRole(currentUser?.role || '')
      } catch (membersError) {
        console.error('Failed to load members:', membersError)
        setMembers([]) // Set empty array as fallback
      }
    } catch (error) {
      console.error('Failed to load project data:', error)
      // Set fallback data to prevent white screen
      setTasks([])
      setMembers([])
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (!projectId) return
    ;(async () => {
      await load()
    })()
  }, [load, projectId])

  const handleDeleteMember = async (memberId) => {
    if (!confirm('Are you sure you want to remove this member?')) return
    
    try {
      await api.delete(`/api/projects/${projectId}/members/${memberId}`)
      // Reload members after deletion
      load()
    } catch (error) {
      console.error('Failed to delete member:', error)
      alert('Failed to remove member. You may not have permission.')
    }
  }
  
  const getStatusVariant = (status) => {
    switch (status) {
      case 'todo':
        return 'secondary'
      case 'in_progress':
        return 'default'
      case 'done':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-500">Loading project...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Project #{projectId}</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage tasks and track progress for this project.
          </p>
        </div>
      </div>

      {/* Members Section */}
      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-600" />
            <CardTitle>Project Members</CardTitle>
          </div>
          <CardDescription>
            {members.length} member{members.length !== 1 ? 's' : ''} in this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Current Members */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Current Members:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {members.map((member) => (
                <div key={member.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.full_name || member.email}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-gray-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {member.full_name || 'Unknown User'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{member.email}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                      {member.role}
                    </Badge>
                    {member.role !== 'owner' && (currentUserRole === 'owner' || currentUserRole === 'editor') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteMember(member.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Members */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Add New Members:</h4>
            <MinimalAddMember 
              projectId={projectId} 
              onMemberAdded={() => {
                // Reload members when new member is added
                load()
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tasks Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Add New Task</CardTitle>
          <CardDescription>
            Create a new task to add to this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="New task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={async () => {
                if (!title.trim()) return
                await api.post('/api/tasks', { projectId, title })
                setTitle('')
                load()
              }}
            >
              Add Task
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
          <CardDescription>
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} in this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No tasks yet. Create your first task!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <span className="text-sm font-medium text-gray-500">
                        #{t.id}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/tasks/${t.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-primary"
                      >
                        {t.title}
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getStatusVariant(t.status)}>
                      {t.status}
                    </Badge>
                    <span className="text-sm text-gray-500">→</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
