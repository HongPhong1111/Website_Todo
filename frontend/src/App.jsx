import { Navigate, Route, Routes } from 'react-router-dom'
import RequireAuth from './auth/RequireAuth'
import Layout from './layout/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import TaskDetail from './pages/TaskDetail'
import Notifications from './pages/Notifications'
import AdminDashboard from './pages/AdminDashboard'
import AdminUsers from './pages/AdminUsers'
import AdminProjects from './pages/AdminProjects'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Projects />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="tasks/:id" element={<TaskDetail />} />
        <Route path="notifications" element={<Notifications />} />

        <Route path="admin">
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="projects" element={<AdminProjects />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
