import React, { useEffect, useState } from 'react';
import MainLayout from '../../../components/layout/MainLayout';
import AdminSidebar from '../AdminSidebar';
import axios from 'axios';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

interface Creator {
  email: string;
  username: string;
  role: string;
  id: number;
  created_at: string;
  updated_at: string | null;
}

interface Course {
  id: number;
  name: string;
  description: string;
  duration: number;
  is_active: boolean;
  stream_id: number;
  subject_id: number;
  chapter_id: number;
  topic_id: number;
  level: string;
  created_by: number;
  created_at: string;
  updated_at: string | null;
  creator: Creator;
}

interface Package {
  id: number;
  name: string;
  description: string;
  created_by: number;
  created_at: string;
  updated_at: string | null;
  creator: Creator;
  courses: Course[];
}

interface PackageFormData {
  name: string;
  description: string;
  course_ids: number[];
}

const PackagePage: React.FC<{ user: any; onLogout: () => void }> = ({ user, onLogout }) => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [formData, setFormData] = useState<PackageFormData>({
    name: '',
    description: '',
    course_ids: []
  });

  useEffect(() => {
    fetchPackages();
    fetchAvailableCourses();
  }, []);

  const fetchPackages = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        setLoading(false);
        return;
      }
      const response = await axios.get(`${API_URL}/api/packages/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      setPackages(response.data);
    } catch (err) {
      console.error('Error fetching packages:', err);
      setError('Failed to fetch packages');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await axios.get(`${API_URL}/api/courses/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      setAvailableCourses(response.data);
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  };

  const handleCreatePackage = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      // Prepare the data for API submission
      const packageData = {
        name: formData.name,
        description: formData.description,
        course_ids: formData.course_ids
      };
      
        await axios.post(`${API_URL}/api/packages/`, packageData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      setShowCreateModal(false);
      setFormData({ name: '', description: '', course_ids: [] });
      fetchPackages();
    } catch (err) {
      console.error('Error creating package:', err);
      setError('Failed to create package');
    }
  };

  const handleEditPackage = async () => {
    if (!selectedPackage) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      // Prepare the data for API submission
      const packageData = {
        name: formData.name,
        description: formData.description,
        course_ids: formData.course_ids
      };
      
      await axios.put(`${API_URL}/api/packages/${selectedPackage.id}`, packageData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      setShowEditModal(false);
      setSelectedPackage(null);
      setFormData({ name: '', description: '', course_ids: [] });
      fetchPackages();
    } catch (err) {
      console.error('Error updating package:', err);
      setError('Failed to update package');
    }
  };

  const handleDeletePackage = async (packageId: number) => {
    if (!window.confirm('Are you sure you want to delete this package?')) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      await axios.delete(`${API_URL}/api/packages/${packageId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      fetchPackages();
    } catch (err) {
      console.error('Error deleting package:', err);
      setError('Failed to delete package');
    }
  };

  const openEditModal = (pkg: Package) => {
    setSelectedPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description,
      course_ids: pkg.courses.map(course => course.id)
    });
    setShowEditModal(true);
  };

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<AdminSidebar />}>
      <div className="min-h-screen" style={{ backgroundColor: '#f8fafc' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8 bg-blue-500 p-4 rounded-lg shadow-md">
            <div className="flex items-center">
              <div className="mr-4 bg-gradient-to-br from-blue-600 to-indigo-700 p-3 rounded-lg shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                  <path d="M12 12 4.5 6.5"></path>
                  <path d="M19.5 6.5 12 12"></path>
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Packages</h1>
                <p className="text-blue-100 text-sm mt-1">Manage your educational packages</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-white text-blue-600 px-4 py-2 rounded-md shadow-sm hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-white transition-colors duration-150 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Create New Package
            </button>
          </div>

          {loading && (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}
          
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-sm">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            </div>
          )}
          
          {!loading && !error && packages.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <h2 className="text-xl font-medium text-gray-700 mb-2">No packages available</h2>
              <p className="text-gray-500 mb-6">Create your first package by clicking the button above.</p>
            </div>
          )}
          
          {!loading && !error && packages.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {packages.map(pkg => (
                <div key={pkg.id} className="bg-white rounded-lg shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
                  <div className="p-5 border-b border-gray-100">
                    <div className="flex justify-between items-start">
                      <div className="flex">
                        <div className="mr-3 flex-shrink-0 bg-blue-50 p-2 rounded-md">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                          </svg>
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold text-gray-800 mb-1">{pkg.name}</h2>
                          <p className="text-gray-600">{pkg.description}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                      <button
                        onClick={() => openEditModal(pkg)}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50 transition-colors"
                          title="Edit package"
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                      </button>
                      <button
                        onClick={() => handleDeletePackage(pkg.id)}
                          className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50 transition-colors"
                          title="Delete package"
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                      </button>
                      </div>
                    </div>
                    <div className="flex items-center text-xs text-gray-500 mt-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {pkg.creator?.username}
                      <span className="mx-2">•</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {new Date(pkg.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-medium text-gray-800 mb-3 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      Courses <span className="ml-2 text-xs bg-blue-100 text-blue-800 py-1 px-2 rounded-full">{pkg.courses.length}</span>
                    </h3>
                    
                    {pkg.courses.length === 0 ? (
                      <div className="text-gray-400 text-sm italic">No courses in this package.</div>
                    ) : (
                      <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {pkg.courses.map(course => (
                          <div key={course.id} className="flex bg-gray-50 rounded-md p-3">
                            <div className="mr-3 flex-shrink-0 bg-indigo-50 p-2 rounded-md">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                              </svg>
                            </div>
                            <div>
                              <div className="font-medium text-gray-800">{course.name}</div>
                              <div className="text-sm text-gray-500 line-clamp-2">{course.description}</div>
                              <div className="mt-1 flex space-x-3">
                                <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                                  {course.level}
                                </span>
                                <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded bg-green-100 text-green-800">
                                  {course.duration} months
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Package Modal with improved UI */}
          {showCreateModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-70 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-[550px] max-h-[90vh] overflow-hidden">
            <div className="bg-blue-50 py-4 px-6 border-b border-blue-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-blue-800">Create New Package</h2>
              <button 
                onClick={() => {
                  setShowCreateModal(false);
                  setFormData({ name: '', description: '', course_ids: [] });
                }}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 overflow-y-auto max-h-[calc(90vh-110px)]">
              <div className="space-y-5">
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Package Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter package name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter package description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">Available Courses</label>
                    <div className="text-sm flex items-center">
                      <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full mr-2">
                        {formData.course_ids.length} selected
                      </span>
                      {formData.course_ids.length > 0 && (
                            <button 
                              type="button"
                              onClick={() => setFormData({ ...formData, course_ids: [] })}
                          className="text-xs text-red-600 hover:text-red-800 flex items-center"
                            >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          Clear
                            </button>
                      )}
                    </div>
                  </div>
                  <div className="border border-gray-300 rounded-md overflow-hidden shadow-sm">
                    {availableCourses.length === 0 ? (
                      <div className="p-4 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-gray-500 text-sm">No courses available</p>
                      </div>
                    ) : (
                      <div className="max-h-[280px] overflow-y-auto">
                        <div className="sticky top-0 bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Select courses to include in this package
                          </div>
                        <div className="divide-y divide-gray-200">
                          {availableCourses.map(course => (
                            <div key={course.id} className={`flex items-start px-4 py-3 hover:bg-gray-50 ${formData.course_ids.includes(course.id) ? 'bg-blue-50' : ''}`}>
                              <input
                                type="checkbox"
                                id={`create-course-${course.id}`}
                                checked={formData.course_ids.includes(course.id)}
                                onChange={(e) => {
                                  const newCourseIds = e.target.checked 
                                    ? [...formData.course_ids, course.id]
                                    : formData.course_ids.filter(id => id !== course.id);
                                  setFormData({ ...formData, course_ids: newCourseIds });
                                }}
                                className="h-4 w-4 mt-1 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                              />
                              <label htmlFor={`create-course-${course.id}`} className="ml-3 block cursor-pointer flex-1">
                                <div className="font-medium text-gray-800">{course.name}</div>
                                <div className="text-sm text-gray-500 line-clamp-2 mt-0.5">{course.description}</div>
                                <div className="mt-1.5 flex flex-wrap gap-2">
                                  <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                                    {course.level}
                                  </span>
                                  <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                    {course.duration} months
                                  </span>
                                </div>
                              </label>
                            </div>
                          ))}
                        </div>
                        </div>
                      )}
                    </div>
                  </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end border-t border-gray-200">
              <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        setShowCreateModal(false);
                        setFormData({ name: '', description: '', course_ids: [] });
                      }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreatePackage}
                      disabled={!formData.name || formData.course_ids.length === 0}
                  className={`flex items-center px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                        !formData.name || formData.course_ids.length === 0 
                        ? 'bg-blue-300 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Create Package
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

      {/* Edit Package Modal with improved UI */}
          {showEditModal && selectedPackage && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-70 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-[550px] max-h-[90vh] overflow-hidden">
            <div className="bg-indigo-50 py-4 px-6 border-b border-indigo-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-indigo-800">Edit Package</h2>
              <button 
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedPackage(null);
                  setFormData({ name: '', description: '', course_ids: [] });
                }}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 overflow-y-auto max-h-[calc(90vh-110px)]">
              <div className="space-y-5">
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Package Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter package name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter package description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">Available Courses</label>
                    <div className="text-sm flex items-center">
                      <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full mr-2">
                        {formData.course_ids.length} selected
                      </span>
                      {formData.course_ids.length > 0 && (
                            <button 
                              type="button"
                              onClick={() => setFormData({ ...formData, course_ids: [] })}
                          className="text-xs text-red-600 hover:text-red-800 flex items-center"
                            >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          Clear
                            </button>
                      )}
                    </div>
                  </div>
                  <div className="border border-gray-300 rounded-md overflow-hidden shadow-sm">
                    {availableCourses.length === 0 ? (
                      <div className="p-4 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-gray-500 text-sm">No courses available</p>
                      </div>
                    ) : (
                      <div className="max-h-[280px] overflow-y-auto">
                        <div className="sticky top-0 bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Select courses to include in this package
                          </div>
                        <div className="divide-y divide-gray-200">
                          {availableCourses.map(course => (
                            <div key={course.id} className={`flex items-start px-4 py-3 hover:bg-gray-50 ${formData.course_ids.includes(course.id) ? 'bg-indigo-50' : ''}`}>
                              <input
                                type="checkbox"
                                id={`edit-course-${course.id}`}
                                checked={formData.course_ids.includes(course.id)}
                                onChange={(e) => {
                                  const newCourseIds = e.target.checked 
                                    ? [...formData.course_ids, course.id]
                                    : formData.course_ids.filter(id => id !== course.id);
                                  setFormData({ ...formData, course_ids: newCourseIds });
                                }}
                                className="h-4 w-4 mt-1 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                              />
                              <label htmlFor={`edit-course-${course.id}`} className="ml-3 block cursor-pointer flex-1">
                                <div className="font-medium text-gray-800">{course.name}</div>
                                <div className="text-sm text-gray-500 line-clamp-2 mt-0.5">{course.description}</div>
                                <div className="mt-1.5 flex flex-wrap gap-2">
                                  <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                                    {course.level}
                                  </span>
                                  <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                    {course.duration} months
                                  </span>
                                </div>
                              </label>
                            </div>
                          ))}
                        </div>
                        </div>
                      )}
                    </div>
                  </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end border-t border-gray-200">
              <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        setShowEditModal(false);
                    setSelectedPackage(null);
                        setFormData({ name: '', description: '', course_ids: [] });
                      }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleEditPackage}
                      disabled={!formData.name || formData.course_ids.length === 0}
                  className={`flex items-center px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                        !formData.name || formData.course_ids.length === 0 
                    ? 'bg-indigo-300 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                    >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
    </MainLayout>
  );
};

export default PackagePage; 