import { GoogleLogin } from '@react-oauth/google'
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api/client'
import { setToken } from '../auth/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Sign in to your account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Or{' '}
            <a href="#" className="font-medium text-primary hover:text-primary/90">
              start your 30-day free trial
            </a>
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Local login (Admin)</CardTitle>
            <CardDescription>
              Use your admin credentials to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}
            <Button
              className="w-full"
              onClick={async () => {
                try {
                  setError('')
                  const res = await api.post('/api/auth/login', { email, password })
                  console.log('Login successful, token:', res.data.token)
                  setToken(res.data.token)
                  navigate('/', { replace: true })
                } catch {
                  setError('Login failed')
                }
              }}
            >
              Sign in
            </Button>
            {/* <div className="text-xs text-muted-foreground">
              Admin mặc định: admin@todo.local / admin123
            </div> */}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Google login</CardTitle>
            <CardDescription>
              Sign in with your Google account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={async (credentialResponse) => {
                  try {
                    setError('')
                    const idToken = credentialResponse.credential
                    if (!idToken) return

                    const res = await api.post('/api/auth/google', { idToken })
                    console.log('Google login successful, token:', res.data.token)
                    setToken(res.data.token)
                    navigate('/', { replace: true })
                  } catch {
                    setError('Google login failed')
                  }
                }}
                onError={() => {
                  setError('Google login failed')
                }}
              />
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
            Create one here
          </Link>
        </div>
      </div>
    </div>
  )
}
