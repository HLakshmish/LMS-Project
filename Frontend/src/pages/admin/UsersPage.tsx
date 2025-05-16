import React, { useState, useEffect } from 'react';
import axios, { AxiosError } from 'axios';
import { MainLayout, AdminSidebar } from '../../components/layout';
import '../../styles/AdminPages.css';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  full_name: string;
  created_at: string;
  updated_at: string | null;
}

interface UsersPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

const UsersPage: React.FC<UsersPageProps> = ({ user, onLogout }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'teacher',
    full_name: '',
  });
  const [message, setMessage] = useState({ text: '', type: '' });
  const [validationErrors, setValidationErrors] = useState({
    username: '',
    email: '',
    password: '',
    full_name: ''
  });
  const [isValidating, setIsValidating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 5;

  // Get the token from localStorage
  const getAuthToken = () => {
    return localStorage.getItem('token');
  };

  // Configure axios with authentication header
  const axiosConfig = () => {
    const token = getAuthToken();
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/users/`, axiosConfig());
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      if ((error as AxiosError)?.response?.status === 401) {
        setMessage({ text: 'Please login again to continue', type: 'error' });
      } else {
        setMessage({ text: 'Error fetching users', type: 'error' });
      }
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const validateUsername = async (username: string) => {
    if (!username) return 'Username is required';
    if (username.length < 3) return 'Username must be at least 3 characters';
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers, and underscores';
    
    // Check if username exists (only for new users or if username changed)
    if (!selectedUser || selectedUser.username !== username) {
      try {
        const response = await axios.get(`${API_URL}/api/users/check-username/${username}/`, axiosConfig());
        if (response.data.exists) {
          return 'This username is already taken';
        }
      } catch (error) {
        console.error('Error checking username:', error);
      }
    }
    return '';
  };

  const validateEmail = async (email: string) => {
    if (!email) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Invalid email format';
    
    // Check if email exists (only for new users or if email changed)
    if (!selectedUser || selectedUser.email !== email) {
      try {
        const response = await axios.get(`${API_URL}/api/users/check-email/${email}/`, axiosConfig());
        if (response.data.exists) {
          return 'This email is already registered';
        }
      } catch (error) {
        console.error('Error checking email:', error);
      }
    }
    return '';
  };

  const validatePassword = (password: string) => {
    if (!selectedUser && !password) return 'Password is required';
    if (password && password.length < 8) return 'Password must be at least 8 characters';
    return '';
  };

  const validateFullName = (fullName: string) => {
    if (!fullName) return 'Full name is required';
    if (fullName.length < 2) return 'Full name must be at least 2 characters';
    if (!/^[a-zA-Z ]+$/.test(fullName)) return 'Full name can only contain letters and spaces';
    return '';
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear the specific validation error when user starts typing
    setValidationErrors(prev => ({ ...prev, [name]: '' }));

    // Don't validate on every keystroke for username and email
    if ((name === 'username' || name === 'email') && value.length < 3) return;

    setIsValidating(true);
    let error = '';

    switch (name) {
      case 'username':
        error = await validateUsername(value);
        break;
      case 'email':
        error = await validateEmail(value);
        break;
      case 'password':
        error = validatePassword(value);
        break;
      case 'full_name':
        error = validateFullName(value);
        break;
    }

    setValidationErrors(prev => ({ ...prev, [name]: error }));
    setIsValidating(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsValidating(true);

    // Validate all fields
    const errors = {
      username: await validateUsername(formData.username),
      email: await validateEmail(formData.email),
      password: validatePassword(formData.password),
      full_name: validateFullName(formData.full_name)
    };

    setValidationErrors(errors);

    // Check if there are any validation errors
    if (Object.values(errors).some(error => error !== '')) {
      setIsValidating(false);
      return;
    }

    try {
      if (selectedUser) {
        await axios.put(
            `${API_URL}/api/users/${selectedUser.id}/`, 
          formData,
          axiosConfig()
        );
        setMessage({ text: 'User updated successfully', type: 'success' });
      } else {
        await axios.post(
            `${API_URL}/api/users/`, 
          formData,
          axiosConfig()
        );
        setMessage({ text: 'User created successfully', type: 'success' });
      }
      setOpenDialog(false);
      fetchUsers();
      resetForm();
    } catch (error: any) {
      console.error('Error saving user:', error);
      if (error.response?.status === 401) {
        setMessage({ text: 'Please login again to continue', type: 'error' });
      } else if (error.response?.data?.detail) {
        setMessage({ text: error.response.data.detail, type: 'error' });
      } else {
        setMessage({ text: 'Error saving user', type: 'error' });
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleDelete = async (userId: number) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await axios.delete(
            `${API_URL}/api/users/${userId}/`,
          axiosConfig()
        );
        setMessage({ text: 'User deleted successfully', type: 'success' });
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        if ((error as AxiosError)?.response?.status === 401) {
          setMessage({ text: 'Please login again to continue', type: 'error' });
        } else {
          setMessage({ text: 'Error deleting user', type: 'error' });
        }
      }
    }
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      role: user.role,
      full_name: user.full_name,
    });
    setOpenDialog(true);
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      role: 'teacher',
      full_name: '',
    });
    setSelectedUser(null);
  };

  // Calculate pagination values
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(users.length / usersPerPage);

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<AdminSidebar />}>
      <div className="flex flex-col h-full bg-gray-50">
        {/* Header Section */}
        <div className="mb-8 bg-blue-500 rounded-lg shadow-md p-6 mx-8 mt-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-white">User Management</h1>
            <p className="text-blue-100">Manage and monitor user accounts</p>
          </div>
        </div>

        {/* Global Error/Success Message */}
        {message.text && (
          <div className={`mx-8 mb-4 p-4 rounded-md relative ${
            message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}>
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium">{message.text}</p>
              <button
                onClick={() => setMessage({ text: '', type: '' })}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 px-8 pb-6 overflow-hidden">
          <div className="max-w-7xl mx-auto">
            {/* Action Button */}
            <div className="mb-6 flex justify-end">
              <button 
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                onClick={() => setOpenDialog(true)}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add New User
              </button>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {currentUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                          ${user.role === 'admin' ? 'bg-blue-100 text-blue-800' : 
                            user.role === 'teacher' ? 'bg-green-100 text-green-800' : 
                            'bg-yellow-100 text-yellow-800'}`}>
                          {user.role}
                        </span>
                      </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.full_name}
                      </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-3">
                          <button
                            onClick={() => handleEdit(user)}
                              className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                              <svg className="h-3.5 w-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                              className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                              <svg className="h-3.5 w-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                      currentPage === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                      currentPage === totalPages
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{indexOfFirstUser + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(indexOfLastUser, users.length)}
                      </span>{' '}
                      of <span className="font-medium">{users.length}</span> users
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${
                          currentPage === 1
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <span className="sr-only">Previous</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      {[...Array(totalPages)].map((_, index) => (
                        <button
                          key={index + 1}
                          onClick={() => setCurrentPage(index + 1)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === index + 1
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {index + 1}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 text-sm font-medium ${
                          currentPage === totalPages
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <span className="sr-only">Next</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal/Dialog */}
        {openDialog && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-visible shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6 relative">
                {/* Close button */}
                <button
                  onClick={() => {
                    setOpenDialog(false);
                    resetForm();
                  }}
                  className="absolute top-0 right-0 -mt-4 -mr-4 p-2 rounded-full bg-white shadow-lg text-gray-600 hover:text-gray-800 focus:outline-none"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div>
                  <div className="mt-3 text-center sm:mt-0 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      {selectedUser ? 'Edit User' : 'Create New User'}
                    </h3>

                    {/* Form Error Message */}
                    {message.text && message.type === 'error' && (
                      <div className="mb-4 p-4 rounded-md bg-red-50 border border-red-200">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-red-700">{message.text}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-4">
                        {/* Full Name Field */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Full Name
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              name="full_name"
                              value={formData.full_name}
                              onChange={handleInputChange}
                              className={`block w-full rounded-md shadow-sm text-sm
                                ${validationErrors.full_name 
                                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                              required
                            />
                            {validationErrors.full_name && (
                              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                          {validationErrors.full_name && (
                            <p className="mt-1 text-sm text-red-600">{validationErrors.full_name}</p>
                          )}
                        </div>

                        {/* Username Field */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Username
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              name="username"
                              value={formData.username}
                              onChange={handleInputChange}
                              className={`block w-full rounded-md shadow-sm text-sm
                                ${validationErrors.username 
                                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                              required
                            />
                            {validationErrors.username && (
                              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                          {validationErrors.username && (
                            <p className="mt-1 text-sm text-red-600">{validationErrors.username}</p>
                          )}
                        </div>

                        {/* Email Field */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                          </label>
                          <div className="relative">
                            <input
                              type="email"
                              name="email"
                              value={formData.email}
                              onChange={handleInputChange}
                              className={`block w-full rounded-md shadow-sm text-sm
                                ${validationErrors.email 
                                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                              required
                            />
                            {validationErrors.email && (
                              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                          {validationErrors.email && (
                            <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
                          )}
                        </div>

                        {/* Password Field */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Password {selectedUser && <span className="text-sm text-gray-500">(Leave blank to keep current)</span>}
                          </label>
                          <div className="relative">
                            <input
                              type="password"
                              name="password"
                              value={formData.password}
                              onChange={handleInputChange}
                              className={`block w-full rounded-md shadow-sm text-sm
                                ${validationErrors.password 
                                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                              required={!selectedUser}
                            />
                            {validationErrors.password && (
                              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                          {validationErrors.password && (
                            <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
                          )}
                        </div>

                        {/* Role Field */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                          <select
                            name="role"
                            value={formData.role}
                            onChange={handleInputChange}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                          >
                            <option value="teacher">Teacher</option>
                            <option value="student">Student</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                      </div>

                      {/* Form Actions */}
                      <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3">
                        <button
                          type="submit"
                          disabled={isValidating || Object.values(validationErrors).some(error => error !== '')}
                          className={`inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 text-sm font-medium text-white 
                            ${isValidating || Object.values(validationErrors).some(error => error !== '')
                              ? 'bg-blue-300 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'}`}
                        >
                          {isValidating ? 'Validating...' : selectedUser ? 'Update User' : 'Create User'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenDialog(false);
                            resetForm();
                          }}
                          className="mt-3 sm:mt-0 inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default UsersPage; 