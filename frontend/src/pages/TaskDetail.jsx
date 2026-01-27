import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function TaskDetail() {
  const { id } = useParams()
  const taskId = Number(id)

  const [task, setTask] = useState(null)
  const [comments, setComments] = useState([])
  const [attachments, setAttachments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [error, setError] = useState('')

  const uploadsBase = useMemo(() => {
    const base = (import.meta.env.VITE_API_BASE || 'http://localhost:4000').replace(/\/$/, '')
    return base
  }, [])

  const load = useCallback(async () => {
    const [tRes, cRes, aRes] = await Promise.all([
      api.get(`/api/tasks/${taskId}`),
      api.get(`/api/tasks/${taskId}/comments`),
      api.get(`/api/tasks/${taskId}/attachments`),
    ])

    setTask(tRes.data.data)
    setComments(cRes.data.data || [])
    setAttachments(aRes.data.data || [])
  }, [taskId])

  useEffect(() => {
    if (!taskId) return
    ;(async () => {
      try {
        setError('')
        await load()
      } catch {
        setError('Failed to load task')
      }
    })()
  }, [load, taskId])

  if (!taskId) return <div className="p-4">Invalid task</div>

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

  const getPriorityVariant = (priority) => {
    switch (priority) {
      case 'low':
        return 'secondary'
      case 'medium':
        return 'default'
      case 'high':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link to={-1} className="text-primary hover:underline">
          ← Back to project
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 text-sm text-destructive bg-destructive/10 rounded-md">
          {error}
        </div>
      )}

      {task && (
        <>
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">
                    Task #{task.id}: {task.title}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {task.description || 'No description provided'}
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Badge variant={getStatusVariant(task.status)}>
                    {task.status}
                  </Badge>
                  <Badge variant={getPriorityVariant(task.priority)}>
                    {task.priority}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Created by:</span>{' '}
                  {task.created_by_email}
                </div>
                <div>
                  <span className="font-medium">Assigned to:</span>{' '}
                  {task.assigned_to_email || 'Unassigned'}
                </div>
                <div>
                  <span className="font-medium">Created at:</span>{' '}
                  {new Date(task.created_at).toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">Updated at:</span>{' '}
                  {new Date(task.updated_at).toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Comments</CardTitle>
                <CardDescription>
                  {comments.length} comment{comments.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Write a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      onClick={async () => {
                        if (!newComment.trim()) return
                        await api.post(`/api/tasks/${taskId}/comments`, { content: newComment })
                        setNewComment('')
                        load()
                      }}
                    >
                      Send
                    </Button>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {comments.map((c) => (
                      <div key={c.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">
                            {c.full_name || c.email}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(c.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{c.content}</p>
                      </div>
                    ))}
                    {comments.length === 0 && (
                      <p className="text-center text-gray-500 py-4">No comments yet</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Attachments</CardTitle>
                <CardDescription>
                  {attachments.length} file{attachments.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Input
                      type="file"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return

                        const fd = new FormData()
                        fd.append('file', file)
                        await api.post(`/api/tasks/${taskId}/attachments`, fd, {
                          headers: { 'Content-Type': 'multipart/form-data' },
                        })

                        e.target.value = ''
                        load()
                      }}
                    />
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {attachments.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <a
                          href={`${uploadsBase}${a.url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-primary hover:underline truncate"
                        >
                          {a.original_name}
                        </a>
                        <span className="text-xs text-gray-500">
                          {Math.round(a.size_bytes / 1024)} KB
                        </span>
                      </div>
                    ))}
                    {attachments.length === 0 && (
                      <p className="text-center text-gray-500 py-4">No attachments yet</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
