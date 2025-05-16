import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../../../components/layout/MainLayout';
import TeacherSidebar from '../sidebar/TeacherSidebar';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import { useAuth } from '../../../contexts/AuthContext';

interface TeacherCourseViewProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

interface Creator {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface Class {
  id: number;
  name: string;
  description?: string;
}

interface Stream {
  id: number;
  name: string;
  description?: string;
  class_id: number;
  class_?: Class;
}

interface Subject {
  id: number;
  name: string;
  code: string;
  description?: string;
  stream_id: number;
  stream?: Stream;
}

interface Chapter {
  id: number;
  name: string;
  description?: string;
  subject_id: number;
  chapter_number?: number;
  subject?: Subject;
}

interface Topic {
  id: number;
  name: string;
  description?: string;
  chapter_id: number;
  chapter?: Chapter;
}

interface Course {
  id: string | number;
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
  creator?: Creator;
  stream?: Stream;
  subject?: Subject;
  chapter?: Chapter;
  topic?: Topic;
}

const TeacherCourseView: React.FC<TeacherCourseViewProps> = ({ user, onLogout }) => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/courses/${courseId}`, {
          headers: {
            'accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch course details');
        }
        const data = await response.json();
        setCourse(data);
      } catch (err) {
        setError('Failed to fetch course details');
        console.error('Error fetching course:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId, token]);

  const handleEdit = () => {
    navigate(`/teacher/courses/${courseId}/edit`);
  };

  const handleBack = () => {
    navigate('/teacher/courses');
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <MainLayout user={user} onLogout={onLogout} sidebarContent={<TeacherSidebar />}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout user={user} onLogout={onLogout} sidebarContent={<TeacherSidebar />}>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!course) {
    return (
      <MainLayout user={user} onLogout={onLogout} sidebarContent={<TeacherSidebar />}>
        <div className="p-6">
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">Course not found</span>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<TeacherSidebar />}>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Course Details</h1>
          <div className="space-x-4">
            <Button onClick={handleBack} variant="secondary">
              Back to Courses
            </Button>
            <Button onClick={handleEdit} variant="primary">
              Edit Course
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Basic Information Section */}
          <Card className="mb-6">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Course Name</h3>
                  <p className="text-base">{course.name}</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Difficulty Level</h3>
                    <p className="text-base capitalize">{course.level}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Duration</h3>
                    <p className="text-base">{course.duration} hours</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Status</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      course.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {course.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Course Description Section */}
          <Card className="mb-6">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Description</h2>
              <p className="text-base whitespace-pre-line">{course.description}</p>
            </div>
          </Card>

          {/* Course Classification Section */}
          <Card className="mb-6">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Course Classification</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {course.stream?.class_ && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Class</h3>
                    <p className="text-base">{course.stream.class_.name}</p>
                  </div>
                )}
                
                {course.stream && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Stream</h3>
                    <p className="text-base">{course.stream.name}</p>
                  </div>
                )}
                
                {course.subject && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Subject</h3>
                    <p className="text-base">{course.subject.name}</p>
                    {course.subject.code && (
                      <p className="text-xs text-gray-500">Code: {course.subject.code}</p>
                    )}
                  </div>
                )}
                
                {course.chapter && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Chapter</h3>
                    <p className="text-base">{course.chapter.name}</p>
                    {course.chapter.chapter_number !== undefined && (
                      <p className="text-xs text-gray-500">Chapter Number: {course.chapter.chapter_number}</p>
                    )}
                  </div>
                )}
                
                {course.topic && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Topic</h3>
                    <p className="text-base">{course.topic.name}</p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Course Information Section */}
          <Card className="mb-6">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Course Information</h2>
              <div className="space-y-3">
                {course.creator && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Creator</h3>
                    <p className="text-base">{course.creator.username} ({course.creator.email})</p>
                    <p className="text-xs text-gray-500">Role: {course.creator.role}</p>
                  </div>
                )}
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Created At</h3>
                  <p className="text-base">{formatDate(course.created_at)}</p>
                </div>
                
                {course.updated_at && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Last Updated</h3>
                    <p className="text-base">{formatDate(course.updated_at)}</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default TeacherCourseView; 