import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './lib/auth';
import type { Role } from './lib/types';
import AppLayout from './components/AppLayout';
import { Skeleton } from './components/ui';
import Landing from './pages/Landing';
import { Forgot, Login, Register } from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Donations from './pages/Donations';
import Requests from './pages/Requests';
import Allocations from './pages/Allocations';
import Pickups from './pages/Pickups';
import Categories from './pages/Categories';
import Members from './pages/Members';
import Profile from './pages/Profile';

function Protected({ roles, children }: { roles?: Role[]; children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <div style={{ padding: 40 }}><Skeleton h={24} w={220} /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

function GuestOnly({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  if (ready && user) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
      <Route path="/forgot-password" element={<GuestOnly><Forgot /></GuestOnly>} />

      <Route path="/app" element={<Protected><AppLayout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="donations" element={<Donations />} />
        <Route path="requests" element={<Protected roles={['RECIPIENT']}><Requests /></Protected>} />
        <Route path="allocations" element={<Protected roles={['ADMIN']}><Allocations /></Protected>} />
        <Route path="pickups" element={<Protected roles={['ADMIN', 'VOLUNTEER']}><Pickups /></Protected>} />
        <Route path="categories" element={<Categories />} />
        <Route path="members" element={<Protected roles={['ADMIN']}><Members /></Protected>} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
