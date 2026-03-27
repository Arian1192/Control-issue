import { createBrowserRouter } from 'react-router-dom'
import AppLayout from '@/components/AppLayout'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { RoleGuard } from '@/features/auth/RoleGuard'
import LoginPage from '@/features/auth/LoginPage'
import DashboardPage from '@/features/dashboard/DashboardPage'
import IssuesListPage from '@/features/issues/IssuesListPage'
import IssueDetailPage from '@/features/issues/IssueDetailPage'
import DevicesPage from '@/features/remote/DevicesPage'
import RemoteSessionPage from '@/features/remote/RemoteSessionPage'
import AdminPage from '@/features/admin/AdminPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/issues', element: <IssuesListPage /> },
          { path: '/issues/:id', element: <IssueDetailPage /> },
          { path: '/devices', element: <DevicesPage /> },
          { path: '/remote/:sessionId', element: <RemoteSessionPage /> },
          {
            path: '/admin',
            element: (
              <RoleGuard allowedRoles={['admin-it']}>
                <AdminPage />
              </RoleGuard>
            ),
          },
        ],
      },
    ],
  },
])
