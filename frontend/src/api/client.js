import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:4000',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
    console.log('API Request:', config.method?.toUpperCase(), config.url, 'Token:', token.substring(0, 20) + '...')
  }
  return config
})
