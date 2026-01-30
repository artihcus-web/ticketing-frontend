import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../../utils/api.js';
import { useAuth } from '../../context/AuthContext';
import {
  CheckCircle2,
  User,
  Briefcase,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Users,
  Clock,
} from 'lucide-react';

function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [expandedProject, setExpandedProject] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  // Missing state variables


  const fetchProjects = useCallback(async () => {
    try {
      const response = await apiRequest('/projects', { method: 'GET' });
      if (response.success && response.projects) {
        // Filter projects based on user role
        let filteredProjects = response.projects;

        // For employees and managers, show only projects they are assigned to
        if (user && (user.role === 'employee' || user.role === 'manager' || user.role === 'project_manager')) {
          filteredProjects = response.projects.filter(project => {
            // Check if user is in the members list
            return project.members?.some(member =>
              member.email?.toLowerCase() === user.email?.toLowerCase() ||
              member.employeeId === user.employeeId
            );
          });
        }

        setProjects(filteredProjects);
      } else {
        showNotification(response.error || 'Failed to fetch projects', 'error');
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      showNotification('Failed to fetch projects', 'error');
    }
  }, [user]);

  useEffect(() => {
    let interval = null;

    fetchProjects();

    // Poll for updates every 30 seconds, only when tab is visible
    const startPolling = () => {
      if (document.visibilityState === 'visible') {
        interval = setInterval(() => {
          if (document.visibilityState === 'visible') {
            fetchProjects();
          }
        }, 30000);
      }
    };

    startPolling();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (!interval) {
          startPolling();
        }
        fetchProjects();
      } else {
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchProjects]);

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  // Project management is now handled in the external source system
  // Member management is now handled in the external source system

  const renderProjectMembers = (project) => {
    const members = project.members || [];
    // Team Members includes all non-client members (employees, managers, etc.)
    const employees = members.filter(m => m.userType !== 'client') || [];
    const clients = members.filter(m => m.userType === 'client') || [];

    return (
      <div className="mt-4 space-y-6">
        {/* Project Members Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Project Members</h3>
        </div>

        {/* Team Section */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Employees Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                  <h4 className="text-base font-medium text-gray-900">Team Members ({employees.length})</h4>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {employees.map((member) => (
                  <div key={member.uid} className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{member.email}</p>
                        <p className="text-xs text-gray-500 capitalize">{member.role.replace('_', ' ')}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {employees.length === 0 && (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Briefcase className="w-6 h-6 text-blue-600" />
                    </div>
                    <p className="text-sm text-gray-500">No team members yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Clients Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  <h4 className="text-base font-medium text-gray-900">Client Members ({clients.length})</h4>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {clients.map((member) => (
                  <div key={member.uid} className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{member.email}</p>
                        <p className="text-xs text-gray-500 capitalize">{member.role.replace('_', ' ')}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {clients.length === 0 && (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Users className="w-6 h-6 text-purple-600" />
                    </div>
                    <p className="text-sm text-gray-500">No client members yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Projects Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600 mt-1">Manage your projects and team members</p>
        </div>
      </div>

      {/* Projects List */}
      <div className="grid grid-cols-1 gap-6">
        {projects.map((project) => (
          <div
            key={project.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
          >
            {/* Project Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{project.name}</h2>
                  <p className="text-gray-600 mt-1">{project.description}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setExpandedProject(expandedProject === project.id ? null : project.id);
                    }}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {expandedProject === project.id ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Project Stats */}
              <div className="mt-4 flex items-center space-x-6">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Users className="w-5 h-5" />
                  <span>{project.members?.length || 0} members</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <Clock className="w-5 h-5" />
                  <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Project Members Section (Expandable) */}
            {expandedProject === project.id && (
              <div className="p-6 bg-gray-50">
                {renderProjectMembers(project)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Notification Toast */}
      {notification.show && (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 p-4 rounded-xl shadow-lg transition-all duration-300 z-[9999] ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}>
          <div className="flex items-center space-x-2 text-white">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
            <p>{notification.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Projects; 