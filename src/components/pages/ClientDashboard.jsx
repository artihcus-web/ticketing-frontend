import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Plus,
  MessageSquare,
  User,
  Loader2,
  RefreshCw,
  LogOut,
  Home,
  FileText,
  Menu,
  ChevronsLeft,
  ChevronsRight,
  Zap
} from 'lucide-react';
import { apiRequest } from '../../utils/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Ticketing from './Ticketing';
import ClientTickets from './ClientTickets';
import LogoutModal from './LogoutModal';
import TicketDetails from './TicketDetails';
import { downloadTicketsAsExcel } from '../../utils/dashboardUtils';


// Animated count-up hook
// useCountUp definition removed


function ClientDashboard() {
  const { user, logout } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [clientName, setClientName] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [period, setPeriod] = useState('custom');
  const [appliedFromDate, setAppliedFromDate] = useState('');
  const [appliedToDate, setAppliedToDate] = useState('');
  const [appliedPeriod, setAppliedPeriod] = useState('custom');

  // Animated counts for priorities (must be at top level, not inside JSX)
  // _highCount, _mediumCount, _lowCount removed

  // Handle URL parameters for tab navigation
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['dashboard', 'tickets', 'create'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Fetch user data and projects
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchUserData = async () => {
      try {
        const userResponse = await apiRequest('/dashboards/user', { method: 'GET' });
        if (userResponse.success && userResponse.user) {
          const userData = userResponse.user;
          const email = userData.email || user.email;
          const name = email.split('@')[0];
          setClientName(name.charAt(0).toUpperCase() + name.slice(1));
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    const fetchProjects = async () => {
      try {
        const response = await apiRequest('/dashboards/projects', { method: 'GET' });
        if (response.success && response.projects) {
          setProjects(response.projects);
          if (response.projects.length > 0) {
            setSelectedProjectId(prev => {
              if (prev && response.projects.some(p => p.id === prev)) {
                return prev;
              }
              return response.projects[0].id;
            });
          }
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
        setIsLoading(false);
      }
    };

    fetchUserData();
    fetchProjects();
  }, [user, selectedProjectId]);

  // Track last selectedProjectId to determine if it's a new selection
  const lastProjectIdRef = useRef(null);

  // Fetch tickets
  useEffect(() => {
    if (!user || !selectedProjectId) return;

    const isNewProject = lastProjectIdRef.current !== selectedProjectId;
    if (isNewProject) {
      lastProjectIdRef.current = selectedProjectId;
    }

    let interval = null;

    const fetchTickets = async (showLoading = false) => {
      try {
        if (showLoading) {
          setIsLoading(true);
        }
        const projectName = projects.find(p => p.id === selectedProjectId)?.name;
        if (!projectName && !selectedProjectId) {
          setTickets([]);
          if (showLoading) {
            setIsLoading(false);
          }
          return;
        }

        const ticketsUrl = selectedProjectId
          ? `/dashboards/tickets?projectId=${selectedProjectId}`
          : `/dashboards/tickets?projectName=${encodeURIComponent(projectName)}`;

        const response = await apiRequest(ticketsUrl, {
          method: 'GET',
        });

        if (response.success && response.tickets) {
          const ticketsData = response.tickets.map(ticket => ({
            ...ticket,
            created: ticket.created?.toDate ? ticket.created.toDate() : (ticket.created ? new Date(ticket.created) : null),
            lastUpdated: ticket.lastUpdated?.toDate ? ticket.lastUpdated.toDate() : (ticket.lastUpdated ? new Date(ticket.lastUpdated) : null),
          }));

          // Sort tickets by created date
          ticketsData.sort((a, b) => {
            const dateA = a.created || new Date(0);
            const dateB = b.created || new Date(0);
            return dateB - dateA;
          });

          setTickets(ticketsData);
          setError(null);
        }
      } catch (error) {
        console.error('Error fetching tickets:', error);
        setError('Error loading tickets. Please try again.');
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    };

    // Only show loading when project actually changes
    fetchTickets(isNewProject);

    // Poll for updates every 30 seconds, only when tab is visible
    const startPolling = () => {
      if (document.visibilityState === 'visible') {
        interval = setInterval(() => {
          if (document.visibilityState === 'visible') {
            fetchTickets(false); // Don't show loading during polling
          }
        }, 30000);
      }
    };

    startPolling();

    // Handle visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (!interval) {
          startPolling();
        }
        fetchTickets(false); // Don't show loading when tab becomes visible
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
  }, [user, selectedProjectId, projects]);


  // Enhanced scroll to bottom function removed as it was unused




  const handleLogout = () => setShowLogoutModal(true);
  const handleLogoutConfirm = async () => {
    setSigningOut(true);
    try {
      logout();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setSigningOut(false);
      setShowLogoutModal(false);
    }
  };
  const handleLogoutCancel = () => setShowLogoutModal(false);

  // _sendResponse removed


  // Unused helpers removed


  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, active: activeTab === 'dashboard' },
    { id: 'tickets', label: 'Tickets', icon: FileText, active: activeTab === 'tickets' },
    { id: 'create', label: 'Create Ticket', icon: Plus, active: activeTab === 'create' },

  ];

  const renderSidebarItem = (item) => {
    const IconComponent = item.icon;
    return (
      <button
        key={item.id}
        onClick={() => {
          // For 'tickets' tab, we no longer navigate to a separate route
          // Instead, we just set the activeTab to render the component within the dashboard
          setActiveTab(item.id);
          setSidebarOpen(false);
        }}
        className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} px-4 py-3 rounded-xl transition-all duration-200 font-medium ${item.active
          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        title={sidebarCollapsed ? item.label : ''}
      >
        <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : ''}`}>
          <IconComponent className={`w-5 h-5 ${item.active ? 'text-white' : 'text-gray-600'}`} />
        </div>
        {!sidebarCollapsed && <span>{item.label}</span>}
      </button>
    );
  };


  // Filter tickets for current user (assigned to or raised by)
  const currentUserEmail = user?.email;
  const myTickets = tickets.filter(t =>
    (t.assignedTo && t.assignedTo.email === currentUserEmail) ||
    t.email === currentUserEmail
  );

  const handleFilterApply = () => {
    setAppliedFromDate(fromDate);
    setAppliedToDate(toDate);
    setAppliedPeriod(period);
  };
  const handleFilterReset = () => {
    setFromDate('');
    setToDate('');
    setPeriod('custom');
    setAppliedFromDate('');
    setAppliedToDate('');
    setAppliedPeriod('custom');
  };

  // Filter myTickets based on appliedFromDate, appliedToDate, appliedPeriod
  let filteredMyTickets = myTickets;
  if (appliedPeriod === 'week') {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    filteredMyTickets = myTickets.filter(t => {
      const created = t.created?.toDate ? t.created.toDate() : (t.created ? new Date(t.created) : null);
      return created && created >= startOfWeek && created <= now;
    });
  } else if (appliedPeriod === 'month') {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    filteredMyTickets = myTickets.filter(t => {
      const created = t.created?.toDate ? t.created.toDate() : (t.created ? new Date(t.created) : null);
      return created && created >= startOfMonth && created <= now;
    });
  } else if (appliedPeriod === 'last2days') {
    const now = new Date();
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(now.getDate() - 2);
    filteredMyTickets = myTickets.filter(t => {
      const created = t.created?.toDate ? t.created.toDate() : (t.created ? new Date(t.created) : null);
      return created && created >= twoDaysAgo && created <= now;
    });
  } else if (appliedFromDate && appliedToDate) {
    const from = new Date(appliedFromDate);
    const to = new Date(appliedToDate);
    to.setHours(23, 59, 59, 999);
    filteredMyTickets = myTickets.filter(t => {
      const created = t.created?.toDate ? t.created.toDate() : (t.created ? new Date(t.created) : null);
      return created && created >= from && created <= to;
    });
  }
  // Only show unresolved tickets (case-insensitive, trim whitespace)
  filteredMyTickets = filteredMyTickets.filter(t => String(t.status).trim().toLowerCase() !== 'resolved');

  // getField and downloadTicketsAsExcel removed (using utils)


  // Helper to safely format timestamps (copied from ClientTickets.jsx)
  function formatTimestamp(ts) {
    if (!ts) return '';
    if (typeof ts === 'string') {
      return new Date(ts).toLocaleString();
    }
    if (typeof ts.toDate === 'function') {
      return ts.toDate().toLocaleString();
    }
    return '';
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-200">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Connection Error</h2>
          <p className="text-gray-600 mb-6 leading-relaxed">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center justify-center space-x-2 font-medium shadow-lg hover:shadow-xl"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-200">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Loading Dashboard</h2>
          <p className="text-gray-600 leading-relaxed">Please wait while we connect to the server...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* LogoutModal always rendered above, not blurred */}
      <LogoutModal open={showLogoutModal} onCancel={handleLogoutCancel} onConfirm={handleLogoutConfirm} loading={signingOut} />
      {/* Blurred content (sidebar + main) */}
      <div className={showLogoutModal ? 'flex flex-1 filter blur-sm pointer-events-none select-none' : 'flex flex-1'}>
        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'w-20' : 'w-64'} bg-white shadow-xl lg:translate-x-0 lg:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              {!sidebarCollapsed && (
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-l font-bold text-gray-900">User Portal</h1>
                  </div>
                </div>
              )}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
              >
                {sidebarCollapsed ? (
                  <ChevronsRight className="w-6 h-6" />
                ) : (
                  <ChevronsLeft className="w-6 h-6" />
                )}
              </button>
            </div>

            {/* Sidebar Navigation */}
            <nav className="flex-1 p-6 space-y-2">
              {sidebarItems.map(renderSidebarItem)}
            </nav>

            {/* Sidebar Footer */}
            <div className="p-6 border-t border-gray-200">
              {!sidebarCollapsed && (
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{clientName.toUpperCase()}</p>
                    <p className="text-xs text-gray-500">Client</p>
                  </div>
                </div>
              )}
              <button
                onClick={handleLogout}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start'} space-x-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200`}
              >
                <LogOut className="w-4 h-4" />
                {!sidebarCollapsed && <span className="text-sm font-medium">Sign Out</span>}
              </button>
            </div>
          </div>
        </aside>
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Menu className="w-6 h-6 text-gray-600" />
                </button>
                <div>
                  {projects.length === 0 ? (
                    <h1 className="text-2xl font-bold text-gray-900">No Project Assigned</h1>
                  ) : projects.length === 1 ? (
                    <h1 className="text-2xl font-bold text-gray-900">Project: {projects[0].name}</h1>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl font-bold text-gray-900">Project:</span>
                      <select
                        className="text-2xl font-bold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        value={selectedProjectId || ''}
                        onChange={e => setSelectedProjectId(e.target.value)}
                      >
                        {projects.map(project => (
                          <option key={project.id} value={project.id}>{project.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <p className="text-gray-600">Manage your support tickets and communications</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">

                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="font-medium">Sign Out</span>
                </button>
              </div>
            </div>
          </header>

          {/* Dashboard Content */}
          <main className="flex-1 overflow-auto p-6 bg-gray-50">
            {activeTab === 'dashboard' && (
              <div className="space-y-8">



                {/* Filtered Tickets Table */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mt-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">My Tickets</h2>
                  <div className="flex flex-wrap gap-4 mb-4 items-end">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">From Date</label>
                      <input type="date" className="border rounded px-2 py-1 text-sm" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">To Date</label>
                      <input type="date" className="border rounded px-2 py-1 text-sm" value={toDate} onChange={e => setToDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Period</label>
                      <select className="border rounded px-2 py-1 text-sm" value={period} onChange={e => setPeriod(e.target.value)}>
                        <option value="custom">Custom</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="last2days">Last 2 Days</option>
                      </select>
                    </div>
                    <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold" onClick={() => downloadTicketsAsExcel(filteredMyTickets)}>Download</button>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold" onClick={handleFilterApply}>Apply</button>
                    <button className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded font-semibold" onClick={handleFilterReset}>Reset</button>
                  </div>
                  {selectedTicketId ? (
                    <TicketDetails ticketId={selectedTicketId} onBack={() => setSelectedTicketId(null)} />
                  ) : filteredMyTickets.length === 0 ? (
                    <div className="text-gray-500">No tickets found for selected filters.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticket ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Raised By</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned By</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredMyTickets.map((ticket) => (
                            <tr
                              key={ticket.id}
                              onClick={() => setSelectedTicketId(ticket.id)}
                              className="hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                            >
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ticket.ticketNumber}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ticket.subject}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${ticket.status === 'Open' ? 'bg-blue-100 text-blue-800' :
                                  ticket.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                                    ticket.status === 'Resolved' ? 'bg-green-100 text-green-800' :
                                      'bg-gray-100 text-gray-800'
                                  }`}>
                                  {ticket.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ticket.priority}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ticket.customer}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ticket.assignedTo ? (ticket.assignedTo.name || ticket.assignedTo.email) : '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ticket.assignedBy || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatTimestamp(ticket.lastUpdated)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>



                {/* Quick Actions */}
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <Zap className="w-6 h-6 mr-3 text-blue-600" />
                    Quick Actions
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button
                      onClick={() => setActiveTab('create')}
                      className="group bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-300 text-left"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                          <Plus className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-gray-900 text-lg">Create New Ticket</p>
                          <p className="text-gray-600 text-sm">Submit a new support request</p>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab('tickets')}
                      className="group bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-300 text-left"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                          <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-gray-900 text-lg">View Project Tickets</p>
                          <p className="text-gray-600 text-sm">Check status of all project tickets</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tickets' && (
              <ClientTickets
                setActiveTab={setActiveTab}
                selectedProjectId={selectedProjectId}
                selectedProjectName={projects.find(p => p.id === selectedProjectId)?.name || ''}
              />
            )}

            {activeTab === 'create' && (
              <div className="max-w-auto mx-auto">
                <Ticketing
                  onTicketCreated={() => setActiveTab('tickets')}
                  selectedProjectId={selectedProjectId}
                  selectedProjectName={projects.find(p => p.id === selectedProjectId)?.name || ''}
                />
              </div>
            )}

            {/* Conditional rendering for other tabs like notifications, settings */}
            {activeTab === 'notifications' && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Notifications</h3>
                <p className="text-gray-600">No new notifications.</p>
              </div>
            )}
            {activeTab === 'settings' && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Settings</h3>
                <p className="text-gray-500">Account settings will be available here.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default ClientDashboard;
