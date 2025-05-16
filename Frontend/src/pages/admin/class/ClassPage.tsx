import React, { useState, useEffect } from 'react';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaTimes, FaChalkboardTeacher, FaSync, FaBookOpen } from 'react-icons/fa';
import AdminSidebar from '../AdminSidebar';
import MainLayout from '../../../components/layout/MainLayout';
import { IconType, IconBaseProps } from 'react-icons';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';
import ReactModal from 'react-modal';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
interface ClassPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

interface ClassData {
  id: string;
  name: string;
  description: string;
  subjects?: number;
  createdAt: Date;
}

// API data interface to match the endpoint requirements
interface ClassApiData {
  name: string;
  description: string;
}

const ClassPage: React.FC<ClassPageProps> = ({ user, onLogout }) => {
  // State for classes data
  const [classes, setClasses] = useState<ClassData[]>([]);
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState('name-asc');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [newClass, setNewClass] = useState({ name: '', description: '' });
  const [editClass, setEditClass] = useState<ClassData | null>(null);
  const { token } = useAuth();
  
  // Form validation errors
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});

  // Fetch classes data from API when component mounts
  useEffect(() => {
    fetchClasses();
  }, [token]);

  // Fetch subjects to count per class
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
      
      const subjectsByClass = new Map<string, number>();
      
      // Process the subjects response data
      if (Array.isArray(response.data)) {
        console.log('Subject data sample:', response.data[0]);
        
        response.data.forEach((subject: any) => {
          // Extract class ID either directly or through stream
          let classId: string | undefined;
          
          if (subject.stream && subject.stream.class_ && subject.stream.class_.id) {
            // Get class ID from the nested stream object
            classId = String(subject.stream.class_.id);
          }
          
          if (classId) {
            subjectsByClass.set(
              classId, 
              (subjectsByClass.get(classId) || 0) + 1
            );
          }
        });
      }
      
      console.log('Subjects by class:', Object.fromEntries(subjectsByClass));
      return subjectsByClass;
    } catch (err) {
      console.error('Error fetching subjects data:', err);
      return new Map();
    }
  };

  // Function to refresh subject counts
  const handleRefresh = async () => {
    setIsLoading(true);
    
    try {
      // Fetch latest subjects count
      const subjectCountMap = await fetchSubjectsCount();
      
      // Update classes with fresh counts
      setClasses(prevClasses => 
        prevClasses.map(classData => ({
          ...classData,
          subjects: subjectCountMap.get(String(classData.id)) || 0
        }))
      );
    } catch (error) {
      console.error('Error refreshing subjects count:', error);
      setError('Failed to refresh subject counts');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClasses = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`${API_URL}/api/classes/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Get subject counts per class
      const subjectCountMap = await fetchSubjectsCount();
      
      // Transform API data to match our interface
      const formattedData = response.data.map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        subjects: subjectCountMap.get(String(item.id)) || 0,
        createdAt: new Date(item.created_at || new Date())
      }));
      
      setClasses(formattedData);
    } catch (err) {
      console.error('Error fetching classes:', err);
      setError('Failed to load classes. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  // Handle add new class
  const handleAddNew = () => {
    setIsAddingNew(true);
    setNewClass({ name: '', description: '' });
  };
  
  // Check if a class name already exists
  const isClassNameDuplicate = (name: string, currentId?: string): boolean => {
    return classes.some(cls => 
      cls.name.toLowerCase() === name.toLowerCase() && 
      (!currentId || cls.id !== currentId)
    );
  };

  // Validate form input
  const validateClassForm = (name: string, isEdit: boolean = false, currentId?: string): boolean => {
    const errors: {[key: string]: string} = {};
    
    // Check for empty name
    if (!name.trim()) {
      errors.name = 'Class name is required';
    }
    // Check for duplicate name
    else if (isClassNameDuplicate(name, isEdit ? currentId : undefined)) {
      errors.name = 'A class with this name already exists';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Clear errors when input changes
  const handleNewClassNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewClass({ ...newClass, name: value });
    
    // Clear name error if it exists
    if (formErrors.name) {
      const updatedErrors = { ...formErrors };
      delete updatedErrors.name;
      setFormErrors(updatedErrors);
    }
  };

  // Clear errors when edit input changes
  const handleEditClassNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (editClass) {
      setEditClass({ ...editClass, name: value });
      
      // Clear name error if it exists
      if (formErrors.name) {
        const updatedErrors = { ...formErrors };
        delete updatedErrors.name;
        setFormErrors(updatedErrors);
      }
    }
  };

  // Handle save new class
  const handleSaveNew = async () => {
    // Validate form before submission
    if (!validateClassForm(newClass.name)) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const apiData: ClassApiData = {
        name: newClass.name,
        description: newClass.description
      };
      
      const response = await axios.post(`${API_URL}/api/classes/`, apiData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const newClassItem: ClassData = {
        id: response.data.id,
        name: response.data.name,
        description: response.data.description,
        subjects: 0,
        createdAt: new Date(response.data.created_at || new Date())
      };
      
      setClasses([...classes, newClassItem]);
      setIsAddingNew(false);
      setNewClass({ name: '', description: '' });
      setFormErrors({});
    } catch (err) {
      console.error('Error creating class:', err);
      setError('Failed to create class. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle edit class
  const handleEdit = (classData: ClassData) => {
    setEditClass(classData);
    setIsEditModalOpen(true);
  };
  
  // Handle save edit
  const handleSaveEdit = async () => {
    if (!editClass) return;
    
    // Validate form before submission
    if (!validateClassForm(editClass.name, true, editClass.id)) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const apiData: ClassApiData = {
        name: editClass.name,
        description: editClass.description
      };
      
      await axios.put(`${API_URL}/api/classes/${editClass.id}/`, apiData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      await fetchClasses();
      setIsEditModalOpen(false);
      setEditClass(null);
      setFormErrors({});
    } catch (err) {
      console.error('Error updating class:', err);
      setError('Failed to update class. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle delete class
  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this class?')) {
      setIsLoading(true);
      setError(null);
      
      try {
        await axios.delete(`${API_URL}/api/classes/${id}/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        setClasses(classes.filter(cls => cls.id !== id));
      } catch (err) {
        console.error('Error deleting class:', err);
        setError('Failed to delete class. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  // Cancel editing or adding
  const handleCancel = () => {
    setIsAddingNew(false);
    setIsEditModalOpen(false);
    setEditClass(null);
  };
  
  // Handle sort change
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value);
  };
  
  // Filter and sort classes
  const filteredAndSortedClasses = React.useMemo(() => {
    let result = [...classes];
    
    if (searchTerm) {
      result = result.filter(cls => 
        cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    switch (sortBy) {
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'subjects-asc':
        result.sort((a, b) => (a.subjects || 0) - (b.subjects || 0));
        break;
      case 'subjects-desc':
        result.sort((a, b) => (b.subjects || 0) - (a.subjects || 0));
        break;
      case 'date-asc':
        result.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        break;
      case 'date-desc':
        result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      default:
        break;
    }
    
    return result;
  }, [classes, searchTerm, sortBy]);
  
  // Helper function to render icons properly
  const renderIcon = (Icon: IconType, customClassName?: string) => {
    return React.createElement(Icon as React.ComponentType<IconBaseProps>, { 
      className: customClassName || "h-5 w-5",
      size: 20
    });
  };
  
  // Helper function to render subject counts with a badge
  const renderSubjectsCount = (count: number) => (
    <div className="text-sm font-medium">
      <span 
        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
          count > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}
        title={count > 0 ? `This class has ${count} subject${count === 1 ? '' : 's'} assigned` : 'No subjects assigned to this class'}
      >
        {count} {count === 1 ? 'Subject' : 'Subjects'}
      </span>
    </div>
  );
  
  // Calculate summary statistics
  const subjectsSummary = React.useMemo(() => {
    const totalSubjects = classes.reduce((sum, cls) => sum + (cls.subjects || 0), 0);
    const classesWithSubjects = classes.filter(cls => (cls.subjects || 0) > 0).length;
    const classesWithoutSubjects = classes.length - classesWithSubjects;
    
    return {
      totalSubjects,
      classesWithSubjects,
      classesWithoutSubjects
    };
  }, [classes]);

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<AdminSidebar />}>
      <div className="h-screen bg-gray-50 overflow-hidden flex flex-col">
        {/* Header Section */}
        <div className="bg-blue-600 text-white py-4 px-6 flex-none">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center space-x-2">
              {renderIcon(FaChalkboardTeacher, "text-xl")}
              <div>
                <h1 className="text-xl font-semibold">Manage Classes</h1>
                <p className="text-sm text-blue-100">Add and manage academic classes</p>
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
                  placeholder="Search classes..."
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
              <span>Add Class</span>
            </button>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-grow overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
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
            
            {/* Add New Class Form */}
            {isAddingNew && (
              <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Add New Class</h3>
                    <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
                      {renderIcon(FaTimes)}
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="new-name" className="block text-sm font-medium text-gray-700">
                        Class Name
                      </label>
                      <input
                        id="new-name"
                        type="text"
                        value={newClass.name}
                        onChange={handleNewClassNameChange}
                        className={`mt-1 block w-full border ${formErrors.name ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                        placeholder="Enter class name"
                      />
                      {formErrors.name && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="new-description" className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        id="new-description"
                        value={newClass.description}
                        onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                        rows={3}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Enter class description"
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
                        {isLoading ? 'Saving...' : 'Save Class'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Class Modal */}
            <ReactModal
              isOpen={isEditModalOpen}
              onRequestClose={handleCancel}
              className="fixed inset-0 flex items-center justify-center z-50"
              overlayClassName="fixed inset-0 bg-black bg-opacity-50 z-40"
              ariaHideApp={false}
            >
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Edit Class</h3>
                  <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
                    {renderIcon(FaTimes)}
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">
                      Name
                    </label>
                    <input
                      id="edit-name"
                      type="text"
                      value={editClass?.name || ''}
                      onChange={handleEditClassNameChange}
                      className={`mt-1 block w-full border ${formErrors.name ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                      placeholder="Enter class name"
                    />
                    {formErrors.name && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      id="edit-description"
                      value={editClass?.description || ''}
                      onChange={(e) => setEditClass({ ...editClass!, description: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter class description"
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
            
            {/* Classes Table */}
            {!isLoading && (
              <div className="bg-white shadow-md rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Class Name
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
                    {filteredAndSortedClasses.map(classData => (
                      <tr key={classData.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{classData.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500 max-w-xs">{classData.description}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {renderSubjectsCount(classData.subjects || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {classData.createdAt.toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-3">
                            <button 
                              onClick={() => handleEdit(classData)} 
                              className="text-blue-600 hover:text-blue-900 disabled:text-blue-300 disabled:cursor-not-allowed"
                              disabled={isLoading}
                            >
                              {renderIcon(FaEdit)}
                            </button>
                            <button 
                              onClick={() => handleDelete(classData.id)} 
                              className="text-red-600 hover:text-red-900 disabled:text-red-300 disabled:cursor-not-allowed"
                              disabled={isLoading}
                            >
                              {renderIcon(FaTrash)}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    
                    {filteredAndSortedClasses.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                          {searchTerm ? 'No classes match your search criteria.' : 'No classes available. Add your first class!'}
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

export default ClassPage; 