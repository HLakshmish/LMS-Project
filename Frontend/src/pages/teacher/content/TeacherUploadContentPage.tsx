import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import ReactModal from 'react-modal';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
interface TeacherUploadContentPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editContent?: {
    id: string;
    title: string;
    description: string;
    type: 'video' | 'pdf' | 'document';
    url: string;
    course_id?: number;
    topic_id?: number;
    chapter_id?: number;
    subject_id?: number;
  };
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

interface ContentForm {
  title: string;
  description: string;
  type: 'video' | 'pdf' | 'document';
  url: string;
  course_id?: number;
  topic_id?: number;
  chapter_id?: number;
  subject_id?: number;
}

const TeacherUploadContentPage: React.FC<TeacherUploadContentPageProps> = ({ 
  user, 
  onLogout, 
  isOpen, 
  onClose, 
  onSuccess,
  editContent 
}) => {
  const { token } = useAuth();
  const isEditMode = !!editContent;

  // Data states
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<ContentForm>({
    title: '',
    description: '',
    type: 'video',
    url: '',
    course_id: undefined,
    topic_id: undefined,
    chapter_id: undefined,
    subject_id: undefined
  });

  const [selectedAssociation, setSelectedAssociation] = useState<'course' | 'subject' | 'chapter' | 'topic'>('course');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens and set edit data if available
  useEffect(() => {
    if (isOpen) {
      if (editContent) {
        setFormData({
          title: editContent.title,
          description: editContent.description,
          type: editContent.type,
          url: editContent.url,
          course_id: editContent.course_id,
          topic_id: editContent.topic_id,
          chapter_id: editContent.chapter_id,
          subject_id: editContent.subject_id
        });
      } else {
        setFormData({
          title: '',
          description: '',
          type: 'video',
          url: '',
          course_id: undefined,
          topic_id: undefined,
          chapter_id: undefined,
          subject_id: undefined
        });
        setSelectedFile(null);
      }
      setError(null);
    }
  }, [isOpen, editContent]);

  // Fetch all data on component mount
  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        // Fetch subjects
        const subjectsResponse = await fetch(`${API_URL}/api/subjects/`, { headers });
        const subjectsData = await subjectsResponse.json();
        setSubjects(subjectsData);

        // Fetch chapters
        const chaptersResponse = await fetch(`${API_URL}/api/chapters/`, { headers });
        const chaptersData = await chaptersResponse.json();
        setChapters(chaptersData);

        // Fetch topics
        const topicsResponse = await fetch(`${API_URL}/api/topics/`, { headers });
        const topicsData = await topicsResponse.json();
        setTopics(topicsData);

        // Fetch courses
        const coursesResponse = await fetch(`${API_URL}/api/courses/`, { headers });
        const coursesData = await coursesResponse.json();
        setCourses(coursesData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchAllData();
    }
  }, [token, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.endsWith('_id') ? (value ? Number(value) : undefined) : value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!isEditMode && !selectedFile) {
        throw new Error('Please select a file to upload');
      }

      if (!formData.course_id && !formData.topic_id && !formData.chapter_id && !formData.subject_id) {
        throw new Error('Please provide at least one of: course, topic, chapter, or subject');
      }

      let response;
      
      if (isEditMode) {
        // Update existing content
           response = await fetch(`${API_URL}/api/content/${editContent.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData)
        });
      } else {
        // Create new content
        const formDataToSend = new FormData();
        formDataToSend.append('file', selectedFile!);
        formDataToSend.append('title', formData.title);
        formDataToSend.append('description', formData.description || '');
        formDataToSend.append('type', formData.type);

        if (formData.course_id) formDataToSend.append('course_id', formData.course_id.toString());
        if (formData.topic_id) formDataToSend.append('topic_id', formData.topic_id.toString());
        if (formData.chapter_id) formDataToSend.append('chapter_id', formData.chapter_id.toString());
        if (formData.subject_id) formDataToSend.append('subject_id', formData.subject_id.toString());

        response = await fetch(`${API_URL}/api/content/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formDataToSend,
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to ${isEditMode ? 'update' : 'upload'} content`);
      }

      const data = await response.json();
      console.log(`Content ${isEditMode ? 'updated' : 'uploaded'} successfully:`, data);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(`Error ${isEditMode ? 'updating' : 'uploading'} content:`, err);
      setError(err instanceof Error ? err.message : `Failed to ${isEditMode ? 'update' : 'upload'} content`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ReactModal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="fixed inset-0 flex items-center justify-center z-50"
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 z-40"
      ariaHideApp={false}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditMode ? 'Edit Content' : 'Upload Content'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <span className="sr-only">Close</span>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <div className="text-gray-600">Loading...</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-2">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-2 py-1 rounded relative text-sm">
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            {/* Content Association Section */}
            <div className="bg-white p-2 rounded-lg border border-gray-200">
              <h3 className="text-base font-medium text-gray-900 mb-2">Content Association</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                <label className="flex items-center space-x-1 cursor-pointer">
                  <input
                    type="radio"
                    name="association"
                    value="course"
                    checked={selectedAssociation === 'course'}
                    onChange={(e) => {
                      setSelectedAssociation('course');
                      setFormData(prev => ({
                        ...prev,
                        course_id: undefined,
                        subject_id: undefined,
                        chapter_id: undefined,
                        topic_id: undefined
                      }));
                    }}
                    className="form-radio text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Course</span>
                </label>
                <label className="flex items-center space-x-1 cursor-pointer">
                  <input
                    type="radio"
                    name="association"
                    value="subject"
                    checked={selectedAssociation === 'subject'}
                    onChange={(e) => {
                      setSelectedAssociation('subject');
                      setFormData(prev => ({
                        ...prev,
                        course_id: undefined,
                        subject_id: undefined,
                        chapter_id: undefined,
                        topic_id: undefined
                      }));
                    }}
                    className="form-radio text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Subject</span>
                </label>
                <label className="flex items-center space-x-1 cursor-pointer">
                  <input
                    type="radio"
                    name="association"
                    value="chapter"
                    checked={selectedAssociation === 'chapter'}
                    onChange={(e) => {
                      setSelectedAssociation('chapter');
                      setFormData(prev => ({
                        ...prev,
                        course_id: undefined,
                        subject_id: undefined,
                        chapter_id: undefined,
                        topic_id: undefined
                      }));
                    }}
                    className="form-radio text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Chapter</span>
                </label>
                <label className="flex items-center space-x-1 cursor-pointer">
                  <input
                    type="radio"
                    name="association"
                    value="topic"
                    checked={selectedAssociation === 'topic'}
                    onChange={(e) => {
                      setSelectedAssociation('topic');
                      setFormData(prev => ({
                        ...prev,
                        course_id: undefined,
                        subject_id: undefined,
                        chapter_id: undefined,
                        topic_id: undefined
                      }));
                    }}
                    className="form-radio text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Topic</span>
                </label>
              </div>

              <div className="mt-2">
                {selectedAssociation === 'course' && (
                  <div>
                    <label htmlFor="course_id" className="block text-sm font-medium text-gray-700 mb-1">
                      Select Course
                    </label>
                    <select
                      id="course_id"
                      name="course_id"
                      value={formData.course_id || ''}
                      onChange={handleInputChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="">Select Course</option>
                      {courses.map(course => (
                        <option key={course.id} value={course.id}>
                          {course.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedAssociation === 'subject' && (
                  <div>
                    <label htmlFor="subject_id" className="block text-sm font-medium text-gray-700 mb-1">
                      Select Subject
                    </label>
                    <select
                      id="subject_id"
                      name="subject_id"
                      value={formData.subject_id || ''}
                      onChange={handleInputChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="">Select Subject</option>
                      {subjects.map(subject => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedAssociation === 'chapter' && (
                  <div>
                    <label htmlFor="chapter_id" className="block text-sm font-medium text-gray-700 mb-1">
                      Select Chapter
                    </label>
                    <select
                      id="chapter_id"
                      name="chapter_id"
                      value={formData.chapter_id || ''}
                      onChange={handleInputChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="">Select Chapter</option>
                      {chapters.map(chapter => (
                        <option key={chapter.id} value={chapter.id}>
                          {chapter.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedAssociation === 'topic' && (
                  <div>
                    <label htmlFor="topic_id" className="block text-sm font-medium text-gray-700 mb-1">
                      Select Topic
                    </label>
                    <select
                      id="topic_id"
                      name="topic_id"
                      value={formData.topic_id || ''}
                      onChange={handleInputChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="">Select Topic</option>
                      {topics.map(topic => (
                        <option key={topic.id} value={topic.id}>
                          {topic.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Title *
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
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={2}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                  Content Type *
                </label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                >
                  <option value="video">video</option>
                  <option value="pdf">pdf</option>
                  <option value="document">document</option>
                </select>
              </div>

              {!isEditMode && (
                <div>
                  <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">
                    Upload File *
                  </label>
                  <input
                    type="file"
                    id="file"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500
                      file:mr-3 file:py-1 file:px-3
                      file:rounded-md file:border-0
                      file:text-sm file:font-medium
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
                    required
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {isSubmitting ? (isEditMode ? 'Updating...' : 'Uploading...') : (isEditMode ? 'Update Content' : 'Upload Content')}
              </button>
            </div>
          </form>
        )}
      </div>
    </ReactModal>
  );
};

export default TeacherUploadContentPage; 