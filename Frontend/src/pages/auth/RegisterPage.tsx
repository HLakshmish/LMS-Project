import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import RegisterForm from '../../components/auth/RegisterForm';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import axios from 'axios';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
// Define registration steps
type RegistrationStep = 'enterDetails' | 'verifyOtp' | 'complete';

const RegisterPage: React.FC = () => {
  const { 
    register, 
    isAuthenticated, 
    user, 
    isLoading, 
    error, 
    isOtpVerificationRequired, 
    verifyOtp, 
    requestOtp, 
    tempAuthToken, 
    userEmail: authUserEmail,
    checkUserExists
  } = useAuth();
  
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [otp, setOtp] = useState('');
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [registrationStep, setRegistrationStep] = useState<RegistrationStep>('enterDetails');
  const [pendingUserData, setPendingUserData] = useState<any>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  const navigate = useNavigate();

  // Start countdown for OTP resend
  useEffect(() => {
    if (showOtpVerification && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCanResend(true);
    }
  }, [countdown, showOtpVerification]);
  
  // Update UI based on OTP verification status
  useEffect(() => {
    if (isOtpVerificationRequired) {
      setShowOtpVerification(true);
      setRegistrationStep('verifyOtp');
    }
  }, [isOtpVerificationRequired]);

  const redirectToDashboard = (role: string) => {
    if (role === 'student') {
      navigate('/student/dashboard');
    } else if (role === 'teacher') {
      navigate('/teacher/dashboard');
    } else if (role === 'admin') {
      navigate('/admin/dashboard');
    }
  };

  const handleRegister = async (data: any) => {
    setRegisterError(null);
    
    try {
      // First, check if the user already exists
      const userCheckResult = await checkUserExists(data.name, data.username, data.email);
      
      if (userCheckResult.exists) {
        // Build a specific error message based on which fields are taken
        const errorMessages = [];
        
        if (userCheckResult.details?.username?.exists) {
          errorMessages.push("Username is already registered");
        }
        
        if (userCheckResult.details?.email?.exists) {
          errorMessages.push("Email is already registered");
        }
        
        if (userCheckResult.details?.name?.exists) {
          errorMessages.push("Name is already registered");
        }
        
        // If we have specific error messages, use them
        if (errorMessages.length > 0) {
          setRegisterError(errorMessages.join('. '));
        } else {
          // Fallback to a generic message if no specific fields are identified
          setRegisterError("One or more fields are already registered. Please try different values.");
        }
        return;
      }
      
      // Store the user data for later registration after OTP verification
      setPendingUserData({
        full_name : data.name,
        username: data.username,
        email: data.email,
        password: data.password,
        role: 'student'
      });
      
      // Request OTP directly without creating the user yet
      try {
        // Request OTP without requiring authentication
        const response = await axios.post(
          `${API_URL}/api/auth/request-otp`,
          { email: data.email, purpose: 'registration' },
          {
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );
        
        // Update UI state to show OTP verification form
        setUserEmail(data.email);
        setShowOtpVerification(true);
        setRegistrationStep('verifyOtp');
      } catch (otpError: any) {
        console.error('OTP request error:', otpError);
        setRegisterError(otpError.response?.data?.message || otpError.message || 'Failed to send verification code. Please try again.');
      }
    } catch (error: any) {
      // Handle errors from user check
      console.error('Registration error:', error);
      if (error.response?.data) {
        // Handle different API error formats
        if (typeof error.response.data === 'string') {
          setRegisterError(error.response.data);
        } else if (error.response.data.detail) {
          setRegisterError(error.response.data.detail);
        } else if (error.response.data.message) {
          setRegisterError(error.response.data.message);
        } else {
          // If there are validation errors with multiple fields
          const errorData = error.response.data;
          if (typeof errorData === 'object' && Object.keys(errorData).length > 0) {
            // Get the first error message from the response
            const firstErrorKey = Object.keys(errorData)[0];
            const errorMessage = errorData[firstErrorKey];
            setRegisterError(`${firstErrorKey}: ${errorMessage}`);
          } else {
            setRegisterError('Registration failed. Please try again.');
          }
        }
      } else if (error.message) {
        setRegisterError(error.message);
      } else {
        setRegisterError('Registration failed. Please try again.');
      }
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerificationError(null);
    
    if (!otp.trim()) {
      setVerificationError('Please enter the OTP code');
      return;
    }
    
    if (!pendingUserData || !userEmail) {
      setVerificationError('Registration session expired. Please try again.');
      return;
    }
    
    try {
      // Verify OTP first
      const verifyResult = await axios.post(
        `${API_URL}/api/auth/verify-otp`,
        { email: userEmail, otp_code: otp, purpose: 'registration' },
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      // Check for success in the response - look for success message
      const isSuccess = verifyResult.data?.message === "OTP verified successfully" || 
                         verifyResult.data?.success === true;
      
      if (isSuccess) {
        // OTP verified, now register the user
        try {
          // Register the user with the data we saved earlier
          await axios.post(
            `${API_URL}/api/auth/register`,
            pendingUserData,
            {
              headers: {
                'Content-Type': 'application/json',
              }
            }
          );
          
          // Show success message
          setVerificationError(null);
          
          // Navigate to login page after successful registration
          navigate('/login', { 
            state: { 
              message: 'Registration successful! Please log in with your credentials.',
              email: userEmail
            } 
          });
          
        } catch (registerError: any) {
          console.error('Registration error:', registerError);
          let errorMessage = 'Failed to create account. Please try again.';
          
          if (registerError.response?.data) {
            if (typeof registerError.response.data === 'string') {
              errorMessage = registerError.response.data;
            } else if (registerError.response.data.detail) {
              errorMessage = registerError.response.data.detail;
            } else if (registerError.response.data.message) {
              errorMessage = registerError.response.data.message;
            }
          } else if (registerError.message) {
            errorMessage = registerError.message;
          }
          
          setVerificationError(errorMessage);
        }
      } else {
        setVerificationError(verifyResult.data?.message || 'Invalid verification code.');
      }
    } catch (error: any) {
      console.error('OTP verification error:', error);
      setVerificationError(
        error.response?.data?.message || 
        error.response?.data?.detail || 
        error.message || 
        'OTP verification failed'
      );
    }
  };
  
  const handleResendOtp = async () => {
    if (!canResend || !userEmail) return;
    
    try {
      // Resend OTP
      await axios.post(
        `${API_URL}/api/auth/request-otp`,
        { email: userEmail, purpose: 'registration' },
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      setCountdown(60);
      setCanResend(false);
    } catch (error: any) {
      setVerificationError(error.message || 'Failed to resend OTP');
    }
  };

  // Render OTP verification UI if required
  if (showOtpVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <Card className="w-full max-w-md">
          <div className="p-6">
            <h2 className="text-xl font-bold text-center text-gray-800 mb-6">Email Verification</h2>
            <p className="text-gray-600 mb-6 text-center">
              We've sent a verification code to <span className="font-medium">{userEmail}</span>. 
              Please enter the code below to continue.
            </p>
            
            {(verificationError || error) && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {verificationError || error}
              </div>
            )}
            
            <form onSubmit={handleVerify}>
              <div className="mb-4">
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  id="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  autoComplete="one-time-code"
                />
              </div>
              
              <Button
                variant="primary"
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Verifying...' : 'Verify & Register'}
              </Button>
            </form>
            
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Didn't receive the code?{' '}
                {canResend ? (
                  <button
                    onClick={handleResendOtp}
                    className="text-blue-600 hover:text-blue-800 font-medium focus:outline-none"
                  >
                    Resend Code
                  </button>
                ) : (
                  <span className="text-gray-500">
                    Resend in {countdown} seconds
                  </span>
                )}
              </p>
            </div>
            
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setShowOtpVerification(false);
                  setRegistrationStep('enterDetails');
                }}
                className="text-sm text-gray-600 hover:text-gray-800 focus:outline-none"
              >
                Back to Registration
              </button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Render registration form
  return (
    <RegisterForm 
      onRegister={handleRegister} 
      isLoading={isLoading} 
      error={registerError || error} 
    />
  );
};

export default RegisterPage;
