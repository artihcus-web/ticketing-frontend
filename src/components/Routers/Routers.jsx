// Routers component
import { Routes, Route, Navigate } from 'react-router-dom';
import Admin from "../pages/Admin";
import ClientDashboard from '../pages/ClientDashboard';
import ClientTickets from '../pages/ClientTickets';
import EmployeeDashboard from '../pages/EmployeeDashboard';
import Login from '../pages/Login';
import AdminTickets from '../pages/AdminTickets';
import PropTypes from 'prop-types';
import Forgot from '../pages/ForgotPassword';
import Projects from "../pages/Projects";
import Ticketing from "../pages/Ticketing";
import ProjectManagerDashboard from "../pages/ProjectManagerDashboard";
import ClientHeadDashboard from "../pages/ClientHeadDashboard";
import EmployeeTickets from "../pages/EmployeeTickets";
import TicketDetailsWrapper from '../pages/TicketDetailsWrapper';
import EmployeeKPIDashboard from '../pages/EmployeeKPIDashboard';
import ClientHeadTickets from '../pages/ClientHeadTickets';
import ProjectManagerTickets from '../pages/ProjectManagerTickets';
import EditTicketForm from '../pages/EditTicketForm';
import ProjectTickets from '../pages/ProjectTickets';

import { useAuth } from '../../context/AuthContext';

// Protected Route component
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

// Utility to get dashboard route for a given role
function getDashboardRouteForRole(role) {
  const normalizedRole = role ? role.toLowerCase().trim().replace(/\s+/g, '_') : '';

  switch (normalizedRole) {
    case 'admin':
      return '/admin';
    case 'client_head':
    case 'clienthead':
    case 'client_manager':
      return '/client-head-dashboard';
    case 'client':
      return '/clientdashboard';
    case 'employee':
      return '/employeedashboard';
    case 'manager':
    case 'project_manager':
    case 'projectmanager':
      return '/project-manager-dashboard';
    default:
      return '/login';
  }
}

// Admin Route component
function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  const normalizedRole = user?.role?.toLowerCase().trim().replace(/\s+/g, '_');

  if (!user || normalizedRole !== 'admin') {
    // Redirect to correct dashboard for their role
    return <Navigate to={getDashboardRouteForRole(user?.role)} replace />;
  }

  return children;
}
AdminRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

// Employee Route component
function EmployeeRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  const normalizedRole = user?.role?.toLowerCase().trim().replace(/\s+/g, '_');

  if (!user || normalizedRole !== 'employee') {
    return <Navigate to={getDashboardRouteForRole(user?.role)} replace />;
  }

  return children;
}
EmployeeRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

// Client Head Route component
function ClientHeadRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  const normalizedRole = user?.role?.toLowerCase().trim().replace(/\s+/g, '_');

  if (!user || (normalizedRole !== 'client_head' && normalizedRole !== 'clienthead')) {
    return <Navigate to={getDashboardRouteForRole(user?.role)} replace />;
  }

  return children;
}
ClientHeadRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

// Client Route component
function ClientRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  const normalizedRole = user?.role?.toLowerCase().trim().replace(/\s+/g, '_');

  if (!user || normalizedRole !== 'client') {
    return <Navigate to={getDashboardRouteForRole(user?.role)} replace />;
  }

  return children;
}
ClientRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

// Project Manager Route component
function ProjectManagerRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  const normalizedRole = user?.role?.toLowerCase().trim().replace(/\s+/g, '_');

  if (!user || (normalizedRole !== 'project_manager' && normalizedRole !== 'projectmanager' && normalizedRole !== 'manager')) {
    return <Navigate to={getDashboardRouteForRole(user?.role)} replace />;
  }

  return children;
}
ProjectManagerRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

// AuthRedirectRoute: Redirects authenticated users away from login/forgot-password
function AuthRedirectRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (user && user.role) {
    return <Navigate to={getDashboardRouteForRole(user.role)} replace />;
  }

  return children;
}
AuthRedirectRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

function Routers() {
  return (
    <Routes>
      {/* Public routes (redirect if already authenticated) */}
      <Route path="/login" element={<AuthRedirectRoute><Login /></AuthRedirectRoute>} />
      <Route path="/forgot-password" element={<AuthRedirectRoute><Forgot /></AuthRedirectRoute>} />

      {/* Protected routes */}
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <Routes>
              {/* Admin-only routes */}
              <Route path="/admin" element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              } />
              <Route path="/admin-tickets" element={
                <AdminRoute>
                  <AdminTickets />
                </AdminRoute>
              } />
              <Route path="/projects" element={
                <AdminRoute>
                  <Projects />
                </AdminRoute>
              } />
              <Route path="/editTicketform" element={
                <AdminRoute>
                  <EditTicketForm />
                </AdminRoute>
              } />
              <Route path="/project-tickets" element={
                <AdminRoute>
                  <ProjectTickets />
                </AdminRoute>
              } />

              {/* Client Head-only routes */}
              <Route path="/client-head-dashboard" element={
                <ClientHeadRoute>
                  <ClientHeadDashboard />
                </ClientHeadRoute>
              } />
              <Route path="/client-head-tickets" element={
                <ClientHeadRoute>
                  <ClientHeadTickets />
                </ClientHeadRoute>
              } />

              {/* Client-only routes */}
              <Route path="/clientdashboard" element={
                <ClientRoute>
                  <ClientDashboard />
                </ClientRoute>
              } />
              <Route path="/client-tickets" element={
                <ClientRoute>
                  <ClientTickets />
                </ClientRoute>
              } />

              {/* Project Manager-only routes */}
              <Route path="/project-manager-dashboard" element={
                <ProjectManagerRoute>
                  <ProjectManagerDashboard />
                </ProjectManagerRoute>
              } />
              <Route path="/project-manager-tickets" element={
                <ProjectManagerRoute>
                  <ProjectManagerTickets />
                </ProjectManagerRoute>
              } />
              <Route path="/team/employee/:id" element={
                <ProjectManagerRoute>
                  <EmployeeKPIDashboard />
                </ProjectManagerRoute>
              } />

              {/* Employee-only routes */}
              <Route path="/employeedashboard" element={
                <EmployeeRoute>
                  <EmployeeDashboard />
                </EmployeeRoute>
              } />
              <Route path="/employee-tickets" element={
                <EmployeeRoute>
                  <EmployeeTickets />
                </EmployeeRoute>
              } />

              {/* Other routes (accessible to any authenticated user) */}
              <Route path="/ticketing" element={<Ticketing />} />
              <Route path="/tickets/:ticketId" element={<TicketDetailsWrapper />} />
              {/* Default: redirect to dashboard or 404 */}
              <Route path="*" element={<Navigate to="/clientdashboard" replace />} />
            </Routes>
          </ProtectedRoute>
        }
      />
      {/* Default: redirect to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default Routers;

