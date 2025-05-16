import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import apiService from '../services/api';
import axios from 'axios';
const { auth } = apiService;
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';  

interface User {
  id: number;
  name: string;
  email: string;
  username: string;
  role: string;
  avatar?: string;
  full_name?: string;
}

// Define the return types for the auth functions
interface LoginResult {
  success: boolean;
  requiresOtp?: boolean;
  message?: string;
}

interface OtpResult {
  success: boolean;
  message?: string;
}

interface RegisterResult {
  success: boolean;
  requiresOtp?: boolean;
  message?: string;
}

interface FieldCheckResult {
  exists: boolean;
  message: string;
}

interface UserExistsResult {
  success: boolean;
  exists: boolean;
  field?: string;
  message?: string;
  details?: {
    username?: FieldCheckResult;
    email?: FieldCheckResult;
    name?: FieldCheckResult;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  token: string | null;
  tempAuthToken: string | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  register: (userData: any) => Promise<RegisterResult>;
  logout: () => void;
  isOtpVerificationRequired: boolean;
  isOtpVerified: boolean;
  requestOtp: (email: string, tempToken: string) => Promise<OtpResult>;
  verifyOtp: (otp: string) => Promise<OtpResult>;
  userEmail: string | null;
  checkUserExists: (name: string, username: string, email: string) => Promise<UserExistsResult>;
  setAuthState: (token: string, userData: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isOtpVerificationRequired, setIsOtpVerificationRequired] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [tempAuthToken, setTempAuthToken] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      if (token) {
        try {
          const userData = await auth.getCurrentUser();
          setUser(userData.data);
        } catch (error) {
          console.error('Authentication error:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [token]);

  const checkUserExists = async (name: string, username: string, email: string): Promise<UserExistsResult> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await auth.checkUserExists(name, username, email);
      
      // Create a structured response based on the API format
      const result: UserExistsResult = { 
        success: true, 
        exists: response.data.exists,
        field: response.data.field || '',
        message: response.data.message || '',
        details: {
          username: {
            exists: response.data.username_taken || false,
            message: response.data.username_taken ? 'Username is already registered' : 'Username is available'
          },
          email: {
            exists: response.data.email_taken || false,
            message: response.data.email_taken ? 'Email is already registered' : 'Email is available'
          },
          name: {
            exists: false,
            message: 'Name is available'
          }
        }
      };
      
      return result;
    } catch (error: any) {
      console.error('User check error:', error);
      const errorMsg = error.response?.data?.message || 'Failed to check user existence. Please try again.';
      setError(errorMsg);
      return { success: false, exists: false, message: errorMsg };
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<LoginResult> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.post(
        `${API_URL}/api/auth/login`,
        { email, password }
      );
      
      // Extract the token from the response
      // The API returns access_token instead of token
      const token = response.data?.access_token;
      
      if (!token) {
        throw new Error('Invalid response from server');
      }
      
      // Update to store temporary token and email for OTP verification
      setTempAuthToken(token);
      setUserEmail(email);
      setIsOtpVerificationRequired(true);
      
      // Request OTP to be sent to user's email
      await requestOtp(email, token);
      
      return { success: true, requiresOtp: true };
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMsg = error.response?.data?.detail || 'Login failed. Please check your credentials.';
      setError(errorMsg);
      return { success: false, message: errorMsg };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: any): Promise<RegisterResult> => {
    setIsLoading(true);
    setError(null);
    try {
      // First register the user
      await auth.register(userData);
      
      // After successful registration, initiate the login process 
      // which will set up OTP verification
      const loginResult = await login(userData.email, userData.password);
      
      // Return the same format as login to allow redirect to OTP verification
      return {
        success: loginResult.success,
        requiresOtp: loginResult.requiresOtp,
        message: loginResult.message
      };
    } catch (error: any) {
      // More robust error handling
      let errorMessage: string;
      
      if (error.response?.data) {
        // Handle different API error formats
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else {
          // If there are validation errors with multiple fields
          const errorData = error.response.data;
          if (typeof errorData === 'object' && Object.keys(errorData).length > 0) {
            // Get the first error message or join all error messages
            const messages = Object.entries(errorData)
              .map(([key, value]) => `${key}: ${value}`)
              .join(', ');
            errorMessage = messages || 'Registration failed. Please try again.';
          } else {
            errorMessage = 'Registration failed. Please try again.';
          }
        }
      } else if (error.message) {
        errorMessage = error.message;
      } else {
        errorMessage = 'Registration failed. Please try again.';
      }
      
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    window.location.href = '/login';  // Force a full page reload and redirect to login
  };

  const requestOtp = async (email: string, tempToken: string): Promise<OtpResult> => {
    setIsLoading(true);
    setError(null);
    try {
      await axios.post(
        `${API_URL}/api/auth/request-otp`, 
        { email, purpose: 'registration' },
        {
          headers: {
            'Authorization': `Bearer ${tempToken}`,
            'Content-Type': 'application/json',
          }
        }
      );
      return { success: true };
    } catch (error: any) {
      console.error('OTP request error:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to send OTP. Please try again.';
      setError(errorMsg);
      return { success: false, message: errorMsg };
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (otp: string): Promise<OtpResult> => {
    if (!userEmail || !tempAuthToken) {
      setError('Authentication session expired. Please login again.');
      return { success: false, message: 'Authentication session expired' };
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(
        `${API_URL}/api/auth/verify-otp`,
        { email: userEmail, otp_code: otp, purpose: 'registration' },
        {
          headers: {
            'Authorization': `Bearer ${tempAuthToken}`,
            'Content-Type': 'application/json',
          }
        }
      );
      
      // Extract the token from the response
      // The API returns access_token instead of token
      const token = response.data?.access_token || response.data?.token;
      
      if (!token) {
        throw new Error('Invalid response from server');
      }
      
      // OTP is verified, complete the login process
      localStorage.setItem('token', token);
      setToken(token);
      setIsOtpVerified(true);
      setIsOtpVerificationRequired(false);
      
      // Fetch user profile with new token
      await fetchUserProfile(token);
      
      return { success: true };
    } catch (error: any) {
      console.error('OTP verification error:', error);
      const errorMsg = error.response?.data?.detail || 'Invalid OTP. Please try again.';
      setError(errorMsg);
      return { success: false, message: errorMsg };
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserProfile = async (token: string) => {
    try {
      const userData = await auth.getCurrentUser();
      const userDataWithFullName = {
        ...userData.data,
        full_name: userData.data.full_name || userData.data.name // Ensure full_name is included
      };
      setUser(userDataWithFullName);
      localStorage.setItem('user', JSON.stringify(userDataWithFullName));
    } catch (error) {
      console.error('Error fetching user profile:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
    }
  };

  const setAuthState = (token: string, userData: User) => {
    // Update token
    localStorage.setItem('token', token);
    setToken(token);
    
    // Update user with full_name
    const userDataWithFullName = {
      ...userData,
      full_name: userData.full_name || userData.name // Ensure full_name is included
    };
    setUser(userDataWithFullName);
    localStorage.setItem('user', JSON.stringify(userDataWithFullName));
    
    // Reset OTP-related states
    setIsOtpVerificationRequired(false);
    setIsOtpVerified(true);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    token,
    tempAuthToken,
    login,
    register,
    logout,
    isOtpVerificationRequired,
    isOtpVerified,
    requestOtp,
    verifyOtp,
    userEmail,
    checkUserExists,
    setAuthState
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
