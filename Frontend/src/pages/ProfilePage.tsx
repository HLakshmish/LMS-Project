import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import Card from '../components/ui/Card';
import { Form, FormField } from '../components/ui/Form';
import Button from '../components/ui/Button';
import ErrorAlert from '../components/ui/ErrorAlert';
import { z } from 'zod';
import apiService from '../services/api';
import MainLayout from '../components/layout/MainLayout';
import DashboardStats from '../components/dashboard/DashboardStats';
const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Please enter a valid email address'),
  // Password is optional for profile updates
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  avatar: z.string().optional().or(z.literal(''))
});

const ProfilePage: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // For profile image upload
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  useEffect(() => {
    // Set avatar preview from user data if available
    if (user?.avatar) {
      setAvatarPreview(user.avatar);
    }
  }, [user]);
  
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleProfileUpdate = async (values: any) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // In a real implementation, you would send the updated profile data to your API
      // For example: await apiService.users.updateProfile(values, avatarFile);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess('Profile updated successfully');
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper function to determine if a link is active
  const isActiveLink = (path: string) => {
    if (path === '/dashboard') {
      return currentPath === '/teacher/dashboard';
    }
    return currentPath.startsWith(path);
  };

  // Sidebar content
  const sidebarContent = (
    <div className="space-y-6">
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
            to="/courses" 
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/courses') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Courses
          </Link>
          <Link 
            to="/exams" 
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/exams') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Exams
          </Link>
          <Link 
            to="/questions" 
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/questions') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Questions
          </Link>
          <Link 
            to="/content" 
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
          Reports
        </h3>
        <div className="mt-2 space-y-1">
          <Link 
            to="/reports/students" 
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/reports/students') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Student Performance
          </Link>
          <Link 
            to="/reports/exams" 
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              isActiveLink('/reports/exams') 
                ? 'text-white bg-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Exam Analytics
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

  if (authLoading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>;
  }
  
  if (!user) {
    return <div className="flex justify-center items-center h-full">Please login to view your profile.</div>;
  }
  
  // Get display name with fallback
  const displayName = user?.name || user?.username || user?.email || 'User';
  
  // Role-specific content
  const renderRoleSpecificContent = () => {
    switch (user.role) {
      case 'student':
        return (
          
          <Card title="Student Information" className="mb-6">
            <p className="text-gray-600 mb-4">View your course progress, upcoming exams, and subscriptions.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Current Courses</h4>
                <p className="text-blue-700">You're enrolled in 3 active courses</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">Upcoming Exams</h4>
                <p className="text-green-700">You have 2 exams scheduled this week</p>
              </div>
            </div>
          </Card>
        );
      
      case 'teacher':
        return (
          <Card title="Teacher Dashboard" className="mb-6">
            <p className="text-gray-600 mb-4">Manage your courses, students, and create assessments.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-medium text-purple-800 mb-2">Your Courses</h4>
                <p className="text-purple-700">You're teaching 4 active courses</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">Student Assessments</h4>
                <p className="text-yellow-700">You have 15 assessments to grade</p>
              </div>
            </div>
          </Card>
        );
      
      case 'admin':
      case 'superadmin':
        return (
          <Card title="Admin Dashboard" className="mb-6">
            <p className="text-gray-600 mb-4">Manage users, courses, and system settings.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-red-50 p-4 rounded-lg">
                <h4 className="font-medium text-red-800 mb-2">User Management</h4>
                <p className="text-red-700">Total users: 250</p>
              </div>
              <div className="bg-indigo-50 p-4 rounded-lg">
                <h4 className="font-medium text-indigo-800 mb-2">Content Statistics</h4>
                <p className="text-indigo-700">45 courses, 120 subjects</p>
              </div>
            </div>
          </Card>
        );
      
      default:
        return null;
    }
  };

  return (
    <MainLayout 
      user={{
        name: displayName,
        role: user?.role || 'user',
        avatar: user?.avatar
      }}
      onLogout={() => {}} 
      sidebarContent={sidebarContent}
    >
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8">Your Profile</h1>
        
        {renderRoleSpecificContent()}
        
        {/* User Profile Section */}
        <Card title="Profile Information">
          {error && <ErrorAlert message={error} />}
          {success && (
            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Profile Image Column */}
            <div className="flex flex-col items-center justify-start">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 mb-4">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-blue-50">
                    <span className="text-4xl text-blue-500">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="w-full">
                <input
                  type="file"
                  id="avatar"
                  className="hidden"
                  accept="image/*"
                  onChange={handleAvatarChange}
                />
                <label
                  htmlFor="avatar"
                  className="block w-full text-center py-2 px-4 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-white hover:bg-blue-50 cursor-pointer"
                >
                  Change Photo
                </label>
              </div>
              
              <div className="mt-4 text-center">
                <p className="font-medium text-gray-900">{displayName}</p>
                <p className="text-sm text-gray-500 capitalize">{user.role || 'User'}</p>
              </div>
            </div>
            
            {/* Profile Form Column */}
            <div className="md:col-span-2">
              <Form
                initialValues={{
                  name: user.name || '',
                  username: user.username || '',
                  email: user.email || '',
                  password: '',
                  avatar: user.avatar || ''
                }}
                validationSchema={profileSchema}
                onSubmit={handleProfileUpdate}
                submitButtonText="Update Profile"
                isSubmitting={isLoading}
                className="space-y-4"
              >
                {({ values, errors, handleChange, FormField }) => (
                  <>
                    <FormField
                      label="Full Name"
                      name="name"
                      value={values.name}
                      onChange={handleChange}
                      error={errors?.name}
                      required
                    />
                    
                    <FormField
                      label="Username"
                      name="username"
                      value={values.username}
                      onChange={handleChange}
                      error={errors?.username}
                      required
                    />
                    
                    <FormField
                      label="Email"
                      name="email"
                      type="email"
                      value={values.email}
                      onChange={handleChange}
                      error={errors?.email}
                      required
                    />
                    
                    <FormField
                      label="Password (leave blank to keep current)"
                      name="password"
                      type="password"
                      value={values.password}
                      onChange={handleChange}
                      error={errors?.password}
                      placeholder="••••••••"
                    />
                  </>
                )}
              </Form>
            </div>
          </div>
        </Card>
        
        {/* Account Information */}
        <Card title="Account Information" className="mt-6">
          <div className="space-y-4">
            <div className="border-b pb-4">
              <p className="text-sm text-gray-500 mb-1">Account ID</p>
              <p className="font-medium">{user.id || 'N/A'}</p>
            </div>
            
            <div className="border-b pb-4">
              <p className="text-sm text-gray-500 mb-1">Role</p>
              <div className="flex items-center">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                  {user.role || 'User'}
                </span>
              </div>
            </div>
            
            <div className="border-b pb-4">
              <p className="text-sm text-gray-500 mb-1">Account Created</p>
              <p className="font-medium">January 15, 2023</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500 mb-1">Last Login</p>
              <p className="font-medium">Today, 10:30 AM</p>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
};

export default ProfilePage; 