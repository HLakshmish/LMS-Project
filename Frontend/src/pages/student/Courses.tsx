import React, { useEffect, useState } from 'react';
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
  code: string;
  description: string;
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
}

interface Course {
  id: number;
  name: string;
  description: string;
  duration: number;
  is_active: boolean;
  level: string;
  created_at: string;
  updated_at: string | null;
  stream?: Stream;
  subject?: Subject;
  chapter?: Chapter;
  topic?: Topic;
  creator?: Creator;
  progress?: number;
  subscriptionPackageId?: number; // Added for unique key generation
}

interface Package {
  id: number;
  name: string;
  description: string;
  created_by: number;
  created_at: string;
  updated_at: string | null;
  creator: Creator;
  courses: Course[];
}

interface Subscription {
  id: number;
  name: string;
  description: string;
  duration_days: number;
  price: number;
  max_exams: number;
  features: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

interface SubscriptionPackage {
  subscription_id: number;
  package_id: number;
  id: number;
  created_at: string;
  updated_at: string | null;
  subscription: Subscription;
  package: Package;
}

interface DashboardPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

interface ActiveSubscriptionResponse {
  subscription_plan_package: {
    packages: Package[];
  };
}

const Courses: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication token not found');
        }

        const userId = getUserId();
        if (!userId) {
          throw new Error('User ID not found');
        }

        // Fetch active subscriptions
        const response = await axios.get(`${API_URL}/api/subscriptions/subscriptions/user/${userId}/active`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        // Extract all courses from active subscriptions
        const allCourses = response.data.reduce((acc: Course[], subscription: ActiveSubscriptionResponse) => {
          if (subscription.subscription_plan_package && 
              subscription.subscription_plan_package.packages) {
            // Handle multiple packages
            subscription.subscription_plan_package.packages.forEach((pkg: Package) => {
              if (pkg.courses) {
                acc.push(...pkg.courses);
              }
            });
          }
          return acc;
        }, []);

        // Remove duplicate courses based on course ID
        const uniqueCourses = Array.from(
          new Map(allCourses.map((course: Course) => [course.id, course])).values()
        );

        setCourses(uniqueCourses as Course[]);
      } catch (err) {
        console.error('Error fetching courses:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch courses');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
  }, []);

  useEffect(() => {
    let filtered = [...courses];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(course => 
        course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply category filter
    if (selectedFilter !== 'all') {
      if (selectedFilter === 'in-progress') {
        filtered = filtered.filter(course => course.progress && course.progress > 0 && course.progress < 100);
      } else if (selectedFilter === 'completed') {
        filtered = filtered.filter(course => course.progress === 100);
      } else if (selectedFilter === 'not-started') {
        filtered = filtered.filter(course => !course.progress || course.progress === 0);
      }
    }

    setFilteredCourses(filtered);
  }, [courses, searchTerm, selectedFilter]);

  const getProgressColor = (progress: number) => {
    if (progress < 30) return 'bg-red-500';
    if (progress < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getLevelBadgeColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Add handleContinueLearning function
  const handleContinueLearning = (courseId: number) => {
    navigate(`/student/content?courseId=${courseId}`);
  };

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<StudentSidebar />}>
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
        <p className="text-gray-600">Manage and track your enrolled courses.</p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search courses..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute left-3 top-2.5">
            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-[400px]">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">No Active Subscription</h3>
          <p className="text-gray-600 mb-6">You need an active subscription to access contents.</p>
          <Link
            to="/student/subscription"
            className="inline-flex items-center px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            View Subscription Plans
          </Link>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No courses found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try a different search term.' : 'You haven\'t enrolled in any courses yet.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <Card 
              key={`${course.id}-${course.subscriptionPackageId}`} 
              className="flex flex-col h-full hover:shadow-lg transition-shadow duration-200"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getLevelBadgeColor(course.level)}`}>
                    {course.level}
                  </span>
                  <span className="text-sm text-gray-500">{course.duration}h</span>
                </div>

                <h3 className="text-lg font-semibold mb-2">{course.name}</h3>
                <p className="text-gray-600 mb-4 line-clamp-2">{course.description}</p>

                <div className="space-y-2 mb-4">
                  {course.subject && (
                    <div className="flex items-center text-sm text-gray-600">
                      <svg className="h-4 w-4 text-gray-400 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                      </svg>
                      {course.subject.name}
                    </div>
                  )}
                  {course.stream && course.stream.class_ && (
                    <div className="flex items-center text-sm text-gray-600">
                      <svg className="h-4 w-4 text-gray-400 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0h8v12H6V4z" clipRule="evenodd" />
                      </svg>
                      {course.stream.class_.name}
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 pb-6 mt-4">
                <Button
                  onClick={() => handleContinueLearning(course.id)}
                  className="w-full"
                >
                  Continue Learning
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </MainLayout>
  );
};

export default Courses; 