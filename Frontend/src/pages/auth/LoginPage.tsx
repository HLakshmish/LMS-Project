import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoginForm from '../../components/auth/LoginForm';
import axios from 'axios';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const LoginPage: React.FC = () => {
  const { isAuthenticated, user, isOtpVerificationRequired, isLoading, error, setAuthState } = useAuth();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [initialEmail, setInitialEmail] = useState<string>('');
  const [localLoading, setLocalLoading] = useState<boolean>(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Check for success message in location state (from registration)
  useEffect(() => {
    if (location.state) {
      const state = location.state as { message?: string; email?: string };
      if (state.message) {
        setSuccessMessage(state.message);
      }
      if (state.email) {
        setInitialEmail(state.email);
      }
    }
  }, [location]);

  const handleLogin = async (data: { email: string; password: string }) => {
    setLocalLoading(true);
    setLoginError(null);
    
    try {
      // Login directly without OTP verification
      const response = await axios.post(
        `${API_URL}/api/auth/login`,
        { email: data.email, password: data.password },
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      // Extract the token from the response
      // The API returns access_token instead of token
      const token = response.data?.access_token;
      const tokenType = response.data?.token_type || 'bearer';
      
      if (token) {

        // Get user info with the correct Authorization header format
        const userResponse = await axios.get(
      
          `${API_URL}/api/auth/me`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            }
          }
        );
        
        // Save user info using the AuthContext method
        if (userResponse.data) {
          setAuthState(token, userResponse.data);
          
          // Navigate to dashboard based on role
          const userRole = userResponse.data.role;
          if (userRole === 'student') {
            navigate('/student/dashboard');
          } else if (userRole === 'teacher') {
            navigate('/teacher/dashboard');
          } else if (userRole === 'admin') {
            navigate('/admin/dashboard');
          } else {
            navigate('/dashboard');
          }
        }
      } else {
        setLoginError('Login failed. Invalid response from server.');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setLoginError(
        error.response?.data?.detail || 
        error.response?.data?.message || 
        error.message || 
        'Login failed. Please check your credentials.'
      );
    } finally {
      setLocalLoading(false);
    }
  };

  // Only redirect to dashboard if authenticated and OTP is not required
  // (This is kept as a fallback, but our custom login flow should handle the navigation)
  if (isAuthenticated && user) {
    const role = user.role;
    if (role === 'student') {
      return <Navigate to="/student/dashboard" />;
    } else if (role === 'teacher') {
      return <Navigate to="/teacher/dashboard" />;
    } else if (role === 'admin') {
      return <Navigate to="/admin/dashboard" />;
    } else {
      return <Navigate to="/dashboard" />;
    }
  }

  return (
    <LoginForm 
      onLogin={handleLogin} 
      isLoading={localLoading || isLoading} 
      error={loginError || error} 
      successMessage={successMessage}
      initialEmail={initialEmail}
    />
  );
};

export default LoginPage;

