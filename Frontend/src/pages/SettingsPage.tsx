import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

interface SettingsPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  emailUpdates: boolean;
}

interface DisplaySettings {
  darkMode: boolean;
  compactView: boolean;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ user, onLogout }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    emailUpdates: false,
  });

  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>({
    darkMode: false,
    compactView: false,
  });

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

  const handleSaveSettings = () => {
    // TODO: Implement settings save functionality
    console.log('Settings saved:', { notificationSettings, displaySettings });
  };

  // Helper function to determine if a link is active
  const isActiveLink = (path: string) => {
    switch (path) {
      case '/dashboard':
        return currentPath === '/teacher/dashboard';
      case '/courses':
        return currentPath === '/teacher/courses';
      case '/subjects':
        return currentPath === '/teacher/subjects';
      case '/chapters':
        return currentPath === '/teacher/chapters';
      case '/topics':
        return currentPath === '/teacher/topics';
      case '/exams':
        return currentPath === '/teacher/exams';
      case '/questions':
        return currentPath === '/teacher/questions';
      case '/content':
        return currentPath === '/teacher/content';
      case '/profile':
        return currentPath === '/profile';
      case '/settings':
        return currentPath === '/settings';
      default:
        return false;
    }
  };

  // Sidebar content
  const sidebarContent = (
    <div className="space-y-6 py-6">
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Main
        </h3>
        <div className="mt-2 space-y-1">
          <Link 
            to="/teacher/dashboard" 
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/dashboard') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Dashboard
          </Link>
          <Link 
            to="/teacher/courses" 
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/courses') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Courses
          </Link>
          <Link 
            to="/teacher/subjects" 
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/subjects') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Subjects
          </Link>
          <Link 
            to="/teacher/chapters" 
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/chapters') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Chapters
          </Link>
          <Link 
            to="/teacher/topics" 
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/topics') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Topics
          </Link>
          <Link 
            to="/teacher/exams" 
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/exams') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Exams
          </Link>
          <Link 
            to="/teacher/questions" 
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/questions') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Questions
          </Link>
          <Link 
            to="/teacher/content" 
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/content') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Content
          </Link>
        </div>
      </div>
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Account
        </h3>
        <div className="mt-2 space-y-1">
          <Link 
            to="/profile" 
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/profile') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Profile
          </Link>
          <Link 
            to="/settings" 
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/settings') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Settings
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={sidebarContent}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

        <div className="space-y-6">
          {/* Notification Settings */}
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Notification Settings</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Email Notifications</h3>
                    <p className="text-sm text-gray-500">Receive notifications via email</p>
                  </div>
                  <button
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      notificationSettings.emailNotifications ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                    onClick={() => handleNotificationChange('emailNotifications')}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 ease-in-out ${
                        notificationSettings.emailNotifications ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Push Notifications</h3>
                    <p className="text-sm text-gray-500">Receive push notifications</p>
                  </div>
                  <button
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      notificationSettings.pushNotifications ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                    onClick={() => handleNotificationChange('pushNotifications')}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 ease-in-out ${
                        notificationSettings.pushNotifications ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Email Updates</h3>
                    <p className="text-sm text-gray-500">Receive updates about new features</p>
                  </div>
                  <button
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      notificationSettings.emailUpdates ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                    onClick={() => handleNotificationChange('emailUpdates')}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 ease-in-out ${
                        notificationSettings.emailUpdates ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {/* Display Settings */}
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Display Settings</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Dark Mode</h3>
                    <p className="text-sm text-gray-500">Use dark theme</p>
                  </div>
                  <button
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      displaySettings.darkMode ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                    onClick={() => handleDisplayChange('darkMode')}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 ease-in-out ${
                        displaySettings.darkMode ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Compact View</h3>
                    <p className="text-sm text-gray-500">Show more content in less space</p>
                  </div>
                  <button
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      displaySettings.compactView ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                    onClick={() => handleDisplayChange('compactView')}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 ease-in-out ${
                        displaySettings.compactView ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button variant="primary" onClick={handleSaveSettings}>
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default SettingsPage; 