import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import MainLayout from '../../../components/layout/MainLayout';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { useAuth } from '../../../contexts/AuthContext';
import TeacherSidebar from '../sidebar/TeacherSidebar';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
interface Answer {
  content: string;
  is_correct: boolean;
  id: number;
  question_id: number;
  created_at: string;
  updated_at: string;
  image_url: string | null;
}

interface User {
  username: string;
  email: string;
  id: number;
  role: string;
  created_at: string;
  updated_at: string;
}

interface Course {
  name: string;
  description: string;
  id: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  creator: User;
}

interface Subject {
  name: string;
  course_id: number;
  id: number;
  created_at: string;
  updated_at: string;
  course: Course;
}

interface Chapter {
  name: string;
  subject_id: number;
  id: number;
  created_at: string;
  updated_at: string;
  subject: Subject;
}

interface Topic {
  name: string;
  chapter_id: number;
  id: number;
  created_at: string;
  updated_at: string;
  chapter: Chapter;
}

interface Question {
  id: string;
  content: string;
  image_url: string;
  difficulty_level: 'easy' | 'moderate' | 'difficult';
  topic_id: number;
  chapter_id: number;
  subject_id: number;
  course_id: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  answers: Answer[];
  creator?: User;
  topic?: Topic;
  chapter?: Chapter;
  subject?: Subject;
  course?: Course;
}

interface TeacherQuestionsPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

const TeacherQuestionsPage: React.FC<TeacherQuestionsPageProps> = ({ user, onLogout }) => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { token } = useAuth();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hierarchical data states
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  
  // Filtered options based on selection
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
  const [filteredChapters, setFilteredChapters] = useState<Chapter[]>([]);
  const [filteredTopics, setFilteredTopics] = useState<Topic[]>([]);

  // Filtering states
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterCourse, setFilterCourse] = useState<number | null>(null);
  const [filterSubject, setFilterSubject] = useState<number | null>(null);
  const [filterChapter, setFilterChapter] = useState<number | null>(null);
  const [filterTopic, setFilterTopic] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal state
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Delete question state
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Hierarchy modal state
  const [showHierarchyModal, setShowHierarchyModal] = useState(false);
  const [selectedHierarchyQuestion, setSelectedHierarchyQuestion] = useState<Question | null>(null);

  // Add a new state for active question type tab
  const [activeQuestionTypeTab, setActiveQuestionTypeTab] = useState<'all' | 'normal' | 'image-based'>('all');

  // Fetch questions
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch(`${API_URL}/api/questions`, {
          headers: {
            'accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch questions');
        }

        const data = await response.json();
        console.log('questions count', data.length);
        setQuestions(data);
      } catch (err) {
        console.error('Error fetching questions:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch questions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [token]);

  // Fetch topics data for hierarchical filters
  useEffect(() => {
    const fetchTopicsData = async () => {
      try {
        const response = await fetch(`${API_URL}/api/topics/`, {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch topics data');
        }

        const data = await response.json();
        
        // Extract unique courses - add null checks for each level of nesting
        const validCoursesData = data.filter((item: any) => 
          item?.chapter?.subject?.course?.id !== undefined
        );
        
        const uniqueCourses = Array.from(
          new Map<number, Course>(
            validCoursesData.map((item: any) => [
              item.chapter.subject.course.id,
              {
                id: item.chapter.subject.course.id,
                name: item.chapter.subject.course.name || '',
                description: item.chapter.subject.course.description || '',
                created_by: item.chapter.subject.course.created_by,
                created_at: item.chapter.subject.course.created_at || '',
                updated_at: item.chapter.subject.course.updated_at || null,
                creator: item.chapter.subject.course.creator
              },
            ])
          ).values()
        );
        setCourses(uniqueCourses);

        // Extract unique subjects - add null checks
        const validSubjectsData = data.filter((item: any) => 
          item?.chapter?.subject?.id !== undefined
        );
        
        const uniqueSubjects = Array.from(
          new Map<number, Subject>(
            validSubjectsData.map((item: any) => [
              item.chapter.subject.id,
              {
                id: item.chapter.subject.id,
                name: item.chapter.subject.name || '',
                course_id: item.chapter.subject.course_id,
                created_at: item.chapter.subject.created_at || '',
                updated_at: item.chapter.subject.updated_at || null,
                course: item.chapter.subject.course
              },
            ])
          ).values()
        );
        setSubjects(uniqueSubjects);

        // Extract unique chapters - add null checks
        const validChaptersData = data.filter((item: any) => 
          item?.chapter?.id !== undefined
        );
        
        const uniqueChapters = Array.from(
          new Map<number, Chapter>(
            validChaptersData.map((item: any) => [
              item.chapter.id,
              {
                id: item.chapter.id,
                name: item.chapter.name || '',
                subject_id: item.chapter.subject_id,
                created_at: item.chapter.created_at || '',
                updated_at: item.chapter.updated_at || null,
                subject: item.chapter.subject
              },
            ])
          ).values()
        );
        setChapters(uniqueChapters);

        // Extract topics - add null checks
        const extractedTopics = data
          .filter((item: any) => item?.id !== undefined && item?.chapter_id !== undefined)
          .map((item: any) => ({
            id: item.id,
            name: item.name || '',
            chapter_id: item.chapter_id,
            created_at: item.created_at || '',
            updated_at: item.updated_at || null,
            chapter: item.chapter
          })) as Topic[];
        setTopics(extractedTopics);
      } catch (err) {
        console.error('Error fetching topics:', err);
      }
    };

    fetchTopicsData();
  }, [token]);

  // Update filtered subjects when course selection changes
  useEffect(() => {
    if (filterCourse) {
      const filtered = subjects.filter(subject => subject.course_id === filterCourse);
      setFilteredSubjects(filtered);
      
      // Reset dependent filters if they don't belong to the selected course
      if (filterSubject) {
        const subjectExists = filtered.some(subject => subject.id === filterSubject);
        if (!subjectExists) {
          setFilterSubject(null);
          setFilterChapter(null);
          setFilterTopic(null);
          setFilteredChapters([]);
          setFilteredTopics([]);
        }
      }
    } else {
      setFilteredSubjects([]);
      setFilterChapter(null);
      setFilterTopic(null);
      setFilteredChapters([]);
      setFilteredTopics([]);
    }
  }, [filterCourse, subjects, filterSubject]);

  // Update filtered chapters when subject selection changes
  useEffect(() => {
    if (filterSubject) {
      const filtered = chapters.filter(chapter => chapter.subject_id === filterSubject);
      setFilteredChapters(filtered);
      
      // Reset dependent filters if they don't belong to the selected subject
      if (filterChapter) {
        const chapterExists = filtered.some(chapter => chapter.id === filterChapter);
        if (!chapterExists) {
          setFilterChapter(null);
          setFilterTopic(null);
          setFilteredTopics([]);
        }
      }
    } else {
      setFilteredChapters([]);
      setFilterTopic(null);
      setFilteredTopics([]);
    }
  }, [filterSubject, chapters, filterChapter]);

  // Update filtered topics when chapter selection changes
  useEffect(() => {
    if (filterChapter) {
      const filtered = topics.filter(topic => topic.chapter_id === filterChapter);
      setFilteredTopics(filtered);
      
      // Reset topic filter if it doesn't belong to the selected chapter
      if (filterTopic) {
        const topicExists = filtered.some(topic => topic.id === filterTopic);
        if (!topicExists) {
          setFilterTopic(null);
        }
      }
    } else {
      setFilteredTopics([]);
      setFilterTopic(null);
    }
  }, [filterChapter, topics, filterTopic]);

  // Helper function to get difficulty badge color
  const getDifficultyColor = (difficulty: Question['difficulty_level']) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800';
      case 'difficult':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Update the filtered questions logic to include the question type filter
  const filteredQuestions = questions.filter(question => {
    // Filter by question type
    if (activeQuestionTypeTab === 'normal' && question.answers.some(a => a.image_url)) {
      return false;
    }
    if (activeQuestionTypeTab === 'image-based' && !question.answers.some(a => a.image_url)) {
      return false;
    }
    
    // Filter by difficulty
    if (filterDifficulty !== 'all' && question.difficulty_level !== filterDifficulty) {
      return false;
    }
    
    // Filter by course
    if (filterCourse && question.course_id !== filterCourse) {
      return false;
    }
    
    // Filter by subject
    if (filterSubject && question.subject_id !== filterSubject) {
      return false;
    }
    
    // Filter by chapter
    if (filterChapter && question.chapter_id !== filterChapter) {
      return false;
    }
    
    // Filter by topic
    if (filterTopic && question.topic_id !== filterTopic) {
      return false;
    }
    
    // Filter by search term
    if (searchTerm && !question.content.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  // Get question type based on answers
  const getQuestionType = (answers: Question['answers']) => {
    if (answers.length === 0) return 'Unknown';
    
    if (answers.length === 1 && answers[0].content === 'No predefined answer for this type') {
      return 'Essay/Short Answer';
    }
    
    if (answers.length === 2 && 
        answers.some(a => a.content === 'true') && 
        answers.some(a => a.content === 'false')) {
      return 'True/False';
    }
    
    // Check if this is an image-based MCQ
    if (answers.some(a => a.image_url)) {
      return 'Image-Based MCQ';
    }
    
    return 'Multiple Choice';
  };

  // Format the answers for display in the table
  const formatAnswers = (answers: Question['answers']) => {
    if (answers.length === 0) return 'No answers';
    
    if (answers.length === 1 && answers[0].content === 'No predefined answer for this type') {
      return 'Open-ended question';
    }
    
    // Check if this is an image-based MCQ
    if (answers.some(a => a.image_url)) {
      const correctAnswerIndex = answers.findIndex(a => a.is_correct);
      if (correctAnswerIndex !== -1) {
        return `Image option ${correctAnswerIndex + 1} (view to see)`;
      }
      return 'Image-based options (view to see)';
    }
    
    // For multiple choice or true/false, show correct answer text
    const correctAnswers = answers.filter(a => a.is_correct).map(a => a.content);
    if (correctAnswers.length === 0) return 'No correct answer defined';
    
    return correctAnswers.join(', ');
  };

  // Format date string to readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Handler for opening the question view modal
  const handleViewQuestion = async (questionId: string) => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`${API_URL}/api/questions/${questionId}`, {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch question details');
      }

      const data = await response.json();
      setSelectedQuestion(data);
      setShowModal(true);
    } catch (err) {
      console.error('Error fetching question details:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch question details');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for closing the modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedQuestion(null);
  };

  // Handler for filter resets
  const handleResetFilters = () => {
    setFilterCourse(null);
    setFilterSubject(null);
    setFilterChapter(null);
    setFilterTopic(null);
    setFilterDifficulty('all');
    setSearchTerm('');
    setActiveQuestionTypeTab('all');
  };

  // Add new handler for opening delete confirmation modal
  const handleDeleteClick = (question: Question) => {
    setQuestionToDelete(question);
    setShowDeleteModal(true);
    setDeleteError(null);
  };

  // Add handler for closing delete confirmation modal
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setQuestionToDelete(null);
    setDeleteError(null);
  };

  // Add the delete question function
  const handleDeleteQuestion = async () => {
    if (!questionToDelete) return;
    
    setIsDeleting(true);
    setDeleteError(null);
    
    try {
      const response = await fetch(`${API_URL}/api/questions/${questionToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete question');
      }

      // Remove the deleted question from the state
      setQuestions(prevQuestions => 
        prevQuestions.filter(q => q.id !== questionToDelete.id)
      );
      
      // Close the modal
      setShowDeleteModal(false);
      setQuestionToDelete(null);
    } catch (err) {
      console.error('Error deleting question:', err);
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete question');
    } finally {
      setIsDeleting(false);
    }
  };

  // Add handler function for showing hierarchy modal
  const handleViewHierarchy = (question: Question) => {
    setSelectedHierarchyQuestion(question);
    setShowHierarchyModal(true);
  };

  // Add handler for closing hierarchy modal
  const closeHierarchyModal = () => {
    setShowHierarchyModal(false);
    setSelectedHierarchyQuestion(null);
  };

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<TeacherSidebar />}>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Question Bank</h1>
          <p className="text-gray-600">Manage your questions for exams and assessments</p>
        </div>
        <Link to="/teacher/questions/create">
          <Button variant="primary">
            Add New Question
          </Button>
        </Link>
      </div>

      {/* Question Type Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px" aria-label="Tabs">
            <button
              onClick={() => setActiveQuestionTypeTab('all')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeQuestionTypeTab === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Questions
              <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                {questions.length}
              </span>
            </button>
            <button
              onClick={() => setActiveQuestionTypeTab('normal')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeQuestionTypeTab === 'normal'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Normal MCQs
              <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                {questions.filter(q => !q.answers.some(a => a.image_url)).length}
              </span>
            </button>
            <button
              onClick={() => setActiveQuestionTypeTab('image-based')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeQuestionTypeTab === 'image-based'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Image-Based MCQs
              <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                {questions.filter(q => q.answers.some(a => a.image_url)).length}
              </span>
            </button>
          </nav>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {/* Filter and Search Section */}
      <Card className="mb-6">
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search input */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search Questions
              </label>
              <input
                type="text"
                id="search"
                placeholder="Search by question content..."
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Difficulty filter */}
            <div>
              <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Difficulty
              </label>
              <select
                id="difficulty"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={filterDifficulty}
                onChange={(e) => setFilterDifficulty(e.target.value)}
              >
                <option value="all">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="moderate">Moderate</option>
                <option value="difficult">Difficult</option>
              </select>
            </div>
            
            {/* Course filter */}
            <div>
              <label htmlFor="course_filter" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Course
              </label>
              <select
                id="course_filter"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={filterCourse || ''}
                onChange={(e) => setFilterCourse(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">All Courses</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Subject filter */}
            <div>
              <label htmlFor="subject_filter" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Subject
              </label>
              <select
                id="subject_filter"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={filterSubject || ''}
                onChange={(e) => setFilterSubject(e.target.value ? Number(e.target.value) : null)}
                disabled={!filterCourse}
              >
                <option value="">All Subjects</option>
                {filteredSubjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Chapter filter */}
            <div>
              <label htmlFor="chapter_filter" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Chapter
              </label>
              <select
                id="chapter_filter"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={filterChapter || ''}
                onChange={(e) => setFilterChapter(e.target.value ? Number(e.target.value) : null)}
                disabled={!filterSubject}
              >
                <option value="">All Chapters</option>
                {filteredChapters.map(chapter => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Topic filter */}
            <div>
              <label htmlFor="topic_filter" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Topic
              </label>
              <select
                id="topic_filter"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={filterTopic || ''}
                onChange={(e) => setFilterTopic(e.target.value ? Number(e.target.value) : null)}
                disabled={!filterChapter}
              >
                <option value="">All Topics</option>
                {filteredTopics.map(topic => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="mt-4 flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {filteredQuestions.length} questions found
            </span>
            <Button 
              variant="light" 
              size="sm" 
              onClick={handleResetFilters}
              disabled={!filterCourse && !filterSubject && !filterChapter && !filterTopic && filterDifficulty === 'all' && !searchTerm && activeQuestionTypeTab === 'all'}
            >
              Reset Filters
            </Button>
          </div>
        </div>
      </Card>

      {isLoading && !showModal ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Questions Table */}
          {filteredQuestions.length > 0 ? (
            <div className="overflow-x-auto bg-white shadow-md rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Question
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Difficulty
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Correct Answer
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredQuestions.map((question, index) => (
                    <tr key={question.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="line-clamp-2">{question.content}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(question.difficulty_level)}`}>
                    {question.difficulty_level.charAt(0).toUpperCase() + question.difficulty_level.slice(1)}
                  </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatAnswers(question.answers)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Link to={`/teacher/questions/${String(question.id)}/edit`}>
                            <Button variant="light" size="sm">Edit</Button>
                          </Link>
                          <Button 
                            variant="light" 
                            size="sm"
                            onClick={() => handleViewQuestion(String(question.id))}
                          >
                            View
                          </Button>
                          <Button 
                            variant="light" 
                            size="sm"
                            className="text-red-600 hover:text-red-900"
                            onClick={() => handleDeleteClick(question)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No questions found</h3>
              <p className="text-gray-600 mb-6">Try adjusting your search or filter criteria</p>
              <Link to="/teacher/questions/create">
                <Button variant="primary">Create New Question</Button>
              </Link>
            </div>
          )}
        </>
      )}

      {/* Question View Modal */}
      {showModal && selectedQuestion && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={closeModal}></div>

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <div className="flex justify-between items-start">
                        <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                          Question Details
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(selectedQuestion.difficulty_level)}`}>
                          {selectedQuestion.difficulty_level.charAt(0).toUpperCase() + selectedQuestion.difficulty_level.slice(1)}
                        </span>
                      </div>

                      <div className="mt-4 space-y-6">
                        {/* Question Content Section */}
                        <div className="bg-gray-50 p-4 rounded-md">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Question Content</h4>
                          <p className="text-base text-gray-900">{selectedQuestion.content}</p>
                          {selectedQuestion.image_url && selectedQuestion.image_url !== 'string' && (
                            <div className="mt-4">
                              <img 
                                src={selectedQuestion.image_url} 
                                alt="Question illustration" 
                                className="max-h-48 mx-auto rounded-md"
                              />
                            </div>
                          )}
                </div>

                        {/* Question Type & Answers Section */}
                <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">
                            Question Type: 
                            <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              {getQuestionType(selectedQuestion.answers)}
                            </span>
                          </h4>
                          
                          <div className="mt-3">
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Answers:</h5>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {selectedQuestion.answers.map((answer, index) => (
                                answer.content !== 'No predefined answer for this type' ? (
                                  <div key={index} className="flex items-center p-2 rounded-md bg-gray-50">
                                    <div className={`flex-1 ${answer.is_correct ? 'font-medium text-green-600' : 'text-gray-900'}`}>
                                      {/* Check if this is an image-based answer */}
                                      {answer.image_url ? (
                                        <div className="flex flex-col sm:flex-row items-center gap-2">
                                          <img 
                                            src={answer.image_url} 
                                            alt={`Option ${index + 1}`}
                                            className="max-h-24 object-contain rounded border border-gray-200"
                                          />
                                          {answer.content && (
                                            <span className="text-sm">{answer.content}</span>
                                          )}
                                        </div>
                                      ) : (
                                        // Regular text-based answer
                                        answer.content
                                      )}
                                    </div>
                                    {answer.is_correct && (
                                      <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                        Correct
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div key={index} className="p-2 rounded-md bg-gray-50 text-gray-600 italic">
                                    Open-ended question (no predefined correct answer)
                                  </div>
                                )
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Metadata Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-200 pt-4">
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-3">Question Hierarchy</h4>
                            <div className="space-y-2">
                              <div className="flex">
                                <span className="text-sm font-medium text-gray-500 w-20">Course:</span>
                                <span className="text-sm text-gray-900">{selectedQuestion.course?.name || 'N/A'}</span>
                              </div>
                              <div className="flex">
                                <span className="text-sm font-medium text-gray-500 w-20">Subject:</span>
                                <span className="text-sm text-gray-900">{selectedQuestion.subject?.name || 'N/A'}</span>
                              </div>
                              <div className="flex">
                                <span className="text-sm font-medium text-gray-500 w-20">Chapter:</span>
                                <span className="text-sm text-gray-900">{selectedQuestion.chapter?.name || 'N/A'}</span>
                              </div>
                              <div className="flex">
                                <span className="text-sm font-medium text-gray-500 w-20">Topic:</span>
                                <span className="text-sm text-gray-900">{selectedQuestion.topic?.name || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-3">Question Info</h4>
                            <div className="space-y-2">
                              {/* <div className="flex">
                                <span className="text-sm font-medium text-gray-500 w-24">ID:</span>
                                <span className="text-sm text-gray-900">{selectedQuestion.id}</span>
                              </div>
                              <div className="flex">
                                <span className="text-sm font-medium text-gray-500 w-24">Created By:</span>
                                <span className="text-sm text-gray-900">{selectedQuestion.creator?.username || 'N/A'}</span>
                              </div> */}
                              <div className="flex">
                                <span className="text-sm font-medium text-gray-500 w-24">Created:</span>
                                <span className="text-sm text-gray-900">{formatDate(selectedQuestion.created_at)}</span>
                              </div>
                              <div className="flex">
                                <span className="text-sm font-medium text-gray-500 w-24">Last Updated:</span>
                                <span className="text-sm text-gray-900">{formatDate(selectedQuestion.updated_at)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Link to={`/teacher/questions/${String(selectedQuestion.id)}/edit`}>
                  <Button variant="primary" size="sm" className="ml-3">
                    Edit Question
                  </Button>
                </Link>
                <Button variant="light" size="sm" onClick={closeModal}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Question Delete Confirmation Modal */}
      {showDeleteModal && questionToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={closeDeleteModal}></div>

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Delete Question
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete this question? This action cannot be undone.
                      </p>
                      <div className="mt-3 bg-gray-50 p-3 rounded">
                        <p className="line-clamp-2 text-sm">{questionToDelete.content}</p>
                      </div>
                      {deleteError && (
                        <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                          <span className="block sm:inline">{deleteError}</span>
                        </div>
                      )}
                    </div>
                </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button 
                  variant="danger" 
                  size="sm" 
                  className="w-full sm:w-auto sm:ml-3"
                  onClick={handleDeleteQuestion}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
                <Button 
                  variant="light" 
                  size="sm" 
                  className="mt-3 w-full sm:mt-0 sm:w-auto"
                  onClick={closeDeleteModal}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      
    </MainLayout>
  );
};

export default TeacherQuestionsPage; 