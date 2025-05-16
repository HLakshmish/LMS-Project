import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../../components/layout/MainLayout';
import TeacherSidebar from '../sidebar/TeacherSidebar';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { useAuth } from '../../../contexts/AuthContext';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
interface TeacherCreateExamPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
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

const TeacherCreateExamPage: React.FC<TeacherCreateExamPageProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
        setIsLoading(true);
        
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
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [token]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

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

      const response = await fetch(`${API_URL}/api/exams/exams/`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(examData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create exam');
      }

      const data = await response.json();
      console.log('Exam created successfully:', data);
      navigate('/teacher/exams');
    } catch (err) {
      console.error('Error creating exam:', err);
      setError(err instanceof Error ? err.message : 'Failed to create exam');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<TeacherSidebar />}>
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0">
        <div>
        <h1 className="text-2xl font-bold text-gray-900">Create New Exam</h1>
        <p className="text-gray-600">Fill in the details to create a new exam</p>
        </div>
        <Button
          variant="primary" 
          type="submit"
          onClick={() => document.getElementById('exam-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
          disabled={isSubmitting || isLoading}
          className="w-full md:w-auto mt-2 md:mt-0"
        >
          {isSubmitting ? 'Creating...' : 'Create Exam'}
        </Button>
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
      ) : (
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
                <h3 className="text-lg font-medium text-gray-900 mb-4">Exam Association</h3>
                
                {/* Association Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Associate this exam with:
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {[
                      { id: 'course', label: 'Course' },
                      { id: 'class', label: 'Class' },
                      { id: 'subject', label: 'Subject' },
                      { id: 'chapter', label: 'Chapter' },
                      { id: 'topic', label: 'Topic' }
                    ].map((type) => (
                      <label key={type.id} className="inline-flex items-center p-2 border rounded-md hover:bg-gray-50">
                        <input
                          type="radio"
                          name="associationType"
                          value={type.id}
                          checked={formData.associationType === type.id}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          form="exam-form"
                        />
                        <span className="ml-2 text-sm font-medium text-gray-700">
                          {type.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Dynamic Dropdown based on Selection */}
                <div>
                  <label htmlFor={`${formData.associationType}_id`} className="block text-sm font-medium text-gray-700 mb-2">
                    Select {formData.associationType.charAt(0).toUpperCase() + formData.associationType.slice(1)}
            </label>
                  <select
                    id={`${formData.associationType}_id`}
                    name={`${formData.associationType}_id`}
                    value={getAssociationIdValue(formData.associationType)}
              onChange={handleInputChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              required
                    form="exam-form"
                  >
                    <option value="">Select {formData.associationType}</option>
                    {getAssociationOptions().map((item: any) => (
                      <option key={item.id} value={item.id}>
                        {formatOptionName(item)}
                      </option>
                    ))}
                  </select>
          </div>

                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
            <Button
              variant="light"
              onClick={() => navigate('/teacher/exams')}
              type="button"
              disabled={isSubmitting}
                      className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
                      type="button"
                      onClick={() => document.getElementById('exam-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
              disabled={isSubmitting}
                      className="w-full sm:w-auto order-1 sm:order-2"
            >
              {isSubmitting ? 'Creating...' : 'Create Exam'}
            </Button>
          </div>
                </div>
              </div>
      </Card>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default TeacherCreateExamPage; 