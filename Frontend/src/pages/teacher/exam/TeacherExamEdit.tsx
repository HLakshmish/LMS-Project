import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../../../components/layout/MainLayout';
import TeacherSidebar from '../sidebar/TeacherSidebar';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { useAuth } from '../../../contexts/AuthContext';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
interface TeacherExamEditProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

interface Exam {
  id: string;
  title: string;
  description: string;
  start_datetime: string;
  end_datetime: string;
  duration_minutes: number;
  max_marks: number;
  max_questions: number;
  created_by: number;
  course_id: number | null;
  class_id: number | null;
  subject_id: number | null;
  chapter_id: number | null;
  topic_id: number | null;
}

interface Course {
  id: number;
  name: string;
  description: string;
}

interface Subject {
  id: number;
  name: string;
  code?: string;
  stream_id?: number;
  stream?: {
    id: number;
    name: string;
    description?: string;
    class_id?: number;
    class_?: {
      id: number;
      name: string;
    }
  };
}

interface Chapter {
  id: number;
  name: string;
  description?: string;
  subject_id?: number;
  subject?: {
    id: number;
    name: string;
    stream_id?: number;
    stream?: {
      id: number;
      name: string;
    }
  };
}

interface Topic {
  id: number;
  name: string;
  description?: string;
  chapter_id?: number;
  chapter?: {
    id: number;
    name: string;
    subject_id?: number;
    subject?: {
      id: number;
      name: string;
      stream_id?: number;
      stream?: {
        id: number;
        name: string;
        class_id?: number;
        class_?: {
          id: number;
          name: string;
        }
      }
    }
  };
}

interface UserProfile {
  id: number;
  username: string;
  email: string;
  role: string;
}

// For UI purpose only, not sent to API
type AssociationType = 'course' | 'class' | 'subject' | 'chapter' | 'topic';

interface ExamForm {
  title: string;
  description: string;
  scheduledDate: string;
  scheduledTime: string;
  duration_minutes: number;
  max_marks: number;
  max_questions: number;
  course_id?: number;
  class_id?: number;
  subject_id?: number;
  chapter_id?: number;
  topic_id?: number;
  associationType: AssociationType; // What the exam is associated with
}

// Type guard to check if a field is an association ID field
function isAssociationIdField(key: string): key is keyof Pick<ExamForm, 'course_id' | 'class_id' | 'subject_id' | 'chapter_id' | 'topic_id'> {
  return ['course_id', 'class_id', 'subject_id', 'chapter_id', 'topic_id'].includes(key);
}

const TeacherExamEdit: React.FC<TeacherExamEditProps> = ({ user, onLogout }) => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  
  // State for data
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  
  const [formData, setFormData] = useState<ExamForm>({
    title: '',
    description: '',
    scheduledDate: '',
    scheduledTime: '',
    duration_minutes: 60,
    max_marks: 100,
    max_questions: 10,
    course_id: undefined,
    class_id: undefined,
    subject_id: undefined,
    chapter_id: undefined,
    topic_id: undefined,
    associationType: 'course'
  });

  // Fetch all needed data from APIs
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Fetch courses
        const coursesResponse = await fetch(`${API_URL}/api/courses`, {
          headers: {
            'accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        // Fetch classes
        const classesResponse = await fetch(`${API_URL}/api/classes/`, {
          headers: {
            'accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        // Fetch subjects
        const subjectsResponse = await fetch(`${API_URL}/api/subjects/`, {
          headers: {
            'accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        // Fetch chapters
        const chaptersResponse = await fetch(`${API_URL}/api/chapters/`, {
          headers: {
            'accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        // Fetch topics
        const topicsResponse = await fetch(`${API_URL}/api/topics/`, {
          headers: {
            'accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!coursesResponse.ok || !classesResponse.ok || !subjectsResponse.ok || !chaptersResponse.ok || !topicsResponse.ok) {
          throw new Error('Failed to fetch one or more data types');
        }

        const coursesData = await coursesResponse.json();
        const classesData = await classesResponse.json();
        const subjectsData = await subjectsResponse.json();
        const chaptersData = await chaptersResponse.json();
        const topicsData = await topicsResponse.json();

        setCourses(coursesData);
        setClasses(classesData);
        setSubjects(subjectsData);
        setChapters(chaptersData);
        setTopics(topicsData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      }
    };

    fetchAllData();
  }, [token]);

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

  // Fetch exam details
  useEffect(() => {
    const fetchExam = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/exams/exams/${examId}`, {
          headers: {
            'accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch exam details');
        }

        const examData = await response.json();
        
        // Convert ISO datetime to local date and time parts
        const startDateTime = new Date(examData.start_datetime);
        const scheduledDate = startDateTime.toISOString().split('T')[0];
        const scheduledTime = startDateTime.toTimeString().slice(0, 5);

        // Determine which association type is used
        let associationType: AssociationType = 'course';
        if (examData.topic_id) associationType = 'topic';
        else if (examData.chapter_id) associationType = 'chapter';
        else if (examData.subject_id) associationType = 'subject';
        else if (examData.class_id) associationType = 'class';
        else if (examData.course_id) associationType = 'course';

        setFormData({
          title: examData.title || '',
          description: examData.description || '',
          scheduledDate,
          scheduledTime,
          duration_minutes: examData.duration_minutes || 60,
          max_marks: examData.max_marks || 100,
          max_questions: examData.max_questions || 10,
          course_id: examData.course_id || undefined,
          class_id: examData.class_id || undefined,
          subject_id: examData.subject_id || undefined,
          chapter_id: examData.chapter_id || undefined,
          topic_id: examData.topic_id || undefined,
          associationType
        });

        // Check if the current user is the creator of the exam
        if (currentUser && examData.created_by !== currentUser.id) {
          console.warn('Unauthorized access attempt: This user did not create this exam');
          navigate('/teacher/exams');
        }
      } catch (err) {
        console.error('Error fetching exam:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch exam details');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchExam();
    }
  }, [examId, token, currentUser, navigate]);

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

  // Get the appropriate options based on association type
  const getAssociationOptions = () => {
    switch(formData.associationType) {
      case 'course': return courses;
      case 'class': return classes;
      case 'subject': return subjects;
      case 'chapter': return chapters;
      case 'topic': return topics;
      default: return [];
    }
  };

  // Format the display name for each option type
  const formatOptionName = (item: any) => {
    if (formData.associationType === 'subject' && item.stream) {
      const streamName = safeAccess(item, 'stream.name');
      const className = safeAccess(item, 'stream.class_.name');
      
      if (streamName !== 'N/A' && className !== 'N/A') {
        return `${item.name} (${streamName} - ${className})`;
      } else if (streamName !== 'N/A') {
        return `${item.name} (${streamName})`;
      }
      return item.name;
    }
    if (formData.associationType === 'chapter' && item.subject) {
      const subjectName = safeAccess(item, 'subject.name');
      const streamName = safeAccess(item, 'subject.stream.name');
      const className = safeAccess(item, 'subject.stream.class_.name');
      
      // Build the display string based on available information
      let displayParts = [];
      if (subjectName !== 'N/A') displayParts.push(subjectName);
      if (streamName !== 'N/A') displayParts.push(streamName);
      if (className !== 'N/A') displayParts.push(className);
      
      if (displayParts.length > 0) {
        return `${item.name} (${displayParts.join(' - ')})`;
      }
      return item.name;
    }
    if (formData.associationType === 'topic' && item.chapter) {
      const chapterName = safeAccess(item, 'chapter.name');
      const subjectName = safeAccess(item, 'chapter.subject.name');
      const streamName = safeAccess(item, 'chapter.subject.stream.name');
      const className = safeAccess(item, 'chapter.subject.stream.class_.name');
      
      // Build the display string based on available information
      let displayParts = [];
      if (chapterName !== 'N/A') displayParts.push(chapterName);
      if (subjectName !== 'N/A') displayParts.push(subjectName);
      if (streamName !== 'N/A') displayParts.push(streamName);
      if (className !== 'N/A') displayParts.push(className);
      
      if (displayParts.length > 0) {
        return `${item.name} (${displayParts.join(' - ')})`;
      }
    }
    return item.name;
  };

  // Helper function to safely get association ID with proper typing
  const getAssociationIdValue = (type: AssociationType): string => {
    const value = formData[`${type}_id` as keyof Pick<ExamForm, 'course_id' | 'class_id' | 'subject_id' | 'chapter_id' | 'topic_id'>];
    return value !== undefined ? String(value) : '';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Convert to number for IDs and numeric fields
    if (isAssociationIdField(name) || ['duration_minutes', 'max_marks', 'max_questions'].includes(name)) {
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? undefined : Number(value)
      }));
    } else if (name === 'associationType') {
      // Reset all IDs when changing association type
      setFormData(prev => ({
        ...prev,
        associationType: value as AssociationType,
        course_id: undefined,
        class_id: undefined,
        subject_id: undefined,
        chapter_id: undefined,
        topic_id: undefined
      }));
    } else {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Validate required fields
      if (!formData.title.trim()) {
        throw new Error('Exam title is required');
      }
      
      if (!formData.description.trim()) {
        throw new Error('Description is required');
      }
      
      if (!formData.scheduledDate || !formData.scheduledTime) {
        throw new Error('Scheduled date and time are required');
      }
      
      // Validate the selected association
      const associatedId = formData[`${formData.associationType}_id` as keyof Pick<ExamForm, 'course_id' | 'class_id' | 'subject_id' | 'chapter_id' | 'topic_id'>];
      if (!associatedId) {
        setError(`Please select a ${formData.associationType}`);
        setIsSubmitting(false);
        return;
      }

      // Combine date and time into ISO string format for start datetime
      const startDateTime = new Date(formData.scheduledDate + 'T' + formData.scheduledTime);
      
      // Calculate end datetime by adding duration minutes
      const endDateTime = new Date(startDateTime.getTime() + formData.duration_minutes * 60000);

      const examData = {
        title: formData.title,
        description: formData.description,
        start_datetime: startDateTime.toISOString(),
        duration_minutes: formData.duration_minutes,
        max_marks: formData.max_marks,
        max_questions: formData.max_questions,
        course_id: null as number | null,
        class_id: null as number | null,
        subject_id: null as number | null,
        chapter_id: null as number | null,
        topic_id: null as number | null
      };

      // Only set the ID for the selected association type
      if (formData.associationType === 'course' && formData.course_id) {
        examData.course_id = formData.course_id;
      } else if (formData.associationType === 'class' && formData.class_id) {
        examData.class_id = formData.class_id;
      } else if (formData.associationType === 'subject' && formData.subject_id) {
        examData.subject_id = formData.subject_id;
      } else if (formData.associationType === 'chapter' && formData.chapter_id) {
        examData.chapter_id = formData.chapter_id;
      } else if (formData.associationType === 'topic' && formData.topic_id) {
        examData.topic_id = formData.topic_id;
      }

      // API call to update exam
      const response = await fetch(`${API_URL}/api/exams/exams/${examId}`, {
        method: 'PUT',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(examData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update exam');
      }

      navigate(`/teacher/exams/${examId}`);
    } catch (err) {
      console.error('Error updating exam:', err);
      setError(err instanceof Error ? err.message : 'Failed to update exam');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(`/teacher/exams/${examId}`);
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
      <div className="mb-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Edit Exam</h1>
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column - Exam Details */}
          <div className="lg:col-span-2">
            <Card>
              <form id="exam-form" onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Exam Title
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label htmlFor="max_marks" className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Marks
                </label>
                <input
                  type="number"
                  id="max_marks"
                  name="max_marks"
                  value={formData.max_marks}
                  onChange={handleInputChange}
                  min="1"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="max_questions" className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Questions
                    </label>
                    <input
                      type="number"
                      id="max_questions"
                      name="max_questions"
                      value={formData.max_questions}
                      onChange={handleInputChange}
                      min="1"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                    <label htmlFor="duration_minutes" className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  id="duration_minutes"
                  name="duration_minutes"
                  value={formData.duration_minutes}
                  onChange={handleInputChange}
                  min="1"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                    <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Scheduled Date
                </label>
                <input
                  type="date"
                  id="scheduledDate"
                  name="scheduledDate"
                  value={formData.scheduledDate}
                  onChange={handleInputChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                    <label htmlFor="scheduledTime" className="block text-sm font-medium text-gray-700 mb-2">
                  Scheduled Time
                </label>
                <input
                  type="time"
                  id="scheduledTime"
                  name="scheduledTime"
                  value={formData.scheduledTime}
                  onChange={handleInputChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>
            </div>
              </form>
            </Card>
          </div>

          {/* Right Column - Exam Association */}
          <div>
            <Card>
              <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Exam Association</h3>
                </div>
                
                {/* Association Type Selection - Read Only */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Associated with:
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {[
                      { id: 'course', label: 'Course' },
                      { id: 'class', label: 'Class' },
                      { id: 'subject', label: 'Subject' },
                      { id: 'chapter', label: 'Chapter' },
                      { id: 'topic', label: 'Topic' }
                    ].map((type) => (
                      <div 
                        key={type.id} 
                        className={`inline-flex items-center p-2 border rounded-md ${
                          formData.associationType === type.id 
                            ? 'bg-blue-50 border-blue-200' 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className={`h-4 w-4 rounded-full border ${
                          formData.associationType === type.id 
                            ? 'bg-blue-600 border-blue-600' 
                            : 'bg-gray-300 border-gray-300'
                        }`} />
                        <span className={`ml-2 text-sm font-medium ${
                          formData.associationType === type.id 
                            ? 'text-blue-700' 
                            : 'text-gray-500'
                        }`}>
                          {type.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dynamic Display based on Selection - Read Only */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selected {formData.associationType.charAt(0).toUpperCase() + formData.associationType.slice(1)}
                  </label>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                    {getAssociationOptions().map((item: any) => {
                      const value = getAssociationIdValue(formData.associationType);
                      if (String(item.id) === value) {
                        return (
                          <div key={item.id} className="text-gray-700">
                            {formatOptionName(item)}
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                    <Button
                      variant="light"
                      onClick={handleCancel}
                      type="button"
                      disabled={isSubmitting}
                      className="w-full sm:w-auto order-2 sm:order-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="primary" 
                      type="button"
                      onClick={() => handleSubmit()}
                      disabled={isSubmitting}
                      className="w-full sm:w-auto order-1 sm:order-2"
                    >
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default TeacherExamEdit; 