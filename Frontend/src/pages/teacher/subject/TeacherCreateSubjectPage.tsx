import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../../components/layout/MainLayout';
import TeacherSidebar from '../sidebar/TeacherSidebar';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { useAuth } from '../../../contexts/AuthContext';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
interface Stream {
  id: number;
  name: string;
  class_?: {
    id: number;
    name: string;
  };
}

interface TeacherCreateSubjectPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

interface SubjectForm {
  name: string;
  code: string;
  description: string;
  credits: number;
  stream_id: number;
}

const TeacherCreateSubjectPage: React.FC<TeacherCreateSubjectPageProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});

  const [formData, setFormData] = useState<SubjectForm>({
    name: '',
    code: '',
    description: '',
    credits: 0,
    stream_id: 0
  });

  useEffect(() => {
    fetchStreams();
  }, [token]);

  const fetchStreams = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/api/streams/`, {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch streams');
      }

      const data = await response.json();
      // Transform the data to include class_name
      const streamsWithClassName = data.map((stream: Stream) => ({
        ...stream,
        class_name: stream.class_?.name
      }));
      setStreams(streamsWithClassName);
    } catch (err) {
      console.error('Error fetching streams:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch streams');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = async (): Promise<boolean> => {
    const errors: {[key: string]: string} = {};
    
    // Validate name
    if (!formData.name.trim()) {
      errors.name = 'Subject name is required';
    }
    
    // Validate code
    if (!formData.code.trim()) {
      errors.code = 'Subject code is required';
    }
    
    // Validate stream
    if (!formData.stream_id) {
      errors.stream_id = 'Stream is required';
    }
    
    // Validate credits
    if (formData.credits < 0) {
      errors.credits = 'Credits cannot be negative';
    }

    // Validate description
    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'code') {
      // Convert code to uppercase
      setFormData(prev => ({
        ...prev,
        [name]: value.toUpperCase()
      }));
    } else if (name === 'credits') {
      // Ensure credits is a non-negative number
      const numValue = Math.max(0, parseInt(value) || 0);
      setFormData(prev => ({
        ...prev,
        [name]: numValue
      }));
    } else if (name === 'stream_id') {
      setFormData(prev => ({
        ...prev,
        [name]: parseInt(value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Clear error for this field if it exists
    if (formErrors[name]) {
      const updatedErrors = { ...formErrors };
      delete updatedErrors[name];
      setFormErrors(updatedErrors);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const isValid = await validateForm();
    if (!isValid) return;

    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/api/subjects/`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create subject');
      }

      navigate('/teacher/subjects');
    } catch (err) {
      console.error('Error creating subject:', err);
      setError(err instanceof Error ? err.message : 'Failed to create subject');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/teacher/subjects');
  };

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<TeacherSidebar />}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New Subject</h1>
        <p className="text-gray-600">Add a new subject to the system</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Subject Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Subject Name*
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`block w-full rounded-md shadow-sm sm:text-sm ${
                  formErrors.name 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
                required
              />
              {formErrors.name && (
                <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
              )}
            </div>

            {/* Subject Code */}
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                Subject Code*
              </label>
              <input
                type="text"
                id="code"
                name="code"
                value={formData.code}
                onChange={handleInputChange}
                className={`block w-full rounded-md shadow-sm sm:text-sm uppercase ${
                  formErrors.code 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
                required
              />
              {formErrors.code && (
                <p className="mt-1 text-sm text-red-600">{formErrors.code}</p>
              )}
            </div>

            {/* Credits */}
            <div>
              <label htmlFor="credits" className="block text-sm font-medium text-gray-700 mb-1">
                Credits*
              </label>
              <input
                type="number"
                id="credits"
                name="credits"
                value={formData.credits}
                onChange={handleInputChange}
                min="0"
                className={`block w-full rounded-md shadow-sm sm:text-sm ${
                  formErrors.credits 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
                required
              />
              {formErrors.credits && (
                <p className="mt-1 text-sm text-red-600">{formErrors.credits}</p>
              )}
            </div>

            {/* Stream Selection */}
            <div>
              <label htmlFor="stream_id" className="block text-sm font-medium text-gray-700 mb-1">
                Stream*
              </label>
              <select
                id="stream_id"
                name="stream_id"
                value={formData.stream_id}
                onChange={handleInputChange}
                className={`block w-full rounded-md shadow-sm sm:text-sm ${
                  formErrors.stream_id 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
                required
              >
                <option value="">Select Stream</option>
                {streams.map(stream => (
                  <option key={stream.id} value={stream.id}>
                    {stream.name} {stream.class_?.name ? `(${stream.class_?.name})` : ''}
                  </option>
                ))}
              </select>
              {formErrors.stream_id && (
                <p className="mt-1 text-sm text-red-600">{formErrors.stream_id}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description*
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className={`block w-full rounded-md shadow-sm sm:text-sm ${
                formErrors.description 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
              required
            />
            {formErrors.description && (
              <p className="mt-1 text-sm text-red-600">{formErrors.description}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              variant="light"
              onClick={handleCancel}
              type="button"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Subject'}
            </Button>
          </div>
        </form>
      </Card>
    </MainLayout>
  );
};

export default TeacherCreateSubjectPage; 