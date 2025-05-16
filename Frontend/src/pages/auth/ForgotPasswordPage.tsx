import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import axios from 'axios';
import ErrorAlert from '../../components/ui/ErrorAlert';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'email' | 'verify' | 'reset'>('email');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const navigate = useNavigate();

  // Start countdown for OTP resend
  React.useEffect(() => {
    if (step === 'verify' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCanResend(true);
    }
  }, [countdown, step]);

  // Step 1: Check if email exists and send OTP
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // First check if the email exists in the system
      const checkResponse = await axios.post(
        `${API_URL}/api/auth/check-user-exists`,
        { email, username: "", name: "" },
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      // Check if email exists based on the API response format
      // For password reset, we want to find emails that ARE taken (exists=true)
      if (!checkResponse.data.exists && !checkResponse.data.email_taken) {
        setError('No account found with this email address.');
        setIsLoading(false);
        return;
      }

      // Email exists, request OTP
      await axios.post(
        `${API_URL}/api/auth/request-otp`,
        { email, purpose: 'password_reset' },
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      // Move to OTP verification step
      setStep('verify');
      setCountdown(60);
      setCanResend(false);
    } catch (error: any) {
      setError(
        error.response?.data?.detail || 
        error.response?.data?.message || 
        'Failed to send verification code. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!otp.trim()) {
      setError('Please enter the verification code');
      setIsLoading(false);
      return;
    }

    try {
      // Verify the OTP
      const response = await axios.post(
        `${API_URL}/api/auth/verify-otp`,
        { email, otp_code: otp, purpose: 'password_reset' },
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      // Check for success in the response - could be success flag or success message
      const isSuccess = response.data?.message === "OTP verified successfully" || 
                         response.data?.success === true;

      // If verification is successful, move to reset password step
      if (isSuccess) {
        setStep('reset');
      } else {
        setError('Invalid verification code. Please try again.');
      }
    } catch (error: any) {
      console.error('OTP verification error:', error);
      setError(
        error.response?.data?.message || 
        error.response?.data?.detail || 
        'Failed to verify code. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Basic validation
    if (!password.trim()) {
      setError('Please enter a new password');
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      // Reset the password
      await axios.post(
        `${API_URL}/api/auth/reset-password`,
        { email, otp_code: otp, new_password: password },
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      // Redirect to login with success message
      navigate('/login', {
        state: {
          message: 'Your password has been reset successfully!',
          email: email
        }
      });
    } catch (error: any) {
      setError(
        error.response?.data?.detail || 
        error.response?.data?.message || 
        'Failed to reset password. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resend OTP
  const handleResendOtp = async () => {
    if (!canResend) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await axios.post(
        `${API_URL}/api/auth/request-otp`,
        { email, purpose: 'password_reset' },
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      setCountdown(60);
      setCanResend(false);
    } catch (error: any) {
      setError(
        error.response?.data?.detail || 
        error.response?.data?.message || 
        'Failed to resend verification code. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {step === 'email' ? 'Reset your password' : 
             step === 'verify' ? 'Verify your identity' : 
             'Create new password'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              sign in to your account
            </Link>
          </p>
        </div>
        
        <Card>
          {error && <ErrorAlert message={error} />}
          
          {step === 'email' && (
            <form className="p-6 space-y-6" onSubmit={handleEmailSubmit}>
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Enter your email address and we'll send you a verification code.
                </p>
                
                <Input
                  type="email"
                  id="email"
                  name="email"
                  label="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              
              <div>
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending...' : 'Send verification code'}
                </Button>
              </div>
              
              <div className="text-center">
                <Link to="/login" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                  Back to login
                </Link>
              </div>
            </form>
          )}
          
          {step === 'verify' && (
            <form className="p-6 space-y-6" onSubmit={handleVerifyOtp}>
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  We've sent a verification code to <span className="font-medium">{email}</span>. 
                  Please enter the code below to continue.
                </p>
                
                <Input
                  type="text"
                  id="otp"
                  name="otp"
                  label="Verification Code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                  required
                  autoComplete="one-time-code"
                  placeholder="Enter 6-digit code"
                />
              </div>
              
              <div>
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  disabled={isLoading}
                >
                  {isLoading ? 'Verifying...' : 'Verify code'}
                </Button>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Didn't receive the code?{' '}
                  {canResend ? (
                    <button
                      onClick={handleResendOtp}
                      type="button"
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
              
              <div className="text-center mt-4">
                <button
                  onClick={() => setStep('email')}
                  type="button"
                  className="text-sm text-gray-600 hover:text-gray-800 focus:outline-none"
                >
                  Back to email entry
                </button>
              </div>
            </form>
          )}
          
          {step === 'reset' && (
            <form className="p-6 space-y-6" onSubmit={handleResetPassword}>
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Create a new password for your account.
                </p>
                
                <div className="space-y-4">
                  <Input
                    type="password"
                    id="password"
                    name="password"
                    label="New Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  
                  <Input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    label="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>
              
              <div>
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  disabled={isLoading}
                >
                  {isLoading ? 'Updating...' : 'Reset Password'}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
