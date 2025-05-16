import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MainLayout from '../../../components/layout/MainLayout';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { useAuth } from '../../../contexts/AuthContext';
import TeacherSidebar from '../sidebar/TeacherSidebar';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

interface Topic {
  id: string;
  name: string;
  description: string;
  chapter_id: string;
  created_at: string;
  updated_at: string | null;
  chapter?: {
    name: string;
    subject_id: string;
    id: string;
    created_at: string;
    updated_at: string | null;
    subject?: {
      name: string;
      course_id: string;
      id: string;
      created_at: string;
      updated_at: string | null;
      course?: {
        name: string;
        description: string;
        id: string;
        created_by: number;
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

interface Subject {
  id: string;
  name: string;
  course_id: string;
}

interface Chapter {
  id: string;
  name: string;
  subject_id: string;
  subject?: {
    name: string;
    id: string;
    course_id: string;
    stream?: {
      name: string;
      id: number;
      class_id?: number;
      class_?: {
        id: number;
        name: string;
        description?: string;
      }
    }
  }
}

interface TeacherTopicsPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

const TeacherTopicsPage: React.FC<TeacherTopicsPageProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const { token } = useAuth();
  
  // State for topics list and loading status
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for filter dropdowns
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [modalChapters, setModalChapters] = useState<Chapter[]>([]);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [isLoadingModalChapters, setIsLoadingModalChapters] = useState(false);

  // Filter states
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // State for topic creation/editing
  const [isCreating, setIsCreating] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicDescription, setNewTopicDescription] = useState('');
  const [newTopicChapterId, setNewTopicChapterId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  // State for delete confirmation
  const [topicToDelete, setTopicToDelete] = useState<Topic | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch topics on component mount
  useEffect(() => {
    fetchTopics();
  }, [token]);

  // Fetch all topics or filtered topics
  const fetchTopics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch all topics with their full hierarchy
      const response = await fetch(`${API_URL}/api/topics/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch topics');
      }
      const data = await response.json();
      setTopics(data);
      // Extract unique courses, subjects from the topics data
      extractFiltersFromTopics(data);
    } catch (err) {
      console.error('Error fetching topics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch topics');
    } finally {
      setIsLoading(false);
    }
  };

  // Extract filters from topics data
  const extractFiltersFromTopics = (topicsData: Topic[]) => {
    const uniqueCourses: { [key: string]: Course } = {};
    const uniqueSubjects: { [key: string]: Subject } = {};
    const uniqueChapters: { [key: string]: Chapter } = {};
    
    topicsData.forEach(topic => {
      if (topic.chapter?.subject?.course) {
        const course = topic.chapter.subject.course;
        uniqueCourses[course.id] = { id: course.id.toString(), name: course.name };
        
        const subject = topic.chapter.subject;
        uniqueSubjects[subject.id] = { 
          id: subject.id.toString(), 
          name: subject.name, 
          course_id: subject.course_id.toString() 
        };
        
        const chapter = topic.chapter;
        uniqueChapters[chapter.id] = { 
          id: chapter.id.toString(), 
          name: chapter.name, 
          subject_id: chapter.subject_id.toString() 
        };
      }
    });
    
    setCourses(Object.values(uniqueCourses));
    setSubjects(Object.values(uniqueSubjects));
    setChapters(Object.values(uniqueChapters));
  };

  // Fetch courses, subjects, and chapters for filters
  const fetchFilterData = async () => {
    // We now extract this data from topics, so this can be empty
    // or we could fetch full list of courses, subjects, chapters separately if needed
  };

  // Get filtered subjects based on selected course
  const getFilteredSubjects = () => {
    if (!selectedCourseId) return subjects;
    return subjects.filter(subject => subject.course_id === selectedCourseId);
  };

  // Get filtered chapters based on selected subject
  const getFilteredChapters = () => {
    if (!selectedSubjectId) return chapters;
    return chapters.filter(chapter => chapter.subject_id === selectedSubjectId);
  };

  // Get filtered topics based on all filters
  const getFilteredTopics = () => {
    let filteredTopics = [...topics];
    
    // Apply course filter
    if (selectedCourseId) {
      filteredTopics = filteredTopics.filter(
        topic => topic.chapter?.subject?.course_id.toString() === selectedCourseId
      );
    }
    
    // Apply subject filter
    if (selectedSubjectId) {
      filteredTopics = filteredTopics.filter(
        topic => topic.chapter?.subject_id.toString() === selectedSubjectId
      );
    }
    
    // Apply chapter filter
    if (selectedChapterId) {
      filteredTopics = filteredTopics.filter(
        topic => topic.chapter_id.toString() === selectedChapterId
      );
    }
    
    // Apply search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredTopics = filteredTopics.filter(topic => 
        topic.name.toLowerCase().includes(query) ||
        (topic.description && topic.description.toLowerCase().includes(query)) ||
        (topic.chapter?.name && topic.chapter.name.toLowerCase().includes(query)) ||
        (topic.chapter?.subject?.name && topic.chapter.subject.name.toLowerCase().includes(query)) ||
        (topic.chapter?.subject?.course?.name && topic.chapter.subject.course.name.toLowerCase().includes(query))
      );
    }
    
    return filteredTopics;
  };

  // Fetch all chapters for the modal
  const fetchAllChapters = async () => {
    setIsLoadingModalChapters(true);
    try {
      const response = await fetch( `${API_URL}/api/chapters/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch chapters');
      }
      
      const chaptersData = await response.json();
      console.log('chaptersData:', chaptersData);
      setModalChapters(chaptersData);
    } catch (err) {
      console.error('Error fetching chapters:', err);
      // If chapters fetch fails, fallback to the filtered chapters from topics
      setModalChapters(chapters);
    } finally {
      setIsLoadingModalChapters(false);
    }
  };

  // Handle creating a new topic
  const handleCreateTopic = () => {
    setIsCreating(true);
    setEditingTopic(null);
    setNewTopicName('');
    setNewTopicDescription('');
    setNewTopicChapterId(selectedChapterId);
    setValidationError('');
    fetchAllChapters(); // Fetch all chapters for the dropdown
    setShowEditModal(true);
  };

  // Handle editing an existing topic
  const handleEditTopic = (topic: Topic) => {
    setIsCreating(false);
    setEditingTopic(topic);
    setNewTopicName(topic.name);
    setNewTopicDescription(topic.description || '');
    setNewTopicChapterId(topic.chapter_id);
    setValidationError('');
    fetchAllChapters(); // Fetch all chapters for the dropdown
    setShowEditModal(true);
  };

  // Handle input changes for the topic form
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'name') {
      setNewTopicName(value);
    } else if (name === 'description') {
      setNewTopicDescription(value);
    } else if (name === 'chapter_id') {
      setNewTopicChapterId(value);
    }
  };

  // Submit the topic creation/edit form
  const handleSubmitTopic = async () => {
    setValidationError('');
    
    // Validate required fields
    if (!newTopicName.trim()) {
      setValidationError('Topic name is required');
      return;
    }
    
    if (!newTopicChapterId) {
      setValidationError('Please select a chapter');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (isCreating) {
        // Create new topic
        const response = await fetch(`${API_URL}/api/topics/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: newTopicName,
            description: newTopicDescription,
            chapter_id: newTopicChapterId
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to create topic');
        }
        
        // Refresh topics list
        fetchTopics();
      } else if (editingTopic) {
        // Update existing topic
        const response = await fetch(`${API_URL}/api/topics/${editingTopic.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: newTopicName,
            description: newTopicDescription,
            chapter_id: newTopicChapterId
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to update topic');
        }
        
        // Refresh topics list
        fetchTopics();
      }
      
      // Close the modal
      setShowEditModal(false);
    } catch (err) {
      console.error('Error submitting topic:', err);
      setValidationError(err instanceof Error ? err.message : 'Failed to submit topic');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle deleting a topic
  const handleDeleteTopic = (topic: Topic) => {
    setTopicToDelete(topic);
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  // Confirm topic deletion
  const handleConfirmDelete = async () => {
    if (!topicToDelete) return;
    
    setIsDeleting(true);
    setDeleteError(null);
    
    try {
      const response = await fetch(`${API_URL}/api/topics/${topicToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to delete topic');
      }
      
      // Refresh topics list
      fetchTopics();
      setShowDeleteModal(false);
    } catch (err) {
      console.error('Error deleting topic:', err);
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete topic');
    } finally {
      setIsDeleting(false);
    }
  };

  // Close the edit modal
  const handleCloseEditModal = () => {
    setShowEditModal(false);
  };

  // Close the delete confirmation modal
  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setTopicToDelete(null);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Handle course selection change
  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const courseId = e.target.value || null;
    setSelectedCourseId(courseId);
    setSelectedSubjectId(null);
    setSelectedChapterId(null);
  };

  // Handle subject selection change
  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const subjectId = e.target.value || null;
    setSelectedSubjectId(subjectId);
    setSelectedChapterId(null);
  };

  // Handle chapter selection change
  const handleChapterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const chapterId = e.target.value || null;
    setSelectedChapterId(chapterId);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSelectedCourseId(null);
    setSelectedSubjectId(null);
    setSelectedChapterId(null);
    setSearchQuery('');
  };

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<TeacherSidebar />}>
      <div className="px-4 sm:px-6 py-6 max-w-screen-2xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Topics</h1>
            <p className="text-gray-600">Manage learning topics within chapters</p>
          </div>
          <Button variant="primary" onClick={handleCreateTopic} 
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
           >
            Create New Topic
          </Button>
        </div>


        {/* Error display */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading ? (
          <div className="flex justify-center items-center h-48 md:h-64 lg:h-80">
            <div className="animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {/* Topics list - Desktop view (table) */}
            <div className="hidden md:block bg-white shadow rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                        Topic Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                        Chapter
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                        Subject
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
                    {getFilteredTopics().length > 0 ? (
                      getFilteredTopics().map((topic) => (
                        <tr key={topic.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{topic.name}</div>
                            {topic.description && (
                              <div className="text-sm text-gray-500 truncate max-w-xs xl:max-w-sm">{topic.description}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {topic.chapter?.name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {topic.chapter?.subject?.name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                            {formatDate(topic.created_at)}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-medium">
                            <div className="flex space-x-3 justify-end">
                              <button
                                onClick={() => handleEditTopic(topic)}
                                className="text-indigo-600 hover:text-indigo-900 flex items-center"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteTopic(topic)}
                                className="text-red-600 hover:text-red-900 flex items-center"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                          No topics found. {' '}
                          <button
                            onClick={handleCreateTopic}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"

                          >
                            Create a new topic
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Topics list - Mobile view (cards) */}
            <div className="md:hidden space-y-4">
              {getFilteredTopics().length > 0 ? (
                getFilteredTopics().map((topic) => (
                  <div key={topic.id} className="bg-white shadow rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="font-medium text-gray-900 break-words pr-2">{topic.name}</div>
                      <div className="flex space-x-3 shrink-0">
                        <button
                          onClick={() => handleEditTopic(topic)}
                          className="text-indigo-600 hover:text-indigo-900 text-sm flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTopic(topic)}
                          className="text-red-600 hover:text-red-900 text-sm flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                    
                    {topic.description && (
                      <div className="text-sm text-gray-500 mt-2 mb-3">{topic.description}</div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-2 mt-3 text-sm bg-gray-50 p-3 rounded-md">
                      <div>
                        <span className="text-gray-500 font-medium">Chapter:</span>
                        <span className="ml-1 text-gray-900">{topic.chapter?.name || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 font-medium">Subject:</span>
                        <span className="ml-1 text-gray-900">{topic.chapter?.subject?.name || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 font-medium">Course:</span>
                        <span className="ml-1 text-gray-900">{topic.chapter?.subject?.course?.name || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 font-medium">Created:</span>
                        <span className="ml-1 text-gray-900">{formatDate(topic.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white shadow rounded-lg p-6 text-center text-sm text-gray-500">
                  <div className="py-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="mb-3">No topics found matching your criteria.</p>
                  <button
                    onClick={handleCreateTopic}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                    Create a new topic
                  </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Edit/Create Topic Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-200">
                <h3 className="text-lg sm:text-xl font-medium text-gray-900">
                {isCreating ? 'Create New Topic' : 'Edit Topic'}
              </h3>
                <button 
                  onClick={handleCloseEditModal}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              
              {validationError && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{validationError}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Topic Name*
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={newTopicName}
                    onChange={handleInputChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={newTopicDescription}
                    onChange={handleInputChange}
                    rows={3}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Enter topic description"
                  />
                </div>
                <div>
                  <label htmlFor="chapter_id" className="block text-sm font-medium text-gray-700 mb-1">
                    Chapter/Subject*
                  </label>
                  {isLoadingModalChapters ? (
                    <div className="flex items-center justify-center h-10">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  ) : (
                    <select
                      id="chapter_id"
                      name="chapter_id"
                      value={newTopicChapterId || ''}
                      onChange={handleInputChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      required
                    >
                      <option value="">Select a Chapter</option>
                      {modalChapters.map((chapter) => {
                        // Get the basic chapter name
                        const chapterName = chapter.name || 'Unnamed Chapter';
                        
                        // Get subject name if available
                        const subjectName = chapter.subject?.name || '';
                        
                        // Get stream name using type assertion
                        let streamName = '';
                        let className = '';
                        const fullChapter = chapter as any;
                        
                        if (fullChapter.subject?.stream?.name) {
                          streamName = fullChapter.subject.stream.name;
                          
                          if (fullChapter.subject.stream.class_?.name) {
                            className = fullChapter.subject.stream.class_.name;
                          }
                        }
                        
                        // Build the display text
                        let displayText = chapterName;
                        if (subjectName) displayText += ` > ${subjectName}`;
                        if (streamName) {
                          displayText += ` (${streamName}`;
                          if (className) displayText += ` - ${className}`;
                          displayText += ')';
                        }
                        
                        return (
                          <option key={chapter.id} value={chapter.id}>
                            {displayText}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>
                
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 pt-5 border-t border-gray-200 mt-5 space-y-2 space-y-reverse">
                  <Button variant="secondary" onClick={handleCloseEditModal} disabled={isSubmitting} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handleSubmitTopic} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {isCreating ? 'Creating...' : 'Updating...'}
                      </span>
                    ) : isCreating ? 'Create Topic' : 'Update Topic'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && topicToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-5 sm:p-6">
              <div className="text-center mb-5">
                <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-red-100 mb-4">
                  <svg className="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-gray-900">Delete Topic</h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to delete this topic? This action cannot be undone.
                  </p>
                </div>
              </div>
              
              <div className="mt-4 bg-gray-50 p-4 rounded-md">
                <p className="text-sm font-medium text-gray-900">Topic: {topicToDelete.name}</p>
                <p className="text-sm text-gray-500 mt-1">Chapter: {topicToDelete.chapter?.name || 'N/A'}</p>
                {topicToDelete.description && (
                  <p className="text-sm text-gray-500 mt-2 italic truncate">
                    {topicToDelete.description}
                  </p>
                )}
              </div>
              
              {deleteError && (
                <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{deleteError}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 space-y-2 space-y-reverse sm:space-y-0">
                <Button variant="secondary" onClick={handleCloseDeleteModal} disabled={isDeleting} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleConfirmDelete} disabled={isDeleting} className="w-full sm:w-auto">
                  {isDeleting ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Deleting...
                    </span>
                  ) : 'Delete Topic'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default TeacherTopicsPage; 