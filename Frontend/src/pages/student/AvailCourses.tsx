import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StudentSidebar from './components/StudentSidebar';
import axios from 'axios';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

interface ActiveSubscriptionResponse {
  id: number;
  user_id: number;
  subscription_plan_packages_id: number;
  subscription_plan_package: {
    id: number;
    subscription_id: number;
    package_ids: number[];
    packages: {
      id: number;
      courses: Course[];
    }[];
  };
}

// Updated Course interface based on API response
interface Course {
  id: number;
  name: string;
  description: string;
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
  };
  isSubscribed?: boolean;
}

interface DashboardPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

const AvailCourses: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [subscribedCourseIds, setSubscribedCourseIds] = useState<number[]>([]);

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

  const fetchActiveSubscriptions = async () => {
    try {
      const token = localStorage.getItem('token');
      const userId = getUserId();
      
      if (!token || !userId) {
        console.error('No token or user ID found');
        return;
      }

      const response = await axios.get(
        `${API_URL}/api/subscriptions/subscriptions/user/${userId}/active`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      // Extract all course IDs from the packages
      const subscribedIds = new Set<number>();
      
      if (Array.isArray(response.data)) {
        response.data.forEach((subscription: ActiveSubscriptionResponse) => {
          subscription.subscription_plan_package.packages?.forEach((pkg: { id: number; courses: Course[] }) => {
            pkg.courses.forEach((course: Course) => {
              subscribedIds.add(course.id);
            });
          });
        });
      } else if (response.data) {
        // Handle single subscription response
        response.data.subscription_plan_package.packages?.forEach((pkg: { id: number; courses: Course[] }) => {
          pkg.courses.forEach((course: Course) => {
            subscribedIds.add(course.id);
          });
        });
      }

      setSubscribedCourseIds(Array.from(subscribedIds));
    } catch (err) {
      console.error('Error fetching active subscriptions:', err);
    }
  };

  // Separate useEffect for fetching active subscriptions
  useEffect(() => {
    fetchActiveSubscriptions();
  }, []); // Run only once on component mount

  // Fetch courses from API
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Get the token from localStorage
        const token = localStorage.getItem('token');
        
        if (!token) {
          setError('Authentication token not found. Please log in again.');
          setIsLoading(false);
          return;
        }
        
        // Fetch courses
        const coursesResponse = await axios.get(`${API_URL}/api/courses/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        // Set courses with subscription status
        const coursesWithSubscriptionStatus = coursesResponse.data.map((course: Course) => ({
          ...course,
          isSubscribed: subscribedCourseIds.includes(course.id)
        }));
        
        setCourses(coursesWithSubscriptionStatus);
        setFilteredCourses(coursesWithSubscriptionStatus);
      } catch (err: any) {
        console.error('Error fetching courses:', err);
        
        if (err.response && err.response.status === 401) {
          setError('Authentication failed. Please log in again.');
        } else {
          setError('Failed to fetch courses. Please try again later.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [subscribedCourseIds]); // Only re-run when subscribedCourseIds changes

  // Filter courses based on search term
  useEffect(() => {
    if (!courses.length) return;

    let filtered = courses;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(course => 
        course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (course.description && course.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (course.creator.username && course.creator.username.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredCourses(filtered);
  }, [searchTerm, courses]);

  // Format date for better display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // Function to truncate text with ellipsis
  const truncateText = (text: string, maxLength: number = 150) => {
    if (!text) return 'No description available';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<StudentSidebar />}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Available Courses</h1>
          <p className="mt-2 text-lg text-gray-600">Discover and enroll in new courses to expand your knowledge.</p>
      </div>

      {/* Search */}
        <div className="mb-8">
        <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
          <input
            type="text"
              placeholder="Search courses by title, description, or instructor...."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
          />
        </div>
      </div>
      
      {/* Error state */}
      {error && (
          <div className="mb-8 bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredCourses.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No courses found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search to find what you're looking for.
            </p>
          </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
              <div key={course.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">{course.name}</h3>
                    {course.isSubscribed ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Subscribed
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        Available
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 mb-6 line-clamp-3 h-18">
                    {truncateText(course.description, 120)}
                  </p>
                  <div className="space-y-3 text-sm text-gray-600">
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-gray-400 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                      <span>Instructor: {course.creator.username}</span>
                    </div>
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-gray-400 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      <span>Created: {formatDate(course.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <Link 
                    to={`/student/course-detail/${course.id}`}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
                  >
                    View Course Details
                    <svg className="ml-2 -mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </Link>
                </div>
              </div>
          ))}
        </div>
      )}
      </div>
    </MainLayout>
  );
};

export default AvailCourses; 