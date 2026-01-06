import { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';
import {
  Plus,
  X,
  Edit2,
  Trash2,
  UserPlus,
  CheckCircle2,
  User,
  Briefcase,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Users,
  Clock,
  Eye,
  EyeOff,
} from 'lucide-react';

function Projects() {
  const [projects, setProjects] = useState([]);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [showAddPersonModal, setShowAddPersonModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [showDeleteProjectModal, setShowDeleteProjectModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [expandedProject, setExpandedProject] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    email: '',
    password: '',
    role: 'client',
    userType: 'client'
  });
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [editingMember, setEditingMember] = useState(null);
  const [showEditMemberModal, setShowEditMemberModal] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [memberDeleteProjectId, setMemberDeleteProjectId] = useState(null);
  const [showDeleteMemberModal, setShowDeleteMemberModal] = useState(false);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [editProjectData, setEditProjectData] = useState({ id: '', name: '', description: '' });
  const [showRoleChangeConfirm, setShowRoleChangeConfirm] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState(null);
  const [blockedEmail, setBlockedEmail] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let isInitialLoad = true;
    let interval = null;
    
    const fetchProjects = async () => {
      try {
        const response = await apiRequest('/projects', {
          method: 'GET',
        });
        if (response.success && response.projects) {
          setProjects(response.projects);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };
    
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
  }, []);

  const handleAddProject = async (e) => {
    e.preventDefault();
    // Check for duplicate project name (case-insensitive)
    const duplicate = projects.some(
      (p) => p.name.trim().toLowerCase() === formData.name.trim().toLowerCase()
    );
    if (duplicate) {
      showNotification('This project already exists', 'error');
      return;
    }
    try {
      const response = await apiRequest('/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
        }),
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to create project');
      }
      
      setProjects([...projects, response.project]);
      setShowAddProjectModal(false);
      setFormData({ name: '', description: '', email: '', password: '', role: 'client', userType: 'client' });
      showNotification('New project is created', 'success');
    } catch (error) {
      console.error('Error adding project:', error);
      showNotification(error.message || 'Failed to create project', 'error');
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  const handleAddPerson = async (e) => {
    e.preventDefault();
    const email = formData.email.trim();
    // Always generate password from email, padded with 1234567890 if needed
    let password = email.includes('@') ? email.split('@')[0] : '';
    const pad = '1234567890';
    if (password.length < 6) {
      password += pad.slice(0, 6 - password.length);
    }
    // Password length validation (should never fail now)
    if (password.length < 6) {
      showNotification('Password must be at least 6 characters long.', 'error');
      return;
    }
    // LTD validation: only allow .com, .co, .org, .net
    const ltdPattern = /^[^@\s]+@[^@\s]+\.(com|co|org|net)$/i;
    if (!ltdPattern.test(email)) {
      showNotification(`Invalid email LTD: ${email}. Only .com, .co, .org, .net are allowed.`, 'error');
      return;
    }
    // Check if email is blocked (this will be handled by backend)
    // We'll check the response for blocked status
    if (!selectedProject) {
      return;
    }
    
    try {
      // Determine the role based on user type and role
      let finalRole;
      if (formData.userType === 'client') {
        finalRole = formData.role === 'head' ? 'client_head' : 'client';
      } else {
        finalRole = formData.role === 'manager' ? 'project_manager' : 'employee';
      }
      
      // Add member via backend API
      const response = await apiRequest(`/projects/${selectedProject.id}/members`, {
        method: 'POST',
        body: JSON.stringify({
          email: formData.email,
          role: formData.role,
          userType: formData.userType,
          password: password,
        }),
      });
      
      if (!response.success) {
        if (response.blocked) {
          setBlockedEmail(email);
        }
        throw new Error(response.error || 'Failed to add member');
      }
      
      // Refresh projects list
      const projectsResponse = await apiRequest('/projects', {
        method: 'GET',
      });
      if (projectsResponse.success && projectsResponse.projects) {
        setProjects(projectsResponse.projects);
        const updatedProject = projectsResponse.projects.find(p => p.id === selectedProject.id);
        if (updatedProject) {
          setSelectedProject(updatedProject);
        }
      }
      
      setShowAddPersonModal(false);
      setBlockedEmail(null);
      setFormData({ 
        name: '', 
        description: '', 
        email: '', 
        password: '', 
        role: 'client',
        userType: 'client'
      });
      
      showNotification(`${formData.email} has been added to the project.`, 'success');
    } catch (error) {
      console.error('Error adding/updating person:', error);
      showNotification(error.message || 'Failed to add/update member. Please try again.', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;
    
    try {
      const response = await apiRequest(`/projects/${projectToDelete}`, {
        method: 'DELETE',
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete project');
      }
      
      setProjects(projects.filter(p => p.id !== projectToDelete));
      showNotification('Project deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting project:', error);
      showNotification(error.message || 'Failed to delete project', 'error');
    } finally {
      setShowDeleteConfirmModal(false);
      setProjectToDelete(null);
    }
  };

  const handleEditMember = (member) => {
    setEditingMember(member);
    setFormData({
      email: member.email || '',
      role: member.role === 'client_head' ? 'head' : 
            member.role === 'project_manager' ? 'manager' : 
            member.role === 'client' ? 'client' : 'employee',
      userType: member.userType || 'client'
    });
    setShowEditMemberModal(true);
  };

  const handleUpdateMember = async (e) => {
    e.preventDefault();
    console.log('handleUpdateMember: called with formData:', formData, 'editingMember:', editingMember);
    if (!selectedProject || !editingMember) {
      console.log('handleUpdateMember: missing selectedProject or editingMember');
      return;
    }

    // Determine new role
    let newRole;
    if (formData.userType === 'client') {
      newRole = formData.role === 'head' ? 'client_head' : 'client';
    } else {
      newRole = formData.role === 'manager' ? 'project_manager' : 'employee';
    }

    // If role, userType, or email is changed, always use applyRoleChange
    if (
      editingMember.role !== newRole ||
      editingMember.userType !== formData.userType ||
      editingMember.email !== formData.email
    ) {
      setShowEditMemberModal(false);
      applyRoleChange(formData, editingMember, newRole);
      return;
    }

    // If nothing changed, just close modal
    setShowEditMemberModal(false);
    setEditingMember(null);
    setFormData({
      email: '',
      role: 'client',
      userType: 'client'
    });
    showNotification('No changes made to member details', 'info');
  };

  const applyRoleChange = async (formData, editingMember, newRole) => {
    try {
      // Find all projects where this user is a member
      const userUid = editingMember.uid;
      const userEmail = formData.email;
      
      // Update member in each project
      const updatePromises = [];
      for (const project of projects) {
        if (project.members.some(m => m.uid === userUid)) {
          updatePromises.push(
            apiRequest(`/projects/${project.id}/members/${encodeURIComponent(editingMember.email)}`, {
              method: 'PUT',
              body: JSON.stringify({
                role: formData.role,
                userType: formData.userType,
              }),
            })
          );
        }
      }
      
      await Promise.all(updatePromises);
      
      // Refresh projects list
      const projectsResponse = await apiRequest('/projects', {
        method: 'GET',
      });
      if (projectsResponse.success && projectsResponse.projects) {
        setProjects(projectsResponse.projects);
      }
      
      showNotification('User role/email updated in all projects and database', 'success');
    } catch (error) {
      console.error('Error updating member:', error);
      showNotification(error.message || 'Failed to update member details', 'error');
    }
  };

  const handleDeleteMember = async (memberToDelete, projectId) => {
    console.log('handleDeleteMember: called for', memberToDelete?.email, memberToDelete?.uid, 'in project', projectId);
    try {
      const response = await apiRequest(`/projects/${projectId}/members/${encodeURIComponent(memberToDelete.email)}`, {
        method: 'DELETE',
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to remove member');
      }
      
      // Refresh projects list
      const projectsResponse = await apiRequest('/projects', {
        method: 'GET',
      });
      if (projectsResponse.success && projectsResponse.projects) {
        setProjects(projectsResponse.projects);
        const updatedProject = projectsResponse.projects.find(p => p.id === projectId);
        if (updatedProject) {
          setSelectedProject(updatedProject);
        }
      }
      
      showNotification(`${memberToDelete.email} has been deleted from the project${response.userDeleted ? ' and system' : ''}`, 'success');
    } catch (error) {
      console.error('Error deleting member:', error);
      showNotification(error.message || 'Failed to remove member from project', 'error');
    }
  };

  const handleDeleteProject = async (projectId) => {
    try {
      const response = await apiRequest(`/projects/${projectId}`, {
        method: 'DELETE',
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete project');
      }
      
      setProjects(projects.filter(p => p.id !== projectId));
      showNotification('Project and all its members removed. Tickets remain for history.', 'success');
    } catch (error) {
      console.error('Error deleting project:', error);
      showNotification(error.message || 'Failed to delete project', 'error');
    }
  };

  const handleEditProject = async (e) => {
    e.preventDefault();
    // Check for duplicate project name (case-insensitive, excluding current project)
    const duplicate = projects.some(
      (p) => p.id !== editProjectData.id && p.name.trim().toLowerCase() === editProjectData.name.trim().toLowerCase()
    );
    if (duplicate) {
      showNotification('This project already exists', 'error');
      return;
    }
    try {
      const response = await apiRequest(`/projects/${editProjectData.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editProjectData.name,
          description: editProjectData.description,
        }),
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update project');
      }
      
      // Refresh projects list
      const projectsResponse = await apiRequest('/projects', {
        method: 'GET',
      });
      if (projectsResponse.success && projectsResponse.projects) {
        setProjects(projectsResponse.projects);
      }
      
      setShowEditProjectModal(false);
      setEditProjectData({ id: '', name: '', description: '' });
      showNotification('Project details updated successfully', 'success');
    } catch (error) {
      console.error('Error updating project:', error);
      showNotification(error.message || 'Failed to update project details', 'error');
    }
  };

  const renderProjectMembers = (project) => {
    const employees = project.members?.filter(m => m.userType === 'employee') || [];
    const clients = project.members?.filter(m => m.userType === 'client') || [];

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
                <button
                  onClick={() => {
                    setSelectedProject(project);
                    setFormData({
                      name: '',
                      description: '',
                      email: '',
                      password: '',
                      userType: 'employee',
                      role: 'employee'
                    });
                    setShowAddPersonModal(true);
                  }}
                  className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center space-x-1"
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="text-sm font-medium">Add </span>
                </button>
              </div>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {employees.map((member) => (
                  <div key={member.uid} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{member.email}</p>
                        <p className="text-xs text-gray-500 capitalize">{member.role.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedProject(project);
                          handleEditMember(member);
                        }}
                        className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setMemberToDelete(member);
                          setMemberDeleteProjectId(project.id);
                          setShowDeleteMemberModal(true);
                        }}
                        className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {employees.length === 0 && (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Briefcase className="w-6 h-6 text-blue-600" />
                    </div>
                    <p className="text-sm text-gray-500">No team members yet</p>
                    <button
                      onClick={() => {
                        setSelectedProject(project);
                        setFormData({
                          name: '',
                          description: '',
                          email: '',
                          password: '',
                          userType: 'employee',
                          role: 'employee'
                        });
                        setShowAddPersonModal(true);
                      }}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      Add your first team member
                    </button>
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
                <button
                  onClick={() => {
                    setSelectedProject(project);
                    setFormData({
                      name: '',
                      description: '',
                      email: '',
                      password: '',
                      userType: 'client',
                      role: 'client'
                    });
                    setShowAddPersonModal(true);
                  }}
                  className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors flex items-center space-x-1"
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="text-sm font-medium">Add </span>
                </button>
              </div>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {clients.map((member) => (
                  <div key={member.uid} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{member.email}</p>
                        <p className="text-xs text-gray-500 capitalize">{member.role.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedProject(project);
                          handleEditMember(member);
                        }}
                        className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setMemberToDelete(member);
                          setMemberDeleteProjectId(project.id);
                          setShowDeleteMemberModal(true);
                        }}
                        className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {clients.length === 0 && (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Users className="w-6 h-6 text-purple-600" />
                    </div>
                    <p className="text-sm text-gray-500">No client members yet</p>
                    <button
                      onClick={() => {
                        setSelectedProject(project);
                        setFormData({
                          name: '',
                          description: '',
                          email: '',
                          password: '',
                          userType: 'client',
                          role: 'client'
                        });
                        setShowAddPersonModal(true);
                      }}
                      className="mt-2 text-sm text-purple-600 hover:text-purple-700"
                    >
                      Add your first client
                    </button>
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
        <button
          onClick={() => setShowAddProjectModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>New Project</span>
        </button>
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
                  {expandedProject === project.id && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setEditProjectData({ id: project.id, name: project.name, description: project.description });
                        setShowEditProjectModal(true);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                  )}
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
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setProjectToDelete(project.id);
                      setShowDeleteProjectModal(true);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
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

      {/* Add Project Modal */}
      {showAddProjectModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
          {/* Glossy Backdrop */}
          <div className="absolute inset-0 bg-gradient-to-br from-white-500/30 to-white-500/30 backdrop-blur-md"></div>
          {/* Modal Content */}
          <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-md border border-white/20">
            <div className="relative p-6">
              {/* Decorative Elements */}
              <div className="absolute top-0 left-0 w-full h-full overflow-hidden rounded-2xl pointer-events-none">
                <div className="absolute -top-32 -left-32 w-64 h-64 bg-blue-500 rounded-full opacity-10 blur-3xl"></div>
                <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-purple-500 rounded-full opacity-10 blur-3xl"></div>
              </div>
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-6 relative">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Create New Project</h3>
                  <p className="text-sm text-gray-600 mt-1">Add a new project to your workspace</p>
                </div>
                <button
                  onClick={() => setShowAddProjectModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100/50 rounded-lg transition-colors relative"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleAddProject} className="space-y-4 relative">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Enter project name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Enter project description"
                    rows="3"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4 relative">
                  <button
                    type="button"
                    onClick={() => setShowAddProjectModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100/80 backdrop-blur-sm rounded-xl hover:bg-gray-200/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
                  >
                    Create Project
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Person Modal */}
      {showAddPersonModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
          {/* Glossy Backdrop */}
          <div className="absolute inset-0 bg-gradient-to-br from-white-500/30 to-white-500/30 backdrop-blur-md"></div>
          
          {/* Modal Content */}
          <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-md border border-white/20">
            <div className="relative p-6">
              {/* Decorative Elements */}
              <div className="absolute top-0 left-0 w-full h-full overflow-hidden rounded-2xl pointer-events-none">
                <div className="absolute -top-32 -left-32 w-64 h-64 bg-blue-500 rounded-full opacity-10 blur-3xl"></div>
                <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-purple-500 rounded-full opacity-10 blur-3xl"></div>
              </div>

              {/* Modal Header */}
              <div className="flex justify-between items-center mb-6 relative">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Add {formData.userType === 'employee' ? 'Team Member' : 'Client'}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Add a new {formData.userType === 'employee' ? 'team member' : 'client'} to {selectedProject?.name}
                  </p>
                </div>
                <button
                  onClick={() => setShowAddPersonModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100/50 rounded-lg transition-colors relative"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleAddPerson} className="space-y-4 relative">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      setBlockedEmail(null);
                    }}
                    className="w-full px-4 py-2 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Enter email address"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.email.includes('@') ? (formData.email.split('@')[0].length < 6 ? formData.email.split('@')[0] + '1234567890'.slice(0, 6 - formData.email.split('@')[0].length) : formData.email.split('@')[0]) : ''}
                      readOnly
                      className="w-full px-4 py-2 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Password will be set automatically"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Role</label>
                  <div className="grid grid-cols-2 gap-4">
                    {formData.userType === 'employee' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, role: 'employee' })}
                          className={`p-3 rounded-xl border-2 transition-all duration-200 backdrop-blur-sm ${
                            formData.role === 'employee'
                              ? 'border-blue-500 bg-blue-50/50 text-blue-700'
                              : 'border-gray-200 hover:border-blue-200 bg-white/50'
                          }`}
                        >
                           Employee
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, role: 'manager' })}
                          className={`p-3 rounded-xl border-2 transition-all duration-200 backdrop-blur-sm ${
                            formData.role === 'manager'
                              ? 'border-blue-500 bg-blue-50/50 text-blue-700'
                              : 'border-gray-200 hover:border-blue-200 bg-white/50'
                          }`}
                        >
                          Project Manager
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, role: 'client' })}
                          className={`p-3 rounded-xl border-2 transition-all duration-200 backdrop-blur-sm ${
                            formData.role === 'client'
                              ? 'border-purple-500 bg-purple-50/50 text-purple-700'
                              : 'border-gray-200 hover:border-purple-200 bg-white/50'
                          }`}
                        >
                           Client
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, role: 'head' })}
                          className={`p-3 rounded-xl border-2 transition-all duration-200 backdrop-blur-sm ${
                            formData.role === 'head'
                              ? 'border-purple-500 bg-purple-50/50 text-purple-700'
                              : 'border-gray-200 hover:border-purple-200 bg-white/50'
                          }`}
                        >
                          Client Manager
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 relative">
                  <button
                    type="button"
                    onClick={() => { setShowAddPersonModal(false); setBlockedEmail(null); }}
                    className="px-4 py-2 text-gray-700 bg-gray-100/80 backdrop-blur-sm rounded-xl hover:bg-gray-200/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 text-white rounded-xl transition-all duration-200 ${
                      formData.userType === 'employee'
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40'
                        : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40'
                    }`}
                  >
                    Add
                  </button>
                </div>
              </form>
              {blockedEmail && (
                <div className="mt-4 flex flex-col items-center">
                  <p className="text-red-600 mb-2">This email is blocked. Do you want to unblock and add?</p>
                  <button
                    className="px-4 py-2 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600"
                    onClick={async () => {
                      try {
                        const response = await apiRequest(`/projects/blocked-emails/${encodeURIComponent(blockedEmail)}`, {
                          method: 'DELETE',
                        });
                        
                        if (!response.success) {
                          throw new Error(response.error || 'Failed to unblock email');
                        }
                        
                        setBlockedEmail(null);
                        showNotification('Email unblocked. You can now add this user.', 'success');
                      } catch (error) {
                        console.error('Error unblocking email:', error);
                        showNotification(error.message || 'Failed to unblock email', 'error');
                      }
                    }}
                  >
                    Unblock & Add User
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Delete Project?</h3>
              <p className="text-gray-600 mb-6">
                This action cannot be undone. All project data and member associations will be permanently removed.
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => setShowDeleteConfirmModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
                >
                  Delete Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification.show && (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 p-4 rounded-xl shadow-lg transition-all duration-300 z-[9999] ${
          notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
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

      {/* Edit Member Modal */}
      {showEditMemberModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
          {/* Glossy Backdrop */}
          <div className="absolute inset-0 bg-gradient-to-br from-white-500/30 to-white-500/30 backdrop-blur-md"></div>
          {/* Modal Content */}
          <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-md border border-white/20">
            <div className="relative p-6">
              {/* Decorative Elements */}
              <div className="absolute top-0 left-0 w-full h-full overflow-hidden rounded-2xl pointer-events-none">
                <div className="absolute -top-32 -left-32 w-64 h-64 bg-blue-500 rounded-full opacity-10 blur-3xl"></div>
                <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-purple-500 rounded-full opacity-10 blur-3xl"></div>
              </div>
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-6 relative">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Edit {formData.userType === 'employee' ? 'Employee' : 'Client'} Details
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">Update the details for this {formData.userType} in {selectedProject?.name}</p>
                </div>
                <button
                  onClick={() => setShowEditMemberModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100/50 rounded-lg transition-colors relative"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              {/* Form */}
              <form onSubmit={(e) => { console.log('Save Changes button clicked'); handleUpdateMember(e); }} className="space-y-4 relative">
                {/* Email Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Enter email address"
                    required
                  />
                </div>
                {/* Role Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Role</label>
                  <div className="grid grid-cols-2 gap-4">
                    {formData.userType === 'employee' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, role: 'employee' })}
                          className={`p-3 rounded-xl border-2 transition-all duration-200 backdrop-blur-sm ${
                            formData.role === 'employee'
                              ? 'border-blue-500 bg-blue-50/50 text-blue-700'
                              : 'border-gray-200 hover:border-blue-200 bg-white/50'
                          }`}
                        >
                          Employee
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, role: 'manager' })}
                          className={`p-3 rounded-xl border-2 transition-all duration-200 backdrop-blur-sm ${
                            formData.role === 'manager'
                              ? 'border-blue-500 bg-blue-50/50 text-blue-700'
                              : 'border-gray-200 hover:border-blue-200 bg-white/50'
                          }`}
                        >
                          Project Manager
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, role: 'client' })}
                          className={`p-3 rounded-xl border-2 transition-all duration-200 backdrop-blur-sm ${
                            formData.role === 'client'
                              ? 'border-purple-500 bg-purple-50/50 text-purple-700'
                              : 'border-gray-200 hover:border-purple-200 bg-white/50'
                          }`}
                        >
                           Client
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, role: 'head' })}
                          className={`p-3 rounded-xl border-2 transition-all duration-200 backdrop-blur-sm ${
                            formData.role === 'head'
                              ? 'border-purple-500 bg-purple-50/50 text-purple-700'
                              : 'border-gray-200 hover:border-purple-200 bg-white/50'
                          }`}
                        >
                          Client Manager
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 relative">
                  <button
                    type="button"
                    onClick={() => setShowEditMemberModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100/80 backdrop-blur-sm rounded-xl hover:bg-gray-200/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 text-white rounded-xl shadow-lg transition-colors ${
                      formData.userType === 'employee' 
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-blue-500/25 hover:shadow-blue-500/40'
                        : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-purple-500/25 hover:shadow-purple-500/40'
                    }`}
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Member Confirmation Modal */}
      {showDeleteMemberModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
          {/* Glossy Backdrop */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-gray-200/80 backdrop-blur-md"></div>
          {/* Modal Content */}
          <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-md border border-white/20">
            <div className="relative p-6">
              {/* Decorative Elements */}
              <div className="absolute top-0 left-0 w-full h-full overflow-hidden rounded-2xl pointer-events-none">
                <div className="absolute -top-32 -left-32 w-64 h-64 bg-red-500 rounded-full opacity-10 blur-3xl"></div>
                <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-yellow-500 rounded-full opacity-10 blur-3xl"></div>
              </div>
              <div className="text-center relative z-10">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Delete Member?</h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete <span className='font-semibold'>{memberToDelete?.email}</span>? This action cannot be undone.
                </p>
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={() => setShowDeleteMemberModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100/80 backdrop-blur-sm rounded-xl hover:bg-gray-200/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      console.log('Delete button clicked for', memberToDelete?.email, memberDeleteProjectId);
                      handleDeleteMember(memberToDelete, memberDeleteProjectId);
                      setShowDeleteMemberModal(false);
                      setMemberToDelete(null);
                      setMemberDeleteProjectId(null);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-red-600 to-yellow-500 text-white rounded-xl hover:from-red-700 hover:to-yellow-600 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-colors"
                  >
                    Delete Member
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Project Confirmation Modal */}
      {showDeleteProjectModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
          {/* Glossy Backdrop */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-gray-200/80 backdrop-blur-md"></div>
          {/* Modal Content */}
          <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-md border border-white/20">
            <div className="relative p-6">
              {/* Decorative Elements */}
              <div className="absolute top-0 left-0 w-full h-full overflow-hidden rounded-2xl pointer-events-none">
                <div className="absolute -top-32 -left-32 w-64 h-64 bg-red-500 rounded-full opacity-10 blur-3xl"></div>
                <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-yellow-500 rounded-full opacity-10 blur-3xl"></div>
              </div>
              <div className="text-center relative z-10">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Delete Project?</h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete this project? All members under this project will also be deleted. This action cannot be undone.
                </p>
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={() => setShowDeleteProjectModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100/80 backdrop-blur-sm rounded-xl hover:bg-gray-200/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      await handleDeleteProject(projectToDelete);
                      setShowDeleteProjectModal(false);
                      setProjectToDelete(null);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-red-600 to-yellow-500 text-white rounded-xl hover:from-red-700 hover:to-yellow-600 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-colors"
                  >
                    Delete Project
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditProjectModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
          {/* Glossy Backdrop */}
          <div className="absolute inset-0 bg-gradient-to-br from-white-500/30 to-white-500/30 backdrop-blur-md"></div>
          {/* Modal Content */}
          <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-md border border-white/20">
            <div className="relative p-6">
              {/* Decorative Elements */}
              <div className="absolute top-0 left-0 w-full h-full overflow-hidden rounded-2xl pointer-events-none">
                <div className="absolute -top-32 -left-32 w-64 h-64 bg-blue-500 rounded-full opacity-10 blur-3xl"></div>
                <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-purple-500 rounded-full opacity-10 blur-3xl"></div>
              </div>
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-6 relative">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Edit Project</h3>
                  <p className="text-sm text-gray-600 mt-1">Update the details for this project</p>
                </div>
                <button
                  onClick={() => setShowEditProjectModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100/50 rounded-lg transition-colors relative"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              {/* Form */}
              <form onSubmit={handleEditProject} className="space-y-4 relative">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                  <input
                    type="text"
                    value={editProjectData.name}
                    onChange={(e) => setEditProjectData({ ...editProjectData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Enter project name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={editProjectData.description}
                    onChange={(e) => setEditProjectData({ ...editProjectData, description: e.target.value })}
                    className="w-full px-4 py-2 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Enter project description"
                    rows="3"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4 relative">
                  <button
                    type="button"
                    onClick={() => setShowEditProjectModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100/80 backdrop-blur-sm rounded-xl hover:bg-gray-200/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Role Change Confirmation Modal */}
      {showRoleChangeConfirm && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
          <div className="absolute inset-0 bg-black bg-opacity-50"></div>
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 z-10">
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Change User Role?</h3>
              <p className="text-gray-600 mb-6">
                This user&apos;s role will be changed in <b>all projects</b> where they are a member. Do you want to proceed?
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => { setShowRoleChangeConfirm(false); setPendingRoleChange(null); }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setShowRoleChangeConfirm(false);
                    await applyRoleChange(pendingRoleChange, editingMember, pendingRoleChange.newRole);
                    setPendingRoleChange(null);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-colors"
                >
                  Yes, Change Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Projects; 