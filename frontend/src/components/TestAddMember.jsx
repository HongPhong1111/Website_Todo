import { useState } from 'react'
import { api } from '../api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestAddMember() {
  const [projectId, setProjectId] = useState('3')
  const [userId, setUserId] = useState('2')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const testAddMember = async () => {
    setLoading(true)
    setResult('')
    
    try {
      console.log('Testing add member...')
      console.log('Project ID:', projectId)
      console.log('User ID:', userId)
      
      const response = await api.post(`/api/projects/${projectId}/members`, {
        userId: parseInt(userId),
        role: 'viewer'
      })
      
      console.log('Response:', response.data)
      setResult(`✅ Success: ${JSON.stringify(response.data)}`)
      
    } catch (error) {
      console.error('Error:', error)
      console.error('Error response:', error.response?.data)
      
      if (error.response?.status === 403) {
        setResult('❌ Permission denied: You can only add members to projects you own or manage.')
      } else if (error.response?.data?.message) {
        setResult(`❌ Error: ${error.response.data.message}`)
      } else {
        setResult(`❌ Error: ${error.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const testGetMembers = async () => {
    setLoading(true)
    setResult('')
    
    try {
      console.log('Getting members...')
      const response = await api.get(`/api/projects/${projectId}/members`)
      console.log('Members:', response.data)
      setResult(`📋 Members: ${JSON.stringify(response.data, null, 2)}`)
    } catch (error) {
      console.error('Error:', error)
      setResult(`❌ Error getting members: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>🧪 Test Add Member API</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Project ID</label>
            <Input
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="3"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">User ID</label>
            <Input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="2"
            />
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button onClick={testAddMember} disabled={loading}>
            {loading ? 'Testing...' : 'Test Add Member'}
          </Button>
          <Button onClick={testGetMembers} disabled={loading} variant="outline">
            {loading ? 'Testing...' : 'Get Members'}
          </Button>
        </div>
        
        {result && (
          <div className="p-4 bg-gray-100 rounded-lg">
            <pre className="text-sm whitespace-pre-wrap">{result}</pre>
          </div>
        )}
        
        <div className="text-xs text-gray-500">
          <p>• Admin user has Project 3</p>
          <p>• Try adding User 2, 3, or 4 to Project 3</p>
          <p>• Check console for detailed logs</p>
        </div>
      </CardContent>
    </Card>
  )
}
