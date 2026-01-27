import { useState, useEffect, useRef } from 'react'
import { api } from '../api/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, UserPlus, User, Mail } from 'lucide-react'

export default function UserSearch({ onUserSelect, selectedUsers = [], disabled = false }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef(null)

  useEffect(() => {
    const searchUsers = async () => {
      if (query.length < 2) {
        setResults([])
        setShowResults(false)
        return
      }

      setLoading(true)
      try {
        console.log('Searching users with query:', query)
        const res = await api.get(`/api/projects/users/search?q=${encodeURIComponent(query)}`)
        console.log('Search API response:', res.data)
        setResults(res.data.data || [])
        setShowResults(true)
      } catch (error) {
        console.error('Failed to search users:', error)
        setResults([])
      } finally {
        setLoading(false)
      }
    }

    const timeoutId = setTimeout(searchUsers, 300)
    return () => clearTimeout(timeoutId)
  }, [query])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleUserClick = (user) => {
    console.log('User clicked:', user)
    
    if (selectedUsers.some(u => u.id === user.id)) {
      console.log('User already selected')
      return
    }
    
    try {
      onUserSelect(user)
      setQuery('')
      setShowResults(false)
      console.log('User selected successfully')
    } catch (error) {
      console.error('Error selecting user:', error)
      alert('Error selecting user. Please try again.')
    }
  }

  const isUserSelected = (userId) => selectedUsers.some(u => u.id === userId)

  return (
    <div className="relative" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search users by name or email..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
          disabled={disabled}
        />
        {loading && (
          <div className="absolute right-3 top-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
          </div>
        )}
      </div>

      {showResults && results.length > 0 && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto">
          <CardContent className="p-2">
            {results.map((user) => (
              <div
                key={user.id}
                className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors ${
                  isUserSelected(user.id) 
                    ? 'bg-gray-100 opacity-50 cursor-not-allowed' 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => handleUserClick(user)}
              >
                <div className="flex-shrink-0">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name || user.email}
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
                    {user.full_name || 'Unknown User'}
                  </p>
                  <p className="text-xs text-gray-500 truncate flex items-center">
                    <Mail className="h-3 w-3 mr-1" />
                    {user.email}
                  </p>
                </div>
                {isUserSelected(user.id) ? (
                  <Badge variant="secondary">Added</Badge>
                ) : (
                  <Button 
                    type="button"
                    size="sm" 
                    variant="outline" 
                    className="hover-lift"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleUserClick(user)
                    }}
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {showResults && query.length >= 2 && results.length === 0 && !loading && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1">
          <CardContent className="p-4 text-center text-gray-500">
            <User className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No users found</p>
            <p className="text-xs">Try searching with different keywords</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
