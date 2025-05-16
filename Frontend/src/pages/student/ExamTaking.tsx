import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StudentSidebar from './components/StudentSidebar';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
// Types
interface ApiOption {
  id: number;
  content: string;
  is_correct?: boolean;
  image_url?: string;
}

interface ApiQuestion {
  id: number;
  question_id: number;
  exam_id: number;
  marks: number;
  question: {
    content: string;
    image_url?: string;
    difficulty_level: string;
    answers: ApiOption[];
  };
}

interface Option {
  id: number;
  text: string;
  is_correct?: boolean;
}

interface Question {
  id: number;
  exam_id: number;
  marks: number;
  question: {
    id: number;
    content: string;
  image_url?: string;
    difficulty_level: string;
    answers: ApiOption[];
  };
}

interface ExamInfo {
  id: number;
  title: string;
  description: string;
  duration_minutes: number;
  max_marks: number;
  max_questions: number;
}

interface Answer {
  questionId: number;
  selectedOptionId: number | undefined;
  isCorrect: boolean | undefined;
}

interface SubmitAnswerData {
  student_exam_id: number;
  question_id: number;
  answer_id: number;
  is_correct: boolean;
}

interface DashboardPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

const ExamTaking: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const studentExamId = location.state?.studentExamId;
  
  // Component state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [examInfo, setExamInfo] = useState<ExamInfo | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(() => {
    // Try to get saved time from localStorage
    const savedTime = localStorage.getItem(`exam_${examId}_time`);
    const savedStartTime = localStorage.getItem(`exam_${examId}_start_time`);
    
    if (savedTime && savedStartTime) {
      const elapsedTime = Math.floor((Date.now() - parseInt(savedStartTime)) / 1000);
      const remainingTime = Math.max(parseInt(savedTime) - elapsedTime, 0);
      return remainingTime;
    }
    return 60 * 60; // Default 1 hour if no saved time
  });
  const [examCompleted, setExamCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const maxTabSwitches = 3; // Maximum allowed tab switches

  const [globalSettings, setGlobalSettings] = useState({
    auto_calculate_marks: true,
    marks_per_question: 1
  });

  // Add useEffect to load global settings before fetching exam data
  useEffect(() => {
    // Load global exam settings from localStorage
    const loadSettings = () => {
      try {
        const savedSettings = localStorage.getItem('exam_settings');
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          setGlobalSettings({
            auto_calculate_marks: settings.auto_calculate_marks ?? true,
            marks_per_question: settings.marks_per_question ?? 1
          });
        }
      } catch (err) {
        console.error('Error loading exam settings:', err);
      }
    };
    
    loadSettings();
  }, []);

  // Add a function to calculate max marks based on questions count
  const calculateMaxMarks = (totalQuestions: number, marksPerQuestion: number): number => {
    return totalQuestions * marksPerQuestion;
  };

  // Validate studentExamId on component mount
  useEffect(() => {
    if (!studentExamId) {
      console.error('No student exam ID found in location state');
      navigate('/student/exams', { replace: true });
      return;
    }
  }, [studentExamId, navigate]);

  // Fetch exam info and questions
  useEffect(() => {
    const fetchExamData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          setError('Authentication token not found. Please log in again.');
          setIsLoading(false);
          return;
        }

        if (!studentExamId) {
          setError('Student exam ID not found. Please start the exam from the exam list.');
          setIsLoading(false);
          return;
        }

        // First verify the student exam exists and check time window
        try {
          const studentExamResponse = await axios.get(
            `${API_URL}/api/student-exams/${studentExamId}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'accept': 'application/json'
              }
            }
          );

          const now = new Date();
          const startTime = new Date(studentExamResponse.data.exam.start_datetime);
          const endTime = new Date(studentExamResponse.data.exam.end_datetime);
          const studentExamStatus = studentExamResponse.data.status;

          if (now < startTime) {
            setError('The exam has not started yet. Please wait until the scheduled start time.');
            setIsLoading(false);
            return;
          }

          // Only block if exam is ended and student has not started or already completed
          if (now > endTime && studentExamStatus !== 'in_progress') {
            setError('The exam has ended. You can no longer take this exam.');
            setIsLoading(false);
            return;
          }
          // If student is in_progress, allow to continue even if now > endTime
          
        } catch (err) {
          console.error('Error verifying student exam:', err);
          setError('Failed to verify exam status. Please start the exam from the exam list.');
          setIsLoading(false);
          return;
        }

        // Fetch exam info
        const examResponse = await axios.get(`${API_URL}/api/exams/exams/${examId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'accept': 'application/json'
          }
        });
        setExamInfo(examResponse.data);
        setTimeRemaining(examResponse.data.duration_minutes * 60);

        // Fetch student profile to get student ID for seeding the random shuffle
        const profileResponse = await axios.get(`${API_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'accept': 'application/json'
          }
        });
        
        const studentId = profileResponse.data.id;
        console.log('Student ID for shuffling:', studentId);

        // Fetch questions using the correct API endpoint
        const questionsResponse = await axios.get(
          `${API_URL}/api/exams/exams/${examId}/questions`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'accept': 'application/json'
            }
          }
        );
        
        let allQuestions = questionsResponse.data;
        console.log('Total questions fetched:', allQuestions.length);
        
        // Check if max_questions is defined and less than the number of fetched questions
        if (examResponse.data.max_questions && allQuestions.length > examResponse.data.max_questions) {
          // Create a deterministic shuffle based on studentId and examId
          const seed = `${studentId}_${examId}_${profileResponse.data.email || ''}_${profileResponse.data.name || ''}_v2`;
          console.log('Using seed for shuffle:', seed);
          
          // Log question IDs before shuffling (first few only)
          console.log('Questions before shuffle (first 5):', allQuestions.slice(0, 5).map((q: Question) => q.id));
          
          const shuffledQuestions = deterministicShuffle([...allQuestions], seed);
          
          // Log question IDs after shuffling (first few only)
          console.log('Questions after shuffle (first 5):', shuffledQuestions.slice(0, 5).map((q: Question) => q.id));
          
          // Only take the first max_questions questions
          allQuestions = shuffledQuestions.slice(0, examResponse.data.max_questions);
          
          console.log(`Limiting to ${examResponse.data.max_questions} random questions out of ${questionsResponse.data.length} total questions for student ${studentId}`);
          console.log('Selected question IDs:', allQuestions.map((q: Question) => q.id));
        }
        
        // Store the (potentially limited) questions array
        setQuestions(allQuestions);
      } catch (err: any) {
        console.error('Error fetching exam data:', err);
        
        if (err.response) {
          if (err.response.status === 401) {
            setError('Authentication failed. Please log in again.');
          } else if (err.response.status === 403) {
            setError('You do not have permission to access this exam.');
          } else if (err.response.status === 404) {
            setError('Exam not found. Please check the exam ID and try again.');
          } else {
            setError(`Failed to load exam data: ${err.response.data?.detail || 'Please try again later.'}`);
          }
        } else {
          setError('Failed to load exam data. Please check your internet connection and try again.');
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    if (examId && studentExamId) {
      fetchExamData();
    }
  }, [examId, studentExamId]);

  // Deterministic shuffle function that produces the same shuffle for the same seed
  const deterministicShuffle = (array: any[], seed: string) => {
    // Create a new array to avoid mutating the original
    const result = [...array];
    
    // More robust hash function to convert seed string to a number
    const hashSeed = seed.split('').reduce((hash, char, i) => {
      // Use character position in addition to char code for better distribution
      return ((hash << 5) - hash + char.charCodeAt(0) + i) | 0;
    }, 0);
    
    // Pseudo-random number generator based on the seed
    // This uses a simple linear congruential generator (LCG) approach
    const prng = (n: number) => {
      // Constants for a simpler LCG that doesn't require BigInt
      const a = 1664525;
      const c = 1013904223;
      const m = Math.pow(2, 32);
      
      // Get initial state from the hash seed and input
      let state = (hashSeed + n) >>> 0; // convert to unsigned 32-bit integer
      
      // Generate next value
      state = (a * state + c) % m;
      
      // Return a float between 0 and 1
      return state / m;
    };
    
    // Fisher-Yates shuffle with our pseudo-random generator
    for (let i = result.length - 1; i > 0; i--) {
      // Use a different seed value for each step of the shuffle
      const j = Math.floor(prng(i) * (i + 1));
      
      // Swap elements
      [result[i], result[j]] = [result[j], result[i]];
    }
    
    return result;
  };

  // Handle visibility change
  const handleVisibilityChange = useCallback(async () => {
    if (document.hidden) {
      setTabSwitchCount(prev => {
        const newCount = prev + 1;
        if (newCount >= maxTabSwitches) {
          // Auto submit if max switches reached
          handleAutoSubmit();
          return prev;
        }
        setShowWarning(true);
        return newCount;
      });
    }
  }, []);

  // Add new auto-submit handler
  const handleAutoSubmit = async () => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication failed. Please log in again.');
        return;
      }

      if (!studentExamId) {
        setError('Student exam ID not found. Please start the exam from the exam list.');
        return;
      }

      // Create array of answer submission promises
      const answerSubmissions = questions.map(examQuestion => {
        const answer = answers[examQuestion.id];
        if (!answer?.selectedOptionId) return null;

        const answerData = {
          student_exam_id: studentExamId,
          question_id: examQuestion.question.id,
          answer_id: answer.selectedOptionId,
          is_correct: answer.isCorrect ?? false
        };

        console.log('Submitting answer data:', answerData);

        return axios.post(
          `${API_URL}/api/student-exams/student-exams/${studentExamId}/answers`,
          answerData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'accept': 'application/json',
              'Content-Type': 'application/json'
            }
          }
        ).catch(error => {
          console.error('Error submitting answer:', error.response?.data);
          throw error;
        });
      }).filter(Boolean);

      // First submit all answers
      await Promise.all(answerSubmissions);
      console.log('All answers submitted successfully');

      // Then mark the exam as complete
      await axios.put(
          `${API_URL}/api/student-exams/${studentExamId}/complete`,
        null,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'accept': 'application/json'
          }
        }
      );
      console.log('Exam marked as completed');

      // Clear localStorage
      localStorage.removeItem(`exam_${examId}_time`);
      localStorage.removeItem(`exam_${examId}_start_time`);

      setExamCompleted(true);
      navigate('/student/exams', { 
        state: { 
          examSubmitted: true,
          message: 'Exam submitted successfully!' 
        }
      });

    } catch (error: any) {
      console.error('Submission failed:', error);
      console.error('Error details:', error.response?.data);
      setError(
        error.response?.data?.detail 
          ? `Submission failed: ${error.response.data.detail}` 
          : 'Failed to submit exam. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Modify timer effect to use handleAutoSubmit
  useEffect(() => {
    if (!examId || examCompleted) return;

    if (!localStorage.getItem(`exam_${examId}_start_time`)) {
      localStorage.setItem(`exam_${examId}_start_time`, Date.now().toString());
    }

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          clearInterval(timer);
          handleAutoSubmit(); // Use new auto-submit handler
          return 0;
        }
        localStorage.setItem(`exam_${examId}_time`, newTime.toString());
        return newTime;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [examId, examCompleted]);

  // Update timer when exam info is loaded
  useEffect(() => {
    if (examInfo?.duration_minutes) {
      const savedTime = localStorage.getItem(`exam_${examId}_time`);
      if (!savedTime) {
        const initialTime = examInfo.duration_minutes * 60;
        setTimeRemaining(initialTime);
        localStorage.setItem(`exam_${examId}_time`, initialTime.toString());
      }
    }
  }, [examInfo]);

  // Cleanup localStorage when exam is completed
  useEffect(() => {
    if (examCompleted) {
      localStorage.removeItem(`exam_${examId}_time`);
      localStorage.removeItem(`exam_${examId}_start_time`);
    }
  }, [examCompleted, examId]);

  // Handle beforeunload event to save state
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!examCompleted) {
        localStorage.setItem(`exam_${examId}_time`, timeRemaining.toString());
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [timeRemaining, examCompleted, examId]);

  // Setup visibility change listener
  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleVisibilityChange]);

  // Prevent page navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    // Prevent back button
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, '', window.location.pathname);
    };

    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
  
  const currentQuestion = questions[currentQuestionIndex];
  const answeredQuestionsCount = Object.keys(answers).length;
  const progressPercentage = (answeredQuestionsCount / questions.length) * 100;
  
  // Format time (mm:ss)
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Handle answer changes
  const handleAnswerChange = (examQuestionId: number, questionId: number, answerData: Partial<Answer>) => {
    setAnswers((prev: Record<number, Answer>) => {
      const newAnswer: Answer = {
        questionId: questionId,
        selectedOptionId: answerData.selectedOptionId ?? prev[examQuestionId]?.selectedOptionId ?? undefined,
        isCorrect: answerData.isCorrect ?? prev[examQuestionId]?.isCorrect ?? undefined
      };
      return {
        ...prev,
        [examQuestionId]: newAnswer
      };
    });
  };
  
  // Navigation
  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };
  
  const jumpToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
    }
  };
  
  // Check if a question has been answered
  const isQuestionAnswered = (questionId: number): boolean => {
    const answer = answers[questionId];
    return answer?.selectedOptionId !== undefined;
  };
  
  // Navigation for question pages
  const questionsPerPage = 4;
  const totalPages = Math.ceil(questions.length / questionsPerPage);
  
  const goToPreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  // Get visible questions for current page
  const getVisibleQuestions = () => {
    const startIndex = currentPage * questionsPerPage;
    const endIndex = Math.min(startIndex + questionsPerPage, questions.length);
    return questions.slice(startIndex, endIndex);
  };
  
  return (
    <MainLayout user={user} onLogout={onLogout} sidebarContent={null}>
      {/* Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <div className="text-red-600 text-xl font-bold mb-4">Warning!</div>
            <p className="text-gray-700 mb-4">
              You have switched tabs/windows {tabSwitchCount} time{tabSwitchCount !== 1 ? 's' : ''}. 
              Maximum allowed switches: {maxTabSwitches}.
              Your exam will be automatically submitted if you exceed this limit.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowWarning(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      {error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6" role="alert">
          <p>{error}</p>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : examCompleted ? (
        <div className="text-center py-8">
          <div className="bg-green-100 text-green-800 p-4 rounded-lg mb-6">
            <h2 className="text-xl font-semibold">Exam Submitted Successfully</h2>
            <p className="mt-2">Your answers have been recorded.</p>
                </div>
          <Button 
            as={Link} 
            to={`/student/exams/${examId}/results`} 
            variant="primary"
          >
            View Results
              </Button>
            </div>
      ) : (
        <div>
          {/* Exam header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{examInfo?.title}</h1>
              <p className="text-gray-600 mt-1">{examInfo?.description}</p>
              <p className="text-sm text-gray-600 mt-1">
                You will be answering {questions.length} {questions.length === 1 ? 'question' : 'questions'} selected for this exam.
              </p>
              <p className="text-sm text-red-600 mt-1">
                Tab switches: {tabSwitchCount}/{maxTabSwitches}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-red-600 mb-2">
                {formatTime(timeRemaining)}
            </div>
              <div className="text-sm text-gray-500">
                Question {currentQuestionIndex + 1} of {questions.length}
                </div>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Question navigation sidebar */}
            <div className="lg:col-span-1">
              <Card>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Question Navigator</h3>
                  
                  {/* Navigation arrows and page indicator */}
                  <div className="flex items-center justify-between mb-3">
                    <button 
                      onClick={goToPreviousPage}
                      disabled={currentPage === 0}
                      className={`p-1 rounded-full ${currentPage === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-100'}`}
                      aria-label="Previous page"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    
                    <span className="text-sm text-gray-600">
                      Page {currentPage + 1} of {totalPages}
                    </span>
                    
                    <button 
                      onClick={goToNextPage}
                      disabled={currentPage >= totalPages - 1}
                      className={`p-1 rounded-full ${currentPage >= totalPages - 1 ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-100'}`}
                      aria-label="Next page"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Display 4 questions at a time */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {getVisibleQuestions().map((question, visibleIndex) => {
                      // Calculate absolute index in the full question array
                      const absoluteIndex = currentPage * questionsPerPage + visibleIndex;
                      return (
                        <button
                          key={question.id}
                          onClick={() => jumpToQuestion(absoluteIndex)}
                          className={`w-12 h-12 rounded flex items-center justify-center text-sm font-medium ${
                            absoluteIndex === currentQuestionIndex
                              ? 'bg-blue-600 text-white'
                              : isQuestionAnswered(question.id)
                                ? 'bg-green-100 text-green-800 border border-green-300'
                                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                        >
                          {absoluteIndex + 1}
                        </button>
                      );
                    })}
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-gray-100 mr-2"></div>
                      <span className="text-sm text-gray-600">Not answered</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-green-100 border border-green-300 mr-2"></div>
                      <span className="text-sm text-gray-600">Answered</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-blue-600 mr-2"></div>
                      <span className="text-sm text-gray-600">Current question</span>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <p className="text-sm text-gray-600 mb-2">
                      Answered: {answeredQuestionsCount} of {questions.length}
                    </p>
                  </div>
                  
                  <div className="mt-6">
                    <Button 
                      variant="primary" 
                      fullWidth 
                      onClick={handleAutoSubmit}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Exam'}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
            
            {/* Question content */}
            <div className="lg:col-span-3">
              <Card>
                <div className="p-6">
                  <div className="flex justify-between mb-6">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Question {currentQuestionIndex + 1}</span>
                      <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                        {currentQuestion?.marks} {currentQuestion?.marks === 1 ? 'mark' : 'marks'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      Multiple Choice
                    </div>
                  </div>
                  
                  {currentQuestion ? (
                    <>
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">{currentQuestion.question.content}</h2>
                  
                      {/* Display image if available */}
                      {currentQuestion.question.image_url && (
                        <div className="mb-5 flex justify-center">
                          <img 
                            src={currentQuestion.question.image_url} 
                            alt="Question" 
                            className="max-w-full object-contain rounded-lg h-40 max-h-40 w-auto mx-auto border border-gray-200"
                          />
                        </div>
                      )}
                      
                    <div className="space-y-3">
                      {/* Check if this is an image-based MCQ */}
                      {currentQuestion.question.answers.some(option => option.image_url) ? (
                        // Image-based MCQ layout
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                          {currentQuestion.question.answers.map((option: ApiOption) => (
                            <div 
                              key={option.id} 
                              className={`border rounded-lg p-3 cursor-pointer transition-all duration-200 ${
                                answers[currentQuestion.id]?.selectedOptionId === option.id
                                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500'
                                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                              }`}
                              onClick={() => handleAnswerChange(currentQuestion.id, option.id, { 
                                selectedOptionId: option.id,
                                isCorrect: option.is_correct
                              })}
                            >
                              <div className="flex items-start mb-2">
                                <div className="flex items-center h-5">
                                  <input
                                    id={`option-${option.id}`}
                                    type="radio"
                                    name={`question-${currentQuestion.id}`}
                                    value={option.id}
                                    checked={answers[currentQuestion.id]?.selectedOptionId === option.id}
                                    onChange={() => handleAnswerChange(currentQuestion.id, option.id, { 
                                      selectedOptionId: option.id,
                                      isCorrect: option.is_correct
                                    })}
                                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                  />
                                </div>
                                <label htmlFor={`option-${option.id}`} className="ml-3 text-sm font-medium text-gray-700">
                                  Option {currentQuestion.question.answers.indexOf(option) + 1}
                                </label>
                              </div>
                              
                              {option.image_url && (
                                <div className="flex justify-center mb-2 h-36">
                                  <img 
                                    src={option.image_url} 
                                    alt={`Option ${currentQuestion.question.answers.indexOf(option) + 1}`} 
                                    className="h-full max-h-36 w-auto object-contain rounded-md border border-gray-200"
                                  />
                                </div>
                              )}
                              
                              {option.content && (
                                <p className="text-sm text-center text-gray-700 mt-1">{option.content}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        // Normal text-based MCQ layout
                        currentQuestion.question.answers.map((option: ApiOption) => (
                        <div key={option.id} className="flex items-start">
                          <div className="flex items-center h-5">
                            <input
                              id={`option-${option.id}`}
                              type="radio"
                              name={`question-${currentQuestion.id}`}
                              value={option.id}
                              checked={answers[currentQuestion.id]?.selectedOptionId === option.id}
                                onChange={() => handleAnswerChange(currentQuestion.id, option.id, { 
                                selectedOptionId: option.id,
                                isCorrect: option.is_correct
                              })}
                              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                          </div>
                          <label htmlFor={`option-${option.id}`} className="ml-3 text-sm font-medium text-gray-700">
                              {option.content}
                          </label>
                        </div>
                        ))
                      )}
                    </div>
                    </>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      No questions available
                    </div>
                  )}
                  
                  {/* Navigation buttons */}
                  <div className="flex justify-between mt-8">
                    <Button
                      variant="secondary"
                      onClick={goToPreviousQuestion}
                      disabled={currentQuestionIndex === 0}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={goToNextQuestion}
                      disabled={currentQuestionIndex === questions.length - 1}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default ExamTaking;