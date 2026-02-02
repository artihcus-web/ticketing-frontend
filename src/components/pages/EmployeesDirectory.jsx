import { useState, useEffect } from 'react';
import {
    Users,
    Search,
    Mail,
    Phone,
    Building,
    Shield,
    Loader2,
    RefreshCw,
    AlertCircle,
    X,
    User
} from 'lucide-react';

const EmployeesDirectory = () => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchEmployees = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        else setIsRefreshing(true);

        setError(null);
        try {
            const apiBase = import.meta.env.VITE_EMPLOYEES_API_URL || 'https://ticketing.artihcus.com:8443/';
            const apiUrl = `${apiBase.endsWith('/') ? apiBase : apiBase + '/'}api/employees`;
            const response = await fetch(apiUrl);

            if (!response.ok) {
                throw new Error(`Failed to fetch employees: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            // Handle both {employees: [...]} and direct [...] formats
            const employeesList = Array.isArray(data) ? data : (data.employees || data.members || []);
            setEmployees(employeesList);

        } catch (err) {
            console.error('Error fetching employees:', err);
            setError(err.message || 'Failed to connect to the employees API. Please verify the API endpoint.');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }

    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const filteredEmployees = employees.filter(emp => {
        const searchLower = searchQuery.toLowerCase();
        return (
            (emp.fullName || emp.name || '').toLowerCase().includes(searchLower) ||
            (emp.email || '').toLowerCase().includes(searchLower) ||
            (emp.role || emp.designation || '').toLowerCase().includes(searchLower) ||
            (emp.employeeId || '').toLowerCase().includes(searchLower)
        );
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                <Loader2 className="w-12 h-12 text-[#FFA14A] animate-spin" />
                <p className="text-gray-500 font-medium animate-pulse">Fetching employee records...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header section with Premium Styling */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Employee Directory
                    </h1>
                    <p className="text-gray-500 mt-1 flex items-center">
                        <Users className="w-4 h-4 mr-2" />
                        Total {employees.length} Employees
                    </p>
                </div>

                <button
                    onClick={() => fetchEmployees(false)}
                    disabled={isRefreshing}
                    className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-orange-50 hover:text-orange-600 transition-all duration-300 shadow-sm disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>Refresh Data</span>
                </button>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start space-x-3 animate-in slide-in-from-top-4">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                        <h3 className="text-sm font-semibold text-red-800">Connection Error</h3>
                        <p className="text-sm text-red-600 mt-1">{error}</p>
                    </div>
                    <button onClick={() => setError(null)}>
                        <X className="w-4 h-4 text-red-400 hover:text-red-600" />
                    </button>
                </div>
            )}

            {/* SearchBar */}
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="w-5 h-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                </div>
                <input
                    type="text"
                    placeholder="Search by name, email, employee ID, or role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all text-gray-700"
                />
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-200">
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Employee</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Employee ID</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Email Address</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Department</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredEmployees.length > 0 ? (
                                filteredEmployees.map((emp, index) => (
                                    <tr
                                        key={emp.id || emp._id || index}
                                        className="hover:bg-orange-50/30 transition-colors group cursor-default"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shadow-sm transition-transform group-hover:scale-110">
                                                    <User className="w-5 h-5" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-gray-900">{emp.fullName || emp.name}</span>
                                                    {emp.status === 'active' && (
                                                        <span className="flex items-center text-[10px] text-green-600 font-bold uppercase">
                                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>
                                                            Active
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                                                {emp.employeeId || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center text-sm text-gray-600">
                                                <Shield className="w-3.5 h-3.5 mr-2 text-blue-500" />
                                                {emp.role || emp.designation || 'Staff'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center text-sm text-gray-600">
                                                <Mail className="w-3.5 h-3.5 mr-2 text-orange-400" />
                                                <a href={`mailto:${emp.email}`} className="hover:text-orange-600 transition-colors">
                                                    {emp.email}
                                                </a>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center text-sm text-gray-600">
                                                <Phone className="w-3.5 h-3.5 mr-2 text-green-500" />
                                                {emp.phone || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center text-sm text-gray-600">
                                                <Building className="w-3.5 h-3.5 mr-2 text-purple-500" />
                                                {emp.department || '-'}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-2">
                                            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center">
                                                <Users className="w-6 h-6 text-gray-300" />
                                            </div>
                                            <h3 className="text-sm font-semibold text-gray-900">No employees found</h3>
                                            <p className="text-xs text-gray-500">Try adjusting your search query</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default EmployeesDirectory;
