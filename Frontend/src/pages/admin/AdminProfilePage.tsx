import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/ui/Card';
import { MainLayout, AdminSidebar } from '../../components/layout';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

interface AdminProfilePageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

const AdminProfilePage: React.FC<AdminProfilePageProps> = ({ user: propUser, onLogout }) => {
  const { user, isLoading: authLoading } = useAuth();
  const [userData, setUserData] = useState<any>(null);

  const displayName = userData?.full_name || user?.name || user?.username || user?.email || 'Admin';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setUserData(response.data);
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    };

    fetchUserData();
  }, []);

  // Password change state
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-dismiss success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Format date helpers
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  const formatDateTime = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleChangePasswordClick = () => {
    setShowPasswordFields(true);
    setSuccess(null);
    setError(null);
    setCurrentPassword('');
    setNewPassword('');
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);
    try {
      await axios.post(`${API_URL}/api/users/update-password`, {
        email: user?.email,
        current_password: currentPassword,
        new_password: newPassword,
      });
      setSuccess('Password updated successfully.');
      setShowPasswordFields(false);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Failed to update password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>;
  }

  if (!user) {
    return <div className="flex justify-center items-center h-full">Please login to view your profile.</div>;
  }

  return (
    <MainLayout
      user={{
        name: displayName,
        role: user?.role || 'admin',
        avatar: user?.avatar
      }}
      onLogout={onLogout}
      sidebarContent={<AdminSidebar />}
    >
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
            <h1 className="text-2xl font-bold text-gray-900">Your Profile</h1>
            <p className="text-gray-500 mt-1">Manage your account information and settings</p>
          </div>

          {/* Avatar and Basic Info */}
          <Card>
            <div className="flex flex-col items-center p-8">
              <div className="w-32 h-32 rounded-full bg-blue-100 flex items-center justify-center text-5xl text-blue-500 mb-6">
                {user.avatar ? (
                  <img src={user.avatar} alt="Profile" className="w-full h-full object-cover rounded-full" />
                ) : (
                  avatarLetter
                )}
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{displayName}</h2>
              <p className="text-gray-500 capitalize mt-1">{user.role || 'Admin'}</p>
            </div>
          </Card>

          {/* Personal Information */}
          <Card title="Personal Information">
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="border-b pb-4">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Full Name</label>
                  <p className="text-lg text-gray-900">{userData?.full_name || '-'}</p>
                </div>
                <div className="border-b pb-4">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Username</label>
                  <p className="text-lg text-gray-900">{user?.username || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Email Address</label>
                  <p className="text-lg text-gray-900">{user?.email || '-'}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Password Section */}
          <Card title="Security Settings">
            <div className="p-6">
              {success && (
                <div className="mb-6 bg-green-50 border-l-4 border-green-400 p-4 rounded">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-green-700">{success}</p>
                    </div>
                  </div>
                </div>
              )}

              {!showPasswordFields ? (
                <button
                  className="inline-flex items-center px-4 py-2 border border-blue-500 text-blue-600 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  onClick={handleChangePasswordClick}
                  type="button"
                >
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Change Password
                </button>
              ) : (
                <form className="space-y-4" onSubmit={handlePasswordUpdate}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="Enter your current password"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="Enter your new password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  {error && (
                    <div className="text-sm text-red-600 bg-red-50 border-l-4 border-red-400 p-4 rounded">
                      {error}
                    </div>
                  )}
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                      onClick={() => {
                        setShowPasswordFields(false);
                        setCurrentPassword('');
                        setNewPassword('');
                        setError(null);
                      }}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
                      disabled={loading}
                    >
                      {loading ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </Card>

          {/* Account Information */}
          <Card title="Account Details">
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="border-b pb-4">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Account Role</label>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 capitalize">
                    {user.role || 'Admin'}
                  </span>
                </div>
                <div className="border-b pb-4">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Account Created</label>
                  <p className="text-lg text-gray-900">{formatDate((user as any).createdAt || (user as any).created_at || '')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Last Login</label>
                  <p className="text-lg text-gray-900">{formatDateTime((user as any).lastLogin || (user as any).last_login || '')}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default AdminProfilePage; 