import React, { useState, useEffect } from 'react';
import { MainLayout, AdminSidebar } from '../../components/layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import axios from 'axios';

interface AdminSettingsPageProps {
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

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  emailUpdates: boolean;
  systemAlerts: boolean;
}

interface DisplaySettings {
  darkMode: boolean;
  compactView: boolean;
  showMetrics: boolean;
}

interface SystemSettings {
  maintenanceMode: boolean;
  debugMode: boolean;
  allowNewRegistrations: boolean;
}

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

const AdminSettingsPage: React.FC<AdminSettingsPageProps> = ({ user, onLogout }) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    emailUpdates: false,
    systemAlerts: true
  });

  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>({
    darkMode: false,
    compactView: false,
    showMetrics: true
  });

  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    maintenanceMode: false,
    debugMode: false,
    allowNewRegistrations: true
  });

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

  const handleNotificationChange = (setting: keyof NotificationSettings) => {
    setNotificationSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const handleDisplayChange = (setting: keyof DisplaySettings) => {
    setDisplaySettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const handleSystemChange = (setting: keyof SystemSettings) => {
    setSystemSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

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
    
    setLoading(true);
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
      setLoading(false);
    }
  };

  const handleSaveSettings = () => {
    // TODO: Implement settings save functionality
    console.log('Settings saved:', {
      notificationSettings,
      displaySettings,
      systemSettings
    });
  };

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<AdminSidebar />}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Account</h1>
          <p className="text-gray-600">Edit your account settings and change your password here.</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 space-y-8">
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Email:</h2>
            <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-gray-600">
                Your email address is <span className="font-medium text-gray-900">{userData?.email}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handlePasswordUpdate} className="space-y-6">
            <div>
              <label className="block text-lg font-medium text-gray-900 mb-2">
                Current password
              </label>
              <input
                type="password"
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-lg font-medium text-gray-900 mb-2">
                New password
              </label>
              <input
                type="password"
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter new password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-lg font-medium text-gray-900 mb-2">
                Confirm new password
              </label>
              <input
                type="password"
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                placeholder="Re-type new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border-l-4 border-red-400 p-4 rounded">
                {error}
              </div>
            )}

            {success && (
              <div className="text-sm text-green-600 bg-green-50 border-l-4 border-green-400 p-4 rounded">
                {success}
              </div>
            )}

            <button
              type="submit"
              className="w-auto px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Change password'}
            </button>
          </form>
        </div>
      </div>
    </MainLayout>
  );
};

export default AdminSettingsPage; 