import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  FolderOpen,
  Ticket,
  LogOut,
  Users,
  User,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Edit2,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { apiRequest } from '../../utils/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { format } from 'date-fns';
import Projects from './Projects';
import AdminTickets from './AdminTickets';
import LogoutModal from './LogoutModal';
import EditTicketForm from './EditTicketForm';
import EmployeesDirectory from './EmployeesDirectory';


// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

function Admin() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState({
    totalClients: 0,
    totalEmployees: 0,
    clientHeads: 0,
    projectManagers: 0,
    totalProjects: 0,
    totalTickets: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);
  const dropdownRef = useRef(null); // Ref for the dropdown container
  // The following block was syntactically incorrect and has been removed.
  // setNotification({ show: true, message, type });
  // setTimeout(() => {
  //   setNotification({ show: false, message: '', type: '' });
  // }, 3000);


  useEffect(() => {
    fetchStats();
    fetchTicketStats();

    // Handle clicks outside the dropdown
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowLogoutDropdown(false);
      }
    };

    if (showLogoutDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLogoutDropdown]); // Re-run effect when dropdown visibility changes

  const fetchStats = async () => {
    try {
      const response = await apiRequest('/admin/stats', {
        method: 'GET',
      });

      if (response.success && response.stats) {
        setStats(response.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };



  const fetchTicketStats = async () => {
    try {
      const response = await apiRequest('/admin/ticket-stats', {
        method: 'GET',
      });

      if (response.success && response.ticketStats) {
        // Convert date strings to Date objects for ticketsOverTime
        const ticketStats = {
          ...response.ticketStats,
          ticketsOverTime: response.ticketStats.ticketsOverTime.map(item => ({
            date: item.date ? new Date(item.date) : new Date(),
            count: item.count
          }))
        };
        setTicketStats(ticketStats);
      }
    } catch (error) {
      console.error('Error fetching ticket stats:', error);
    }
  };



  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      logout();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  const handleNavigation = (tab) => {
    setActiveTab(tab);
    // The navigation logic is now handled by the renderContent function based on activeTab
    // No need to use navigate here for internal tab changes within Admin component
  };

  // Sidebar items for navigation
  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, active: activeTab === 'dashboard' },
    { id: 'projects', label: 'Projects', icon: FolderOpen, active: activeTab === 'projects' },
    { id: 'admintickets', label: 'Tickets', icon: Ticket, active: activeTab === 'admintickets' },
    { id: 'employeesdirectory', label: 'Employee Directory', icon: Users, active: activeTab === 'employeesdirectory' },
    { id: 'editTicketform', label: 'Edit Ticketform', icon: Edit2, active: activeTab === 'editTicketform' },
  ];

  const renderSidebarItem = (item) => {
    const IconComponent = item.icon;
    return (
      <button
        key={item.id}
        onClick={() => handleNavigation(item.id)}
        className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'space-x-3'} px-4 py-3 rounded-xl transition-all duration-200 font-medium ${item.active
          ? 'bg-gradient-to-r from-[#FFA14A] to-[#FFB86C] text-white shadow-lg'
          : 'text-gray-600 hover:bg-orange-100 hover:text-orange-700'
          }`}
        title={isSidebarCollapsed ? item.label : ''}
      >
        <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : ''}`}>
          <IconComponent className={`w-5 h-5 ${item.active ? 'text-white' : 'text-gray-600'}`} />
        </div>
        {!isSidebarCollapsed && <span>{item.label}</span>}
      </button>
    );
  };

  const [ticketStats, setTicketStats] = useState({
    byStatus: {},
    byPriority: {},
    recentActivity: [],
    ticketsOverTime: []
  });
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const renderDashboard = () => {
    const ticketsOverTimeData = {
      labels: ticketStats.ticketsOverTime.map(t => format(t.date, 'MMM d')),
      datasets: [
        {
          label: 'New Tickets',
          data: ticketStats.ticketsOverTime.map(t => t.count),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    };

    const lineOptions = {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Tickets Created Over Time'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    };

    return (
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tickets</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.totalTickets}</h3>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Ticket className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-500 font-medium">12% increase</span>
              <span className="text-gray-600 ml-2">from last month</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Open Tickets</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">
                  {ticketStats.byStatus['Open'] || 0}
                </h3>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <Clock className="w-4 h-4 text-yellow-500 mr-1" />
              <span className="text-gray-600">Average response time: 2.5 hours</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Resolved Tickets</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">
                  {ticketStats.byStatus['Resolved'] || 0}
                </h3>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-500 font-medium">95%</span>
              <span className="text-gray-600 ml-2">resolution rate</span>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tickets Over Time Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ticket Trends</h3>
            <div className="h-[300px]">
              <Line options={lineOptions} data={ticketsOverTimeData} />
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {ticketStats.recentActivity.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className={`p-2 rounded-lg ${ticket.priority === 'High' ? 'bg-red-100' :
                    ticket.priority === 'Medium' ? 'bg-yellow-100' : 'bg-green-100'
                    }`}>
                    <Ticket className={`w-4 h-4 ${ticket.priority === 'High' ? 'text-red-600' :
                      ticket.priority === 'Medium' ? 'text-yellow-600' : 'text-green-600'
                      }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {ticket.subject}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {ticket.created?.toDate
                        ? format(ticket.created.toDate(), 'MMM d, yyyy h:mm a')
                        : 'Date not available'}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ticket.status === 'Open' ? 'bg-green-100 text-green-800' :
                    ticket.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                      ticket.status === 'Resolved' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                    }`}>
                    {ticket.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'projects':
        return <Projects />;
      case 'admintickets':
        return <AdminTickets />;
      case 'editTicketform':
        return <EditTicketForm />;
      case 'employeesdirectory':
        return <EmployeesDirectory />;
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-30 bg-white border-r border-gray-200 transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'
            } h-screen flex flex-col`}
        >
          {/* Sidebar Header */}
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            {!isSidebarCollapsed && (
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-[#FFA14A] to-[#FFB86C] rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-l font-bold text-gray-900">Admin Panel</h1>
                  <p className="text-sm text-gray-500">Admin Portal</p>
                </div>
              </div>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
            >
              <ChevronsLeft className="w-6 h-6" />
            </button>
          </div>

          {/* Sidebar Navigation */}
          <nav className="flex-1 p-6 space-y-2">
            {sidebarItems.map(renderSidebarItem)}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-6 border-t border-gray-200">
            {!isSidebarCollapsed && (
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-[#FFA14A] to-[#FFB86C] rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Admin</p>
                  <p className="text-xs text-gray-500">Admin User</p>
                </div>
              </div>
            )}
            <button
              onClick={handleLogoutClick}
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-start'} space-x-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200`}
            >
              <LogOut className="w-4 h-4" />
              {!isSidebarCollapsed && <span className="text-sm font-medium">Sign Out</span>}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className={`flex-1 min-w-0 transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'} flex flex-col h-screen`}>
          {/* Header */}
          <header className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0 z-20">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setIsSidebarCollapsed(false)}
                  className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ChevronsRight className="w-6 h-6 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Welcome, Admin!</h1>
                  <p className="text-gray-600">Manage your organization, projects, and tickets</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">

                <button
                  onClick={handleLogoutClick}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="font-medium">Sign Out</span>
                </button>
              </div>
            </div>
          </header>

          {/* Content Area */}
          <main className="p-6 flex-1 overflow-y-auto">
            {renderContent()}
          </main>
        </div>
      </div>





      {/* Logout Confirmation Modal */}
      <LogoutModal open={showLogoutModal} onCancel={handleLogoutCancel} onConfirm={handleLogoutConfirm} loading={loading} />
    </div>
  );
}


export default Admin;
