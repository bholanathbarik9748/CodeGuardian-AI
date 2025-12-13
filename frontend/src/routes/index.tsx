import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { Dashboard } from '../pages/Dashboard';
import { Repositories } from '../pages/Repositories';
import { ProtectedRoute } from '../components/ProtectedRoute';

/**
 * Application routes configuration
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <LoginPage />,
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/repositories',
    element: (
      <ProtectedRoute>
        <Repositories />
      </ProtectedRoute>
    ),
  },
  {
    path: '/auth/callback',
    element: <LoginPage />, // Will handle token and redirect
  },
]);

/**
 * Router component to be used in App
 */
export const AppRouter = () => {
  return <RouterProvider router={router} />;
};

