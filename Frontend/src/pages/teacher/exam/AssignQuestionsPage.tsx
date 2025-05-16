import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../../../components/layout/MainLayout';
import TeacherSidebar from '../sidebar/TeacherSidebar';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { useAuth } from '../../../contexts/AuthContext';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
// Interfaces
interface User {
  username: string;
  email: string;
  id: number;
  role: string;
}

interface Answer {
  content: string;
  is_correct: boolean;
  id: number;
  question_id: number;
  image_url?: string;
  created_at?: string;
  updated_at?: string | null;
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
  course?: { name: string };
  subject?: { name: string };
  chapter?: { name: string };
  topic?: { name: string };
}

interface Exam {
  id: string;
  title: string;
  description: string;
  course_id: number;
  subject_id: number;
  time_limit_minutes: number;
  pass_percentage: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  questions: ExamQuestion[];
  topic_id?: number;
  chapter_id?: number;
}

interface ExamQuestion {
  id: string;
  exam_id: string;
  question_id: string;
  marks: number;
  question?: Question;
  created_at: string;
  updated_at: string;
}

interface Course {
  id: number;
  name: string;
}

interface Subject {
  id: number;
  name: string;
  course_id: number;
}

interface AssignQuestionsPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

// Add a simple notification helper instead of using toast
const showNotification = {
  success: (message: string) => {
    console.log(`✅ Success: ${message}`);
    // You could add a custom UI notification here if needed
    alert(`Success: ${message}`);
  },
  error: (message: string) => {
    console.error(`❌ Error: ${message}`);
    // You could add a custom UI notification here if needed
    alert(`Error: ${message}`);
  }
};

const AssignQuestionsPage: React.FC<AssignQuestionsPageProps> = ({ user, onLogout }) => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  // States
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [assignedQuestions, setAssignedQuestions] = useState<ExamQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterCourse, setFilterCourse] = useState<number | null>(null);
  const [filterSubject, setFilterSubject] = useState<number | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Array<{id: number; name: string; chapter_id: number}>>([]);
  const [chapters, setChapters] = useState<Array<{id: number; name: string; subject_id: number}>>([]);

  // Selected questions
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [questionsToRemove, setQuestionsToRemove] = useState<string[]>([]);

  // Modal state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [selectedQuestionForPoints, setSelectedQuestionForPoints] = useState<ExamQuestion | null>(null);
  const [pointsValue, setPointsValue] = useState<number>(1);
  const [isUpdatingPoints, setIsUpdatingPoints] = useState(false);

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch exam details
        if (examId) {
          const examResponse = await fetch(`${API_URL}/api/exams/exams/${examId}`, {
            headers: {
              'accept': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });

          if (!examResponse.ok) {
            throw new Error('Failed to fetch exam details');
          }

          const examData = await examResponse.json();
          setExam(examData);
          
          // Auto-set filters based on exam association
          if (examData.topic_id) {
            // If exam is associated with a topic, fetch topics for filtering
            const topicsResponse = await fetch(`${API_URL}/api/topics/`, {
              headers: {
                'accept': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            });
            
            if (topicsResponse.ok) {
              const topicsData = await topicsResponse.json();
              setTopics(topicsData.map((topic: any) => ({
                id: topic.id,
                name: topic.name,
                chapter_id: topic.chapter_id
              })));
            }
          } 
          
          if (examData.chapter_id || examData.topic_id) {
            // Fetch chapters for filtering
            const chaptersResponse = await fetch(`${API_URL}/api/chapters/`, {
              headers: {
                'accept': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            });
            
            if (chaptersResponse.ok) {
              const chaptersData = await chaptersResponse.json();
              setChapters(chaptersData.map((chapter: any) => ({
                id: chapter.id,
                name: chapter.name,
                subject_id: chapter.subject_id
              })));
            }
          }
          
          if (examData.subject_id || examData.chapter_id || examData.topic_id) {
            // Fetch subjects for filtering
            const subjectsResponse = await fetch(`${API_URL}/api/subjects/`, {
              headers: {
                'accept': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            });
            
            if (subjectsResponse.ok) {
              const subjectsData = await subjectsResponse.json();
              setSubjects(subjectsData.map((subject: any) => ({
                id: subject.id,
                name: subject.name,
                course_id: subject.course_id
              })));
            }
          }
          
          // Fetch assigned questions using the specific endpoint
          const assignedQuestionsResponse = await fetch(`${API_URL}/api/exams/exams/${examId}/questions`, {
            headers: {
              'accept': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (!assignedQuestionsResponse.ok) {
            throw new Error('Failed to fetch assigned questions');
          }
          
          const assignedQuestionsData = await assignedQuestionsResponse.json();
          setAssignedQuestions(Array.isArray(assignedQuestionsData) ? assignedQuestionsData : []);

          // Fetch all questions
          const questionsResponse = await fetch(`${API_URL}/api/questions/`, {
            headers: {
              'accept': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });

          if (!questionsResponse.ok) {
            throw new Error('Failed to fetch questions');
          }

          const questionsData = await questionsResponse.json();
          setQuestions(questionsData);

          // Fetch courses for filters
          const coursesResponse = await fetch(`${API_URL}/api/courses/`, {
            headers: {
              'accept': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });

          if (coursesResponse.ok) {
            const coursesData = await coursesResponse.json();
            setCourses(coursesData);
          }

          // Also fetch chapters and topics for filtering
          try {
            const chaptersResponse = await fetch(`${API_URL}/api/chapters/`, {
            headers: {
              'accept': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });

            if (chaptersResponse.ok) {
              const chaptersData = await chaptersResponse.json();
              setChapters(chaptersData);
            }

            const topicsResponse = await fetch(`${API_URL}/api/topics/`, {
              headers: {
                'accept': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            });

            if (topicsResponse.ok) {
              const topicsData = await topicsResponse.json();
              setTopics(topicsData);
            }
          } catch (err) {
            console.error('Error fetching chapters and topics:', err);
            // Don't set error state, as this is additional data
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [examId, token]);

  // Add helper functions to fetch additional entity details
  const fetchTopicDetails = async (topicId: number) => {
    try {
      const response = await fetch(`${API_URL}/api/topics/${topicId}`, {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) return null;
      return await response.json();
    } catch (err) {
      console.error(`Error fetching topic ${topicId}:`, err);
      return null;
    }
  };

  const fetchChapterDetails = async (chapterId: number) => {
    try {
      const response = await fetch(`${API_URL}/api/chapters/${chapterId}`, {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) return null;
      return await response.json();
    } catch (err) {
      console.error(`Error fetching chapter ${chapterId}:`, err);
      return null;
    }
  };

  const fetchSubjectDetails = async (subjectId: number) => {
    try {
      const response = await fetch(`${API_URL}/api/subjects/${subjectId}`, {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) return null;
      return await response.json();
    } catch (err) {
      console.error(`Error fetching subject ${subjectId}:`, err);
      return null;
    }
  };

  // Function to refresh assigned questions
  const refreshAssignedQuestions = async () => {
    try {
        const assignedQuestionsResponse = await fetch(`${API_URL}/api/exams/exams/${examId}/questions`, {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!assignedQuestionsResponse.ok) {
        throw new Error('Failed to refresh assigned questions');
      }
      
      const assignedQuestionsData = await assignedQuestionsResponse.json();
      setAssignedQuestions(Array.isArray(assignedQuestionsData) ? assignedQuestionsData : []);
      return Array.isArray(assignedQuestionsData) ? assignedQuestionsData : [];
    } catch (err) {
      console.error('Error refreshing assigned questions:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh assigned questions');
      return [];
    }
  };

  // Filter questions based on criteria
  const filteredQuestions = questions.filter(question => {
    // Find if this question is already assigned
    const assignedQuestion = assignedQuestions && assignedQuestions.find(q => 
      q.question_id === question.id || (q.question && q.question.id === question.id)
    );
    
    // If it's assigned and not marked for removal, don't show it
    if (assignedQuestion) {
      const actualQuestionId = assignedQuestion.question?.id || assignedQuestion.question_id;
      if (actualQuestionId && !questionsToRemove.includes(actualQuestionId)) {
      return false;
      }
    }

    // Apply search filter
    if (searchTerm && !question.content.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Apply difficulty filter
    if (filterDifficulty !== 'all' && question.difficulty_level !== filterDifficulty) {
      return false;
    }
    
    // Check if the question should be included based on exam's association
    if (exam) {
      // Topic-level filter
      if (exam.topic_id && question.topic_id !== exam.topic_id) {
        return false; // Only show questions from the same topic
      } 
      // Chapter-level filter
      else if (exam.chapter_id && !exam.topic_id) {
        // For chapter exams, show questions from this chapter or its topics
        if (question.chapter_id !== exam.chapter_id && 
            !(question.topic_id && topics.some((t: {id: number; chapter_id: number}) => 
              t.id === question.topic_id && t.chapter_id === exam.chapter_id))) {
          return false;
        }
      } 
      // Subject-level filter
      else if (exam.subject_id && !exam.chapter_id && !exam.topic_id) {
        // For subject exams, show questions from this subject or its chapters/topics
        if (question.subject_id !== exam.subject_id && 
            !(question.chapter_id && chapters.some((c: {id: number; subject_id: number}) => 
              c.id === question.chapter_id && c.subject_id === exam.subject_id)) &&
            !(question.topic_id && topics.some((t: {id: number; chapter_id: number}) => 
              t.id === question.topic_id && 
              chapters.some((c: {id: number; subject_id: number}) => 
                c.id === t.chapter_id && c.subject_id === exam.subject_id)))) {
          return false;
        }
      } 
      // Course-level filter
      else if (exam.course_id && !exam.subject_id && !exam.chapter_id && !exam.topic_id) {
        // For course exams, show questions from this course or its subjects/chapters/topics
        if (question.course_id !== exam.course_id && 
            !(question.subject_id && subjects.some((s: {id: number; course_id: number}) => 
              s.id === question.subject_id && s.course_id === exam.course_id)) &&
            !(question.chapter_id && chapters.some((c: {id: number; subject_id: number}) => 
              c.id === question.chapter_id && 
              subjects.some((s: {id: number; course_id: number}) => 
                s.id === c.subject_id && s.course_id === exam.course_id))) &&
            !(question.topic_id && topics.some((t: {id: number; chapter_id: number}) => 
              t.id === question.topic_id && 
              chapters.some((c: {id: number; subject_id: number}) => 
                c.id === t.chapter_id && 
                subjects.some((s: {id: number; course_id: number}) => 
                  s.id === c.subject_id && s.course_id === exam.course_id))))) {
          return false;
        }
      }
    }
    
    // Apply regular course filter (from UI)
    if (filterCourse && question.course_id !== filterCourse) {
      return false;
    }
    
    // Apply regular subject filter (from UI)
    if (filterSubject && question.subject_id !== filterSubject) {
      return false;
    }
    
    return true;
  });

  // Handle question selection - updated to use actual question ID for API
  const toggleQuestionSelection = (questionId: string) => {
    // First, check if this question is already assigned
    const assignedQuestion = assignedQuestions.find(q => 
      q.question_id === questionId || (q.question && q.question.id === questionId)
    );
    
    if (assignedQuestion) {
      // It's an existing question, so we need to toggle its "removal" status
      if (questionsToRemove.includes(questionId)) {
        // If already marked for removal, unmark it
        setQuestionsToRemove(prev => prev.filter(id => id !== questionId));
      } else {
        // If not marked for removal, mark it for removal
        setQuestionsToRemove(prev => [...prev, questionId]);
      }
    } else {
      // It's a new question to potentially add
      if (selectedQuestions.includes(questionId)) {
        // If it's already selected, remove it
        setSelectedQuestions(prev => prev.filter((id: string) => id !== questionId));
        
        // Also remove from examQuestions if it exists there
        setAssignedQuestions(prev => prev.filter(eq => eq.question_id !== questionId));
      } else {
        // If it's not selected, add it and immediately prompt for marks
        setSelectedQuestions(prev => [...prev, questionId]);
        
        // Find the question object from available questions
        const questionToAdd = questions.find(q => q.id === questionId)!;
        
        if (questionToAdd) {
          // Create new exam question with default marks
          const newExamQuestion: ExamQuestion = {
            id: `temp_${Date.now()}`, // Temporary ID until saved
            exam_id: examId || '', // Provide fallback empty string to avoid undefined
            question_id: questionId,
            marks: 1, // Use default points initially
            question: questionToAdd,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          // Add to examQuestions
          setAssignedQuestions(prev => [...prev, newExamQuestion]);
          
          // Immediately open the points modal for this new question
          setSelectedQuestionForPoints(newExamQuestion);
          setPointsValue(1);
          setShowPointsModal(true);
        }
      }
    }
  };

  // Add a new function to handle completing the points assignment
  const handleCompletePointsAssignment = () => {
    if (selectedQuestionForPoints) {
      // Update the points for this question
      setAssignedQuestions(prev => 
        prev.map(eq => 
          eq.question_id === selectedQuestionForPoints.question_id 
            ? { ...eq, marks: pointsValue } 
            : eq
        )
      );
      
      // Close the modal
      setShowPointsModal(false);
      setSelectedQuestionForPoints(null);
    }
  };

  // Modify the points modal to have different behavior when adding vs editing
  const handleUpdatePoints = async () => {
    if (!selectedQuestionForPoints) return;
    
    // Check if this is a newly added question (temp ID) or an existing one
    if (selectedQuestionForPoints.id.startsWith('temp_')) {
      // For newly added questions, just update the local state
      handleCompletePointsAssignment();
      } else {
      // For existing questions, update on the server
      setIsUpdatingPoints(true);
      
      try {
        const response = await fetch(`${API_URL}/api/exam-questions/${selectedQuestionForPoints.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            marks: pointsValue
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to update question points');
        }
        
        // Update the question in local state
        setAssignedQuestions(prev => 
          prev.map(eq => 
            eq.id === selectedQuestionForPoints.id 
              ? { ...eq, marks: pointsValue } 
              : eq
          )
        );
        
        showNotification.success('Question points updated successfully');
        setShowPointsModal(false);
        setSelectedQuestionForPoints(null);
      } catch (err) {
        console.error('Error updating question points:', err);
        showNotification.error('Failed to update question points');
      } finally {
        setIsUpdatingPoints(false);
      }
    }
  };

  // Open question preview modal
  const handlePreviewQuestion = (question: Question | string | ExamQuestion) => {
    // If we received a question object directly, use it
    if (typeof question !== 'string' && 'content' in question) {
    setPreviewQuestion(question);
    setShowPreviewModal(true);
      return;
    }
    
    // If it's an ExamQuestion object with a nested question
    if (typeof question !== 'string' && 'question' in question && question.question) {
      setPreviewQuestion(question.question);
    setShowPreviewModal(true);
      return;
    }
    
    // If we received a question ID (from assigned questions), find the full question object
    const questionId = typeof question === 'string' ? question : question.question_id;
    
    // First look in the assigned questions which might have the full question object
    const assignedQuestion = assignedQuestions.find(q => 
      q.question_id === questionId || (q.question && q.question.id === questionId)
    );
    
    if (assignedQuestion && assignedQuestion.question) {
      setPreviewQuestion(assignedQuestion.question);
      setShowPreviewModal(true);
      return;
    }
    
    // Then try to find it in the regular questions array
    const fullQuestion = questions.find(q => q.id === questionId);
    
    if (fullQuestion) {
      setPreviewQuestion(fullQuestion);
      setShowPreviewModal(true);
    } else {
      setError('Question details not found');
    }
  };

  // Close question preview modal
  const handleClosePreview = () => {
    setShowPreviewModal(false);
    setPreviewQuestion(null);
  };

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

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterDifficulty('all');
    setFilterCourse(null);
    setFilterSubject(null);
  };

  // Save changes to exam questions - updated to use question ID for API endpoint
  const handleSaveChanges = async () => {
    if (!exam) return;
    
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      // Prepare data for API
      // 1. Keep existing questions that are not in questionsToRemove
      const keptQuestions = assignedQuestions.filter(q => {
        const actualQuestionId = q.question?.id || q.question_id;
        return !actualQuestionId || !questionsToRemove.includes(actualQuestionId);
      });
      
      // 2. Add newly selected questions
      const newQuestionIds = Array.from(selectedQuestions);
      
      console.log('Questions to keep:', keptQuestions.length);
      console.log('New questions to add:', newQuestionIds.length);
      console.log('Questions to remove:', questionsToRemove.length);
      
      // 3. Create API requests for adding new questions
      const addPromises = newQuestionIds.map(questionId => {
        // Find the question in assignedQuestions to get its marks
        const questionToAdd = assignedQuestions.find(q => q.question_id === questionId);
        const marks = questionToAdd ? questionToAdd.marks : 1; // Use the marks from the modal if available, otherwise default to 1
        
        console.log(`Adding question ID ${questionId} with marks: ${marks}`);
        
        return fetch(`${API_URL}/api/exams/exams/${examId}/questions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            exam_id: Number(examId),
            question_id: Number(questionId),
            marks: marks // Use the actual marks value
          })
        });
      });
      
      // 4. Create API requests for removing questions - using actual question IDs
      const removePromises = questionsToRemove.map(questionId => {
        console.log(`Removing question ID ${questionId} from exam ${examId}`);
        
        // Use the question ID in the API endpoint, not the assignment ID
        return fetch(`${API_URL}/api/exams/exams/${examId}/questions/${questionId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      });
      
      // 5. Execute all requests
      const results = await Promise.allSettled([...addPromises, ...removePromises]);
      
      // 6. Check if any requests failed
      const failedRequests = results.filter(result => result.status === 'rejected');
      if (failedRequests.length > 0) {
        throw new Error(`${failedRequests.length} operations failed. Please try again.`);
      }
      
      // 7. Refresh assigned questions data
      await refreshAssignedQuestions();
      
      // 8. Set appropriate success message based on what was done
      let successMsg = '';
      if (selectedQuestions.length > 0 && questionsToRemove.length > 0) {
        successMsg = `Successfully added ${selectedQuestions.length} and removed ${questionsToRemove.length} questions from the exam.`;
      } else if (selectedQuestions.length > 0) {
        successMsg = `Successfully added ${selectedQuestions.length} questions to the exam.`;
      } else if (questionsToRemove.length > 0) {
        successMsg = `Successfully removed ${questionsToRemove.length} questions from the exam.`;
      } else {
        successMsg = 'No changes were made to the exam.';
      }
      
      setSelectedQuestions([]);
      setQuestionsToRemove([]);
      setSuccessMessage(successMsg);
      
      // Scroll to top to show success message
      window.scrollTo(0, 0);
    } catch (err) {
      console.error('Error saving questions:', err);
      setError(err instanceof Error ? err.message : 'Failed to save questions');
    } finally {
      setIsSaving(false);
    }
  };

  // In the handleManagePoints function or where question removal is handled:
  const handleManagePoints = (question: ExamQuestion) => {
    if (!question) return;
    
    setSelectedQuestionForPoints(question);
    setPointsValue(question.marks || 1);
    setShowPointsModal(true);
  };

  // Update how we handle adding/removing from questionsToRemove
  const handleToggleRemoval = (questionId: string, assignmentId: string) => {
    if (questionsToRemove.includes(questionId)) {
      // If already marked for removal, unmark it
      setQuestionsToRemove(prev => prev.filter(id => id !== questionId));
    } else {
      // If not marked for removal, mark it
      setQuestionsToRemove(prev => [...prev, questionId]);
    }
  };

  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={<TeacherSidebar />}>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assign Questions to Exam</h1>
          {exam && (
            <p className="text-gray-600">
              Exam: <span className="font-medium">{exam.title}</span>
            </p>
          )}
        </div>
        <div className="space-x-3">
          <Button 
            variant="light"
            onClick={() => navigate(`/teacher/exams/${examId}`)}
          >
            Cancel
          </Button>
          <Button 
            variant="primary"
            onClick={handleSaveChanges}
            disabled={selectedQuestions.length === 0 && questionsToRemove.length === 0 || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{successMessage}</span>
        </div>
      )}

      {/* Error message */}
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
        <div className="grid grid-cols-1 gap-6">
          {/* Assignment Status Summary */}
          <Card className="mb-6">
            <div className="p-4">
              <h2 className="text-lg font-semibold mb-4">Assignment Summary</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-blue-700 text-sm font-medium mb-1">Currently Assigned</h3>
                  <p className="text-2xl font-bold text-blue-900">
                    {assignedQuestions ? assignedQuestions.length - questionsToRemove.length : 0}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-green-700 text-sm font-medium mb-1">To Add</h3>
                  <p className="text-2xl font-bold text-green-900">
                    {selectedQuestions.length}
                  </p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <h3 className="text-red-700 text-sm font-medium mb-1">To Remove</h3>
                  <p className="text-2xl font-bold text-red-900">
                    {questionsToRemove.length}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Currently Assigned Questions */}
          {assignedQuestions && assignedQuestions.length > 0 && (
            <Card className="mb-6">
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-4">Currently Assigned Questions</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Question
                        </th>
                        <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Marks
                        </th>
                        <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Difficulty
                        </th>
                        <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {assignedQuestions && assignedQuestions.length > 0 ? (
                        assignedQuestions.map((assignedQuestion) => {
                          // Get the question data either from the nested question object or the questions array
                          const questionData = assignedQuestion.question || 
                                              questions.find(q => q.id === assignedQuestion.question_id);
                          
                          // Get the actual question ID for checking removal status
                          const actualQuestionId = assignedQuestion.question?.id || assignedQuestion.question_id;
                          
                          // Check if it's marked for removal using the actual question ID
                          const isMarkedForRemoval = actualQuestionId && questionsToRemove.includes(actualQuestionId);
                          
                          return (
                            <tr key={assignedQuestion.id} className={isMarkedForRemoval ? 'bg-red-50' : ''}>
                              <td className="px-3 py-2 whitespace-normal">
                                <div className="flex items-start">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900 line-clamp-1 max-w-md">
                                      {questionData ? questionData.content : 'Question not found'}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      Assignment ID: {assignedQuestion.id}
                                      {assignedQuestion.question && 
                                        `, Question ID: ${assignedQuestion.question.id}`}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-center whitespace-nowrap">
                                <div className="text-sm font-semibold text-gray-900">
                                  {assignedQuestion.marks || 1}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-center whitespace-nowrap">
                                {questionData && (
                                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getDifficultyColor(questionData.difficulty_level)}`}>
                                    {questionData.difficulty_level.charAt(0).toUpperCase() + questionData.difficulty_level.slice(1)}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-center">
                                {isMarkedForRemoval ? (
                                  <div className="flex items-center justify-center">
                                    <span className="text-red-600 text-xs mr-2">Marked for removal</span>
                                    <div data-tooltip="Cancel removal">
                                      <Button 
                                        variant="light" 
                                        size="sm"
                                        onClick={() => toggleQuestionSelection(
                                          assignedQuestion.question ? assignedQuestion.question.id : assignedQuestion.question_id
                                        )}
                                        className="px-2 py-1 text-xs"
                                      >
                                        Undo
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex justify-center items-center space-x-1">
                                    <div data-tooltip="View full question details">
                                      <Button 
                                        variant="light" 
                                        size="sm"
                                        onClick={() => handlePreviewQuestion(assignedQuestion)}
                                        className="px-2 py-1 text-xs"
                                      >
                                        <span className="flex items-center">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                          </svg>
                                          View
                                        </span>
                                      </Button>
                                    </div>
                                    
                                    <div data-tooltip="Remove this question from the exam">
                                      <Button 
                                        variant="danger" 
                                        size="sm"
                                        onClick={() => toggleQuestionSelection(
                                          assignedQuestion.question ? assignedQuestion.question.id : assignedQuestion.question_id
                                        )}
                                        className="px-2 py-1 text-xs"
                                      >
                                        <span className="flex items-center">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                          Remove
                                        </span>
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                            No questions assigned yet. Use the question list below to assign questions to this exam.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          )}

          {/* Filter Section */}
          <Card className="mb-6">
            <div className="p-4">
              <h2 className="text-lg font-semibold mb-4">Filter Questions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search input */}
                <div>
                  <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                    Search Questions
                  </label>
                  <input
                    type="text"
                    id="search"
                    placeholder="Search by content..."
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-all duration-300"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                {/* Difficulty filter */}
                <div>
                  <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
                    Difficulty Level
                  </label>
                  <select
                    id="difficulty"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-all duration-300"
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
                  <label htmlFor="course" className="block text-sm font-medium text-gray-700 mb-1">
                    Course
                  </label>
                  <select
                    id="course"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-all duration-300"
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
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <select
                    id="subject"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-all duration-300"
                    value={filterSubject || ''}
                    onChange={(e) => setFilterSubject(e.target.value ? Number(e.target.value) : null)}
                    disabled={!filterCourse}
                  >
                    <option value="">All Subjects</option>
                    {subjects
                      .filter(subject => !filterCourse || subject.course_id === filterCourse)
                      .map(subject => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              
              <div className="mt-4 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {filteredQuestions.length} questions found
                </div>
                <Button
                  variant="light"
                  size="sm"
                  onClick={handleResetFilters}
                  disabled={!searchTerm && filterDifficulty === 'all' && !filterCourse && !filterSubject}
                >
                  Reset Filters
                </Button>
              </div>
            </div>
          </Card>

          {/* Questions List */}
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-800">Available Questions</h2>
            </div>
            
            {filteredQuestions.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-500">No questions match your filters. Try adjusting your search criteria.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredQuestions.map(question => {
                  // Check if this question is already assigned
                  const assignedQuestion = assignedQuestions.find(q => 
                    q.question_id === question.id || (q.question && q.question.id === question.id)
                  );
                  
                  // Is this question assigned and has an assignment ID?
                  const isAssigned = !!assignedQuestion;
                  
                  // Check if this question is marked for removal (check by actual question ID)
                  const isMarkedForRemoval = questionsToRemove.includes(question.id);
                  
                  // Check if this question is selected to be added
                  const isSelected = selectedQuestions.includes(question.id);
                  
                  return (
                    <div 
                      key={question.id} 
                      className={`p-4 transition-all duration-300 hover:bg-gray-50 
                        ${isAssigned && !isMarkedForRemoval ? 'bg-blue-50' : ''} 
                        ${isMarkedForRemoval ? 'bg-red-50' : ''} 
                        ${isSelected ? 'bg-green-50' : ''}`}
                    >
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mr-4">
                          <input
                            type="checkbox"
                            checked={isAssigned ? !isMarkedForRemoval : isSelected}
                            onChange={() => toggleQuestionSelection(question.id)}
                            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-all duration-300"
                          />
                        </div>
                        
                        <div className="flex-grow">
                          <div className="flex justify-between">
                            <div className="space-y-1">
                              <div className="text-sm text-gray-900 font-medium line-clamp-2">{question.content}</div>
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className={`px-2 py-1 rounded-full ${getDifficultyColor(question.difficulty_level)}`}>
                                  {question.difficulty_level.charAt(0).toUpperCase() + question.difficulty_level.slice(1)}
                                </span>
                                {question.course?.name && (
                                  <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                                    {question.course.name}
                                  </span>
                                )}
                                {question.subject?.name && (
                                  <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-800">
                                    {question.subject.name}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="ml-4">
                              <Button
                                variant="light"
                                size="sm"
                                onClick={() => handlePreviewQuestion(question)}
                                className="text-blue-600 transition-all duration-300 transform hover:scale-105"
                              >
                                Preview
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Save Changes Button (Bottom) */}
          <div className="mt-6 flex justify-end">
            <Button 
              variant="primary"
              onClick={handleSaveChanges}
              disabled={selectedQuestions.length === 0 && questionsToRemove.length === 0 || isSaving}
              className="min-w-[150px]"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      )}

      {/* Question Preview Modal */}
      {showPreviewModal && previewQuestion && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={handleClosePreview}></div>

            {/* Modal panel - Increased width for image-based MCQs */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <div className="flex justify-between items-center">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Question Preview
                    </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(previewQuestion.difficulty_level)}`}>
                        {previewQuestion.difficulty_level.charAt(0).toUpperCase() + previewQuestion.difficulty_level.slice(1)}
                      </span>
                    </div>
                    <div className="mt-4 space-y-4">
                      <div className="bg-gray-50 p-4 rounded-md">
                        <p className="text-gray-900">{previewQuestion.content}</p>
                        {previewQuestion.image_url && previewQuestion.image_url !== 'string' && (
                          <div className="mt-2 flex justify-center">
                            <img 
                              src={previewQuestion.image_url} 
                              alt="Question illustration" 
                              className="max-h-48 object-contain rounded-md"
                            />
                          </div>
                        )}
                      </div>
                      
                      {/* Determine if this is an image-based MCQ */}
                      {previewQuestion.answers.some(answer => 'image_url' in answer && answer.image_url) ? (
                      <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Image Options:</h4>
                          <div className="grid grid-cols-2 gap-3">
                          {previewQuestion.answers.map((answer, index) => (
                            <div 
                              key={index} 
                                className={`p-3 rounded-md ${answer.is_correct ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}
                              >
                                <div className="flex flex-col">
                                  <div className="text-center mb-1">
                                    {answer.is_correct && (
                                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 mb-2 inline-block">
                                        Correct Answer
                                      </span>
                                    )}
                                    <div className="flex justify-center">
                                      {'image_url' in answer && answer.image_url && (
                                      <img 
                                        src={answer.image_url} 
                                        alt={`Option ${index + 1}`} 
                                          className="max-h-36 object-contain my-2 rounded-md" 
                                      />
                                      )}
                                    </div>
                                      {answer.content && (
                                        <p className="text-sm text-gray-700 mt-1">{answer.content}</p>
                                      )}
                                    <div className="mt-1 text-xs text-gray-500">Option {index + 1}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                                    </div>
                                  ) : (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Answers:</h4>
                        <div className="space-y-2">
                          {previewQuestion.answers.map((answer, index) => (
                            <div 
                              key={index} 
                              className={`p-2 rounded-md ${answer.is_correct ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}
                            >
                              <div className="flex items-center">
                                <div className="flex-grow">
                                  {answer.content}
                                </div>
                                {answer.is_correct && (
                                  <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                    Correct
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button variant="light" onClick={handleClosePreview}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Points Edit Modal */}
      {showPointsModal && selectedQuestionForPoints && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => {
              setShowPointsModal(false);
              setSelectedQuestionForPoints(null);
            }}></div>

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Update Question Points
                    </h3>
                    <div className="mt-4 space-y-4">
                      <div className="bg-gray-50 p-4 rounded-md">
                        <label htmlFor="points" className="block text-sm font-medium text-gray-700 mb-1">
                          marks
                        </label>
                        <input
                          type="number"
                          id="marks"
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-all duration-300"
                          value={pointsValue}
                          onChange={(e) => setPointsValue(Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button variant="light" onClick={() => {
                  setShowPointsModal(false);
                  setSelectedQuestionForPoints(null);
                }}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleUpdatePoints}
                  disabled={isUpdatingPoints}
                  className="ml-4"
                >
                  {isUpdatingPoints ? 'Updating...' : 'Update Points'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default AssignQuestionsPage; 