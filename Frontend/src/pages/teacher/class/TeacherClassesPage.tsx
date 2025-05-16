import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MainLayout } from '../../../components/layout';
import TeacherSidebar from '../sidebar/TeacherSidebar';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
interface Class {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string | null;
}

interface TeacherClassesPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

const TeacherClassesPage: React.FC<TeacherClassesPageProps> = ({ user, onLogout }) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [message, setMessage] = useState({ text: '', type: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

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

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/classes/`, axiosConfig());
      setClasses(response.data);
      setMessage({ text: '', type: '' });
    } catch (error) {
      setMessage({ text: 'Failed to fetch classes', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (selectedClass) {
        await axios.put(
          `${API_URL}/api/classes/${selectedClass.id}/`,
          formData,
          axiosConfig()
        );
        setMessage({ text: 'Class updated successfully', type: 'success' });
      } else {
        await axios.post(
          `${API_URL}/api/classes/`,
          formData,
          axiosConfig()
        );
        setMessage({ text: 'Class created successfully', type: 'success' });
      }
      setOpenDialog(false);
      fetchClasses();
      resetForm();
    } catch (error) {
      setMessage({ text: 'Failed to save class', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (classId: number) => {
    if (window.confirm('Are you sure you want to delete this class?')) {
      try {
        setLoading(true);
        await axios.delete(
          `${API_URL}/api/classes/${classId}/`,
          axiosConfig()
        );
        setMessage({ text: 'Class deleted successfully', type: 'success' });
        fetchClasses();
      } catch (error) {
        setMessage({ text: 'Failed to delete class', type: 'error' });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEdit = (cls: Class) => {
    setSelectedClass(cls);
    setFormData({
      name: cls.name,
      description: cls.description
    });
    setOpenDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: ''
    });
    setSelectedClass(null);
  };

  const filteredClasses = classes.filter(cls => {
    if (searchTerm) {
      return cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             cls.description.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<TeacherSidebar />}>
      <div className="flex flex-col h-full bg-gray-50">
        {/* Header Section */}
        <div className="p-6 bg-white border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
              <p className="mt-1 text-sm text-gray-500">Manage your classes and their content</p>
            </div>
            <button
              onClick={() => setOpenDialog(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Create New Class
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          {message.text && (
            <div className={`mb-4 p-4 rounded-md ${
              message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {message.text}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No classes found</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new class.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClasses.map((cls) => (
                <div
                  key={cls.id}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{cls.name}</h3>
                        <p className="mt-1 text-sm text-gray-500">{cls.description || "Description"}</p>
                      </div>
                    
                    </div>
                    <div className="mt-4 flex items-center text-sm text-gray-500">
                      <div className="flex-1">
                        <span>0 Students</span>
                       
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end space-x-3">
                      <button
                        onClick={() => handleEdit(cls)}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(cls.id)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Dialog */}
      {openDialog && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="mb-4">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Class Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      id="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      name="description"
                      id="description"
                      rows={3}
                      value={formData.description}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {selectedClass ? 'Update Class' : 'Create Class'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenDialog(false);
                      resetForm();
                    }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default TeacherClassesPage; 