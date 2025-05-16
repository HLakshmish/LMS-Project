import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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

// Updated Course interface to match API response
interface Course {
  id: number;
  name: string;
  description: string;
  duration: number;
  is_active: boolean;
  stream_id: number;
  subject_id: number;
  chapter_id: number;
  topic_id: number;
  level: string;
  created_by: number;
  created_at: string;
  updated_at: string | null;
  creator: Creator;
  stream: Stream;
  subject: Subject;
  chapter: Chapter;
  topic: Topic;
}

interface DashboardPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

const CourseDetail: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourseDetails = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          setError('Authentication token not found. Please log in again.');
          setIsLoading(false);
          return;
        }
        
        const response = await axios.get(`${API_URL}/api/courses/${courseId}/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        setCourse(response.data);
      } catch (err: any) {
        console.error('Error fetching course details:', err);
        
        if (err.response && err.response.status === 401) {
          setError('Authentication failed. Please log in again.');
        } else if (err.response && err.response.status === 404) {
          setError('Course not found. It may have been removed or you don\'t have access to it.');
        } else {
          setError('Failed to fetch course details. Please try again later.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (courseId) {
      fetchCourseDetails();
    }
  }, [courseId]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  // Helper function to safely access nested properties
  const safeAccess = (obj: any, path: string) => {
    try {
      const parts = path.split('.');
      let result = obj;
      
      for (const part of parts) {
        if (result === null || result === undefined) {
          return null;
        }
        result = result[part];
      }
      
      return result === null || result === undefined ? null : result;
    } catch (err) {
      console.error(`Error accessing path ${path}:`, err);
      return null;
    }
  };

  // Helper function to check if a section has data
  const hasData = (course: Course | null, paths: string[]) => {
    if (!course) return false;
    return paths.some(path => safeAccess(course, path) !== null);
  };

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<StudentSidebar />}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Back Button */}
        <div className="mb-8 flex items-center">
          <button 
            onClick={handleGoBack}
            className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Go back"
          >
            <svg className="h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Course Details</h1>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-8 bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
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

        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : course ? (
          <div className="space-y-8">
            {/* Course Header */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-8">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">{course.name}</h2>
                    {course.creator && (
                      <div className="flex items-center text-sm text-gray-600 mb-3">
                        <svg className="h-4 w-4 text-gray-400 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                        </svg>
                        <span className="font-medium">Instructor:</span> 
                        <span className="ml-2">{course.creator.username}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3">
                      {course.level && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Level: {course.level}
                        </span>
                      )}
                      {course.duration > 0 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Duration: {course.duration} hours
                        </span>
                      )}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        course.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {course.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 md:mt-0">
                    <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
                      <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                      </svg>
                      Enroll in Course
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Course Description */}
            {course.description && (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">About this Course</h3>
                  <div className="prose max-w-none">
                    <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                      {course.description}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Course Structure */}
            {hasData(course, ['subject', 'stream', 'chapter', 'topic']) && (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Structure</h3>
                  <div className="space-y-4">
                    {/* Subject */}
                    {course.subject && (
                      <div className="flex items-center space-x-2">
                        <svg className="h-5 w-5 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <div>
                          <h4 className="text-base font-medium text-gray-900">
                            {course.subject.name} ({course.subject.code})
                          </h4>
                          {course.subject.description && (
                            <p className="text-xs text-gray-500">
                              {course.subject.description}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Stream and Class */}
                    {course.subject?.stream && (
                      <>
                        <div className="ml-8 flex items-center space-x-2">
                          <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <div>
                            <h4 className="text-base font-medium text-gray-900">
                              {course.subject.stream.name}
                            </h4>
                            {course.subject.stream.description && (
                              <p className="text-xs text-gray-500">
                                {course.subject.stream.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {course.subject.stream.class_ && (
                          <div className="ml-16 flex items-center space-x-2">
                            <svg className="h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <div>
                              <h4 className="text-base font-medium text-gray-900">
                                {course.subject.stream.class_.name}
                              </h4>
                              {course.subject.stream.class_.description && (
                                <p className="text-xs text-gray-500">
                                  {course.subject.stream.class_.description}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Course Information */}
            {hasData(course, ['creator', 'created_at']) && (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {course.creator && (
                      <>
                        <div className="space-y-1">
                          <h4 className="text-xs font-medium text-gray-500">Created By</h4>
                          <p className="text-sm text-gray-900">{course.creator.username}</p>
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs font-medium text-gray-500">Creator Email</h4>
                          <p className="text-sm text-gray-900">{course.creator.email}</p>
                        </div>
                      </>
                    )}
                    {course.created_at && (
                      <div className="space-y-1">
                        <h4 className="text-xs font-medium text-gray-500">Created On</h4>
                        <p className="text-sm text-gray-900">{formatDate(course.created_at)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <button className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
                <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
                Enroll Now
              </button>
              <button 
                onClick={handleGoBack}
                className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                <svg className="mr-2 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Back to Courses
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Course not found</h3>
              <p className="mt-2 text-sm text-gray-500">The course you're looking for doesn't exist or you don't have access to it.</p>
              <div className="mt-6">
                <button
                  onClick={handleGoBack}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  Go back to courses
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default CourseDetail; 