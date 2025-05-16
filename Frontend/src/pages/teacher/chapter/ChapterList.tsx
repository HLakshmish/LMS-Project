import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TeacherSidebar from '../sidebar/TeacherSidebar';
import MainLayout from '../../../components/layout/MainLayout';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';

const API_URL = process.env.REACT_APP_API_URL;
console.log('API_URL:', API_URL);
const BASE_URL = API_URL || 'http://localhost:8000';

// Define the DashboardPageProps interface since we can't import it from App.tsx
interface DashboardPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
    [key: string]: any;
  };
  onLogout: () => void;
}

// Define the Chapter interface
interface Chapter {
  id: number;
  title: string;
  subjectName: string;
  streamName: string;
  chapter_number?: string;
}

// Define the Stream interface
interface Stream {
  id: number;
  name: string;
  description?: string;
  class_id: number;
  class_?: {
    id: number;
    name: string;
  }
}

// Define the Class interface
interface Class {
  id: number;
  name: string;
  description?: string;
}

// Define the Subject interface based on API response
interface Subject {
  id: number;
  name: string;
  stream_id?: number;
  stream?: {
    id: number;
    name: string;
    class_id?: number;
    class_?: {
      id: number;
      name: string;
    }
  }
}

// Define the ChapterDetail interface based on API response
interface ChapterDetail {
  id: number;
  name: string;
  subject_id: number;
  created_at: string;
  updated_at: string | null;
  subject: Subject;
}

const ChapterList: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<ChapterDetail | null>(null);
  const [chapterToDelete, setChapterToDelete] = useState<Chapter | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isLoadingChapterDetail, setIsLoadingChapterDetail] = useState(false);
  const [newChapter, setNewChapter] = useState({ 
    title: '', 
    subjectId: '',
    description: '',
    chapter_number: '' 
  });
  const [editChapter, setEditChapter] = useState({
    id: 0,
    name: '',
    subjectId: '',
    description: '',
    chapter_number: ''
  });
  const [validationErrors, setValidationErrors] = useState({ 
    title: '', 
    subjectId: '',
    subject_id: '',
    chapter_number: ''
  });
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('');
  const { token } = useAuth();
  const navigate = useNavigate();

  // Add new state for filtering
  const [classes, setClasses] = useState<Class[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [selectedClass, setSelectedClass] = useState<number>(0);
  const [selectedStream, setSelectedStream] = useState<number>(0);
  const [selectedSubject, setSelectedSubject] = useState<number>(0);
  const [filteredStreams, setFilteredStreams] = useState<Stream[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);

  // Update the filtering logic
  const filteredChapters = React.useMemo(() => {
    let result = [...chapters];
    
    // Filter by subject
    if (selectedSubject) {
      result = result.filter(chapter => 
        chapter.subjectName === subjects.find(s => s.id === selectedSubject)?.name
      );
    }
    // Filter by stream
    else if (selectedStream) {
      result = result.filter(chapter => 
        chapter.streamName === streams.find(s => s.id === selectedStream)?.name
      );
    }
    // Filter by class
    else if (selectedClass) {
      result = result.filter(chapter => {
        const stream = streams.find(s => s.class_id === selectedClass);
        return stream ? chapter.streamName === stream.name : false;
      });
    }
    
    return result;
  }, [chapters, selectedClass, selectedStream, selectedSubject, subjects, streams]);

  // Add the filter section component
  const filterSection = (
    <div className="mb-6 bg-gray-50 rounded-lg p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="mb-2 sm:mb-0">
          <h3 className="text-sm font-medium text-gray-700">Filter Chapters</h3>
        </div>
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
              <option key={stream.id} value={stream.id}>
                {stream.name} {stream.class_?.name ? `(${stream.class_.name})` : ''}
              </option>
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
        </div>
      </div>
      {(selectedClass || selectedStream || selectedSubject) && (
        <div className="mt-3 flex items-center">
          <span className="text-sm text-gray-600 mr-2">Active filters:</span>
          {selectedClass && (
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-2">
              {classes.find(c => c.id === selectedClass)?.name}
            </span>
          )}
          {selectedStream && (
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-2">
              {streams.find(s => s.id === selectedStream)?.name}
            </span>
          )}
          {selectedSubject && (
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {subjects.find(s => s.id === selectedSubject)?.name}
            </span>
          )}
          <button
            onClick={() => {
              setSelectedClass(0);
              setSelectedStream(0);
              setSelectedSubject(0);
            }}
            className="ml-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Clear all
          </button>
        </div>
      )}
      <div className="mt-2 text-sm text-gray-500">
        Showing {filteredChapters.length} of {chapters.length} chapters
        {filteredChapters.length === 0 && ' (No chapters match the current filters)'}
      </div>
    </div>
  );

  // Fetch chapters from the API
  useEffect(() => {
    const fetchChapters = async () => {
      try {
    setIsLoading(true);
        const response = await axios.get(`${BASE_URL}/api/chapters/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('count:', response.data.length);
        
        
        if (response.data && Array.isArray(response.data)) {
          // Map API data to Chapter interface
          const mappedChapters = response.data.map((chapter: any) => {
        
            return {
              id: chapter.id,
              title: chapter.name || chapter.title || 'Untitled', // Handle both possible field names
              subjectName: chapter.subject?.name || 'Unknown Subject',
              streamName: chapter.subject?.stream?.name || 'Unknown Stream' // Get stream name from subject.stream
            };
          });
          
          setChapters(mappedChapters);
        }
      } catch (error) {
        console.error('Error fetching chapters:', error);
      } finally {
      setIsLoading(false);
      }
    };

    fetchChapters();
  }, [token, refreshTrigger]);

  // Fetch subjects from the API
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setIsLoadingSubjects(true);
        const response = await axios.get(`${BASE_URL}/api/subjects/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setSubjects(response.data);
      } catch (error) {
        console.error('Error fetching subjects:', error);
      } finally {
        setIsLoadingSubjects(false);
      }
    };

    fetchSubjects();
  }, [token]);

  // Add new useEffects for fetching and filtering data
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/classes/`, {
          headers: {
            'accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch classes');
        }
        const data = await response.json();
        setClasses(data);
      } catch (err) {
        console.error('Error fetching classes:', err);
      }
    };
    fetchClasses();
  }, [token]);

  useEffect(() => {
    const fetchStreams = async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/streams/`, {
          headers: {
            'accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch streams');
        }
        const data = await response.json();
        setStreams(data);
      } catch (err) {
        console.error('Error fetching streams:', err);
      }
    };
    fetchStreams();
  }, [token]);

  // Filter streams based on selected class
  useEffect(() => {
    if (!selectedClass) {
      setFilteredStreams([]);
      setSelectedStream(0);
      return;
    }
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
    const subjectsForStream = subjects.filter(subject => subject.stream_id === selectedStream);
    setFilteredSubjects(subjectsForStream);
  }, [selectedStream, subjects]);

  const handleCreateChapter = () => {
    // Open the modal instead of navigating
    setShowModal(true);
    // Reset form state
    setNewChapter({ title: '', subjectId: '', description: '', chapter_number: '' });
    setValidationErrors({ title: '', subjectId: '', subject_id: '', chapter_number: '' });
  };

  const handleViewChapter = async (chapterId: number) => {
    try {
      setIsLoadingChapterDetail(true);
      setShowViewModal(true);
      
      const response = await axios.get(`${BASE_URL}/api/chapters/${chapterId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Chapter detail response:', response.data);
      setSelectedChapter(response.data);
    } catch (error) {
      console.error('Error fetching chapter details:', error);
      alert('Failed to load chapter details. Please try again.');
    } finally {
      setIsLoadingChapterDetail(false);
    }
  };

  const handleEditChapter = async (chapterId: number) => {
    try {
      setIsLoadingChapterDetail(true);
      
      const response = await axios.get(`${BASE_URL}/api/chapters/${chapterId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Map the API response to the edit form state
      setEditChapter({
        id: response.data.id,
        name: response.data.name,
        subjectId: response.data.subject_id.toString(),
        description: response.data.description || '',
        chapter_number: response.data.chapter_number ? response.data.chapter_number.toString() : ''
      });

      // Set the selected stream based on the subject's stream_id
      if (response.data.subject?.stream_id) {
        setSelectedStream(response.data.subject.stream_id);
      }
      
      setShowEditModal(true);
    } catch (error) {
      console.error('Error fetching chapter for edit:', error);
      alert('Failed to load chapter for editing. Please try again.');
    } finally {
      setIsLoadingChapterDetail(false);
    }
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditChapter({ 
      ...editChapter, 
      [name]: value 
    });
  };

  const submitEditChapter = async () => {
    // Validate form
    const errors = {
      title: '',
      subjectId: '',
      subject_id: '',
      chapter_number: ''
    };
    
    // Check for empty name
    if (!editChapter.name.trim()) {
      errors.title = 'Chapter name is required';
    } else {
      // Check for duplicate chapter name in the same subject
      const isDuplicateName = chapters.some(chapter => 
        chapter.title.toLowerCase().trim() === editChapter.name.toLowerCase().trim() && 
        chapter.subjectName === subjects.find(s => s.id.toString() === editChapter.subjectId)?.name &&
        chapter.id !== editChapter.id
      );
      if (isDuplicateName) {
        errors.title = 'A chapter with this name already exists for the selected subject';
      }
    }

    // Check for empty subject
    if (!editChapter.subjectId) {
      errors.subjectId = 'Subject is required';
      errors.subject_id = 'Subject is required';
    }

    // Check for valid chapter number
    if (!editChapter.chapter_number) {
      errors.chapter_number = 'Chapter number is required';
    } else {
      // Check for duplicate chapter number in the same subject
      const isDuplicateNumber = chapters.some(chapter => 
        chapter.chapter_number === editChapter.chapter_number && 
        chapter.subjectName === subjects.find(s => s.id.toString() === editChapter.subjectId)?.name &&
        chapter.id !== editChapter.id
      );
      if (isDuplicateNumber) {
        errors.chapter_number = 'A chapter with this number already exists for the selected subject';
      }
    }
    
    setValidationErrors(errors);
    
    // If there are validation errors, return early
    if (errors.title || errors.subjectId || errors.chapter_number) {
      return;
    }

    try {
      setIsLoading(true);
      
      const response = await axios.put(
        `${BASE_URL}/api/chapters/${editChapter.id}`,
        {
          name: editChapter.name,
          subject_id: parseInt(editChapter.subjectId),
          description: editChapter.description,
          chapter_number: editChapter.chapter_number ? parseInt(editChapter.chapter_number) : null
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data) {
        setRefreshTrigger(prev => prev + 1);
        alert('Chapter updated successfully!');
      }
      
      setShowEditModal(false);
    } catch (error: any) {
      console.error('Error updating chapter:', error);
      
      if (error.response?.data && typeof error.response.data === 'object') {
          const errorMessages = Object.entries(error.response.data)
            .map(([key, value]: [string, any]) => {
              if (Array.isArray(value)) {
                return `${key}: ${value.join(', ')}`;
              }
              return `${key}: ${value}`;
            })
            .join('\n');
          alert(`Failed to update chapter: \n${errorMessages}`);
      } else {
        alert('Failed to update chapter. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    // Validate form
    const errors = {
      title: '',
      subjectId: '',
      subject_id: '',
      chapter_number: ''
    };
    
    // Check for empty name
    if (!newChapter.title.trim()) {
      errors.title = 'Chapter name is required';
    } else {
      // Check for duplicate chapter name in the same subject
      const isDuplicateName = chapters.some(chapter => 
        chapter.title.toLowerCase().trim() === newChapter.title.toLowerCase().trim() && 
        chapter.subjectName === subjects.find(s => s.id.toString() === newChapter.subjectId)?.name
      );
      if (isDuplicateName) {
        errors.title = 'A chapter with this name already exists for the selected subject';
      }
    }

    // Check for empty subject
    if (!newChapter.subjectId) {
      errors.subjectId = 'Subject is required';
      errors.subject_id = 'Subject is required';
    }

    // Check for valid chapter number
    if (!newChapter.chapter_number) {
      errors.chapter_number = 'Chapter number is required';
    } else {
      // Check for duplicate chapter number in the same subject
      const isDuplicateNumber = chapters.some(chapter => 
        chapter.chapter_number === newChapter.chapter_number && 
        chapter.subjectName === subjects.find(s => s.id.toString() === newChapter.subjectId)?.name
      );
      if (isDuplicateNumber) {
      errors.chapter_number = 'A chapter with this number already exists for the selected subject';
      }
    }
    
    setValidationErrors(errors);
    
    // If no errors, create chapter
    if (!errors.title && !errors.subjectId && !errors.chapter_number) {
      submitChapter();
    }
  };

  const submitChapter = async () => {
    try {
      setIsLoading(true);
      
      // Send JSON data with the correct field names
      console.log('Sending chapter create request with JSON data');
      
      const response = await axios.post(
        `${BASE_URL}/api/chapters/`, 
        {
          name: newChapter.title, // API expects "name" instead of "title"
          subject_id: parseInt(newChapter.subjectId),
          description: newChapter.description,
          chapter_number: parseInt(newChapter.chapter_number)
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // If successful, refresh the chapter list
      if (response.data) {
        console.log('Chapter created successfully:', response.data);
        // Trigger a refresh of the chapter list
        setRefreshTrigger(prev => prev + 1);
        
        // Show success message
        alert('Chapter created successfully!');
      }
      
      // Close modal
      setShowModal(false);
    } catch (error: any) {
      console.error('Error creating chapter:', error);
      
      // More detailed error reporting
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        
        // Show more specific error message if available
        if (error.response.data && typeof error.response.data === 'object') {
          const errorMessages = Object.entries(error.response.data)
            .map(([key, value]: [string, any]) => {
              if (Array.isArray(value)) {
                return `${key}: ${value.join(', ')}`;
              }
              return `${key}: ${value}`;
            })
            .join('\n');
          alert(`Failed to create chapter: \n${errorMessages}`);
        } else if (typeof error.response.data === 'string') {
          alert(`Failed to create chapter: ${error.response.data}`);
        } else {
          alert(`Failed to create chapter: ${error.response.status} ${error.response.statusText}`);
        }
      } else {
        alert('Failed to create chapter. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewChapter({ ...newChapter, [name]: value });
    
    // Clear validation error when user selects a value
    if (value.trim()) {
      setValidationErrors({
        ...validationErrors,
        [name]: ''
      });
    }
  };

  const handleSubjectFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSubjectFilter(e.target.value);
  };

  const handleDeleteChapter = (chapter: Chapter) => {
    setChapterToDelete(chapter);
    setShowDeleteModal(true);
    setDeleteError(null);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setChapterToDelete(null);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!chapterToDelete) return;
    
    try {
      setIsDeleting(true);
      setDeleteError(null);
      
      const response = await axios.delete(
        `${BASE_URL}/api/chapters/${chapterToDelete.id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      // If successful, refresh the chapter list
      setRefreshTrigger(prev => prev + 1);
      alert('Chapter deleted successfully!');
      setShowDeleteModal(false);
    } catch (error: any) {
      console.error('Error deleting chapter:', error);
      
      if (error.response) {
        console.error('Response data:', error.response.data);
        
        if (error.response.data && typeof error.response.data === 'object') {
          const errorMessages = Object.entries(error.response.data)
            .map(([key, value]: [string, any]) => {
              if (Array.isArray(value)) {
                return `${key}: ${value.join(', ')}`;
              }
              return `${key}: ${value}`;
            })
            .join('\n');
          setDeleteError(`Failed to delete chapter: \n${errorMessages}`);
        } else if (typeof error.response.data === 'string') {
          setDeleteError(`Failed to delete chapter: ${error.response.data}`);
        } else {
          setDeleteError(`Failed to delete chapter: ${error.response.status} ${error.response.statusText}`);
        }
      } else {
        setDeleteError('Failed to delete chapter. Please try again.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Add handlers for class/stream selection
  const handleClassChange = (value: number) => {
    setSelectedClass(value);
    setSelectedStream(0);
    setSelectedSubject(0);
    
    if (editChapter) {
      setEditChapter({...editChapter, subjectId: ''});
    }
    if (newChapter) {
      setNewChapter({...newChapter, subjectId: ''});
    }
  };

  const handleStreamChange = (value: number) => {
    setSelectedStream(value);
    setSelectedSubject(0);
    
    if (editChapter) {
      setEditChapter({...editChapter, subjectId: ''});
    }
    if (newChapter) {
      setNewChapter({...newChapter, subjectId: ''});
    }
  };

  // Add validation helper functions
  const isChapterNameDuplicateForSubject = (name: string, subjectId: string, currentId?: number): boolean => {
    return chapters.some(chapter => 
      chapter.title.toLowerCase().trim() === name.toLowerCase().trim() && 
      chapter.subjectName === subjects.find(s => s.id.toString() === subjectId)?.name &&
      (!currentId || chapter.id !== currentId)
    );
  };

  const isChapterNumberDuplicateForSubject = (chapterNumber: string, subjectId: string, currentId?: number): boolean => {
    return chapters.some(chapter => 
      chapter.chapter_number === chapterNumber && 
      chapter.subjectName === subjects.find(s => s.id.toString() === subjectId)?.name &&
      (!currentId || chapter.id !== currentId)
    );
  };

  const validateChapterForm = (data: { title: string, subjectId: string, chapter_number: string }, isEdit: boolean = false, currentId?: number): boolean => {
    const errors = {
      title: '',
      subjectId: '',
      subject_id: '',
      chapter_number: ''
    };
    
    // Check for empty name
    if (!data.title.trim()) {
      errors.title = 'Chapter name is required';
    } else if (data.subjectId) {
      if (isChapterNameDuplicateForSubject(data.title, data.subjectId, isEdit ? currentId : undefined)) {
        errors.title = 'A chapter with this name already exists for the selected subject';
      }
    }

    // Check for empty subject
    if (!data.subjectId) {
      errors.subjectId = 'Subject is required';
      errors.subject_id = 'Subject is required';
    }

    // Check for valid chapter number
    if (!data.chapter_number) {
      errors.chapter_number = 'Chapter number is required';
    } else if (data.subjectId && isChapterNumberDuplicateForSubject(data.chapter_number, data.subjectId, isEdit ? currentId : undefined)) {
      errors.chapter_number = 'A chapter with this number already exists for the selected subject';
    }
    
    setValidationErrors(errors);
    return !errors.title && !errors.subjectId && !errors.chapter_number;
  };

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<TeacherSidebar />}>
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Chapters</h1>
        <button
          onClick={handleCreateChapter}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
        >
          Create New Chapter
        </button>
      </div>

      {/* Add the filter section */}
      {filterSection}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {chapters.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <p className="text-gray-600 mb-4">You haven't created any chapters yet.</p>
              <button
                onClick={handleCreateChapter}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
              >
                Create Your First Chapter
              </button>
            </div>
            ) : filteredChapters.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <p className="text-gray-600 mb-4">
                  No chapters match the selected filter. 
                  <button 
                    onClick={() => setSelectedSubjectFilter('')}
                    className="ml-2 text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Clear filter
                  </button>
                </p>
              </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Chapter Title
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subject
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stream
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {filteredChapters.map((chapter) => (
                    <tr key={chapter.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{chapter.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div 
                          className="text-sm text-gray-500 max-w-[200px] overflow-hidden text-ellipsis" 
                          title={chapter.subjectName}
                        >
                          {chapter.subjectName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div 
                          className="text-sm text-gray-500 max-w-[200px] overflow-hidden text-ellipsis" 
                          title={chapter.streamName}
                        >
                          {chapter.streamName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleViewChapter(chapter.id)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEditChapter(chapter.id)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteChapter(chapter)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
        
        {/* Create Chapter Modal */}
        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Create New Chapter</h2>
                <button 
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="class" className="block text-sm font-medium text-gray-700 mb-1">
                    Class
                  </label>
                  <select
                    id="class"
                    value={selectedClass}
                    onChange={(e) => handleClassChange(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-md border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value={0}>Select Class</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="stream" className="block text-sm font-medium text-gray-700 mb-1">
                    Stream
                  </label>
                  <select
                    id="stream"
                    value={selectedStream}
                    onChange={(e) => handleStreamChange(Number(e.target.value))}
                    disabled={!selectedClass}
                    className="w-full px-3 py-2 border rounded-md border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value={0}>Select Stream</option>
                    {filteredStreams.map(stream => (
                      <option key={stream.id} value={stream.id}>
                        {stream.name} {stream.class_?.name ? `(${stream.class_.name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="subjectId" className="block text-sm font-medium text-gray-700 mb-1">
                    Subject <span className="text-red-500">*</span>
                  </label>
                      <select
                        id="subjectId"
                        name="subjectId"
                        value={newChapter.subjectId}
                        onChange={handleInputChange}
                    disabled={!selectedStream}
                        className={`w-full px-3 py-2 border rounded-md ${
                          validationErrors.subjectId ? 'border-red-500' : 'border-gray-300'
                    } focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100`}
                      >
                    <option value="">Select Subject</option>
                    {filteredSubjects.map(subject => (
                          <option key={subject.id} value={subject.id}>
                        {subject.name}
                          </option>
                        ))}
                      </select>
                  {validationErrors.subjectId && (
                    <p className="mt-1 text-sm text-red-500">{validationErrors.subjectId}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Chapter Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={newChapter.title}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md ${
                      validationErrors.title ? 'border-red-500' : 'border-gray-300'
                    } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                    placeholder="Enter chapter name"
                  />
                  {validationErrors.title && (
                    <p className="mt-1 text-sm text-red-500">{validationErrors.title}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="chapter_number" className="block text-sm font-medium text-gray-700 mb-1">
                    Chapter Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="chapter_number"
                    name="chapter_number"
                    value={newChapter.chapter_number}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md ${
                      validationErrors.chapter_number ? 'border-red-500' : 'border-gray-300'
                    } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                    min="1"
                    placeholder="Enter chapter number"
                  />
                  {validationErrors.chapter_number && (
                    <p className="mt-1 text-sm text-red-500">{validationErrors.chapter_number}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={newChapter.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-md border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter chapter description (optional)"
                  />
                </div>
              </div>
              
              <div className="flex justify-end mt-6 space-x-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  disabled={isLoadingSubjects}
                >
                  Create Chapter
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Edit Chapter Modal */}
        {showEditModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Edit Chapter</h2>
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
              
              {isLoadingChapterDetail ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="edit-class" className="block text-sm font-medium text-gray-700 mb-1">
                        Class
                      </label>
                      <select
                        id="edit-class"
                        value={selectedClass}
                        onChange={(e) => handleClassChange(Number(e.target.value))}
                        className="w-full px-3 py-2 border rounded-md border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value={0}>Select Class</option>
                        {classes.map(cls => (
                          <option key={cls.id} value={cls.id}>{cls.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="edit-stream" className="block text-sm font-medium text-gray-700 mb-1">
                        Stream
                      </label>
                      <select
                        id="edit-stream"
                        value={selectedStream}
                        onChange={(e) => handleStreamChange(Number(e.target.value))}
                        disabled={!selectedClass}
                        className="w-full px-3 py-2 border rounded-md border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                      >
                        <option value={0}>Select Stream</option>
                        {filteredStreams.map(stream => (
                          <option key={stream.id} value={stream.id}>
                            {stream.name} {stream.class_?.name ? `(${stream.class_.name})` : ''}
                          </option>
                        ))}
                      </select>
                        </div>

                    <div>
                      <label htmlFor="edit-subject-id" className="block text-sm font-medium text-gray-700 mb-1">
                        Subject <span className="text-red-500">*</span>
                      </label>
                        <select
                        id="edit-subject-id"
                          name="subjectId"
                          value={editChapter.subjectId}
                          onChange={handleEditInputChange}
                        disabled={!selectedStream}
                        className={`w-full px-3 py-2 border rounded-md ${
                          validationErrors.subjectId ? 'border-red-500' : 'border-gray-300'
                        } focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100`}
                        >
                        <option value="">Select Subject</option>
                        {filteredSubjects.map(subject => (
                            <option key={subject.id} value={subject.id}>
                            {subject.name}
                            </option>
                          ))}
                        </select>
                      {validationErrors.subjectId && (
                        <p className="mt-1 text-sm text-red-500">{validationErrors.subjectId}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                        Chapter Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={editChapter.name}
                        onChange={handleEditInputChange}
                        className="w-full px-3 py-2 border rounded-md border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Enter chapter name"
                      />
                    </div>

                    <div>
                      <label htmlFor="chapter_number" className="block text-sm font-medium text-gray-700 mb-1">
                        Chapter Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        id="chapter_number"
                        name="chapter_number"
                        value={editChapter.chapter_number}
                        onChange={handleEditInputChange}
                        className="w-full px-3 py-2 border rounded-md border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Enter chapter number"
                        min="1"
                      />
                    </div>

                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        value={editChapter.description}
                        onChange={(e) => {
                          const { name, value } = e.target;
                          setEditChapter(prev => ({ ...prev, [name]: value }));
                        }}
                        rows={3}
                        className="w-full px-3 py-2 border rounded-md border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Enter chapter description (optional)"
                      ></textarea>
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-6 space-x-3">
                    <button
                      onClick={() => setShowEditModal(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitEditChapter}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                      disabled={isLoadingSubjects || isLoading}
                    >
                      Update Chapter
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        
        {/* View Chapter Modal */}
        {showViewModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Chapter Details</h2>
                <button 
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
              
              {isLoadingChapterDetail ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : selectedChapter ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Chapter Name</h3>
                    <p className="mt-1 text-base font-medium text-gray-900">{selectedChapter.name}</p>
                  </div>
                  
                  {selectedChapter.subject ? (
                    <>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Subject</h3>
                    <p className="mt-1 text-base text-gray-900">{selectedChapter.subject.name}</p>
                  </div>
                  
                      {selectedChapter.subject.stream ? (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Stream</h3>
                    <p className="mt-1 text-base text-gray-900">{selectedChapter.subject.stream.name}</p>
                  </div>
                      ) : (
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Stream</h3>
                          <p className="mt-1 text-base text-gray-900 italic">No stream information</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Subject</h3>
                      <p className="mt-1 text-base text-gray-900 italic">No subject assigned</p>
                    </div>
                  )}
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Created At</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      {new Date(selectedChapter.created_at).toLocaleString()}
                    </p>
                  </div>
                  
                  {selectedChapter.updated_at && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Last Updated</h3>
                      <p className="mt-1 text-sm text-gray-600">
                        {new Date(selectedChapter.updated_at).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-gray-600 py-4">Chapter details not available.</p>
              )}
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && chapterToDelete && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <div className="text-center mb-4">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">Delete Chapter</h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to delete this chapter? This action cannot be undone.
                  </p>
                </div>
              </div>
              
              <div className="mt-4 bg-gray-50 p-3 rounded-md">
                <p className="text-sm font-medium text-gray-900">Chapter: {chapterToDelete.title}</p>
                <p className="text-sm text-gray-500 mt-1">Subject: {chapterToDelete.subjectName}</p>
              </div>
              
              {deleteError && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                  <span className="block sm:inline">{deleteError}</span>
                </div>
              )}
              
              <div className="mt-6 flex justify-end space-x-3">
                <button 
                  onClick={handleCloseDeleteModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
    </MainLayout>
  );
};

export default ChapterList; 