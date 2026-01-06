import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiRequest } from "../../utils/api.js";
 
const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!email) {
      setError("Please enter your email address.");
      setLoading(false);
      return;
    }

    try {
      // Call backend API for forgot password
      const response = await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      if (!response.success) {
        setError(response.error || "Failed to send reset link");
        setLoading(false);
        return;
      }

      setSuccess(response.message || "Password reset link has been sent to your email. Please check your inbox.");
      setTimeout(() => {
        navigate('/');
      }, 3000);

    } catch (err) {
      console.error("Forgot password error:", err);
      const errorMessage = err.message || "Failed to send reset link";
      
      // Map error messages to match original behavior
      if (errorMessage.includes('Invalid email address format') || errorMessage.includes('invalid-email')) {
        setError("Invalid email address format");
      } else if (errorMessage.includes('No account found') || errorMessage.includes('user-not-found')) {
        setError("No account found with this email address");
      } else if (errorMessage.includes('Too many attempts') || errorMessage.includes('too-many-requests')) {
        setError("Too many attempts. Please try again later");
      } else if (errorMessage.includes('Network error') || errorMessage.includes('network-request-failed')) {
        setError("Network error. Please check your internet connection");
      } else if (errorMessage.includes('Account already exists') || errorMessage.includes('email-already-in-use')) {
        setError("Account already exists. Please try logging in.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-white-100 to-orange-100">
      {/* Left side - Illustration */}
      <div className="hidden lg:flex flex-1 items-center justify-end pr-0">
        <div className="relative">
          {/* Browser window illustration */}
          <div className="bg-orange-500 rounded-t-lg px-4 py-2 w-80">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
            </div>
          </div>
          <div className="bg-white border-l-4 border-r-4 border-b-4 border-gray-200 rounded-b-lg p-6 w-80">
            {/* Password stars */}
            <div className="bg-yellow-400 rounded-full px-4 py-2 mb-4 inline-block">
              <div className="flex space-x-1">
                <span className="text-white text-lg">★★★★★</span>
              </div>
            </div>
            <div className="bg-yellow-200 rounded-full px-4 py-2 mb-4 inline-block w-32 h-8"></div>
            {/* Cursor */}
            <div className="absolute bottom-16 left-8">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M8 2L16 10L12 11L14 16L11 17L9 12L8 2Z" fill="#374151"/>
              </svg>
            </div>
          </div>
          {/* Email icon */}
          <div className="absolute -top-8 -right-8 bg-orange-400 rounded-full p-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="white" strokeWidth="2" fill="none"/>
              <path d="M22 6L12 13L2 6" stroke="white" strokeWidth="2" fill="none"/>
            </svg>
          </div>
          {/* Lock icon */}
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-orange-400 rounded-lg p-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="11" width="18" height="10" rx="2" ry="2" fill="white"/>
              <circle cx="12" cy="16" r="1" fill="#3B82F6"/>
              <path d="M7 11V7C7 4.79086 8.79086 3 11 3H13C15.2091 3 17 4.79086 17 7V11" stroke="white" strokeWidth="2" fill="none"/>
            </svg>
          </div>
          {/* Decorative circles */}
          <div className="absolute -top-20 -left-10 w-16 h-16 bg-blue-100 rounded-full opacity-50"></div>
          <div className="absolute -bottom-16 -right-12 w-20 h-20 bg-orange-100 rounded-full opacity-50"></div>
          <div className="absolute top-1/2 -left-16 w-12 h-12 bg-purple-100 rounded-full opacity-50"></div>
        </div>
      </div>
      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-start pl-0">
        <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-2xl">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset Your Password
          </h2>
          {error && <p className="text-red-600">{error}</p>}
          {success && <p className="text-green-600">{success}</p>}
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Remembered your password?{" "}
              <Link to="/" className="text-orange-600 hover:text-orange-800">
                Log in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
 
export default ForgotPassword;
