import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StudentSidebar from './components/StudentSidebar';
import axios from 'axios';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
// Updated interfaces to match API response
interface Class {
  id: number;
  name: string;
  description: string;
}

interface Stream {
  id: number;
  name: string;
  description: string;
  class_id: number;
  class_: Class;
}

interface Subject {
  id: number;
  name: string;
  description: string;
  code: string;
  credits: number;
  stream_id: number;
  stream: Stream;
}

interface Chapter {
  id: number;
  name: string;
  description: string;
  subject_id: number;
  chapter_number: number;
  subject: Subject;
  topics: Topic[];
  creator: Creator;
}

interface Topic {
  id: number;
  name: string;
  description: string;
  chapter_id: number;
  chapter: Chapter;
}

interface Creator {
  id: number;
  username: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string | null;
}

interface Course {
  id: number;
  name: string;
  description: string;
  duration: number;
  is_active: boolean;
  level: string;
  stream?: Stream;
  subject?: Subject;
  chapter?: Chapter;
  topic?: Topic;
  creator?: Creator;
  created_at: string;
  updated_at: string | null;
}

interface ContentItem {
  id: number;
  title: string;
  description: string;
  type: 'video' | 'pdf' | 'document';
  url: string;
  course_id: number;
  topic_id: number;
  chapter_id: number;
  subject_id: number;
  created_by: number;
  created_at: string;
  updated_at: string | null;
  creator?: Creator;
  course?: Course;
  topic?: Topic;
  chapter?: Chapter;
  subject?: Subject;
}

interface DashboardPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

const Content: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'video' | 'pdf' | 'document'>('all');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'course' | 'subject' | 'chapter' | 'topic'>('all');
  const [selectedId, setSelectedId] = useState<number | 'all'>('all');
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  
  // Available filters based on API response
  const [availableFilters, setAvailableFilters] = useState<{
    courses: { id: number; name: string }[];
    subjects: { id: number; name: string }[];
    chapters: { id: number; name: string }[];
    topics: { id: number; name: string }[];
  }>({
    courses: [],
    subjects: [],
    chapters: [],
    topics: []
  });
  
  // Helper function to safely access nested properties
  const safeAccess = (obj: any, path: string, defaultValue: any = 'N/A') => {
    try {
      const parts = path.split('.');
      let result = obj;
      
      for (const part of parts) {
        if (result === null || result === undefined) {
          return defaultValue;
        }
        result = result[part];
      }
      
      return result === null || result === undefined ? defaultValue : result;
    } catch (err) {
      console.error(`Error accessing path ${path}:`, err);
      return defaultValue;
    }
  };

  // Get auth token and axios config
  const getAuthToken = () => localStorage.getItem('token');
  const axiosConfig = () => ({
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json'
    }
  });

  // Get user ID from localStorage
  const getUserId = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        return parsedUser.id;
      } catch (e) {
        console.error('Error parsing user data:', e);
        return null;
      }
    }
    return null;
  };

  // Fetch content and extract available filters
  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      setError(null);
      try {
        const userId = getUserId();
        if (!userId) {
          throw new Error('User ID not found');
        }

        // First fetch active subscriptions
        const subscriptionResponse = await axios.get(
          `${API_URL}/api/subscriptions/subscriptions/user/${userId}/active`,
          axiosConfig()
        );

        // Check if user has any active subscriptions
        const hasSubscription = subscriptionResponse.data && subscriptionResponse.data.length > 0;
        setHasActiveSubscription(hasSubscription);

        if (!hasSubscription) {
          setLoading(false);
          return;
        }

        // Extract course IDs from active subscriptions
        const subscribedCourseIds = new Set<number>();
        subscriptionResponse.data.forEach((subscription: any) => {
          if (subscription.subscription_plan_package?.packages) {
            subscription.subscription_plan_package.packages.forEach((pkg: any) => {
              if (pkg.courses) {
                pkg.courses.forEach((course: any) => {
                  subscribedCourseIds.add(course.id);
                });
              }
            });
          }
        });

        // Fetch all content
        const response = await axios.get(`${API_URL}/api/content/`, axiosConfig());
        
        // Filter content to only include items from subscribed courses
        const filteredContent = response.data.filter((item: ContentItem) => 
          item.course && subscribedCourseIds.has(item.course.id)
        );
        
        setContentItems(filteredContent);

        // Extract unique filters only from the filtered content
        const uniqueCourses = new Set();
        const uniqueSubjects = new Set();
        const uniqueChapters = new Set();
        const uniqueTopics = new Set();
        
        const courses: { id: number; name: string }[] = [];
        const subjects: { id: number; name: string }[] = [];
        const chapters: { id: number; name: string }[] = [];
        const topics: { id: number; name: string }[] = [];

        filteredContent.forEach((item: ContentItem) => {
          if (item.course && !uniqueCourses.has(item.course.id)) {
            uniqueCourses.add(item.course.id);
            courses.push({ id: item.course.id, name: item.course.name });
          }
          if (item.subject && !uniqueSubjects.has(item.subject.id)) {
            uniqueSubjects.add(item.subject.id);
            subjects.push({ id: item.subject.id, name: item.subject.name });
          }
          if (item.chapter && !uniqueChapters.has(item.chapter.id)) {
            uniqueChapters.add(item.chapter.id);
            chapters.push({ id: item.chapter.id, name: item.chapter.name });
          }
          if (item.topic && !uniqueTopics.has(item.topic.id)) {
            uniqueTopics.add(item.topic.id);
            topics.push({ id: item.topic.id, name: item.topic.name });
          }
        });

        setAvailableFilters({
          courses,
          subjects,
          chapters,
          topics
        });
      } catch (err) {
        console.error('Error fetching content:', err);
        setError('Failed to fetch content');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, []);

  // Filter content items based on search, type, and selected filter
  const filteredContent = contentItems.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = selectedType === 'all' || item.type === selectedType;
    
    const matchesFilter = selectedFilter === 'all' || 
      (selectedFilter === 'course' && item.course?.id === selectedId) ||
      (selectedFilter === 'subject' && item.subject?.id === selectedId) ||
      (selectedFilter === 'chapter' && item.chapter?.id === selectedId) ||
      (selectedFilter === 'topic' && item.topic?.id === selectedId);
    
    return matchesSearch && matchesType && matchesFilter;
  });

  // Get filter options label
  const getFilterOptionsLabel = () => {
    switch (selectedFilter) {
      case 'course':
        return 'Courses';
      case 'subject':
        return 'Subjects';
      case 'chapter':
        return 'Chapters';
      case 'topic':
        return 'Topics';
      default:
        return '';
    }
  };

  // Get filter options
  const getFilterOptions = () => {
    switch (selectedFilter) {
      case 'course':
        return availableFilters.courses;
      case 'subject':
        return availableFilters.subjects;
      case 'chapter':
        return availableFilters.chapters;
      case 'topic':
        return availableFilters.topics;
      default:
        return [];
    }
  };

  const getContentIcon = (type: 'video' | 'pdf' | 'document') => {
    if (type === 'video') {
      return (
        <div className="rounded-md bg-blue-100 p-2">
          <svg className="h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
          </svg>
        </div>
      );
    } else if (type === 'pdf') {
      return (
        <div className="rounded-md bg-red-100 p-2">
          <svg className="h-5 w-5 text-red-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
        </div>
      );
    } else {
      return (
        <div className="rounded-md bg-gray-100 p-2">
          <svg className="h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
        </div>
      );
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'N/A') return 'N/A';
    try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    } catch (err) {
      console.error('Error formatting date:', err);
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <MainLayout user={user} onLogout={onLogout} sidebarContent={<StudentSidebar />}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </MainLayout>
    );
  }

  if (!hasActiveSubscription) {
    return (
      <MainLayout user={user} onLogout={onLogout} sidebarContent={<StudentSidebar />}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Learning Materials</h1>
          <p className="text-gray-600">Access your course content and study materials.</p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
            <input
              type="text"
              placeholder="Search content..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            </div>
            <div className="w-full sm:w-48">
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as any)}
              >
                <option value="all">All Types</option>
                <option value="video">Videos</option>
                <option value="pdf">PDFs</option>
                <option value="document">Documents</option>
              </select>
            </div>
          </div>

          {/* Content Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedFilter}
                onChange={(e) => {
                  setSelectedFilter(e.target.value as 'all' | 'course' | 'subject' | 'chapter' | 'topic');
                  setSelectedId('all');
                }}
              >
                <option value="all">All Content</option>
                {availableFilters.courses.length > 0 && (
                  <option value="course">Filter by Course</option>
                )}
                {availableFilters.subjects.length > 0 && (
                  <option value="subject">Filter by Subject</option>
                )}
                {availableFilters.chapters.length > 0 && (
                  <option value="chapter">Filter by Chapter</option>
                )}
                {availableFilters.topics.length > 0 && (
                  <option value="topic">Filter by Topic</option>
                )}
              </select>
        </div>

            {selectedFilter !== 'all' && (
              <div className="flex-1">
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                >
                  <option value="all">All {getFilterOptionsLabel()}</option>
                  {getFilterOptions().map(option => (
                    <option key={option.id} value={option.id}>{option.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No Active Subscription</h3>
              <p className="mt-1 text-sm text-gray-500">You need an active subscription to access contents.</p>
              <div className="mt-6">
                <Link
                  to="/student/subscription"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  View Subscription Plans
                </Link>
              </div>
            </div>
          </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<StudentSidebar />}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Learning Materials</h1>
        <p className="text-gray-600">Access your course content and study materials</p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search content..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-48">
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
            >
              <option value="all">All Types</option>
              <option value="video">Videos</option>
              <option value="pdf">PDFs</option>
              <option value="document">Documents</option>
            </select>
          </div>
        </div>

        {/* Content Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedFilter}
              onChange={(e) => {
                setSelectedFilter(e.target.value as 'all' | 'course' | 'subject' | 'chapter' | 'topic');
                setSelectedId('all');
              }}
            >
              <option value="all">All Content</option>
              {availableFilters.courses.length > 0 && (
                <option value="course">Filter by Course</option>
              )}
              {availableFilters.subjects.length > 0 && (
                <option value="subject">Filter by Subject</option>
              )}
              {availableFilters.chapters.length > 0 && (
                <option value="chapter">Filter by Chapter</option>
              )}
              {availableFilters.topics.length > 0 && (
                <option value="topic">Filter by Topic</option>
              )}
            </select>
          </div>
          
          {selectedFilter !== 'all' && (
            <div className="flex-1">
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              >
                <option value="all">All {getFilterOptionsLabel()}</option>
                {getFilterOptions().map(option => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {error ? (
        <div className="text-center py-8">
          <div className="text-red-600 mb-2">Error: {error}</div>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      ) : loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : contentItems.length === 0 || filteredContent.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No Content Found</h3>
            <div className="mt-3 text-sm text-gray-500 max-w-md mx-auto">
              {searchTerm && selectedType !== 'all' ? (
                <p>
                  No {selectedType} content found matching "{searchTerm}".
                  Try using different keywords or selecting a different content type.
                </p>
              ) : searchTerm ? (
                <p>
                  No content found matching "{searchTerm}".
                  Try using different keywords or adjusting your filters.
                </p>
              ) : selectedType !== 'all' ? (
                <p>
                  No {selectedType} content available.
                  Try selecting a different content type.
                </p>
              ) : selectedFilter !== 'all' ? (
                <p>
                  No content found for the selected {selectedFilter.toLowerCase()}.
                  Try selecting a different filter option.
                </p>
              ) : (
                <p>
                  No content is currently available.
                  Please check back later or contact support if you think this is an error.
                </p>
              )}
            </div>
            <div className="mt-6 flex justify-center space-x-3">
              {(searchTerm || selectedType !== 'all' || selectedFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedType('all');
                    setSelectedFilter('all');
                    setSelectedId('all');
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredContent.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition">
              <div className="flex items-start p-4">
                <div className="mr-4">
                  {getContentIcon(item.type)}
                </div>
                <div className="flex-grow">
                  <div className="flex items-center mb-1">
                    <h3 className="text-lg font-semibold text-gray-900 mr-3">{item.title}</h3>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {item.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                  <div className="text-sm text-gray-500 space-y-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {item.course && (
                        <div>Course: {item.course.name}</div>
                      )}
                      {item.subject && (
                        <div>Subject: {item.subject.name}</div>
                      )}
                      {item.chapter && (
                        <div>Chapter: {item.chapter.name}</div>
                      )}
                      {item.topic && (
                        <div>Topic: {item.topic.name}</div>
                      )}
                    </div>
                    <div className="mt-2">
                      {item.creator && (
                        <span className="mr-4">Added by: {item.creator.username}</span>
                      )}
                      <span>Added: {formatDate(item.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    View Content
                  </a>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </MainLayout>
  );
};

export default Content;