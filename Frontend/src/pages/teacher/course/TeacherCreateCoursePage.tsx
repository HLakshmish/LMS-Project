import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../../components/layout/MainLayout';
import TeacherSidebar from '../sidebar/TeacherSidebar';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { useAuth } from '../../../contexts/AuthContext';
import axios from 'axios';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
interface TeacherCreateCoursePageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

interface CourseForm {
  name: string;
  description: string;
  duration: number;
  is_active: boolean;
  stream_id: number;
  subject_id: number;
  chapter_id: number;
  topic_id: number;
  level: string;
  class_id?: number; // Used for filtering streams
}

interface Class {
  id: number;
  name: string;
}

interface Stream {
  id: number;
  name: string;
  class_id: number;
}

interface Subject {
  id: number;
  name: string;
  stream_id: number;
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

const TeacherCreateCoursePage: React.FC<TeacherCreateCoursePageProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CourseForm>({
    name: '',
    description: '',
    duration: 0,
    is_active: true,
    stream_id: 0,
    subject_id: 0,
    chapter_id: 0,
    topic_id: 0,
    level: 'beginner',
    class_id: 0
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
      setError('Failed to fetch classes');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
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

      // Create payload (exclude class_id as it's just for UI filtering)
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

      // API call
      const response = await fetch(`${API_URL}/api/courses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create course');
      }
      
      const data = await response.json();
      console.log('Course created:', data);
      navigate('/teacher/courses');     
    } catch (err) {
      console.error('Error creating course:', err);
      setError(err instanceof Error ? err.message : 'Failed to create course');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/teacher/courses');
  };

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<TeacherSidebar />}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New Course</h1>
        <p className="text-gray-600">Create a new course for your students</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {/* Basic Information Section */}
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Basic Information</h4>
            <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Course Name*
            </label>
            <input
              placeholder="Enter course name"
              type="text"
              name="name"
              id="name"
              value={formData.name}
              onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10"
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
              placeholder="Provide a detailed description of the course content, objectives, and expected outcomes..."
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
        
          <div className="flex justify-end space-x-3">
            <Button
              variant="light"
              onClick={handleCancel}
              type="button"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Course'}
            </Button>
          </div>
        </form>
      </Card>
    </MainLayout>
  );
};

export default TeacherCreateCoursePage; 