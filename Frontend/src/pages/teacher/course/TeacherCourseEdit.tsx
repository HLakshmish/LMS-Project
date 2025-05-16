import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../../../components/layout/MainLayout';
import TeacherSidebar from '../sidebar/TeacherSidebar';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import { useAuth } from '../../../contexts/AuthContext';
import axios from 'axios';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
interface TeacherCourseEditProps {
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
  class_id?: number; // For filtering purposes only
}

interface UserProfile {
  id: number;
  username: string;
  email: string;
  role: string;
}

const TeacherCourseEdit: React.FC<TeacherCourseEditProps> = ({ user, onLogout }) => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState<Course>({
    id: courseId || '',
    name: '',
    description: '',
    duration: 0,
    is_active: true,
    stream_id: 0,
    subject_id: 0,
    chapter_id: 0,
    topic_id: 0,
    level: 'beginner',
    created_by: 0,
    created_at: '',
    updated_at: null,
    class_id: 0 // For filtering purposes
  });

  // Data for dropdowns
  const [classes, setClasses] = useState<Class[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  
  // Filtered data based on selections
  const [filteredStreams, setFilteredStreams] = useState<Stream[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
  const [filteredChapters, setFilteredChapters] = useState<Chapter[]>([]);
  const [filteredTopics, setFilteredTopics] = useState<Topic[]>([]);

  // Configure axios with authentication header
  const axiosConfig = () => {
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  };

  // Fetch logged-in user details
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            'accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user details');
        }

        const userData = await response.json();
        setCurrentUser(userData);
      } catch (err) {
        console.error('Error fetching user profile:', err);
        navigate('/teacher/dashboard');
      }
    };

    fetchCurrentUser();
  }, [token, navigate]);

  // Fetch dropdown data
  useEffect(() => {
    fetchClasses();
    fetchStreams();
    fetchSubjects();
    fetchChapters();
    fetchTopics();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/classes/`, axiosConfig());
      setClasses(response.data);
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const fetchStreams = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/streams/`, axiosConfig());
      setStreams(response.data);
    } catch (err) {
      console.error('Error fetching streams:', err);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/subjects/`, axiosConfig());
      setSubjects(response.data);
    } catch (err) {
      console.error('Error fetching subjects:', err);
    }
  };

  const fetchChapters = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/chapters/`, axiosConfig());
      setChapters(response.data);
    } catch (err) {
      console.error('Error fetching chapters:', err);
    }
  };

  const fetchTopics = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/topics/`, axiosConfig());
      setTopics(response.data);
    } catch (err) {
      console.error('Error fetching topics:', err);
    }
  };

  // Fetch course details and initialize filter cascades
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`${API_URL}/api/courses/${courseId}`, {
          headers: {
            'accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch course details');
        }

        const courseData = await response.json();
        
        // Determine class_id from stream data if available
        let class_id = 0;
        if (courseData.stream && courseData.stream.class_id) {
          class_id = courseData.stream.class_id;
        }

        // Set form data
        setFormData({
          id: courseId || '',
          name: courseData.name || '',
          description: courseData.description || '',
          duration: courseData.duration || 0,
          is_active: courseData.is_active !== undefined ? courseData.is_active : true,
          stream_id: courseData.stream_id || 0,
          subject_id: courseData.subject_id || 0,
          chapter_id: courseData.chapter_id || 0,
          topic_id: courseData.topic_id || 0,
          level: courseData.level || 'beginner',
          created_by: courseData.created_by || 0,
          created_at: courseData.created_at || '',
          updated_at: courseData.updated_at || null,
          creator: courseData.creator,
          stream: courseData.stream,
          subject: courseData.subject,
          chapter: courseData.chapter,
          topic: courseData.topic,
          class_id: class_id
        });

        // Filter streams based on class
        if (class_id > 0) {
          const streamsForClass = streams.filter(stream => stream.class_id === class_id);
          setFilteredStreams(streamsForClass);
        }

        // Filter subjects based on stream
        if (courseData.stream_id > 0) {
          const subjectsForStream = subjects.filter(subject => subject.stream_id === courseData.stream_id);
          setFilteredSubjects(subjectsForStream);
        }

        // Filter chapters based on subject
        if (courseData.subject_id > 0) {
          const chaptersForSubject = chapters.filter(chapter => chapter.subject_id === courseData.subject_id);
          setFilteredChapters(chaptersForSubject);
        }

        // Filter topics based on chapter
        if (courseData.chapter_id > 0) {
          const topicsForChapter = topics.filter(topic => topic.chapter_id === courseData.chapter_id);
          setFilteredTopics(topicsForChapter);
        }

        // Check if the current user is the creator of the course
        if (currentUser && courseData.created_by !== currentUser.id) {
          console.warn('Unauthorized access attempt: This user did not create this course');
          navigate('/teacher/dashboard');
        }
      } catch (err) {
        console.error('Error fetching course:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch course details');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser && streams.length > 0 && subjects.length > 0 && chapters.length > 0 && topics.length > 0) {
      fetchCourse();
    }
  }, [courseId, token, currentUser, navigate, streams, subjects, chapters, topics]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle class change
  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const classId = parseInt(e.target.value);
    setFormData(prev => ({ 
      ...prev, 
      class_id: classId,
      stream_id: 0,
      subject_id: 0,
      chapter_id: 0,
      topic_id: 0 
    }));
    
    // Filter streams based on selected class
    if (classId > 0) {
      const streamsForClass = streams.filter(stream => stream.class_id === classId);
      setFilteredStreams(streamsForClass);
    } else {
      setFilteredStreams([]);
    }
    
    // Reset dependent dropdowns
    setFilteredSubjects([]);
    setFilteredChapters([]);
    setFilteredTopics([]);
  };

  // Handle stream change
  const handleStreamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const streamId = parseInt(e.target.value);
    setFormData(prev => ({ ...prev, stream_id: streamId, subject_id: 0, chapter_id: 0, topic_id: 0 }));
    
    if (streamId > 0) {
      // Client-side filtering of subjects based on stream_id
      const subjectsForStream = subjects.filter(subject => subject.stream_id === streamId);
      setFilteredSubjects(subjectsForStream);
    } else {
      setFilteredSubjects([]);
    }
    setFilteredChapters([]);
    setFilteredTopics([]);
  };

  // Handle subject change
  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const subjectId = parseInt(e.target.value);
    setFormData(prev => ({ ...prev, subject_id: subjectId, chapter_id: 0, topic_id: 0 }));
    
    if (subjectId > 0) {
      const chaptersForSubject = chapters.filter(chapter => chapter.subject_id === subjectId);
      setFilteredChapters(chaptersForSubject);
    } else {
      setFilteredChapters([]);
    }
    setFilteredTopics([]);
  };

  // Handle chapter change
  const handleChapterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const chapterId = parseInt(e.target.value);
    setFormData(prev => ({ ...prev, chapter_id: chapterId, topic_id: 0 }));
    
    if (chapterId > 0) {
      const topicsForChapter = topics.filter(topic => topic.chapter_id === chapterId);
      setFilteredTopics(topicsForChapter);
    } else {
      setFilteredTopics([]);
    }
  };

  // Handle topic change
  const handleTopicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const topicId = parseInt(e.target.value);
    setFormData(prev => ({ ...prev, topic_id: topicId }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Double-check authorization before submitting
      if (currentUser && formData.created_by !== currentUser.id) {
        throw new Error('You are not authorized to edit this course');
      }

      // Validation
      if (!formData.name.trim()) {
        throw new Error('Course name is required');
      }

      if (!formData.description.trim()) {
        throw new Error('Course description is required');
      }

      if (formData.stream_id === 0) {
        throw new Error('Please select a stream');
      }

      if (formData.subject_id === 0) {
        throw new Error('Please select a subject');
      }

      if (formData.chapter_id === 0) {
        throw new Error('Please select a chapter');
      }

      if (formData.topic_id === 0) {
        throw new Error('Please select a topic');
      }

      // Create payload (exclude fields not needed for update)
      const payload = {
        name: formData.name,
        description: formData.description,
        duration: formData.duration,
        is_active: formData.is_active,
        stream_id: formData.stream_id,
        subject_id: formData.subject_id,
        chapter_id: formData.chapter_id,
        topic_id: formData.topic_id,
        level: formData.level
      };

      // API call to update course
      const response = await fetch(`${API_URL}/api/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update course');
      }

      navigate(`/teacher/courses/${courseId}/view`);
    } catch (err) {
      console.error('Error updating course:', err);
      setError(err instanceof Error ? err.message : 'Failed to update course');
      
      if (err instanceof Error && err.message === 'You are not authorized to edit this course') {
        navigate('/teacher/dashboard');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(`/teacher/courses/${courseId}/view`);
  };

  if (!currentUser || loading) {
    return (
      <MainLayout user={user} onLogout={onLogout} sidebarContent={<TeacherSidebar />}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<TeacherSidebar />}>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Edit Course</h1>
          <div className="space-x-4">
            <Button onClick={handleCancel} variant="secondary" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={() => handleSubmit()} variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <Card className="mb-6">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Information Section */}
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Basic Information</h4>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Course Name*
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="level" className="block text-sm font-medium text-gray-700">
                      Difficulty Level*
                    </label>
                    <select
                      id="level"
                      name="level"
                      value={formData.level}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                      Duration (hours)*
                    </label>
                    <input
                      type="number"
                      name="duration"
                      id="duration"
                      min="1"
                      value={formData.duration}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="is_active" className="block text-sm font-medium text-gray-700">
                    Status*
                  </label>
                  <select
                    id="is_active"
                    name="is_active"
                    value={formData.is_active ? "true" : "false"}
                    onChange={(e) => setFormData({...formData, is_active: e.target.value === "true"})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Course Description Section */}
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description*
              </label>
              <textarea
                name="description"
                id="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            {/* Classification Section */}
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Course Classification</h4>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="class_id" className="block text-sm font-medium text-gray-700">
                    Class*
                  </label>
                  <select
                    id="class_id"
                    name="class_id"
                    value={formData.class_id}
                    onChange={handleClassChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    <option value={0}>Select Class</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="stream_id" className="block text-sm font-medium text-gray-700">
                    Stream*
                  </label>
                  <select
                    id="stream_id"
                    name="stream_id"
                    value={formData.stream_id}
                    onChange={handleStreamChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    disabled={filteredStreams.length === 0}
                    required
                  >
                    <option value={0}>Select Stream</option>
                    {filteredStreams.map(stream => (
                      <option key={stream.id} value={stream.id}>{stream.name}</option>
                    ))}
                  </select>
                  {formData.class_id === 0 && (
                    <p className="mt-1 text-xs text-gray-500">Select a class first to load related streams</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="subject_id" className="block text-sm font-medium text-gray-700">
                    Subject*
                  </label>
                  <select
                    id="subject_id"
                    name="subject_id"
                    value={formData.subject_id}
                    onChange={handleSubjectChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    disabled={filteredSubjects.length === 0}
                    required
                  >
                    <option value={0}>Select Subject</option>
                    {filteredSubjects.map(subject => (
                      <option key={subject.id} value={subject.id}>{subject.name}</option>
                    ))}
                  </select>
                  {formData.stream_id === 0 && (
                    <p className="mt-1 text-xs text-gray-500">Select a stream first to load related subjects</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="chapter_id" className="block text-sm font-medium text-gray-700">
                    Chapter*
                  </label>
                  <select
                    id="chapter_id"
                    name="chapter_id"
                    value={formData.chapter_id}
                    onChange={handleChapterChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    disabled={filteredChapters.length === 0}
                    required
                  >
                    <option value={0}>Select Chapter</option>
                    {filteredChapters.map(chapter => (
                      <option key={chapter.id} value={chapter.id}>{chapter.name}</option>
                    ))}
                  </select>
                  {formData.subject_id === 0 && (
                    <p className="mt-1 text-xs text-gray-500">Select a subject first to load related chapters</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="topic_id" className="block text-sm font-medium text-gray-700">
                    Topic*
                  </label>
                  <select
                    id="topic_id"
                    name="topic_id"
                    value={formData.topic_id}
                    onChange={handleTopicChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    disabled={filteredTopics.length === 0}
                    required
                  >
                    <option value={0}>Select Topic</option>
                    {filteredTopics.map(topic => (
                      <option key={topic.id} value={topic.id}>{topic.name}</option>
                    ))}
                  </select>
                  {formData.chapter_id === 0 && (
                    <p className="mt-1 text-xs text-gray-500">Select a chapter first to load related topics</p>
                  )}
                </div>
              </div>
            </div>

            
          </form>
        </Card>
      </div>
    </MainLayout>
  );
};

export default TeacherCourseEdit; 
