import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { apiRequest } from '../../utils/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { BsTicketFill } from 'react-icons/bs';
import TicketDetails from './TicketDetails';
import { sendEmail } from '../../utils/sendEmail';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

// Helper to safely format timestamps
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

function _safeCellValue(val) {  // eslint-disable-line no-unused-vars
  if (typeof val === 'string') return val.length > 10000 ? val.slice(0, 10000) + '... [truncated]' : val;
  if (Array.isArray(val)) return `[${val.length} items]`;
  if (typeof val === 'object' && val !== null) return '[object]';
  return val ?? '';
}

function formatDate(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (val.toDate) return val.toDate().toLocaleString();
  return new Date(val).toLocaleString();
}

function responseSummary(responses) {
  if (!Array.isArray(responses)) return '';
  if (responses.length === 0) return '0';
  return `${responses.length} responses`;
}

function employeeResponseSummary(ticket) {
  // If you have a separate employeeResponses array, use it. Otherwise, filter customerResponses by authorRole === 'employee'
  if (Array.isArray(ticket.employeeResponses)) return `${ticket.employeeResponses.length} responses`;
  if (Array.isArray(ticket.customerResponses)) {
    const emp = ticket.customerResponses.filter(r => r.authorRole === 'employee');
    return `${emp.length} responses`;
  }
  return '';
}

function calculateTimes(ticket) {
  let responseTime = '';
  let resolutionTime = '';
  const created = ticket.created?.toDate ? ticket.created.toDate() : (ticket.created ? new Date(ticket.created) : null);
  let assigned = null;
  let resolved = null;
  if (ticket.customerResponses && Array.isArray(ticket.customerResponses)) {
    for (const c of ticket.customerResponses) {
      if (!assigned && c.message && /assigned to/i.test(c.message)) {
        assigned = c.timestamp?.toDate ? c.timestamp.toDate() : (c.timestamp ? new Date(c.timestamp) : null);
      }
      if (!resolved && c.message && /resolution updated/i.test(c.message)) {
        resolved = c.timestamp?.toDate ? c.timestamp.toDate() : (c.timestamp ? new Date(c.timestamp) : null);
      }
    }
  }
  // Fallback: if status is Resolved and lastUpdated exists
  if (!resolved && ticket.status === 'Resolved' && ticket.lastUpdated) {
    resolved = ticket.lastUpdated.toDate ? ticket.lastUpdated.toDate() : new Date(ticket.lastUpdated);
  }
  if (created && assigned) responseTime = ((assigned - created) / 60000).toFixed(2);
  if (assigned && resolved) resolutionTime = ((resolved - assigned) / 60000).toFixed(2);
  return { responseTime, resolutionTime };
}

const ClientTickets = ({ setActiveTab: _setActiveTab }) => {  // eslint-disable-line no-unused-vars
  const { user } = useAuth();
  const [ticketsData, setTicketsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [filterStatus, setFilterStatus] = useState(['All']);
  const [filterPriority, setFilterPriority] = useState(['All']);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRaisedByEmployee, setFilterRaisedByEmployee] = useState('all');
  const [filterRaisedByClient, setFilterRaisedByClient] = useState('all');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [selectedProject, setSelectedProject] = useState('VMM');
  const [userProjects, setUserProjects] = useState([]);
  const [_employees, _setEmployees] = useState([]);  // eslint-disable-line no-unused-vars
  const [_clients, _setClients] = useState([]);  // eslint-disable-line no-unused-vars
  const [currentUserData, setCurrentUserData] = useState(null);
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' for Newest, 'asc' for Oldest
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [priorityDropdownOpen, setPriorityDropdownOpen] = useState(false);
  const statusDropdownRef = useRef(null);
  const priorityDropdownRef = useRef(null);
  const _navigate = useNavigate();  // eslint-disable-line no-unused-vars
  const [_projectMembers, setProjectMembers] = useState([]);  // eslint-disable-line no-unused-vars
  const [employeeMembers, setEmployeeMembers] = useState([]);
  const [clientMembers, setClientMembers] = useState([]);
  const [selectedTicketIds, setSelectedTicketIds] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [quickDate, setQuickDate] = useState('');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setTicketsData([]);
      return;
    }

    const fetchUserData = async () => {
      try {
        setLoading(true);
        setCurrentUserEmail(user.email);
        const userResponse = await apiRequest('/dashboards/user', { method: 'GET' });
        if (userResponse.success && userResponse.user) {
          const userData = userResponse.user;
          setCurrentUserData(userData);
          // Handle project as array or string
          if (Array.isArray(userData.project)) {
            setUserProjects(userData.project);
            setSelectedProject(userData.project[0] || 'VMM');
          } else {
            setUserProjects([userData.project || 'VMM']);
            setSelectedProject(userData.project || 'VMM');
          }
        }
        try {
          const filterData = sessionStorage.getItem('ticketFilter');
          if (filterData) {
            const parsedFilter = JSON.parse(filterData);
            setFilterStatus(parsedFilter.status);
            setFilterPriority(parsedFilter.priority);
            sessionStorage.removeItem('ticketFilter');
          }
        } catch (err) {
          console.error('Error parsing filter data:', err);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [user]);

  useEffect(() => {
    if (!selectedProject || !user) return;

    let isInitialLoad = true;
    let interval = null;

    const fetchData = async () => {
      try {
        if (isInitialLoad) {
          setLoading(true);
        }
        setError(null);

        // Fetch project members
        const membersResponse = await apiRequest(`/tickets/project-members?projectName=${encodeURIComponent(selectedProject)}`, {
          method: 'GET',
        });

        if (membersResponse.success && membersResponse.members) {
          const members = membersResponse.members;
          setProjectMembers(members);
          setEmployeeMembers(members.filter(m => m.role === 'employee' || m.role === 'project_manager'));
          setClientMembers(members.filter(m => m.role === 'client' || m.role === 'client_head'));
        } else {
          setProjectMembers([]);
          setEmployeeMembers([]);
          setClientMembers([]);
        }

        // Fetch tickets
        const ticketsResponse = await apiRequest(`/dashboards/tickets?projectName=${encodeURIComponent(selectedProject)}`, {
          method: 'GET',
        });

        if (ticketsResponse.success && ticketsResponse.tickets) {
          const ticketsData = ticketsResponse.tickets.map(ticket => ({
            ...ticket,
            created: ticket.created ? new Date(ticket.created) : null,
            lastUpdated: ticket.lastUpdated ? new Date(ticket.lastUpdated) : null,
          }));
          setTicketsData(ticketsData);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load tickets for the project.');
      } finally {
        if (isInitialLoad) {
          setLoading(false);
          isInitialLoad = false;
        }
      }
    };

    fetchData();

    // Poll for updates every 30 seconds, only when tab is visible
    const startPolling = () => {
      if (document.visibilityState === 'visible') {
        interval = setInterval(() => {
          if (document.visibilityState === 'visible') {
            fetchData();
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
        fetchData();
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
  }, [selectedProject, user]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) setStatusDropdownOpen(false);
      if (priorityDropdownRef.current && !priorityDropdownRef.current.contains(event.target)) setPriorityDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const summarize = (arr, allLabel, _options) => {  // eslint-disable-line no-unused-vars
    if (arr.includes('All')) return allLabel;
    if (arr.length === 0) return allLabel;
    return arr.join(', ');
  };

  const _handleTicketClick = (ticketId) => {  // eslint-disable-line no-unused-vars
    setSelectedTicketId(ticketId);
  };

  const handleBackToTickets = () => {
    setSelectedTicketId(null);
  };

  const handleAssignTicket = async (ticketId, selectedUserEmail) => {
    const ticket = ticketsData.find(t => t.id === ticketId);
    if (!ticketId || !user || !selectedUserEmail || !ticket) return;

    try {
      let assignee = employeeMembers.find(emp => emp.email === selectedUserEmail) || clientMembers.find(c => c.email === selectedUserEmail);
      if (!assignee && selectedUserEmail === currentUserEmail) {
        // Assign to self if not in employees/clients list
        if (currentUserData) {
          let name = '';
          if (currentUserData.firstName && currentUserData.lastName) {
            name = `${currentUserData.firstName} ${currentUserData.lastName}`.trim();
          } else if (currentUserData.firstName) {
            name = currentUserData.firstName;
          } else if (currentUserData.lastName) {
            name = currentUserData.lastName;
          } else {
            name = currentUserData.email.split('@')[0];
          }
          assignee = {
            name,
            email: currentUserData.email
          };
        } else {
          assignee = {
            name: currentUserEmail.split('@')[0],
            email: currentUserEmail
          };
        }
      }
      if (!assignee) return;
      const assignerUsername = currentUserEmail.split('@')[0];

      // Update ticket via API
      const updateResponse = await apiRequest(`/tickets/${ticketId}`, {
        method: 'PUT',
        body: JSON.stringify({
          assignedTo: { name: assignee.name || assignee.email || 'Unknown', email: assignee.email },
          assignedBy: assignerUsername,
          status: 'In Progress',
        }),
      });

      if (!updateResponse.success) {
        throw new Error(updateResponse.error || 'Failed to assign ticket');
      }

      // Add system comment
      await apiRequest(`/tickets/${ticketId}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          message: `Ticket assigned to ${assignee.name} by ${assignerUsername}.`,
          authorEmail: 'system',
          authorRole: 'system',
        }),
      });

      // Fetch the user object for reportedBy or ticket.email to get the correct recipient name
      let recipientEmail = ticket.reportedBy || ticket.email;
      let recipientName = recipientEmail;
      try {
        const userResponse = await apiRequest(`/admin/users?email=${encodeURIComponent(recipientEmail)}`, {
          method: 'GET',
        });
        if (userResponse.success && userResponse.users && userResponse.users.length > 0) {
          const userData = userResponse.users[0];
          recipientName = (userData.firstName && userData.lastName)
            ? `${userData.firstName} ${userData.lastName}`.trim()
            : (userData.firstName || userData.lastName || userData.email);
        }
      } catch (_e) { /* fallback to email */ }  // eslint-disable-line no-unused-vars

      const emailParams = {
        to_email: recipientEmail,
        to_name: recipientName,
        subject: ticket.subject,
        ticket_number: ticket.ticketNumber,
        assigned_to: assignee.name || assignee.email || 'Unknown',
        project: ticket.project,
        category: ticket.category,
        priority: ticket.priority,
        ticket_link: `https://articket.vercel.app/tickets/${ticket.id}`,
      };
      await sendEmail(emailParams, 'template_igl3oxn');

      // Refresh tickets
      const ticketsResponse = await apiRequest(`/dashboards/tickets?projectName=${encodeURIComponent(selectedProject)}`, {
        method: 'GET',
      });
      if (ticketsResponse.success && ticketsResponse.tickets) {
        const ticketsData = ticketsResponse.tickets.map(t => ({
          ...t,
          created: t.created ? new Date(t.created) : null,
          lastUpdated: t.lastUpdated ? new Date(t.lastUpdated) : null,
        }));
        setTicketsData(ticketsData);
      }
    } catch (error) {
      console.error('Error assigning ticket:', error);
      setError(error.message || 'Failed to assign ticket');
    }
  };

  const handleCheckboxFilter = (filter, setFilter, value) => {
    if (value === 'All') {
      setFilter(['All']);
    } else {
      setFilter(prev => {
        let next = prev.includes('All') ? [] : [...prev];
        if (next.includes(value)) {
          next = next.filter(v => v !== value);
        } else {
          next.push(value);
        }
        if (next.length === 0) return ['All'];
        return next;
      });
    }
  };

  // Date filter logic
  const applyQuickDate = (type) => {
    setQuickDate(type);
    let from = '';
    let to = '';
    const now = dayjs();
    if (type === 'this_month') {
      from = now.startOf('month').format('YYYY-MM-DD');
      to = now.endOf('month').format('YYYY-MM-DD');
    } else if (type === 'this_week') {
      from = now.startOf('week').format('YYYY-MM-DD');
      to = now.endOf('week').format('YYYY-MM-DD');
    } else if (type === 'last_2_days') {
      from = now.subtract(2, 'day').format('YYYY-MM-DD');
      to = now.format('YYYY-MM-DD');
    }
    setDateFrom(from);
    setDateTo(to);
  };
  const _clearDateFilter = () => {  // eslint-disable-line no-unused-vars
    setDateFrom('');
    setDateTo('');
    setQuickDate('');
  };

  // Compute filtered tickets
  const filteredTickets = ticketsData.filter(ticket => {
    const matchesStatus = filterStatus.includes('All') || filterStatus.includes(ticket.status);
    const matchesPriority = filterPriority.includes('All') || filterPriority.includes(ticket.priority);
    const matchesSearch =
      ticket.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.ticketNumber?.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesRaisedBy = true;
    if (filterRaisedByEmployee === 'all' && filterRaisedByClient === 'all') {
      matchesRaisedBy = true;
    } else if (filterRaisedByEmployee !== 'all') {
      if (filterRaisedByEmployee === 'me') {
        matchesRaisedBy = ticket.email === currentUserEmail;
      } else if (filterRaisedByEmployee === 'any') {
        matchesRaisedBy = employeeMembers.some(emp => emp.email === ticket.email);
      } else {
        matchesRaisedBy = ticket.email === filterRaisedByEmployee;
      }
    } else if (filterRaisedByClient !== 'all') {
      if (filterRaisedByClient === 'me') {
        matchesRaisedBy = ticket.email === currentUserEmail;
      } else if (filterRaisedByClient === 'any') {
        matchesRaisedBy = clientMembers.some(client => client.email === ticket.email);
      } else {
        matchesRaisedBy = ticket.email === filterRaisedByClient;
      }
    }

    // Date filter
    let matchesDate = true;
    if (dateFrom) {
      const created = ticket.created?.toDate ? ticket.created.toDate() : (ticket.created ? new Date(ticket.created) : null);
      if (!created || dayjs(created).isBefore(dayjs(dateFrom), 'day')) matchesDate = false;
    }
    if (dateTo) {
      const created = ticket.created?.toDate ? ticket.created.toDate() : (ticket.created ? new Date(ticket.created) : null);
      if (!created || dayjs(created).isAfter(dayjs(dateTo), 'day')) matchesDate = false;
    }

    return matchesStatus && matchesPriority && matchesSearch && matchesRaisedBy && matchesDate;
  });

  // Sort tickets by date
  const sortedTickets = [...filteredTickets].sort((a, b) => {
    const dateA = a.created?.toDate ? a.created.toDate() : new Date(a.created);
    const dateB = b.created?.toDate ? b.created.toDate() : new Date(b.created);
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  // Ticket counts for cards
  const _totalTickets = ticketsData.length;  // eslint-disable-line no-unused-vars
  const _openTickets = ticketsData.filter(t => t.status === 'Open').length;  // eslint-disable-line no-unused-vars
  const _inProgressTickets = ticketsData.filter(t => t.status === 'In Progress').length;  // eslint-disable-line no-unused-vars
  const _resolvedTickets = ticketsData.filter(t => t.status === 'Resolved').length;  // eslint-disable-line no-unused-vars
  const _closedTickets = ticketsData.filter(t => t.status === 'Closed').length;  // eslint-disable-line no-unused-vars

  // Add handler for checkbox
  const handleCheckboxChange = (ticketId) => {
    setSelectedTicketIds(prev =>
      prev.includes(ticketId) ? prev.filter(id => id !== ticketId) : [...prev, ticketId]
    );
  };

  // Add handler for select all
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedTicketIds(sortedTickets.map(t => t.id));
    } else {
      setSelectedTicketIds([]);
    }
  };

  const clearFilters = () => {
    setFilterStatus(['All']);
    setFilterPriority(['All']);
    setFilterRaisedByEmployee('all');
    setFilterRaisedByClient('all');
    setSearchTerm('');
    setFiltersApplied(false);
    setDateFrom('');
    setDateTo('');
    setQuickDate('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tickets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  if (selectedTicketId) {
    return <TicketDetails ticketId={selectedTicketId} onBack={handleBackToTickets} onAssign={handleAssignTicket} />;
  }

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <BsTicketFill className="mr-3 text-blue-600" />Tickets
          </h1>
          {/* Ticket Stats Cards */}

        </div>

      </div>

      <div className="flex justify-between items-center mb-8">
        <div>

        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-4 mb-6 bg-white p-4 rounded-xl shadow border border-gray-100">
        <div>
          <label className="text-xs font-semibold text-gray-500 mr-2">Status</label>
          <div className="relative" ref={statusDropdownRef}>
            <button type="button" className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white min-w-[120px] text-left" onClick={() => setStatusDropdownOpen(v => !v)}>
              {summarize(filterStatus, 'All', ['Open', 'In Progress', 'Resolved', 'Closed'])}
            </button>
            {statusDropdownOpen && (
              <div className="absolute z-10 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 p-2 min-w-[180px]">
                <label className="flex items-center text-sm">
                  <input type="checkbox" checked={filterStatus.includes('All')} onChange={() => handleCheckboxFilter(filterStatus, setFilterStatus, 'All')} /> All
                </label>
                {['Open', 'In Progress', 'Resolved', 'Closed'].map(status => (
                  <label key={status} className="flex items-center text-sm">
                    <input type="checkbox" checked={filterStatus.includes(status)} onChange={() => handleCheckboxFilter(filterStatus, setFilterStatus, status)} /> {status}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mr-2">Priority</label>
          <div className="relative" ref={priorityDropdownRef}>
            <button type="button" className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white min-w-[120px] text-left" onClick={() => setPriorityDropdownOpen(v => !v)}>
              {summarize(filterPriority, 'All', ['High', 'Medium', 'Low'])}
            </button>
            {priorityDropdownOpen && (
              <div className="absolute z-10 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 p-2 min-w-[180px]">
                <label className="flex items-center text-sm">
                  <input type="checkbox" checked={filterPriority.includes('All')} onChange={() => handleCheckboxFilter(filterPriority, setFilterPriority, 'All')} /> All
                </label>
                {['High', 'Medium', 'Low'].map(priority => (
                  <label key={priority} className="flex items-center text-sm">
                    <input type="checkbox" checked={filterPriority.includes(priority)} onChange={() => handleCheckboxFilter(filterPriority, setFilterPriority, priority)} /> {priority}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mr-2">Raised By Employee</label>
          <select
            value={filterRaisedByEmployee}
            onChange={e => {
              setFilterRaisedByEmployee(e.target.value);
              setFilterRaisedByClient('all'); // Reset client filter when employee filter changes
            }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 min-w-[140px]"
          >
            <option value="all">All</option>
            <option value="any">All Employees</option>
            <option value="me">Me</option>
            {employeeMembers.map(member => (
              <option key={member.email} value={member.email}>
                {member.firstName && member.lastName ? `${member.firstName} ${member.lastName}` : member.email.split('@')[0]}{member.role === 'project_manager' ? ' (Manager)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mr-2">Raised By Client</label>
          <select
            value={filterRaisedByClient}
            onChange={e => {
              setFilterRaisedByClient(e.target.value);
              setFilterRaisedByEmployee('all'); // Reset employee filter when client filter changes
            }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 min-w-[140px]"
          >
            <option value="all">All</option>
            <option value="any">All Clients</option>
            {clientMembers.map(member => (
              <option key={member.email} value={member.email}>
                {member.firstName && member.lastName ? `${member.firstName} ${member.lastName}` : member.email.split('@')[0]}{member.role === 'client_head' ? ' (Client Head)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <input
            type="text"
            placeholder="Search by subject or ID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mr-2">Sort by Date</label>
          <select
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
          >
            <option value="desc">Newest</option>
            <option value="asc">Oldest</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mr-2">From</label>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setQuickDate(''); }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mr-2">To</label>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setQuickDate(''); }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mr-2">Quick Date</label>
          <select
            value={quickDate}
            onChange={e => applyQuickDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"
          >
            <option value="">Select...</option>
            <option value="this_month">This Month</option>
            <option value="this_week">This Week</option>
            <option value="last_2_days">Last 2 Days</option>
          </select>
        </div>
        <button
          onClick={() => setFiltersApplied(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold ml-2"
          type="button"
        >
          Search
        </button>
        <button
          onClick={clearFilters}
          className="ml-auto text-xs text-blue-600 hover:underline px-2 py-1 rounded"
          type="button"
        >
          Clear Filters
        </button>

      </div>

      {/* Only show tickets if filtersApplied is true */}
      {filtersApplied && sortedTickets.length > 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedTicketIds.length === sortedTickets.length}
                      onChange={e => handleSelectAll(e.target.checked)}
                    />
                  </th>
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
                {sortedTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={e => {
                      // Prevent row click if checkbox is clicked
                      if (e.target.type !== 'checkbox') setSelectedTicketId(ticket.id);
                    }}
                    className="hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                  >
                    <td className="px-2 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <input
                        type="checkbox"
                        checked={selectedTicketIds.includes(ticket.id)}
                        onChange={() => handleCheckboxChange(ticket.id)}
                        onClick={e => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {ticket.ticketNumber}
                    </td>
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
        </div>
      ) : filtersApplied ? (
        <div className="text-gray-400 text-center py-12">No tickets found for selected filters.</div>
      ) : (
        <div className="text-gray-400 text-center py-12">Select filters and click &apos;Apply Filters&apos; to view tickets.</div>
      )}

      {/* Add project selector for users with multiple projects */}
      {userProjects.length > 1 && (
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-500 mr-2">Select Project</label>
          <select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 min-w-[140px]"
          >
            {userProjects.map(proj => (
              <option key={proj} value={proj}>{proj}</option>
            ))}
          </select>
        </div>
      )}
    </>
  );
};

ClientTickets.propTypes = {
  setActiveTab: PropTypes.func
};

export default ClientTickets;

function _downloadTicketsAsExcel(tickets) {  // eslint-disable-line no-unused-vars
  if (!tickets || tickets.length === 0) return;
  const columns = [
    'ticketNumber', 'subject', 'module', 'typeOfIssue', 'category', 'subCategory', 'status', 'priority',
    'assignedTo', 'assignedBy', 'createdBy', 'reportedBy', 'lastUpdated', 'customerResponses', 'employeeResponses', 'Response Time (min)', 'Resolution Time (min)'
  ];
  const rows = tickets.map(ticket => {
    const times = calculateTimes(ticket);
    return [
      ticket.ticketNumber || '',
      ticket.subject || '',
      ticket.module || '',
      ticket.typeOfIssue || '',
      ticket.category || '',
      ticket.subCategory || '',
      ticket.status || '',
      ticket.priority || '',
      ticket.assignedTo ? (typeof ticket.assignedTo === 'object' ? (ticket.assignedTo.name || ticket.assignedTo.email || '') : ticket.assignedTo) : '',
      ticket.assignedBy || '',
      ticket.customer || ticket.createdBy || ticket.email || '',
      ticket.reportedBy || '',
      formatDate(ticket.lastUpdated),
      responseSummary(ticket.customerResponses),
      employeeResponseSummary(ticket),
      times.responseTime,
      times.resolutionTime
    ];
  });
  rows.unshift(columns);
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Tickets');
  XLSX.writeFile(wb, 'tickets_export.xlsx');
}
