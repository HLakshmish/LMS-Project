import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import MainLayout from '../../../components/layout/MainLayout';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { useAuth } from '../../../contexts/AuthContext';
import TeacherSidebar from '../sidebar/TeacherSidebar';
import TeacherUploadContentPage from './TeacherUploadContentPage';
import ReactModal from 'react-modal';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

interface Content {
  id: string;
  title: string;
  description: string;
  type: 'video' | 'pdf' | 'document';
  url: string;
  chapter_id?: number;
  subject_id?: number;
  course_id?: number;
  topic_id?: number;
  created_at: string;
}

interface Subject {
  id: number;
  name: string;
  code: string;
}

interface Chapter {
  id: number;
  name: string;
  subject_id: number;
}

interface Topic {
  id: number;
  name: string;
  chapter_id: number;
}

interface Course {
  id: number;
  name: string;
}

interface TeacherContentPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

const TeacherContentPage: React.FC<TeacherContentPageProps> = ({ user, onLogout }) => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { token } = useAuth();

  const [contents, setContents] = useState<Content[]>([]);
  const [filteredContents, setFilteredContents] = useState<Content[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  
  // Delete confirmation state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [contentToDelete, setContentToDelete] = useState<Content | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    subject_id: '',
    chapter_id: '',
    topic_id: '',
    course_id: ''
  });

  const fetchContents = async () => {
    try {
      setIsLoading(true);
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch all data in parallel
      const [contentsRes, subjectsRes, chaptersRes, topicsRes, coursesRes] = await Promise.all([
        fetch(`${API_URL}/api/content/`, { headers }),
        fetch(`${API_URL}/api/subjects/`, { headers }),
        fetch(`${API_URL}/api/chapters/`, { headers }),
        fetch(`${API_URL}/api/topics/`, { headers }),
        fetch(`${API_URL}/api/courses/`, { headers })
      ]);

      if (!contentsRes.ok) throw new Error('Failed to fetch content');

      const [contentsData, subjectsData, chaptersData, topicsData, coursesData] = await Promise.all([
        contentsRes.json(),
        subjectsRes.json(),
        chaptersRes.json(),
        topicsRes.json(),
        coursesRes.json()
      ]);

      setContents(contentsData);
      setSubjects(subjectsData);
      setChapters(chaptersData);
      setTopics(topicsData);
      setCourses(coursesData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContents();
  }, [token]);

  // Effect to handle filtering and searching
  useEffect(() => {
    let filtered = [...contents];

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(content => 
        content.title.toLowerCase().includes(query) ||
        content.description.toLowerCase().includes(query)
      );
    }

    // Apply filters
    if (selectedFilters.subject_id) {
      filtered = filtered.filter(content => 
        content.subject_id === Number(selectedFilters.subject_id)
      );
    }
    if (selectedFilters.chapter_id) {
      filtered = filtered.filter(content => 
        content.chapter_id === Number(selectedFilters.chapter_id)
      );
    }
    if (selectedFilters.topic_id) {
      filtered = filtered.filter(content => 
        content.topic_id === Number(selectedFilters.topic_id)
      );
    }
    if (selectedFilters.course_id) {
      filtered = filtered.filter(content => 
        content.course_id === Number(selectedFilters.course_id)
      );
    }

    setFilteredContents(filtered);
  }, [contents, searchQuery, selectedFilters]);

  // Handle filter changes
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSelectedFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Reset filters
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedFilters({
      subject_id: '',
      chapter_id: '',
      topic_id: '',
      course_id: ''
    });
  };

  // Helper function to get content type icon and color
  const getContentTypeStyles = (type: Content['type']) => {
    switch (type) {
      case 'document':
        return {
          color: 'bg-blue-100 text-blue-800',
          icon: (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          ),
        };
      case 'video':
        return {
          color: 'bg-red-100 text-red-800',
          icon: (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          ),
        };
      case 'pdf':
        return {
          color: 'bg-purple-100 text-purple-800',
          icon: (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800',
          icon: null,
        };
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedContent(null);
  };

  const handleModalSuccess = () => {
    fetchContents();
    handleModalClose();
  };

  const handleEdit = (content: Content) => {
    setSelectedContent(content);
    setIsModalOpen(true);
  };

  // Delete handlers
  const handleDeleteClick = (content: Content) => {
    setContentToDelete(content);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
    setContentToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!contentToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`${API_URL}/api/content/${contentToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete content');
      }

      // Refresh content list
      await fetchContents();
      setIsDeleteModalOpen(false);
      setContentToDelete(null);
    } catch (err) {
      console.error('Error deleting content:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete content');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<TeacherSidebar />}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Content Management</h1>
        <p className="text-gray-600">Manage and upload your learning materials</p>
      </div>

      {/* Search and Filter Section */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Upload Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Upload Content
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <select
            name="subject_id"
            value={selectedFilters.subject_id}
            onChange={handleFilterChange}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Filter by Subject</option>
            {subjects.map(subject => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>

          <select
            name="chapter_id"
            value={selectedFilters.chapter_id}
            onChange={handleFilterChange}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Filter by Chapter</option>
            {chapters.map(chapter => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.name}
              </option>
            ))}
          </select>

          <select
            name="topic_id"
            value={selectedFilters.topic_id}
            onChange={handleFilterChange}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Filter by Topic</option>
            {topics.map(topic => (
              <option key={topic.id} value={topic.id}>
                {topic.name}
              </option>
            ))}
          </select>

          <select
            name="course_id"
            value={selectedFilters.course_id}
            onChange={handleFilterChange}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Filter by Course</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </div>

        {/* Reset Filters Button */}
        {(searchQuery || Object.values(selectedFilters).some(value => value !== '')) && (
          <div className="flex justify-end">
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 focus:outline-none"
            >
              Reset Filters
            </button>
          </div>
        )}
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
      ) : filteredContents.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No content found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {contents.length === 0 
              ? "Get started by creating a new content item."
              : "Try adjusting your search or filters."}
          </p>
          {contents.length === 0 && (
            <div className="mt-6">
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Upload Content
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredContents.map((content) => {
            const typeStyles = getContentTypeStyles(content.type);
            return (
              <Card key={content.id} className="hover:shadow-lg transition-shadow duration-200">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className={`p-2 rounded-lg ${typeStyles.color}`}>
                      {typeStyles.icon}
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeStyles.color}`}>
                      {content.type.charAt(0).toUpperCase() + content.type.slice(1)}
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-lg font-medium text-gray-900">{content.title}</h3>
                    <p className="mt-1 text-sm text-gray-500">{content.description}</p>
                  </div>
                  <div className="mt-4 space-y-2">
                    {content.course_id && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Course:</span>
                        <span className="text-gray-900">
                          {courses.find(c => c.id === content.course_id)?.name || 'Unknown Course'}
                        </span>
                      </div>
                    )}
                    {content.subject_id && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Subject:</span>
                        <span className="text-gray-900">
                          {subjects.find(s => s.id === content.subject_id)?.name || 'Unknown Subject'}
                        </span>
                      </div>
                    )}
                    {content.chapter_id && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Chapter:</span>
                        <span className="text-gray-900">
                          {chapters.find(c => c.id === content.chapter_id)?.name || 'Unknown Chapter'}
                        </span>
                      </div>
                    )}
                    {content.topic_id && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Topic:</span>
                        <span className="text-gray-900">
                          {topics.find(t => t.id === content.topic_id)?.name || 'Unknown Topic'}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Created:</span>
                      <span className="text-gray-900">{new Date(content.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end space-x-2">
                    <a href={content.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="light" size="sm">View</Button>
                    </a>
                    <button
                      onClick={() => handleEdit(content)}
                      className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(content)}
                      className="px-3 py-1 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Content Modal */}
      <TeacherUploadContentPage
        user={user}
        onLogout={onLogout}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        editContent={selectedContent || undefined}
      />

      {/* Delete Confirmation Modal */}
      <ReactModal
        isOpen={isDeleteModalOpen}
        onRequestClose={handleDeleteCancel}
        className="fixed inset-0 flex items-center justify-center z-50"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 z-40"
        ariaHideApp={false}
      >
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Delete Content</h2>
          </div>
          <div className="mb-6">
            <p className="text-gray-600">
              Are you sure you want to delete "{contentToDelete?.title}"? This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleDeleteCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </ReactModal>
    </MainLayout>
  );
};

export default TeacherContentPage; 