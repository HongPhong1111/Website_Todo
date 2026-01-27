import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

export default function SimpleUserSearch({ onUserSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  const searchUsers = async () => {
    if (query.length < 2) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      console.log('Searching for:', query)
      const res = await api.get(`/api/projects/users/search?q=${encodeURIComponent(query)}`)
      console.log('Search results:', res.data)
      setResults(res.data.data || [])
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(searchUsers, 500)
    return () => clearTimeout(timeoutId)
  }, [query])

  return (
    <Card className="max-w-2xl mx-auto mt-4">
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold mb-4">🔍 Simple User Search</h3>
        
        <div className="space-y-4">
          <div>
            <Input
              placeholder="Type to search users..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {loading && <p className="text-sm text-gray-500 mt-1">Searching...</p>}
          </div>

          {results.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Results ({results.length}):</h4>
              {results.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{user.full_name || 'Unknown'}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <p className="text-xs text-gray-400">ID: {user.id}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      console.log('Selected user:', user)
                      onUserSelect(user)
                    }}
                  >
                    Select
                  </Button>
                </div>
              ))}
            </div>
          )}

          {query.length >= 2 && results.length === 0 && !loading && (
            <p className="text-gray-500 text-center">No users found</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
