import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './context/authStore.js';

// ── Lazy pages ─────────────────────────────────────────────────────────────────
import { lazy, Suspense } from 'react';
const Dashboard    = lazy(() => import('./pages/Dashboard.jsx'));
const Vehicles     = lazy(() => import('./pages/Vehicles.jsx'));
const Drivers      = lazy(() => import('./pages/Drivers.jsx'));
const Routes_      = lazy(() => import('./pages/Routes.jsx'));
const Trips        = lazy(() => import('./pages/Trips.jsx'));
const Maintenance  = lazy(() => import('./pages/Maintenance.jsx'));
const Login        = lazy(() => import('./pages/Login.jsx'));
const NotFound     = lazy(() => import('./pages/NotFound.jsx'));
import Layout from './components/layout/Layout.jsx';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 1000 * 60 * 5 } },
});

const PrivateRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense fallback={<div className="page-loader">Loading…</div>}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="vehicles" element={<Vehicles />} />
              <Route path="drivers" element={<Drivers />} />
              <Route path="routes" element={<Routes_ />} />
              <Route path="trips" element={<Trips />} />
              <Route path="maintenance" element={<Maintenance />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
