import React, { useState, useEffect } from 'react';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaSave, FaTimes, FaLayerGroup } from 'react-icons/fa';
import AdminSidebar from '../AdminSidebar';
import MainLayout from '../../../components/layout/MainLayout';
import { IconType, IconBaseProps } from 'react-icons';
import axios from 'axios';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
// API base URL

// Create axios instance with default config
const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface ChapterPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

// API Interfaces
interface ChapterCreate {
  name: string;
  description: string;
  subject_id: number;
  chapter_number: number;
}

interface ChapterResponse {
  id: number;
  name: string;
  description: string;
  subject_id: number;
  chapter_number: number;
  created_by: number;
  created_at: string;
  updated_at: string | null;
  subject: Subject;
  topics: Topic[];
  creator: Creator;
}

interface Subject {
  id: number;
  name: string;
  code: string;
  description: string;
  stream_id: number;
  stream: Stream;
}

interface Topic {
  id: number;
  name: string;
  description: string;
  chapter_id: number;
}

interface Creator {
  id: number;
  username: string;
  email: string;
  role: string;
}

// Frontend interfaces for form handling
interface ChapterFormData {
  name: string;
  description: string;
  subject_id: number;
  chapter_number: number;
}

// Updated Chapter interface to match API response
interface Chapter {
  id: number;
  name: string;
  description: string;
  subject_id: number;
  chapter_number: number;
  created_by: number;
  created_at: Date;
  updated_at: Date | null;
  subject: Subject;
  topics: Topic[];
  creator: Creator;
}

interface Stream {
  id: number;
  name: string;
  description: string;
  class_id: number;
  class_: Class;
}

interface Class {
  id: number;
  name: string;
  description: string;
}

const ChapterPage: React.FC<ChapterPageProps> = ({ user, onLogout }) => {
  // State for chapters data
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState('name-asc');
  
  // API related state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedStream, setSelectedStream] = useState<number>(0);
  const [selectedClass, setSelectedClass] = useState<number>(0);
  const [selectedSubject, setSelectedSubject] = useState<number>(0);
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
  const [filteredStreams, setFilteredStreams] = useState<Stream[]>([]);
  
  // Form state
  const [newChapter, setNewChapter] = useState<ChapterFormData>({ 
    name: '', 
    description: '', 
    subject_id: 0,
    chapter_number: 1
  });
  const [editChapter, setEditChapter] = useState<ChapterFormData | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Form errors state
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});

  // Fetch subjects from API
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await api.get('/subjects');
        setSubjects(response.data);
      } catch (error) {
        console.error('Error fetching subjects:', error);
        setError('Failed to fetch subjects');
      }
    };

    fetchSubjects();
  }, []);

  // Fetch streams from API
  useEffect(() => {
    const fetchStreams = async () => {
      try {
        const response = await api.get('/streams/');
        setStreams(response.data);
      } catch (error) {
        console.error('Error fetching streams:', error);
      }
    };
    fetchStreams();
  }, []);

  // Fetch classes from API
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await api.get('/classes');
        if (response.data && Array.isArray(response.data)) {
        setClasses(response.data);
        } else {
          console.error('Invalid response format for classes');
          setClasses([]);
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
        setClasses([]);
      }
    };
    fetchClasses();
  }, []);

  // Filter streams based on selected class
  useEffect(() => {
    if (!selectedClass) {
      setFilteredStreams([]);
      setSelectedStream(0);
      return;
    }
    // Filter streams based on selected class
    const streamsForClass = streams.filter(stream => stream.class_id === selectedClass);
    setFilteredStreams(streamsForClass);
  }, [selectedClass, streams]);

  // Filter subjects based on selected stream
  useEffect(() => {
    if (!selectedStream) {
      setFilteredSubjects([]);
      setSelectedSubject(0);
      return;
    }
    // Filter subjects based on selected stream
    const subjectsForStream = subjects.filter(subject => subject.stream_id === selectedStream);
    setFilteredSubjects(subjectsForStream);
  }, [selectedStream, subjects]);

  // Fetch chapters from API
  useEffect(() => {
    const fetchChapters = async () => {
      try {
        setLoading(true);
        const response = await api.get('/chapters/');
        setChapters(response.data.map((chapter: ChapterResponse) => ({
          ...chapter,
          created_at: new Date(chapter.created_at),
          updated_at: chapter.updated_at ? new Date(chapter.updated_at) : null
        })));
      } catch (error) {
        console.error('Error fetching chapters:', error);
        setError('Failed to fetch chapters');
      } finally {
        setLoading(false);
      }
    };

    fetchChapters();
  }, []);

  // Check if a chapter name already exists for the given subject
  const isChapterNameDuplicateForSubject = (name: string, subjectId: number, currentId?: number): boolean => {
    return chapters.some(chapter => 
      chapter.name.toLowerCase().trim() === name.toLowerCase().trim() && 
      chapter.subject_id === subjectId &&
      (!currentId || chapter.id !== currentId)
    );
  };

  // Check if a chapter number already exists for the given subject
  const isChapterNumberDuplicateForSubject = (chapterNumber: number, subjectId: number, currentId?: number): boolean => {
    return chapters.some(chapter => 
      chapter.chapter_number === chapterNumber && 
      chapter.subject_id === subjectId &&
      (!currentId || chapter.id !== currentId)
    );
  };

  // Modified: Only check for duplicates within the same subject (exactly same class, stream and subject)
  const isChapterNameDuplicateInHierarchy = (
    name: string, 
    subjectId: number, 
    currentId?: number
  ): boolean => {
    // This function is now simplified as we only want to check for duplicates
    // within the same subject, which is already handled by isChapterNameDuplicateForSubject
    return false; // No longer needed for additional hierarchy checks
  };

  // Enhanced form validation with simplified hierarchy checks
  const validateChapterForm = (data: ChapterFormData, isEdit: boolean = false, currentId?: number): boolean => {
    const errors: {[key: string]: string} = {};
    
    // Check for empty name
    if (!data.name.trim()) {
      errors.name = 'Chapter name is required';
    } else if (data.subject_id) {
      // Only check for duplicate in the same subject (which implies same class and stream)
      if (isChapterNameDuplicateForSubject(data.name, data.subject_id, isEdit ? currentId : undefined)) {
        errors.name = 'A chapter with this name already exists for the selected subject';
      }
      // We no longer check for duplicates across different subjects in the same class/stream
    }

    // Check for empty subject
    if (!data.subject_id) {
      errors.subject_id = 'Subject is required';
    }

    // Check for valid chapter number
    if (!data.chapter_number || data.chapter_number < 1) {
      errors.chapter_number = 'Chapter number must be greater than 0';
    } else if (data.subject_id && isChapterNumberDuplicateForSubject(data.chapter_number, data.subject_id, isEdit ? currentId : undefined)) {
      // Check for duplicate chapter number in the same subject
      errors.chapter_number = 'A chapter with this number already exists for the selected subject';
    }
    
    console.log('Validation errors:', errors);
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form input changes
  const handleFormInputChange = (field: string, value: string | number, isEdit: boolean = false) => {
    if (isEdit && editChapter) {
      setEditChapter({
        ...editChapter,
        [field]: value
      });
    } else {
      setNewChapter({
        ...newChapter,
        [field]: value
      });
    }
    
    // Clear error for this field if it exists
    if (formErrors[field]) {
      const updatedErrors = { ...formErrors };
      delete updatedErrors[field];
      setFormErrors(updatedErrors);
    }
    
    // If changing subject, also clear name error since it's related to the subject context
    if (field === 'subject_id' && formErrors.name) {
      const updatedErrors = { ...formErrors };
      delete updatedErrors.name;
      setFormErrors(updatedErrors);
    }
  };
  
  // Enhanced form input handling to refresh validation when class/stream changes
  const handleClassChange = (value: number) => {
    setSelectedClass(value);
    setSelectedStream(0);
    setSelectedSubject(0);
    
    // Reset subject_id in forms
    if (editChapter) {
      setEditChapter({...editChapter, subject_id: 0});
    } else {
      setNewChapter({...newChapter, subject_id: 0});
    }
    
    // Clear related errors
    const updatedErrors = { ...formErrors };
    delete updatedErrors.name;
    delete updatedErrors.subject_id;
    delete updatedErrors.chapter_number;
    setFormErrors(updatedErrors);
  };
  
  const handleStreamChange = (value: number) => {
    setSelectedStream(value);
    setSelectedSubject(0);
    
    // Reset subject_id in forms
    if (editChapter) {
      setEditChapter({...editChapter, subject_id: 0});
    } else {
      setNewChapter({...newChapter, subject_id: 0});
    }
    
    // Clear related errors
    const updatedErrors = { ...formErrors };
    delete updatedErrors.name;
    delete updatedErrors.subject_id;
    delete updatedErrors.chapter_number;
    setFormErrors(updatedErrors);
  };

  // Handle save new chapter
  const handleSaveNew = async () => {
    // First validate the form
    if (!validateChapterForm(newChapter)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const chapterData = {
        name: newChapter.name.trim(),
        description: newChapter.description.trim(),
        subject_id: newChapter.subject_id,
        chapter_number: newChapter.chapter_number
      };

      const response = await api.post('/chapters/', chapterData);
      const newChapterResponse: ChapterResponse = response.data;
      
      setChapters(prevChapters => [...prevChapters, {
        ...newChapterResponse,
        created_at: new Date(newChapterResponse.created_at),
        updated_at: newChapterResponse.updated_at ? new Date(newChapterResponse.updated_at) : null,
        subject: newChapterResponse.subject,
        topics: newChapterResponse.topics || [],
        creator: newChapterResponse.creator
      }]);

      setIsAddingNew(false);
    setNewChapter({ 
      name: '', 
      description: '', 
        subject_id: 0,
        chapter_number: 1
      });
      setFormErrors({});
    } catch (error: any) {
      console.error('Error creating chapter:', error);
      setError(error.response?.data?.detail || 'Failed to create chapter');
    } finally {
      setLoading(false);
    }
  };
  
  const handleEdit = (chapter: Chapter) => {
    setEditingId(chapter.id);
    
    // Set the selected class based on the subject's stream's class_id
    if (chapter.subject?.stream?.class_id) {
      setSelectedClass(chapter.subject.stream.class_id);
    }
    
    // Set the selected stream based on the subject's stream_id
    if (chapter.subject?.stream_id) {
      setSelectedStream(chapter.subject.stream_id);
    }
    
    // Map the chapter data to match the API format
    setEditChapter({
      name: chapter.name,
      description: chapter.description || '',
      subject_id: chapter.subject_id,
      chapter_number: chapter.chapter_number
    });
    
    setIsEditModalOpen(true);
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!editChapter || !editingId) return;

    // First validate the form
    if (!validateChapterForm(editChapter, true, editingId)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await api.put(`/chapters/${editingId}`, editChapter);
      const updatedChapterResponse: ChapterResponse = response.data;
      
      setChapters(prevChapters => prevChapters.map(chapter => 
        chapter.id === editingId ? {
          ...updatedChapterResponse,
          created_at: new Date(updatedChapterResponse.created_at),
          updated_at: updatedChapterResponse.updated_at ? new Date(updatedChapterResponse.updated_at) : null,
          subject: updatedChapterResponse.subject,
          topics: updatedChapterResponse.topics,
          creator: updatedChapterResponse.creator
        } : chapter
    ));
    
    setEditingId(null);
    setEditChapter(null);
      setIsEditModalOpen(false);
      setFormErrors({});
    } catch (error) {
      console.error('Error updating chapter:', error);
      setError('Failed to update chapter');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this chapter?')) return;

    try {
      setLoading(true);
      setError(null);

      await api.delete(`/chapters/${id}`);
      setChapters(prevChapters => prevChapters.filter(chapter => chapter.id !== id));
    } catch (error) {
      console.error('Error deleting chapter:', error);
      setError('Failed to delete chapter');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort chapters
  const filteredAndSortedChapters = React.useMemo(() => {
    let result = [...chapters];
    
    // Filter by search term
    if (searchTerm) {
      result = result.filter(chapter => 
        chapter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chapter.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by subject
    if (selectedSubject) {
      result = result.filter(chapter => chapter.subject_id === selectedSubject);
    }
    // Filter by class (through subjects)
    else if (selectedClass) {
      result = result.filter(chapter => chapter.subject?.stream?.class_?.id === selectedClass);
    }
    // Filter by stream (through subjects)
    else if (selectedStream) {
      result = result.filter(chapter => chapter.subject?.stream?.id === selectedStream);
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
        result.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
        break;
      case 'date-desc':
        result.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
        break;
      default:
        break;
    }
    
    return result;
  }, [chapters, searchTerm, sortBy, selectedStream, selectedClass, selectedSubject]);
  
  // Helper function to render icons properly
  const renderIcon = (Icon: IconType, customClassName?: string) => {
    return React.createElement(Icon as React.ComponentType<IconBaseProps>, { 
      className: customClassName || "h-5 w-5",
      size: 20
    });
  };

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<AdminSidebar />}>
      <div className="h-screen bg-gray-50 overflow-hidden flex flex-col">
        {/* Header Section */}
        <div className="bg-blue-600 text-white py-4 px-4 sm:px-6 flex-none">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center space-x-2">
              {renderIcon(FaLayerGroup, "text-xl")}
              <div>
                <h1 className="text-xl font-semibold">Manage Chapters</h1>
                <p className="text-sm text-blue-100">Add and manage subject chapters</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Search and Filter Bar */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Box */}
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {renderIcon(FaSearch, "text-gray-400")}
                </div>
                <input
                  type="text"
                  placeholder="Search chapters..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            {/* Filter Dropdowns */}
            <div className="flex flex-wrap gap-4">
                  <select
                value={selectedClass}
                onChange={(e) => handleClassChange(Number(e.target.value))}
                className="w-full sm:w-40 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={0}>All Classes</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
                  </select>

              <select
                value={selectedStream}
                onChange={(e) => handleStreamChange(Number(e.target.value))}
                className="w-full sm:w-40 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                disabled={!selectedClass}
              >
                <option value={0}>All Streams</option>
                {filteredStreams.map(stream => (
                  <option key={stream.id} value={stream.id}>{stream.name}</option>
                ))}
                  </select>

                  <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(Number(e.target.value))}
                className="w-full sm:w-40 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                disabled={!selectedStream}
              >
                <option value={0}>All Subjects</option>
                {filteredSubjects.map(subject => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
                  </select>
                
                  <select
                    value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full sm:w-40 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="name-asc">Name (A-Z)</option>
                    <option value="name-desc">Name (Z-A)</option>
                    <option value="date-asc">Date (Oldest first)</option>
                    <option value="date-desc">Date (Newest first)</option>
                  </select>
              </div>
              
            {/* Add Chapter Button */}
            <div className="flex-none">
                <button
                onClick={() => setIsAddingNew(true)}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  {renderIcon(FaPlus)}
                  <span>Add Chapter</span>
                </button>
            </div>
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-grow overflow-auto p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            {/* Enhanced Add New Chapter Form */}
            {isAddingNew && (
              <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                <div className="relative top-20 mx-auto p-5 border w-[600px] shadow-lg rounded-md bg-white">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Add New Chapter</h3>
                    <button
                      onClick={() => setIsAddingNew(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      {renderIcon(FaTimes)}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Class</label>
                      <select
                        value={selectedClass}
                        onChange={(e) => handleClassChange(Number(e.target.value))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value={0}>Select Class</option>
                        {classes.map(cls => (
                          <option key={cls.id} value={cls.id}>{cls.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Stream</label>
                      <select
                        value={selectedStream}
                        onChange={(e) => handleStreamChange(Number(e.target.value))}
                        disabled={!selectedClass}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
                      >
                        <option value={0}>Select Stream</option>
                        {filteredStreams.map(stream => (
                          <option key={stream.id} value={stream.id}>{stream.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                    <label className="block text-sm font-medium text-gray-700">Subject <span className="text-red-500">*</span></label>
                      <select
                      value={newChapter.subject_id}
                        onChange={(e) => handleFormInputChange('subject_id', parseInt(e.target.value))}
                        disabled={!selectedStream}
                        className={`mt-1 block w-full rounded-md ${formErrors.subject_id ? 'border-red-300 ring-red-500' : 'border-gray-300'} shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100`}
                    >
                        <option value={0}>Select Subject</option>
                      {filteredSubjects.map(subject => (
                        <option key={subject.id} value={subject.id}>{subject.name}</option>
                        ))}
                      </select>
                      {formErrors.subject_id && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.subject_id}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Chapter Number <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      value={newChapter.chapter_number}
                        onChange={(e) => handleFormInputChange('chapter_number', parseInt(e.target.value))}
                        className={`mt-1 block w-full rounded-md ${formErrors.chapter_number ? 'border-red-300 ring-red-500' : 'border-gray-300'} shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                        min="1"
                      />
                      {formErrors.chapter_number && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.chapter_number}</p>
                      )}
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Chapter Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={newChapter.name}
                        onChange={(e) => handleFormInputChange('name', e.target.value)}
                        className={`mt-1 block w-full rounded-md ${formErrors.name ? 'border-red-300 ring-red-500' : 'border-gray-300'} shadow-sm focus:border-blue-500 focus:ring-blue-500`}
                    />
                      {formErrors.name && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                      )}
                  </div>

                    <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      value={newChapter.description}
                        onChange={(e) => handleFormInputChange('description', e.target.value)}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                  </div>

                    <div className="col-span-2 flex justify-end space-x-3 mt-4">
                    <button
                      onClick={() => setIsAddingNew(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveNew}
                        disabled={!newChapter.subject_id || !newChapter.name.trim() || loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-blue-400"
                    >
                      {loading ? 'Saving...' : 'Save Chapter'}
                    </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            {loading && !isAddingNew && (
              <div className="flex justify-center items-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && editChapter && (
              <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Edit Chapter</h3>
                    <button
                      onClick={() => {
                        setIsEditModalOpen(false);
                        setEditingId(null);
                        setEditChapter(null);
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      {renderIcon(FaTimes)}
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Chapter Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={editChapter.name}
                        onChange={(e) => handleFormInputChange('name', e.target.value, true)}
                        className={`mt-1 block w-full rounded-md ${formErrors.name ? 'border-red-300 ring-red-500' : 'border-gray-300'} shadow-sm focus:ring-blue-500 focus:border-blue-500`}
                      />
                      {formErrors.name && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Subject <span className="text-red-500">*</span></label>
                      <select
                        value={editChapter.subject_id}
                        onChange={(e) => handleFormInputChange('subject_id', parseInt(e.target.value), true)}
                        className={`mt-1 block w-full rounded-md ${formErrors.subject_id ? 'border-red-300 ring-red-500' : 'border-gray-300'} shadow-sm focus:ring-blue-500 focus:border-blue-500`}
                      >
                        <option value={0}>Select Subject</option>
                        {filteredSubjects.length > 0 ? 
                          filteredSubjects.map(subject => (
                          <option key={subject.id} value={subject.id}>{subject.name}</option>
                          )) : (
                            <option value={editChapter.subject_id}>Current Subject</option>
                        )}
                      </select>
                      {formErrors.subject_id && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.subject_id}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Chapter Number <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        value={editChapter.chapter_number}
                        onChange={(e) => handleFormInputChange('chapter_number', parseInt(e.target.value), true)}
                        className={`mt-1 block w-full rounded-md ${formErrors.chapter_number ? 'border-red-300 ring-red-500' : 'border-gray-300'} shadow-sm focus:ring-blue-500 focus:border-blue-500`}
                        min="1"
                      />
                      {formErrors.chapter_number && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.chapter_number}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <textarea
                        value={editChapter.description}
                        onChange={(e) => handleFormInputChange('description', e.target.value, true)}
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="flex justify-end space-x-3 mt-5">
                      <button
                        onClick={() => {
                          setIsEditModalOpen(false);
                          setEditingId(null);
                          setEditChapter(null);
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                        disabled={loading}
                      >
                        {loading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Chapters Table */}
            <div className="bg-white shadow-md rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Chapter Name
                      </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subject
                      </th>
                      
                     
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Chapter Number
                      </th>
                   
                    
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAndSortedChapters.map(chapter => (
                    <tr key={chapter.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{chapter.name}</div>
                        </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                            {chapter.subject?.name}
                          </div>
                        </td>
                        
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{chapter.chapter_number}</div>
                        </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(chapter.created_at).toLocaleDateString()}
                        </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                          <button onClick={() => handleEdit(chapter)} className="text-blue-600 hover:text-blue-900">
                                {renderIcon(FaEdit)}
                              </button>
                          <button onClick={() => handleDelete(chapter.id)} className="text-red-600 hover:text-red-900">
                                {renderIcon(FaTrash)}
                              </button>
                            </div>
                        </td>
                      </tr>
                    ))}
                    {filteredAndSortedChapters.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                        {searchTerm ? 'No chapters match your search criteria.' : 'No chapters available.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ChapterPage;