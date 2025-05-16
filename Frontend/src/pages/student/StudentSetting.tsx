import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import MainLayout from '../../components/layout/MainLayout';
import StudentSidebar from './components/StudentSidebar';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

interface StudentSettingProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

interface UserData {
  email: string;
  [key: string]: any;
}

const StudentSetting: React.FC<StudentSettingProps> = ({ user, onLogout }) => {
  const location = useLocation();
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setUserData(response.data);
      } catch (err: any) {
        console.error('Failed to fetch user data:', err);
        setError('Failed to load user data. Please try again later.');
      }
    };

    fetchUserData();
  }, []);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.email) {
      setError('Email is required to update password');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    setIsLoading(true);
    setSuccess(null);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/users/update-password`, 
        {
          email: userData.email,
          current_password: currentPassword,
          new_password: newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Failed to update password. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<StudentSidebar />}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Account</h1>
          <p className="text-gray-600 mt-2">Edit your account settings and change your password here.</p>
        </div>

        <div className="bg-white rounded-lg p-8">
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Email:</h2>
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
              <p className="text-gray-600">
                Your email address is <span className="font-medium text-gray-900">{userData?.email}</span>
              </p>
            </div>
          </div>

          <form onSubmit={handlePasswordUpdate} className="space-y-6">
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-2">
                Current password
              </label>
              <input
                type="password"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-2">
                New password
              </label>
              <input
                type="password"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-2">
                Confirm new password
              </label>
              <input
                type="password"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Re-type new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-auto px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Updating...' : 'Change password'}
              </button>
            </div>
            {error && (
              <div className="mt-2 text-sm text-red-600">
                {error}
              </div>
            )}
            {success && (
              <div className="mt-2 text-sm text-green-600">
                {success}
              </div>
            )}
          </form>
        </div>
      </div>
    </MainLayout>
  );
};

export default StudentSetting; 