import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format as formatDate } from 'date-fns';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import MainLayout from '../../components/layout/MainLayout';
import AdminSidebar from './AdminSidebar';
import { useNavigate } from 'react-router-dom';
import '../../styles/AdminPages.css';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
interface Exam {
  id: number;
  title: string;
  description: string;
  start_datetime: string;
  end_datetime: string;
  duration_minutes: number;
  max_marks: number;
  created_by: number;
  created_at: string;
  updated_at: string | null;
  creator: {
    username: string;
    email: string;
    id: number;
    role: string;
  };
}

interface ExamFormData {
  title: string;
  description: string;
  start_datetime: string;
  end_datetime: string;
  duration_minutes: number;
  max_marks: number;
}

const initialFormData: ExamFormData = {
  title: '',
  description: '',
  start_datetime: '',
  end_datetime: '',
  duration_minutes: 90,
  max_marks: 60,
};

interface ExamsPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

const ExamsPage: React.FC<ExamsPageProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [formData, setFormData] = useState<ExamFormData>(initialFormData);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchExams();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return null;
    }
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  };

  const fetchExams = async () => {
    const headers = getAuthHeaders();
    if (!headers) return;

    try {
      const response = await axios.get(`${API_URL}/api/exams/exams/`, headers);
      setExams(response.data);
      setError(null);
    } catch (err: any) {
      if (err.response?.status === 401) {
        navigate('/login');
      }
      setError(err.response?.data?.detail || 'Failed to fetch exams');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const formatDateForAPI = (dateString: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toISOString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const headers = getAuthHeaders();
    if (!headers) return;

    setError(null);
    setSuccess(null);

    try {
      const formattedData = {
        ...formData,
        start_datetime: formatDateForAPI(formData.start_datetime),
        end_datetime: formatDateForAPI(formData.end_datetime),
        duration_minutes: Number(formData.duration_minutes),
        max_marks: Number(formData.max_marks)
      };

      if (isEditing && editingId) {
        await axios.put(
          `${API_URL}/api/exams/exams/${editingId}/`,
          formattedData,
          headers
        );
        setSuccess('Exam updated successfully');
      } else {
        await axios.post(
            `${API_URL}/api/exams/exams/`,
          formattedData,
          headers
        );
        setSuccess('Exam created successfully');
      }
      
      setFormData(initialFormData);
      setIsEditing(false);
      setEditingId(null);
      fetchExams();
    } catch (err: any) {
      if (err.response?.status === 401) {
        navigate('/login');
      }
      setError(err.response?.data?.detail || 'Failed to save exam');
    }
  };

  const handleEdit = (exam: Exam) => {
    const startDate = new Date(exam.start_datetime);
    const endDate = new Date(exam.end_datetime);

    setFormData({
      title: exam.title,
      description: exam.description,
      start_datetime: startDate.toISOString().slice(0, 16),
      end_datetime: endDate.toISOString().slice(0, 16),
      duration_minutes: exam.duration_minutes,
      max_marks: exam.max_marks,
    });
    setIsEditing(true);
    setEditingId(exam.id);
    setError(null);
    setSuccess(null);
  };

  const handleDelete = async (id: number) => {
    const headers = getAuthHeaders();
    if (!headers) return;

    if (window.confirm('Are you sure you want to delete this exam?')) {
      try {
                  await axios.delete(`${API_URL}/api/exams/exams/${id}/`, headers);
        setSuccess('Exam deleted successfully');
        fetchExams();
        setError(null);
      } catch (err: any) {
        if (err.response?.status === 401) {
          navigate('/login');
        }
        setError(err.response?.data?.detail || 'Failed to delete exam');
      }
    }
  };

  const handleCancel = () => {
    setFormData(initialFormData);
    setIsEditing(false);
    setEditingId(null);
    setError(null);
    setSuccess(null);
  };

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<AdminSidebar />}>
      <div className="h-screen bg-gray-50 overflow-hidden flex flex-col">
        {/* Header Section */}
        <div className="bg-blue-600 text-white py-6 px-8 flex-none">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold mb-2">Manage Exams</h1>
            <p className="text-blue-100">Create and manage your exams with ease</p>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto px-8 py-6">
          <div className="max-w-7xl mx-auto">
            {error && (
              <div className="mb-6 p-4 rounded-md bg-red-50 text-red-800 border-l-4 border-red-500">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                  <div className="ml-auto">
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-500">
                      <span className="sr-only">Dismiss</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 rounded-md bg-green-50 text-green-800 border-l-4 border-green-500">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">{success}</p>
                  </div>
                  <div className="ml-auto">
                    <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-500">
                      <span className="sr-only">Dismiss</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Form Section */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {isEditing ? 'Edit Exam' : 'Create New Exam'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">Duration (minutes)</label>
                    <input
                      type="number"
                      name="duration_minutes"
                      value={formData.duration_minutes}
                      onChange={handleInputChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                      min="1"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-base font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={2}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">Start Date & Time</label>
                    <input
                      type="datetime-local"
                      name="start_datetime"
                      value={formData.start_datetime}
                      onChange={handleInputChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1">End Date & Time</label>
                    <input
                      type="datetime-local"
                      name="end_datetime"
                      value={formData.end_datetime}
                      onChange={handleInputChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                      required
                    />
                  </div>

                  <div className="md:col-span-2 flex items-center justify-between">
                    <div className="w-1/3">
                      <label className="block text-base font-medium text-gray-700 mb-1">Maximum Marks</label>
                      <input
                        type="number"
                        name="max_marks"
                        value={formData.max_marks}
                        onChange={handleInputChange}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                    <div className="flex justify-end space-x-3">
                      {isEditing && (
                        <button
                          type="button"
                          onClick={handleCancel}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="submit"
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        {isEditing ? 'Update Exam' : 'Create Exam'}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th scope="col" className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th scope="col" className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                    <th scope="col" className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">End Time</th>
                    <th scope="col" className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                    <th scope="col" className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Max Marks</th>
                    <th scope="col" className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {exams.map((exam) => (
                    <tr key={exam.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-base font-medium text-gray-900">{exam.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-base text-gray-500">{exam.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-base text-gray-500">
                        {formatDate(new Date(exam.start_datetime), 'yyyy-MM-dd HH:mm')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-base text-gray-500">
                        {formatDate(new Date(exam.end_datetime), 'yyyy-MM-dd HH:mm')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-base text-gray-500">{exam.duration_minutes} mins</td>
                      <td className="px-6 py-4 whitespace-nowrap text-base text-gray-500">{exam.max_marks}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-base text-gray-500">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(exam)}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(exam.id)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-base font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ExamsPage; 