import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App.tsx';
import { Booking } from './pages/Booking.tsx';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';

const router = createBrowserRouter([
  {
    path: '/reserva',
    element: <Booking />
  },
  {
    path: '/*',
    element: (
      <AuthProvider>
        <App />
      </AuthProvider>
    )
  }
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
