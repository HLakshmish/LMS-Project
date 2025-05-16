import React, { useState, useEffect } from 'react';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaSave, FaTimes, FaStream, FaSync, FaBookOpen } from 'react-icons/fa';
import AdminSidebar from '../AdminSidebar';
import MainLayout from '../../../components/layout/MainLayout';
import { IconType, IconBaseProps } from 'react-icons';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';
import ReactModal from 'react-modal';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
interface StreamPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

interface Stream {
  id: string;
  name: string;
  description: string;
  class_id?: string;
  subjects?: number;
  createdAt: Date;
}

// API data interface to match the endpoint requirements
interface StreamApiData {
  name: string;
  description: string;
  class_id: string;
}

interface ClassOption {
  id: string;
  name: string;
}

const StreamPage: React.FC<StreamPageProps> = ({ user, onLogout }) => {
  // State for streams data
  const [streams, setStreams] = useState<Stream[]>([]);
  
  // State for available classes
  const [classes, setClasses] = useState<ClassOption[]>([]);
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState('name-asc');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [newStream, setNewStream] = useState({ 
    name: '', 
    description: '', 
    class_id: '' 
  });
  const [editStream, setEditStream] = useState<Stream | null>(null);
  
  // Form validation errors
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  
  const { token } = useAuth();

  // Fetch subjects with stream details
  const fetchSubjectsCount = async (): Promise<Map<string, number>> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        return new Map();
      }
      
      const response = await axios.get(`${API_URL}/api/subjects/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const subjectsByStream = new Map<string, number>();
      
      // Process the subjects response data
      if (Array.isArray(response.data)) {
        console.log('Subject data sample:', response.data[0]);
        
        response.data.forEach((subject: any) => {
          // Handle both direct stream_id or nested stream object
          let streamId: string;
          
          if (subject.stream && subject.stream.id) {
            // Handle nested stream object
            streamId = String(subject.stream.id);
          } else {
            // Handle direct stream_id
            streamId = String(subject.stream_id);
          }
          
          if (streamId) {
            subjectsByStream.set(
              streamId, 
              (subjectsByStream.get(streamId) || 0) + 1
            );
          }
        });
      }
      
      console.log('Subjects by stream:', Object.fromEntries(subjectsByStream));
      return subjectsByStream;
    } catch (err) {
      console.error('Error fetching subjects data:', err);
      return new Map();
    }
  };

  // Fetch streams data from API when component mounts
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch streams
        const streamsResponse = await axios.get(`${API_URL}/api/streams/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        // Fetch subjects count
        const subjectCountMap = await fetchSubjectsCount();
        
        // Transform API data to match our interface
        const formattedStreams = streamsResponse.data.map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          class_id: item.class_id,
          subjects: subjectCountMap.get(String(item.id)) || 0,
          createdAt: new Date(item.created_at || new Date())
        }));
        
        setStreams(formattedStreams);
        
        // Fetch classes for the dropdown
          const classesResponse = await axios.get(`${API_URL}/api/classes/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const formattedClasses = classesResponse.data.map((item: any) => ({
          id: item.id,
          name: item.name
        }));
        
        setClasses(formattedClasses);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [token]);
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  // Handle add new stream
  const handleAddNew = () => {
    setIsAddingNew(true);
    // Set default class_id to the first class in the list if available
    const defaultClassId = classes.length > 0 ? classes[0].id : '';
    setNewStream({ 
      name: '', 
      description: '', 
      class_id: defaultClassId 
    });
  };
  
  // Check if a stream name already exists for the given class
  const isStreamNameDuplicateForClass = (name: string, classId: string, currentId?: string): boolean => {
    console.log('Checking duplicate for:', { name, classId, currentId });
    console.log('Existing streams:', streams.map(s => ({ id: s.id, name: s.name, class_id: s.class_id })));
    
    return streams.some(stream => {
      const nameMatches = stream.name.toLowerCase().trim() === name.toLowerCase().trim();
      const classMatches = String(stream.class_id) === String(classId);
      const notCurrentItem = !currentId || String(stream.id) !== String(currentId);
      
      console.log('Comparing with stream:', { 
        id: stream.id,
        name: stream.name, 
        nameMatches, 
        classId: stream.class_id, 
        classMatches, 
        notCurrentItem 
      });
      
      return nameMatches && classMatches && notCurrentItem;
    });
  };

  // Validate form input
  const validateStreamForm = (name: string, classId: string, isEdit: boolean = false, currentId?: string): boolean => {
    const errors: {[key: string]: string} = {};
    
    // Check for empty name
    if (!name.trim()) {
      errors.name = 'Stream name is required';
    }

    // Check for empty class
    if (!classId) {
      errors.class_id = 'Class is required';
    }
    
    // If both name and class are provided, check for duplicate
    if (name.trim() && classId) {
      // Check for duplicate name in the same class
      if (isStreamNameDuplicateForClass(name, classId, isEdit ? currentId : undefined)) {
        errors.name = 'A stream with this name already exists for the selected class';
      }
    }
    
    console.log('Validation errors:', errors);
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Clear errors when stream name input changes
  const handleStreamNameChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const value = e.target.value;
    
    if (isEdit && editStream) {
      setEditStream({ ...editStream, name: value });
    } else {
      setNewStream({ ...newStream, name: value });
    }
    
    // Clear name error if it exists
    if (formErrors.name) {
      const updatedErrors = { ...formErrors };
      delete updatedErrors.name;
      setFormErrors(updatedErrors);
    }
  };

  // Clear errors when class selection changes
  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>, isEdit: boolean = false) => {
    const value = e.target.value;
    
    if (isEdit && editStream) {
      setEditStream({ ...editStream, class_id: value });
    } else {
      setNewStream({ ...newStream, class_id: value });
    }
    
    // Clear class_id error if it exists
    if (formErrors.class_id) {
      const updatedErrors = { ...formErrors };
      delete updatedErrors.class_id;
      setFormErrors(updatedErrors);
    }
    
    // Clear name error too if it was related to duplicate name for class
    if (formErrors.name && formErrors.name.includes('for the selected class')) {
      const updatedErrors = { ...formErrors };
      delete updatedErrors.name;
      setFormErrors(updatedErrors);
    }
  };

  // Handle save new stream
  const handleSaveNew = async () => {
    // Validate form before submission
    if (!validateStreamForm(newStream.name, newStream.class_id)) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Prepare data for API according to requirements
      const apiData: StreamApiData = {
        name: newStream.name,
        description: newStream.description,
        class_id: newStream.class_id
      };
      
      // Make API call to create a new stream
      const response = await axios.post(`${API_URL}/api/streams/`, apiData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // If successful, update the UI with the returned data
      const newStreamItem: Stream = {
        id: response.data.id,
        name: response.data.name,
        description: response.data.description,
        class_id: response.data.class_id,
        subjects: 0,
        createdAt: new Date(response.data.created_at || new Date())
      };
      
      setStreams([...streams, newStreamItem]);
      setIsAddingNew(false);
      setNewStream({ name: '', description: '', class_id: '' });
      setFormErrors({});
    } catch (err) {
      console.error('Error creating stream:', err);
      setError('Failed to create stream. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle edit stream
  const handleEdit = (stream: Stream) => {
    setEditStream(stream);
    setIsEditModalOpen(true);
  };
  
  // Handle save edit
  const handleSaveEdit = async () => {
    if (!editStream) return;
    
    // Validate form before submission
    if (!validateStreamForm(editStream.name, editStream.class_id || '', true, editStream.id)) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const apiData: StreamApiData = {
        name: editStream.name,
        description: editStream.description,
        class_id: editStream.class_id || ''
      };
      
      await axios.put(`${API_URL}/api/streams/${editStream.id}/`, apiData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Refresh the streams list
      const response = await axios.get(`${API_URL}/api/streams/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const formattedStreams = response.data.map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        class_id: item.class_id,
        subjects: item.subjects_count || 0,
        createdAt: new Date(item.created_at || new Date())
      }));
      
      setStreams(formattedStreams);
      setIsEditModalOpen(false);
      setEditStream(null);
      setFormErrors({});
    } catch (err) {
      console.error('Error updating stream:', err);
      setError('Failed to update stream. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle delete stream
  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this stream?')) {
      setIsLoading(true);
      setError(null);
      
      try {
        // Make API call to delete the stream
        await axios.delete(`${API_URL}/api/streams/${id}/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        // Update the UI by removing the deleted stream
        setStreams(streams.filter(stream => stream.id !== id));
      } catch (err) {
        console.error('Error deleting stream:', err);
        setError('Failed to delete stream. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  // Cancel editing or adding
  const handleCancel = () => {
    setIsAddingNew(false);
    setIsEditModalOpen(false);
    setEditStream(null);
  };
  
  // Handle sort change
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value);
  };
  
  // Filter and sort streams
  const filteredAndSortedStreams = React.useMemo(() => {
    let result = [...streams];
    
    // Filter by search term
    if (searchTerm) {
      result = result.filter(stream => 
        stream.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stream.description.toLowerCase().includes(searchTerm.toLowerCase())
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
      case 'date-asc':
        result.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        break;
      case 'date-desc':
        result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case 'subjects-asc':
        result.sort((a, b) => (a.subjects || 0) - (b.subjects || 0));
        break;
      case 'subjects-desc':
        result.sort((a, b) => (b.subjects || 0) - (a.subjects || 0));
        break;
      default:
        break;
    }
    
    return result;
  }, [streams, searchTerm, sortBy]);
  
  // Get class name from class ID
  const getClassName = (classId: string) => {
    const foundClass = classes.find(c => c.id === classId);
    return foundClass ? foundClass.name : 'Unknown Class';
  };
  
  // Helper function to render icons properly
  const renderIcon = (Icon: IconType, customClassName?: string) => {
    return React.createElement(Icon as React.ComponentType<IconBaseProps>, { 
      className: customClassName || "h-5 w-5",
      size: 20
    });
  };
  
  // Add a new function to handle refresh
  const handleRefresh = async () => {
    setIsLoading(true);
    
    try {
      // Fetch latest subjects count
      const subjectCountMap = await fetchSubjectsCount();
      
      // Update streams with fresh counts
      setStreams(prevStreams => 
        prevStreams.map(stream => ({
          ...stream,
          subjects: subjectCountMap.get(String(stream.id)) || 0
        }))
      );
    } catch (error) {
      console.error('Error refreshing subjects count:', error);
      setError('Failed to refresh subject counts');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update the render function for subjects count
  const renderSubjectsCount = (count: number) => (
    <div className="text-sm font-medium">
      <span 
        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
          count > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}
        title={count > 0 ? `This stream has ${count} subject${count === 1 ? '' : 's'} assigned` : 'No subjects assigned to this stream'}
      >
        {count} {count === 1 ? 'Subject' : 'Subjects'}
      </span>
    </div>
  );

  // Compute summary statistics for subjects across streams
  const subjectsSummary = React.useMemo(() => {
    const totalSubjects = streams.reduce((sum, stream) => sum + (stream.subjects || 0), 0);
    const streamsWithSubjects = streams.filter(stream => (stream.subjects || 0) > 0).length;
    const streamsWithoutSubjects = streams.length - streamsWithSubjects;
    
    return {
      totalSubjects,
      streamsWithSubjects,
      streamsWithoutSubjects
    };
  }, [streams]);

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<AdminSidebar />}>
      <div className="h-screen bg-gray-50 overflow-hidden flex flex-col">
        {/* Header Section */}
        <div className="bg-blue-600 text-white py-4 px-6 flex-none">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center space-x-2">
              {renderIcon(FaStream, "text-xl")}
              <div>
                <h1 className="text-xl font-semibold">Manage Streams</h1>
                <p className="text-sm text-blue-100">Add and manage academic streams</p>
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
                  placeholder="Search streams..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm"
                />
              </div>
              <select
                value={sortBy}
                onChange={handleSortChange}
                className="form-select rounded-md border-gray-300 py-2 pl-3 pr-10 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="subjects-desc">Subjects (Most first)</option>
                <option value="subjects-asc">Subjects (Least first)</option>
                <option value="date-asc">Date (Oldest first)</option>
                <option value="date-desc">Date (Newest first)</option>
              </select>
              <button
                onClick={handleRefresh}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                {renderIcon(FaSync, isLoading ? "animate-spin" : "")}
                <span className="ml-2">Refresh Counts</span>
              </button>
            </div>
            <button
              onClick={handleAddNew}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center space-x-2 transition-colors"
              disabled={isLoading}
            >
              {renderIcon(FaPlus)}
              <span>Add Stream</span>
            </button>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-grow overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Loading State */}
            {isLoading && !isAddingNew && !isEditModalOpen && (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            )}
            
            {/* Add New Stream Form */}
            {isAddingNew && (
              <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Create New Stream</h3>
                    <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
                      {renderIcon(FaTimes)}
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="new-name" className="block text-sm font-medium text-gray-700">
                        Stream Name
                      </label>
                      <input
                        id="new-name"
                        type="text"
                        value={newStream.name}
                        onChange={(e) => handleStreamNameChange(e)}
                        className={`mt-1 block w-full border ${formErrors.name ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                        placeholder="Enter stream name"
                      />
                      {formErrors.name && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="new-class" className="block text-sm font-medium text-gray-700">
                        Class
                      </label>
                      <select
                        id="new-class"
                        value={newStream.class_id}
                        onChange={(e) => handleClassChange(e)}
                        className={`mt-1 block w-full border ${formErrors.class_id ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                      >
                        <option value="">Select a class</option>
                        {classes.map(cls => (
                          <option key={cls.id} value={cls.id}>{cls.name}</option>
                        ))}
                      </select>
                      {formErrors.class_id && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.class_id}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="new-description" className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        id="new-description"
                        value={newStream.description}
                        onChange={(e) => setNewStream({ ...newStream, description: e.target.value })}
                        rows={3}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Enter stream description"
                      ></textarea>
                    </div>
                    <div className="flex justify-end space-x-3 mt-5">
                      <button
                        onClick={handleCancel}
                        className="px-4 py-2 bg-white text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        disabled={isLoading}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveNew}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Saving...' : 'Create Stream'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Edit Stream Modal */}
            <ReactModal
              isOpen={isEditModalOpen}
              onRequestClose={handleCancel}
              className="fixed inset-0 flex items-center justify-center z-50"
              overlayClassName="fixed inset-0 bg-black bg-opacity-50 z-40"
              ariaHideApp={false}
            >
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Edit Stream</h3>
                  <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
                    {renderIcon(FaTimes)}
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">
                      Stream Name
                    </label>
                    <input
                      id="edit-name"
                      type="text"
                      value={editStream?.name || ''}
                      onChange={(e) => handleStreamNameChange(e, true)}
                      className={`mt-1 block w-full border ${formErrors.name ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                      placeholder="Enter stream name"
                    />
                    {formErrors.name && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="edit-class" className="block text-sm font-medium text-gray-700">
                      Class
                    </label>
                    <select
                      id="edit-class"
                      value={editStream?.class_id || ''}
                      onChange={(e) => handleClassChange(e, true)}
                      className={`mt-1 block w-full border ${formErrors.class_id ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                    >
                      <option value="">Select a class</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                      ))}
                    </select>
                    {formErrors.class_id && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.class_id}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      id="edit-description"
                      value={editStream?.description || ''}
                      onChange={(e) => setEditStream({ ...editStream!, description: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter stream description"
                    ></textarea>
                  </div>
                  <div className="flex justify-end space-x-3 mt-5">
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 bg-white text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      disabled={isLoading}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            </ReactModal>
            
            {/* Streams Table */}
            {!isLoading && (
              <div className="bg-white shadow-md rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stream Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Class
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subjects
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAndSortedStreams.map(stream => (
                      <tr key={stream.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{stream.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                              {stream.class_id ? getClassName(stream.class_id) : 'None'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500 max-w-xs">{stream.description}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {renderSubjectsCount(stream.subjects || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {stream.createdAt.toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-3">
                            <button 
                              onClick={() => handleEdit(stream)} 
                              className="text-blue-600 hover:text-blue-900 disabled:text-blue-300 disabled:cursor-not-allowed"
                              disabled={isLoading}
                            >
                              {renderIcon(FaEdit)}
                            </button>
                            <button 
                              onClick={() => handleDelete(stream.id)} 
                              className="text-red-600 hover:text-red-900 disabled:text-red-300 disabled:cursor-not-allowed"
                              disabled={isLoading}
                            >
                              {renderIcon(FaTrash)}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    
                    {filteredAndSortedStreams.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                          {searchTerm ? 'No streams match your search criteria.' : 'No streams available. Add your first stream!'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default StreamPage; 