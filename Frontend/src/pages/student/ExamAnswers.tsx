import React, { useState, useEffect } from 'react';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StudentSidebar from './components/StudentSidebar';
import TeacherSidebar from '../teacher/sidebar/TeacherSidebar';
import ExamAnswerImage from '../../components/ExamAnswerImage';
import { useAuth } from '../../contexts/AuthContext';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

interface StudentAnswer {
  student_exam_id: number;
  question_id: number;
  answer_id: number;
  is_correct: boolean;
  id: number;
  created_at: string;
  updated_at: string | null;
}

interface Question {
  id: number;
  content: string;
  image_url?: string;
  answers: Answer[];
}

interface Answer {
  id: number;
  content: string;
  image_url?: string;
  is_correct: boolean;
}

interface EnrichedStudentAnswer extends StudentAnswer {
  question?: Question;
  selectedAnswer?: Answer;
  attempt_number?: number;
}

interface AttemptData {
  attempt_number: number;
  answers: StudentAnswer[];
  total_questions: number;
  correct_answers: number;
  score_percentage: number;
  obtained_marks: number;
  max_marks: number;
  passed_status: boolean;
  created_at: string;
}

interface StudentExamAllAttemptsResponse {
  student_exam_id: number;
  student_id: number;
  exam_id: number;
  status: string;
  attempts: AttemptData[];
}

interface AttemptAnswers {
  attempt_number: number;
  answers: EnrichedStudentAnswer[];
  total_questions?: number;
  correct_answers?: number;
  score_percentage?: number;
  obtained_marks?: number;
  max_marks?: number;
  passed_status?: boolean;
  created_at?: string;
}

interface DashboardPageProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

const ExamAnswers: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const { studentExamId } = useParams<{ studentExamId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  // Check if this is being viewed by a teacher
  const fromTeacher = location.state?.fromTeacher || false;
  const studentName = location.state?.studentName;
  const studentEmail = location.state?.studentEmail;
  const examId = location.state?.examId;
  
  const [attemptAnswers, setAttemptAnswers] = useState<AttemptAnswers[]>([]);
  const [selectedAttempt, setSelectedAttempt] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllAttemptsAnswers = async () => {
      if (!studentExamId) {
        setError('Missing exam information');
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        if (!token) {
          setError('Authentication token not found. Please log in again.');
          return;
        }

        // Fetch all attempts answers using the new API endpoint
        const allAnswersResponse = await axios.get(
          `${API_URL}/api/student-exams/student-exams/${studentExamId}/all-attempts/answers`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'accept': 'application/json'
            }
          }
        );

        console.log('All attempts answers response:', allAnswersResponse.data);
        
        if (!allAnswersResponse.data) {
          console.log('No answers found for all attempts');
          
          // Fallback to the old API if no data from new API
          await fetchSingleAttemptAnswers();
          return;
        }

        const responseData = allAnswersResponse.data as StudentExamAllAttemptsResponse;
        
        // Process the response data based on new format
        if (responseData.attempts && responseData.attempts.length > 0) {
          const attemptsData: AttemptAnswers[] = responseData.attempts.map(attempt => ({
            attempt_number: attempt.attempt_number,
            answers: attempt.answers.map(answer => ({
              ...answer,
              attempt_number: attempt.attempt_number
            })),
            total_questions: attempt.total_questions,
            correct_answers: attempt.correct_answers,
            score_percentage: attempt.score_percentage,
            obtained_marks: attempt.obtained_marks,
            max_marks: attempt.max_marks,
            passed_status: attempt.passed_status,
            created_at: attempt.created_at
          }));
          
          // Sort by attempt number in descending order (newest first)
          attemptsData.sort((a, b) => b.attempt_number - a.attempt_number);
          
          setAttemptAnswers(attemptsData);
          
          // Select the latest attempt by default
          if (attemptsData.length > 0) {
            setSelectedAttempt(attemptsData[0].attempt_number);
          }
          
          // Fetch questions data for all answers
          await enrichAnswersWithQuestions(attemptsData);
        } else {
          // Fallback to old method if format is not as expected
          await fetchSingleAttemptAnswers();
        }
      } catch (err: any) {
        console.error('Error fetching all attempts answers:', err);
        if (err.response?.status === 404) {
          // If the new API isn't available, fallback to the old one
          await fetchSingleAttemptAnswers();
        } else if (err.response?.status === 401) {
          setError('Authentication failed. Please log in again.');
        } else {
          setError('Failed to fetch exam answers. Please try again later.');
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    const fetchSingleAttemptAnswers = async () => {
      try {
        // Fetch student answers from the original endpoint
        const answersResponse = await axios.get(
          `${API_URL}/api/student-exams/${studentExamId}/answers`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'accept': 'application/json'
            }
          }
        );

        console.log('Student Answers Response (single attempt):', answersResponse.data);
        const answers = answersResponse.data as StudentAnswer[];

        // Create a single attempt with these answers
        const singleAttemptData: AttemptAnswers = {
          attempt_number: 1,
          answers: answers.map(answer => ({...answer, attempt_number: 1}))
        };

        setAttemptAnswers([singleAttemptData]);
        setSelectedAttempt(1);

        // Enrich with question data
        await enrichAnswersWithQuestions([singleAttemptData]);
      } catch (err: any) {
        console.error('Error fetching single attempt answers:', err);
        if (err.response?.status === 401) {
          setError('Authentication failed. Please log in again.');
        } else if (err.response?.status === 404) {
          setError('Exam answers not found or you do not have access to them.');
        } else {
          setError('Failed to fetch exam answers. Please try again later.');
        }
      }
    };
    
    const enrichAnswersWithQuestions = async (attemptsData: AttemptAnswers[]) => {
      try {
        // Create a map to avoid fetching the same question multiple times
        const questionMap = new Map<number, Question>();
        
        for (const attempt of attemptsData) {
          for (const answer of attempt.answers) {
            if (!questionMap.has(answer.question_id)) {
            try {
              // Fetch question details
              const questionResponse = await axios.get(
                `${API_URL}/api/questions/${answer.question_id}`,
                {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'accept': 'application/json'
                  }
                }
              );

                questionMap.set(answer.question_id, questionResponse.data);
              } catch (err) {
                console.error(`Error fetching details for question ${answer.question_id}:`, err);
              }
            }
            
            // Add question data to the answer
            const question = questionMap.get(answer.question_id);
            if (question) {
              answer.question = question;
              answer.selectedAnswer = question.answers.find(a => a.id === answer.answer_id);
            }
          }
        }
        
        // Update the state with enriched data
        setAttemptAnswers([...attemptsData]);
      } catch (err) {
        console.error('Error enriching answers with questions:', err);
      }
    };
    
    // Start the fetch process
    fetchAllAttemptsAnswers();
  }, [studentExamId, token]);
  
  const handleBackClick = () => {
    if (fromTeacher) {
      // Navigate back to the result page first or directly to exam results list
      if (examId) {
        navigate(`/teacher/exams/${examId}/results`);
      } else {
        navigate(`/student/exams/${studentExamId}/result`, { 
          state: { fromTeacher, studentName, studentEmail } 
        });
      }
    } else {
      // Student navigates back to their exams page
      navigate('/student/exams');
    }
  };
  
  const renderAnswer = (answer: Answer | undefined) => {
    if (!answer) return null;
    
    return (
      <>
        {answer.content && (
          <p className="text-sm text-gray-900">
            {answer.content}
          </p>
        )}
        {answer.image_url && (
          <ExamAnswerImage 
            imageUrl={answer.image_url}
            altText="Answer image"
            className="max-h-48 object-contain rounded-lg mt-3"
          />
        )}
      </>
    );
  };

  // Get the current attempt's data
  const currentAttempt = selectedAttempt !== null 
    ? attemptAnswers.find(attempt => attempt.attempt_number === selectedAttempt)
    : null;
    
  // Get the current attempt's answers
  const currentAttemptAnswers = currentAttempt?.answers || [];

  return (
    <MainLayout 
      user={user} 
      onLogout={onLogout} 
      sidebarContent={fromTeacher ? <TeacherSidebar /> : <StudentSidebar />}
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exam Answers</h1>
          {fromTeacher && studentName && (
            <p className="text-gray-600">Student: {studentName} {studentEmail ? `(${studentEmail})` : ''}</p>
          )}
          <p className="text-gray-600">Review the answers and correct solutions.</p>
        </div>
        <Button 
          onClick={handleBackClick}
          className="inline-flex items-center space-x-2 bg-white hover:bg-gray-50 text-gray-700 font-medium px-6 py-2 rounded-lg border border-gray-300 shadow-sm transition-all duration-200 hover:shadow"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          <span>{fromTeacher ? 'Back to Results' : 'Back to Exams'}</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="max-w-2xl mx-auto mt-8">
          <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded-lg" role="alert">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-red-800">Error</h3>
                <p className="mt-2 text-red-700">{error}</p>
                <div className="mt-4">
                  <Button 
                    onClick={handleBackClick}
                    className="inline-flex items-center space-x-2 bg-white hover:bg-gray-50 text-gray-700 font-medium px-6 py-2 rounded-lg border border-gray-300 shadow-sm transition-all duration-200 hover:shadow"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                    <span>{fromTeacher ? 'Back to Results' : 'Back to Exams'}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : attemptAnswers.length > 0 ? (
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Attempt selector tabs */}
          {attemptAnswers.length > 1 && (
            <div className="mb-8">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  {attemptAnswers.map((attempt) => (
                    <button
                      key={attempt.attempt_number}
                      onClick={() => setSelectedAttempt(attempt.attempt_number)}
                      className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                        selectedAttempt === attempt.attempt_number
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Attempt {attempt.attempt_number}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          )}

          {/* Attempt summary */}
          {currentAttempt && (
            <div className="mb-8">
              <Card className="bg-gray-50">
                <div className="p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Attempt Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Score</p>
                      <p className="text-lg font-semibold">
                        {currentAttempt.score_percentage !== undefined ? 
                          `${currentAttempt.score_percentage.toFixed(2)}%` : 
                          'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Result</p>
                      <p className={`text-lg font-semibold ${
                        currentAttempt.passed_status ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {currentAttempt.passed_status !== undefined ? 
                          (currentAttempt.passed_status ? 'Passed' : 'Failed') : 
                          'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Marks</p>
                      <p className="text-lg font-semibold">
                        {currentAttempt.obtained_marks !== undefined && currentAttempt.max_marks !== undefined ? 
                          `${currentAttempt.obtained_marks} / ${currentAttempt.max_marks}` : 
                          'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Correct Answers</p>
                      <p className="text-lg font-semibold">
                        {currentAttempt.correct_answers !== undefined && currentAttempt.total_questions !== undefined ? 
                          `${currentAttempt.correct_answers} / ${currentAttempt.total_questions}` : 
                          'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Attempt Date</p>
                      <p className="text-lg font-semibold">
                        {currentAttempt.created_at ? 
                          new Date(currentAttempt.created_at).toLocaleDateString() : 
                          'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {currentAttemptAnswers.length > 0 ? (
          <div className="space-y-8">
              {currentAttemptAnswers.map((studentAnswer, index) => (
                <Card key={`${studentAnswer.id}-${index}`} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <span className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-900 text-sm font-medium">
                          {index + 1}
                        </span>
                        <h3 className="ml-3 text-lg font-semibold text-gray-900 leading-6">
                          Question {index + 1}
                        </h3>
                        <div className={`ml-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          studentAnswer.is_correct 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {studentAnswer.is_correct ? (
                            <>
                              <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Correct
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                              Incorrect
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <div className="prose max-w-none">
                          {studentAnswer.question?.content && (
                            <p className="text-gray-900">
                              {studentAnswer.question.content}
                            </p>
                          )}
                        </div>
                        {studentAnswer.question?.image_url && (
                          <ExamAnswerImage 
                            imageUrl={studentAnswer.question.image_url}
                            altText={`Question ${index + 1} image`}
                            className="max-h-64 object-contain rounded-lg mt-4"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 space-y-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 uppercase tracking-wider">Your Answer</h4>
                      <div className={`mt-2 p-4 rounded-lg ${
                        studentAnswer.is_correct 
                          ? 'bg-green-50 border border-green-200' 
                          : 'bg-red-50 border border-red-200'
                      }`}>
                        {renderAnswer(studentAnswer.selectedAnswer)}
                      </div>
                    </div>
                    
                    {!studentAnswer.is_correct && studentAnswer.question && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 uppercase tracking-wider">Correct Answer</h4>
                        <div className="mt-2 p-4 rounded-lg bg-green-50 border border-green-200">
                          {renderAnswer(studentAnswer.question.answers.find(a => a.is_correct))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">No answers available for this attempt</h3>
              <p className="mt-1 text-gray-500">This attempt may not have any recorded answers.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-2xl mx-auto mt-8 text-center">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-yellow-800">No Results Found</h3>
                <p className="mt-2 text-yellow-700">Please try taking an exam first.</p>
                <div className="mt-4">
                  <Button 
                    onClick={handleBackClick}
                    className="inline-flex items-center space-x-2 bg-white hover:bg-gray-50 text-gray-700 font-medium px-6 py-2 rounded-lg border border-gray-300 shadow-sm transition-all duration-200 hover:shadow"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                    <span>{fromTeacher ? 'Back to Results' : 'Back to Exams'}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default ExamAnswers; 