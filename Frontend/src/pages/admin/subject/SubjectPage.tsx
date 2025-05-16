import React, { useState, useEffect } from 'react';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaSave, FaTimes, FaBookOpen } from 'react-icons/fa';
import AdminSidebar from '../AdminSidebar';
import MainLayout from '../../../components/layout/MainLayout';
import { IconType, IconBaseProps } from 'react-icons';
import axios from 'axios';
import ReactModal from 'react-modal';

interface SubjectPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

interface Subject {
  id: number;
  code: string;
  name: string;
  description: string;
  credits: number;
  stream_id: number;
  created_at: string;
  updated_at: string | null;
  created_by: number;
}

interface Stream {
  id: number;
  name: string;
  class_id?: number;
  class_name?: string;
}

interface ApiResponse<T> {
  items: T[];
  total: number;
}

const SubjectPage: React.FC<SubjectPageProps> = ({ user, onLogout }) => {
  // State for subjects data
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [selectedStreamId, setSelectedStreamId] = useState<number | null>(null);
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState('name-asc');
  
  // Form state
  const [newSubject, setNewSubject] = useState<Partial<Subject>>({ 
    name: '', 
    description: '', 
    code: '',
    credits: 0,
    stream_id: 0
  });
  const [editSubject, setEditSubject] = useState<Subject | null>(null);

  // Form validation errors
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});

  // Add modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // API configuration
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  // Fetch subjects
  const fetchSubjects = async (): Promise<void> => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication token not found');
        setSubjects([]);
        return;
      }

      // Build query parameters
      const params = new URLSearchParams();
      if (selectedStreamId) {
        params.append('stream_id', selectedStreamId.toString());
      }

      const url = `${API_URL}/api/subjects/?${params}`;
      console.log('API URL:', url);

      const response = await axios.get<Subject[]>(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('API Response:', response.data);

      // Handle direct array response
      if (Array.isArray(response.data)) {
        setSubjects(response.data);
        setError(null);
      } else {
        console.log('Invalid response format:', response.data);
        setSubjects([]);
        setError('Invalid response format from server');
      }
    } catch (err) {
      console.error('API Error:', err);
      setSubjects([]);
      if (axios.isAxiosError(err)) {
        console.log('Error response:', err.response);
        if (err.response?.status === 401) {
          setError('Unauthorized: Please login again');
        } else if (err.response?.status === 403) {
          setError('Forbidden: You do not have permission to access this resource');
        } else {
          setError(`Failed to fetch subjects: ${err.response?.data?.message || err.message}`);
      }
    } else {
        setError('Failed to fetch subjects');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch streams with class information
  const fetchStreams = async () => {
    try {
      // First get streams
      const streamsResponse = await axios.get(`${API_URL}/api/streams`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // Also get classes to map class names to streams
        const classesResponse = await axios.get(`${API_URL}/api/classes`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // Create a map of class IDs to class names
      const classMap = new Map();
      classesResponse.data.forEach((cls: any) => {
        classMap.set(cls.id, cls.name);
      });
      
      // Enhance stream data with class names
      const enhancedStreams = streamsResponse.data.map((stream: any) => ({
        id: stream.id,
        name: stream.name,
        class_id: stream.class_id,
        class_name: classMap.get(stream.class_id) || 'Unknown Class'
      }));
      
      setStreams(enhancedStreams);
    } catch (err) {
      console.error('Error fetching streams:', err);
    }
  };

  useEffect(() => {
    fetchStreams();
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [selectedStreamId]);
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  // Check if a subject code already exists
  const isSubjectCodeDuplicate = (code: string, currentId?: number): boolean => {
    return subjects.some(subject => 
      subject.code.toLowerCase() === code.toLowerCase() && 
      (!currentId || subject.id !== currentId)
    );
  };

  // Validate form input
  const validateSubjectForm = (subject: Partial<Subject>, isEdit: boolean = false): boolean => {
    const errors: {[key: string]: string} = {};
    
    // Check for empty fields
    if (!subject.name?.trim()) {
      errors.name = 'Subject name is required';
    }
    
    if (!subject.code?.trim()) {
      errors.code = 'Subject code is required';
    } else if (isSubjectCodeDuplicate(subject.code, isEdit ? editSubject?.id : undefined)) {
      errors.code = 'A subject with this code already exists';
    }
    
    if (!subject.stream_id) {
      errors.stream_id = 'Stream is required';
    }
    
    // Set the form errors
    setFormErrors(errors);
    
    // Form is valid if there are no errors
    return Object.keys(errors).length === 0;
  };

  // Clear errors when input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    isEdit: boolean = false,
    field?: string
  ) => {
    const { name, value } = e.target;
    const fieldName = field || name;
    
    if (isEdit && editSubject) {
      if (fieldName === 'credits') {
        setEditSubject({
          ...editSubject,
          [fieldName]: parseInt(value) || 0
        });
      } else {
        setEditSubject({
          ...editSubject,
          [fieldName]: fieldName === 'code' ? value.toUpperCase() : value
        });
      }
    } else {
      if (fieldName === 'credits') {
        setNewSubject({
          ...newSubject,
          [fieldName]: parseInt(value) || 0
        });
      } else {
        setNewSubject({
          ...newSubject,
          [fieldName]: fieldName === 'code' ? value.toUpperCase() : value
        });
      }
    }
    
    // Clear error for this field if it exists
    if (formErrors[fieldName]) {
      const updatedErrors = { ...formErrors };
      delete updatedErrors[fieldName];
      setFormErrors(updatedErrors);
    }
  };

  // Handle add new subject
  const handleAddNew = () => {
    setIsAddingNew(true);
    setNewSubject({ 
      name: '', 
      description: '', 
      code: '',
      credits: 0,
      stream_id: streams[0]?.id || 0
    });
    setFormErrors({});
  };
  
  // Handle save new subject
  const handleSaveNew = async () => {
    // Validate form first
    if (!validateSubjectForm(newSubject)) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      // Prepare the request body exactly as per API specification
      const requestBody = {
        name: newSubject.name,
        code: newSubject.code,
        stream_id: newSubject.stream_id,
        description: newSubject.description || '',
        credits: newSubject.credits || 0
      };

      console.log('Sending request:', requestBody);

      const response = await axios.post(
        `${API_URL}/api/subjects/`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          params: {
            auto_generate_code: true
          }
        }
      );

      console.log('API Response:', response.data);

      if (response.data) {
        setIsAddingNew(false);
        setNewSubject({ 
          name: '', 
          description: '', 
          code: '',
          credits: 0,
          stream_id: streams[0]?.id || 0
        });
        setError(null);
        setFormErrors({});
        fetchSubjects();
      }
    } catch (err) {
      console.error('Error creating subject:', err);
      if (axios.isAxiosError(err)) {
        console.error('Error response:', err.response?.data);
        if (err.response?.status === 401) {
          setError('Unauthorized: Please login again');
        } else if (err.response?.status === 403) {
          setError('Forbidden: You do not have permission to create subjects');
        } else if (err.response?.data?.detail) {
          setError(err.response.data.detail);
        } else {
          setError(`Failed to create subject: ${err.response?.data?.message || err.message}`);
        }
      } else {
        setError('Failed to create subject');
      }
    }
  };
  
  // Handle edit subject
  const handleEdit = (subject: Subject) => {
    setEditingId(subject.id);
    setEditSubject({ ...subject });
    setIsEditModalOpen(true);
    setFormErrors({});
  };
  
  // Handle save edit
  const handleSaveEdit = async () => {
    if (!editSubject) return;
    
    // Validate form first
    if (!validateSubjectForm(editSubject, true)) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      // Prepare the request body
      const requestBody = {
        name: editSubject.name,
        code: editSubject.code,
        stream_id: editSubject.stream_id,
        description: editSubject.description || '',
        credits: editSubject.credits || 0
      };

      console.log('Sending edit request:', requestBody);

      const response = await axios.put(
        `${API_URL}/api/subjects/${editSubject.id}`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Edit response:', response.data);

      if (response.data) {
        setEditingId(null);
        setEditSubject(null);
        setError(null);
        setIsEditModalOpen(false);
        setFormErrors({});
        // Refresh the subjects list
        fetchSubjects();
      }
    } catch (err) {
      console.error('Error updating subject:', err);
      if (axios.isAxiosError(err)) {
        console.error('Error response:', err.response?.data);
        if (err.response?.status === 401) {
          setError('Unauthorized: Please login again');
        } else if (err.response?.status === 403) {
          setError('Forbidden: You do not have permission to update subjects');
        } else if (err.response?.data?.detail) {
          setError(err.response.data.detail);
        } else {
          setError(`Failed to update subject: ${err.response?.data?.message || err.message}`);
        }
      } else {
        setError('Failed to update subject');
      }
    }
  };
  
  // Handle delete subject
  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this subject?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      console.log('Sending delete request for subject ID:', id);

      const response = await axios.delete(
        `${API_URL}/api/subjects/${id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Delete response:', response.data);

      if (response.status === 200 || response.status === 204) {
        // Refresh the subjects list
        fetchSubjects();
        setError(null);
      }
    } catch (err) {
      console.error('Error deleting subject:', err);
      if (axios.isAxiosError(err)) {
        console.error('Error response:', err.response?.data);
        if (err.response?.status === 401) {
          setError('Unauthorized: Please login again');
        } else if (err.response?.status === 403) {
          setError('Forbidden: You do not have permission to delete subjects');
        } else if (err.response?.status === 404) {
          setError('Subject not found');
        } else if (err.response?.data?.detail) {
          setError(err.response.data.detail);
        } else {
          setError(`Failed to delete subject: ${err.response?.data?.message || err.message}`);
        }
      } else {
        setError('Failed to delete subject');
      }
    }
  };
  
  // Cancel editing or adding
  const handleCancel = () => {
    setIsAddingNew(false);
    setEditingId(null);
    setEditSubject(null);
    setIsEditModalOpen(false);
  };
  
  // Handle stream filter change
  const handleFilterStreamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const streamId = e.target.value === 'all' ? null : parseInt(e.target.value);
    setSelectedStreamId(streamId);
  };
  
  // Handle sort change
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value);
  };
  
  // Filter and sort subjects
  const filteredAndSortedSubjects = React.useMemo(() => {
    if (!Array.isArray(subjects)) {
      return [];
    }
    
    let result = [...subjects];
    
    // Filter by search term
    if (searchTerm) {
      result = result.filter(subject => 
        subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subject.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subject.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Sort
    switch (sortBy) {
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'code-asc':
        result.sort((a, b) => a.code.localeCompare(b.code));
        break;
      case 'code-desc':
        result.sort((a, b) => b.code.localeCompare(a.code));
        break;
      case 'credits-asc':
        result.sort((a, b) => a.credits - b.credits);
        break;
      case 'credits-desc':
        result.sort((a, b) => b.credits - a.credits);
        break;
      case 'date-asc':
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'date-desc':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      default:
        break;
    }
    
    return result;
  }, [subjects, searchTerm, sortBy]);
  
  // Helper function to render icons properly
  const renderIcon = (Icon: IconType, customClassName?: string) => {
    return React.createElement(Icon as React.ComponentType<IconBaseProps>, { 
      className: customClassName || "h-5 w-5",
      size: 20
    });
  };
  
  // Update the table row JSX to remove inline editing
  const renderSubjectRow = (subject: Subject) => {
    // Find the stream object for this subject
    const stream = streams.find(s => s.id === subject.stream_id);
    const streamInfo = stream ? `${stream.name} (${stream.class_name})` : 'Unknown Stream';
    
    return (
      <tr key={subject.id}>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm font-medium text-gray-900">{subject.code}</div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm font-medium text-gray-900">{subject.name}</div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm text-gray-500">{subject.credits}</div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm text-gray-500">
            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
              {streamInfo}
            </span>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="text-sm text-gray-500 max-w-xs">{subject.description}</div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {new Date(subject.created_at).toLocaleDateString()}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <div className="flex justify-end space-x-3">
            <button onClick={() => handleEdit(subject)} className="text-blue-600 hover:text-blue-900">
              {renderIcon(FaEdit)}
            </button>
            <button onClick={() => handleDelete(subject.id)} className="text-red-600 hover:text-red-900">
              {renderIcon(FaTrash)}
            </button>
          </div>
        </td>
      </tr>
    );
  };
  
  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<AdminSidebar />}>
      <div className="h-screen bg-gray-50 overflow-hidden flex flex-col">
        {/* Header Section */}
        <div className="bg-blue-600 text-white py-4 px-6 flex-none">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center space-x-2">
              {renderIcon(FaBookOpen, "text-xl")}
              <div>
                <h1 className="text-xl font-semibold">Manage Subjects</h1>
                <p className="text-sm text-blue-100">Add and manage academic subjects</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Filters & Actions Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex-none">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {renderIcon(FaSearch, "text-gray-400")}
                </div>
                <input
                  type="text"
                  placeholder="Search subjects..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm"
                />
              </div>
              <select
                value={selectedStreamId === null ? 'all' : selectedStreamId.toString()}
                onChange={handleFilterStreamChange}
                className="form-select rounded-md border-gray-300 py-2 pl-3 pr-10 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Streams</option>
                {streams.map(stream => (
                  <option key={stream.id} value={stream.id}>
                    {stream.name} ({stream.class_name})
                  </option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={handleSortChange}
                className="form-select rounded-md border-gray-300 py-2 pl-3 pr-10 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="code-asc">Code (A-Z)</option>
                <option value="code-desc">Code (Z-A)</option>
                <option value="credits-asc">Credits (Low to High)</option>
                <option value="credits-desc">Credits (High to Low)</option>
                <option value="date-asc">Date (Oldest first)</option>
                <option value="date-desc">Date (Newest first)</option>
              </select>
            </div>
            <button
              onClick={handleAddNew}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center space-x-2 transition-colors"
            >
              {renderIcon(FaPlus)}
              <span>Add Subject</span>
            </button>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-grow overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Add New Subject Form with validation */}
            {isAddingNew && (
              <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Add New Subject</h3>
                    <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
                      {renderIcon(FaTimes)}
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="new-code" className="block text-sm font-medium text-gray-700">
                        Subject Code*
                      </label>
                      <input
                        id="new-code"
                        type="text"
                        required
                        value={newSubject.code}
                        onChange={(e) => handleInputChange(e, false, 'code')}
                        className={`mt-1 block w-full border ${formErrors.code ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                        placeholder="Enter subject code"
                      />
                      {formErrors.code && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.code}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="new-name" className="block text-sm font-medium text-gray-700">
                        Subject Name*
                      </label>
                      <input
                        id="new-name"
                        type="text"
                        required
                        value={newSubject.name}
                        onChange={(e) => handleInputChange(e, false, 'name')}
                        className={`mt-1 block w-full border ${formErrors.name ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                        placeholder="Enter subject name"
                      />
                      {formErrors.name && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="new-stream" className="block text-sm font-medium text-gray-700">
                        Stream*
                      </label>
                      <select
                        id="new-stream"
                        required
                        value={newSubject.stream_id}
                        onChange={(e) => handleInputChange(e, false, 'stream_id')}
                        className={`mt-1 block w-full border ${formErrors.stream_id ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                      >
                        <option value="">Select a stream</option>
                        {streams.map(stream => (
                          <option key={stream.id} value={stream.id}>
                            {stream.name} ({stream.class_name})
                          </option>
                        ))}
                      </select>
                      {formErrors.stream_id && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.stream_id}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="new-credits" className="block text-sm font-medium text-gray-700">
                        Credits
                      </label>
                      <input
                        id="new-credits"
                        type="number"
                        min="0"
                        step="1"
                        value={newSubject.credits || 0}
                        onChange={(e) => handleInputChange(e, false, 'credits')}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Enter credits"
                      />
                    </div>
                    <div>
                      <label htmlFor="new-description" className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        id="new-description"
                        value={newSubject.description}
                        onChange={(e) => handleInputChange(e, false, 'description')}
                        rows={3}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Enter description"
                      ></textarea>
                    </div>
                    <div className="flex justify-end space-x-3 mt-5">
                      <button
                        onClick={handleCancel}
                        className="px-4 py-2 bg-white text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveNew}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
                      >
                        Save Subject
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Subjects Table */}
            <div className="bg-white shadow-md rounded-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Credits
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stream (Class)
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created At
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedSubjects.map(subject => renderSubjectRow(subject))}
                  
                  {filteredAndSortedSubjects.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                        {searchTerm || selectedStreamId !== null 
                          ? 'No subjects match your search criteria.' 
                          : 'No subjects available. Add your first subject!'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Subject Modal with validation */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Edit Subject</h3>
              <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
                {renderIcon(FaTimes)}
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="edit-code" className="block text-sm font-medium text-gray-700">
                  Subject Code*
                </label>
                <input
                  id="edit-code"
                  type="text"
                  value={editSubject?.code || ''}
                  onChange={(e) => handleInputChange(e, true, 'code')}
                  className={`mt-1 block w-full border ${formErrors.code ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  placeholder="Enter subject code"
                />
                {formErrors.code && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.code}</p>
                )}
              </div>
              <div>
                <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">
                  Subject Name*
                </label>
                <input
                  id="edit-name"
                  type="text"
                  value={editSubject?.name || ''}
                  onChange={(e) => handleInputChange(e, true, 'name')}
                  className={`mt-1 block w-full border ${formErrors.name ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  placeholder="Enter subject name"
                />
                {formErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                )}
              </div>
              <div>
                <label htmlFor="edit-stream" className="block text-sm font-medium text-gray-700">
                  Stream*
                </label>
                <select
                  id="edit-stream"
                  value={editSubject?.stream_id || ''}
                  onChange={(e) => handleInputChange(e, true, 'stream_id')}
                  className={`mt-1 block w-full border ${formErrors.stream_id ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                >
                  <option value="">Select a stream</option>
                  {streams.map(stream => (
                    <option key={stream.id} value={stream.id}>
                      {stream.name} ({stream.class_name})
                    </option>
                  ))}
                </select>
                {formErrors.stream_id && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.stream_id}</p>
                )}
              </div>
              <div>
                <label htmlFor="edit-credits" className="block text-sm font-medium text-gray-700">
                  Credits
                </label>
                <input
                  id="edit-credits"
                  type="number"
                  min="0"
                  step="1"
                  value={editSubject?.credits || 0}
                  onChange={(e) => handleInputChange(e, true, 'credits')}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter credits"
                />
              </div>
              <div>
                <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="edit-description"
                  value={editSubject?.description || ''}
                  onChange={(e) => handleInputChange(e, true, 'description')}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter description"
                ></textarea>
              </div>
              <div className="flex justify-end space-x-3 mt-5">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-white text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
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

export default SubjectPage; 