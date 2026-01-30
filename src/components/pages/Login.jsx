import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";

import { useAuth } from "../../context/AuthContext.jsx";
import artihcusLogo from '../../assets/AMS.png';

const Login = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  useEffect(() => {
    setIdentifier("");
    setPassword("");
  }, []);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!identifier || !password) {
      setError("Please fill in all fields");
      setIsLoading(false);
      return;
    }

    try {
      // Use OUR backend login (which bridges to external API)
      const apiURL = import.meta.env.VITE_API_URL || 'https://api.ticket.artihcus.com';
      const loginUrl = `${apiURL.replace(/\/+$/, '')}/api/auth/login`;

      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Map the user data from our backend
        const userData = {
          id: data.user.id || data.user._id,
          email: data.user.email,
          role: data.user.role,
          empId: data.user.empId || data.user.userName,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          fullName: data.user.fullName || `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim()
        };

        // Login using AuthContext (stores token and user data)
        login(data.token, userData);

        // Redirect based on role or redirect param
        const params = new URLSearchParams(location.search);
        const redirect = params.get('redirect');
        if (redirect) {
          navigate(redirect, { replace: true });
          return;
        }

        // Determine default redirect path
        let redirectPath = data.redirectPath;
        if (!redirectPath) {
          const role = userData.role?.toLowerCase();
          switch (role) {
            case 'admin':
              redirectPath = '/admin';
              break;
            case 'employee':
              redirectPath = '/employeedashboard';
              break;
            case 'client':
              redirectPath = '/clientdashboard';
              break;
            case 'project_manager':
              redirectPath = '/project-manager-dashboard';
              break;
            case 'client_head':
              redirectPath = '/client-head-dashboard';
              break;
            default:
              redirectPath = '/access-denied';
          }
        }
        navigate(redirectPath, { replace: true });
      } else {
        setError(data.error || "Invalid email or password");
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Login process error:", err);
      setIsLoading(false);
      setError("Authentication service unavailable. Please try again later.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm lg:w-96 mx-auto">
        <div className="flex justify-center mb-6">
          <img src={artihcusLogo} alt="Artihcus Logo" className="h-16 w-auto" />
        </div>
        <div>
          <h2 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome!
          </h2>
          <p className="text-gray-600 mb-8">
            Simplify your workflow and boost your productivity<br />
            with Artihcus. <span className="text-orange-500 font-medium">Get started ..</span>
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <input
              id="identifier"
              name="identifier"
              type="text"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-full bg-gray-50 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Email address or Employee ID"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>

          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-full bg-gray-50 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div
              className="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? (
                <FaEyeSlash className="h-5 w-5 text-gray-400" />
              ) : (
                <FaEye className="h-5 w-5 text-gray-400" />
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              className="text-sm text-gray-600 hover:text-gray-800"
              onClick={() => navigate("/forgot-password")}
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-orange-500 text-white py-3 px-4 rounded-full font-medium hover:bg-orange-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Logging...
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>


      </div>
    </div>
  );
};

export default Login;

