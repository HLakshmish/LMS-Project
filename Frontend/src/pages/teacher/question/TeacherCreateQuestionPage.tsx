import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MainLayout from '../../../components/layout/MainLayout';
import TeacherSidebar from '../sidebar/TeacherSidebar';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { useAuth } from '../../../contexts/AuthContext';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
// Add declaration for window.questionImages
declare global {
  interface Window {
    questionImages?: Record<string, File>;
  }
}

interface TeacherCreateQuestionPageProps {
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
type AssociationType = 'course' | 'subject' | 'chapter' | 'topic';
type QuestionType = 'normal' | 'image-based';

interface OptionWithImage {
  text?: string;
  image_url: string;
}

interface QuestionForm {
  text: string;
  difficulty: 'easy' | 'moderate' | 'difficult';
  associationType: AssociationType; // What the question is associated with
  course_id?: number;
  subject_id?: number;
  chapter_id?: number;
  topic_id?: number;
  points: number;
  options: string[];
  optionsWithImages: OptionWithImage[];
  correctAnswer?: string;
  correctImageAnswer?: number; // Index of the correct answer for image-based MCQs
  image_url: string;
  questionType: QuestionType;
}

// Type guard to check if a field is an association ID field
function isAssociationIdField(key: string): key is keyof Pick<QuestionForm, 'course_id' | 'subject_id' | 'chapter_id' | 'topic_id'> {
  return ['course_id', 'subject_id', 'chapter_id', 'topic_id'].includes(key);
}

// Interface matching the API's expected request body
interface QuestionRequestData {
  content: string;
  image_url: string;
  difficulty_level: string;
  topic_id?: number;
  chapter_id?: number;
  subject_id?: number;
  course_id?: number;
  answers: {
    content: string;
    is_correct: boolean;
    image_url?: string;
  }[];
}

const TeacherCreateQuestionPage: React.FC<TeacherCreateQuestionPageProps> = ({ user, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const optionFileInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const [formData, setFormData] = useState<QuestionForm>({
    text: '',
    difficulty: 'moderate',
    associationType: 'course',
    points: 1,
    options: ['', '', '', ''],
    optionsWithImages: [{ image_url: '' }, { image_url: '' }, { image_url: '' }, { image_url: '' }],
    correctAnswer: '',
    correctImageAnswer: undefined,
    course_id: undefined,
    subject_id: undefined,
    chapter_id: undefined,
    topic_id: undefined,
    image_url: '',
    questionType: 'normal',
  });

  // State for data
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingOptionImage, setUploadingOptionImage] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<QuestionType>('normal');

  // Add a useEffect to handle updating the refs array when options change
  useEffect(() => {
    // Make sure we have the right number of refs for option file inputs
    optionFileInputRefs.current = Array(formData.optionsWithImages.length).fill(null);
  }, [formData.optionsWithImages.length]);

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

        if (!coursesResponse.ok || !subjectsResponse.ok || !chaptersResponse.ok || !topicsResponse.ok) {
          throw new Error('Failed to fetch one or more data types');
        }

        const coursesData = await coursesResponse.json();
        const subjectsData = await subjectsResponse.json();
        const chaptersData = await chaptersResponse.json();
        const topicsData = await topicsResponse.json();

        setCourses(coursesData);
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
    
    // Convert to number for IDs
    if (isAssociationIdField(name)) {
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

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    
    // If the correct answer option was modified, update the correctAnswer to match the new value
    if (formData.correctAnswer === formData.options[index]) {
      setFormData(prev => ({
        ...prev,
        options: newOptions,
        correctAnswer: value
      }));
    } else {
    setFormData(prev => ({
      ...prev,
      options: newOptions
    }));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPEG, PNG, etc.)');
      return;
    }
    
    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }
    
    try {
      setUploadingImage(true);
      setError(null);
      
      // Create a FileReader to convert the image to a data URL (base64)
      const reader = new FileReader();
      
      reader.onload = (e) => {
        if (e.target?.result) {
          const base64String = e.target.result as string;
          // Set both the preview and the image URL to the base64 string
          setImagePreview(base64String);
          
          // Save the base64 data URL directly in the form
          setFormData(prev => ({
            ...prev,
            image_url: base64String
          }));
        }
      };
      
      // Read the file as a data URL (this will produce a base64 encoded string)
      reader.readAsDataURL(file);
      
      console.log(`Processing image: ${file.name}`);
    } catch (err) {
      console.error('Error processing image:', err);
      setError(err instanceof Error ? err.message : 'Failed to process image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      image_url: ''
    }));
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle switching between normal and image-based MCQ tabs
  const handleTabChange = (tabType: QuestionType) => {
    setActiveTab(tabType);
    
    if (tabType === 'normal') {
      // Reset the question image when switching to normal MCQ
      setFormData(prev => ({
        ...prev,
        questionType: tabType,
        image_url: ''
      }));
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
    setFormData(prev => ({
      ...prev,
      questionType: tabType
    }));
    }
  };

  // Handle image upload for question options (for image-based MCQs)
  const handleOptionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPEG, PNG, etc.)');
      return;
    }
    
    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }
    
    try {
      setUploadingOptionImage(index);
      setError(null);
      
      // Create a FileReader to convert the image to a data URL (base64)
      const reader = new FileReader();
      
      reader.onload = (e) => {
        if (e.target?.result) {
          const base64String = e.target.result as string;
          
          // Update the image URL for this option
          const newOptionsWithImages = [...formData.optionsWithImages];
          newOptionsWithImages[index] = {
            ...newOptionsWithImages[index],
            image_url: base64String
          };
          
          setFormData(prev => ({
            ...prev,
            optionsWithImages: newOptionsWithImages
          }));
        }
      };
      
      // Read the file as a data URL (this will produce a base64 encoded string)
      reader.readAsDataURL(file);
      
      console.log(`Processing option image ${index}: ${file.name}`);
    } catch (err) {
      console.error('Error processing option image:', err);
      setError(err instanceof Error ? err.message : 'Failed to process option image');
    } finally {
      setUploadingOptionImage(null);
    }
  };

  // Function to remove an image from an option (for image-based MCQs)
  const handleRemoveOptionImage = (index: number) => {
    const newOptionsWithImages = [...formData.optionsWithImages];
    newOptionsWithImages[index] = {
      ...newOptionsWithImages[index],
      image_url: ''
    };
    
    setFormData(prev => ({
      ...prev,
      optionsWithImages: newOptionsWithImages
    }));
    
    // Reset file input if there is one
    if (optionFileInputRefs.current[index]) {
      optionFileInputRefs.current[index]!.value = '';
    }
  };

  // Function to handle text change for image-based options
  const handleOptionWithImageTextChange = (index: number, text: string) => {
    const newOptionsWithImages = [...formData.optionsWithImages];
    newOptionsWithImages[index] = {
      ...newOptionsWithImages[index],
      text: text
    };
    
    setFormData(prev => ({
      ...prev,
      optionsWithImages: newOptionsWithImages
    }));
  };

  // Function to add an option for image-based MCQs
  const handleAddImageOption = () => {
    setFormData(prev => ({
      ...prev,
      optionsWithImages: [...prev.optionsWithImages, { image_url: '' }]
    }));
  };

  // Function to remove an option for image-based MCQs
  const handleRemoveImageOption = (index: number) => {
    const newOptionsWithImages = [...formData.optionsWithImages];
    newOptionsWithImages.splice(index, 1);
    
    // If we're removing the correct answer, reset correctImageAnswer
    if (formData.correctImageAnswer === index) {
      setFormData(prev => ({
        ...prev,
        optionsWithImages: newOptionsWithImages,
        correctImageAnswer: undefined
      }));
    } else if (formData.correctImageAnswer !== undefined && formData.correctImageAnswer > index) {
      // If we're removing an option before the correct answer, update the index
      setFormData(prev => ({
        ...prev,
        optionsWithImages: newOptionsWithImages,
        correctImageAnswer: prev.correctImageAnswer! - 1
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        optionsWithImages: newOptionsWithImages
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Validate that question text is present
    if (!formData.text.trim()) {
      setError('Question content is required');
      setIsSubmitting(false);
      return;
    }

    // Validate the selected association
    let associatedId: number | undefined;
    
    if (formData.associationType === 'course') {
      associatedId = formData.course_id;
    } else if (formData.associationType === 'subject') {
      associatedId = formData.subject_id;
    } else if (formData.associationType === 'chapter') {
      associatedId = formData.chapter_id;
    } else if (formData.associationType === 'topic') {
      associatedId = formData.topic_id;
    }
    
    if (!associatedId) {
      setError(`Please select a ${formData.associationType}`);
      setIsSubmitting(false);
      return;
    }

    try {
      // Different validation based on question type
      if (formData.questionType === 'normal') {
        // For normal multiple choice, check correctAnswer
      if (!formData.correctAnswer) {
        setError('Please select a correct answer for the multiple choice question');
        setIsSubmitting(false);
        return;
      }
      
      // Validate that all options have content
      const emptyOptions = formData.options.filter(option => !option.trim());
      if (emptyOptions.length) {
        setError('All options must have content');
        setIsSubmitting(false);
        return;
      }
      
        // Prepare answers for normal MCQ
      const answers = formData.options.map(option => ({
        content: option,
        is_correct: option === formData.correctAnswer
      }));

      // Create request data with only the association we're using
      const questionData: QuestionRequestData = {
        content: formData.text,
        image_url: '', // No image for normal MCQs
        difficulty_level: formData.difficulty,
        answers: answers
      };

      // Add only the selected association ID
      if (formData.associationType === 'course') {
        questionData.course_id = associatedId;
      } else if (formData.associationType === 'subject') {
        questionData.subject_id = associatedId;
      } else if (formData.associationType === 'chapter') {
        questionData.chapter_id = associatedId;
      } else if (formData.associationType === 'topic') {
        questionData.topic_id = associatedId;
      }

        console.log('Submitting normal MCQ question data');

      const response = await fetch(`${API_URL}/api/questions/`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(questionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create question');
      }

      const data = await response.json();
      console.log('Question created successfully:', data);
      navigate('/teacher/questions');
      } else {
        // For image-based multiple choice
        if (formData.correctImageAnswer === undefined) {
          setError('Please select a correct answer for the image-based question');
          setIsSubmitting(false);
          return;
        }
        
        // Validate that all image options have images (text is optional)
        for (let i = 0; i < formData.optionsWithImages.length; i++) {
          const option = formData.optionsWithImages[i];
          
          if (!option.image_url) {
            setError(`Option ${i + 1} image is required`);
            setIsSubmitting(false);
            return;
          }
        }
        
        // Prepare answers for image-based MCQ
        const answers = formData.optionsWithImages.map((option, index) => ({
          content: option.text || '', // Use empty string if no text
          is_correct: index === formData.correctImageAnswer,
          image_url: option.image_url
        }));

        // Create request data with only the association we're using
        const questionData: QuestionRequestData = {
          content: formData.text,
          image_url: formData.image_url, // Question image (optional)
          difficulty_level: formData.difficulty,
          answers: answers
        };

        // Add only the selected association ID
        if (formData.associationType === 'course') {
          questionData.course_id = associatedId;
        } else if (formData.associationType === 'subject') {
          questionData.subject_id = associatedId;
        } else if (formData.associationType === 'chapter') {
          questionData.chapter_id = associatedId;
        } else if (formData.associationType === 'topic') {
          questionData.topic_id = associatedId;
        }

        console.log('Submitting image-based MCQ question data');

        const response = await fetch(`${API_URL}/api/questions/`, {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(questionData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to create question');
        }

        const data = await response.json();
        console.log('Question created successfully:', data);
        navigate('/teacher/questions');
      }
    } catch (err) {
      console.error('Error creating question:', err);
      setError(err instanceof Error ? err.message : 'Failed to create question');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to add an option for multiple choice questions
  const handleAddOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, '']
    }));
  };

  // Function to remove an option for multiple choice questions
  const handleRemoveOption = (index: number) => {
    const newOptions = [...formData.options];
    newOptions.splice(index, 1);
    
    // If we're removing the correct answer, reset correctAnswer
    if (formData.correctAnswer === formData.options[index]) {
      setFormData(prev => ({
        ...prev,
        options: newOptions,
        correctAnswer: undefined
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        options: newOptions
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

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<TeacherSidebar />}>
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0">
        <div>
        <h1 className="text-2xl font-bold text-gray-900">Create New Question</h1>
        <p className="text-gray-600">Add a new multiple choice question to your question bank</p>
        </div>
        <Button 
          variant="primary" 
          type="submit"
          onClick={() => document.getElementById('question-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
          disabled={isSubmitting}
          className="w-full md:w-auto mt-2 md:mt-0"
        >
          {isSubmitting ? 'Creating...' : 'Create Question'}
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
          {/* Left Column - Question Content */}
          <div className="lg:col-span-2">
            <Card>
              {/* Tab Navigation */}
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px" aria-label="Tabs">
                  <button
                    onClick={() => handleTabChange('normal')}
                    className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                      activeTab === 'normal'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Normal MCQ
                  </button>
                  <button
                    onClick={() => handleTabChange('image-based')}
                    className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                      activeTab === 'image-based'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Image-Based MCQ
                  </button>
                </nav>
              </div>

              <form id="question-form" onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 md:space-y-6">
            <div>
                  <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
                    Question Content
              </label>
              <textarea
                id="text"
                name="text"
                value={formData.text}
                onChange={handleInputChange}
                    rows={5}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
                    placeholder="Enter your question here..."
              />
            </div>

                {/* Only render the Question Image section for image-based MCQs */}
                {activeTab === 'image-based' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Image (Optional)
                </label>
                <div className="mt-1 flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
                  <div className="w-full flex-1">
                    <div 
                      className="flex items-center justify-center px-3 sm:px-6 py-4 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:bg-gray-50"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploadingImage ? (
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
                          <p className="text-sm text-gray-500">Processing...</p>
                        </div>
                      ) : imagePreview ? (
                        <div className="relative w-full">
                          <img 
                            src={imagePreview} 
                            alt="Question" 
                            className="mx-auto max-h-40 object-contain"
                            onError={() => {
                              setError('Failed to load image preview');
                              setImagePreview(null);
                            }}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveImage();
                            }}
                            className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                            title="Remove image"
                          >
                            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <svg className="mx-auto h-8 sm:h-12 w-8 sm:w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="mt-1 text-sm text-gray-500">
                            Click to upload an image or drag and drop
                          </p>
                          <p className="text-xs text-gray-400 hidden sm:block">PNG, JPG, GIF up to 5MB</p>
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="sr-only"
                      id="image-upload"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="light"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="w-full sm:w-auto"
                  >
                    {formData.image_url ? 'Change' : 'Upload'}
                  </Button>
                </div>
                {formData.image_url && (
                  <p className="mt-2 text-xs text-gray-500 truncate">
                    {formData.image_url.startsWith('data:') 
                      ? `Image ready to upload (${Math.round(formData.image_url.length / 1024)} KB)` 
                      : 'Image set (as URL)'}
                  </p>
                )}
              </div>
                )}

              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                  Difficulty Level
                </label>
                  <div className="flex flex-wrap gap-2 sm:gap-4">
                    {['easy', 'moderate', 'difficult'].map((level) => (
                      <label key={level} className="inline-flex items-center">
                        <input
                          type="radio"
                          name="difficulty"
                          value={level}
                          checked={formData.difficulty === level}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                          level === 'easy' ? 'bg-green-100 text-green-800' : 
                          level === 'moderate' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'
                        }`}>
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </span>
                </label>
                    ))}
              </div>
            </div>

                {/* Answer Options Section - Show different content based on active tab */}
                <div className="border-t border-gray-200 pt-4">
                  {activeTab === 'normal' ? (
                    /* Normal MCQ Options */
                    <>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2 sm:mb-0">Answer Options</h3>
                    <Button 
                      variant="light" 
                      type="button" 
                      onClick={handleAddOption}
                      size="sm"
                      className="self-start sm:self-auto"
                    >
                      + Add Option
                    </Button>
                  </div>
                  
              <div className="space-y-4">
                    {formData.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="correctAnswer"
                            value={option}
                            checked={formData.correctAnswer === option}
                            onChange={handleInputChange}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      required
                    />
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(index)}
                            className="text-red-500 hover:text-red-700"
                            title="Remove option"
                          disabled={formData.options.length <= 1}
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                  </div>
                ))}
                      <p className="text-xs text-gray-500">
                        Select the radio button next to the correct answer
                      </p>
              </div>
                    </>
                  ) : (
                    /* Image-Based MCQ Options */
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-1">Image Answer Options</h3>
                          <p className="text-xs text-gray-500">Students will select the correct image as their answer</p>
                        </div>
                        <Button 
                          variant="light" 
                          type="button" 
                          onClick={handleAddImageOption}
                          size="sm"
                          className="self-start sm:self-auto"
                        >
                          + Add Image Option
                        </Button>
                      </div>
                      
                      <div className="space-y-6">
                        {formData.optionsWithImages.map((option, index) => (
                          <div 
                            key={index} 
                            className={`border-2 ${
                              formData.correctImageAnswer === index 
                                ? 'border-green-200 bg-green-50' 
                                : 'border-blue-100'
                            } rounded-lg p-3 relative`}
                          >
                            {formData.correctImageAnswer === index && (
                              <div className="absolute top-2 right-2 bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">
                                Correct Answer
                              </div>
                            )}
                            
                            <div className="flex items-center space-x-2 mb-3">
                              <input
                                type="radio"
                                name="correctImageAnswer"
                                value={index}
                                checked={formData.correctImageAnswer === index}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  correctImageAnswer: Number(e.target.value)
                                }))}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                              />
                              <span className={`font-medium ${formData.correctImageAnswer === index ? 'text-green-700' : ''}`}>
                                Image Option {index + 1}
                              </span>
                              
                              <div className="flex-grow"></div>
                              
                              <button
                                type="button"
                                onClick={() => handleRemoveImageOption(index)}
                                className="text-red-500 hover:text-red-700"
                                title="Remove option"
                                disabled={formData.optionsWithImages.length <= 1}
                              >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                            
                            <div className="mb-3">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Option Text (Optional)
                              </label>
                              <input
                                type="text"
                                value={option.text || ''}
                                onChange={(e) => handleOptionWithImageTextChange(index, e.target.value)}
                                placeholder={`Option ${index + 1} text (optional)`}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-blue-700 mb-2">
                                Option Image (Required)
                              </label>
                              <div className="mt-1 flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
                                <div className="w-full flex-1">
                                  <div 
                                    className="flex items-center justify-center px-3 sm:px-6 py-4 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:bg-gray-50"
                                    onClick={() => optionFileInputRefs.current[index]?.click()}
                                  >
                                    {uploadingOptionImage === index ? (
                                      <div className="text-center">
                                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
                                        <p className="text-sm text-gray-500">Processing...</p>
                                      </div>
                                    ) : option.image_url ? (
                                      <div className="relative w-full">
                                        <img 
                                          src={option.image_url} 
                                          alt={`Option ${index + 1}`} 
                                          className="mx-auto max-h-40 object-contain"
                                          onError={() => {
                                            setError(`Failed to load image preview for option ${index + 1}`);
                                            // Reset this specific image
                                            const newOptionsWithImages = [...formData.optionsWithImages];
                                            newOptionsWithImages[index] = {
                                              ...newOptionsWithImages[index],
                                              image_url: ''
                                            };
                                            setFormData(prev => ({
                                              ...prev,
                                              optionsWithImages: newOptionsWithImages
                                            }));
                                          }}
                                        />
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveOptionImage(index);
                                          }}
                                          className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                                          title="Remove image"
                                        >
                                          <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="text-center">
                                        <svg className="mx-auto h-8 sm:h-12 w-8 sm:w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <p className="mt-1 text-sm text-gray-500">
                                          Click to upload an image
                                        </p>
                                        <p className="text-xs text-gray-400 hidden sm:block">PNG, JPG, GIF up to 5MB</p>
                                      </div>
                                    )}
                                  </div>
                                  <input
                                    ref={(el) => { optionFileInputRefs.current[index] = el; }}
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleOptionImageUpload(e, index)}
                                    className="sr-only"
                                    id={`option-image-upload-${index}`}
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="light"
                                  onClick={() => optionFileInputRefs.current[index]?.click()}
                                  disabled={uploadingOptionImage === index}
                                  className="w-full sm:w-auto"
                                >
                                  {option.image_url ? 'Change Image' : 'Upload Image'}
                                </Button>
                              </div>
                              {option.image_url && (
                                <p className="mt-2 text-xs text-gray-500 truncate">
                                  {option.image_url.startsWith('data:') 
                                    ? `Image ready (${Math.round(option.image_url.length / 1024)} KB)` 
                                    : 'Image set (as URL)'}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                        <p className="text-xs text-gray-500 mt-2">
                          Select the radio button next to the image that should be the correct answer
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </form>
            </Card>
          </div>

          {/* Right Column - Question Metadata */}
          <div>
            <Card>
              <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Question Association</h3>
                
                {/* Association Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Associate this question with:
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {[
                      { id: 'course', label: 'Course' },
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
                    value={formData.associationType === 'course' ? formData.course_id :
                           formData.associationType === 'subject' ? formData.subject_id :
                           formData.associationType === 'chapter' ? formData.chapter_id :
                           formData.associationType === 'topic' ? formData.topic_id : ''}
                    onChange={handleInputChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    required
                    form="question-form"
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
              onClick={() => navigate('/teacher/questions')}
              type="button"
              disabled={isSubmitting}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
                      type="button"
                      onClick={() => document.getElementById('question-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
              disabled={isSubmitting}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              {isSubmitting ? 'Creating...' : 'Create Question'}
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

export default TeacherCreateQuestionPage; 