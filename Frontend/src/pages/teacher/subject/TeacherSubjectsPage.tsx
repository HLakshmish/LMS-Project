import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MainLayout from '../../../components/layout/MainLayout';
import TeacherSidebar from '../sidebar/TeacherSidebar';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { useAuth } from '../../../contexts/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

interface Subject {
  id: string;
  name: string;
  description: string;
  code: string;
  credits: number;
  chapter_count?: number;
  created_at: string;
  created_by: number;
  stream: {
    id: number;
    name: string;
    class_?: {
      id: number;
    name: string;
  }
  };
}

interface SubjectWithChapters extends Subject {
  chaptersCount: number;
}

interface Chapter {
  id: string;
  name: string;
  subject_id: string;
  created_at: string;
  updated_at: string | null;
  subject?: {
    name: string;
    course_id: number;
    id: number;
    created_at: string;
    updated_at: string | null;
    course: {
      name: string;
      description: string;
      id: number;
      created_by: number;
      created_at: string;
      updated_at: string | null;
      creator: {
        username: string;
        email: string;
        id: number;
        role: string;
        created_at: string;
        updated_at: string | null;
      }
    }
  }
}

interface Course {
  id: string;
  name: string;
}

interface Stream {
  id: number;
  name: string;
  class_?: {
    id: number;
    name: string;
  }
}

interface TeacherSubjectsPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

const TeacherSubjectsPage: React.FC<TeacherSubjectsPageProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [subjects, setSubjects] = useState<SubjectWithChapters[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streams, setStreams] = useState<Stream[]>([]);
  
  // State for chapters modal
  const [showChaptersModal, setShowChaptersModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<SubjectWithChapters | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [chaptersError, setChaptersError] = useState<string | null>(null);
  
  // New state for edit subject modal
  const [showEditSubjectModal, setShowEditSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<{
    id: string;
    name: string;
    code: string;
    description: string;
    credits: number;
    stream_id: number;
  }>({
    id: '',
    name: '',
    code: '',
    description: '',
    credits: 0,
    stream_id: 0
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [editSubjectError, setEditSubjectError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({
    name: '',
    code: '',
    stream_id: '',
    description: ''
  });
  
  // New state for delete subject modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<SubjectWithChapters | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch subjects on component mount
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setIsLoading(true);
        // This would be replaced with the actual API endpoint
        const response = await fetch(`${API_URL}/api/subjects/`, {
          headers: {
            'accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch subjects');
        }

        const data = await response.json();
        
        // First set subjects with placeholder chapter counts
        const initialSubjects = data.map((subject: Subject) => ({
          ...subject,
          chaptersCount: subject.chapter_count || 0
        }));
        
        setSubjects(initialSubjects);
        setIsLoading(false);
        
        // Then fetch chapter counts in the background - but use the general chapters API
        setChaptersLoading(true);
        
        try {
          // Instead of multiple API calls to /api/subjects/{id}/chapters,
          // fetch all chapters at once and filter client-side
          const chaptersResponse = await fetch(`${API_URL}/api/chapters/`, {
            headers: {
              'accept': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (chaptersResponse.ok) {
            const allChapters = await chaptersResponse.json();
            if (Array.isArray(allChapters)) {
              // Create a map of subject IDs to chapter counts
              const chapterCountsBySubject: {[key: string]: number} = {};
              
              // Count chapters for each subject
              allChapters.forEach(chapter => {
                const subjectId = String(chapter.subject_id); // Convert to string for consistency
                chapterCountsBySubject[subjectId] = (chapterCountsBySubject[subjectId] || 0) + 1;
              });
              
              // Update our subjects with accurate chapter counts
              const subjectsWithChapters = initialSubjects.map((subject: Subject & { chaptersCount: number }) => ({
                ...subject,
                chaptersCount: chapterCountsBySubject[String(subject.id)] || subject.chapter_count || 0
              }));
              
              // Update the subjects state with accurate chapter counts
              setSubjects(subjectsWithChapters);
            }
          }
        } catch (err) {
          console.error('Error fetching chapters data:', err);
          // If there's an error, we'll just use the initial subjects with placeholder counts
        } finally {
          setChaptersLoading(false);
        }
        
      } catch (err) {
        console.error('Error fetching subjects:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch subjects');
        setIsLoading(false);
      }
    };

    fetchSubjects();
  }, [token]);

  // New function to handle viewing chapters
  const handleViewChapters = async (subject: SubjectWithChapters) => {
    setSelectedSubject(subject);
    setShowChaptersModal(true);
    setChapters([]);
    setChaptersError(null);
    setIsLoadingChapters(true);
    
    try {
      // Instead of fetching from /api/subjects/{id}/chapters,
      // fetch all chapters and filter client-side
      const response = await fetch(`${API_URL}/api/chapters/`, {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch chapters: ${response.status} ${response.statusText}`);
      }
      
      const chaptersData = await response.json();
      
      // Filter chapters to get only those for this subject
      if (Array.isArray(chaptersData)) {
        const subjectChapters = chaptersData.filter(chapter => 
          String(chapter.subject_id) === String(subject.id)
        );
        setChapters(subjectChapters);
      } else {
        setChapters([]);
      }
      
      setIsLoadingChapters(false);
    } catch (err) {
      console.error(`Error fetching chapters for subject ${subject.id}:`, err);
      setChaptersError(err instanceof Error ? err.message : 'Failed to fetch chapters');
      setIsLoadingChapters(false);
    }
  };

  // New function to handle viewing chapter details
  const handleViewChapterDetails = (chapter: Chapter) => {
    // Navigate or show detailed view
    console.log("Viewing chapter details:", chapter);
    // For now we'll just log, but you could navigate to a detail page or show another modal
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Helper function to truncate text
  const truncateText = (text: string | undefined | null, maxLength: number = 100): string => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  // Fetch courses for the dropdown
  useEffect(() => {
    const fetchCourses = async () => {
      if (showEditSubjectModal) {
        try {
          setIsLoadingCourses(true);
          const response = await fetch(`${API_URL}/api/courses/courses/`, {
            headers: {
              'accept': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });

          if (!response.ok) {
            throw new Error('Failed to fetch courses');
          }

          const data = await response.json();
          setCourses(data);
          setIsLoadingCourses(false);
        } catch (err) {
          console.error('Error fetching courses:', err);
          setIsLoadingCourses(false);
        }
      }
    };

    fetchCourses();
  }, [showEditSubjectModal, token]);

  // Fetch streams when edit modal opens
  useEffect(() => {
    const fetchStreams = async () => {
      if (showEditSubjectModal) {
        try {
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
          setStreams(data);
        } catch (err) {
          console.error('Error fetching streams:', err);
          setEditSubjectError('Failed to fetch streams');
        }
      }
    };

    fetchStreams();
  }, [showEditSubjectModal, token]);

  // Handle opening the edit subject modal
  const handleEditSubject = (subject: SubjectWithChapters) => {
    setEditingSubject({
      id: subject.id,
      name: subject.name,
      code: subject.code,
      description: subject.description,
      credits: subject.credits,
      stream_id: subject.stream?.id || 0
    });
    setValidationErrors({ name: '', code: '', stream_id: '', description: '' });
    setEditSubjectError(null);
    setShowEditSubjectModal(true);
  };

  const validateEditForm = (): boolean => {
    const errors = {
      name: '',
      code: '',
      stream_id: '',
      description: ''
    };

    if (!editingSubject.name.trim()) {
      errors.name = 'Subject name is required';
    }

    if (!editingSubject.code.trim()) {
      errors.code = 'Subject code is required';
    }

    if (!editingSubject.stream_id) {
      errors.stream_id = 'Stream is required';
    }

    if (!editingSubject.description.trim()) {
      errors.description = 'Description is required';
    }

    setValidationErrors(errors);
    return !Object.values(errors).some(error => error !== '');
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditingSubject(prev => ({
      ...prev,
      [name]: name === 'credits' ? Number(value) : value
    }));
    
    // Clear validation error when user types
    if (validationErrors[name as keyof typeof validationErrors]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmitEditSubject = async () => {
    if (!validateEditForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`${API_URL}/api/subjects/${editingSubject.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editingSubject.name.trim(),
          code: editingSubject.code.trim(),
          description: editingSubject.description.trim(),
          credits: editingSubject.credits,
          stream_id: editingSubject.stream_id
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update subject');
      }
      
      // Update the subject in the local state
      const updatedSubject = await response.json();
      setSubjects(prev => 
        prev.map(subject => 
          subject.id === updatedSubject.id 
            ? { ...updatedSubject, chaptersCount: subject.chaptersCount } 
            : subject
        )
      );
      
      setShowEditSubjectModal(false);
      setIsSubmitting(false);
    } catch (err) {
      console.error('Error updating subject:', err);
      setEditSubjectError(err instanceof Error ? err.message : 'Failed to update subject');
      setIsSubmitting(false);
    }
  };

  // Handle opening the delete subject modal
  const handleDeleteSubject = (subject: SubjectWithChapters) => {
    setSubjectToDelete(subject);
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  // Submit delete subject request
  const handleConfirmDelete = async () => {
    if (!subjectToDelete) return;
    
    setIsDeleting(true);
    setDeleteError(null);
    
    try {
      const response = await fetch(`${API_URL}/api/subjects/${subjectToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        // If response is not JSON, handle accordingly
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.detail || `Failed to delete subject: ${response.status}`);
        } else {
          throw new Error(`Failed to delete subject: ${response.status} ${response.statusText}`);
        }
      }
      
      // Update the subjects list by removing the deleted subject
      setSubjects(prev => prev.filter(subject => subject.id !== subjectToDelete.id));
      
      // Close the modal
      setShowDeleteModal(false);
      setSubjectToDelete(null);
    } catch (err) {
      console.error('Error deleting subject:', err);
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete subject');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<TeacherSidebar />}>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subjects</h1>
          <p className="text-gray-600">Manage your subjects and their chapters</p>
        </div>
        <Link to="/teacher/subjects/create">
          <Button variant="primary">
            Create New Subject
          </Button>
        </Link>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : subjects.length === 0 ? (
        <Card>
          <div className="p-6 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Subjects Found</h3>
            <p className="text-gray-600 mb-4">Start by creating your first subject</p>
            <Link to="/teacher/subjects/create">
              <Button variant="primary">Create New Subject</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((subject) => (
            <Card 
              key={subject.id} 
              className="hover:shadow-lg transition-shadow duration-200"
            >
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{subject.name}</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditSubject(subject)}
                      className="p-1 text-blue-500 hover:text-blue-700 transition-colors duration-200"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteSubject(subject)}
                      className="p-1 text-red-500 hover:text-red-700 transition-colors duration-200"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="text-gray-600 mb-4">{subject.description}</p>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-500">
                  <div className="px-2 py-1 rounded">
                    <span className="font-medium">Code:</span>
                    <p className="uppercase">{subject.code}</p>
                  </div>
                  <div className="px-2 py-1 rounded">
                    <span className="font-medium">Credits:</span>
                    <p>{subject.credits}</p>
                  </div>
                  <div className="px-2 py-1 rounded">
                    <span className="font-medium">Stream:</span>
                    <p>{subject.stream?.name || 'N/A'}</p>
                  </div>
                  <div className="px-2 py-1 rounded">
                    <span className="font-medium">Class:</span>
                    <p>{subject.stream?.class_?.name || 'N/A'}</p>
                  </div>
                  <div className="px-2 py-1 rounded">
                    <span className="font-medium">Chapters:</span>
                    <p>
                      {chaptersLoading ? (
                        <span className="inline-flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Loading...
                        </span>
                      ) : subject.chaptersCount}
                    </p>
                  </div>
                  <div className="px-2 py-1 rounded">
                    <span className="font-medium">Created:</span>
                    <p>{formatDate(subject.created_at)}</p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => handleViewChapters(subject)}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    View Chapters
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Chapters Modal */}
      {showChaptersModal && selectedSubject && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                Chapters for {selectedSubject.name}
              </h2>
              <button 
                onClick={() => setShowChaptersModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
              <div className="flex justify-between">
                <div>
                  <p className="font-medium">Subject: {selectedSubject.name}</p>
                  <p className="text-sm">Stream: {selectedSubject.stream?.name || 'N/A'}</p>
                </div>
                <div className="text-right text-sm">
                  <p>Total Chapters: {selectedSubject.chaptersCount}</p>
                  <p>Created: {formatDate(selectedSubject.created_at)}</p>
                </div>
              </div>
            </div>

            {chaptersError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                <span className="block sm:inline">{chaptersError}</span>
              </div>
            )}

            {isLoadingChapters ? (
              <div className="flex justify-center items-center py-10">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : chapters.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No chapters found for this subject.</p>
                <button
                  onClick={() => navigate(`/teacher/subjects/${selectedSubject.id}/edit`)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
                >
                  Edit Subject
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {chapters.map((chapter) => (
                  <div 
                    key={chapter.id} 
                    className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-blue-300 hover:bg-blue-50 transform hover:scale-[1.02]"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 transition-colors duration-300 hover:text-blue-600">{chapter.name}</h3>
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          
                         
                          <div className="transition-all duration-300 hover:bg-white hover:text-gray-900 p-1 rounded">
                            <span className="font-medium text-gray-500">Created:</span>
                            <span className="ml-2 text-gray-700">{formatDate(chapter.created_at)}</span>
                          </div>
                          <div className="transition-all duration-300 hover:bg-white hover:text-gray-900 p-1 rounded">
                            <span className="font-medium text-gray-500">Last Updated:</span>
                            <span className="ml-2 text-gray-700">
                              {chapter.updated_at ? formatDate(chapter.updated_at) : 'Not updated yet'}
                            </span>
                          </div>
                          {chapter.subject && (
                            <>
                              
                              <div className="col-span-2 transition-all duration-300 hover:bg-white hover:text-gray-900 p-1 rounded">
                                <span className="font-medium text-gray-500">Course Creator:</span>
                                <span className="ml-2 text-gray-700">
                                  {(chapter.subject?.course?.creator) 
                                    ? `${chapter.subject.course.creator.username || 'Unknown'} (${chapter.subject.course.creator.email || 'N/A'})`
                                    : 'Unknown (N/A)'}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex justify-end mt-6 space-x-3">
              <button
                onClick={() => setShowChaptersModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-all duration-300 hover:shadow-md transform hover:scale-105"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Subject Modal */}
      {showEditSubjectModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Edit Subject</h2>
              <button 
                onClick={() => setShowEditSubjectModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {editSubjectError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                <span className="block sm:inline">{editSubjectError}</span>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                  Subject Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  value={editingSubject.code}
                  onChange={handleEditInputChange}
                  className={`w-full px-3 py-2 border rounded-md ${
                    validationErrors.code ? 'border-red-500' : 'border-gray-300'
                  } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                  placeholder="Enter subject code"
                />
                {validationErrors.code && (
                  <p className="mt-1 text-sm text-red-500">{validationErrors.code}</p>
                )}
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Subject Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={editingSubject.name}
                  onChange={handleEditInputChange}
                  className={`w-full px-3 py-2 border rounded-md ${
                    validationErrors.name ? 'border-red-500' : 'border-gray-300'
                  } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                  placeholder="Enter subject name"
                />
                {validationErrors.name && (
                  <p className="mt-1 text-sm text-red-500">{validationErrors.name}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="stream_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Stream <span className="text-red-500">*</span>
                </label>
                    <select
                  id="stream_id"
                  name="stream_id"
                  value={editingSubject.stream_id}
                      onChange={handleEditInputChange}
                      className={`w-full px-3 py-2 border rounded-md ${
                    validationErrors.stream_id ? 'border-red-500' : 'border-gray-300'
                  } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                >
                  <option value="">Select a stream</option>
                  {streams.map(stream => (
                    <option key={stream.id} value={stream.id}>
                      {stream.name} ({stream.class_?.name || 'No Class'})
                        </option>
                      ))}
                    </select>
                {validationErrors.stream_id && (
                  <p className="mt-1 text-sm text-red-500">{validationErrors.stream_id}</p>
                )}
              </div>

              <div>
                <label htmlFor="credits" className="block text-sm font-medium text-gray-700 mb-1">
                  Credits
                </label>
                <input
                  type="number"
                  id="credits"
                  name="credits"
                  min="0"
                  value={editingSubject.credits}
                  onChange={handleEditInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter credits"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={editingSubject.description}
                  onChange={handleEditInputChange}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-md ${
                    validationErrors.description ? 'border-red-500' : 'border-gray-300'
                  } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                  placeholder="Enter description"
                />
                {validationErrors.description && (
                  <p className="mt-1 text-sm text-red-500">{validationErrors.description}</p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end mt-6 space-x-3">
              <button
                onClick={() => setShowEditSubjectModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-all duration-300 hover:shadow-md transform hover:scale-105"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitEditSubject}
                className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-all duration-300 hover:shadow-md transform hover:scale-105 ${
                  isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
                }`}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Subject Confirmation Modal */}
      {showDeleteModal && subjectToDelete && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-800">Delete Subject</h2>
              <p className="mt-2 text-gray-600">
                Are you sure you want to delete the subject "{subjectToDelete.name}"? 
                This action cannot be undone and will also delete all chapters associated with this subject.
              </p>
            </div>
            
            {deleteError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                <span className="block sm:inline">{deleteError}</span>
              </div>
            )}
            
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-4">
              <div className="flex">
                <svg className="h-5 w-5 text-yellow-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Warning: This will delete the subject and all {subjectToDelete.chaptersCount} associated chapters.</span>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-all duration-300 hover:shadow-md transform hover:scale-105"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className={`px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-all duration-300 hover:shadow-md transform hover:scale-105 ${
                  isDeleting ? 'opacity-75 cursor-not-allowed' : ''
                }`}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </span>
                ) : (
                  'Delete Subject'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default TeacherSubjectsPage; 