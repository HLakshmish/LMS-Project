import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { MainLayout, AdminSidebar } from '../../components/layout';
import '../../styles/AdminPages.css';
import { FaSearch, FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
interface Creator {
  username: string;
  email: string;
  id: number;
  role: string;
  created_at: string;
  updated_at: string | null;
}

interface Course {
  id: number;
  name: string;
  description: string;
  duration?: number;
  is_active?: boolean;
  subject_id?: number;
  chapter_id?: number;
  topic_id?: number;
  level?: string;
  created_by: number;
  created_at: string;
  updated_at: string | null;
  creator: Creator;
}

interface CoursesPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

const CoursesPage: React.FC<CoursesPageProps> = ({ user, onLogout }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: 0,
    is_active: true,
    subject_id: 0,
    chapter_id: 0,
    topic_id: 0,
    level: 'beginner'
  });
  const [message, setMessage] = useState({ text: '', type: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [loading, setLoading] = useState(false);
  
  // Data for dropdowns
  const [subjects, setSubjects] = useState<{id: number, name: string}[]>([]);
  const [chapters, setChapters] = useState<{id: number, name: string, subject_id: number}[]>([]);
  const [topics, setTopics] = useState<{id: number, name: string, chapter_id: number}[]>([]);
  
  // Filtered data based on selections
  const [filteredChapters, setFilteredChapters] = useState<{id: number, name: string}[]>([]);
  const [filteredTopics, setFilteredTopics] = useState<{id: number, name: string}[]>([]);

  // Add new state for selected classification type
  const [selectedClassification, setSelectedClassification] = useState<'subject' | 'chapter' | 'topic'>('subject');

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

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/courses/`, axiosConfig());
      setCourses(response.data);
      setMessage({ text: '', type: '' });
    } catch (error) {
      setMessage({ text: 'Failed to fetch courses', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/subjects/`, axiosConfig());
      setSubjects(response.data);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchChapters = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/chapters/`, axiosConfig());
      setChapters(response.data);
    } catch (error) {
      console.error('Error fetching chapters:', error);
    }
  };

  const fetchTopics = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/topics/`, axiosConfig());
      setTopics(response.data);
    } catch (error) {
      console.error('Error fetching topics:', error);
    }
  };

  useEffect(() => {
    fetchCourses();
    fetchSubjects();
    fetchChapters();
    fetchTopics();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (selectedCourse) {
        await axios.put(
          `${API_URL}/api/courses/${selectedCourse.id}/`,
          formData,
          axiosConfig()
        );
        setMessage({ text: 'Course updated successfully', type: 'success' });
      } else {
        await axios.post(
          `${API_URL}/api/courses/`,
          formData,
          axiosConfig()
        );
        setMessage({ text: 'Course created successfully', type: 'success' });
      }
      setOpenDialog(false);
      fetchCourses();
      resetForm();
    } catch (error) {
      setMessage({ text: 'Failed to save course', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (courseId: number) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      try {
        setLoading(true);
        await axios.delete(
          `${API_URL}/api/courses/${courseId}/`,
          axiosConfig()
        );
        setMessage({ text: 'Course deleted successfully', type: 'success' });
        fetchCourses();
      } catch (error) {
        setMessage({ text: 'Failed to delete course', type: 'error' });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEdit = (course: Course) => {
    setSelectedCourse(course);
    setFormData({
      name: course.name,
      description: course.description,
      duration: course.duration || 0,
      is_active: course.is_active !== undefined ? course.is_active : true,
      subject_id: course.subject_id || 0,
      chapter_id: course.chapter_id || 0,
      topic_id: course.topic_id || 0,
      level: course.level || 'beginner'
    });
    
    setOpenDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      duration: 0,
      is_active: true,
      subject_id: 0,
      chapter_id: 0,
      topic_id: 0,
      level: 'beginner'
    });
    setSelectedCourse(null);
    setFilteredChapters([]);
    setFilteredTopics([]);
    setSelectedClassification('subject');
  };

  // Handle subject change
  const handleSubjectChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const subjectId = parseInt(e.target.value);
    setFormData(prev => ({ ...prev, subject_id: subjectId, chapter_id: 0, topic_id: 0 }));
    
    if (subjectId > 0) {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await axios.get(`${API_URL}/api/chapters/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          params: {
            skip: 0,
            limit: 100,
            subject_id: subjectId
          }
        });
        setFilteredChapters(response.data);
      } catch (error) {
        console.error('Error fetching chapters:', error);
        setFilteredChapters([]);
      }
    } else {
      setFilteredChapters([]);
    }
    setFilteredTopics([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  const filteredCourses = courses
    .filter(course => {
      if (searchTerm) {
        return course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
               course.description.toLowerCase().includes(searchTerm.toLowerCase());
      }
      return true;
    })
    .filter(course => {
      if (filter === 'all') return true;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<AdminSidebar />}>
      <div className="flex flex-col h-full">
        {/* Header Section */}
        <div className="mb-8 bg-blue-500 rounded-lg shadow-md p-6 mx-8 mt-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-white">Manage Courses</h1>
            <p className="text-blue-100">Create and manage your courses</p>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex-none mx-8">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                <span className="text-xs text-gray-600 mr-1">Show</span>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="form-select rounded-md border-gray-300 text-xs py-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Courses</option>
                </select>
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="form-select rounded-md border-gray-300 text-xs py-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-7 pr-3 py-1 border border-gray-300 rounded-md text-xs focus:ring-blue-500 focus:border-blue-500 w-48"
                />
                <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
                  <svg className="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <button
                onClick={() => setOpenDialog(true)}
                className="inline-flex items-center px-2 py-1 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Course
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            {message.text && (
              <div className={`mb-2 p-2 rounded-md text-xs ${
                message.type === 'success' ? 'bg-green-50 text-green-800 border-l-4 border-green-500' : 'bg-red-50 text-red-800 border-l-4 border-red-500'
              }`}>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    {message.type === 'success' ? (
                      <svg className="h-3 w-3 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                      </svg>
                    ) : (
                      <svg className="h-3 w-3 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
                      </svg>
                    )}
                  </div>
                  <div className="ml-2">
                    <p className="text-xs">{message.text}</p>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center items-center py-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="text-center py-4">
                <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M12 14h.01M12 16h.01M12 18h.01M12 20h.01M12 22h.01" />
                </svg>
                <h3 className="mt-1 text-xs font-medium text-gray-900">No courses found</h3>
                <p className="text-xs text-gray-500">Get started by creating a new course.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {filteredCourses.map((course) => (
                  <div
                    key={course.id}
                    className="relative bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden group"
                  >
                    {/* Course Content */}
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-base md:text-lg font-semibold text-gray-900 line-clamp-1 flex-1 mr-3">{course.name}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${
                          course.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'
                        }`}>
                          {course.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-3 line-clamp-2">{course.description}</p>

                      <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                        <div className="bg-gray-50 p-2 rounded">
                          <span className="block text-gray-500 text-[10px]">Created By</span>
                          <span className="font-medium text-gray-900">{course.creator?.username || 'Unknown'}</span>
                        </div>
                        <div className="bg-gray-50 p-2 rounded">
                          <span className="block text-gray-500 text-[10px]">Created</span>
                          <span className="font-medium text-gray-900">
                            {new Date(course.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(course)}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200"
                        >
                          <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(course.id)}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-red-600 bg-red-50 hover:bg-red-100 border border-red-100"
                        >
                          <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
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
      </div>

      {/* Modal Dialog */}
      {openDialog && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              {/* Header with close button */}
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedCourse ? 'Edit Course' : 'Create New Course'}
                </h3>
                <button
                  onClick={() => {
                    setOpenDialog(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Form */}
                  <form onSubmit={handleSubmit}>
                <div className="bg-white p-4">
                  <div className="space-y-3">
                    {/* Basic Information Section */}
                    <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Basic Information</h4>
                      <div className="grid grid-cols-1 gap-3">
                      <div>
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                            Course Name*
                        </label>
                        <input
                          type="text"
                          name="name"
                          id="name"
                          value={formData.name}
                          onChange={handleInputChange}
                            className="block w-full shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 rounded-md"
                          required
                        />
                      </div>
                      <div>
                          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                            Course Description*
                        </label>
                        <textarea
                          name="description"
                          id="description"
                            rows={2}
                          value={formData.description}
                          onChange={handleInputChange}
                            className="block w-full shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 rounded-md"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-1">
                              Difficulty Level*
                            </label>
                            <select
                              id="level"
                              name="level"
                              value={formData.level}
                              onChange={handleInputChange}
                              className="block w-full shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 rounded-md"
                              required
                            >
                              <option value="beginner">Beginner</option>
                              <option value="intermediate">Intermediate</option>
                              <option value="advanced">Advanced</option>
                            </select>
                          </div>
                          <div>
                            <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                              Duration (hours)*
                            </label>
                            <input
                              type="number"
                              name="duration"
                              id="duration"
                              min="0"
                              value={formData.duration}
                              onChange={handleInputChange}
                              className="block w-full shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 rounded-md"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Course Classification Section */}
                    <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Course Classification</h4>
                      
                      {/* Radio Button Selection */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                        <label className="flex items-center space-x-1 cursor-pointer">
                          <input
                            type="radio"
                            name="classification"
                            value="subject"
                            checked={selectedClassification === 'subject'}
                            onChange={(e) => {
                              setSelectedClassification('subject');
                              setFormData(prev => ({
                                ...prev,
                                subject_id: 0,
                                chapter_id: 0,
                                topic_id: 0
                              }));
                            }}
                            className="form-radio text-blue-600"
                          />
                          <span className="text-sm font-medium text-gray-700">Subject</span>
                        </label>
                        <label className="flex items-center space-x-1 cursor-pointer">
                          <input
                            type="radio"
                            name="classification"
                            value="chapter"
                            checked={selectedClassification === 'chapter'}
                            onChange={(e) => {
                              setSelectedClassification('chapter');
                              setFormData(prev => ({
                                ...prev,
                                chapter_id: 0,
                                topic_id: 0
                              }));
                            }}
                            className="form-radio text-blue-600"
                          />
                          <span className="text-sm font-medium text-gray-700">Chapter</span>
                        </label>
                        <label className="flex items-center space-x-1 cursor-pointer">
                          <input
                            type="radio"
                            name="classification"
                            value="topic"
                            checked={selectedClassification === 'topic'}
                            onChange={(e) => {
                              setSelectedClassification('topic');
                              setFormData(prev => ({
                                ...prev,
                                topic_id: 0
                              }));
                            }}
                            className="form-radio text-blue-600"
                          />
                          <span className="text-sm font-medium text-gray-700">Topic</span>
                        </label>
                      </div>

                      {/* Dynamic Selection Fields */}
                      <div className="space-y-0">
                        {selectedClassification === 'subject' && (
                          <div>
                            <label htmlFor="subject_id" className="block text-sm font-medium text-gray-700 mb-1">
                              Select Subject
                            </label>
                            <select
                              id="subject_id"
                              name="subject_id"
                              value={formData.subject_id}
                              onChange={handleSubjectChange}
                              className="block w-full shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 rounded-md"
                            >
                              <option value={0}>Select Subject</option>
                              {subjects.map(subject => (
                                <option key={subject.id} value={subject.id}>{subject.name}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {selectedClassification === 'chapter' && (
                          <div>
                            <label htmlFor="chapter_id" className="block text-sm font-medium text-gray-700 mb-1">
                              Select Chapter
                            </label>
                            <select
                              id="chapter_id"
                              name="chapter_id"
                              value={formData.chapter_id}
                              onChange={handleInputChange}
                              className="block w-full shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 rounded-md"
                            >
                              <option value={0}>Select Chapter</option>
                              {chapters.map(chapter => (
                                <option key={chapter.id} value={chapter.id}>{chapter.name}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {selectedClassification === 'topic' && (
                          <div>
                            <label htmlFor="topic_id" className="block text-sm font-medium text-gray-700 mb-1">
                              Select Topic
                            </label>
                            <select
                              id="topic_id"
                              name="topic_id"
                              value={formData.topic_id}
                              onChange={handleInputChange}
                              className="block w-full shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 rounded-md"
                            >
                              <option value={0}>Select Topic</option>
                              {topics.map(topic => (
                                <option key={topic.id} value={topic.id}>{topic.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status Section */}
                    <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                      <div>
                        <label htmlFor="is_active" className="block text-sm font-medium text-gray-700 mb-1">
                          Status*
                        </label>
                        <select
                          id="is_active"
                          name="is_active"
                          value={formData.is_active ? "true" : "false"}
                          onChange={(e) => setFormData({...formData, is_active: e.target.value === "true"})}
                          className="block w-full shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 rounded-md"
                          required
                        >
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer with action buttons */}
                <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex flex-row-reverse gap-2">
                      <button
                        type="submit"
                    className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-3 py-1.5 bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        {selectedCourse ? 'Update Course' : 'Create Course'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenDialog(false);
                          resetForm();
                        }}
                    className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-3 py-1.5 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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

export default CoursesPage; 