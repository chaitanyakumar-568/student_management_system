import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Spinner from './Spinner.jsx';

// Frontend guard (UX only). The backend independently enforces auth on every API call.
export default function ProtectedRoute() {
  const { admin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Checking your session..." />
      </div>
    );
  }
  if (!admin) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}
